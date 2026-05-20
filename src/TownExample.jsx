import React, { useState, useEffect, useMemo } from 'react';
import * as ROT from 'rot-js';
import { resolveAssetPath } from './utils/paths';
import { resolveDawnLikeWallName, resolveDawnLikeFloorName, resolveAutotile, resolveDawnLikeDungeonWallName, resolveDawnLikeForestName } from './utils/autotile';
import './Autotile.css';

const TILE_SIZE = 32;
const DISPLAY_WIDTH = 45;
const DISPLAY_HEIGHT = 30;

const SUFFIX_KEYWORDS = new Set([
  'left','right','up','down','flat','center','nw','ne','sw','se','dense',
  'nwe','nswe','we','nsw','ns','nse','swe','c','n','s','e','w','alone','a','b',
]);
const cleanName = (name) => {
  const words = name.split(' ');
  while (words.length > 1 && SUFFIX_KEYWORDS.has(words[words.length - 1])) {
    words.pop();
  }
  return words.join(' ').trim();
};

// Building archetypes: each drives furniture set, sign, and rug colour.
// `bank` is excluded from the random pool — every town gets exactly one,
// force-placed as the first building so it has room for a vault.
const BUILDING_TYPES = ['house', 'inn', 'pub', 'smithy', 'church', 'shop'];
// Only non-residential buildings get a hanging sign by the door. Regular
// houses are left unmarked — a "home sign" on every door makes the town
// read as a row of shops rather than a residential neighbourhood.
const TYPE_SIGN = {
  inn: 'inn sign',
  pub: 'pub sign',
  smithy: 'smithy sign',
  church: 'church sign',
  shop: 'empty shop sign',
  bank: 'sign a',
};
const TYPE_RUG = {
  house: 'red carpet',
  inn: 'red carpet',
  pub: 'red carpet',
  shop: 'gray carpet',
  smithy: 'gray carpet',
  church: null,
  bank: 'gray carpet',
};

// Loot table for vault tiles. Picked uniformly per tile.
const VAULT_LOOT = [
  'closed big chest', 'closed big chest', 'closed safe', 'closed big safe', 'closed chest',
  'pile of gold coins', 'pile of gold coins', 'pile of silver coins', 'pile of copper coins',
  'gleaming red gem', 'gleaming blue gem', 'gleaming green gem',
  'gleaming violet gem', 'gleaming orange gem', 'gleaming clear gem',
  'gleaming white gem', 'gleaming black gem',
];

const DOOR_PLANTS = ['potted plants', 'red flowers', 'gold flowers', 'white flowers', 'blue flowers'];

const GROUND_FLOWERS = [
  'white flowers', 'sparse white flowers',
  'blue flowers', 'sparse blue flowers',
  'gold flowers', 'sparse gold flowers',
  'red flowers', 'sparse red flowers',
];

