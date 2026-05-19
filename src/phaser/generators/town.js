/**
 * generators/town.js — town for the dawnlike-atlas roguelike toolkit.
 *
 * Compact port of src/TownExample.jsx: a paved plaza with a fountain in
 * the middle, 4–6 packed rectangular buildings each with a single door
 * onto the street network, and one external road that exits the map.
 *
 * Each building is assigned a TYPE (home/inn/smithy/shop/church) via
 * weighted RNG. The type controls:
 *   - which sign sprite is dropped on the street tile in front of the door
 *   - which furniture layout is stamped onto the floor (bed, table+chairs,
 *     altar+candles, …)
 *   - which NPC palette is sampled when populating the interior
 *
 * Markers:
 *   - markers.worldExit: the tile where the external road meets the map
 *     edge. Stepping on it returns the player to the world map.
 *
 * Returns: { width, height, tiles, markers, walkable(x,y), manifest }
 *
 * Tile schema: { type:'grass'|'street'|'floor'|'wall'|'door', street, wall,
 *   floor, door, doorSide, tree, decor, fountain, marker, sign, furniture,
 *   npc, flower, buildingType }.
 *
 * @typedef {Object} TownNpcConfig
 * @property {number} [chance=0.8]                        Per-building probability of placing any NPCs.
 * @property {{min:number,max:number}} [perBuilding]      NPC count range per building (capped at free floor tiles).
 * @property {Object<string,string[]>} [palettes]         Per-buildingType NPC sprite name palette. `default` is the catch-all.
 *
 * @typedef {Object} TownFurnitureConfig
 * @property {boolean} [enabled=true]                     Place type-specific furniture inside each building.
 *
 * @typedef {Object} TownFlowerConfig
 * @property {number} [density=0.05]                      Per grass tile, probability of placing a flower.
 * @property {string[]} [variants]                        Sprite names to pick from.
 *
 * @typedef {Object} TownManifest
 * @property {number} [width=32]                          Map width in tiles.
 * @property {number} [height=24]                         Map height in tiles.
 * @property {number} [seed]                              Random seed. Defaults to Date.now().
 * @property {number} [plazaSize=6]                       Side length of the central paved plaza.
 * @property {{min:number,max:number}} [buildingCount]    Range for the number of buildings to attempt.
 * @property {{wMin:number,wMax:number,hMin:number,hMax:number}} [buildingSize]
 *                                                        Per-building footprint range (inclusive).
 * @property {number} [buildingPlacementAttempts=80]      Reject sampling tries per building.
 * @property {Object<string,number>} [buildingTypeWeights]
 *                                                        Weighted choice for building type. Keys: 'home'|'inn'|'smithy'|'shop'|'church'.
 * @property {boolean} [signs=true]                       Drop a `<type> sign` sprite on the street tile in front of each door.
 * @property {TownFurnitureConfig} [furniture]            Furniture options.
 * @property {TownNpcConfig} [npc]                        NPC placement options.
 * @property {TownFlowerConfig} [flowers]                 Flower scatter options.
 * @property {number} [treeDensity=0.08]                  Chance per grass tile (away from streets) to spawn a tree.
 * @property {boolean} [fountain=true]                    Place a fountain in the centre of the plaza.
 */

import * as ROT from 'rot-js';

export const TOWN_WIDTH = 32;
export const TOWN_HEIGHT = 24;

const DEFAULT_BUILDING_TYPE_WEIGHTS = Object.freeze({
  home: 3, inn: 1, smithy: 1, shop: 1, church: 1,
});

const DEFAULT_NPC_PALETTES = Object.freeze({
  home:    ['peasant man', 'peasant woman'],
  inn:     ['peasant man', 'peasant woman', 'farmer man', 'farmer woman'],
  smithy:  ['miner', 'peasant man'],
  shop:    ['gnome wizard', 'peasant woman', 'peasant man'],
  church:  ['priest', 'monk', 'aligned priest'],
  default: ['peasant man', 'peasant woman'],
});

const DEFAULT_FLOWER_VARIANTS = Object.freeze([
  'white flowers', 'sparse white flowers',
  'blue flowers',  'sparse blue flowers',
  'gold flowers',  'sparse gold flowers',
  'red flowers',   'sparse red flowers',
]);

const SIGN_FOR_TYPE = Object.freeze({
  home:   'home sign',
  inn:    'inn sign',
  smithy: 'smithy sign',
  shop:   'empty shop sign',
  church: 'church sign',
});

/**
 * Defaults for every TownManifest field.
 */
