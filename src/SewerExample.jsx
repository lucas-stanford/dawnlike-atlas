/**
 * SewerExample — underground sewer tunnel.
 *
 * A walled sewer chamber with a single sludge channel running straight
 * down the MIDDLE and brick-floor walkways on EITHER SIDE of it. The
 * channel is autotiled with the DawnLike pool family (so it reads as a
 * continuous vertical run of water/sludge with banks), the walkways use
 * the brick floor family (edge variants appear where the brick meets the
 * channel), and a brick wall rings the whole chamber.
 *
 * A few brick "crossing" bridges break the channel at intervals so the
 * two walkways stay connected, and a sparse scatter of sewer decor
 * (rats, slimes, bones, …) gives the floor some life.
 *
 * Theme presets (see Sewer.stories.jsx) just remap the four sprite
 * style fields below — the layout is identical for every preset.
 */

import React, { useState, useEffect } from 'react';
import * as ROT from 'rot-js';
import { resolveAssetPath } from './utils/paths';
import { dawnlikeAnimVars, DAWNLIKE_ATLAS_0_URL } from './utils/spriteAnim';
import './utils/spriteAnim.css';
import {
  resolveDawnLikeFloorName,
  resolveDawnLikePoolName,
  resolveDawnLikeDungeonWallName,
} from './utils/autotile';
import './Autotile.css';

const TILE_SIZE = 32;

