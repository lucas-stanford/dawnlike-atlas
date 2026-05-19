import React, { useState, useEffect, useMemo } from 'react';
import * as ROT from 'rot-js';
import { resolveAssetPath } from './utils/paths';
import { resolveDawnLikeFloorName, resolveDawnLikeDungeonWallName } from './utils/autotile';
import './Autotile.css';

const TILE_SIZE = 16;
const DISPLAY_WIDTH = 40;
const DISPLAY_HEIGHT = 30;

const MAP_TYPES = [
  { id: 'digger',   label: 'Digger (Dungeon)',  class: ROT.Map.Digger },
  { id: 'uniform',  label: 'Uniform (Classic)', class: ROT.Map.Uniform },
  { id: 'cellular', label: 'Cellular (Cave)',   class: ROT.Map.Cellular },
  { id: 'divided',  label: 'Divided Maze',      class: ROT.Map.DividedMaze },
  { id: 'icey',     label: 'Icey Maze',         class: ROT.Map.IceyMaze },
  { id: 'eller',    label: 'Eller Maze',        class: ROT.Map.EllerMaze },
];

export default function DungeonExample() {
  const [mapData, setMapData] = useState(null);
  const [atlas, setAtlas] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [mapType, setMapType]     = useState('digger');
  const [wallStyle, setWallStyle]   = useState('');
  const [floorStyle, setFloorStyle] = useState('');
  const [seed, setSeed] = useState(Math.floor(Math.random() * 1000000));
  const [scale, setScale] = useState(2);
  const [cellularDensity, setCellularDensity] = useState(50);
  const [cellularSmooth, setCellularSmooth] = useState(4);

  const [showConfig, setShowConfig] = useState(false);

  // Discover wall + floor base names from the atlas tags.
  const { discoveredWalls, discoveredFloors } = useMemo(() => {
    if (!atlas?.byName) return { discoveredWalls: [], discoveredFloors: [] };
    const walls = new Set();
    const floors = new Set();
    const directional = ['left', 'right', 'up', 'down', 'flat', 'center', 'nw', 'ne', 'sw', 'se', 'dense', 'nwe', 'nswe', 'we', 'nsw', 'ns', 'nse', 'swe', 'c', 'n', 's', 'e', 'w'];
    const clean = (name) => {
      let words = name.split(' ');
      while (words.length > 1 && directional.includes(words[words.length - 1])) words.pop();
      return words.join(' ').trim();
    };
    Object.entries(atlas.byName).forEach(([name, data]) => {
      if (data.tags?.includes('wall') && data.sourceFile === 'Objects/Wall') {
        const base = clean(name);
        if (base) walls.add(base);
      }
      if (data.sourceFile === 'Objects/Floor') {
        const base = clean(name);
        if (base && base !== 'empty') floors.add(base);
      }
    });
    return {
      discoveredWalls: [...walls].sort(),
      discoveredFloors: [...floors].sort(),
    };
  }, [atlas]);

  useEffect(() => {
    if (discoveredWalls.length > 0 && !wallStyle) {
      setWallStyle(discoveredWalls.includes('bright mine wall') ? 'bright mine wall' : discoveredWalls[0]);
    }
    if (discoveredFloors.length > 0 && !floorStyle) {
      setFloorStyle(discoveredFloors.includes('day brick floor') ? 'day brick floor' : discoveredFloors[0]);
    }
  }, [discoveredWalls, discoveredFloors, wallStyle, floorStyle]);

  useEffect(() => {
    fetch(resolveAssetPath('/DawnlikeAtlas.json'))
      .then(r => { if (!r.ok) throw new Error(`Failed to load atlas: ${r.statusText}`); return r.json(); })
      .then(setAtlas)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Generate the map any time a generator-relevant option changes.
  useEffect(() => {
    if (!atlas) return;
    ROT.RNG.setSeed(seed);
    const selectedType = MAP_TYPES.find(t => t.id === mapType);
    const MapClass = selectedType.class;
    const map = new MapClass(DISPLAY_WIDTH, DISPLAY_HEIGHT);
    const data = {};
    if (mapType === 'cellular') {
      map.randomize(cellularDensity / 100);
      for (let i = 0; i < cellularSmooth; i++) map.create();
      map.create((x, y, value) => { data[`${x},${y}`] = value; });
    } else {
      map.create((x, y, value) => { data[`${x},${y}`] = value; });
    }
    setMapData(data);
  }, [seed, mapType, atlas, cellularDensity, cellularSmooth]);

  const getTile = (x, y) => {
    if (!mapData || !atlas) return null;
    const value = mapData[`${x},${y}`];
    const outOfBounds = (tx, ty) => tx < 0 || tx >= DISPLAY_WIDTH || ty < 0 || ty >= DISPLAY_HEIGHT;
    if (value === 0) {
      const isFloor = (tx, ty) => !outOfBounds(tx, ty) && mapData[`${tx},${ty}`] === 0;
      const n = isFloor(x, y - 1);
      const s = isFloor(x, y + 1);
      const w = isFloor(x - 1, y);
      const e = isFloor(x + 1, y);
      return resolveDawnLikeFloorName(floorStyle, { n, s, e, w }, atlas.byName).name;
    }
    const isWall = (tx, ty) => outOfBounds(tx, ty) || mapData[`${tx},${ty}`] === 1;
    return resolveDawnLikeDungeonWallName(wallStyle, x, y, isWall, atlas.byName);
  };

  const stats = useMemo(() => {
    if (!mapData) return { walls: 0, floors: 0 };
    let walls = 0, floors = 0;
    Object.values(mapData).forEach(v => { if (v === 1) walls++; else floors++; });
    return { walls, floors };
  }, [mapData]);

  if (error)   return <div className="autotile-layout full-viewport"><div className="control-card" style={{color:'red'}}>Error: {error}</div></div>;
  if (loading) return <div className="autotile-layout full-viewport"><div className="control-card">Loading Atlas Metadata...</div></div>;

  const atlasImage = resolveAssetPath('/DawnlikeAtlas0.png');
  const isCellular = mapType === 'cellular';

  return (
    <div className="autotile-layout full-viewport">
      <button className="gear-button" onClick={() => setShowConfig(!showConfig)}>⚙️</button>
      {showConfig && (
        <div className="floating-config">
          <div className="control-card">
            <h3>Dungeon Config</h3>
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
            {isCellular && (
              <>
                <div className="field-group">
                  <label>Cell density: {cellularDensity}%</label>
                  <input type="range" min="30" max="70" step="1" value={cellularDensity}
                         onChange={e => setCellularDensity(parseInt(e.target.value))} />
                </div>
                <div className="field-group">
                  <label>Smoothing passes: {cellularSmooth}</label>
                  <input type="range" min="0" max="8" step="1" value={cellularSmooth}
                         onChange={e => setCellularSmooth(parseInt(e.target.value))} />
                </div>
              </>
            )}
            <div className="field-group">
              <label>Seed</label>
              <input type="number" value={seed} onChange={e => setSeed(Number(e.target.value))} />
            </div>
            <div className="field-group">
              <label>Zoom: {scale.toFixed(1)}x</label>
              <input type="range" min="1" max="6" step="0.5" value={scale}
                     onChange={e => setScale(parseFloat(e.target.value))} />
            </div>
            <button className="primary-button"
                    onClick={() => setSeed(Math.floor(Math.random() * 1000000))}>
              🏰 Re-generate
            </button>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
              <div className="stats-grid">
                <div className="stat-item"><span className="stat-label">Wall Tiles</span><span className="stat-value">{stats.walls}</span></div>
                <div className="stat-item"><span className="stat-label">Floor Tiles</span><span className="stat-value">{stats.floors}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="map-viewport maximized">
        <div
          className="map-grid"
          style={{
            width: DISPLAY_WIDTH * TILE_SIZE * scale,
            height: DISPLAY_HEIGHT * TILE_SIZE * scale,
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
                    left: x * TILE_SIZE * scale,
                    top: y * TILE_SIZE * scale,
                    width: TILE_SIZE * scale,
                    height: TILE_SIZE * scale,
                    backgroundImage: `url(${atlasImage})`,
                    backgroundPosition: `-${sprite.x * scale}px -${sprite.y * scale}px`,
                    backgroundSize: `${atlas.meta.size.w * scale}px ${atlas.meta.size.h * scale}px`,
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
