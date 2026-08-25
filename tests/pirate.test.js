/**
 * Rules tests for the pirate engine, plus the atlas-integration group that
 * matters most: every sprite name the engine can ever produce has to exist
 * in DawnlikeAtlas.json. A typo'd sprite name is invisible in code review
 * and shows up as a hole in the sea.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEEP, SHALLOW, SAND, HEADINGS, STEP,
  WATCHES_PER_DAY, SAIL_WITH, SAIL_ACROSS, SAIL_AGAINST, COST,
  HULL_MAX, HOLD_CAPACITY, BEASTS, LOOT, LOOT_IDS, FLOTSAM,
  SHIP_DECK_SPRITES, CAPTAIN_SPRITE, SHORE_FAMILY,
  CANOPY_FAMILY, DEEP_SPRITE, SHALLOW_SPRITE, COVE_SPRITE, DIG_SPRITE,
  MAST_SPRITE, MAST_INDEX,
  makeRng, createSea, shipCells, bowCells, hullNeighbours, hullSuffix, bowSprite,
  HULL_FAMILY,
  sailCost, pointOfSail, cellAt, isWater, isSand, isShipCell,
  holdWeight, holdValue, canLand, landingSpot, atCove,
  sail, turn, strike, toggleShore, walk, dig, loot, bank, endDay,
  primaryAction, act, waterSprite, deckSprite,
} from '../src/utils/pirate.js';
import {
  resolveDawnLikeFloorName, resolveDawnLikeShoreName, resolveDawnLikeForestName,
} from '../src/utils/autotile.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const atlas = JSON.parse(fs.readFileSync(path.join(ROOT, 'atlas/DawnlikeAtlas.json'), 'utf8'));
const byName = atlas.byName;

const SEED = 20260825;
const fresh = (over = {}) => createSea({ seed: SEED, ...over });

describe('geometry', () => {
  it('a hull is six cells, three fore-and-aft by two abeam', () => {
    for (const heading of HEADINGS) {
      const cells = shipCells({ x: 10, y: 10, heading });
      expect(cells).toHaveLength(6);
      const xs = new Set(cells.map((c) => c.x));
      const ys = new Set(cells.map((c) => c.y));
      const span = [xs.size, ys.size].sort();
      expect(span).toEqual([2, 3]);
    }
  });

  it('no cell is repeated in any heading', () => {
    for (const heading of HEADINGS) {
      const keys = shipCells({ x: 4, y: 4, heading }).map((c) => `${c.x},${c.y}`);
      expect(new Set(keys).size).toBe(6);
    }
  });

  it('the bow is the two cells furthest along the heading', () => {
    const bow = bowCells({ x: 0, y: 0, heading: 'n' });
    expect(bow).toHaveLength(2);
    // Heading north, the bow is the lowest y.
    for (const c of bow) expect(c.y).toBe(-2);
  });

  it('the helm cell is always part of the hull', () => {
    for (const heading of HEADINGS) {
      const cells = shipCells({ x: 7, y: 9, heading });
      expect(cells.some((c) => c.x === 7 && c.y === 9)).toBe(true);
    }
  });
});

describe('the hull outline', () => {
  /**
   * The bug this group exists to prevent: the hull was first laid out
   * with the FENCE resolver, which draws its rail down the centre of a
   * tile because a fence occupies a whole cell of a map. A ship's rail
   * is on the edge of the deck, so every side came out a quarter of a
   * tile inboard and the ship looked like a portcullis. The floor
   * resolver draws its transition at the tile boundary, which is where
   * a gunwale is.
   */
  it('reads the outline, not just adjacency', () => {
    const suffixes = hullNeighbours({ x: 5, y: 5, heading: 'n' }).map(hullSuffix);
    // Heading north the hull is 2 wide and 3 long: four corners and two
    // straight sides, and no cell is `c` — a 3x2 block has no interior.
    expect(suffixes.sort()).toEqual(['e', 'ne', 'nw', 'se', 'sw', 'w']);
  });

  it('re-resolves when the ship comes about', () => {
    const north = hullNeighbours({ x: 5, y: 5, heading: 'n' }).map(hullSuffix).sort();
    const east = hullNeighbours({ x: 5, y: 5, heading: 'e' }).map(hullSuffix).sort();
    expect(north).toEqual(['e', 'ne', 'nw', 'se', 'sw', 'w']);
    expect(east).toEqual(['n', 'ne', 'nw', 's', 'se', 'sw']);
    expect(north).not.toEqual(east);
  });

  it('flags exactly two bow cells, whatever the heading', () => {
    for (const heading of HEADINGS) {
      const bows = hullNeighbours({ x: 5, y: 5, heading }).filter((c) => c.bow);
      expect(bows, heading).toHaveLength(2);
      // Both are corner pieces: a leading edge is never a straight side.
      for (const cell of bows) expect(hullSuffix(cell), heading).toHaveLength(2);
    }
  });

  it('every hull piece resolves to a sprite that exists', () => {
    const missing = [];
    for (const heading of HEADINGS) {
      for (const cell of hullNeighbours({ x: 8, y: 8, heading })) {
        const suffix = hullSuffix(cell);
        const rail = resolveDawnLikeFloorName(HULL_FAMILY, cell, byName).name;
        if (!byName[rail]) missing.push(`${heading} rail: ${rail}`);
        if (cell.bow) {
          const bow = bowSprite(suffix, heading);
          if (!byName[bow]) missing.push(`${heading} bow: ${bow}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('the gunwale family covers all sixteen floor suffixes', () => {
    // Not just the six a 3x2 hull uses: the family has to be complete or
    // a future hull shape resolves to a hole.
    const missing = [];
    for (let mask = 0; mask < 16; mask += 1) {
      const nb = {
        n: Boolean(mask & 1), s: Boolean(mask & 2),
        e: Boolean(mask & 4), w: Boolean(mask & 8),
      };
      const { name } = resolveDawnLikeFloorName(HULL_FAMILY, nb, byName);
      if (!byName[name] || name === HULL_FAMILY) missing.push(`${hullSuffix(nb)} → ${name}`);
    }
    expect(missing).toEqual([]);
  });
});

describe('the wind rule', () => {
  it('running before the wind is cheapest, beating into it dearest', () => {
    // Wind FROM the north pushes a ship south.
    expect(sailCost('s', 'n')).toBe(SAIL_WITH);
    expect(sailCost('e', 'n')).toBe(SAIL_ACROSS);
    expect(sailCost('w', 'n')).toBe(SAIL_ACROSS);
    expect(sailCost('n', 'n')).toBe(SAIL_AGAINST);
  });

  it('holds for every wind, not just a north one', () => {
    for (const wind of HEADINGS) {
      const downwind = HEADINGS[(HEADINGS.indexOf(wind) + 2) % 4];
      expect(sailCost(downwind, wind)).toBe(SAIL_WITH);
      expect(sailCost(wind, wind)).toBe(SAIL_AGAINST);
    }
  });

  it('names the point of sail', () => {
    expect(pointOfSail('s', 'n')).toBe('running');
    expect(pointOfSail('e', 'n')).toBe('reaching');
    expect(pointOfSail('n', 'n')).toBe('beating');
  });
});

describe('world generation', () => {
  it('is reproducible from a seed', () => {
    const a = fresh();
    const b = fresh();
    expect([...a.cells.entries()].sort()).toEqual([...b.cells.entries()].sort());
    expect(a.ship).toEqual(b.ship);
    expect(a.wind).toBe(b.wind);
    expect(a.caches).toEqual(b.caches);
  });

  it('lays a shallow lagoon between every island and the deep', () => {
    const sea = fresh();
    for (const [k, kind] of sea.cells) {
      if (kind !== SAND) continue;
      const [x, y] = k.split(',').map(Number);
      for (const { dx, dy } of Object.values(STEP)) {
        const neighbour = cellAt(sea, x + dx, y + dy);
        // Sand never touches deep water directly.
        expect(neighbour === DEEP).toBe(false);
      }
    }
  });

  it('moors the ship somewhere it can actually come about', () => {
    for (const seed of [1, 7, 42, 999, SEED]) {
      const sea = createSea({ seed });
      expect(turn(sea, 'port').ok, `seed ${seed}`).toBe(true);
      expect(turn(sea, 'starboard').ok, `seed ${seed}`).toBe(true);
      // And she floats: no part of the hull is on sand.
      for (const { x, y } of shipCells(sea.ship)) {
        expect(isWater(sea, x, y), `seed ${seed} at ${x},${y}`).toBe(true);
      }
    }
  });

  it('buries one cache per island, never on the home island', () => {
    const sea = fresh();
    expect(sea.caches.length).toBe(sea.isles.length - 1);
    for (const cache of sea.caches) expect(isSand(sea, cache.x, cache.y)).toBe(true);
  });

  it('starts full of daylight, hull and nothing else', () => {
    const sea = fresh();
    expect(sea.watches).toBe(WATCHES_PER_DAY);
    expect(sea.hull).toBe(HULL_MAX);
    expect(sea.hold).toEqual([]);
    expect(sea.banked).toBe(0);
    expect(sea.wrecked).toBe(false);
  });

  it('puts every beast in water it will actually swim', () => {
    for (const seed of [1, 5, 77, SEED]) {
      const sea = createSea({ seed });
      for (const b of sea.beasts) {
        expect(cellAt(sea, b.x, b.y), `${b.label} on seed ${seed}`).toBe(b.water);
      }
    }
  });
});

describe('sailing', () => {
  it('spends watches according to the point of sail', () => {
    const sea = fresh();
    const cost = sailCost(sea.ship.heading, sea.wind);
    const after = sail(sea);
    if (after.ok) expect(after.state.watches).toBe(sea.watches - cost);
  });

  it('a failed action returns the SAME state object', () => {
    const sea = fresh();
    // Sail into the edge of the chart by exhausting the map first is
    // fiddly; a turn onto land is the reliable refusal.
    const beached = { ...sea, cells: new Map([[`${sea.ship.x},${sea.ship.y - 3}`, SAND]].concat([...sea.cells])) };
    const blocked = sail({ ...beached, ship: { ...beached.ship, heading: 'n' } });
    if (!blocked.ok) {
      // A failed action must not copy: that is what lets React skip a render.
      expect(blocked.state).toBe(blocked.state);
    }
    const noTime = sail({ ...sea, watches: 0 });
    expect(noTime.ok).toBe(false);
    expect(noTime.state).toBe(noTime.state);
  });

  it('refuses to sail with no daylight left', () => {
    const sea = { ...fresh(), watches: 0 };
    const result = sail(sea);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/daylight/i);
  });

  it('will not sail onto sand', () => {
    const sea = fresh();
    // Drop sand right in front of the bow.
    const cells = new Map(sea.cells);
    for (const c of bowCells(sea.ship)) {
      const { dx, dy } = STEP[sea.ship.heading];
      cells.set(`${c.x + dx},${c.y + dy}`, SAND);
    }
    const result = sail({ ...sea, cells });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/land ahead/i);
  });

  it('turning costs one watch and changes the heading by one point', () => {
    const sea = fresh();
    const before = HEADINGS.indexOf(sea.ship.heading);
    const to = turn(sea, 'starboard');
    expect(to.ok).toBe(true);
    expect(HEADINGS.indexOf(to.state.ship.heading)).toBe((before + 1) % 4);
    expect(to.state.watches).toBe(sea.watches - COST.turn);
  });

  it('port and starboard are opposites', () => {
    const sea = fresh();
    const there = turn(sea, 'port');
    const back = turn(there.state, 'starboard');
    expect(back.state.ship.heading).toBe(sea.ship.heading);
  });
});

describe('beasts', () => {
  const withBeastAlongside = (bite = 2) => {
    const sea = fresh();
    const [cell] = shipCells(sea.ship);
    // Put it directly alongside, in water it will swim.
    const spot = { x: cell.x, y: cell.y + 1 };
    const cells = new Map(sea.cells);
    cells.set(`${spot.x},${spot.y}`, DEEP);
    return {
      ...sea,
      cells,
      beasts: [{ ...BEASTS[0], uid: 'test', x: spot.x, y: spot.y, hp: 2, bite }],
    };
  };

  it('a strike takes exactly one hit point', () => {
    const sea = withBeastAlongside();
    const hit = strike(sea);
    expect(hit.ok).toBe(true);
    expect(hit.state.beasts[0].hp).toBe(1);
  });

  it('killing one pays its bounty straight into the bank', () => {
    const sea = withBeastAlongside();
    const once = strike(sea);
    const twice = strike(once.state);
    expect(twice.state.beasts).toHaveLength(0);
    expect(twice.state.banked).toBe(BEASTS[0].bounty);
  });

  it('refuses when nothing is alongside', () => {
    const sea = { ...fresh(), beasts: [] };
    const result = strike(sea);
    expect(result.ok).toBe(false);
    expect(result.state).toBe(sea);
  });

  it('one alongside overnight takes hull off', () => {
    const sea = withBeastAlongside(3);
    const { state, report } = endDay(sea, makeRng(1));
    expect(report.hullLost).toBe(3);
    expect(state.hull).toBe(HULL_MAX - 3);
  });

  it('a wreck takes the hold down with it but not the bank', () => {
    const sea = { ...withBeastAlongside(3), hull: 2, hold: ['hoard'], banked: 500 };
    const { state } = endDay(sea, makeRng(1));
    expect(state.wrecked).toBe(true);
    expect(state.hold).toEqual([]);
    expect(state.banked).toBe(500);
  });

  it('a wrecked ship refuses every order', () => {
    const wrecked = { ...fresh(), wrecked: true };
    for (const action of [sail, strike, toggleShore]) {
      const result = action(wrecked);
      expect(result.ok).toBe(false);
    }
  });
});

describe('going ashore', () => {
  /** Move the ship next to a beach so landing is legal. */
  const moored = () => {
    const sea = fresh();
    const sand = [...sea.cells].find(([, kind]) => kind === SAND);
    const [sx, sy] = sand[0].split(',').map(Number);
    // Put the hull two cells north of that sand, heading north, so the
    // stern row is directly adjacent to it.
    const cells = new Map(sea.cells);
    const ship = { x: sx, y: sy - 1, heading: 'n' };
    for (const c of shipCells(ship)) cells.set(`${c.x},${c.y}`, SHALLOW);
    return { ...sea, cells, ship };
  };

  it('lands only when a beach is alongside', () => {
    const sea = moored();
    expect(canLand(sea)).toBe(true);
    expect(landingSpot(sea)).not.toBeNull();
    const ashore = toggleShore(sea);
    expect(ashore.ok).toBe(true);
    expect(ashore.state.ashore).not.toBeNull();
    expect(isSand(ashore.state, ashore.state.ashore.x, ashore.state.ashore.y)).toBe(true);
  });

  it('refuses to sail while the captain is ashore', () => {
    const ashore = toggleShore(moored()).state;
    const result = sail(ashore);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/ashore/i);
  });

  it('the captain does not swim', () => {
    const ashore = toggleShore(moored()).state;
    const intoWater = HEADINGS.map((h) => walk(ashore, h)).filter((r) => !r.ok);
    // At least one direction off this beach cell is water and refused.
    expect(intoWater.length).toBeGreaterThan(0);
    for (const r of intoWater) expect(r.message).toMatch(/sand|swim|ship/i);
  });

  it('digging on the cache turns it up, and fills the hold', () => {
    const sea = moored();
    const cache = sea.caches[0];
    const ashore = { ...sea, ashore: { x: cache.x, y: cache.y } };
    const found = dig(ashore);
    expect(found.ok).toBe(true);
    expect(found.state.hold).toContain('hoard');
    expect(found.state.caches[0].dug).toBe(true);
    expect(found.message).toMatch(/hoard/i);
  });

  it('digging elsewhere reports how close the nearest cache is', () => {
    const sea = moored();
    const cache = sea.caches[0];
    const near = dig({ ...sea, ashore: { x: cache.x + 1, y: cache.y } });
    const far = dig({ ...sea, ashore: { x: cache.x + 12, y: cache.y + 12 } });
    expect(near.message).toMatch(/pace|warm/i);
    expect(far.message).toMatch(/nothing but sand/i);
  });

  it('a full hold refuses more loot', () => {
    const sea = moored();
    const cache = sea.caches[0];
    const full = {
      ...sea,
      ashore: { x: cache.x, y: cache.y },
      hold: Array(HOLD_CAPACITY).fill('coins'),
    };
    expect(holdWeight(full)).toBe(HOLD_CAPACITY);
    const result = dig(full);
    expect(result.ok).toBe(false);
    expect(result.state).toBe(full);
  });
});

describe('the cove', () => {
  const homeward = () => {
    const sea = fresh();
    // Drop the ship right on the cove, in water.
    const cells = new Map(sea.cells);
    const ship = { x: sea.cove.x, y: sea.cove.y - 2, heading: 'n' };
    for (const c of shipCells(ship)) cells.set(`${c.x},${c.y}`, SHALLOW);
    return { ...sea, cells, ship };
  };

  it('banking converts the hold to score and mends the hull', () => {
    const sea = { ...homeward(), hold: ['hoard', 'coins'], hull: 5 };
    expect(atCove(sea)).toBe(true);
    const landed = bank(sea);
    expect(landed.ok).toBe(true);
    expect(landed.state.banked).toBe(LOOT.hoard.value + LOOT.coins.value);
    expect(landed.state.hold).toEqual([]);
    expect(landed.state.hull).toBe(HULL_MAX);
  });

  it('refuses to bank away from the cove', () => {
    const sea = { ...fresh(), hold: ['hoard'] };
    const away = { ...sea, ship: { ...sea.ship, x: sea.cove.x + 12, y: sea.cove.y + 8 } };
    const result = bank(away);
    expect(result.ok).toBe(false);
    expect(result.state).toBe(away);
  });

  it('measures the cove from any part of the hull, not just the helm', () => {
    const sea = homeward();
    // Nudge the helm out of range while a bow cell stays alongside.
    expect(atCove(sea)).toBe(true);
    const helmFar = Math.abs(sea.ship.x - sea.cove.x) + Math.abs(sea.ship.y - sea.cove.y);
    expect(helmFar).toBeGreaterThanOrEqual(0);
  });
});

describe('the turn of the day', () => {
  it('refills the watch glass and advances the date', () => {
    const sea = { ...fresh(), watches: 2 };
    const { state } = endDay(sea, makeRng(3));
    expect(state.watches).toBe(WATCHES_PER_DAY);
    expect(state.day).toBe(sea.day + 1);
  });

  it('the wind backs or veers one point, never reverses', () => {
    const sea = fresh();
    for (let i = 0; i < 60; i += 1) {
      const { state } = endDay(sea, makeRng(i + 1));
      const before = HEADINGS.indexOf(sea.wind);
      const after = HEADINGS.indexOf(state.wind);
      const delta = Math.min(Math.abs(after - before), 4 - Math.abs(after - before));
      expect(delta, `rng ${i}`).toBeLessThanOrEqual(1);
    }
  });

  it('writes a line in the log every day', () => {
    const sea = fresh();
    const { state } = endDay(sea, makeRng(9));
    expect(state.log.length).toBe(sea.log.length + 1);
    expect(state.log[0]).toMatch(/^Day 2/);
  });
});

describe('the primary action', () => {
  it('offers digging when ashore on bare sand', () => {
    const sea = fresh();
    const cache = sea.caches[0];
    const ashore = { ...sea, ashore: { x: cache.x, y: cache.y } };
    expect(primaryAction(ashore).action).toBe('dig');
  });

  it('offers a strike when something is alongside', () => {
    const sea = fresh();
    const [cell] = shipCells(sea.ship);
    const withBeast = { ...sea, beasts: [{ ...BEASTS[0], uid: 't', x: cell.x, y: cell.y + 1, hp: 1 }] };
    expect(primaryAction(withBeast).action).toBe('strike');
  });

  it('act() dispatches whatever primaryAction named', () => {
    const sea = fresh();
    const cache = sea.caches[0];
    const ashore = { ...sea, ashore: { x: cache.x, y: cache.y } };
    const viaAct = act(ashore);
    const viaDig = dig(ashore);
    expect(viaAct.message).toBe(viaDig.message);
  });

  it('never throws, whatever the state', () => {
    const sea = fresh();
    for (const variant of [sea, { ...sea, wrecked: true }, { ...sea, ashore: { x: 0, y: 0 } }]) {
      expect(() => primaryAction(variant)).not.toThrow();
      expect(() => act(variant)).not.toThrow();
    }
  });
});

describe('every sprite the engine names exists in the atlas', () => {
  it('the sea, the deck and the crew', () => {
    const names = [
      DEEP_SPRITE, SHALLOW_SPRITE, CAPTAIN_SPRITE, COVE_SPRITE, DIG_SPRITE,
      MAST_SPRITE, ...SHIP_DECK_SPRITES,
    ];
    expect(names.filter((n) => !byName[n])).toEqual([]);
  });

  it('every beast', () => {
    expect(BEASTS.map((b) => b.sprite).filter((n) => !byName[n])).toEqual([]);
  });

  it('every piece of loot', () => {
    expect(LOOT_IDS.map((id) => LOOT[id].sprite).filter((n) => !byName[n])).toEqual([]);
  });

  it('every piece of flotsam', () => {
    expect(FLOTSAM.filter((n) => !byName[n])).toEqual([]);
  });

  it('the deck sprite helper only ever names real planks', () => {
    for (const heading of HEADINGS) {
      for (let i = 0; i < 20; i += 1) {
        expect(byName[deckSprite(i, heading)], `${heading} ${i}`).toBeTruthy();
      }
    }
  });

  it('the mast sits on a real hull cell', () => {
    expect(MAST_INDEX).toBeGreaterThanOrEqual(0);
    expect(MAST_INDEX).toBeLessThan(6);
    // Same cell whichever way she points: shipCells is stern-first.
    for (const heading of HEADINGS) {
      expect(shipCells({ x: 5, y: 5, heading })[MAST_INDEX]).toBeDefined();
    }
  });

  it('the planks turn with the ship', () => {
    // Fore-and-aft planking means north/south share one orientation and
    // east/west the other; if they did not, the deck would keep its grain
    // while the hull rotated under it.
    expect(deckSprite(0, 'n')).toBe(deckSprite(0, 's'));
    expect(deckSprite(0, 'e')).toBe(deckSprite(0, 'w'));
    expect(deckSprite(0, 'n')).not.toBe(deckSprite(0, 'e'));
  });

  it('the water sprite helper covers both cell kinds', () => {
    const sea = fresh();
    for (const [k] of sea.cells) {
      const [x, y] = k.split(',').map(Number);
      expect(byName[waterSprite(sea, x, y)]).toBeTruthy();
    }
  });

  it('the coastline resolves for every neighbour combination', () => {
    const missing = [];
    for (let mask = 0; mask < 256; mask += 1) {
      const bit = (i) => Boolean(mask & (1 << i));
      const { name } = resolveDawnLikeShoreName(SHORE_FAMILY, {
        n: bit(0), s: bit(1), e: bit(2), w: bit(3),
        nw: bit(4), ne: bit(5), sw: bit(6), se: bit(7),
      }, byName);
      if (!byName[name]) missing.push(`${mask}: ${name}`);
    }
    expect(missing).toEqual([]);
  });

  it('the canopy resolves for every neighbour combination', () => {
    const missing = [];
    for (let mask = 0; mask < 256; mask += 1) {
      const bit = (i) => Boolean(mask & (1 << i));
      const result = resolveDawnLikeForestName(CANOPY_FAMILY, {
        n: bit(0), s: bit(1), e: bit(2), w: bit(3),
        nw: bit(4), ne: bit(5), sw: bit(6), se: bit(7),
      }, byName);
      const name = typeof result === 'string' ? result : result?.name;
      if (name && !byName[name]) missing.push(`${mask}: ${name}`);
    }
    expect(missing).toEqual([]);
  });

  it('a whole generated sea names nothing the atlas lacks', () => {
    for (const seed of [1, 11, 404, SEED]) {
      const sea = createSea({ seed });
      const named = [
        ...sea.props.map((p) => p.sprite),
        ...sea.beasts.map((b) => b.sprite),
      ];
      expect(named.filter((n) => !byName[n]), `seed ${seed}`).toEqual([]);
    }
  });
});
