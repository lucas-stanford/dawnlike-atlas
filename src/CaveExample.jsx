/**
 * CaveExample — cellular-automata caverns with underground lakes.
 *
 * DungeonExample generates rooms-and-corridors with rot.js's dungeon
 * algorithms; this one generates the other classic roguelike shape:
 * an organic blob carved by cellular automata. That matters for the
 * autotiler, because the two produce very different wall geometry.
 * Rectangular rooms give clean corners and long straights; caves give
 * ragged one-tile spurs, diagonal pinches, and isolated pillars — the
 * cases where a naive cardinal-neighbour resolver falls apart.
 *
 * `resolveDawnLikeDungeonWallName` is built for exactly this: it skips
 * buried interior rock (returning null) and only connects two wall
 * tiles when the perpendicular axis is actually open, so a cave wall
 * never draws a T-junction across a pinch it shouldn't.
 *
 * The generator also guarantees a single connected cavern — a cave map
 * with marooned pockets is the most common bug in this genre, so the
 * flood-fill that discards them is part of the example rather than
 * something left to the reader.
 */

import React, { useState, useEffect, useMemo } from 'react';
import * as ROT from 'rot-js';
import { resolveAssetPath } from './utils/paths';
import { pickSprite } from './utils/atlasApi';
import { dawnlikeAnimVars, DAWNLIKE_ATLAS_0_URL } from './utils/spriteAnim';
import './utils/spriteAnim.css';
import {
  resolveDawnLikeFloorName,
  resolveDawnLikeShoreName,
  resolveDawnLikeDungeonWallName,
} from './utils/autotile';
import './Autotile.css';

const TILE_SIZE = 32;

const ROCK = 'rock';
const FLOOR = 'floor';
const WATER = 'water';

