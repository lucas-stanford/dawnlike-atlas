import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as ROT from 'rot-js';
import { resolveAssetPath } from './utils/paths';
import { resolveDawnLikeWallName, resolveDawnLikeForestName, resolveDawnLikeRiverName, resolveDawnLikeFloorName, resolveDawnLikePoolName, resolveDawnLikeMountainName, resolveAutotile } from './utils/autotile';
import './Autotile.css';

const TILE_SIZE = 16;
const DEFAULT_SCALE = 2.5;
const DISPLAY_WIDTH = 50;
const DISPLAY_HEIGHT = 40;

// Strips autotile / direction suffix keywords from a sprite name, so e.g.
// "light oak nw ne" → "light oak" — the shared "base" of an autotile family.
const SUFFIX_KEYWORDS = new Set([
  'left','right','up','down','flat','center','nw','ne','sw','se','dense',
  'nwe','nswe','we','nsw','ns','nse','swe','c','n','s','e','w','alone',
]);
const cleanName = (name) => {
  const words = name.split(' ');
  while (words.length > 1 && SUFFIX_KEYWORDS.has(words[words.length - 1])) {
    words.pop();
  }
  return words.join(' ').trim();
};

const TERRAIN_STYLES = [
  'morning grass floor',
  'day grass floor',
  'noon grass floor',
  'evening grass floor',
  'night grass floor',
  'morning stone floor',
  'morning tile floor',
];

const ROAD_STYLES = [
  'dirt trail',
  'sand trail',
  'rocky trail',
  'arduous trail',
];

const RIVER_STYLES = [
  'clear river',
  'cloudy river',
  'noxious river',
  'lava flow',
];

// Mountain "blob" families discovered in the atlas. Each has 10 sprites
// (alone, c, n/s/e/w, ne/nw/se/sw). Includes peak (rocky), snowcap, volcano
// and mound (rolling-hill) variants.
const MOUNTAIN_STYLES = [
  'brown peak',
  'dark peak',
  'green peak',
  'red peak',
  'yellow peak',
  'blue peak',
  'brown snowcap',
  'dark snowcap',
  'red volcano',
  'green mound',
];

