/**
 * ArenaExample — small ambush / combat arena.
 *
 * Tiny outdoor map (24×18 by default) with a NOISY perimeter ring of
 * obstacles (trees / rocks / walls / etc.) so the player feels boxed in
 * but the edge has organic gaps; a short trail enters from one side as
 * the "ambush road"; and a scatter of interior cover so combat has
 * line-of-sight breaks.
 *
 * Theme presets (forest ambush, desert canyon, volcanic pit, swamp
 * clearing, ruined courtyard, chaos circle) just remap the four sprite
 * style fields below — generator topology is identical for every
 * preset.
 */

import React, { useState, useEffect, useMemo } from 'react';
import * as ROT from 'rot-js';
import { resolveAssetPath } from './utils/paths';
import {
  resolveDawnLikeFloorName,
  resolveDawnLikeForestName,
  resolveDawnLikeMountainName,
  resolveDawnLikeDungeonWallName,
} from './utils/autotile';
import './Autotile.css';

const TILE_SIZE = 32;

// Obstacle kinds. Each kind picks a different autotile resolver and a
// different "neighbour same-type?" test:
//   - 'tree'     → resolveDawnLikeForestName (8-way)
//   - 'mountain' → resolveDawnLikeMountainName (4-way blob)
//   - 'wall'     → resolveDawnLikeDungeonWallName (rot.js-style)
//   - 'sprite'   → flat single-frame sprite (no autotile; used for
//     bones, rocks, pillars — anything that should NOT merge with
//     neighbours).
const OBSTACLE_KIND_INFO = {
  tree:     { autotile: 'forest' },
  mountain: { autotile: 'mountain' },
  wall:     { autotile: 'wall' },
  sprite:   { autotile: 'none' },
};

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

