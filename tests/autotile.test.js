/**
 * Tests for the autotile resolvers.
 *
 * The most valuable property here is *totality*: for every family the
 * examples offer in a dropdown, all 16 cardinal-neighbor combinations
 * must resolve to a sprite the atlas actually contains. A resolver that
 * returns a plausible-but-absent name renders as a hole in the map,
 * which is exactly the class of bug these catch.
 */

import { describe, it, expect } from 'vitest';
import atlas from '../atlas/DawnlikeAtlas.json' with { type: 'json' };
import {
  AUTOTILE_MANIFESTS,
  resolveAutotile,
  resolveDawnLikeWallName,
  resolveDawnLikeBuildingWallName,
  resolveDawnLikeDungeonWallName,
  resolveDawnLikeForestName,
  resolveDawnLikeFloorName,
  resolveDawnLikePoolName,
  resolveDawnLikeRiverName,
  resolveDawnLikeMountainName,
  resolveDawnLikeShoreName,
} from '../src/utils/autotile.js';

const byName = atlas.byName;

/** All 16 combinations of {n, s, e, w}. */
const ALL_NEIGHBORS = Array.from({ length: 16 }, (_, bits) => ({
  n: Boolean(bits & 1),
  s: Boolean(bits & 2),
  e: Boolean(bits & 4),
  w: Boolean(bits & 8),
}));

const describeNeighbors = (nb) =>
  ['n', 's', 'e', 'w'].filter((d) => nb[d]).join('') || '(isolated)';

describe('AUTOTILE_MANIFESTS', () => {
  it.each(Object.keys(AUTOTILE_MANIFESTS))('%s covers all 16 neighbor patterns', (id) => {
    const { map } = AUTOTILE_MANIFESTS[id];
    for (const nb of ALL_NEIGHBORS) {
      const key = (nb.n ? 'n' : '') + (nb.s ? 's' : '') + (nb.e ? 'e' : '') + (nb.w ? 'w' : '');
      expect(map, `missing pattern "${key}"`).toHaveProperty(key);
    }
  });

  it.each(Object.keys(AUTOTILE_MANIFESTS))('%s only falls back to known patterns', (id) => {
    const { map, fallbacks } = AUTOTILE_MANIFESTS[id];
    for (const [key, chain] of Object.entries(fallbacks)) {
      expect(map, `fallback source "${key}" is not a pattern`).toHaveProperty(key);
      for (const target of chain) {
        expect(map, `fallback target "${target}" is not a pattern`).toHaveProperty(target);
      }
    }
  });
});

describe('resolveAutotile', () => {
  it('throws on an unknown manifest id', () => {
    expect(() => resolveAutotile('nope', 'x', {}, byName)).toThrow(/Unknown autotile manifest/);
  });

  it('returns the direct variant when the atlas has it', () => {
    const res = resolveAutotile('wall', 'bright brick wall', { n: true, s: true, e: false, w: true }, byName);
    expect(res.name).toBe('bright brick wall left up down');
    expect(res.fallback).toBeUndefined();
    expect(res.missing).toBeUndefined();
  });

  it('walks the fallback chain when the direct variant is absent', () => {
    // A family with only the two straights available — every corner and
    // T must degrade onto one of them rather than returning a hole.
    const sparse = { 'test up down': {}, 'test left right': {} };
    const res = resolveAutotile('openPath', 'test', { n: true, s: false, e: true, w: false }, sparse);
    expect(res.fallback).toBe(true);
    expect(['test up down', 'test left right']).toContain(res.name);
  });

  it('degrades a wall family that only has `center` onto that centre tile', () => {
    // Regression: the `wall` fallback chains list pattern keys, so the
    // isolated pattern is '' (suffix `center`). Spelling it 'center'
    // made the whole chain a no-op and produced a missing sprite.
    const sparse = { 'test center': {} };
    const res = resolveAutotile('wall', 'test', { n: true, s: true, e: true, w: true }, sparse);
    expect(res.name).toBe('test center');
    expect(res.fallback).toBe(true);
    expect(res.missing).toBeUndefined();
  });

  it('flags `missing` when nothing in the chain exists', () => {
    const res = resolveAutotile('openPath', 'nonexistent family', { n: true, s: true }, byName);
    expect(res.missing).toBe(true);
    expect(res.name).toBe('nonexistent family up down');
  });

  it('treats an empty byName as "nothing exists"', () => {
    expect(resolveAutotile('wall', 'bright brick wall', {}, {}).missing).toBe(true);
  });
});

