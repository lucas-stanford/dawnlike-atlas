import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as ROT from 'rot-js';
import { resolveAssetPath } from './utils/paths';
import { resolveDawnLikeWallName, resolveDawnLikeForestName, resolveDawnLikeRiverName, resolveDawnLikeFloorName, resolveDawnLikePoolName } from './utils/autotile';
import './Autotile.css';

const TILE_SIZE = 16;
const SCALE = 2.5;
const DISPLAY_WIDTH = 50;
const DISPLAY_HEIGHT = 40;

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

export default function OutdoorExample() {
  const [mapData, setMapData] = useState(null);
  const [atlas, setAtlas] = useState(null);
  const [error, setError] = useState(null);
  const [terrainStyle, setTerrainStyle] = useState(TERRAIN_STYLES[1]);
  const [roadStyle, setRoadStyle] = useState(ROAD_STYLES[0]);
  const [riverStyle, setRiverStyle] = useState(RIVER_STYLES[0]);
  const [treeStyle, setTreeStyle] = useState('');
  const [seed, setSeed] = useState(Math.floor(Math.random() * 1000000));
  const [loading, setLoading] = useState(true);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showConfig, setShowConfig] = useState(false);

  // Dynamically discover styles from atlas
  const { discoveredTrees, discoveredFloors } = useMemo(() => {
    if (!atlas?.byName) return { discoveredTrees: [], discoveredFloors: [] };
    const trees = new Set();
    const floors = new Set();
    
    const clean = (name) => {
      const keywords = ['left', 'right', 'up', 'down', 'flat', 'center', 'nw', 'ne', 'sw', 'se', 'dense', 'nwe', 'nswe', 'we', 'nsw', 'ns', 'nse', 'swe', 'c', 'n', 's', 'e', 'w'];
      let words = name.split(' ');
      while (words.length > 1 && keywords.includes(words[words.length - 1])) {
        words.pop();
      }
      return words.join(' ').trim();
    };

    Object.entries(atlas.byName).forEach(([name, data]) => {
      if (data.sourceFile === 'Objects/Tree' || data.sourceFile === 'Objects/Tree0') {
        const base = clean(name);
        if (base) trees.add(base);
      }
      if (data.sourceFile === 'Objects/Floor') {
        const base = clean(name);
        if (base && base !== 'empty') floors.add(base);
      }
    });
    return { 
      discoveredTrees: Array.from(trees).sort(),
      discoveredFloors: Array.from(floors).sort()
    };
  }, [atlas]);

  useEffect(() => {
    if (discoveredTrees.length > 0 && !treeStyle) setTreeStyle(discoveredTrees[0]);
  }, [discoveredTrees, treeStyle]);

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
    for (let y = 0; y < DISPLAY_HEIGHT; y++) {
      for (let x = 0; x < DISPLAY_WIDTH; x++) {
        const noise = simplex.get(x / 12, y / 12);
        const secNoise = simplex.get(x / 8 + 100, y / 8 + 100);
        
        let type = 'ground';
        if (noise > 0.35) type = 'forest';
        else if (secNoise > 0.4) type = 'dirt';

        const tileData = { 
          type,
          // FILL the forest with trees
          tree: type === 'forest'
        };

        // Procedural Decorations on empty ground (Scatter, reduced density)
        if (type !== 'forest' && ROT.RNG.getUniform() > 0.96) {
          const decors = ['white flowers', 'sparse white flowers', 'blue flowers', 'sparse blue flowers', 'gold flowers', 'sparse gold flowers', 'red flowers', 'sparse red flowers', 'pebble', 'pebbles', 'rock'];
          tileData.decor = ROT.RNG.getItem(decors);
        }
        
        data[`${x},${y}`] = tileData;
      }
    }

    // 2. Generate Road (Strict Cardinal Steps)
    let rx = 0;
    let ry = Math.floor(DISPLAY_HEIGHT / 2);
    const riverX = Math.floor(DISPLAY_WIDTH * 0.7);
    
    while (rx < DISPLAY_WIDTH) {
      if (data[`${rx},${ry}`]) data[`${rx},${ry}`].road = true;
      
      const nearRiver = Math.abs(rx - riverX) < 4;
      const move = nearRiver ? 0 : ROT.RNG.getItem([-1, 0, 0, 0, 1]);
      
      if (move !== 0 && ry + move >= 0 && ry + move < DISPLAY_HEIGHT) {
        ry += move;
        if (data[`${rx},${ry}`]) data[`${rx},${ry}`].road = true;
      }
      
      rx++;
      if (rx < DISPLAY_WIDTH && data[`${rx},${ry}`]) data[`${rx},${ry}`].road = true;
    }

    // 3. Generate River (Meandering but strictly moving down overall to prevent forks)
    let rvX = riverX;
    let rvY = 0;
    let intersectionLocked = 0;
    while (rvY < DISPLAY_HEIGHT) {
      if (data[`${rvX},${rvY}`]) {
        data[`${rvX},${rvY}`].river = true;
        if (data[`${rvX},${rvY}`].road) {
          data[`${rvX},${rvY}`].bridge = true;
          intersectionLocked = 4; // Keep straight near bridge
        }
      }
      
      if (intersectionLocked > 0) {
        intersectionLocked--;
      } else {
        // Meander left or right
        const move = ROT.RNG.getItem([-1, 0, 0, 0, 0, 1]);
        if (move !== 0 && rvX + move >= 0 && rvX + move < DISPLAY_WIDTH) {
          rvX += move;
          if (data[`${rvX},${rvY}`]) {
            data[`${rvX},${rvY}`].river = true;
            if (data[`${rvX},${rvY}`].road) {
              data[`${rvX},${rvY}`].bridge = true;
              intersectionLocked = 4;
            }
          }
        }
      }
      rvY++;
    }

    // 4. Place building
    let built = false;
    for (let x = 5; x < DISPLAY_WIDTH - 5 && !built; x++) {
      for (let y = 5; y < DISPLAY_HEIGHT - 5; y++) {
        if (data[`${x},${y}`]?.road && !data[`${x},${y}`]?.river) {
          if (data[`${x},${y-1}`] && !data[`${x},${y-1}`].river && !data[`${x},${y-1}`].road && data[`${x},${y-1}`].type !== 'water') {
             data[`${x},${y-1}`].building = 'homestead';
             built = true; break;
          }
        }
      }
    }

    
    setMapData(data);
  }, [seed, atlas]);

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
    // Trees have baked-in grass, so use grass where there are trees or roads or rivers
    const useGrass = tile.tree || tile.road || tile.river || tile.type === 'forest';
    let effectiveTerrain = terrainStyle;
    let reason = 'Biome';
    let layerType = 'ground';
    
    if (useGrass) {
      effectiveTerrain = 'day grass floor';
      reason = 'Forced grass';
      layerType = 'grass';
    } else if (tile.type === 'dirt') {
      effectiveTerrain = 'day dirt floor';
      reason = 'Dirt patch';
      layerType = 'dirt';
    }

    // Floor/Pool Autotiling logic matches neighbors of the SAME type
    const sameType = (nx, ny) => {
      const neighbor = mapData[`${nx},${ny}`];
      if (!neighbor) return false;
      if (layerType === 'grass') return neighbor.tree || neighbor.road || neighbor.river || neighbor.type === 'forest';
      return neighbor.type === tile.type && !neighbor.road && !neighbor.river && !neighbor.tree;
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

    // Layer 1.5: Bridge
    if (tile.bridge) {
      layers.push({ name: 'bridge n s', z: 1.5, rotate: 90, reason: "Crossing" });
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

    // Layer 4: Trees (PERFECT 16-WAY AUTOTILE)
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
      layers.push({ name: treeName, z: 4, reason });
    }

    return layers;
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  if (loading || !atlas) return <div className="autotile-layout full-viewport"><div className="control-card">Loading...</div></div>;

  return (
    <div className="autotile-layout full-viewport">
      <button className="gear-button" onClick={() => setShowConfig(!showConfig)}>⚙️</button>
      {showConfig && (
        <div className="floating-config">
          <div className="control-card">
            <h3>Outdoor Config</h3>
            <div className="field-group"><label>Terrain</label><select value={terrainStyle} onChange={e => setTerrainStyle(e.target.value)}>{discoveredFloors.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="field-group"><label>Tree Style</label><select value={treeStyle} onChange={e => setTreeStyle(e.target.value)}>{discoveredTrees.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <button className="primary-button" onClick={() => setSeed(Math.floor(Math.random() * 1000000))}>🌲 Re-generate</button>
          </div>
        </div>
      )}
      <div className="map-viewport maximized">
        <div className="map-grid" style={{ width: DISPLAY_WIDTH * TILE_SIZE * SCALE, height: DISPLAY_HEIGHT * TILE_SIZE * SCALE }} onMouseMove={handleMouseMove} onMouseLeave={() => setHoverInfo(null)}>
          {Array.from({ length: DISPLAY_HEIGHT }).map((_, y) => (
            Array.from({ length: DISPLAY_WIDTH }).map((_, x) => {
              const layers = getTileLayers(x, y);
              return (
                <div key={`${x},${y}`} onMouseEnter={() => setHoverInfo({ x, y, layers })} style={{ position: 'absolute', left: x * TILE_SIZE * SCALE, top: y * TILE_SIZE * SCALE, width: TILE_SIZE * SCALE, height: TILE_SIZE * SCALE }}>
                  {layers.map((layer, idx) => {
                    const sprite = atlas.byName[layer.name];
                    if (!sprite) return null;
                    const trans = [];
                    if (layer.flipX) trans.push('scaleX(-1)');
                    if (layer.flipY) trans.push('scaleY(-1)');
                    if (layer.rotate) trans.push(`rotate(${layer.rotate}deg)`);
                    return (
                      <div key={idx} style={{ position: 'absolute', inset: 0, backgroundImage: `url(${resolveAssetPath('/DawnlikeAtlas0.png')})`, backgroundPosition: `-${sprite.x * SCALE}px -${sprite.y * SCALE}px`, backgroundSize: `${atlas.meta.size.w * SCALE}px ${atlas.meta.size.h * SCALE}px`, zIndex: layer.z * 10, transform: trans.join(' ') }} />
                    );
                  })}
                </div>
              );
            })
          ))}
          {hoverInfo && (
            <div className="logic-popup" style={{ position: 'absolute', left: mousePos.x + 20, top: mousePos.y + 20, zIndex: 1000, pointerEvents: 'none' }}>
              <div className="popup-header">Tile: {hoverInfo.x}, {hoverInfo.y}</div>
              <div className="popup-layers">
                {hoverInfo.layers.map((l, i) => (
                  <div key={i} className="popup-layer">
                    <span className="layer-tag">L{l.z}</span>
                    <span className="layer-name">{l.name}</span>
                    <div className="layer-reason">{l.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
