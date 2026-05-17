import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as ROT from 'rot-js';
import { resolveAssetPath } from './utils/paths';
import { resolveDawnLikeWallName } from './utils/autotile';
import './Autotile.css';

const TILE_SIZE = 16;
const SCALE = 2.5;
const DISPLAY_WIDTH = 40;
const DISPLAY_HEIGHT = 30;

const MAP_TYPES = [
  { id: 'digger', label: 'Digger (Dungeon)', class: ROT.Map.Digger },
  { id: 'uniform', label: 'Uniform (Classic)', class: ROT.Map.Uniform },
  { id: 'cellular', label: 'Cellular (Cave)', class: ROT.Map.Cellular },
  { id: 'divided', label: 'Divided Maze', class: ROT.Map.DividedMaze },
  { id: 'icey', label: 'Icey Maze', class: ROT.Map.IceyMaze },
  { id: 'eller', label: 'Eller Maze', class: ROT.Map.EllerMaze },
];

export default function AutotileExample() {
  const [mapData, setMapData] = useState(null);
  const [atlas, setAtlas] = useState(null);
  const [error, setError] = useState(null);
  const [mapType, setMapType] = useState('digger');
  const [wallStyle, setWallStyle] = useState('');
  const [floorStyle, setFloorStyle] = useState('');
  const [seed, setSeed] = useState(Math.floor(Math.random() * 1000000));
  const [loading, setLoading] = useState(true);

  // Dynamically discover styles from atlas tags
  const { discoveredWalls, discoveredFloors } = useMemo(() => {
    if (!atlas?.byName) return { discoveredWalls: [], discoveredFloors: [] };
    
    const walls = new Set();
    const floors = new Set();

    // Aggressive suffix stripper
    const clean = (name) => {
      const keywords = ['left', 'right', 'up', 'down', 'flat', 'center', 'nw', 'ne', 'sw', 'se', 'dense', 'nwe', 'nswe', 'we', 'nsw', 'ns', 'nse', 'swe', 'c', 'n', 's', 'e', 'w'];
      let words = name.split(' ');
      while (words.length > 1 && keywords.includes(words[words.length - 1])) {
        words.pop();
      }
      return words.join(' ').trim();
    };

    Object.entries(atlas.byName).forEach(([name, data]) => {
      // Walls: Must have 'wall' tag and come from the Wall sheet
      if (data.tags?.includes('wall') && data.sourceFile === 'Objects/Wall') {
        const base = clean(name);
        if (base) walls.add(base);
      }
      
      // Floors: Must come from the Floor sheet
      if (data.sourceFile === 'Objects/Floor') {
        const base = clean(name);
        if (base && base !== 'empty') floors.add(base);
      }
    });

    return {
      discoveredWalls: Array.from(walls).sort(),
      discoveredFloors: Array.from(floors).sort()
    };
  }, [atlas]);

  // Set initial styles once discovered
  useEffect(() => {
    if (discoveredWalls.length > 0 && !wallStyle) setWallStyle(discoveredWalls[0]);
    if (discoveredFloors.length > 0 && !floorStyle) setFloorStyle(discoveredFloors[0]);
  }, [discoveredWalls, discoveredFloors]);

  // Load atlas metadata
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

  // Generate map using rot.js
  useEffect(() => {
    if (!atlas) return;
    
    ROT.RNG.setSeed(seed);
    const selectedType = MAP_TYPES.find(t => t.id === mapType);
    const MapClass = selectedType.class;
    
    const map = new MapClass(DISPLAY_WIDTH, DISPLAY_HEIGHT);
    const data = {};
    
    if (mapType === 'cellular') {
      map.randomize(0.5);
      for (let i = 0; i < 4; i++) map.create();
      map.create((x, y, value) => {
        data[`${x},${y}`] = value;
      });
    } else {
      map.create((x, y, value) => {
        data[`${x},${y}`] = value; // 0 = floor, 1 = wall
      });
    }
    
    setMapData(data);
  }, [seed, mapType, atlas]);

  const getTile = (x, y) => {
    if (!mapData || !atlas) return null;
    const value = mapData[`${x},${y}`];
    
    if (value === 0) {
      const name = `${floorStyle} c`;
      return atlas.byName[name] ? name : `${floorStyle} center`;
    } else {
      const outOfBounds = (tx, ty) => tx < 0 || tx >= DISPLAY_WIDTH || ty < 0 || ty >= DISPLAY_HEIGHT;
      const isWall = (tx, ty) => outOfBounds(tx, ty) || mapData[`${tx},${ty}`] === 1;
      
      const isSurfaceWall = (tx, ty) => {
        if (outOfBounds(tx, ty) || !isWall(tx, ty)) return false;
        // Check 8-way neighbors for open space
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = tx + dx;
            const ny = ty + dy;
            if (outOfBounds(nx, ny)) continue; // OOB ignored for surface check
            if (!isWall(nx, ny)) return true;
          }
        }
        return false;
      };

      if (!isSurfaceWall(x, y)) {
        // Deep interior wall (not connected to a room or hall)
        return null;
      }

      const isOpen = (tx, ty) => outOfBounds(tx, ty) || !isWall(tx, ty);

      const lateralOpen = (ny) => isOpen(x - 1, y) || isOpen(x + 1, y) || isOpen(x - 1, ny) || isOpen(x + 1, ny);
      const verticalOpen = (nx) => isOpen(x, y - 1) || isOpen(x, y + 1) || isOpen(nx, y - 1) || isOpen(nx, y + 1);

      const n = isSurfaceWall(x, y - 1) && lateralOpen(y - 1);
      const s = isSurfaceWall(x, y + 1) && lateralOpen(y + 1);
      const w = isSurfaceWall(x - 1, y) && verticalOpen(x - 1);
      const e = isSurfaceWall(x + 1, y) && verticalOpen(x + 1);

      return resolveDawnLikeWallName(wallStyle, { n, s, e, w }, atlas.byName);
    }
  };

  const stats = useMemo(() => {
    if (!mapData) return { walls: 0, floors: 0 };
    let walls = 0, floors = 0;
    Object.values(mapData).forEach(v => {
      if (v === 1) walls++; else floors++;
    });
    return { walls, floors };
  }, [mapData]);

  if (error) return <div className="autotile-layout"><div className="control-card" style={{color: 'red'}}>Error: {error}</div></div>;
  if (loading) return <div className="autotile-layout"><div className="control-card">Loading Atlas Metadata...</div></div>;

  const atlasImage = resolveAssetPath('/DawnlikeAtlas0.png');

  return (
    <div className="autotile-layout">
      <div className="autotile-sidebar">
        <div className="control-card">
          <h3>Map Configuration</h3>
          
          <div className="field-group">
            <label>Generator Type</label>
            <select value={mapType} onChange={e => setMapType(e.target.value)}>
              {MAP_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          <div className="field-group">
            <label>Wall Style</label>
            <select value={wallStyle} onChange={e => setWallStyle(e.target.value)}>
              {discoveredWalls.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="field-group">
            <label>Floor Style</label>
            <select value={floorStyle} onChange={e => setFloorStyle(e.target.value)}>
              {discoveredFloors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="field-group">
            <label>Seed</label>
            <input type="number" value={seed} onChange={e => setSeed(Number(e.target.value))} />
          </div>

          <button className="primary-button" onClick={() => setSeed(Math.floor(Math.random() * 1000000))}>
             🎲 Randomize & Build
          </button>
        </div>

        <div className="control-card">
          <h3>Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item"><span className="stat-label">Wall Tiles</span><span className="stat-value">{stats.walls}</span></div>
            <div className="stat-item"><span className="stat-label">Floor Tiles</span><span className="stat-value">{stats.floors}</span></div>
          </div>
        </div>
      </div>

      <div className="map-viewport">
        <div 
          className="map-grid"
          style={{
            width: DISPLAY_WIDTH * TILE_SIZE * SCALE,
            height: DISPLAY_HEIGHT * TILE_SIZE * SCALE,
          }}
        >
          {mapData && Array.from({ length: DISPLAY_HEIGHT }).map((_, y) => (
            Array.from({ length: DISPLAY_WIDTH }).map((_, x) => {
              const tileName = getTile(x, y);
              const sprite = atlas.byName[tileName];
              if (!sprite) return null;

              return (
                <div
                  key={`${x},${y}`}
                  style={{
                    position: 'absolute',
                    left: x * TILE_SIZE * SCALE,
                    top: y * TILE_SIZE * SCALE,
                    width: TILE_SIZE * SCALE,
                    height: TILE_SIZE * SCALE,
                    backgroundImage: `url(${atlasImage})`,
                    backgroundPosition: `-${sprite.x * SCALE}px -${sprite.y * SCALE}px`,
                    backgroundSize: `${atlas.meta.size.w * SCALE}px ${atlas.meta.size.h * SCALE}px`,
                  }}
                  title={tileName}
                />
              );
            })
          ))}
        </div>
      </div>
    </div>
  );
}