describe('building-wall family totality', () => {
  const WALL_FAMILIES = ['bright brick wall', 'dark brick wall', 'dim mine wall'];

  it.each(WALL_FAMILIES)('%s resolves all 16 patterns to real sprites', (family) => {
    const holes = ALL_NEIGHBORS
      .map((nb) => ({ nb, name: resolveDawnLikeBuildingWallName(family, nb, byName) }))
      .filter(({ name }) => !byName[name])
      .map(({ nb, name }) => `${describeNeighbors(nb)} → ${name}`);
    expect(holes).toEqual([]);
  });

  it('orders suffix tokens left → right → up → down', () => {
    expect(resolveDawnLikeBuildingWallName('bright brick wall', { n: true, s: true, e: true, w: true }, byName))
      .toBe('bright brick wall left right up down');
    // A NE corner is `right up`, NOT `up right` — DawnLike's ordering.
    expect(resolveDawnLikeBuildingWallName('bright brick wall', { n: true, e: true }, byName))
      .toBe('bright brick wall right up');
  });

  it('uses `center` for an isolated wall block', () => {
    expect(resolveDawnLikeBuildingWallName('bright brick wall', {}, byName))
      .toBe('bright brick wall center');
  });
});

describe('open-path (river / road) family totality', () => {
  const PATH_FAMILIES = ['clear river', 'cloudy river', 'noxious river'];

  it.each(PATH_FAMILIES)('%s resolves all 16 patterns to real sprites', (family) => {
    const holes = ALL_NEIGHBORS
      .map((nb) => ({ nb, name: resolveDawnLikeRiverName(family, nb, byName).name }))
      .filter(({ name }) => !byName[name])
      .map(({ nb, name }) => `${describeNeighbors(nb)} → ${name}`);
    expect(holes).toEqual([]);
  });

  it('orders suffix tokens up → down → left → right', () => {
    expect(resolveDawnLikeRiverName('clear river', { n: true, s: true, e: true, w: true }, byName).name)
      .toBe('clear river up down left right');
  });

  it('inverts the E/W stub on vertical T-junctions', () => {
    // Neighbors N+S+E means the stub points EAST, but DawnLike's art
    // names that piece `... left`. This inversion is the single most
    // error-prone part of the open-path convention.
    expect(resolveDawnLikeRiverName('clear river', { n: true, s: true, e: true }, byName).name)
      .toBe('clear river up down left');
    expect(resolveDawnLikeRiverName('clear river', { n: true, s: true, w: true }, byName).name)
      .toBe('clear river up down right');
  });

  it('renders an isolated segment as a vertical straight', () => {
    expect(resolveDawnLikeRiverName('clear river', {}, byName).name).toBe('clear river up down');
  });

  it('resolveDawnLikeWallName is the string-returning alias', () => {
    const nb = { n: true, s: true, w: true };
    expect(resolveDawnLikeWallName('clear river', nb, byName))
      .toBe(resolveDawnLikeRiverName('clear river', nb, byName).name);
  });
});

describe('resolveDawnLikeDungeonWallName', () => {
  // A 5×5 solid block of wall: only the ring is "surface", the middle
  // 3×3 is buried. Out-of-bounds counts as wall.
  const solid = () => true;

  it('returns null for a fully buried wall tile', () => {
    expect(resolveDawnLikeDungeonWallName('bright brick wall', 5, 5, solid, byName)).toBeNull();
  });

  it('returns null for a tile that is not a wall at all', () => {
    expect(resolveDawnLikeDungeonWallName('bright brick wall', 1, 1, () => false, byName)).toBeNull();
  });

  it('resolves a wall tile that borders open floor', () => {
    // Wall everywhere except a single open tile north of (3,3).
    const isWall = (x, y) => !(x === 3 && y === 2);
    const name = resolveDawnLikeDungeonWallName('bright brick wall', 3, 3, isWall, byName);
    expect(name).not.toBeNull();
    expect(byName[name]).toBeDefined();
  });

  it('resolves every tile of a room perimeter to a real sprite', () => {
    // 10×10 map, walls on the border, open interior.
    const W = 10, H = 10;
    const isWall = (x, y) => x <= 0 || y <= 0 || x >= W - 1 || y >= H - 1;
    const holes = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!isWall(x, y)) continue;
        const name = resolveDawnLikeDungeonWallName('dark brick wall', x, y, isWall, byName);
        if (name !== null && !byName[name]) holes.push(`(${x},${y}) → ${name}`);
      }
    }
    expect(holes).toEqual([]);
  });
});

