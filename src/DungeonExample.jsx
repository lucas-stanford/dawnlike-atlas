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

const TILE_SIZE = 32;

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
  scale:              initialScale           = 1,
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
  const [spriteOverrides, setSpriteOverrides] = useState({});
  const [pickerOpen, setPickerOpen] = useState(false);

  const [mapData, setMapData] = useState(null);

  // Reusable name-cleaner that strips trailing direction/corner tokens
  // so 'bright mine wall left up' → 'bright mine wall'. Shared by the
  // atlas-discovery + the picker's spritesByBase index.
  const cleanName = (name) => {
    const directional = ['left', 'right', 'up', 'down', 'flat', 'center', 'nw', 'ne', 'sw', 'se', 'dense', 'nwe', 'nswe', 'we', 'nsw', 'ns', 'nse', 'swe', 'c', 'n', 's', 'e', 'w'];
    let words = name.split(' ');
    while (words.length > 1 && directional.includes(words[words.length - 1])) words.pop();
    return words.join(' ').trim();
  };

  // Discover wall + floor base names from atlas tags.
  const { discoveredWalls, discoveredFloors } = useMemo(() => {
    if (!atlas?.byName) return { discoveredWalls: [], discoveredFloors: [] };
    const walls = new Set();
    const floors = new Set();
    Object.entries(atlas.byName).forEach(([name, data]) => {
      if (data.tags?.includes('wall') && data.sourceFile === 'Objects/Wall') {
        const base = cleanName(name);
        if (base) walls.add(base);
      }
      if (data.sourceFile === 'Objects/Floor') {
        const base = cleanName(name);
        if (base && base !== 'empty') floors.add(base);
      }
    });
    return {
      discoveredWalls: [...walls].sort(),
      discoveredFloors: [...floors].sort(),
    };
  }, [atlas]);

  // Index of every sprite grouped by its base name, for the click-to-pin
  // sprite picker (e.g. all 16 "bright mine wall" autotile sprites).
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
    setSpriteOverrides({});
  }, [seed, mapType, atlas, cellularDensity, cellularSmooth, width, height]);

  // Also drop overrides when the user swaps wall/floor base styles — the
  // overridden sprite names belong to the OLD base and don't make sense
  // against the new one.
  useEffect(() => { setSpriteOverrides({}); }, [wallStyle, floorStyle]);

  const outOfBounds = (tx, ty) => tx < 0 || tx >= width || ty < 0 || ty >= height;
  const isWallAt = (tx, ty) => outOfBounds(tx, ty) || (mapData && mapData[`${tx},${ty}`] === 1);

  // Resolve a tile + tell the user WHY this sprite was picked. Returns a
  // `context` object with the autotile truth-table — included verbatim in
  // the override log so an LLM has all it needs to fix a misbehaving rule.
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
        context: { kind: 'floor', baseStyle: floorStyle, neighbors: { n, s, e, w } },
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
        context: { kind: 'dungeonWall', baseStyle: wallStyle, surface: false },
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
      context: { kind: 'dungeonWall', baseStyle: wallStyle, surface: true, neighbors: { n, s, e, w } },
    };
  };

  // The actually-rendered sprite for (x, y): user override if any, else
  // the autotile-resolved sprite from describeTile. Returns null for
  // tiles with no sprite (e.g. buried walls).
  const resolveDisplaySprite = (x, y) => {
    const override = spriteOverrides[`${x},${y}`];
    if (override) return { name: override, overridden: true };
    const info = describeTile(x, y);
    return info?.spriteName ? { name: info.spriteName, overridden: false } : null;
  };

  // Reset the picker dropdown whenever a different tile is pinned.
  useEffect(() => { setPickerOpen(false); }, [pinnedTile?.x, pinnedTile?.y]);

  // Compact log of every overridden tile — auto-resolved sprite, the
  // user-picked replacement, and the autotile context (neighbor truth
  // table). Designed to paste back to an LLM so it has everything it
  // needs to fix the autotile rule.
  const overrideLog = useMemo(() => {
    const entries = [];
    for (const key of Object.keys(spriteOverrides)) {
      const [xs, ys] = key.split(',');
      const x = parseInt(xs), y = parseInt(ys);
      const auto = describeTile(x, y);
      if (!auto) continue;
      entries.push({
        pos: { x, y },
        type: auto.type,
        auto: auto.spriteName,
        picked: spriteOverrides[key],
        context: auto.context || null,
      });
    }
    entries.sort((a, b) => a.pos.y - b.pos.y || a.pos.x - b.pos.x);
    return entries;
  }, [spriteOverrides, mapData, atlas, wallStyle, floorStyle]);

  const copyLog = () => {
    const text = JSON.stringify(overrideLog, null, 2);
    if (navigator.clipboard) navigator.clipboard.writeText(text);
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
              <input type="range" min="0.5" max="3" step="0.25" value={scale}
                     onChange={e => setScale(parseFloat(e.target.value))} />
            </div>
            <button className="primary-button"
                    onClick={() => { setSpriteOverrides({}); setSeed(Math.floor(Math.random() * 1000000)); }}>
              🏰 Re-generate
            </button>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
              <div className="stats-grid">
                <div className="stat-item"><span className="stat-label">Wall Tiles</span><span className="stat-value">{stats.walls}</span></div>
                <div className="stat-item"><span className="stat-label">Floor Tiles</span><span className="stat-value">{stats.floors}</span></div>
              </div>
            </div>
            {overrideLog.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong>Overrides ({overrideLog.length})</strong>
                  <span>
                    <button onClick={copyLog} title="Copy log JSON to clipboard">📋 Copy</button>
                    <button onClick={() => setSpriteOverrides({})} style={{ marginLeft: 4 }} title="Clear all overrides">Clear</button>
                  </span>
                </div>
                <pre data-testid="dungeon-override-log" style={{ maxHeight: 240, overflow: 'auto', fontSize: 11, margin: 0, background: 'rgba(0,0,0,0.35)', padding: 6, borderRadius: 4, color: '#fff' }}>
{JSON.stringify(overrideLog, null, 2)}
                </pre>
              </div>
            )}
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
              const display = resolveDisplaySprite(x, y);
              const sprite = display ? atlas.byName[display.name] : null;
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
                {(() => {
                  const base = activeInfo.baseStyle;
                  const options = (spritesByBase[base] || (activeInfo.spriteName ? [activeInfo.spriteName] : []));
                  const overrideKey = `${activeTile.x},${activeTile.y}`;
                  const isOverridden = !!spriteOverrides[overrideKey];
                  const canPick = pinnedTile && options.length > 1 && activeInfo.spriteName;
                  const sw = TILE_SIZE * 1;
                  return (
                    <div className="popup-layer">
                      <div
                        onClick={() => { if (canPick) setPickerOpen(o => !o); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: canPick ? 'pointer' : 'default' }}
                      >
                        <span className="layer-tag">{activeInfo.type === 'wall' ? 'WALL' : 'FLOOR'}</span>
                        <span className="layer-name" style={{ flex: 1 }}>
                          {(spriteOverrides[overrideKey] || activeInfo.spriteName) || '— buried —'}{isOverridden ? ' *' : ''}
                        </span>
                        {canPick && (
                          <span style={{ opacity: 0.6, fontSize: '0.8em' }}>{pickerOpen ? '▾' : '▸'} {options.length}</span>
                        )}
                      </div>
                      <div className="layer-reason">{activeInfo.reason}</div>
                      {isOverridden && (
                        <div className="layer-reason" style={{ opacity: 0.7, marginTop: 2 }}>
                          auto would be: <code>{activeInfo.spriteName}</code>
                        </div>
                      )}
                      <div className="layer-reason" style={{ opacity: 0.7, marginTop: 2 }}>
                        base style: <code>{base}</code>
                      </div>
                      {pickerOpen && canPick && (
                        <div
                          data-testid="dungeon-picker"
                          style={{
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
                            const selected = opt === (spriteOverrides[overrideKey] || activeInfo.spriteName);
                            return (
                              <div
                                key={opt}
                                title={opt}
                                data-testid={`dungeon-swatch:${opt}`}
                                onClick={() => {
                                  setSpriteOverrides(prev => {
                                    const next = { ...prev };
                                    if (activeInfo.spriteName === opt) delete next[overrideKey];
                                    else next[overrideKey] = opt;
                                    return next;
                                  });
                                  setPickerOpen(false);
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
                                  backgroundImage: `url(${atlasImage})`,
                                  backgroundPosition: `-${sp.x * (sw / TILE_SIZE)}px -${sp.y * (sw / TILE_SIZE)}px`,
                                  backgroundSize: `${atlas.meta.size.w * (sw / TILE_SIZE)}px ${atlas.meta.size.h * (sw / TILE_SIZE)}px`,
                                  imageRendering: 'pixelated',
                                }} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {pinnedTile && isOverridden && (
                        <button
                          onClick={() => setSpriteOverrides(prev => {
                            const next = { ...prev };
                            delete next[overrideKey];
                            return next;
                          })}
                          style={{ marginTop: 6 }}
                          data-testid="dungeon-reset-tile"
                        >Reset this tile</button>
                      )}
                    </div>
                  );
                })()}
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
