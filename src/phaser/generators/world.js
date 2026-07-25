/**
 * generators/world.js — overworld for the dawnlike-atlas roguelike toolkit.
 *
 * Compact port of src/OutdoorExample.jsx: simplex-noise biomes (grass,
 * forest, mountain, dirt patches) + a single straight-running road W→E
 * with a small wobble + a single river N→S with one bridge where the
 * road crosses it.
 *
 * Markers added on top:
 *   - markers.townEntrance:    a grass tile adjacent to the road
 *   - markers.dungeonEntrance: a mountain-adjacent tile far from the town
 *
 * Returns: { width, height, tiles, markers, walkable(x,y) }
 *
 * `tiles[y][x]` matches the schema renderWorldTile expects:
 *   { type, tree, mountain, road, river, bridge, decor, marker }.
 *
 * Deterministic — same `manifest.seed` always produces the same world.
 * Uses ROT.RNG exclusively; callers must not interleave other RNG work
 * inside this fn.
 *
 * The manifest is the single configuration object that tunes every knob.
 * Pass `{}` (or omit it) to get the default world. Spread `DEFAULT_WORLD_MANIFEST`
 * into your own override to inherit defaults for fields you don't set.
 *
 * @typedef {Object} WorldManifest
 * @property {number} [width=40]                 Map width in tiles.
 * @property {number} [height=30]                Map height in tiles.
 * @property {number} [seed]                     Random seed. Defaults to Date.now().
 * @property {number} [elevationScale=12]        Simplex coordinate divisor for elevation noise.
 * @property {number} [biomeScale=22]            Simplex coordinate divisor for biome split noise.
 * @property {number} [dirtPatchScale=8]         Simplex coordinate divisor for dirt patches.
 * @property {number} [elevationThreshold=0.35]  Tile is forest/mountain when elev > this.
 * @property {number} [biomeSplit=0]             Within elevated tiles, > this becomes mountain, else forest.
 * @property {number} [dirtPatchThreshold=0.4]   Low-elevation tile becomes dirt when patch noise > this.
 * @property {number} [decorChance=0.04]         Chance per eligible grass tile to spawn a decor sprite.
 * @property {string[]} [decorVariants]          Decor sprite names to pick from.
 * @property {number} [riverPosition=0.7]        River starting column as fraction of width.
 * @property {{north:string,south:string,east:string,west:string}} [edges]  Which edges the road/river touch (for non-default layouts; currently informational).
 */

import * as ROT from 'rot-js';

export const WORLD_WIDTH = 40;
export const WORLD_HEIGHT = 30;

export const DEFAULT_WORLD_DECORS = [
  'white flowers', 'sparse white flowers',
  'blue flowers',  'sparse blue flowers',
  'gold flowers',  'sparse gold flowers',
  'red flowers',   'sparse red flowers',
  'pebble', 'pebbles', 'rock',
];

/**
 * Defaults for every WorldManifest field. Spread this into your own
 * manifest to override only the fields you care about.
 */
export const DEFAULT_WORLD_MANIFEST = Object.freeze({
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  seed: undefined,
  elevationScale: 12,
  biomeScale: 22,
  dirtPatchScale: 8,
  elevationThreshold: 0.35,
  biomeSplit: 0,
  // Dirt is an accent, not a biome. The grass→dirt floor transition is a
  // high-contrast rim, so at the old 0.4 the patches covered ~19% of the map
  // in big rounded blobs that read as desert and out-weighed the forests and
  // peaks. 0.6 keeps the same number of patches at roughly half the size
  // (~8% coverage), which reads as worn ground between the biomes.
  dirtPatchThreshold: 0.6,
  decorChance: 0.04,
  decorVariants: DEFAULT_WORLD_DECORS,
  riverPosition: 0.7,
});

/**
 * Generate an overworld map.
 *
 * @param {WorldManifest} [manifest]  Manifest object; omit to use every default.
 * @returns {{ width:number, height:number, tiles:Array<Array<Object>>,
 *             markers:{townEntrance:{x,y}, dungeonEntrance:{x,y}},
 *             walkable:(x:number,y:number)=>boolean,
 *             manifest:WorldManifest }}
 */