export default function CaveExample({
  width: widthProp = 40,
  height: heightProp = 26,
  seed: seedProp,
  wallStyle: wallStyleProp = 'dark mine wall',
  floorStyle: floorStyleProp = 'night stone floor',
  waterStyle: waterStyleProp = 'stone murky pool',
  /**
   * The lake's bank.
   *
   * The pool families were the obvious choice here and they are the wrong
   * one. A pool family is eleven tiles keyed on four cardinals, drawn for
   * a rectangular built basin — it has no piece for a corner cut by a
   * diagonal, so on an organic cave lake every such cell falls back to
   * `center` and the water simply stops dead against the floor. That is
   * most of the waterline on a cellular-automata blob.
   *
   * The generated `* shore` set is a 47-tile blob keyed on all eight
   * neighbours, which is what an organic waterline actually needs. `mud`
   * because a cave lake has a silt bank, not a beach.
   */
  shoreStyle: shoreStyleProp = 'mud shore',
  fillProbability: fillProbabilityProp = 0.55,
  smoothing: smoothingProp = 4,
  waterLevel: waterLevelProp = 0.18,
  decors: decorsProp,
  decorDensity: decorDensityProp = 0.05,
  // Buried rock draws nothing (that is the whole point of the dungeon
  // resolver returning null), so the grid needs a solid backdrop or
  // those cells read as a hole in the world rather than as stone.
  backdrop: backdropProp = '#0a0710',
} = {}) {
  const [atlas, setAtlas] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [seed, setSeed] = useState(seedProp ?? Math.floor(Math.random() * 1_000_000));

  useEffect(() => { if (seedProp != null) setSeed(seedProp); }, [seedProp]);

  useEffect(() => {
    let cancelled = false;
    fetch(resolveAssetPath('/DawnlikeAtlas.json'))
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setAtlas(json); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const mapData = useMemo(() => {
    if (!atlas) return null;
    ROT.RNG.setSeed(seed);
    const W = widthProp;
    const H = heightProp;

    // 1. Carve the cavern with cellular automata. More smoothing passes
    //    means rounder, more connected caves; fewer means noisy spurs.
    const cellular = new ROT.Map.Cellular(W, H, { connected: true });
    cellular.randomize(fillProbabilityProp);
    for (let i = 0; i < smoothingProp; i++) cellular.create();

    const open = new Set();
    cellular.create((x, y, value) => {
      // rot.js Cellular reports 1 for open cells. Force a solid border
      // so the cavern is always closed and the wall autotiler can treat
      // off-map as rock.
      if (value === 1 && x > 0 && y > 0 && x < W - 1 && y < H - 1) open.add(`${x},${y}`);
    });

    // 2. Keep only the largest connected region. Cellular caves routinely
    //    strand small pockets; leaving them in produces a map the player
    //    can see but never reach.
    const largest = largestRegion(open);

    // 3. Flood low-lying pockets with water. "Low" here means deep in the
    //    cavern: a distance transform from the rock gives each floor tile
    //    a depth, and the deepest share becomes an underground lake.
    const depth = depthFromWalls(largest, W, H);
    const depths = [...depth.values()].sort((a, b) => b - a);
    const waterCut = depths.length
      ? depths[Math.min(depths.length - 1, Math.floor(depths.length * waterLevelProp))]
      : Infinity;

    const tiles = {};
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const key = `${x},${y}`;
        let kind = ROCK;
        if (largest.has(key)) {
          // Only pool water at depth >= 2, so puddles never touch a wall
          // and the pool family always has a bank to draw against.
          kind = depth.get(key) >= Math.max(2, waterCut) ? WATER : FLOOR;
        }
        tiles[key] = { kind, decor: null };
      }
    }

    // 4. Scatter cave life on dry ground only.
    const decors = decorsProp?.length
      ? decorsProp
      : ['luminous mushroom', 'red cap mushroom', 'globe fungus', 'pebble', 'rock', 'bones'];
    for (const key of largest) {
      const tile = tiles[key];
      if (tile.kind !== FLOOR) continue;
      if (ROT.RNG.getUniform() >= decorDensityProp) continue;
      tile.decor = pickSprite(atlas, decors, ROT.RNG.getUniform.bind(ROT.RNG));
    }

    const counts = { floor: 0, water: 0, rock: 0 };
    for (const tile of Object.values(tiles)) {
      if (tile.kind === FLOOR) counts.floor++;
      else if (tile.kind === WATER) counts.water++;
      else counts.rock++;
    }

    return { tiles, W, H, counts };
  }, [
    atlas, seed, widthProp, heightProp,
    fillProbabilityProp, smoothingProp, waterLevelProp,
    decorsProp, decorDensityProp,
  ]);

  const getTileLayers = (x, y) => {
    if (!mapData || !atlas) return [];
    const tile = mapData.tiles[`${x},${y}`];
    if (!tile) return [];

    const { W, H, tiles } = mapData;
    const inBounds = (nx, ny) => nx >= 0 && ny >= 0 && nx < W && ny < H;
    const kindAt = (nx, ny) => (inBounds(nx, ny) ? tiles[`${nx},${ny}`].kind : ROCK);
    const layers = [];

    // Layer 0 — cave floor under everything walkable, including under
    // the lakes so their banks read against stone rather than black.
    if (tile.kind !== ROCK) {
      const isOpen = (nx, ny) => kindAt(nx, ny) !== ROCK;
      const floor = resolveDawnLikeFloorName(
        floorStyleProp,
        { n: isOpen(x, y - 1), s: isOpen(x, y + 1), e: isOpen(x + 1, y), w: isOpen(x - 1, y) },
        atlas.byName,
      );
      layers.push({ name: floor.name, z: 0, reason: 'Cave floor · floor resolver' });
    }

    // Layer 1 — the lake itself, as a flat fill. All the edge work is
    // done by the bank above it, which is transparent where its water
    // goes, so this never has to agree with anything.
    if (tile.kind === WATER) {
      const fill = `${waterStyleProp} center`;
      layers.push({
        name: atlas.byName[fill] ? fill : waterStyleProp,
        z: 1,
        reason: 'Lake · flat fill',
      });
    }

    // Layer 1.5 — the bank, through the 47-tile shore blob. Drawn on the
    // LAND side and transparent over its water, so one tile carries the
    // whole transition and the lake underneath simply shows through.
    //
    // Rock counts as land here even though its wall sprite will cover
    // most of the result: without it the bank would open up wherever the
    // lake runs into a wall, and the waterline would break every time the
    // cavern pinched.
    if (tile.kind !== WATER) {
      const isBank = (nx, ny) => kindAt(nx, ny) !== WATER;
      const shore = resolveDawnLikeShoreName(
        shoreStyleProp,
        {
          n: isBank(x, y - 1), s: isBank(x, y + 1),
          w: isBank(x - 1, y), e: isBank(x + 1, y),
          nw: isBank(x - 1, y - 1), ne: isBank(x + 1, y - 1),
          sw: isBank(x - 1, y + 1), se: isBank(x + 1, y + 1),
        },
        atlas.byName,
      );
      // The fully-inland piece is solid mud, which would carpet the whole
      // cavern floor — only the tiles that actually touch water want it.
      const touchesWater = !isBank(x, y - 1) || !isBank(x, y + 1)
        || !isBank(x - 1, y) || !isBank(x + 1, y)
        || !isBank(x - 1, y - 1) || !isBank(x + 1, y - 1)
        || !isBank(x - 1, y + 1) || !isBank(x + 1, y + 1);
      if (touchesWater) {
        layers.push({ name: shore.name, z: 1.5, reason: `Bank · ${shore.reason}` });
      }
    }

    if (tile.decor) layers.push({ name: tile.decor, z: 2, reason: 'Cave life' });

    // Layer 3 — rock face. The dungeon resolver returns null for buried
    // rock, so the interior of a thick seam costs nothing to render.
    if (tile.kind === ROCK) {
      const wallName = resolveDawnLikeDungeonWallName(
        wallStyleProp,
        x, y,
        (nx, ny) => kindAt(nx, ny) === ROCK,
        atlas.byName,
      );
      if (wallName && atlas.byName[wallName]) {
        layers.push({ name: wallName, z: 3, reason: 'Rock face · dungeon wall resolver' });
      }
    }

    return layers;
  };

  if (!atlas || !mapData) {
    return <div className="autotile-layout full-viewport"><div className="control-card">Loading…</div></div>;
  }

  const { W, H, counts } = mapData;

  return (
    <div className="autotile-layout full-viewport" style={dawnlikeAnimVars}>
      <div className="zone-toolbar">
        <button
          className="dl-btn"
          onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}
        >
          🔄 New cavern
        </button>
        <div className="readout">
          seed <b>{seed}</b> · <b>{W}×{H}</b> · walkable <b>{counts.floor}</b>
          {' · '}water <b>{counts.water}</b> · rock <b>{counts.rock}</b>
        </div>
      </div>

      <div className="map-viewport maximized">
        <div
          className="map-grid"
          style={{ width: W * TILE_SIZE, height: H * TILE_SIZE, background: backdropProp }}
          onMouseLeave={() => setHoverInfo(null)}
        >
          {Array.from({ length: H }).map((_, y) =>
            Array.from({ length: W }).map((__, x) => {
              const layers = getTileLayers(x, y);
              return (
                <div
                  key={`${x},${y}`}
                  onMouseEnter={() => setHoverInfo({ x, y, layers, kind: mapData.tiles[`${x},${y}`].kind })}
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
                    const animated = Boolean(sprite.isAnimated);
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
                          ...(layer.flipY ? { transform: 'scaleY(-1)' } : null),
                        }}
                      />
                    );
                  })}
                </div>
              );
            }),
          )}
        </div>

        {hoverInfo && (
          <div className="logic-popup" style={{ position: 'absolute', right: 16, top: 16, maxWidth: 280 }}>
            <div className="popup-header">({hoverInfo.x}, {hoverInfo.y}) · {hoverInfo.kind}</div>
            <div className="popup-layers">
              {hoverInfo.layers.length === 0 && (
                <div className="layer-reason">Buried rock — the dungeon resolver returned null, so nothing is drawn.</div>
              )}
              {hoverInfo.layers.map((l, i) => (
                <div className="popup-layer" key={i}>
                  <span className="layer-tag">L{l.z}</span>
                  <span className="layer-name">{l.name}</span>
                  <span className="layer-reason">{l.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Largest 4-connected region of a set of "x,y" keys.
 *
 * rot.js's `connected: true` option connects regions by carving
 * corridors, but only when it can; a flood-fill is the reliable way to
 * guarantee one walkable cavern.
 */
function largestRegion(open) {
  const unvisited = new Set(open);
  let best = new Set();

  while (unvisited.size) {
    const startKey = unvisited.values().next().value;
    const region = new Set();
    const stack = [startKey];
    unvisited.delete(startKey);

    while (stack.length) {
      const key = stack.pop();
      region.add(key);
      const [x, y] = key.split(',').map(Number);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nk = `${x + dx},${y + dy}`;
        if (unvisited.has(nk)) {
          unvisited.delete(nk);
          stack.push(nk);
        }
      }
    }

    if (region.size > best.size) best = region;
  }

  return best;
}

/**
 * Distance transform: for each open tile, how many cardinal steps it
 * sits from the nearest rock. Tiles touching rock are depth 1.
 *
 * Used here to decide where water pools, but it is generally the
 * cheapest way to find "the middle of the cave" for spawn points,
 * treasure placement, or boss arenas.
 */
function depthFromWalls(open, W, H) {
  const depth = new Map();
  let frontier = [];

  for (const key of open) {
    const [x, y] = key.split(',').map(Number);
    const touchesRock = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      return nx < 0 || ny < 0 || nx >= W || ny >= H || !open.has(`${nx},${ny}`);
    });
    if (touchesRock) {
      depth.set(key, 1);
      frontier.push([x, y]);
    }
  }

  let current = 1;
  while (frontier.length) {
    const next = [];
    current += 1;
    for (const [x, y] of frontier) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nk = `${x + dx},${y + dy}`;
        if (!open.has(nk) || depth.has(nk)) continue;
        depth.set(nk, current);
        next.push([x + dx, y + dy]);
      }
    }
    frontier = next;
  }

  return depth;
}