describe('resolveDawnLikeForestName', () => {
  const ALL_EIGHT = { n: 1, s: 1, e: 1, w: 1, nw: 1, ne: 1, sw: 1, se: 1 };

  it('uses `dense` when every neighbor is canopy', () => {
    expect(resolveDawnLikeForestName('light oak', ALL_EIGHT, byName).name).toBe('light oak dense');
  });

  it('curves away every corner for an isolated tree', () => {
    expect(resolveDawnLikeForestName('light oak', {}, byName).name).toBe('light oak nw ne sw se');
  });

  it('curves a corner when its diagonal is missing even though both cardinals are present', () => {
    const res = resolveDawnLikeForestName('light oak', { ...ALL_EIGHT, ne: 0 }, byName);
    expect(res.name).toBe('light oak ne');
  });

  it.each(['light oak', 'dark pine', 'light mangrove', 'cactus'])(
    '%s resolves all 256 neighborhoods to real sprites',
    (family) => {
      const holes = [];
      for (let bits = 0; bits < 256; bits++) {
        const nb = {
          n: !!(bits & 1), s: !!(bits & 2), e: !!(bits & 4), w: !!(bits & 8),
          nw: !!(bits & 16), ne: !!(bits & 32), sw: !!(bits & 64), se: !!(bits & 128),
        };
        const { name } = resolveDawnLikeForestName(family, nb, byName);
        if (!byName[name]) holes.push(`${bits} → ${name}`);
      }
      expect(holes).toEqual([]);
    },
  );
});

describe('resolveDawnLikeFloorName', () => {
  it('uses `c` for a fully surrounded floor tile', () => {
    const res = resolveDawnLikeFloorName('dusk brick floor', { n: 1, s: 1, e: 1, w: 1 }, byName);
    expect(res.name).toBe('dusk brick floor c');
  });

  it('names variants by their MISSING neighbors, in n-s-w-e order', () => {
    const res = resolveDawnLikeFloorName('dusk brick floor', { s: 1, e: 1 }, byName);
    expect(res.reason).toContain('nw');
  });

  it('falls back to `c` rather than returning a hole', () => {
    // 'nsew' (no neighbors at all) has no dedicated sprite in most
    // floor families, so it must degrade to the centre tile.
    const res = resolveDawnLikeFloorName('dusk brick floor', {}, byName);
    expect(byName[res.name]).toBeDefined();
  });

  it.each(['dusk brick floor', 'day brick floor', 'night brick floor'])(
    '%s resolves all 16 patterns to real sprites',
    (family) => {
      const holes = ALL_NEIGHBORS
        .map((nb) => resolveDawnLikeFloorName(family, nb, byName).name)
        .filter((name) => !byName[name]);
      expect(holes).toEqual([]);
    },
  );
});

describe('resolveDawnLikePoolName', () => {
  it('uses `center` when surrounded by water', () => {
    expect(resolveDawnLikePoolName('stone murky pool', { n: 1, s: 1, e: 1, w: 1 }, byName).name)
      .toBe('stone murky pool center');
  });

  it('uses `divider` for a vertical channel', () => {
    expect(resolveDawnLikePoolName('stone murky pool', { n: 1, s: 1 }, byName).name)
      .toBe('stone murky pool divider');
  });

  it('flips the top edge vertically to stand in for the missing bottom edge', () => {
    const res = resolveDawnLikePoolName('stone murky pool', { s: 1, e: 1, w: 1 }, byName);
    expect(res.name).toBe('stone murky pool left right up');
    expect(res.flipY).toBe(true);
  });

  it.each(['stone murky pool', 'brick murky pool'])(
    '%s resolves all 16 patterns to real sprites',
    (family) => {
      const holes = ALL_NEIGHBORS
        .map((nb) => resolveDawnLikePoolName(family, nb, byName).name)
        .filter((name) => !byName[name]);
      expect(holes).toEqual([]);
    },
  );
});

