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
  dirtPatchThreshold: 0.4,
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
      if (
        t.type === 'grass' && !t.tree && !t.mountain &&
        decorChance > 0 && ROT.RNG.getUniform() < decorChance &&
        decorVariants && decorVariants.length > 0
      ) {
        t.decor = ROT.RNG.getItem(decorVariants);
      }
    }
  }

  // 2. Road — runs W→E across the middle with a tiny wobble. Clears trees
  //    and mountains it passes over so the road stays passable.
  let ry = Math.floor(H / 2);
  const riverX = Math.floor(W * riverPosition);
  for (let rx = 0; rx < W; rx++) {
    const t = tiles[ry][rx];
    t.road = true; t.tree = false; t.mountain = false;
    if (rx < W - 1 && rx !== riverX - 1 && rx !== riverX) {
      const move = ROT.RNG.getItem([-1, 0, 0, 0, 1]);
      if (move !== 0 && ry + move >= 1 && ry + move < H - 1) {
        ry += move;
        const t2 = tiles[ry][rx];
        t2.road = true; t2.tree = false; t2.mountain = false;
      }
    }
  }

  // 3. River — N→S with one bridge where it crosses the road.
  let rvX = riverX;
  let bridged = false;
  for (let rvY = 0; rvY < H; rvY++) {
    const t = tiles[rvY][rvX];
    t.river = true; t.tree = false; t.mountain = false;
    if (t.road && !bridged) { t.bridge = true; bridged = true; }
    if (rvY < H - 1 && rvY > 1 && rvY < H - 2) {
      const move = ROT.RNG.getItem([-1, 0, 0, 0, 0, 1]);
      if (move !== 0 && rvX + move >= 1 && rvX + move < W - 1) {
        const newX = rvX + move;
        const conn = tiles[rvY][newX];
        conn.river = true; conn.tree = false; conn.mountain = false;
        if (conn.road && !bridged) { conn.bridge = true; bridged = true; }
        rvX = newX;
      }
    }
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
  const carveAnyPassable = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  let roadTarget = null;
  for (let y = 0; y < H && !roadTarget; y++) {
    for (let x = 0; x < W && !roadTarget; x++) {
      if (tiles[y][x].road) roadTarget = { x, y };
    }
  }
  if (roadTarget) {
    const dij = new ROT.Path.Dijkstra(roadTarget.x, roadTarget.y, carveAnyPassable, { topology: 4 });
    dij.compute(dungeon.x, dungeon.y, (x, y) => {
      const t = tiles[y][x];
      if (t.marker === 'dungeon' || t.road) return;
      t.mountain = false;
      t.tree = false;
      // If the carve crosses an unbridged river, lay a bridge so the
      // player can walk over it.
      if (t.river && !t.bridge) t.bridge = true;
    });
  }

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
