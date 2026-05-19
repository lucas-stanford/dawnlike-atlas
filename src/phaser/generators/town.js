/**
 * generators/town.js — town for the Phaser roguelike.
 *
 * Compact port of src/TownExample.jsx: a paved plaza with a fountain in
 * the middle, 4–6 packed rectangular buildings each with a single door
 * onto the street network, and one external road that exits the map.
 *
 * Markers:
 *   - markers.worldExit: the tile where the external road meets the map
 *     edge. Stepping on it returns the player to the world map.
 *
 * Returns: { width, height, tiles, markers, walkable(x,y) }
 *
 * Tile schema: { type:'grass'|'street'|'floor'|'wall'|'door', street, wall,
 *   floor, door, doorSide, tree, decor, fountain, marker }.
 */

import * as ROT from 'rot-js';

export const TOWN_WIDTH = 32;
export const TOWN_HEIGHT = 24;

export function generateTown(seed) {
  ROT.RNG.setSeed(seed);
  const W = TOWN_WIDTH, H = TOWN_HEIGHT;

  const tiles = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => ({
      type: 'grass', street: false, wall: false, floor: false,
      door: null, doorSide: null, tree: false, decor: null,
      fountain: false, marker: null,
    }))
  );
  const inBounds = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const get = (x, y) => (inBounds(x, y) ? tiles[y][x] : null);

  // 1. Plaza (6x6 paved square, fountain in centre).
  const PLAZA = 6;
  const px0 = Math.floor(W / 2) - 3, py0 = Math.floor(H / 2) - 3;
  for (let y = py0; y < py0 + PLAZA; y++) {
    for (let x = px0; x < px0 + PLAZA; x++) {
      const t = get(x, y);
      if (t) { t.type = 'street'; t.street = true; }
    }
  }
  const pcx = px0 + 3, pcy = py0 + 3;
  if (get(pcx, pcy)) get(pcx, pcy).fountain = true;

  // 2. Buildings — 4 packed rectangles around the plaza. Each is 5-7 wide
  //    by 4-5 tall, sits with a 1-tile gap from anything else, and gets
  //    one door on the side that faces the plaza.
  const BUILDING_COUNT = 4 + ROT.RNG.getUniformInt(0, 2);
  const placed = [];
  const overlaps = (bx, by, bw, bh) => {
    for (let y = by - 1; y < by + bh + 1; y++) {
      for (let x = bx - 1; x < bx + bw + 1; x++) {
        if (!inBounds(x, y)) return true;
        const t = get(x, y);
        if (t.wall || t.floor || t.street || t.fountain) return true;
      }
    }
    return false;
  };

  for (let i = 0; i < BUILDING_COUNT; i++) {
    let success = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      const bw = 5 + ROT.RNG.getUniformInt(0, 2);
      const bh = 4 + ROT.RNG.getUniformInt(0, 1);
      const side = ROT.RNG.getItem(['n', 's', 'e', 'w']);
      let bx, by;
      if (side === 'n')      { bx = px0 + ROT.RNG.getUniformInt(-Math.floor(bw/2), PLAZA - Math.floor(bw/2)); by = py0 - bh - 2; }
      else if (side === 's') { bx = px0 + ROT.RNG.getUniformInt(-Math.floor(bw/2), PLAZA - Math.floor(bw/2)); by = py0 + PLAZA + 2; }
      else if (side === 'e') { bx = px0 + PLAZA + 2; by = py0 + ROT.RNG.getUniformInt(-Math.floor(bh/2), PLAZA - Math.floor(bh/2)); }
      else                   { bx = px0 - bw - 2;    by = py0 + ROT.RNG.getUniformInt(-Math.floor(bh/2), PLAZA - Math.floor(bh/2)); }
      if (bx < 1 || by < 1 || bx + bw > W - 1 || by + bh > H - 1) continue;
      if (overlaps(bx, by, bw, bh)) continue;

      for (let y = by; y < by + bh; y++) {
        for (let x = bx; x < bx + bw; x++) {
          const t = get(x, y);
          const onPerim = (x === bx || x === bx + bw - 1 || y === by || y === by + bh - 1);
          if (onPerim) { t.wall = true; t.type = 'wall'; }
          else         { t.floor = true; t.type = 'floor'; }
        }
      }
      placed.push({ x: bx, y: by, w: bw, h: bh, side });
      success = true;
      break;
    }
    if (!success) break;
  }

  // 3. Pave a 1-tile street ring around every building and a 1-tile ring
  //    around the plaza, then carry it through to make a connected street.
  const pave = (x, y) => {
    if (!inBounds(x, y)) return;
    const t = get(x, y);
    if (t.wall || t.floor) return;
    t.street = true;
    t.type = 'street';
  };
  for (const b of placed) {
    for (let x = b.x - 1; x <= b.x + b.w; x++) {
      pave(x, b.y - 1);
      pave(x, b.y + b.h);
    }
    for (let y = b.y - 1; y <= b.y + b.h; y++) {
      pave(b.x - 1, y);
      pave(b.x + b.w, y);
    }
  }
  for (let y = py0 - 1; y < py0 + PLAZA + 1; y++) {
    for (let x = px0 - 1; x < px0 + PLAZA + 1; x++) {
      pave(x, y);
    }
  }

  // 4. Doors — one per building, on the side facing the plaza, on a
  //    perimeter (non-corner) tile whose outside neighbour is a street.
  for (const b of placed) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const dx = pcx - cx, dy = pcy - cy;
    const preferred = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'e' : 'w')
      : (dy > 0 ? 's' : 'n');
    const order = [preferred, 'n', 's', 'e', 'w'].filter((s, i, a) => a.indexOf(s) === i);
    const outN = { n: [0,-1], s: [0,1], e: [1,0], w: [-1,0] };

    let placedDoor = false;
    for (const side of order) {
      const candidates = [];
      if (side === 'n') for (let x = b.x + 1; x < b.x + b.w - 1; x++) candidates.push({ x, y: b.y });
      if (side === 's') for (let x = b.x + 1; x < b.x + b.w - 1; x++) candidates.push({ x, y: b.y + b.h - 1 });
      if (side === 'e') for (let y = b.y + 1; y < b.y + b.h - 1; y++) candidates.push({ x: b.x + b.w - 1, y });
      if (side === 'w') for (let y = b.y + 1; y < b.y + b.h - 1; y++) candidates.push({ x: b.x, y });
      const found = candidates.find(c => {
        const o = get(c.x + outN[side][0], c.y + outN[side][1]);
        return o && o.street;
      });
      if (found) {
        const t = get(found.x, found.y);
        t.wall = false;
        t.door = (side === 'e' || side === 'w') ? 'side' : 'front';
        t.doorSide = side;
        t.type = 'door';
        placedDoor = true;
        break;
      }
    }
    // Fallback: blow a door in the middle of the preferred side even if
    // the outside neighbour isn't paved (rare for tight packings).
    if (!placedDoor) {
      let door;
      if (preferred === 'n')      door = { x: b.x + Math.floor(b.w/2), y: b.y };
      else if (preferred === 's') door = { x: b.x + Math.floor(b.w/2), y: b.y + b.h - 1 };
      else if (preferred === 'e') door = { x: b.x + b.w - 1, y: b.y + Math.floor(b.h/2) };
      else                        door = { x: b.x, y: b.y + Math.floor(b.h/2) };
      const t = get(door.x, door.y);
      if (t) {
        t.wall = false;
        t.door = (preferred === 'e' || preferred === 'w') ? 'side' : 'front';
        t.doorSide = preferred;
        t.type = 'door';
        const o = get(door.x + outN[preferred][0], door.y + outN[preferred][1]);
        if (o) { o.street = true; o.type = 'street'; }
      }
    }
  }

  // 5. External road — pick a random map edge, walk straight inward for a
  //    few tiles, then path to the plaza via Dijkstra.
  const roadSide = ['n', 's', 'e', 'w'][ROT.RNG.getUniformInt(0, 3)];
  let entryX, entryY, inward;
  if      (roadSide === 'n') { entryX = ROT.RNG.getUniformInt(3, W - 4); entryY = 0;     inward = [0,  1]; }
  else if (roadSide === 's') { entryX = ROT.RNG.getUniformInt(3, W - 4); entryY = H - 1; inward = [0, -1]; }
  else if (roadSide === 'e') { entryX = W - 1; entryY = ROT.RNG.getUniformInt(3, H - 4); inward = [-1, 0]; }
  else                       { entryX = 0;     entryY = ROT.RNG.getUniformInt(3, H - 4); inward = [ 1, 0]; }

  // Mark the entry tile as the world-exit marker (player steps on it to
  // leave town).
  const exitTile = get(entryX, entryY);
  if (exitTile) {
    exitTile.street = true; exitTile.type = 'street'; exitTile.marker = 'worldExit';
  }

  let rx = entryX, ry = entryY;
  for (let i = 0; i < 3; i++) {
    pave(rx, ry);
    rx += inward[0]; ry += inward[1];
  }
  if (inBounds(rx, ry)) {
    const passable = (x, y) => {
      if (!inBounds(x, y)) return false;
      const t = get(x, y);
      return !!t && !t.wall && !t.floor && !t.door;
    };
    const dij = new ROT.Path.Dijkstra(pcx, pcy, passable, { topology: 4 });
    dij.compute(rx, ry, (x, y) => { pave(x, y); });
  }

  // 6. Tree scatter on grass tiles, well away from streets.
  const nearStreet = (x, y) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const t = get(x + dx, y + dy);
        if (t && (t.street || t.door)) return true;
      }
    }
    return false;
  };
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const t = get(x, y);
      if (t.type !== 'grass' || nearStreet(x, y)) continue;
      if (ROT.RNG.getUniform() < 0.08) t.tree = true;
    }
  }

  // 7. Walkability: walls block. Trees do not (low-fidelity demo).
  const walkable = (x, y) => {
    if (!inBounds(x, y)) return false;
    const t = get(x, y);
    return !t.wall;
  };

  return {
    width: W,
    height: H,
    tiles,
    markers: { worldExit: { x: entryX, y: entryY } },
    walkable,
  };
}