describe('resolveDawnLikeMountainName', () => {
  it('uses `c` for an interior peak', () => {
    expect(resolveDawnLikeMountainName('blue peak', { n: 1, s: 1, e: 1, w: 1 }, byName))
      .toBe('blue peak c');
  });

  it('names the edge by the MISSING cardinal', () => {
    // Neighbors S+E+W, nothing north → this tile is the north edge.
    expect(resolveDawnLikeMountainName('blue peak', { s: 1, e: 1, w: 1 }, byName))
      .toBe('blue peak n');
  });

  it('names an outer corner by the two missing cardinals', () => {
    // Neighbors S+E only → the empty sides are N and W.
    expect(resolveDawnLikeMountainName('blue peak', { s: 1, e: 1 }, byName))
      .toBe('blue peak nw');
  });

  it('uses `alone` for an isolated peak', () => {
    expect(resolveDawnLikeMountainName('blue peak', {}, byName)).toBe('blue peak alone');
  });

  it.each(['blue peak', 'green snowcap', 'red volcano'])(
    '%s resolves all 16 patterns to real sprites',
    (family) => {
      const holes = ALL_NEIGHBORS
        .map((nb) => resolveDawnLikeMountainName(family, nb, byName))
        .filter((name) => !byName[name]);
      expect(holes).toEqual([]);
    },
  );
});