export const DEFAULT_TOWN_MANIFEST = Object.freeze({
  width: TOWN_WIDTH,
  height: TOWN_HEIGHT,
  seed: undefined,
  plazaSize: 6,
  buildingCount: { min: 4, max: 6 },
  buildingSize: { wMin: 5, wMax: 7, hMin: 4, hMax: 5 },
  buildingPlacementAttempts: 80,
  buildingTypeWeights: DEFAULT_BUILDING_TYPE_WEIGHTS,
  signs: true,
  furniture: { enabled: true },
  npc: {
    chance: 0.8,
    perBuilding: { min: 1, max: 2 },
    palettes: DEFAULT_NPC_PALETTES,
  },
  flowers: {
    density: 0.05,
    variants: DEFAULT_FLOWER_VARIANTS,
  },
  treeDensity: 0.08,
  fountain: true,
});

function weightedPick(weights) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) return entries[0]?.[0] || 'home';
  let r = ROT.RNG.getUniform() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

/**
 * Generate a town map.
 *
 * @param {TownManifest} [manifest]  Manifest object; omit to use every default.
 */
export function generateTown(manifest) {
  const m = normalizeTownManifest(manifest);
  const {
    width: W,
    height: H,
    seed,
    plazaSize: PLAZA,
    buildingCount,
    buildingSize,
    buildingPlacementAttempts,
    buildingTypeWeights,
    signs: placeSigns,
    furniture: furnitureCfg,
    npc: npcCfg,
    flowers: flowerCfg,
    treeDensity,
    fountain: placeFountain,
  } = m;

  ROT.RNG.setSeed(seed);

  const tiles = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => ({
      type: 'grass', street: false, wall: false, floor: false,
      door: null, doorSide: null, tree: false, decor: null,
      fountain: false, marker: null,
      sign: null, furniture: null, npc: null, flower: null,
      buildingType: null,
    }))
  );
  const inBounds = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const get = (x, y) => (inBounds(x, y) ? tiles[y][x] : null);

  // 1. Plaza (PLAZA × PLAZA paved square, fountain in centre).
  const px0 = Math.floor(W / 2) - Math.floor(PLAZA / 2);
  const py0 = Math.floor(H / 2) - Math.floor(PLAZA / 2);
  for (let y = py0; y < py0 + PLAZA; y++) {
    for (let x = px0; x < px0 + PLAZA; x++) {
      const t = get(x, y);
      if (t) { t.type = 'street'; t.street = true; }
    }
  }
  const pcx = px0 + Math.floor(PLAZA / 2), pcy = py0 + Math.floor(PLAZA / 2);
  if (placeFountain && get(pcx, pcy)) get(pcx, pcy).fountain = true;

  // 2. Buildings — packed rectangles around the plaza. Each sits with a
  //    1-tile gap from anything else and gets one door on the side that
  //    faces the plaza.
  const BUILDING_COUNT = buildingCount.min +
    ROT.RNG.getUniformInt(0, Math.max(0, buildingCount.max - buildingCount.min));
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
    for (let attempt = 0; attempt < buildingPlacementAttempts; attempt++) {
      const bw = buildingSize.wMin + ROT.RNG.getUniformInt(0, Math.max(0, buildingSize.wMax - buildingSize.wMin));
      const bh = buildingSize.hMin + ROT.RNG.getUniformInt(0, Math.max(0, buildingSize.hMax - buildingSize.hMin));
      const side = ROT.RNG.getItem(['n', 's', 'e', 'w']);
      let bx, by;
      if (side === 'n')      { bx = px0 + ROT.RNG.getUniformInt(-Math.floor(bw/2), PLAZA - Math.floor(bw/2)); by = py0 - bh - 2; }
      else if (side === 's') { bx = px0 + ROT.RNG.getUniformInt(-Math.floor(bw/2), PLAZA - Math.floor(bw/2)); by = py0 + PLAZA + 2; }
      else if (side === 'e') { bx = px0 + PLAZA + 2; by = py0 + ROT.RNG.getUniformInt(-Math.floor(bh/2), PLAZA - Math.floor(bh/2)); }
      else                   { bx = px0 - bw - 2;    by = py0 + ROT.RNG.getUniformInt(-Math.floor(bh/2), PLAZA - Math.floor(bh/2)); }
      if (bx < 1 || by < 1 || bx + bw > W - 1 || by + bh > H - 1) continue;
      if (overlaps(bx, by, bw, bh)) continue;

      const buildingType = weightedPick(buildingTypeWeights);
      for (let y = by; y < by + bh; y++) {
        for (let x = bx; x < bx + bw; x++) {
          const t = get(x, y);
          const onPerim = (x === bx || x === bx + bw - 1 || y === by || y === by + bh - 1);
          if (onPerim) { t.wall = true; t.type = 'wall'; }
          else         { t.floor = true; t.type = 'floor'; }
          t.buildingType = buildingType;
        }
      }
      placed.push({ x: bx, y: by, w: bw, h: bh, side, type: buildingType });
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
    let doorPos = null;
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
        doorPos = { x: found.x, y: found.y, side };
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
        doorPos = { x: door.x, y: door.y, side: preferred };
      }
    }
    b.door = doorPos;
  }

  // 4.5 Signs — drop a `<type> sign` sprite on the street tile adjacent
  //     to each door (so it sits in front of the building, facing the
  //     plaza). Skipped when the manifest disables signs or the building
  //     type has no known sign sprite.
  if (placeSigns) {
    const outN = { n: [0,-1], s: [0,1], e: [1,0], w: [-1,0] };
    for (const b of placed) {
      if (!b.door) continue;
      const signName = SIGN_FOR_TYPE[b.type];
      if (!signName) continue;
      const off = outN[b.door.side];
      // Place the sign one tile beside the door (parallel to the wall),
      // not directly outside, so it doesn't block the doorway.
      const candidates = (b.door.side === 'n' || b.door.side === 's')
        ? [
            { x: b.door.x - 1, y: b.door.y + off[1] },
            { x: b.door.x + 1, y: b.door.y + off[1] },
          ]
        : [
            { x: b.door.x + off[0], y: b.door.y - 1 },
            { x: b.door.x + off[0], y: b.door.y + 1 },
          ];
      for (const c of candidates) {
        const t = get(c.x, c.y);
        if (!t || t.wall || t.floor || t.door || t.sign) continue;
        t.sign = signName;
        if (!t.street) { t.street = true; t.type = 'street'; }
        break;
      }
    }
  }

  // 4.6 Furniture — stamp a type-specific furniture layout onto the
  //     building's INTERIOR floor tiles. Layouts are intentionally tiny
  //     so even the smallest valid building (3x2 interior) ends up with
  //     something on at least one tile. We never overwrite the door tile
  //     or place furniture on the interior tile DIRECTLY behind the door
  //     so the player can always step inside.
  const furniturePlacedAt = new Set();
  if (furnitureCfg?.enabled) {
    for (const b of placed) {
      const interiorTiles = [];
      for (let y = b.y + 1; y < b.y + b.h - 1; y++) {
        for (let x = b.x + 1; x < b.x + b.w - 1; x++) {
          interiorTiles.push({ x, y });
        }
      }
      if (interiorTiles.length === 0) continue;
      // Don't block the tile just inside the door.
      let blocked = null;
      if (b.door) {
        const off = { n: [0,1], s: [0,-1], e: [-1,0], w: [1,0] }[b.door.side];
        blocked = `${b.door.x + off[0]},${b.door.y + off[1]}`;
      }
      const free = interiorTiles.filter(t => `${t.x},${t.y}` !== blocked);
      if (free.length === 0) continue;

      const corner = free[0];
      const farCorner = free[free.length - 1];
      const middle = free[Math.floor(free.length / 2)];
      const second = free[Math.min(1, free.length - 1)];

      const stamp = (pos, sprite) => {
        if (!pos) return;
        const t = get(pos.x, pos.y);
        if (!t || !t.floor || t.furniture) return;
        const key = `${pos.x},${pos.y}`;
        if (furniturePlacedAt.has(key)) return;
        t.furniture = sprite;
        furniturePlacedAt.add(key);
      };

      if (b.type === 'home') {
        stamp(corner,    'bed a');
        stamp(middle,    'wooden table');
      } else if (b.type === 'inn') {
        stamp(corner,    'bed a');
        stamp(farCorner, 'bed b');
        stamp(middle,    'wooden table');
        stamp(second,    'wooden chair right');
      } else if (b.type === 'smithy') {
        stamp(corner,    'closed chest');
        stamp(middle,    'woodpile');
        stamp(farCorner, 'brass lantern');
      } else if (b.type === 'shop') {
        stamp(corner,    'closed big chest');
        stamp(middle,    'wooden table');
        stamp(farCorner, 'closed barrel');
      } else if (b.type === 'church') {
        stamp(middle,    'altar');
        stamp(corner,    'candle pair');
        stamp(farCorner, 'candle');
      }
    }
  }

  // 4.7 NPCs — pick from the per-type palette (falling back to `default`)
  //     and place on remaining free interior floor tiles. Capped by the
  //     manifest's npc.perBuilding range. Tiles with furniture, doors,
  //     or the don't-block-the-doorway tile are excluded.
  if (npcCfg) {
    for (const b of placed) {
      if (ROT.RNG.getUniform() > (npcCfg.chance ?? 1)) continue;
      const palette = (npcCfg.palettes && npcCfg.palettes[b.type])
        || (npcCfg.palettes && npcCfg.palettes.default)
        || DEFAULT_NPC_PALETTES.default;
      if (!palette.length) continue;
      const free = [];
      let blocked = null;
      if (b.door) {
        const off = { n: [0,1], s: [0,-1], e: [-1,0], w: [1,0] }[b.door.side];
        blocked = `${b.door.x + off[0]},${b.door.y + off[1]}`;
      }
      for (let y = b.y + 1; y < b.y + b.h - 1; y++) {
        for (let x = b.x + 1; x < b.x + b.w - 1; x++) {
          const t = get(x, y);
          if (!t || !t.floor || t.furniture || t.npc) continue;
          if (`${x},${y}` === blocked) continue;
          free.push({ x, y });
        }
      }
      if (!free.length) continue;
      const range = npcCfg.perBuilding || { min: 1, max: 1 };
      const want = (range.min || 0) +
        ROT.RNG.getUniformInt(0, Math.max(0, (range.max || range.min || 0) - (range.min || 0)));
      const n = Math.min(want, free.length);
      for (let i = 0; i < n; i++) {
        const idx = ROT.RNG.getUniformInt(0, free.length - 1);
        const cell = free.splice(idx, 1)[0];
        const t = get(cell.x, cell.y);
        if (t) t.npc = palette[ROT.RNG.getUniformInt(0, palette.length - 1)];
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
      if (ROT.RNG.getUniform() < treeDensity) t.tree = true;
    }
  }

  // 6.5 Flower scatter — small splashes of colour on remaining grass
  //     tiles (skipping trees and tiles adjacent to streets). Disabled
  //     by setting flowers.density to 0.
  if (flowerCfg && (flowerCfg.density ?? 0) > 0 && (flowerCfg.variants?.length || 0) > 0) {
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const t = get(x, y);
        if (t.type !== 'grass' || t.tree) continue;
        if (ROT.RNG.getUniform() >= flowerCfg.density) continue;
        t.flower = flowerCfg.variants[
          ROT.RNG.getUniformInt(0, flowerCfg.variants.length - 1)
        ];
      }
    }
  }

  // 7. Walkability: walls, NPCs, furniture, and signs block. Trees and
  //    flowers stay walkable (low-fidelity demo decoration).
  const walkable = (x, y) => {
    if (!inBounds(x, y)) return false;
    const t = get(x, y);
    return !t.wall && !t.npc && !t.furniture && !t.sign;
  };

  return {
    width: W,
    height: H,
    tiles,
    markers: { worldExit: { x: entryX, y: entryY } },
    walkable,
    manifest: m,
  };
}

