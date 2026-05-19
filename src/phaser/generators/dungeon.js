/**
 * generators/dungeon.js — one dungeon level for the Phaser roguelike.
 *
 * Compact port of src/AutotileExample.jsx: a ROT.Map.Digger room+corridor
 * layout. Stairs-up are placed in the first room's centre and stairs-down
 * in the centre of the farthest room. Level 3 has no stairs-down — that's
 * the bottom of the dungeon.
 *
 * Returns: { width, height, tiles, markers, walkable(x,y) }
 *
 * Tile schema (dungeon): { wall: bool, floor: bool, marker: 'stairsUp' |
 *   'stairsDown' | null }.
 */

import * as ROT from 'rot-js';

export const DUNGEON_WIDTH = 36;
export const DUNGEON_HEIGHT = 26;

export function generateDungeon(seed, level) {
  ROT.RNG.setSeed(seed);
  const W = DUNGEON_WIDTH, H = DUNGEON_HEIGHT;

  const tiles = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => ({ wall: true, floor: false, marker: null }))
  );

  const map = new ROT.Map.Digger(W, H);
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
    };
  }

  // Stairs-up: centre of first room (where the player arrives from above).
  const first = rooms[0];
  const upX = Math.floor((first.getLeft() + first.getRight()) / 2);
  const upY = Math.floor((first.getTop()  + first.getBottom()) / 2);
  tiles[upY][upX].marker = 'stairsUp';

  // Stairs-down: centre of the room farthest from stairs-up — but only on
  // levels 1 and 2. Level 3 is the bottom; no further descent.
  let downPos = null;
  if (level < 3) {
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
  };
}