describe('resolveDawnLikeShoreName', () => {
  const SHORE_FAMILIES = ['sand shore', 'grass shore', 'snow shore', 'mud shore', 'ash shore'];
  const ALL_LAND = { n: 1, s: 1, e: 1, w: 1, nw: 1, ne: 1, sw: 1, se: 1 };

  it('returns the inland tile when everything around is land', () => {
    expect(resolveDawnLikeShoreName('sand shore', ALL_LAND, byName).name).toBe('sand shore c');
  });

  it('names the suffix after the WATER sides, in n-s-w-e order', () => {
    // Flags mean "is land", so a false flag is water — same convention
    // as the floor resolver's missing neighbours.
    expect(resolveDawnLikeShoreName('sand shore', { ...ALL_LAND, n: 0 }, byName).name)
      .toBe('sand shore n');
    expect(resolveDawnLikeShoreName('sand shore', { ...ALL_LAND, n: 0, w: 0 }, byName).name)
      .toBe('sand shore nw');
    expect(resolveDawnLikeShoreName('sand shore', { ...ALL_LAND, s: 0, e: 0 }, byName).name)
      .toBe('sand shore se');
  });

  it('returns the islet when water surrounds the tile', () => {
    expect(resolveDawnLikeShoreName('sand shore', {}, byName).name).toBe('sand shore nswe');
  });

  it('picks an inner corner when only a diagonal is water', () => {
    expect(resolveDawnLikeShoreName('sand shore', { ...ALL_LAND, nw: 0 }, byName).name)
      .toBe('sand shore dnw');
    expect(resolveDawnLikeShoreName('sand shore', { ...ALL_LAND, se: 0 }, byName).name)
      .toBe('sand shore dse');
  });

  it('ignores a diagonal whose flanking cardinal is already water', () => {
    // The north band has already cut the NW corner, so the NW diagonal
    // cannot change anything — this is the collapse that takes 256
    // neighbourhoods down to 47.
    expect(resolveDawnLikeShoreName('sand shore', { ...ALL_LAND, n: 0, nw: 0 }, byName).name)
      .toBe('sand shore n');
    expect(resolveDawnLikeShoreName('sand shore', { ...ALL_LAND, n: 0, nw: 0, ne: 0 }, byName).name)
      .toBe('sand shore n');
  });

  it('cuts every water diagonal, not just the first', () => {
    // Before the full blob set this approximated to a single corner.
    const res = resolveDawnLikeShoreName('sand shore', { ...ALL_LAND, ne: 0, sw: 0 }, byName);
    expect(res.name).toBe('sand shore dne dsw');
  });

  it('degrades to a real sprite for an unknown family', () => {
    const res = resolveDawnLikeShoreName('no such shore', { ...ALL_LAND, n: 0 }, byName);
    expect(res.name).toBe('no such shore');
  });

  it.each(SHORE_FAMILIES)('%s resolves all 16 cardinal patterns to real sprites', (family) => {
    const holes = ALL_NEIGHBORS
      .map((nb) => ({ nb, name: resolveDawnLikeShoreName(family, nb, byName).name }))
      .filter(({ name }) => !byName[name])
      .map(({ nb, name }) => `${describeNeighbors(nb)} → ${name}`);
    expect(holes).toEqual([]);
  });

  it.each(SHORE_FAMILIES)('%s resolves all 256 neighbourhoods to real sprites', (family) => {
    const holes = [];
    for (let bits = 0; bits < 256; bits++) {
      const nb = {
        n: !!(bits & 1), s: !!(bits & 2), e: !!(bits & 4), w: !!(bits & 8),
        nw: !!(bits & 16), ne: !!(bits & 32), sw: !!(bits & 64), se: !!(bits & 128),
      };
      const { name } = resolveDawnLikeShoreName(family, nb, byName);
      if (!byName[name]) holes.push(`${bits} → ${name}`);
    }
    expect(holes).toEqual([]);
  });

  // Independently re-derive the 47-tile blob set here rather than
  // importing the generator's list, so a bug in the enumeration cannot
  // agree with itself.
  const CORNER_CARDINALS = { nw: ['n', 'w'], ne: ['n', 'e'], sw: ['s', 'w'], se: ['s', 'e'] };
  const subsetsOf = (xs) => xs.reduce((acc, x) => acc.concat(acc.map((a) => [...a, x])), [[]]);
  const EXPECTED_VARIANTS = (() => {
    const out = [];
    for (const water of subsetsOf(['n', 's', 'w', 'e'])) {
      const eligible = Object.keys(CORNER_CARDINALS)
        .filter((c) => CORNER_CARDINALS[c].every((d) => !water.includes(d)));
      for (const cut of subsetsOf(eligible)) {
        const card = ['n', 's', 'w', 'e'].filter((d) => water.includes(d)).join('');
        const corners = ['nw', 'ne', 'sw', 'se'].filter((c) => cut.includes(c)).map((c) => `d${c}`);
        out.push([card, ...corners].filter(Boolean).join(' ') || 'c');
      }
    }
    return out;
  })();

  it('the blob set collapses 256 neighbourhoods to exactly 47 tiles', () => {
    expect(EXPECTED_VARIANTS).toHaveLength(47);
    expect(new Set(EXPECTED_VARIANTS).size).toBe(47);
  });

  it.each(SHORE_FAMILIES)('%s ships all 47 variants', (family) => {
    const missing = EXPECTED_VARIANTS.filter((suffix) => !byName[`${family} ${suffix}`]);
    expect(missing).toEqual([]);
  });

  it('every one of the 256 neighbourhoods maps onto a set member', () => {
    // The collapse must be exhaustive: no neighbourhood may resolve to a
    // name outside the 47.
    const seen = new Set();
    for (let bits = 0; bits < 256; bits++) {
      const nb = {
        n: !!(bits & 1), s: !!(bits & 2), e: !!(bits & 4), w: !!(bits & 8),
        nw: !!(bits & 16), ne: !!(bits & 32), sw: !!(bits & 64), se: !!(bits & 128),
      };
      seen.add(resolveDawnLikeShoreName('sand shore', nb, byName).name.replace('sand shore ', ''));
    }
    expect([...seen].filter((s) => !EXPECTED_VARIANTS.includes(s))).toEqual([]);
    // And every tile in the set must be reachable, or we drew dead art.
    expect(EXPECTED_VARIANTS.filter((v) => !seen.has(v))).toEqual([]);
  });

  it('spells the suffix as water cardinals then d-prefixed cut corners', () => {
    expect(resolveDawnLikeShoreName('sand shore', { ...ALL_LAND, n: 0, se: 0 }, byName).name)
      .toBe('sand shore n dse');
    expect(resolveDawnLikeShoreName('sand shore', { ...ALL_LAND, nw: 0, se: 0 }, byName).name)
      .toBe('sand shore dnw dse');
    expect(resolveDawnLikeShoreName('sand shore', { ...ALL_LAND, nw: 0, ne: 0, sw: 0, se: 0 }, byName).name)
      .toBe('sand shore dnw dne dsw dse');
  });

  it('drops corner detail rather than returning a hole when a piece is absent', () => {
    // A family shipping only the cardinal subset must still resolve.
    const sparse = { 'lite shore n': {}, 'lite shore c': {} };
    const res = resolveDawnLikeShoreName('lite shore', { ...ALL_LAND, n: 0, se: 0 }, sparse);
    expect(res.name).toBe('lite shore n');
    expect(res.reason).toMatch(/no corner piece/);
  });

  it('leaves the water region transparent so any water tile shows through', () => {
    // The whole point of the set: a shore tile composites over water.
    // `c` is the only fully opaque one.
    expect(byName['sand shore nswe']).toBeDefined();
    expect(byName['sand shore c']).toBeDefined();
  });

  it('marks shore tiles animated so the surf tracks DawnLike water', () => {
    for (const family of SHORE_FAMILIES) {
      expect(byName[`${family} n`].isAnimated).toBe(true);
    }
  });
});