export default function SewerExample({
  width: widthProp = 26,
  height: heightProp = 18,
  seed: seedProp,
  floorStyle: floorStyleProp = 'dusk brick floor',
  poolStyle: poolStyleProp = 'stone murky pool',
  wallStyle: wallStyleProp = 'dark brick wall',
  channelWidth: channelWidthProp = 2,
  bridgeCount: bridgeCountProp = 3,
  decors: decorsProp,
  decorDensity: decorDensityProp = 0.06,
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

  // Build the sewer: brick walls ring the chamber, brick floor fills the
  // interior, a vertical sludge channel runs down the middle, and a few
  // brick bridges cross it. Deterministic in `seed`.
  useEffect(() => {
    if (!atlas) return;
    ROT.RNG.setSeed(seed);
    const W = widthProp, H = heightProp;
    const inB = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

    // Central channel column range, clamped inside the wall ring.
    const cw = Math.max(1, Math.min(channelWidthProp, W - 4));
    const channelStart = Math.max(1, Math.floor((W - cw) / 2));
    const channelEnd = Math.min(W - 2, channelStart + cw - 1); // inclusive
    const inChannelCol = (x) => x >= channelStart && x <= channelEnd;

    // Bridge rows: evenly spaced interior rows that turn the channel back
    // into brick floor so the two walkways connect.
    const bridgeRows = new Set();
    const bc = Math.max(0, bridgeCountProp);
    if (bc > 0) {
      for (let i = 0; i < bc; i++) {
        const ry = Math.round(((i + 1) * H) / (bc + 1));
        if (ry > 0 && ry < H - 1) bridgeRows.add(ry);
      }
    }

    const tiles = {};
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let kind = 'floor';
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) {
          kind = 'wall';
        } else if (inChannelCol(x) && !bridgeRows.has(y)) {
          kind = 'pool';
        }
        tiles[`${x},${y}`] = { kind, decor: null };
      }
    }

    // DECOR. Sparse scatter of sewer life/clutter on the brick walkways
    // only (never on the channel, walls, or bridges).
    const decors = decorsProp && decorsProp.length
      ? decorsProp
      : ['sewer rat', 'green slime', 'bones', 'old bones', 'skull', 'pebble'];
    const usable = decors.filter((d) => atlas.byName[d]);
    if (usable.length) {
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const t = tiles[`${x},${y}`];
          if (t.kind !== 'floor') continue;
          if (inChannelCol(x)) continue; // keep bridges clear
          if (ROT.RNG.getUniform() < decorDensityProp) {
            t.decor = ROT.RNG.getItem(usable);
          }
        }
      }
    }

    setMapData({ tiles, W, H, channelStart, channelEnd });
  }, [
    atlas, seed,
    widthProp, heightProp,
    channelWidthProp, bridgeCountProp,
    decorsProp, decorDensityProp,
  ]);

  const inBounds = (x, y) => mapData && x >= 0 && y >= 0 && x < mapData.W && y < mapData.H;

  // Resolve a tile's render layers — pure function of mapData + style
  // props, no internal state.
  const getTileLayers = (x, y) => {
    if (!mapData || !atlas) return [];
    const tile = mapData.tiles[`${x},${y}`];
    if (!tile) return [];
    const layers = [];

    // Layer 0: brick floor on every non-wall tile. Floor autotile treats
    // only floor tiles as same-type, so walkway tiles next to the channel
    // pick the edge variant (the brick bank along the water's edge). Pool
    // tiles still get a floor underlay so bridges/banks read cleanly.
    if (tile.kind !== 'wall') {
      const sameFloor = (nx, ny) => inBounds(nx, ny) && mapData.tiles[`${nx},${ny}`]?.kind === 'floor';
      const floor = resolveDawnLikeFloorName(
        floorStyleProp,
        {
          n: tile.kind === 'pool' ? true : sameFloor(x, y - 1),
          s: tile.kind === 'pool' ? true : sameFloor(x, y + 1),
          e: tile.kind === 'pool' ? true : sameFloor(x + 1, y),
          w: tile.kind === 'pool' ? true : sameFloor(x - 1, y),
        },
        atlas.byName,
      );
      layers.push({ name: floor.name, z: 0, reason: 'Brick floor' });
    }

    // Layer 1: sludge channel. Pool autotile against same-type pool
    // neighbours so the vertical run picks the divider (bank-left/right)
    // sprite and caps cleanly at the top/bottom and at each bridge.
    if (tile.kind === 'pool') {
      const samePool = (nx, ny) => inBounds(nx, ny) && mapData.tiles[`${nx},${ny}`]?.kind === 'pool';
      const pool = resolveDawnLikePoolName(
        poolStyleProp,
        {
          n: samePool(x, y - 1),
          s: samePool(x, y + 1),
          e: samePool(x + 1, y),
          w: samePool(x - 1, y),
        },
        atlas.byName,
      );
      if (atlas.byName[pool.name]) {
        layers.push({ name: pool.name, z: 1, reason: 'Sludge channel' });
      }
    }

    // Decor sits on top of the walkway floor.
    if (tile.decor && atlas.byName[tile.decor]) {
      layers.push({ name: tile.decor, z: 1.5, reason: 'Sewer decor' });
    }

    // Layer 2: perimeter wall. rot.js-style dungeon wall resolver treats
    // off-map as wall so the chamber closes cleanly at the edges.
    if (tile.kind === 'wall') {
      const wallName = resolveDawnLikeDungeonWallName(
        wallStyleProp,
        x, y,
        (xx, yy) => {
          if (!inBounds(xx, yy)) return true;
          return mapData.tiles[`${xx},${yy}`]?.kind === 'wall';
        },
        atlas.byName,
      );
      if (atlas.byName[wallName]) {
        layers.push({ name: wallName, z: 2, reason: 'Sewer wall' });
      }
    }

    return layers;
  };

  // Re-shuffle seed for a new decor scatter.
  const reseed = () => setSeed(Math.floor(Math.random() * 1_000_000));

  if (loading || !atlas || !mapData) {
    return <div className="autotile-layout full-viewport"><div className="control-card">Loading…</div></div>;
  }

  const W = mapData.W, H = mapData.H;
  const px = W * TILE_SIZE, py = H * TILE_SIZE;

  return (
    <div className="autotile-layout full-viewport" style={dawnlikeAnimVars}>
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
          seed: {seed} · {W}×{H} · channel: {poolStyleProp} · floor: {floorStyleProp}
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
                    const animated = !!sprite.isAnimated;
                    return (
                      <div
                        key={i}
                        className={animated ? 'dawnlike-tile-anim' : undefined}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          ...(animated ? null : { backgroundImage: `url(${DAWNLIKE_ATLAS_0_URL})` }),
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