export default function OutdoorExample() {
  const [rawMapData, setRawMapData] = useState(null);
  const [atlas, setAtlas] = useState(null);
  const [error, setError] = useState(null);
  const [terrainStyle, setTerrainStyle] = useState('');
  const [roadStyle, setRoadStyle] = useState('');
  const [riverStyle, setRiverStyle] = useState('');
  const [treeStyle, setTreeStyle] = useState('');
  const [mountainStyle, setMountainStyle] = useState('');
  const [dirtStyle, setDirtStyle] = useState('');
  const [seed, setSeed] = useState(Math.floor(Math.random() * 1000000));
  const [loading, setLoading] = useState(true);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [pinnedTile, setPinnedTile] = useState(null);
  const [pickerLayerZ, setPickerLayerZ] = useState(null);
  const [spriteOverrides, setSpriteOverrides] = useState({});
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showConfig, setShowConfig] = useState(false);

  // Dynamically discover styles from atlas
  const { discoveredTrees, discoveredFloors, discoveredRoads, discoveredRivers, discoveredMountains } = useMemo(() => {
    if (!atlas?.byName) return { discoveredTrees: [], discoveredFloors: [], discoveredRoads: [], discoveredRivers: [], discoveredMountains: [] };
    const trees = new Set();
    const floors = new Set();
    const roads = new Set();
    const rivers = new Set();
    const mountains = new Set();

    Object.entries(atlas.byName).forEach(([name, data]) => {
      if (data.sourceFile === 'Objects/Tree' || data.sourceFile === 'Objects/Tree0') {
        const base = cleanName(name);
        if (base) trees.add(base);
      }
      if (data.sourceFile === 'Objects/Floor') {
        const base = cleanName(name);
        if (base && base !== 'empty') floors.add(base);
      }
      if (data.sourceFile === 'Objects/Map') {
        const base = cleanName(name);
        if (base.includes('trail')) roads.add(base);
        if (base.includes('river') || base.includes('flow')) rivers.add(base);
      }
      if (data.sourceFile === 'Objects/Hill' || data.sourceFile === 'Objects/Hill0' || data.sourceFile === 'Objects/Hill1') {
        const base = cleanName(name);
        // Filter to peak/snowcap/volcano/mound families (the autotile sets)
        if (base && /\b(peak|snowcap|volcano|mound)\b/.test(base)) mountains.add(base);
      }
    });
    return {
      discoveredTrees: Array.from(trees).sort(),
      discoveredFloors: Array.from(floors).sort(),
      discoveredRoads: Array.from(roads).sort(),
      discoveredRivers: Array.from(rivers).sort(),
      discoveredMountains: Array.from(mountains).sort(),
    };
  }, [atlas]);

  // Index of every sprite grouped by its base name, for the click-to-pin
  // sprite picker (e.g. all 16 "light oak" autotile sprites).
  const spritesByBase = useMemo(() => {
    if (!atlas?.byName) return {};
    const map = {};
    for (const name of Object.keys(atlas.byName)) {
      const base = cleanName(name);
      if (!base) continue;
      if (!map[base]) map[base] = [];
      map[base].push(name);
    }
    for (const k of Object.keys(map)) map[k].sort();
    return map;
  }, [atlas]);

  useEffect(() => {
    if (discoveredTrees.length > 0 && !treeStyle) {
      const defaultTree = discoveredTrees.find(s => s === 'light oak') || discoveredTrees.find(s => s.includes('oak')) || discoveredTrees[0];
      setTreeStyle(defaultTree);
    }
    if (discoveredFloors.length > 0) {
      const defaultTerrain = discoveredFloors.find(s => s.includes('grass')) || discoveredFloors[0];
      if (!terrainStyle) setTerrainStyle(defaultTerrain);
      if (!dirtStyle) setDirtStyle(terrainStyle || defaultTerrain);
    }
    if (discoveredRoads.length > 0 && !roadStyle) setRoadStyle(discoveredRoads[0]);
    if (discoveredRivers.length > 0 && !riverStyle) setRiverStyle(discoveredRivers[0]);
    if (discoveredMountains.length > 0 && !mountainStyle) {
      const defaultMountain = discoveredMountains.find(s => s === 'brown peak') || discoveredMountains.find(s => s.endsWith('peak')) || discoveredMountains[0];
      setMountainStyle(defaultMountain);
    }
  }, [discoveredTrees, discoveredFloors, discoveredRoads, discoveredRivers, discoveredMountains]);

  useEffect(() => {
    fetch(resolveAssetPath('/DawnlikeAtlas.json'))
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load atlas: ${r.statusText}`);
        return r.json();
      })
      .then(setAtlas)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!atlas) return;
    
    ROT.RNG.setSeed(seed);
    const simplex = new ROT.Noise.Simplex();
    const data = {};

    // 1. Generate Base Biomes
    // Use a coarser secondary noise field to split "elevated" zones into
    // forest vs mountain biomes — large contiguous regions of one or the
    // other so zones feel distinct rather than salt-and-pepper.
    for (let y = 0; y < DISPLAY_HEIGHT; y++) {
      for (let x = 0; x < DISPLAY_WIDTH; x++) {
        const noise = simplex.get(x / 12, y / 12);
        const secNoise = simplex.get(x / 8 + 100, y / 8 + 100);
        const biomeNoise = simplex.get(x / 22 + 500, y / 22 + 500);

        let type = 'ground';
        let tree = false;
        let mountain = false;
        if (noise > 0.35) {
          // Elevated terrain — pick a biome based on coarse biome noise so
          // each contiguous "zone" is uniformly forest or mountain.
          if (biomeNoise > 0) {
            type = 'mountain';
            mountain = true;
          } else {
            type = 'forest';
            tree = true;
          }
        } else if (secNoise > 0.4) {
          type = 'dirt';
        }

        const tileData = { type, tree, mountain };

        // Procedural Decorations on empty ground (Scatter, reduced density)
        if (type === 'ground' && ROT.RNG.getUniform() > 0.96) {
          const decors = ['white flowers', 'sparse white flowers', 'blue flowers', 'sparse blue flowers', 'gold flowers', 'sparse gold flowers', 'red flowers', 'sparse red flowers', 'pebble', 'pebbles', 'rock'];
          tileData.decor = ROT.RNG.getItem(decors);
        }
        
        data[`${x},${y}`] = tileData;
      }
    }

    // 2. Generate Road (Strict Cardinal Steps) — like the river, the road
    // runs straight for the first/last EDGE_BUFFER tiles so it enters and
    // exits the map perpendicular to the edge rather than at a bend.
    let rx = 0;
    let ry = Math.floor(DISPLAY_HEIGHT / 2);
    const riverX = Math.floor(DISPLAY_WIDTH * 0.7);
    const ROAD_EDGE_BUFFER = 2;

    const clearForPath = (tx, ty) => {
      const t = data[`${tx},${ty}`];
      if (!t) return;
      t.road = true;
      t.tree = false;
      t.mountain = false;
    };

    while (rx < DISPLAY_WIDTH) {
      clearForPath(rx, ry);

      const nearRiver = Math.abs(rx - riverX) < 4;
      const nearEdge = rx < ROAD_EDGE_BUFFER || rx >= DISPLAY_WIDTH - ROAD_EDGE_BUFFER;
      const move = (nearRiver || nearEdge) ? 0 : ROT.RNG.getItem([-1, 0, 0, 0, 1]);

      if (move !== 0 && ry + move >= 0 && ry + move < DISPLAY_HEIGHT) {
        ry += move;
        clearForPath(rx, ry);
      }

      rx++;
      if (rx < DISPLAY_WIDTH) clearForPath(rx, ry);
    }

    // 3. Generate River — main channel meanders top→bottom by ±1 per row,
    // placing an L-bend connector tile in the same row whenever X shifts so
    // the path stays cardinally connected. Bridges form wherever a path
    // crosses a road, but capped at MAX_BRIDGES; once the cap is hit
    // subsequent crossings are skipped (the road tile is removed at that
    // intersection so the river continues uninterrupted).
    const MAX_BRIDGES = 2;
    let bridgesPlaced = 0;
    const clearForRiver = (tx, ty) => {
      const t = data[`${tx},${ty}`];
      if (!t) return null;
      t.river = true;
      t.tree = false;
      t.mountain = false;
      if (t.road) {
        if (bridgesPlaced < MAX_BRIDGES) {
          t.bridge = true;
          bridgesPlaced++;
        } else {
          // Over the bridge cap — remove the road segment at this crossing
          // so the river just flows across (a "ford"). The road network may
          // be visually broken here; acceptable for the demo and keeps the
          // crossing count exactly at the cap.
          t.road = false;
        }
      }
      return t;
    };

    let rvX = riverX;
    let intersectionLocked = 0;
    const mainRiverPath = [];
    // Tiles within EDGE_BUFFER of the top or bottom edge run straight so the
    // river enters/exits the map perpendicular to the edge instead of with a
    // visually awkward bend right at the boundary.
    const EDGE_BUFFER = 2;
    for (let rvY = 0; rvY < DISPLAY_HEIGHT; rvY++) {
      const t = clearForRiver(rvX, rvY);
      if (t) {
        mainRiverPath.push({ x: rvX, y: rvY });
        if (t.bridge) intersectionLocked = 4;
      }
      if (intersectionLocked > 0) {
        intersectionLocked--;
        continue;
      }
      const nearEdge = rvY < EDGE_BUFFER || rvY >= DISPLAY_HEIGHT - EDGE_BUFFER;
      const move = nearEdge ? 0 : ROT.RNG.getItem([-1, 0, 0, 0, 0, 1]);
      if (move !== 0 && rvX + move >= 0 && rvX + move < DISPLAY_WIDTH) {
        const newX = rvX + move;
        const conn = clearForRiver(newX, rvY);
        if (conn) {
          if (conn.bridge) intersectionLocked = 4;
          rvX = newX;
        }
      }
    }

    // 3b. Tributaries — branch off the main river at 1-2 random points and
    // flow horizontally toward the nearest map edge, meandering ±1 in Y as
    // they go. The first cell of each tributary creates a T-junction in the
    // main river (3-way), and a tributary crossing a road becomes a bridge.
    const numTributaries = 1 + (ROT.RNG.getUniform() > 0.5 ? 1 : 0);
    for (let t = 0; t < numTributaries; t++) {
      // Pick a branch point well inside the map and not adjacent to a bridge.
      const candidates = mainRiverPath.filter(p =>
        p.y > 4 && p.y < DISPLAY_HEIGHT - 5 &&
        p.x > 5 && p.x < DISPLAY_WIDTH - 5 &&
        !data[`${p.x},${p.y}`]?.bridge
      );
      if (!candidates.length) break;
      const start = ROT.RNG.getItem(candidates);
      const goLeft = start.x > DISPLAY_WIDTH / 2;
      const step = goLeft ? -1 : 1;
      let tx = start.x + step;
      let ty = start.y;
      let trbLocked = 0;
      while (tx >= 0 && tx < DISPLAY_WIDTH) {
        const tile = clearForRiver(tx, ty);
        if (tile?.bridge) trbLocked = 3;
        if (trbLocked > 0) {
          trbLocked--;
          tx += step;
          continue;
        }
        // Run straight when within EDGE_BUFFER of the destination edge.
        const nearTribEdge = goLeft
          ? tx <= EDGE_BUFFER
          : tx >= DISPLAY_WIDTH - 1 - EDGE_BUFFER;
        const dy = nearTribEdge ? 0 : ROT.RNG.getItem([-1, 0, 0, 0, 0, 1]);
        if (dy !== 0 && ty + dy >= 1 && ty + dy < DISPLAY_HEIGHT - 1) {
          ty += dy;
          const conn = clearForRiver(tx, ty);
          if (conn?.bridge) trbLocked = 3;
        }
        tx += step;
      }
    }

    // 4. Place castle — sometimes (~40% chance) a small walled keep, with
    // a 4-tile-square castle-wall ring and a single `castle` tile in the
    // center, dropped in a clear patch of ground that isn't on a road or
    // river or mountain. Exercises the 11-variant castle wall set.
    const placeCastle = () => {
      if (ROT.RNG.getUniform() > 0.4) return;
      const SIZE = 4;
      for (let attempt = 0; attempt < 40; attempt++) {
        const cx = 3 + Math.floor(ROT.RNG.getUniform() * (DISPLAY_WIDTH - SIZE - 6));
        const cy = 3 + Math.floor(ROT.RNG.getUniform() * (DISPLAY_HEIGHT - SIZE - 6));
        // Require all tiles in the bounding box to be plain ground.
        let ok = true;
        for (let dy = 0; dy < SIZE && ok; dy++) {
          for (let dx = 0; dx < SIZE && ok; dx++) {
            const tt = data[`${cx+dx},${cy+dy}`];
            if (!tt || tt.road || tt.river || tt.bridge || tt.mountain || tt.tree || tt.building) ok = false;
          }
        }
        if (!ok) continue;
        // Carve the keep: outline = castleWall (will autotile to the
        // proper corners/T's/straights at render time); interior = clear
        // ground except center = `castle` sprite.
        for (let dy = 0; dy < SIZE; dy++) {
          for (let dx = 0; dx < SIZE; dx++) {
            const tt = data[`${cx+dx},${cy+dy}`];
            tt.decor = null;
            if (dy === 0 || dy === SIZE - 1 || dx === 0 || dx === SIZE - 1) {
              tt.castleWall = true;
            }
          }
        }
        // Drop the castle keep sprite in the middle.
        const center = data[`${cx + Math.floor(SIZE/2)},${cy + Math.floor(SIZE/2)}`];
        center.building = 'castle';
        return;
      }
    };
    placeCastle();

    // 5. Place building
    let built = false;
    for (let x = 5; x < DISPLAY_WIDTH - 5 && !built; x++) {
      for (let y = 5; y < DISPLAY_HEIGHT - 5; y++) {
        if (data[`${x},${y}`]?.road && !data[`${x},${y}`]?.river) {
          const above = data[`${x},${y-1}`];
          if (above && !above.river && !above.road && !above.mountain && above.type !== 'water') {
             above.building = ROT.RNG.getItem(['homestead', 'campsite', 'fort']);
             above.tree = false;
             above.mountain = false;
             built = true; break;
          }
        }
      }
    }

    
    setRawMapData(data);
  }, [seed, atlas]);

  // Derived map: just clone rawMapData. (No corner-fill smoothing pass —
  // the autotile alone should resolve forest edges cleanly.)
  const mapData = useMemo(() => {
    if (!rawMapData) return null;
    const data = {};
    Object.entries(rawMapData).forEach(([key, tile]) => {
      data[key] = { ...tile };
    });
    return data;
  }, [rawMapData]);

  const getTileLayers = (x, y) => {
    if (!mapData || !atlas) return [];
    const tile = mapData[`${x},${y}`];
    if (!tile) return [];

    const layers = [];

    // Base Layer -1: Always render a solid block of the selected base terrain to prevent black spots
    let baseTerrain = `${terrainStyle} c`;
    if (!atlas.byName[baseTerrain]) baseTerrain = `${terrainStyle} center`;
    if (!atlas.byName[baseTerrain]) baseTerrain = terrainStyle;
    layers.push({ name: baseTerrain, z: -1, reason: `Base Terrain` });

    // Layer 0: Ground (Biome autotiling)
    // The user's chosen terrain renders under EVERYTHING (forest, road, river).
    // Dirt patches override with the chosen dirt style. Trees, roads, and
    // rivers stack on top in higher layers.
    let effectiveTerrain = terrainStyle;
    let reason = 'Biome';
    let layerType = 'ground';

    if (tile.type === 'dirt') {
      effectiveTerrain = dirtStyle || 'day dirt floor';
      reason = 'Dirt patch';
      layerType = 'dirt';
    }

    // Same-type test for floor autotiling: ground and forest tiles share the
    // same terrain underneath, so they match. Dirt patches are their own type.
    const sameType = (nx, ny) => {
      const neighbor = mapData[`${nx},${ny}`];
      if (!neighbor) return false;
      const myDirt = tile.type === 'dirt';
      const theirDirt = neighbor.type === 'dirt';
      return myDirt === theirDirt;
    };

    const n = sameType(x, y - 1);
    const s = sameType(x, y + 1);
    const w = sameType(x - 1, y);
    const e = sameType(x + 1, y);

    const terrainNameObj = resolveDawnLikeFloorName(effectiveTerrain, { n, s, e, w }, atlas.byName);
    layers.push({ name: terrainNameObj.name, z: 0, reason: `Ground: ${reason} (${terrainNameObj.reason})` });

    // Layer 0.5: Decorations
    if (tile.decor && !tile.road && !tile.river && !tile.building) {
      if (atlas.byName[tile.decor]) {
        layers.push({ name: tile.decor, z: 0.5, reason: "Decoration: Procedural scatter" });
      }
    }

    // Layer 1: River
    if (tile.river) {
      const n = mapData[`${x},${y-1}`]?.river;
      const s = mapData[`${x},${y+1}`]?.river;
      const w = mapData[`${x-1},${y}`]?.river;
      const e = mapData[`${x+1},${y}`]?.river;
      const { name, flipX } = resolveDawnLikeRiverName(riverStyle, { n, s, e, w }, atlas.byName);
      layers.push({ name, z: 1, flipX, reason: `River connection` });
    }

    // Layer 1.5: Bridge — the bridge deck is part of the road, so its
    // orientation follows the ROAD axis at this tile, not the river.
    // Road N+S neighbors ⇒ `bridge n s`, road E+W ⇒ `bridge e w`. When
    // the road bends AT the bridge tile, pick the diagonal whose axis
    // matches the bend (N+E or S+W ⇒ `ne sw`; N+W or S+E ⇒ `nw se`).
    if (tile.bridge) {
      const rn = !!mapData[`${x},${y-1}`]?.road;
      const rs = !!mapData[`${x},${y+1}`]?.road;
      const re = !!mapData[`${x+1},${y}`]?.road;
      const rw = !!mapData[`${x-1},${y}`]?.road;
      let bridgeName = 'bridge e w';
      if (rn && rs) bridgeName = 'bridge n s';
      else if (re && rw) bridgeName = 'bridge e w';
      else if ((rn && re) || (rs && rw)) bridgeName = 'bridge ne sw';
      else if ((rn && rw) || (rs && re)) bridgeName = 'bridge nw se';
      else if (rn || rs) bridgeName = 'bridge n s';
      else if (re || rw) bridgeName = 'bridge e w';
      if (!atlas.byName[bridgeName]) bridgeName = 'bridge n s';
      layers.push({ name: bridgeName, z: 1.5, reason: 'Crossing' });
    }

    // Layer 1.7: Castle walls (11-variant autotile via shared manifest).
    if (tile.castleWall) {
      const n = !!mapData[`${x},${y-1}`]?.castleWall;
      const s = !!mapData[`${x},${y+1}`]?.castleWall;
      const w = !!mapData[`${x-1},${y}`]?.castleWall;
      const e = !!mapData[`${x+1},${y}`]?.castleWall;
      const { name } = resolveAutotile('openPath', 'castle wall', { n, s, e, w }, atlas.byName);
      layers.push({
        name,
        z: 1.7,
        reason: `Castle wall`,
        context: { kind: 'castleWall', neighbors: { n, s, e, w } },
      });
    }

    // Layer 2: Road
    if (tile.road && !tile.bridge) {
      const n = mapData[`${x},${y-1}`]?.road;
      const s = mapData[`${x},${y+1}`]?.road;
      const w = mapData[`${x-1},${y}`]?.road;
      const e = mapData[`${x+1},${y}`]?.road;
      const name = resolveDawnLikeWallName(roadStyle, { n, s, e, w }, atlas.byName);
      layers.push({ name, z: 2, reason: `Road connection` });
    }

    // Layer 3: Buildings
    if (tile.building) {
      layers.push({ name: tile.building, z: 3, reason: "Settlement" });
    }

    // Layer 4: Trees (16-way autotile)
    if (tile.tree && !tile.road && !tile.river && !tile.building) {
      const n = mapData[`${x},${y-1}`]?.tree;
      const s = mapData[`${x},${y+1}`]?.tree;
      const w = mapData[`${x-1},${y}`]?.tree;
      const e = mapData[`${x+1},${y}`]?.tree;
      const nw = mapData[`${x-1},${y-1}`]?.tree;
      const ne = mapData[`${x+1},${y-1}`]?.tree;
      const sw = mapData[`${x-1},${y+1}`]?.tree;
      const se = mapData[`${x+1},${y+1}`]?.tree;

      const { name: treeName, reason } = resolveDawnLikeForestName(treeStyle || "light oak", { n, s, e, w, nw, ne, sw, se }, atlas.byName);
      layers.push({
        name: treeName,
        z: 4,
        reason,
        context: { kind: 'forest', neighbors: { n: !!n, s: !!s, e: !!e, w: !!w, nw: !!nw, ne: !!ne, sw: !!sw, se: !!se } },
      });
    }

    // Layer 4: Mountains (4-way blob autotile) — same z as trees since they
    // never coexist on a single tile (a zone is one or the other).
    if (tile.mountain && !tile.road && !tile.river && !tile.building) {
      const n = !!mapData[`${x},${y-1}`]?.mountain;
      const s = !!mapData[`${x},${y+1}`]?.mountain;
      const w = !!mapData[`${x-1},${y}`]?.mountain;
      const e = !!mapData[`${x+1},${y}`]?.mountain;
      const name = resolveDawnLikeMountainName(mountainStyle || "brown peak", { n, s, e, w }, atlas.byName);
      layers.push({
        name,
        z: 4,
        reason: `Mountain blob`,
        context: { kind: 'mountain', neighbors: { n, s, e, w } },
      });
    }

    return layers;
  };

  useEffect(() => { setPickerLayerZ(null); }, [pinnedTile?.x, pinnedTile?.y]);

  // Build a compact log of currently-overridden tiles: for each, the
  // auto-resolved sprite, the user-picked sprite, and the autotile context
  // (cardinal+diagonal neighbor truth table). Designed to be pasted back
  // to the LLM so it has everything it needs to fix the autotile rule.
  const overrideLog = useMemo(() => {
    const entries = [];
    for (const key of Object.keys(spriteOverrides)) {
      const [xs, ys, zs] = key.split(',');
      const x = parseInt(xs), y = parseInt(ys), z = parseFloat(zs);
      const auto = getTileLayers(x, y).find(l => l.z === z);
      if (!auto) continue;
      entries.push({
        pos: { x, y },
        z,
        auto: auto.name,
        picked: spriteOverrides[key],
        context: auto.context || null,
      });
    }
    entries.sort((a, b) => a.pos.y - b.pos.y || a.pos.x - b.pos.x || a.z - b.z);
    return entries;
  }, [spriteOverrides, mapData, atlas, treeStyle, terrainStyle, dirtStyle, roadStyle, riverStyle, mountainStyle]);

  const copyLog = () => {
    const text = JSON.stringify(overrideLog, null, 2);
    if (navigator.clipboard) navigator.clipboard.writeText(text);
  };

  // Apply per-tile sprite overrides set via the click-to-pin sprite picker.
  const applyOverrides = (x, y, layers) => layers.map(l => {
    const key = `${x},${y},${l.z}`;
    return spriteOverrides[key] ? { ...l, name: spriteOverrides[key], overridden: true } : l;
  });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  if (loading || !atlas) return <div className="autotile-layout full-viewport"><div className="control-card">Loading...</div></div>;

  // The popup uses the pinned tile (interactive) if any, else the hovered one.
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
            <h3>Outdoor Config</h3>
            <div className="field-group"><label>Terrain</label><select value={terrainStyle} onChange={e => setTerrainStyle(e.target.value)}>{discoveredFloors.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="field-group"><label>Dirt Patch</label><select value={dirtStyle} onChange={e => setDirtStyle(e.target.value)}>{discoveredFloors.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="field-group"><label>Path Style</label><select value={roadStyle} onChange={e => setRoadStyle(e.target.value)}>{discoveredRoads.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="field-group"><label>River Style</label><select value={riverStyle} onChange={e => setRiverStyle(e.target.value)}>{discoveredRivers.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="field-group"><label>Tree Style</label><select value={treeStyle} onChange={e => setTreeStyle(e.target.value)}>{discoveredTrees.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="field-group"><label>Mountain Style</label><select value={mountainStyle} onChange={e => setMountainStyle(e.target.value)}>{discoveredMountains.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="field-group"><label>Zoom: {scale.toFixed(1)}x</label><input type="range" min="1" max="6" step="0.5" value={scale} onChange={e => setScale(parseFloat(e.target.value))} /></div>
            <button className="primary-button" onClick={() => { setSpriteOverrides({}); setPinnedTile(null); setSeed(Math.floor(Math.random() * 1000000)); }}>🌲 Re-generate</button>
            {overrideLog.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong>Overrides ({overrideLog.length})</strong>
                  <span>
                    <button onClick={copyLog} title="Copy log JSON to clipboard">📋 Copy</button>
                    <button onClick={() => setSpriteOverrides({})} style={{ marginLeft: 4 }} title="Clear all overrides">Clear</button>
                  </span>
                </div>
                <pre style={{ maxHeight: 240, overflow: 'auto', fontSize: 11, margin: 0, background: 'rgba(0,0,0,0.35)', padding: 6, borderRadius: 4, color: '#fff' }}>
{JSON.stringify(overrideLog, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="map-viewport maximized">
        <div className="map-grid" style={{ width: DISPLAY_WIDTH * TILE_SIZE * scale, height: DISPLAY_HEIGHT * TILE_SIZE * scale }} onMouseMove={handleMouseMove} onMouseLeave={() => setHoverInfo(null)} onClick={() => setPinnedTile(null)}>
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
                  style={{ position: 'absolute', left: x * TILE_SIZE * scale, top: y * TILE_SIZE * scale, width: TILE_SIZE * scale, height: TILE_SIZE * scale, cursor: 'pointer' }}
                >
                  {layers.map((layer, idx) => {
                    const sprite = atlas.byName[layer.name];
                    if (!sprite) return null;
                    const trans = [];
                    if (layer.flipX) trans.push('scaleX(-1)');
                    if (layer.flipY) trans.push('scaleY(-1)');
                    if (layer.rotate) trans.push(`rotate(${layer.rotate}deg)`);
                    return (
                      <div key={idx} style={{ position: 'absolute', inset: 0, backgroundImage: `url(${resolveAssetPath('/DawnlikeAtlas0.png')})`, backgroundPosition: `-${sprite.x * scale}px -${sprite.y * scale}px`, backgroundSize: `${atlas.meta.size.w * scale}px ${atlas.meta.size.h * scale}px`, zIndex: layer.z * 10, transform: trans.join(' ') }} />
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
                  <button
                    onClick={() => setPinnedTile(null)}
                    style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.1em', padding: '0 4px' }}
                    title="Close"
                  >✕</button>
                )}
              </div>
              <div className="popup-layers">
                {activeLayers.map((l, i) => {
                  const base = cleanName(l.name);
                  const options = spritesByBase[base] || [l.name];
                  const overrideKey = `${activeTile.x},${activeTile.y},${l.z}`;
                  const pickerOpen = pinnedTile && pickerLayerZ === l.z && options.length > 1;
                  const sw = TILE_SIZE * 2; // picker swatch size (2x native)
                  return (
                    <div key={i} className="popup-layer">
                      <div
                        onClick={() => {
                          if (!pinnedTile || options.length <= 1) return;
                          setPickerLayerZ(prev => prev === l.z ? null : l.z);
                        }}
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
                        <div style={{
                          marginTop: 6,
                          padding: 6,
                          background: 'rgba(0,0,0,0.35)',
                          borderRadius: 4,
                          display: 'grid',
                          gridTemplateColumns: `repeat(auto-fill, ${sw + 4}px)`,
                          gap: 4,
                          maxHeight: 260,
                          overflowY: 'auto',
                        }}>
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
                                style={{
                                  width: sw,
                                  height: sw,
                                  cursor: 'pointer',
                                  border: selected ? '2px solid #ffd166' : '2px solid transparent',
                                  borderRadius: 3,
                                  boxSizing: 'content-box',
                                  position: 'relative',
                                  background: 'rgba(255,255,255,0.04)',
                                }}
                              >
                                <div style={{
                                  position: 'absolute',
                                  inset: 0,
                                  backgroundImage: `url(${resolveAssetPath('/DawnlikeAtlas0.png')})`,
                                  backgroundPosition: `-${sp.x * (sw / TILE_SIZE)}px -${sp.y * (sw / TILE_SIZE)}px`,
                                  backgroundSize: `${atlas.meta.size.w * (sw / TILE_SIZE)}px ${atlas.meta.size.h * (sw / TILE_SIZE)}px`,
                                  imageRendering: 'pixelated',
                                }} />
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
                    onClick={() => setSpriteOverrides(prev => {
                      const next = { ...prev };
                      for (const k of Object.keys(next)) {
                        if (k.startsWith(`${activeTile.x},${activeTile.y},`)) delete next[k];
                      }
                      return next;
                    })}
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