export function generateWorld(manifest) {
  const m = normalizeWorldManifest(manifest);
  const {
    width: W,
    height: H,
    seed,
    elevationScale,
    biomeScale,
    dirtPatchScale,
    elevationThreshold,
    biomeSplit,
    dirtPatchThreshold,
    decorChance,
    decorVariants,
    riverPosition,
  } = m;

  ROT.RNG.setSeed(seed);
  const simplex = new ROT.Noise.Simplex();

  const tiles = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => ({
      type: 'grass', tree: false, mountain: false,
      road: false, river: false, bridge: false, decor: null, marker: null,
    }))
  );

  // 1. Biomes — elevated regions split into forest / mountain by a second
  //    coarser noise field so each zone reads as one or the other rather
  //    than a salt-and-pepper mix.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const elev   = simplex.get(x / elevationScale, y / elevationScale);
      const biome  = simplex.get(x / biomeScale + 500, y / biomeScale + 500);
      const patch  = simplex.get(x / dirtPatchScale + 100, y / dirtPatchScale + 100);
      const t = tiles[y][x];
      if (elev > elevationThreshold) {
        if (biome > biomeSplit) { t.mountain = true; }
        else                    { t.tree = true; }
      } else if (patch > dirtPatchThreshold) {
        t.type = 'dirt';
      }
      // Decor scatters on bare dirt as well as grass. Dirt patches carry no
      // trees and no flowers of their own, so skipping them left every patch
      // a flat unbroken slab of colour.
      if (
        !t.tree && !t.mountain &&
        decorChance > 0 && ROT.RNG.getUniform() < decorChance &&
        decorVariants && decorVariants.length > 0
      ) {
        t.decor = ROT.RNG.getItem(decorVariants);
      }
    }
  }

  // 1b. Drop lone dirt tiles. A floor family names its variants by which
  //     neighbours are MISSING, so a one-tile patch resolves to the all-edges
  //     variant and draws a bright rim on all four sides — a little donut sat
  //     in the grass. A patch needs a neighbour to read as ground.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (tiles[y][x].type !== 'dirt') continue;
      const hasNeighbour = [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return nx >= 0 && ny >= 0 && nx < W && ny < H && tiles[ny][nx].type === 'dirt';
      });
      if (!hasNeighbour) tiles[y][x].type = 'grass';
    }
  }

  // 2. Road — runs W→E across the middle with a tiny wobble. Clears trees
  //    and mountains it passes over so the road stays passable.
  //
  //    A wobble marks two tiles in the same column (the row it leaves and the
  //    row it arrives at) so the road stays 4-connected. Two wobbles in a row
  //    that reverse direction therefore put the SAME pair of rows in adjacent
  //    columns — a 2x2 block, which the openPath resolver renders as a
  //    lasso-shaped loop because all four corners see two neighbours. Forcing
  //    a straight column after every wobble makes the road a proper staircase
  //    and keeps it one tile wide everywhere.
  let ry = Math.floor(H / 2);
  const riverX = Math.floor(W * riverPosition);
  let wobbledLastColumn = false;
  for (let rx = 0; rx < W; rx++) {
    const t = tiles[ry][rx];
    t.road = true; t.tree = false; t.mountain = false;
    if (rx < W - 1 && rx !== riverX - 1 && rx !== riverX && !wobbledLastColumn) {
      const move = ROT.RNG.getItem([-1, 0, 0, 0, 1]);
      if (move !== 0 && ry + move >= 1 && ry + move < H - 1) {
        ry += move;
        const t2 = tiles[ry][rx];
        t2.road = true; t2.tree = false; t2.mountain = false;
        wobbledLastColumn = true;
        continue;
      }
    }
    wobbledLastColumn = false;
  }

  // 3. River — N→S, bridged wherever it crosses the road.
  //
  //    EVERY river tile that lands on road gets a bridge, not just the first.
  //    The river wobbles the same way the road does, so on the row where the
  //    two cross it is often two tiles wide; bridging only the first left the
  //    other half of the crossing as open water and walled the road off. That
  //    used to be masked by the dungeon spur in step 5b accidentally laying a
  //    second crossing somewhere else on the map.
  //    The river meanders on the same staircase rule as the road, and for the
  //    same reason: a wobble puts two tiles in one row, so two wobbles that
  //    reverse on consecutive rows would close a 2x2 loop of water.
  let rvX = riverX;
  let wobbledLastRow = false;
  for (let rvY = 0; rvY < H; rvY++) {
    const t = tiles[rvY][rvX];
    t.river = true; t.tree = false; t.mountain = false;
    if (t.road) t.bridge = true;
    if (rvY < H - 1 && rvY > 1 && rvY < H - 2 && !wobbledLastRow) {
      const move = ROT.RNG.getItem([-1, 0, 0, 0, 0, 1]);
      if (move !== 0 && rvX + move >= 1 && rvX + move < W - 1) {
        const newX = rvX + move;
        const conn = tiles[rvY][newX];
        conn.river = true; conn.tree = false; conn.mountain = false;
        if (conn.road) conn.bridge = true;
        rvX = newX;
        wobbledLastRow = true;
        continue;
      }
    }
    wobbledLastRow = false;
  }

  // 4. Town marker — pick a road tile in the middle third of the map and
  //    place the town marker on the grass tile NORTH of it (player walks
  //    onto it to enter town).
  const townCandidates = [];
  for (let x = Math.floor(W * 0.25); x < Math.floor(W * 0.5); x++) {
    for (let y = 1; y < H - 1; y++) {
      const t = tiles[y][x];
      if (!t.road || t.river || t.bridge) continue;
      const above = tiles[y - 1][x];
      if (above.road || above.river || above.mountain || above.tree) continue;
      townCandidates.push({ x, y: y - 1 });
    }
  }
  const town = townCandidates[0] || { x: Math.floor(W * 0.35), y: Math.floor(H / 2) - 1 };
  const townTile = tiles[town.y][town.x];
  townTile.marker = 'town';
  townTile.tree = false; townTile.mountain = false; townTile.decor = null;

  // 5. Dungeon marker — pick a mountain tile far from the town. Walk every
  //    mountain tile, keep the one with the greatest Manhattan distance.
  let dungeon = null, bestDist = -1;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (!tiles[y][x].mountain) continue;
      // Don't put it right at the edge — leave a 1-tile margin.
      const dist = Math.abs(x - town.x) + Math.abs(y - town.y);
      if (dist > bestDist) { bestDist = dist; dungeon = { x, y }; }
    }
  }
  if (!dungeon) dungeon = { x: W - 4, y: 4 };
  const dungeonTile = tiles[dungeon.y][dungeon.x];
  // Marker tile must be passable, so clear mountain off it.
  dungeonTile.mountain = false; dungeonTile.tree = false;
  dungeonTile.marker = 'dungeon'; dungeonTile.decor = null;

  // 5b. Carve a passable approach from the dungeon back to the road by
  //     Dijkstra-pathing across the map and clearing obstacles along the
  //     way. The passable function allows everything (we'll just carve
  //     through whatever the shortest path crosses, including
  //     mountains, trees, and rivers via a fresh bridge). This guarantees
  //     the dungeon entrance is reachable from spawn regardless of where
  //     the random biome generator placed it.
  //     Target the road tile NEAREST the dungeon. Scanning for the first road
  //     tile in row-major order instead picks the one closest to the top-left
  //     corner, so on most seeds the spur ran the width of the map alongside
  //     the existing highway and the world ended up with two parallel roads.
  const carveAnyPassable = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  let roadTarget = null;
  let roadTargetDist = Infinity;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!tiles[y][x].road) continue;
      const d = Math.abs(x - dungeon.x) + Math.abs(y - dungeon.y);
      if (d < roadTargetDist) { roadTargetDist = d; roadTarget = { x, y }; }
    }
  }
  if (roadTarget) {
    const dij = new ROT.Path.Dijkstra(roadTarget.x, roadTarget.y, carveAnyPassable, { topology: 4 });
    dij.compute(dungeon.x, dungeon.y, (x, y) => {
      const t = tiles[y][x];
      // Don't overwrite the dungeon marker tile, but lay road on every other
      // step. Without this, bridges placed across a river crossing have no
      // road neighbours, so the bridge resolver can't pick the right
      // orientation (straight vs turn) and falls back to the default.
      if (t.marker === 'dungeon') return;
      t.mountain = false;
      t.tree = false;
      t.road = true;
      // If the carve crosses an unbridged river, lay a bridge so the
      // player can walk over it.
      if (t.river && !t.bridge) t.bridge = true;
    });
  }

  // 5c. Reachability guarantee. Steps 2–5b are all heuristics, and a run of
  //     bad noise can still wall the dungeon off behind a mountain ridge or
  //     an unbridged stretch of river. Flood the walkable region from the
  //     town marker; if the dungeon marker isn't in it, carve a corridor
  //     between the two the same way step 5b does. Without this the generator
  //     can emit a world the player cannot finish.
  const floodFrom = (start) => {
    const seen = new Set([`${start.x},${start.y}`]);
    const queue = [start];
    while (queue.length) {
      const { x, y } = queue.pop();
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nx = x + dx, ny = y + dy;
        const key = `${nx},${ny}`;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(key)) continue;
        const t = tiles[ny][nx];
        if (t.mountain || (t.river && !t.bridge)) continue;
        seen.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
    return seen;
  };
  if (!floodFrom(town).has(`${dungeon.x},${dungeon.y}`)) {
    const rescue = new ROT.Path.Dijkstra(town.x, town.y, carveAnyPassable, { topology: 4 });
    rescue.compute(dungeon.x, dungeon.y, (x, y) => {
      const t = tiles[y][x];
      if (t.marker) return;
      t.mountain = false;
      t.tree = false;
      t.road = true;
      if (t.river && !t.bridge) t.bridge = true;
    });
  }

  // 5d. Thin the road and river networks to one tile wide.
  //
  //     Both render through the openPath family, which draws a ribbon down
  //     the middle of each tile. A 2x2 block therefore resolves to four
  //     corner pieces meeting nose-to-tail — a closed lasso lying in a field,
  //     which is the single most obvious tell that a map was generated. The
  //     staircase rules in steps 2 and 3 stop each line making them on its
  //     own; this catches what's left, where the dungeon spur runs alongside
  //     the highway or the carve passes lay road over water.
  //
  //     For each 2x2 block, drop the first corner whose removal leaves that
  //     network connected. Bridges and marker tiles are load-bearing and are
  //     never dropped.
  const staysConnected = (flag) => {
    const all = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) if (tiles[y][x][flag]) all.push({ x, y });
    }
    if (all.length === 0) return true;
    const seen = new Set([`${all[0].x},${all[0].y}`]);
    const queue = [all[0]];
    while (queue.length) {
      const { x, y } = queue.pop();
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nx = x + dx, ny = y + dy;
        const key = `${nx},${ny}`;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (!tiles[ny][nx][flag] || seen.has(key)) continue;
        seen.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
    return seen.size === all.length;
  };
  const thin = (flag) => {
    for (let y = 0; y < H - 1; y++) {
      for (let x = 0; x < W - 1; x++) {
        const block = [tiles[y][x], tiles[y][x + 1], tiles[y + 1][x], tiles[y + 1][x + 1]];
        if (!block.every((t) => t[flag])) continue;
        for (const t of block) {
          if (t.bridge || t.marker) continue;
          t[flag] = false;
          if (staysConnected(flag)) break;
          t[flag] = true;
        }
      }
    }
  };
  thin('road');
  thin('river');

  // 6. Walkability helper. Mountains block; rivers without a bridge block.
  const walkable = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    const t = tiles[y][x];
    if (t.mountain) return false;
    if (t.river && !t.bridge) return false;
    return true;
  };

  return {
    width: W,
    height: H,
    tiles,
    markers: { townEntrance: town, dungeonEntrance: dungeon },
    walkable,
    manifest: m,
  };
}

/**
 * Fill in defaults for every WorldManifest field. The caller's argument
 * must be a (possibly partial) manifest object or undefined.
 */
export function normalizeWorldManifest(input) {
  const merged = { ...DEFAULT_WORLD_MANIFEST, ...(input || {}) };
  if (merged.seed === undefined || merged.seed === null) {
    merged.seed = Date.now();
  }
  return merged;
}
