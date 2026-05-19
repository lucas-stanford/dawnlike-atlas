/**
 * DungeonExample — rot.js dungeon generator demo with the same gear-button
 * floating-config overlay that Wilderness and Town use.
 *
 * Every knob is exposed two ways:
 *   1. As a prop, so Storybook can drive it from the Controls panel (the
 *      story re-mounts via key= when args change so prop updates always win).
 *   2. As an in-canvas widget in the floating config card, so visitors who
 *      open the story in isolation can tweak without the Controls panel.
 *
 * Hover any tile to see a popup with its coordinates, sprite name, and the
 * autotile reason (which neighbours triggered the chosen sprite). Click a
 * tile to pin the popup so the picker / autotile reason stays put while you
 * compare with other tiles. Click outside the popup to unpin.
 */

import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import * as ROT from 'rot-js';
import { resolveAssetPath } from './utils/paths';
import { resolveDawnLikeFloorName, resolveDawnLikeDungeonWallName } from './utils/autotile';
import './Autotile.css';

const TILE_SIZE = 16;

const MAP_TYPES = [
  { id: 'digger',   label: 'Digger (Dungeon)',  class: ROT.Map.Digger },
  { id: 'uniform',  label: 'Uniform (Classic)', class: ROT.Map.Uniform },
  { id: 'cellular', label: 'Cellular (Cave)',   class: ROT.Map.Cellular },
  { id: 'divided',  label: 'Divided Maze',      class: ROT.Map.DividedMaze },
  { id: 'icey',     label: 'Icey Maze',         class: ROT.Map.IceyMaze },
  { id: 'eller',    label: 'Eller Maze',        class: ROT.Map.EllerMaze },
];

export const MAP_TYPE_IDS = MAP_TYPES.map(t => t.id);