export default function ArenaExample({
  width: widthProp = 24,
  height: heightProp = 18,
  seed: seedProp,
  groundStyle: groundStyleProp = 'day grass floor',
  obstacleStyle: obstacleStyleProp = 'light oak',
  obstacleKind: obstacleKindProp = 'tree',
  interiorDecors: interiorDecorsProp,
  hazardSprite: hazardSpriteProp = null,
  hazardDensity: hazardDensityProp = 0,
  ringNoiseScale: ringNoiseScaleProp = 4,
  ringThreshold: ringThresholdProp = 0.0,
  ringThickness: ringThicknessProp = 3,
  entrySide: entrySideProp = 'w',
  trailStyle: trailStyleProp = 'dirt trail',
} = {}) {
  const [atlas, setAtlas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapData, setMapData] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [seed, setSeed] = useState(seedProp ?? Math.floor(Math.random() * 1_000_000));

  // Resync the internal seed if the controlled prop changes (story args).
  useEffect(() => {
    if (seedProp != null) setSeed(seedProp);
  }, [seedProp]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(resolveAssetPath('/DawnlikeAtlas.json'));
        const json = await res.json();
        if (cancelled) return;
        setAtlas(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Generate the arena: floor + noisy obstacle ring + interior cover +
  // entry trail. Deterministic in `seed`. Re-runs whenever any
  // topology-affecting prop changes.
  useEffect(() => {
    if (!atlas) return;
    ROT.RNG.setSeed(seed);
    const simplex = new ROT.Noise.Simplex();
    const W = widthProp, H = heightProp;
    const inB = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    const tiles = {};
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        tiles[`${x},${y}`] = { obstacle: false, decor: null, trail: false, hazard: false };
      }
    }

    // NOISY OBSTACLE RING. For every tile, compute its inward distance
    // to the nearest map edge. Tiles within `ringThickness` of the edge
    // are *candidates*; whether they actually become an obstacle is
    // driven by simplex noise so the ring has organic gaps and bulges.
    // The outermost row/col is always solid (so the perimeter genuinely
    // bounds the arena even when noise dips low).
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const edgeDist = Math.min(x, y, W - 1 - x, H - 1 - y);
        if (edgeDist > ringThicknessProp) continue;
        if (edgeDist === 0) {
          tiles[`${x},${y}`].obstacle = true;
          continue;
        }
        const n = simplex.get(x / ringNoiseScaleProp, y / ringNoiseScaleProp);
        // Bias toward "solid" the closer the tile is to the edge.
        const edgeBias = 1 - edgeDist / (ringThicknessProp + 1);
        if (n + edgeBias > ringThresholdProp) {
          tiles[`${x},${y}`].obstacle = true;
        }
      }
    }

    // ENTRY TRAIL. The user fights ambushers on the road; a short trail
    // of `trail` tiles cuts in from `entrySide` and carves an opening
    // through the obstacle ring (clearing any obstacle it lands on).
    const trailLen = ringThicknessProp + 2;
    const mid = (a) => Math.floor(a / 2);
    let tx, ty, dx, dy;
    if (entrySideProp === 'w')      { tx = 0;       ty = mid(H); dx = 1;  dy = 0; }
    else if (entrySideProp === 'e') { tx = W - 1;   ty = mid(H); dx = -1; dy = 0; }
    else if (entrySideProp === 'n') { tx = mid(W);  ty = 0;      dx = 0;  dy = 1; }
    else                            { tx = mid(W);  ty = H - 1;  dx = 0;  dy = -1; }
    for (let i = 0; i < trailLen; i++) {
      const x = tx + dx * i, y = ty + dy * i;
      if (!inB(x, y)) break;
      const t = tiles[`${x},${y}`];
      t.obstacle = false;
      t.trail = true;
      // Also widen by 1 tile perpendicular so the trail reads as a path
      // rather than a single-tile corridor.
      const pX = x + (dx === 0 ? 1 : 0), pY = y + (dy === 0 ? 1 : 0);
      if (inB(pX, pY)) {
        const p = tiles[`${pX},${pY}`];
        if (i < trailLen - 1) { p.obstacle = false; p.trail = true; }
      }
    }

    // INTERIOR COVER. Scatter a handful of obstacle tiles in the open
    // middle so combat has line-of-sight breaks. Density scales loosely
    // with map area; placement avoids the entry trail and any tile
    // already adjacent to the obstacle ring (so cover reads as cover,
    // not a ring extension).
    const interior = [];
    for (let y = 2; y < H - 2; y++) {
      for (let x = 2; x < W - 2; x++) {
        const t = tiles[`${x},${y}`];
        if (t.obstacle || t.trail) continue;
        interior.push({ x, y });
      }
    }
    const coverCount = Math.max(2, Math.floor(interior.length * 0.05));
    for (let i = 0; i < coverCount; i++) {
      if (!interior.length) break;
      const idx = ROT.RNG.getUniformInt(0, interior.length - 1);
      const cell = interior.splice(idx, 1)[0];
      tiles[`${cell.x},${cell.y}`].obstacle = true;
    }

    // DECOR + HAZARDS. Sparse flowers/rocks/bones on free tiles to give
    // the floor a bit of texture; hazards (lava puddles etc.) only on
    // free non-trail tiles if `hazardSprite` is set.
    const decors = interiorDecorsProp && interiorDecorsProp.length
      ? interiorDecorsProp
      : ['pebble', 'pebbles', 'rock'];
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const t = tiles[`${x},${y}`];
        if (t.obstacle || t.trail) continue;
        if (ROT.RNG.getUniform() < 0.05 && atlas.byName[ROT.RNG.getItem(decors)]) {
          t.decor = ROT.RNG.getItem(decors);
        }
        if (hazardSpriteProp && atlas.byName[hazardSpriteProp] && ROT.RNG.getUniform() < hazardDensityProp) {
          t.hazard = true;
        }
      }
    }

    setMapData({ tiles, W, H });
  }, [
    atlas, seed,
    widthProp, heightProp,
    obstacleKindProp, ringNoiseScaleProp, ringThresholdProp, ringThicknessProp,
    entrySideProp, hazardSpriteProp, hazardDensityProp,
    interiorDecorsProp,
  ]);

  // Resolve a tile's render layers — pure function of mapData + style
  // props, no internal state.
  const getTileLayers = (x, y) => {
    if (!mapData || !atlas) return [];
    const tile = mapData.tiles[`${x},${y}`];
    if (!tile) return [];
    const layers = [];

    // Layer 0: ground floor. Floor autotile uses same-type=true for any
    // non-obstacle (i.e. floor-floor matches everywhere) so the floor
    // family chooses the centre sprite for the open middle and the
    // edge variants where the ring carves in.
    const sameFloor = (nx, ny) => {
      const n = mapData.tiles[`${nx},${ny}`];
      if (!n) return false;
      return true; // off-map = no neighbour; on-map = neighbour is also floor
    };
    const fn = sameFloor(x, y - 1);
    const fs = sameFloor(x, y + 1);
    const fe = sameFloor(x + 1, y);
    const fw = sameFloor(x - 1, y);
    const floor = resolveDawnLikeFloorName(groundStyleProp, { n: fn, s: fs, e: fe, w: fw }, atlas.byName);
    layers.push({ name: floor.name, z: 0, reason: 'Ground floor' });

    if (tile.decor && atlas.byName[tile.decor]) {
      layers.push({ name: tile.decor, z: 0.5, reason: 'Scatter decor' });
    }

    // Layer 1: trail. Render with the chosen trail family (uses the
    // wall-style 11-variant resolver because trail families share the
    // openPath topology DawnLike-style).
    if (tile.trail) {
      const n = !!mapData.tiles[`${x},${y - 1}`]?.trail;
      const s = !!mapData.tiles[`${x},${y + 1}`]?.trail;
      const e = !!mapData.tiles[`${x + 1},${y}`]?.trail;
      const w = !!mapData.tiles[`${x - 1},${y}`]?.trail;
      // Use the same floor resolver against the trail family so the
      // trail tile picks a connecting variant (trails are floor-family
      // sprites in the DawnLike atlas).
      const trail = resolveDawnLikeFloorName(trailStyleProp, { n, s, e, w }, atlas.byName);
      if (atlas.byName[trail.name]) {
        layers.push({ name: trail.name, z: 1, reason: 'Entry trail' });
      }
    }

    if (tile.hazard && hazardSpriteProp && atlas.byName[hazardSpriteProp]) {
      layers.push({ name: hazardSpriteProp, z: 1.5, reason: 'Hazard' });
    }

    // Layer 2: obstacle (the ring + interior cover). Render through the
    // resolver matching this preset's obstacleKind.
    if (tile.obstacle) {
      const kindInfo = OBSTACLE_KIND_INFO[obstacleKindProp] || OBSTACLE_KIND_INFO.tree;
      const same = (nx, ny) => !!mapData.tiles[`${nx},${ny}`]?.obstacle;
      const n = same(x, y - 1);
      const s = same(x, y + 1);
      const e = same(x + 1, y);
      const w = same(x - 1, y);
      let layerName;
      if (kindInfo.autotile === 'forest') {
        const nw = same(x - 1, y - 1);
        const ne = same(x + 1, y - 1);
        const sw = same(x - 1, y + 1);
        const se = same(x + 1, y + 1);
        layerName = resolveDawnLikeForestName(obstacleStyleProp, { n, s, e, w, nw, ne, sw, se }, atlas.byName).name;
      } else if (kindInfo.autotile === 'mountain') {
        layerName = resolveDawnLikeMountainName(obstacleStyleProp, { n, s, e, w }, atlas.byName);
      } else if (kindInfo.autotile === 'wall') {
        layerName = resolveDawnLikeDungeonWallName(
          obstacleStyleProp,
          x, y,
          (xx, yy) => {
            // Treat off-map as wall (so the ring closes cleanly at the
            // map edge) and only on-map obstacles as wall.
            if (!inBounds(xx, yy)) return true;
            return !!mapData.tiles[`${xx},${yy}`]?.obstacle;
          },
          atlas.byName,
        );
      } else {
        layerName = obstacleStyleProp;
      }
      if (atlas.byName[layerName]) {
        layers.push({ name: layerName, z: 2, reason: 'Obstacle ring / cover' });
      }
    }

    return layers;
  };

  const inBounds = (x, y) => mapData && x >= 0 && y >= 0 && x < mapData.W && y < mapData.H;

  // Re-shuffle seed for a new layout.
  const reseed = () => setSeed(Math.floor(Math.random() * 1_000_000));

  if (loading || !atlas || !mapData) {
    return <div className="autotile-layout full-viewport"><div className="control-card">Loading…</div></div>;
  }

  const W = mapData.W, H = mapData.H;
  const px = W * TILE_SIZE, py = H * TILE_SIZE;

  return (
    <div className="autotile-layout full-viewport">
      <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, display: 'flex', gap: 8 }}>
        <button onClick={reseed} style={{ padding: '6px 12px', cursor: 'pointer' }}>🔄 Reseed</button>
        <div style={{
          padding: '6px 10px',
          background: 'rgba(0,0,0,0.55)',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 12,
          borderRadius: 4,
        }}>
          seed: {seed} · {W}×{H} · obstacle: {obstacleKindProp} {obstacleStyleProp}
        </div>
      </div>
      <div className="map-viewport maximized">
        <div
          className="map-grid"
          style={{ width: px, height: py }}
          onMouseLeave={() => setHoverInfo(null)}
        >
          {Array.from({ length: H }).map((_, y) =>
            Array.from({ length: W }).map((__, x) => {
              const layers = getTileLayers(x, y);
              return (
                <div
                  key={`${x},${y}`}
                  onMouseEnter={() => setHoverInfo({ x, y, layers })}
                  style={{
                    position: 'absolute',
                    left: x * TILE_SIZE,
                    top: y * TILE_SIZE,
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                  }}
                >
                  {layers.map((layer, i) => {
                    const sprite = atlas.byName[layer.name];
                    if (!sprite) return null;
                    return (
                      <div
                        key={i}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundImage: `url(${resolveAssetPath('/DawnlikeAtlas0.png')})`,
                          backgroundPosition: `-${sprite.x}px -${sprite.y}px`,
                          backgroundSize: `${atlas.meta.size.w}px ${atlas.meta.size.h}px`,
                          zIndex: Math.round(layer.z * 10),
                          imageRendering: 'pixelated',
                        }}
                      />
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
        {hoverInfo && (
          <div
            style={{
              position: 'absolute',
              right: 16,
              top: 16,
              background: 'rgba(0,0,0,0.7)',
              color: '#fff',
              padding: '8px 10px',
              borderRadius: 4,
              fontFamily: 'ui-monospace, Menlo, monospace',
              fontSize: 12,
              maxWidth: 260,
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              ({hoverInfo.x}, {hoverInfo.y})
            </div>
            {hoverInfo.layers.map((l, i) => (
              <div key={i}>L{l.z}: {l.name}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