/**
 * Fill in defaults for every TownManifest field. The caller's argument
 * must be a (possibly partial) manifest object or undefined.
 */
export function normalizeTownManifest(input) {
  const m = input || {};
  const merged = {
    ...DEFAULT_TOWN_MANIFEST,
    ...m,
    buildingCount: { ...DEFAULT_TOWN_MANIFEST.buildingCount, ...(m.buildingCount || {}) },
    buildingSize:  { ...DEFAULT_TOWN_MANIFEST.buildingSize,  ...(m.buildingSize  || {}) },
    buildingTypeWeights: {
      ...DEFAULT_TOWN_MANIFEST.buildingTypeWeights,
      ...(m.buildingTypeWeights || {}),
    },
    furniture: {
      ...DEFAULT_TOWN_MANIFEST.furniture,
      ...(m.furniture || {}),
    },
    npc: {
      ...DEFAULT_TOWN_MANIFEST.npc,
      ...(m.npc || {}),
      perBuilding: {
        ...DEFAULT_TOWN_MANIFEST.npc.perBuilding,
        ...((m.npc && m.npc.perBuilding) || {}),
      },
      palettes: {
        ...DEFAULT_TOWN_MANIFEST.npc.palettes,
        ...((m.npc && m.npc.palettes) || {}),
      },
    },
    flowers: {
      ...DEFAULT_TOWN_MANIFEST.flowers,
      ...(m.flowers || {}),
    },
  };
  if (merged.seed === undefined || merged.seed === null) {
    merged.seed = Date.now();
  }
  return merged;
}
