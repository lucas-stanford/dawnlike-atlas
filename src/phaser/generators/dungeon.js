/**
 * generators/dungeon.js — one dungeon level for the dawnlike-atlas roguelike
 * toolkit.
 *
 * Compact port of src/AutotileExample.jsx: a ROT.Map.Digger room+corridor
 * layout. Stairs-up are placed in the first room's centre and stairs-down
 * in the centre of the farthest room. Levels at or beyond
 * `manifest.bottomLevel` have no stairs-down — that's the bottom of the
 * dungeon.
 *
 * Returns: { width, height, tiles, markers, walkable(x,y), manifest }
 *
 * Tile schema (dungeon): { wall: bool, floor: bool, marker: 'stairsUp' |
 *   'stairsDown' | null }.
 *
 * @typedef {Object} DungeonManifest
 * @property {number} [width=36]                          Map width in tiles.
 * @property {number} [height=26]                         Map height in tiles.
 * @property {number} [seed]                              Random seed. Defaults to Date.now().
 * @property {number} [level=1]                           Level number, used to decide whether to place stairs-down.
 * @property {number} [bottomLevel=3]                     Final level: no stairs-down placed at or below this depth.
 * @property {[number,number]} [roomWidth]                ROT.Map.Digger room width range [min, max].
 * @property {[number,number]} [roomHeight]               ROT.Map.Digger room height range [min, max].
 * @property {[number,number]} [corridorLength]           ROT.Map.Digger corridor length range [min, max].
 * @property {number} [dugPercentage]                     Target fraction of cells dug (defaults to ROT's own default).
 * @property {number} [timeLimit]                         ROT.Map.Digger time limit (ms); see rot-js docs.
 */

import * as ROT from 'rot-js';

export const DUNGEON_WIDTH = 36;
export const DUNGEON_HEIGHT = 26;

/**
 * Defaults for every DungeonManifest field. ROT.Map.Digger options that
 * are left undefined here are passed through unchanged so the caller
 * gets rot-js's own defaults (preserving the original behaviour).
 */
export const DEFAULT_DUNGEON_MANIFEST = Object.freeze({
  width: DUNGEON_WIDTH,
  height: DUNGEON_HEIGHT,
  seed: undefined,
  level: 1,
  bottomLevel: 3,
  roomWidth: undefined,
  roomHeight: undefined,
  corridorLength: undefined,
  dugPercentage: undefined,
  timeLimit: undefined,
});

/**
 * Generate a single dungeon level.
 *
 * @param {DungeonManifest} [manifest]  Manifest object; omit to use every default.
 */
export function generateDungeon(manifest) {
  const m = normalizeDungeonManifest(manifest);
  const {
    width: W,
    height: H,
    seed,
    level,
    bottomLevel,
    roomWidth, roomHeight, corridorLength, dugPercentage, timeLimit,
  } = m;

  ROT.RNG.setSeed(seed);

  const tiles = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => ({ wall: true, floor: false, marker: null }))
  );

  // Pass through only the digger options the caller actually supplied,
  // so rot-js gets to apply its own defaults for the rest.
  const diggerOpts = {};
  if (roomWidth)      diggerOpts.roomWidth      = roomWidth;
  if (roomHeight)     diggerOpts.roomHeight     = roomHeight;
  if (corridorLength) diggerOpts.corridorLength = corridorLength;
  if (typeof dugPercentage === 'number') diggerOpts.dugPercentage = dugPercentage;
  if (typeof timeLimit === 'number')     diggerOpts.timeLimit     = timeLimit;

  const map = new ROT.Map.Digger(W, H, diggerOpts);
  map.create((x, y, value) => {
    // value === 0 → floor, 1 → wall
    tiles[y][x].wall = value === 1;
    tiles[y][x].floor = value === 0;
  });

  const rooms = map.getRooms();
  if (rooms.length === 0) {
    // Shouldn't happen with ROT.Map.Digger but be safe.
    return {
      width: W, height: H, tiles,
      markers: { stairsUp: { x: 1, y: 1 }, stairsDown: null },
      walkable: (x, y) => x >= 0 && y >= 0 && x < W && y < H && tiles[y][x].floor,
      manifest,
    };
  }

  // Stairs-up: centre of first room (where the player arrives from above).
  const first = rooms[0];
  const upX = Math.floor((first.getLeft() + first.getRight()) / 2);
  const upY = Math.floor((first.getTop()  + first.getBottom()) / 2);
  tiles[upY][upX].marker = 'stairsUp';

  // Stairs-down: centre of the room farthest from stairs-up — but only on
  // levels before bottomLevel. The bottom is the bottom; no further descent.
  let downPos = null;
  if (level < bottomLevel) {
    let best = null, bestDist = -1;
    for (const r of rooms) {
      const cx = Math.floor((r.getLeft() + r.getRight()) / 2);
      const cy = Math.floor((r.getTop()  + r.getBottom()) / 2);
      const dist = Math.abs(cx - upX) + Math.abs(cy - upY);
      if (dist > bestDist) { bestDist = dist; best = { x: cx, y: cy }; }
    }
    if (best && (best.x !== upX || best.y !== upY)) {
      tiles[best.y][best.x].marker = 'stairsDown';
      downPos = best;
    }
  }

  const walkable = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    return tiles[y][x].floor;
  };

  return {
    width: W,
    height: H,
    tiles,
    markers: { stairsUp: { x: upX, y: upY }, stairsDown: downPos },
    walkable,
    manifest: m,
  };
}

/**
 * Fill in defaults for every DungeonManifest field. The caller's argument
 * must be a (possibly partial) manifest object or undefined.
 */
export function normalizeDungeonManifest(input) {
  const merged = { ...DEFAULT_DUNGEON_MANIFEST, ...(input || {}) };
  if (merged.seed === undefined || merged.seed === null) {
    merged.seed = Date.now();
  }
  return merged;
}