export default function TownExample({
  wallStyle: wallStyleProp,
  floorStyle: floorStyleProp,
  streetStyle: streetStyleProp,
  mainStreetStyle: mainStreetStyleProp,
  grassStyle: grassStyleProp,
  treeStyle: treeStyleProp,
  treeChance: treeChanceProp,
  flowerChance: flowerChanceProp,
  graveyardChance: graveyardChanceProp,
  buildingCount: buildingCountProp,
  buildingSpacing: buildingSpacingProp,
  seed: seedProp,
  showConfigInitially = false,
} = {}) {
  const [rawMapData, setRawMapData] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [atlas, setAtlas] = useState(null);
  const [error, setError] = useState(null);
  const [wallStyle, setWallStyle] = useState(wallStyleProp || '');
  const [floorStyle, setFloorStyle] = useState(floorStyleProp || 'day tile floor');
  const [streetStyle, setStreetStyle] = useState(streetStyleProp || 'day stone floor');
  const [mainStreetStyle, setMainStreetStyle] = useState(mainStreetStyleProp || 'day brick floor');
  const [grassStyle, setGrassStyle] = useState(grassStyleProp || 'day grass floor');
  const [treeStyle, setTreeStyle] = useState(treeStyleProp || '');
  const [treeChance, setTreeChance] = useState(treeChanceProp ?? 8);
  const [flowerChance, setFlowerChance] = useState(flowerChanceProp ?? 6);
  const [graveyardChance, setGraveyardChance] = useState(graveyardChanceProp ?? 30);
  const [buildingCount, setBuildingCount] = useState(buildingCountProp ?? 6);
  const [buildingSpacing, setBuildingSpacing] = useState(buildingSpacingProp ?? 2);
  const [seed, setSeed] = useState(seedProp ?? Math.floor(Math.random() * 1000000));
  const [loading, setLoading] = useState(true);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [pinnedTile, setPinnedTile] = useState(null);
  const [pickerLayerZ, setPickerLayerZ] = useState(null);
  const [spriteOverrides, setSpriteOverrides] = useState({});
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showConfig, setShowConfig] = useState(showConfigInitially);

  // Discover wall + tree bases from atlas. Same logic as AutotileExample /
  // OutdoorExample (Trees grouped from the Objects/Tree sheets).
  const { discoveredWalls, discoveredTrees } = useMemo(() => {
    if (!atlas?.byName) return { discoveredWalls: [], discoveredTrees: [] };
    const walls = new Set();
    const trees = new Set();
    Object.entries(atlas.byName).forEach(([name, data]) => {
      if (data.tags?.includes('wall') && data.sourceFile === 'Objects/Wall') {
        const base = cleanName(name);
        if (base) walls.add(base);
      }
      if (data.sourceFile === 'Objects/Tree' || data.sourceFile === 'Objects/Tree0') {
        const base = cleanName(name);
        if (base) trees.add(base);
      }
    });
    return {
      discoveredWalls: Array.from(walls).sort(),
      discoveredTrees: Array.from(trees).sort(),
    };
  }, [atlas]);

  // Index sprites by base name for the click-to-pin sprite picker.
  const spritesByBase = useMemo(() => {
    if (!atlas?.byName) return {};
    const map = {};
    for (const name of Object.keys(atlas.byName)) {
      const base = cleanName(name);
      if (!base) continue;
      (map[base] ||= []).push(name);
    }
    for (const k of Object.keys(map)) map[k].sort();
    return map;
  }, [atlas]);

  useEffect(() => {
    if (discoveredWalls.length > 0 && !wallStyle) {
      const def = discoveredWalls.find(s => s === 'bright brick wall')
        || discoveredWalls.find(s => s.includes('brick'))
        || discoveredWalls[0];
      setWallStyle(def);
    }
  }, [discoveredWalls]);

  useEffect(() => {
    if (discoveredTrees.length > 0 && !treeStyle) {
      const def = discoveredTrees.find(s => s === 'light oak')
        || discoveredTrees.find(s => s.includes('oak'))
        || discoveredTrees[0];
      setTreeStyle(def);
    }
  }, [discoveredTrees]);

  useEffect(() => {
    fetch(resolveAssetPath('/DawnlikeAtlas.json'))
      .then(r => { if (!r.ok) throw new Error(`Failed to load atlas: ${r.statusText}`); return r.json(); })
      .then(setAtlas)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // ============================================================
  // Town generation
  // ============================================================
  useEffect(() => {
    if (!atlas) return;
    ROT.RNG.setSeed(seed);
    const data = {};

    // 1. Fill with grass.
    for (let y = 0; y < DISPLAY_HEIGHT; y++) {
      for (let x = 0; x < DISPLAY_WIDTH; x++) {
        data[`${x},${y}`] = { type: 'grass' };
      }
    }

    const get = (x, y) => data[`${x},${y}`];
    const inBounds = (x, y) => x >= 0 && y >= 0 && x < DISPLAY_WIDTH && y < DISPLAY_HEIGHT;

    // 2. Plaza in the middle (6x6 paved square).
    const PLAZA_SIZE = 6;
    const plazaX = Math.floor(DISPLAY_WIDTH / 2) - Math.floor(PLAZA_SIZE / 2);
    const plazaY = Math.floor(DISPLAY_HEIGHT / 2) - Math.floor(PLAZA_SIZE / 2);
    for (let py = plazaY; py < plazaY + PLAZA_SIZE; py++) {
      for (let px = plazaX; px < plazaX + PLAZA_SIZE; px++) {
        const t = get(px, py);
        if (t) { t.type = 'street'; t.plaza = true; t.streetKind = 'main'; }
      }
    }
    const plazaCenterX = plazaX + Math.floor(PLAZA_SIZE / 2);
    const plazaCenterY = plazaY + Math.floor(PLAZA_SIZE / 2);
    const fountainTile = get(plazaCenterX, plazaCenterY);
    if (fountainTile) fountainTile.fountain = true;

    // 3. Pack buildings. Each is a rectangle 4-7 wide by 4-6 tall, placed
    //    so it sits with a 1-tile street gap from the plaza or from
    //    another building. Buildings have a perimeter of `building.wall`
    //    tiles and an interior of `building.floor` tiles.
    const placedBuildings = [];
    const overlaps = (bx, by, w, h, pad = buildingSpacing) => {
      for (let yy = by - pad; yy < by + h + pad; yy++) {
        for (let xx = bx - pad; xx < bx + w + pad; xx++) {
          if (!inBounds(xx, yy)) return true;
          const t = get(xx, yy);
          if (t.wall || t.floor) return true;
          // Don't overlap plaza either (plaza tiles must remain street).
          if (t.plaza) return true;
        }
      }
      return false;
    };
    const adjacentToStreet = (bx, by, w, h) => {
      for (let xx = bx; xx < bx + w; xx++) {
        if (inBounds(xx, by - 1) && get(xx, by - 1).type === 'street') return true;
        if (inBounds(xx, by + h) && get(xx, by + h).type === 'street') return true;
      }
      for (let yy = by; yy < by + h; yy++) {
        if (inBounds(bx - 1, yy) && get(bx - 1, yy).type === 'street') return true;
        if (inBounds(bx + w, yy) && get(bx + w, yy).type === 'street') return true;
      }
      return false;
    };

    for (let i = 0; i < buildingCount; i++) {
      const wantBank = (i === 0); // first building is always the bank
      let placed = false;
      for (let attempt = 0; attempt < 120; attempt++) {
        // Banks need a larger footprint so the vault sub-room fits with room
        // to spare for the banker hall + a counter.
        const w = wantBank ? (7 + ROT.RNG.getUniformInt(0, 1)) : (5 + ROT.RNG.getUniformInt(0, 3));
        const h = wantBank ? (6 + ROT.RNG.getUniformInt(0, 1)) : (5 + ROT.RNG.getUniformInt(0, 2));

        // Anchor either to plaza or to an existing building, pick a side, then
        // offset so the new building sits with a 1-tile street gap from it.
        let anchorX, anchorY, anchorW, anchorH;
        if (placedBuildings.length === 0 || ROT.RNG.getUniform() < 0.55) {
          anchorX = plazaX; anchorY = plazaY; anchorW = PLAZA_SIZE; anchorH = PLAZA_SIZE;
        } else {
          const b = ROT.RNG.getItem(placedBuildings);
          anchorX = b.x; anchorY = b.y; anchorW = b.w; anchorH = b.h;
        }
        const side = ROT.RNG.getItem(['n','s','e','w']);
        let bx, by;
        if (side === 'n') {
          bx = anchorX + ROT.RNG.getUniformInt(-Math.floor(w/2), anchorW - Math.floor(w/2));
          by = anchorY - h - buildingSpacing;
        } else if (side === 's') {
          bx = anchorX + ROT.RNG.getUniformInt(-Math.floor(w/2), anchorW - Math.floor(w/2));
          by = anchorY + anchorH + buildingSpacing;
        } else if (side === 'e') {
          bx = anchorX + anchorW + buildingSpacing;
          by = anchorY + ROT.RNG.getUniformInt(-Math.floor(h/2), anchorH - Math.floor(h/2));
        } else {
          bx = anchorX - w - buildingSpacing;
          by = anchorY + ROT.RNG.getUniformInt(-Math.floor(h/2), anchorH - Math.floor(h/2));
        }
        // Keep buildings clear of the map edge by 1 tile.
        if (bx < 1 || by < 1 || bx + w > DISPLAY_WIDTH - 1 || by + h > DISPLAY_HEIGHT - 1) continue;
        if (overlaps(bx, by, w, h)) continue;

        const type = wantBank ? 'bank' : ROT.RNG.getItem(BUILDING_TYPES);
        const building = { id: i, x: bx, y: by, w, h, type, side };

        // Stamp perimeter as walls, interior as floor.
        for (let yy = by; yy < by + h; yy++) {
          for (let xx = bx; xx < bx + w; xx++) {
            const t = get(xx, yy);
            const onPerimeter = (xx === bx || xx === bx + w - 1 || yy === by || yy === by + h - 1);
            if (onPerimeter) { t.wall = true; t.type = 'wall'; }
            else { t.floor = true; t.type = 'floor'; t.floorBase = floorStyle; }
            t.buildingId = i;
          }
        }
        placedBuildings.push(building);
        placed = true;
        break;
      }
      if (!placed) break;
    }

    // 4. Carve streets — pave every non-building tile that lies within a
    //    1-tile margin of any building wall, plus the plaza ring expanded
    //    by one ring so the town reads as a connected paved network.
    const streetMask = new Set();
    const markStreet = (x, y) => {
      if (!inBounds(x, y)) return;
      const t = get(x, y);
      if (t.wall || t.floor) return;
      streetMask.add(`${x},${y}`);
    };
    for (const b of placedBuildings) {
      for (let xx = b.x - 1; xx <= b.x + b.w; xx++) {
        markStreet(xx, b.y - 1);
        markStreet(xx, b.y + b.h);
      }
      for (let yy = b.y - 1; yy <= b.y + b.h; yy++) {
        markStreet(b.x - 1, yy);
        markStreet(b.x + b.w, yy);
      }
    }
    // Also widen the plaza-to-buildings connection by paving anything
    // within 2 tiles of the plaza perimeter.
    for (let yy = plazaY - 2; yy < plazaY + PLAZA_SIZE + 2; yy++) {
      for (let xx = plazaX - 2; xx < plazaX + PLAZA_SIZE + 2; xx++) {
        markStreet(xx, yy);
      }
    }
    for (const key of streetMask) {
      const [xs, ys] = key.split(',').map(Number);
      const t = get(xs, ys);
      // Skip plaza tiles so we don't clobber their 'main' streetKind.
      if (t && !t.wall && !t.floor && !t.plaza) {
        t.type = 'street'; t.street = true; t.streetKind = 'side';
      }
    }
    // Plaza tiles are also street tiles for the street-autotile pass.
    for (let py = plazaY; py < plazaY + PLAZA_SIZE; py++) {
      for (let px = plazaX; px < plazaX + PLAZA_SIZE; px++) {
        const t = get(px, py);
        if (t) { t.street = true; t.streetKind = 'main'; }
      }
    }

    // 5. Doors + connecting paths to plaza.
    //    Pick the perimeter tile (not a corner) on the side that faces the
    //    plaza. The door tile is no longer a wall — `wall=false, door=...`.
    for (const b of placedBuildings) {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const dx = plazaCenterX - cx;
      const dy = plazaCenterY - cy;
      // Choose the dominant axis pointing toward the plaza.
      let preferredSide;
      if (Math.abs(dx) > Math.abs(dy)) preferredSide = dx > 0 ? 'e' : 'w';
      else                              preferredSide = dy > 0 ? 's' : 'n';

      const trySide = (side) => {
        let candidates = [];
        if (side === 'n') {
          for (let xx = b.x + 1; xx < b.x + b.w - 1; xx++) candidates.push({ x: xx, y: b.y, kind: 'side', sideNorm: 'h' });
        } else if (side === 's') {
          for (let xx = b.x + 1; xx < b.x + b.w - 1; xx++) candidates.push({ x: xx, y: b.y + b.h - 1, kind: 'side', sideNorm: 'h' });
        } else if (side === 'e') {
          for (let yy = b.y + 1; yy < b.y + b.h - 1; yy++) candidates.push({ x: b.x + b.w - 1, y: yy, kind: 'side', sideNorm: 'v' });
        } else {
          for (let yy = b.y + 1; yy < b.y + b.h - 1; yy++) candidates.push({ x: b.x, y: yy, kind: 'side', sideNorm: 'v' });
        }
        // Need an external street tile adjacent.
        const outNeighbor = { n: [0,-1], s: [0,1], e: [1,0], w: [-1,0] }[side];
        return candidates.find(c => {
          const ox = c.x + outNeighbor[0], oy = c.y + outNeighbor[1];
          return inBounds(ox, oy) && get(ox, oy).street;
        });
      };

      const order = [preferredSide, ...['n','s','e','w'].filter(s => s !== preferredSide)];
      let door = null, doorSide = preferredSide;
      for (const side of order) {
        const c = trySide(side);
        if (c) { door = c; doorSide = side; break; }
      }
      if (!door) {
        // Fallback: just pick the centre tile of the preferred side and
        // pave the tile outside the door.
        if (preferredSide === 'n') door = { x: b.x + Math.floor(b.w/2), y: b.y };
        else if (preferredSide === 's') door = { x: b.x + Math.floor(b.w/2), y: b.y + b.h - 1 };
        else if (preferredSide === 'e') door = { x: b.x + b.w - 1, y: b.y + Math.floor(b.h/2) };
        else door = { x: b.x, y: b.y + Math.floor(b.h/2) };
      }
      const tile = get(door.x, door.y);
      tile.wall = false;
      tile.door = (doorSide === 'e' || doorSide === 'w') ? 'side' : 'front';
      tile.doorSide = doorSide;
      tile.type = 'door';
      b.doorX = door.x; b.doorY = door.y; b.doorSide = doorSide;

      // Pave the tile immediately outside the door so the sign can sit there.
      const outNeighbor = { n: [0,-1], s: [0,1], e: [1,0], w: [-1,0] }[doorSide];
      const ox = door.x + outNeighbor[0], oy = door.y + outNeighbor[1];
      if (inBounds(ox, oy)) {
        const o = get(ox, oy);
        if (!o.wall && !o.floor) {
          o.type = 'street'; o.street = true;
          if (!o.streetKind) o.streetKind = 'side';
        }
      }
    }

    // 5b. Important buildings (bank, inn, church, smithy) get a 'main' brick
    //     road from the plaza centre to their door's exit tile, paving over
    //     the side streets so the town's spine reads as a continuous brick
    //     network connecting every key destination.
    const IMPORTANT_TYPES = new Set(['bank', 'inn', 'church', 'smithy']);
    const upgradeToMain = (px, py) => {
      if (!inBounds(px, py)) return false;
      const t = get(px, py);
      if (!t || t.wall || t.floor || t.door || t.fence) return false;
      t.street = true;
      t.type = 'street';
      t.streetKind = 'main';
      t.tree = false;
      t.decor = undefined;
      return true;
    };
    const mainPassable = (px, py) => {
      if (!inBounds(px, py)) return false;
      const t = get(px, py);
      return !!t && !t.wall && !t.floor && !t.fence && !t.door;
    };
    for (const b of placedBuildings) {
      if (!IMPORTANT_TYPES.has(b.type)) continue;
      const out = { n: [0,-1], s: [0,1], e: [1,0], w: [-1,0] }[b.doorSide];
      const startX = b.doorX + out[0], startY = b.doorY + out[1];
      if (!inBounds(startX, startY)) continue;
      const dij = new ROT.Path.Dijkstra(plazaCenterX, plazaCenterY, mainPassable, { topology: 4 });
      dij.compute(startX, startY, (px, py) => { upgradeToMain(px, py); });
    }

    // 6. Building interior decoration: rug, furniture, sign.
    //    (Lanterns were removed — they sat awkwardly on wall-corner sprites.)
    const SHOP_STOCK = ['closed chest', 'closed big chest', 'closed barrel', 'food shelves', 'empty shelves'];
    const placeShopLayout = (b) => {
      // Shops get a counter that stretches the full inner width on the
      // wall opposite the door, with a row of chests/barrels/shelves
      // tucked between the counter and the back wall. The remaining
      // interior tiles form the customer-side walking area.
      const xL = b.x + 1, xR = b.x + b.w - 2;
      const yT = b.y + 1, yB = b.y + b.h - 2;
      const chests = [], counter = [];
      if (b.doorSide === 's') {
        for (let x = xL; x <= xR; x++) { chests.push([x, yT]);  counter.push([x, yT + 1]); }
      } else if (b.doorSide === 'n') {
        for (let x = xL; x <= xR; x++) { chests.push([x, yB]);  counter.push([x, yB - 1]); }
      } else if (b.doorSide === 'w') {
        for (let y = yT; y <= yB; y++) { chests.push([xR, y]);  counter.push([xR - 1, y]); }
      } else {
        for (let y = yT; y <= yB; y++) { chests.push([xL, y]);  counter.push([xL + 1, y]); }
      }
      for (const [x, y] of chests) {
        const t = get(x, y);
        if (t && t.floor) t.furniture = ROT.RNG.getItem(SHOP_STOCK);
      }
      for (const [x, y] of counter) {
        const t = get(x, y);
        if (t && t.floor) t.furniture = 'wooden table';
      }
    };

    const placeBankLayout = (b) => {
      // Bank has a locked vault sub-room in the corner farthest from the door,
      // separated from the banker hall by an interior wall with a single
      // locked iron-portcullis door. The vault interior is filled with gems,
      // coin piles, chests, and safes — one item per tile.
      //
      // Critical: the partition wall must NEVER intersect the inner tile of
      // the building's front door, or the bank becomes inaccessible. We pick
      // the vault corner so the partition lies on the OPPOSITE side of the
      // door tile from the rest of the interior, and the front door always
      // opens into the banker hall (not into the vault or onto a wall).
      const innerL = b.x + 1, innerR = b.x + b.w - 2;
      const innerT = b.y + 1, innerB = b.y + b.h - 2;
      const innerW = innerR - innerL + 1;
      const innerH = innerB - innerT + 1;
      const door = b.doorSide;

      // Vault size: ~half the interior, minimum 2x2.
      const vaultW = Math.max(2, Math.floor(innerW / 2));
      const vaultH = Math.max(2, Math.floor(innerH / 2));

      // Partition orientation: vertical when door is N/S (split left/right),
      // horizontal when door is E/W (split top/bottom).
      const orientation = (door === 'n' || door === 's') ? 'vertical' : 'horizontal';

      // Pick the partition column (or row) by scoring every valid line:
      //   - strictly between innerL/innerR (or innerT/innerB) so both sides
      //     have at least one inner column/row of space
      //   - MUST NOT equal b.doorX (or b.doorY), otherwise the perimeter
      //     door's inner tile becomes a wall and the bank is inaccessible
      //   - prefer the line that maximises distance from the door axis so
      //     the vault sits on the far side from the front door
      let col = null, row = null, vx, vy;
      if (orientation === 'vertical') {
        let best = -1;
        for (let c = innerL + 1; c <= innerR - 1; c++) {
          if (c === b.doorX) continue;
          const dist = Math.abs(c - b.doorX);
          if (dist > best) { best = dist; col = c; }
        }
        if (col == null) {
          // Degenerate: building too narrow. Fall back to placing the
          // partition anywhere valid even if it coincides with doorX (the
          // door cut on that column will keep the building accessible).
          col = Math.max(innerL + 1, Math.min(innerR - 1, b.doorX === innerL + 1 ? innerR - 1 : innerL + 1));
        }
        // Vault sits on the far side of the partition from the door column.
        if (b.doorX < col) { vx = col + 1; }
        else                { vx = innerL; }
        const availW = (vx === innerL) ? col - innerL : innerR - col;
        const vw = Math.max(2, Math.min(vaultW, availW));
        if (vx !== innerL) vx = innerR - vw + 1;
        vy = (door === 's') ? innerT : innerB - vaultH + 1;
        // Recompute final vault width.
        // (We re-use vaultW below but clamp it via vw inside the loot loop.)
      } else {
        let best = -1;
        for (let r = innerT + 1; r <= innerB - 1; r++) {
          if (r === b.doorY) continue;
          const dist = Math.abs(r - b.doorY);
          if (dist > best) { best = dist; row = r; }
        }
        if (row == null) {
          row = Math.max(innerT + 1, Math.min(innerB - 1, b.doorY === innerT + 1 ? innerB - 1 : innerT + 1));
        }
        if (b.doorY < row) { vy = row + 1; }
        else                { vy = innerT; }
        const availH = (vy === innerT) ? row - innerT : innerB - row;
        const vh = Math.max(2, Math.min(vaultH, availH));
        if (vy !== innerT) vy = innerB - vh + 1;
        vx = (door === 'e') ? innerL : innerR - vaultW + 1;
      }

      const partition = [];
      if (orientation === 'vertical') {
        for (let yy = innerT; yy <= innerB; yy++) partition.push({ x: col, y: yy });
      } else {
        for (let xx = innerL; xx <= innerR; xx++) partition.push({ x: xx, y: row });
      }

      // Stamp partition as walls.
      for (const p of partition) {
        const t = get(p.x, p.y);
        if (!t) continue;
        t.wall = true; t.floor = false; t.type = 'wall'; t.vaultWall = true;
      }

      // Cut a single locked door near the middle of the partition.
      const mid = Math.floor(partition.length / 2);
      let lockedDoor = null;
      for (let off = 0; off < partition.length && !lockedDoor; off++) {
        for (const sign of [0, -1, 1]) {
          const idx = mid + sign * off;
          if (idx < 0 || idx >= partition.length) continue;
          const p = partition[idx];
          // Avoid building corners (the building's own perimeter walls cross
          // the partition at its endpoints).
          if (p.x === b.x || p.x === b.x + b.w - 1 || p.y === b.y || p.y === b.y + b.h - 1) continue;
          lockedDoor = p;
          break;
        }
      }
      if (lockedDoor) {
        const t = get(lockedDoor.x, lockedDoor.y);
        t.wall = false;
        t.floor = false;
        t.door = (orientation === 'horizontal') ? 'front' : 'side';
        t.doorLocked = true;
        t.type = 'door';
        t.vaultWall = false;
      }

      // Stuff the vault with loot — one valuable per inner vault tile.
      for (let yy = vy; yy < vy + vaultH; yy++) {
        for (let xx = vx; xx < vx + vaultW; xx++) {
          const t = get(xx, yy);
          if (!t) continue;
          // The partition may have overwritten one column/row of the vault
          // interior — restore floor on tiles that aren't the partition.
          if (t.vaultWall) continue;
          t.floor = true; t.type = 'floor'; t.floorBase = floorStyle;
          t.vault = true;
          const pick = ROT.RNG.getItem(VAULT_LOOT);
          if (pick && atlas.byName[pick]) t.furniture = pick;
        }
      }

      // Banker hall: drop a small carpet and a counter (stone table) near
      // the locked door.
      const rugBase = TYPE_RUG.bank;
      const bankerTiles = [];
      for (let yy = innerT; yy <= innerB; yy++) {
        for (let xx = innerL; xx <= innerR; xx++) {
          const t = get(xx, yy);
          if (!t || !t.floor || t.vault) continue;
          bankerTiles.push({ x: xx, y: yy });
        }
      }
      if (rugBase && bankerTiles.length >= 2) {
        // 2x1 strip of carpet centred in the banker hall.
        const r = bankerTiles[Math.floor(bankerTiles.length / 2)];
        const t1 = get(r.x, r.y);
        if (t1 && t1.floor) { t1.rug = true; t1.rugBase = rugBase; }
      }
      if (bankerTiles.length && lockedDoor) {
        // Counter: pick the banker tile closest to the locked door.
        bankerTiles.sort((a, c) => {
          const da = Math.abs(a.x - lockedDoor.x) + Math.abs(a.y - lockedDoor.y);
          const dc = Math.abs(c.x - lockedDoor.x) + Math.abs(c.y - lockedDoor.y);
          return da - dc;
        });
        for (const cand of bankerTiles) {
          const t = get(cand.x, cand.y);
          if (t && t.floor && !t.furniture && !t.rug) {
            t.furniture = 'stone table';
            break;
          }
        }
      }
    };

    const placeFurniture = (b) => {
      if (b.type === 'shop') {
        placeShopLayout(b);
        return;
      }
      if (b.type === 'bank') {
        placeBankLayout(b);
        return;
      }
      const innerTiles = [];
      for (let yy = b.y + 1; yy < b.y + b.h - 1; yy++) {
        for (let xx = b.x + 1; xx < b.x + b.w - 1; xx++) {
          innerTiles.push({ x: xx, y: yy });
        }
      }
      const taken = new Set();

      // -- Rug. 2x2 or 3x2, away from the door.
      const rugBase = TYPE_RUG[b.type];
      if (rugBase) {
        const rw = ROT.RNG.getUniform() < 0.5 ? 2 : Math.min(3, b.w - 2);
        const rh = 2;
        // Place rug centred horizontally on the interior, opposite the door.
        let rx = b.x + Math.max(1, Math.floor((b.w - rw) / 2));
        let ry;
        if (b.doorSide === 'n') ry = b.y + b.h - 1 - rh;
        else if (b.doorSide === 's') ry = b.y + 1;
        else ry = b.y + Math.max(1, Math.floor((b.h - rh) / 2));
        for (let yy = ry; yy < ry + rh; yy++) {
          for (let xx = rx; xx < rx + rw; xx++) {
            const t = get(xx, yy);
            if (t && t.floor) { t.rug = true; t.rugBase = rugBase; taken.add(`${xx},${yy}`); }
          }
        }
      }

      // -- Type-driven furniture sets. Each entry: {name, count}.
      const SETS = {
        house: [{ name: 'bed a', count: 1 }, { name: 'wooden table', count: 1 }, { name: 'wooden chair right', count: 1 }],
        inn: [{ name: 'bed a', count: 1 }, { name: 'bed b', count: 1 }, { name: 'wooden table', count: 1 }, { name: 'wooden chair left', count: 1 }],
        pub: [{ name: 'wooden table', count: 2 }, { name: 'wooden chair left', count: 1 }, { name: 'wooden chair right', count: 1 }, { name: 'closed barrel', count: 1 }],
        smithy: [{ name: 'stone table', count: 1 }, { name: 'closed chest', count: 1 }, { name: 'closed barrel', count: 1 }],
        church: [{ name: 'altar', count: 1 }, { name: 'stone chair left', count: 1 }, { name: 'stone chair right', count: 1 }],
        shop: [{ name: 'wooden table', count: 1 }, { name: 'closed big chest', count: 1 }, { name: 'closed barrel', count: 1 }, { name: 'dented pot', count: 1 }],
      };
      const set = SETS[b.type] || SETS.house;

      // Score interior tiles: prefer adjacent-to-wall, not on door, not centre of rug.
      const wallAdj = (x, y) => {
        let c = 0;
        if (get(x-1, y)?.wall) c++;
        if (get(x+1, y)?.wall) c++;
        if (get(x, y-1)?.wall) c++;
        if (get(x, y+1)?.wall) c++;
        return c;
      };
      const scored = innerTiles
        .filter(t => !taken.has(`${t.x},${t.y}`))
        .map(t => ({ ...t, w: wallAdj(t.x, t.y) }))
        .sort((a, b) => b.w - a.w);

      for (const item of set) {
        for (let k = 0; k < item.count; k++) {
          const spot = scored.find(s => !taken.has(`${s.x},${s.y}`));
          if (!spot) break;
          const tile = get(spot.x, spot.y);
          if (!tile) continue;
          tile.furniture = item.name;
          taken.add(`${spot.x},${spot.y}`);
          // For tables, drop a chair on a side if available and not already
          // taken (only when the chair isn't already part of the set).
          if (item.name.includes('table')) {
            for (const [ax, ay, chair] of [
              [-1, 0, 'wooden chair left'],
              [1, 0, 'wooden chair right'],
            ]) {
              const t2 = get(spot.x + ax, spot.y + ay);
              const k2 = `${spot.x + ax},${spot.y + ay}`;
              if (t2?.floor && !taken.has(k2) && !t2.rug) {
                t2.furniture = chair;
                taken.add(k2);
                break;
              }
            }
          }
        }
      }
    };
    placedBuildings.forEach(placeFurniture);

    // 7. Signs + door plants.
    for (const b of placedBuildings) {
      // Sign: hang it OFF the building's wall. The sign sprite's bracket
      // extends horizontally, so signs can ONLY hang from east or west
      // walls. For E/W doors we flank the door's exit. For N/S doors we
      // pivot the sign onto the closer east/west face (at the door's
      // row, so the sign still reads as the doorway's marker). The sign
      // tile stays walkable and renders above the player.
      const dx = b.doorX, dy = b.doorY, side = b.doorSide;
      let signCandidates;
      if (side === 'e' || side === 'w') {
        const sx = dx + (side === 'e' ? 1 : -1);
        signCandidates = [
          { x: sx, y: dy - 1 },
          { x: sx, y: dy + 1 },
        ];
      } else {
        const distW = dx - b.x;
        const distE = (b.x + b.w - 1) - dx;
        const primary = distW <= distE ? 'w' : 'e';
        const primaryX = primary === 'w' ? b.x - 1 : b.x + b.w;
        const secondaryX = primary === 'w' ? b.x + b.w : b.x - 1;
        const rows = [dy];
        for (let off = 1; off < b.h; off++) {
          const r = side === 'n' ? dy + off : dy - off;
          if (r >= b.y && r <= b.y + b.h - 1) rows.push(r);
        }
        signCandidates = [
          ...rows.map((y) => ({ x: primaryX, y })),
          ...rows.map((y) => ({ x: secondaryX, y })),
        ];
      }
      let signTile = null;
      for (const c of signCandidates) {
        const cand = get(c.x, c.y);
        if (cand && !cand.wall && !cand.floor && !cand.door && !cand.sign) {
          signTile = cand;
          break;
        }
      }
      if (signTile && atlas.byName[TYPE_SIGN[b.type]]) signTile.sign = TYPE_SIGN[b.type];

      // Door-flanking plants (30% chance). Drop a plant on a street tile
      // flanking the door's exit (independent of the sign — the sign now
      // hangs off the side of the building rather than blocking a flank).
      if (ROT.RNG.getUniform() < 0.3) {
        const plant = ROT.RNG.getItem(DOOR_PLANTS);
        const outNeighbor = { n: [0,-1], s: [0,1], e: [1,0], w: [-1,0] }[side];
        const exitX = dx + outNeighbor[0];
        const exitY = dy + outNeighbor[1];
        const flank = (side === 'n' || side === 's')
          ? [[-1, 0], [1, 0]]
          : [[0, -1], [0, 1]];
        for (const [fx, fy] of flank) {
          const fTile = get(exitX + fx, exitY + fy);
          if (fTile && fTile.street && !fTile.sign && !fTile.decor && atlas.byName[plant]) {
            fTile.decor = plant;
          }
        }
      }
    }

    // 8. External main road. Pick a random map edge, walk straight inward
    //    for a few tiles so the road exits perpendicular to the border,
    //    then Dijkstra-pathfind to the plaza centre. The path treats
    //    building walls/floors/doors/graveyard fences as impassable so it
    //    can't pave over doorways. Every tile it touches is paved as a
    //    'main' street (brick) — the plaza is also 'main', so the brick
    //    trunk reads as one continuous surface from edge to fountain.
    //    The road is then widened to 2 tiles by paving one perpendicular
    //    neighbour of every path tile (right of motion, falling back to
    //    left when right is blocked).
    const ROAD_EDGE_BUFFER = 3;
    const roadSide = ['n', 's', 'e', 'w'][ROT.RNG.getUniformInt(0, 3)];
    let entryX, entryY, inward;
    if (roadSide === 'n')      { entryX = ROT.RNG.getUniformInt(3, DISPLAY_WIDTH - 4);  entryY = 0;                  inward = [0, 1]; }
    else if (roadSide === 's') { entryX = ROT.RNG.getUniformInt(3, DISPLAY_WIDTH - 4);  entryY = DISPLAY_HEIGHT - 1; inward = [0, -1]; }
    else if (roadSide === 'e') { entryX = DISPLAY_WIDTH - 1;                            entryY = ROT.RNG.getUniformInt(3, DISPLAY_HEIGHT - 4); inward = [-1, 0]; }
    else                       { entryX = 0;                                            entryY = ROT.RNG.getUniformInt(3, DISPLAY_HEIGHT - 4); inward = [1, 0]; }

    const paveRoad = (xx, yy) => {
      if (!inBounds(xx, yy)) return false;
      const t = get(xx, yy);
      // Never overwrite walls, building floors, or doors — keeps doorways clear.
      if (!t || t.wall || t.floor || t.door) return false;
      t.street = true;
      t.type = 'street';
      t.streetKind = 'main';
      t.tree = false;
      t.decor = undefined;
      return true;
    };

    const pathTiles = [];
    let rx = entryX, ry = entryY;
    for (let i = 0; i < ROAD_EDGE_BUFFER; i++) {
      if (paveRoad(rx, ry)) pathTiles.push([rx, ry]);
      rx += inward[0]; ry += inward[1];
    }
    if (inBounds(rx, ry)) {
      const passable = (px, py) => {
        if (!inBounds(px, py)) return false;
        const t = get(px, py);
        return !!t && !t.wall && !t.floor && !t.fence && !t.door;
      };
      // Topology 4 keeps the road on cardinal steps so the openPath
      // street autotile resolves cleanly. Dijkstra walks the cheapest
      // route from (rx,ry) to the plaza centre; the callback paves
      // every tile along the way (including the start + end).
      const dij = new ROT.Path.Dijkstra(plazaCenterX, plazaCenterY, passable, { topology: 4 });
      dij.compute(rx, ry, (px, py) => {
        if (paveRoad(px, py)) pathTiles.push([px, py]);
      });
    }

    // Widen the road to 2 tiles. For each path tile, pave one tile
    // perpendicular to the local direction of travel (right of motion).
    // If that side is blocked (wall/floor/door/OOB) try the left side.
    for (let i = 0; i < pathTiles.length; i++) {
      const [px, py] = pathTiles[i];
      let dx = 0, dy = 0;
      if (i + 1 < pathTiles.length) {
        dx = pathTiles[i + 1][0] - px;
        dy = pathTiles[i + 1][1] - py;
      } else if (i > 0) {
        dx = px - pathTiles[i - 1][0];
        dy = py - pathTiles[i - 1][1];
      } else {
        dx = inward[0]; dy = inward[1];
      }
      // Normalize (Dijkstra topology=4 only ever steps 1 tile, but the
      // entry buffer respects |inward|=1 already, so this is just safety).
      if (Math.abs(dx) > 1) dx = Math.sign(dx);
      if (Math.abs(dy) > 1) dy = Math.sign(dy);
      // 90° CW rotation = (-dy, dx)
      const rXcw = -dy, rYcw = dx;
      if (!paveRoad(px + rXcw, py + rYcw)) {
        paveRoad(px - rXcw, py - rYcw);
      }
    }

    // 9. Optional graveyard. Find a 5x6 grass patch far from the plaza,
    //    fence the perimeter with stone fence, fill the interior with
    //    a mix of gravestones and an occasional coffin.
    if (ROT.RNG.getUniform() * 100 < graveyardChance) {
      const GW = 5, GH = 6;
      let best = null, bestDist = -1;
      for (let attempt = 0; attempt < 80; attempt++) {
        const gx = 1 + ROT.RNG.getUniformInt(0, DISPLAY_WIDTH - GW - 2);
        const gy = 1 + ROT.RNG.getUniformInt(0, DISPLAY_HEIGHT - GH - 2);
        let clean = true;
        for (let yy = gy - 1; yy <= gy + GH; yy++) {
          for (let xx = gx - 1; xx <= gx + GW; xx++) {
            if (!inBounds(xx, yy)) { clean = false; break; }
            const t = get(xx, yy);
            if (t.type !== 'grass') { clean = false; break; }
          }
          if (!clean) break;
        }
        if (!clean) continue;
        const dist = Math.abs((gx + GW/2) - plazaCenterX) + Math.abs((gy + GH/2) - plazaCenterY);
        if (dist > bestDist) { bestDist = dist; best = { gx, gy, GW, GH }; }
      }
      if (best) {
        const { gx, gy, GW: gw, GH: gh } = best;
        const gravestones = ['gravestone a','gravestone b','gravestone c','gravestone d','gravestone e','gravestone f','gravestone g','gravestone h','broken gravestone a','broken gravestone b'];
        for (let yy = gy; yy < gy + gh; yy++) {
          for (let xx = gx; xx < gx + gw; xx++) {
            const t = get(xx, yy);
            const onPerimeter = (xx === gx || xx === gx + gw - 1 || yy === gy || yy === gy + gh - 1);
            if (onPerimeter) {
              // Leave a gate tile in the middle of the side closest to the plaza.
              const isGate = (yy === gy + Math.floor(gh / 2) && xx === gx) // west gate
                          || (yy === gy + Math.floor(gh / 2) && xx === gx + gw - 1);
              if (!isGate) t.fence = true;
            } else {
              // 60% gravestone, 5% coffin, otherwise empty patch.
              const r = ROT.RNG.getUniform();
              if (r < 0.6) t.gravestone = ROT.RNG.getItem(gravestones);
              else if (r < 0.65) t.gravestone = ROT.RNG.getUniform() < 0.5 ? 'coffin a' : 'coffin b';
            }
            t.graveyard = true;
          }
        }
      }
    }

    // 10. Trees + ground flowers scatter on plain grass tiles outside the
    //    town footprint. Trees grow in small clusters around random seed
    //    points; flowers are sprinkled individually on remaining grass.
    //    We keep a one-tile buffer around any street tile so the paths
    //    stay walkable.
    const isPlainGrass = (xx, yy) => {
      if (!inBounds(xx, yy)) return false;
      const t = get(xx, yy);
      return !!(t && t.type === 'grass' && !t.tree && !t.fence && !t.gravestone && !t.graveyard);
    };
    const nearStreet = (xx, yy) => {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const t = get(xx + dx, yy + dy);
          if (t && (t.street || t.door)) return true;
        }
      }
      return false;
    };
    const treeSeeds = [];
    for (let y = 0; y < DISPLAY_HEIGHT; y++) {
      for (let x = 0; x < DISPLAY_WIDTH; x++) {
        if (!isPlainGrass(x, y) || nearStreet(x, y)) continue;
        if (ROT.RNG.getUniform() * 100 < treeChance) treeSeeds.push({ x, y });
      }
    }
    // Grow each seed into a 3–6 tile cluster by random walk.
    for (const seedPt of treeSeeds) {
      const size = 2 + ROT.RNG.getUniformInt(0, 4);
      let cx = seedPt.x, cy = seedPt.y;
      for (let i = 0; i < size; i++) {
        if (isPlainGrass(cx, cy) && !nearStreet(cx, cy)) {
          get(cx, cy).tree = true;
        }
        const dir = ROT.RNG.getUniformInt(0, 3);
        if (dir === 0) cy--;
        else if (dir === 1) cy++;
        else if (dir === 2) cx--;
        else cx++;
      }
    }
    // Flowers: low-density on tiles still plain grass (no tree).
    for (let y = 0; y < DISPLAY_HEIGHT; y++) {
      for (let x = 0; x < DISPLAY_WIDTH; x++) {
        const t = get(x, y);
        if (!t || t.type !== 'grass' || t.tree || t.fence || t.gravestone || t.decor) continue;
        if (ROT.RNG.getUniform() * 100 < flowerChance) {
          t.decor = ROT.RNG.getItem(GROUND_FLOWERS);
        }
      }
    }

    setRawMapData(data);
    setBuildings(placedBuildings);
  }, [seed, atlas, buildingCount, buildingSpacing, graveyardChance, floorStyle, treeChance, flowerChance]);

  // Clone for derived rendering (mirrors OutdoorExample's pattern).
  const mapData = useMemo(() => {
    if (!rawMapData) return null;
    const data = {};
    Object.entries(rawMapData).forEach(([k, t]) => { data[k] = { ...t }; });
    return data;
  }, [rawMapData]);

  // ============================================================
  // Tile renderer (layered)
  // ============================================================
  const getTileLayers = (x, y) => {
    if (!mapData || !atlas) return [];
    const tile = mapData[`${x},${y}`];
    if (!tile) return [];
    const layers = [];

    // z=-1: solid grass backdrop so nothing renders as a black gap.
    let baseGrass = `${grassStyle} c`;
    if (!atlas.byName[baseGrass]) baseGrass = grassStyle;
    layers.push({ name: baseGrass, z: -1, reason: 'Base grass' });

    // z=0: grass autotile (only for true grass tiles — street/floor draw over it).
    if (tile.type === 'grass') {
      const sameType = (nx, ny) => mapData[`${nx},${ny}`]?.type === 'grass';
      const n = sameType(x, y-1), s = sameType(x, y+1), w = sameType(x-1, y), e = sameType(x+1, y);
      const { name, reason } = resolveDawnLikeFloorName(grassStyle, { n, s, e, w }, atlas.byName);
      layers.push({ name, z: 0, reason: `Grass (${reason})` });
    }

    // z=0.5: street pavement autotile. Two variants:
    //   - main: brick trunk road + plaza
    //   - side: stone ring around buildings + door-flank spurs
    // Each variant autotiles only against its own kind, so brick and
    // stone meet at a clean edge rather than merging visually.
    if (tile.street) {
      const kind = tile.streetKind || 'side';
      const isSameKind = (nx, ny) => {
        const n = mapData[`${nx},${ny}`];
        return !!(n?.street && (n.streetKind || 'side') === kind);
      };
      const n = isSameKind(x, y-1), s = isSameKind(x, y+1), w = isSameKind(x-1, y), e = isSameKind(x+1, y);
      const style = kind === 'main' ? mainStreetStyle : streetStyle;
      const { name } = resolveDawnLikeFloorName(style, { n, s, e, w }, atlas.byName);
      layers.push({ name, z: 0.5, reason: `${kind === 'main' ? 'Main' : 'Side'} street pavement` });
    }

    // z=1: building interior floor autotile. Door tiles also get the floor
    //       drawn under them so the threshold reads cleanly.
    if (tile.floor || tile.door) {
      const inBuilding = (nx, ny) => {
        const t = mapData[`${nx},${ny}`];
        return !!(t && (t.floor || t.door));
      };
      const n = inBuilding(x, y-1), s = inBuilding(x, y+1), w = inBuilding(x-1, y), e = inBuilding(x+1, y);
      const base = tile.floorBase || floorStyle;
      const { name } = resolveDawnLikeFloorName(base, { n, s, e, w }, atlas.byName);
      layers.push({ name, z: 1, reason: 'Building floor' });
    }

    // z=1.5: rug autotile (9-variant via the floor resolver).
    if (tile.rug) {
      const isRug = (nx, ny) => !!mapData[`${nx},${ny}`]?.rug && mapData[`${nx},${ny}`]?.rugBase === tile.rugBase;
      const n = isRug(x, y-1), s = isRug(x, y+1), w = isRug(x-1, y), e = isRug(x+1, y);
      const { name } = resolveDawnLikeFloorName(tile.rugBase, { n, s, e, w }, atlas.byName);
      layers.push({ name, z: 1.5, reason: 'Rug' });
    }

    // z=0.6: ground decor (flowers, etc.) on plain grass tiles only.
    if (tile.decor && tile.type === 'grass' && !tile.tree && atlas.byName[tile.decor]) {
      layers.push({ name: tile.decor, z: 0.6, reason: 'Ground flora' });
    }

    // z=2: walls — use the rot.js dungeon-style autotile so corners +
    //      T-junctions resolve correctly even for small building blobs.
    //      Doors count as walls so the wall sprites flanking a doorway
    //      don't render end-caps where the wall is "open" for the door.
    if (tile.wall) {
      const inBoundsRender = (nx, ny) => nx >= 0 && ny >= 0 && nx < DISPLAY_WIDTH && ny < DISPLAY_HEIGHT;
      const isWall = (nx, ny) => {
        if (!inBoundsRender(nx, ny)) return true; // treat OOB as wall so the border closes
        const t = mapData[`${nx},${ny}`];
        return !!(t?.wall || t?.door);
      };
      const name = resolveDawnLikeDungeonWallName(
        wallStyle || 'bright brick wall', x, y, isWall, atlas.byName
      );
      if (name) {
        const n = isWall(x, y-1), s = isWall(x, y+1), w = isWall(x-1, y), e = isWall(x+1, y);
        layers.push({ name, z: 2, reason: 'Dungeon wall (rot.js)', context: { kind: 'wall', neighbors: { n, s, e, w } } });
      }
    }

    // z=2.3: graveyard fence (openPath autotile).
    if (tile.fence) {
      const isFence = (nx, ny) => !!mapData[`${nx},${ny}`]?.fence;
      const n = isFence(x, y-1), s = isFence(x, y+1), w = isFence(x-1, y), e = isFence(x+1, y);
      const { name } = resolveAutotile('openPath', 'stone fence', { n, s, e, w }, atlas.byName);
      layers.push({ name, z: 2.3, reason: 'Graveyard fence', context: { kind: 'fence', neighbors: { n, s, e, w } } });
    }

    // z=2.5: door (locked vault doors render as iron portcullis).
    if (tile.door) {
      const isSide = tile.door === 'side';
      const name = tile.doorLocked
        ? (isSide ? 'locked iron portcullis side' : 'locked iron portcullis front')
        : (isSide ? 'open wooden door side' : 'open wooden door front');
      if (atlas.byName[name]) layers.push({ name, z: 2.5, reason: tile.doorLocked ? 'Locked vault door' : 'Door' });
    }

    // z=3: furniture / fountain / gravestone / coffin.
    if (tile.furniture && atlas.byName[tile.furniture]) {
      layers.push({ name: tile.furniture, z: 3, reason: 'Furniture' });
    }
    if (tile.fountain && atlas.byName['fountain']) {
      layers.push({ name: 'fountain', z: 3, reason: 'Plaza fountain' });
    }
    if (tile.gravestone && atlas.byName[tile.gravestone]) {
      layers.push({ name: tile.gravestone, z: 3, reason: 'Graveyard' });
    }

    // z=3.5: shop sign.
    if (tile.sign && atlas.byName[tile.sign]) {
      layers.push({ name: tile.sign, z: 3.5, reason: 'Building sign' });
    }

    // z=4: door plants on street tiles (ground flora on grass already
    //      drew at z=0.6).
    if (tile.decor && tile.type !== 'grass' && atlas.byName[tile.decor]) {
      layers.push({ name: tile.decor, z: 4, reason: 'Door decoration' });
    }

    // z=4.5: trees (16-way forest autotile). Only on grass and only when
    //        the tile isn't covered by anything town-related.
    if (tile.tree && !tile.street && !tile.wall && !tile.floor && !tile.door) {
      const isTree = (nx, ny) => !!mapData[`${nx},${ny}`]?.tree;
      const n = isTree(x, y-1), s = isTree(x, y+1), w = isTree(x-1, y), e = isTree(x+1, y);
      const nw = isTree(x-1, y-1), ne = isTree(x+1, y-1), sw = isTree(x-1, y+1), se = isTree(x+1, y+1);
      const { name, reason } = resolveDawnLikeForestName(treeStyle || 'light oak', { n, s, e, w, nw, ne, sw, se }, atlas.byName);
      if (name) layers.push({
        name, z: 4.5, reason: `Tree (${reason})`,
        context: { kind: 'forest', neighbors: { n, s, e, w, nw, ne, sw, se } }
      });
    }

    return layers;
  };

  useEffect(() => { setPickerLayerZ(null); }, [pinnedTile?.x, pinnedTile?.y]);

  const overrideLog = useMemo(() => {
    const entries = [];
    for (const key of Object.keys(spriteOverrides)) {
      const [xs, ys, zs] = key.split(',');
      const x = parseInt(xs), y = parseInt(ys), z = parseFloat(zs);
      const auto = getTileLayers(x, y).find(l => l.z === z);
      if (!auto) continue;
      entries.push({ pos: { x, y }, z, auto: auto.name, picked: spriteOverrides[key], context: auto.context || null });
    }
    entries.sort((a, b) => a.pos.y - b.pos.y || a.pos.x - b.pos.x || a.z - b.z);
    return entries;
  }, [spriteOverrides, mapData, atlas, wallStyle, floorStyle, streetStyle, mainStreetStyle, grassStyle]);

  const copyLog = () => {
    const text = JSON.stringify(overrideLog, null, 2);
    if (navigator.clipboard) navigator.clipboard.writeText(text);
  };

  const applyOverrides = (x, y, layers) => layers.map(l => {
    const key = `${x},${y},${l.z}`;
    return spriteOverrides[key] ? { ...l, name: spriteOverrides[key], overridden: true } : l;
  });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  if (error) return <div className="autotile-layout full-viewport"><div className="control-card" style={{color: 'red'}}>Error: {error}</div></div>;
  if (loading || !atlas) return <div className="autotile-layout full-viewport"><div className="control-card">Loading...</div></div>;

  const activeTile = pinnedTile || hoverInfo;
  const activeLayers = activeTile ? applyOverrides(activeTile.x, activeTile.y, getTileLayers(activeTile.x, activeTile.y)) : [];
  const popupX = pinnedTile ? pinnedTile.screenX : mousePos.x;
  const popupY = pinnedTile ? pinnedTile.screenY : mousePos.y;

  return (
    <div className="autotile-layout full-viewport">
      <button className="gear-button" onClick={() => setShowConfig(!showConfig)}>⚙️</button>
      {showConfig && (
        <div className="floating-config">
          <div className="control-card">
            <h3>Tile Overrides</h3>
            {overrideLog.length === 0 ? (
              <div style={{ color: '#bbb', fontSize: 13 }}>
                No overrides yet. Click any tile to pin its inspector, then
                pick an alternate sprite from the swatch picker to override
                the autotile choice. Use the Storybook Controls panel for
                generator settings (seed, styles, etc.).
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, color: '#fff' }}>
                  <strong>Overrides ({overrideLog.length})</strong>
                  <span>
                    <button onClick={copyLog} title="Copy log JSON">📋 Copy</button>
                    <button onClick={() => setSpriteOverrides({})} style={{ marginLeft: 4 }}>Clear</button>
                  </span>
                </div>
                <pre style={{ maxHeight: 240, overflow: 'auto', fontSize: 11, margin: 0, background: 'rgba(0,0,0,0.35)', padding: 6, borderRadius: 4, color: '#fff' }}>
{JSON.stringify(overrideLog, null, 2)}
                </pre>
              </>
            )}
          </div>
        </div>
      )}
      <div className="map-viewport maximized">
        <div className="map-grid" style={{ width: DISPLAY_WIDTH * TILE_SIZE, height: DISPLAY_HEIGHT * TILE_SIZE }} onMouseMove={handleMouseMove} onMouseLeave={() => setHoverInfo(null)} onClick={() => setPinnedTile(null)}>
          {Array.from({ length: DISPLAY_HEIGHT }).map((_, y) => (
            Array.from({ length: DISPLAY_WIDTH }).map((_, x) => {
              const layers = applyOverrides(x, y, getTileLayers(x, y));
              return (
                <div
                  key={`${x},${y}`}
                  onMouseEnter={() => setHoverInfo({ x, y })}
                  onClick={e => {
                    e.stopPropagation();
                    const rect = e.currentTarget.parentElement.getBoundingClientRect();
                    setPinnedTile({ x, y, screenX: e.clientX - rect.left, screenY: e.clientY - rect.top });
                  }}
                  style={{ position: 'absolute', left: x * TILE_SIZE, top: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, cursor: 'pointer' }}
                >
                  {layers.map((layer, idx) => {
                    const sprite = atlas.byName[layer.name];
                    if (!sprite) return null;
                    const trans = [];
                    if (layer.flipX) trans.push('scaleX(-1)');
                    if (layer.flipY) trans.push('scaleY(-1)');
                    if (layer.rotate) trans.push(`rotate(${layer.rotate}deg)`);
                    return (
                      <div key={idx} style={{ position: 'absolute', inset: 0, backgroundImage: `url(${resolveAssetPath('/DawnlikeAtlas0.png')})`, backgroundPosition: `-${sprite.x}px -${sprite.y}px`, backgroundSize: `${atlas.meta.size.w}px ${atlas.meta.size.h}px`, zIndex: layer.z * 10, transform: trans.join(' ') }} />
                    );
                  })}
                </div>
              );
            })
          ))}
          {activeTile && (
            <div
              className="logic-popup"
              onClick={e => e.stopPropagation()}
              style={{ position: 'absolute', left: popupX + 20, top: popupY + 20, zIndex: 1000, pointerEvents: pinnedTile ? 'auto' : 'none' }}
            >
              <div className="popup-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Tile: {activeTile.x}, {activeTile.y}{pinnedTile ? ' 📌' : ''}</span>
                {pinnedTile && (
                  <button onClick={() => setPinnedTile(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.1em', padding: '0 4px' }} title="Close">✕</button>
                )}
              </div>
              <div className="popup-layers">
                {activeLayers.map((l, i) => {
                  const base = cleanName(l.name);
                  const options = spritesByBase[base] || [l.name];
                  const overrideKey = `${activeTile.x},${activeTile.y},${l.z}`;
                  const pickerOpen = pinnedTile && pickerLayerZ === l.z && options.length > 1;
                  const sw = TILE_SIZE * 1;
                  return (
                    <div key={i} className="popup-layer">
                      <div
                        onClick={() => { if (!pinnedTile || options.length <= 1) return; setPickerLayerZ(prev => prev === l.z ? null : l.z); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: (pinnedTile && options.length > 1) ? 'pointer' : 'default' }}
                      >
                        <span className="layer-tag">L{l.z}</span>
                        <span className="layer-name" style={{ flex: 1 }}>{l.name}{l.overridden ? ' *' : ''}</span>
                        {pinnedTile && options.length > 1 && (
                          <span style={{ opacity: 0.6, fontSize: '0.8em' }}>{pickerOpen ? '▾' : '▸'} {options.length}</span>
                        )}
                      </div>
                      <div className="layer-reason">{l.reason}</div>
                      {pickerOpen && (
                        <div style={{ marginTop: 6, padding: 6, background: 'rgba(0,0,0,0.35)', borderRadius: 4, display: 'grid', gridTemplateColumns: `repeat(auto-fill, ${sw + 4}px)`, gap: 4, maxHeight: 260, overflowY: 'auto' }}>
                          {options.map(opt => {
                            const sp = atlas.byName[opt];
                            if (!sp) return null;
                            const selected = opt === l.name;
                            return (
                              <div
                                key={opt}
                                title={opt}
                                onClick={() => {
                                  setSpriteOverrides(prev => {
                                    const next = { ...prev };
                                    const autoLayers = getTileLayers(activeTile.x, activeTile.y);
                                    const autoLayer = autoLayers.find(al => al.z === l.z);
                                    if (autoLayer && autoLayer.name === opt) delete next[overrideKey];
                                    else next[overrideKey] = opt;
                                    return next;
                                  });
                                  setPickerLayerZ(null);
                                }}
                                style={{ width: sw, height: sw, cursor: 'pointer', border: selected ? '2px solid #ffd166' : '2px solid transparent', borderRadius: 3, boxSizing: 'content-box', position: 'relative', background: 'rgba(255,255,255,0.04)' }}
                              >
                                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${resolveAssetPath('/DawnlikeAtlas0.png')})`, backgroundPosition: `-${sp.x * (sw / TILE_SIZE)}px -${sp.y * (sw / TILE_SIZE)}px`, backgroundSize: `${atlas.meta.size.w * (sw / TILE_SIZE)}px ${atlas.meta.size.h * (sw / TILE_SIZE)}px`, imageRendering: 'pixelated' }} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {pinnedTile && Object.keys(spriteOverrides).some(k => k.startsWith(`${activeTile.x},${activeTile.y},`)) && (
                  <button
                    onClick={() => setSpriteOverrides(prev => { const next = { ...prev }; for (const k of Object.keys(next)) { if (k.startsWith(`${activeTile.x},${activeTile.y},`)) delete next[k]; } return next; })}
                    style={{ marginTop: 6 }}
                  >Reset this tile</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