export default function DungeonExample({
  mapType:            initialMapType         = 'digger',
  wallStyle:          initialWallStyle       = '',
  floorStyle:         initialFloorStyle      = '',
  seed:               initialSeed            = null,
  scale:              initialScale           = 2,
  cellularDensity:    initialCellularDensity = 50,
  cellularSmooth:     initialCellularSmooth  = 4,
  width:              initialWidth           = 40,
  height:             initialHeight          = 30,
  showConfigInitially = false,
} = {}) {
  const [atlas, setAtlas] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [mapType,        setMapType]        = useState(initialMapType);
  const [wallStyle,      setWallStyle]      = useState(initialWallStyle);
  const [floorStyle,     setFloorStyle]     = useState(initialFloorStyle);
  const [seed,           setSeed]           = useState(() =>
    initialSeed ?? Math.floor(Math.random() * 1000000));
  const [scale,          setScale]          = useState(initialScale);
  const [cellularDensity, setCellularDensity] = useState(initialCellularDensity);
  const [cellularSmooth,  setCellularSmooth]  = useState(initialCellularSmooth);
  const [width,  setWidth]  = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);

  const [showConfig, setShowConfig] = useState(showConfigInitially);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [pinnedTile, setPinnedTile] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [mapData, setMapData] = useState(null);

  // Discover wall + floor base names from atlas tags.
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

  // Regenerate map on any generator-relevant change.
  useEffect(() => {
    if (!atlas) return;
    ROT.RNG.setSeed(seed);
    const selected = MAP_TYPES.find(t => t.id === mapType);
    const MapClass = selected.class;
    const map = new MapClass(width, height);
    const data = {};
    if (mapType === 'cellular') {
      map.randomize(cellularDensity / 100);
      for (let i = 0; i < cellularSmooth; i++) map.create();
      map.create((x, y, value) => { data[`${x},${y}`] = value; });
    } else {
      map.create((x, y, value) => { data[`${x},${y}`] = value; });
    }
    setMapData(data);
    setPinnedTile(null);
  }, [seed, mapType, atlas, cellularDensity, cellularSmooth, width, height]);

  const outOfBounds = (tx, ty) => tx < 0 || tx >= width || ty < 0 || ty >= height;
  const isWallAt = (tx, ty) => outOfBounds(tx, ty) || (mapData && mapData[`${tx},${ty}`] === 1);

  // Resolve a tile + tell the user WHY this sprite was picked.
  const describeTile = (x, y) => {
    if (!mapData || !atlas) return null;
    const value = mapData[`${x},${y}`];
    if (value === 0) {
      const isFloor = (tx, ty) => !outOfBounds(tx, ty) && mapData[`${tx},${ty}`] === 0;
      const n = isFloor(x, y - 1);
      const s = isFloor(x, y + 1);
      const w = isFloor(x - 1, y);
      const e = isFloor(x + 1, y);
      const resolved = resolveDawnLikeFloorName(floorStyle, { n, s, e, w }, atlas.byName);
      const neighbours = [n && 'N', s && 'S', e && 'E', w && 'W'].filter(Boolean).join('') || 'none';
      return {
        type: 'floor',
        baseStyle: floorStyle,
        spriteName: resolved.name,
        reason: resolved.reason || `Floor; neighbours: ${neighbours}`,
        neighbours,
      };
    }
    const spriteName = resolveDawnLikeDungeonWallName(wallStyle, x, y, isWallAt, atlas.byName);
    if (!spriteName) {
      return {
        type: 'wall',
        baseStyle: wallStyle,
        spriteName: null,
        reason: 'Buried wall (no exposed face)',
        neighbours: '',
      };
    }
    const isSurfaceWall = (tx, ty) => {
      if (!isWallAt(tx, ty)) return false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (!isWallAt(tx + dx, ty + dy)) return true;
      }
      return false;
    };
    const isOpen = (tx, ty) => !isWallAt(tx, ty);
    const lateralOpen = (ny) => isOpen(x - 1, y) || isOpen(x + 1, y) || isOpen(x - 1, ny) || isOpen(x + 1, ny);
    const verticalOpen = (nx) => isOpen(x, y - 1) || isOpen(x, y + 1) || isOpen(nx, y - 1) || isOpen(nx, y + 1);
    const n = isSurfaceWall(x, y - 1) && lateralOpen(y - 1);
    const s = isSurfaceWall(x, y + 1) && lateralOpen(y + 1);
    const w = isSurfaceWall(x - 1, y) && verticalOpen(x - 1);
    const e = isSurfaceWall(x + 1, y) && verticalOpen(x + 1);
    const connected = [n && 'N', s && 'S', e && 'E', w && 'W'].filter(Boolean).join('') || 'none';
    return {
      type: 'wall',
      baseStyle: wallStyle,
      spriteName,
      reason: `Surface wall; connects to: ${connected}`,
      neighbours: connected,
    };
  };

  const stats = useMemo(() => {
    if (!mapData) return { walls: 0, floors: 0 };
    let walls = 0, floors = 0;
    Object.values(mapData).forEach(v => { if (v === 1) walls++; else floors++; });
    return { walls, floors };
  }, [mapData]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  if (error)   return <div className="autotile-layout full-viewport"><div className="control-card" style={{color:'red'}}>Error: {error}</div></div>;
  if (loading) return <div className="autotile-layout full-viewport"><div className="control-card">Loading Atlas Metadata...</div></div>;

  const atlasImage = resolveAssetPath('/DawnlikeAtlas0.png');
  const isCellular = mapType === 'cellular';
  const activeTile = pinnedTile || hoverInfo;
  const activeInfo = activeTile ? describeTile(activeTile.x, activeTile.y) : null;
  const popupX = pinnedTile ? pinnedTile.screenX : mousePos.x;
  const popupY = pinnedTile ? pinnedTile.screenY : mousePos.y;

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
              <label>Width: {width}</label>
              <input type="range" min="20" max="80" step="1" value={width}
                     onChange={e => setWidth(parseInt(e.target.value))} />
            </div>
            <div className="field-group">
              <label>Height: {height}</label>
              <input type="range" min="15" max="60" step="1" value={height}
                     onChange={e => setHeight(parseInt(e.target.value))} />
            </div>
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
            width: width * TILE_SIZE * scale,
            height: height * TILE_SIZE * scale,
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverInfo(null)}
          onClick={() => setPinnedTile(null)}
        >
          {mapData && Array.from({ length: height }).map((_, y) => (
            Array.from({ length: width }).map((_, x) => {
              const info = describeTile(x, y);
              const sprite = info?.spriteName ? atlas.byName[info.spriteName] : null;
              return (
                <div
                  key={`${x},${y}`}
                  onMouseEnter={() => setHoverInfo({ x, y })}
                  onClick={e => {
                    e.stopPropagation();
                    const rect = e.currentTarget.parentElement.getBoundingClientRect();
                    setPinnedTile({ x, y, screenX: e.clientX - rect.left, screenY: e.clientY - rect.top });
                  }}
                  style={{
                    position: 'absolute',
                    left: x * TILE_SIZE * scale,
                    top: y * TILE_SIZE * scale,
                    width: TILE_SIZE * scale,
                    height: TILE_SIZE * scale,
                    cursor: 'pointer',
                  }}
                >
                  {sprite && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${atlasImage})`,
                        backgroundPosition: `-${sprite.x * scale}px -${sprite.y * scale}px`,
                        backgroundSize: `${atlas.meta.size.w * scale}px ${atlas.meta.size.h * scale}px`,
                      }}
                    />
                  )}
                </div>
              );
            })
          ))}
          {activeTile && activeInfo && (
            <div
              className="logic-popup"
              data-testid="dungeon-popup"
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute',
                left: popupX + 20,
                top: popupY + 20,
                zIndex: 1000,
                pointerEvents: pinnedTile ? 'auto' : 'none',
              }}
            >
              <div className="popup-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Tile {activeTile.x}, {activeTile.y}{pinnedTile ? ' 📌' : ''}</span>
                {pinnedTile && (
                  <button
                    onClick={() => setPinnedTile(null)}
                    style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.1em', padding: '0 4px' }}
                    title="Close"
                  >✕</button>
                )}
              </div>
              <div className="popup-layers">
                <div className="popup-layer">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="layer-tag">{activeInfo.type === 'wall' ? 'WALL' : 'FLOOR'}</span>
                    <span className="layer-name" style={{ flex: 1 }}>
                      {activeInfo.spriteName || '— buried —'}
                    </span>
                  </div>
                  <div className="layer-reason">{activeInfo.reason}</div>
                  <div className="layer-reason" style={{ opacity: 0.7, marginTop: 2 }}>
                    base style: <code>{activeInfo.baseStyle}</code>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

DungeonExample.propTypes = {
  mapType:             PropTypes.oneOf(MAP_TYPE_IDS),
  wallStyle:           PropTypes.string,
  floorStyle:          PropTypes.string,
  seed:                PropTypes.number,
  scale:               PropTypes.number,
  cellularDensity:     PropTypes.number,
  cellularSmooth:      PropTypes.number,
  width:               PropTypes.number,
  height:              PropTypes.number,
  showConfigInitially: PropTypes.bool,
};
