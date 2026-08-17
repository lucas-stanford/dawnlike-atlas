/**
 * FarmExample — a small but complete farming sim.
 *
 * This is the example that shows the atlas doing a whole GAME rather
 * than a terrain render. Everything the loop needs is already in the
 * pack: two-stage crop art, a 16-way tilled-soil family in four daylight
 * tints, livestock with 2-frame idles, fences, an orchard, a pond.
 *
 * The rules live in `src/utils/farm.js` and know nothing about React or
 * the atlas — this file is input handling and drawing, nothing else. If
 * you want the mechanics without the UI, import that module directly;
 * it is exported from the package as `dawnlike-atlas/utils/farm`.
 *
 * FIVE RESOLVERS ON ONE MAP
 *
 *   pond edge   → resolveDawnLikeShoreName  (8-way, 47-tile blob set)
 *   meadow      → resolveDawnLikeFloorName  (grass, recedes from water)
 *   tilled soil → resolveDawnLikeFloorName  (the field block's outline)
 *   pen fence   → resolveDawnLikeWallName   (open-path suffixes)
 *   canopy      → static orchard sprites
 *
 * THE TRICK WORTH STEALING
 *
 * The daylight tint is not a filter and not a CSS overlay — it is a
 * different sprite family. DawnLike draws `morning|day|dusk|night` of
 * both `grass floor` and `plowed field`, so the farm re-tints by
 * swapping the family name the resolver is given, and the pixels stay
 * exactly on palette. `farm.js` drives that off the farmer's remaining
 * stamina, so the day visibly runs out as you work.
 *
 * The watered-soil family (`<tint> watered field`) is the one thing
 * DawnLike does not draw; scripts/generate-watered-field.mjs derives it
 * from the plowed field by palette remap, so wet and dry soil share
 * pixel-identical furrows.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as ROT from 'rot-js';
import { resolveAssetPath } from './utils/paths';
import { dawnlikeAnimVars, DAWNLIKE_ATLAS_0_URL } from './utils/spriteAnim';
import './utils/spriteAnim.css';
import {
  resolveDawnLikeFloorName,
  resolveDawnLikeShoreName,
  resolveDawnLikeWallName,
} from './utils/autotile';
import {
  CROPS, CROP_IDS, ENERGY_PER_DAY, CAN_CAPACITY, WILD,
  createFarm, tileAt, isPond, isPenWall, isWalkable, isAdjacent,
  advanceDay, sellStock, act, actionFor,
  soilFamily, cropSprite, orchardSprite, dayPhase, stockValue,
} from './utils/farm';
import './Farm.css';

const TILE = 32;

/**
 * Draw order, bottom to top. These MUST stay whole numbers: CSS rejects
 * a fractional `z-index` outright and silently falls back to `auto`,
 * which then stacks by DOM order and happens to look right until
 * something reorders the layer list.
 */
const Z = {
  water: 0, shore: 1, meadow: 2, soil: 3, fence: 4,
  scatter: 5, growth: 6, animal: 7, farmer: 8,
};

/** Which way the farmer is facing, as a tile offset. */
const FACING = {
  up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
};

const KEY_TO_DIR = {
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
};

export default function FarmExample({
  width: widthProp = 22,
  height: heightProp = 16,
  seed: seedProp,
  startingGold: startingGoldProp = 60,
  farmerSprite: farmerSpriteProp = 'farmer man',
  waterStyle: waterStyleProp = 'stone clear pool center',
  // `mud shore` on purpose. The shore families are generated in ONE
  // tint, so unlike the floor families they cannot follow the daylight
  // cycle — and a `grass shore` bank stays vividly green while the whole
  // meadow around it goes navy at night, which reads as a bug. Mud's
  // brown/maroon ramp appears in all four daylight ramps, so it sits
  // quietly at every phase. See the story notes for the full caveat.
  shoreStyle: shoreStyleProp = 'mud shore',
  fenceStyle: fenceStyleProp = 'stone fence',
} = {}) {
  const [atlas, setAtlas] = useState(null);
  const [seed] = useState(seedProp ?? Math.floor(Math.random() * 1_000_000));
  const [farm, setFarm] = useState(null);
  const [farmer, setFarmer] = useState({ x: 8, y: 8, facing: 'down' });
  const [selectedCrop, setSelectedCrop] = useState(CROP_IDS[0]);
  const [flash, setFlash] = useState(null);
  const gridRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch(resolveAssetPath('/DawnlikeAtlas.json'))
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setAtlas(json); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // The farm is built once from a seeded RNG, so a story with a fixed
  // seed always renders the same pond, pen and orchard.
  useEffect(() => {
    ROT.RNG.setSeed(seed);
    const rng = ROT.RNG.getUniform.bind(ROT.RNG);
    const state = createFarm({
      width: widthProp, height: heightProp, gold: startingGoldProp, rng,
    });
    setFarm(state);
    // Start the farmer beside the starter plot, not just on the first
    // walkable tile — spawning in the corner of the map put them in the
    // one spot where there is nothing to do.
    const spawn = { x: state.plot.x1 + 1, y: state.plot.y0 };
    if (isWalkable(state, spawn.x, spawn.y)) {
      setFarmer({ ...spawn, facing: 'left' });
    } else {
      outer: for (let y = Math.floor(heightProp / 2); y < heightProp; y++) {
        for (let x = 0; x < widthProp; x++) {
          if (isWalkable(state, x, y)) { setFarmer({ x, y, facing: 'down' }); break outer; }
        }
      }
    }
  }, [seed, widthProp, heightProp, startingGoldProp]);

  const say = useCallback((message, ok = true) => {
    setFlash({ message, ok, at: Date.now() });
  }, []);

  // ---- interaction -------------------------------------------------

  const doAct = useCallback((x, y) => {
    setFarm((state) => {
      if (!state) return state;
      if (!isAdjacent(farmer.x, farmer.y, x, y) && !(farmer.x === x && farmer.y === y)) {
        say('Too far away — walk closer first.', false);
        return state;
      }
      const result = act(state, x, y, {
        farmerX: farmer.x, farmerY: farmer.y, selectedCrop,
      });
      say(result.message, result.ok);
      return result.state;
    });
  }, [farmer, selectedCrop, say]);

  const endDay = useCallback(() => {
    setFarm((state) => {
      if (!state) return state;
      const { state: next, report } = advanceDay(state, ROT.RNG.getUniform.bind(ROT.RNG));
      say(next.log[next.log.length - 1], !report.withered);
      return next;
    });
  }, [say]);

  const sell = useCallback(() => {
    setFarm((state) => {
      if (!state) return state;
      const result = sellStock(state);
      say(result.message, result.ok);
      return result.state;
    });
  }, [say]);

  const move = useCallback((dir) => {
    const [dx, dy] = FACING[dir];
    setFarmer((f) => {
      const nx = f.x + dx;
      const ny = f.y + dy;
      // Turning to face a wall is still a legal move — that is how you
      // aim an action at a tile you cannot stand on, like the pond.
      if (!farm || !isWalkable(farm, nx, ny)) return { ...f, facing: dir };
      return { x: nx, y: ny, facing: dir };
    });
  }, [farm]);

  useEffect(() => {
    const onKey = (event) => {
      const dir = KEY_TO_DIR[event.key];
      if (dir) { event.preventDefault(); move(dir); return; }
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        const [dx, dy] = FACING[farmer.facing];
        doAct(farmer.x + dx, farmer.y + dy);
        return;
      }
      if (event.key === 'e' || event.key === 'E') { event.preventDefault(); endDay(); return; }
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < CROP_IDS.length) {
        setSelectedCrop(CROP_IDS[index]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, doAct, endDay, farmer]);

  // ---- rendering ---------------------------------------------------

  const phase = farm ? dayPhase(farm) : 'day';

  /**
   * Layers for one tile, bottom to top.
   *
   * Mirrors IslandExample's ordering for the water/shore pair: open
   * water is painted under EVERY tile, and the shore tiles composite
   * over it — they are transparent where their water goes, so the sea
   * simply shows through and there is never a second border fighting
   * the first.
   */
  const layersFor = useCallback((x, y) => {
    if (!farm || !atlas) return [];
    const layers = [];
    const land = (nx, ny) => {
      if (nx < 0 || ny < 0 || nx >= farm.width || ny >= farm.height) return true;
      return !isPond(farm, nx, ny);
    };

    layers.push({ name: waterStyleProp, z: Z.water, reason: 'Open water · flat fill' });

    if (land(x, y)) {
      const shore = resolveDawnLikeShoreName(shoreStyleProp, {
        n: land(x, y - 1), s: land(x, y + 1), w: land(x - 1, y), e: land(x + 1, y),
        nw: land(x - 1, y - 1), ne: land(x + 1, y - 1),
        sw: land(x - 1, y + 1), se: land(x + 1, y + 1),
      }, atlas.byName);
      layers.push({ name: shore.name, z: Z.shore, reason: `Pond edge · ${shore.reason}` });

      // Meadow. Like IslandExample, the grass deliberately recedes from
      // the waterline — it autotiles against tiles that do NOT touch the
      // pond — so the shore tile's own bank is what meets the water.
      //
      // The recede test is EIGHT-way, not four. With a four-way test a
      // tile that only touches the pond diagonally still counts as
      // inland and gets grass painted over its shore tile, which leaves
      // the bank visibly checkered between grass and shore. Matching the
      // shore resolver's own 8-neighbour read gives a clean one-tile ring.
      const touchesWater = (nx, ny) => {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (!land(nx + dx, ny + dy)) return true;
          }
        }
        return false;
      };
      const inland = (nx, ny) => {
        if (nx < 0 || ny < 0 || nx >= farm.width || ny >= farm.height) return true;
        return land(nx, ny) && !touchesWater(nx, ny);
      };
      if (inland(x, y)) {
        const grass = resolveDawnLikeFloorName(`${phase} grass floor`, {
          n: inland(x, y - 1), s: inland(x, y + 1), e: inland(x + 1, y), w: inland(x - 1, y),
        }, atlas.byName);
        layers.push({ name: grass.name, z: Z.meadow, reason: `Meadow · ${phase} tint` });
      }
    }

    const tile = tileAt(farm, x, y);

    // Worked soil. Wet and dry tiles pick DIFFERENT families but share
    // one neighbour predicate, so the field block keeps a single clean
    // outline no matter which tiles inside it have been watered today.
    if (tile && tile.ground !== WILD) {
      const isSoil = (nx, ny) => {
        const t = tileAt(farm, nx, ny);
        return Boolean(t && t.ground !== WILD);
      };
      const soil = resolveDawnLikeFloorName(soilFamily(farm, tile), {
        n: isSoil(x, y - 1), s: isSoil(x, y + 1), e: isSoil(x + 1, y), w: isSoil(x - 1, y),
      }, atlas.byName);
      layers.push({
        name: soil.name,
        z: Z.soil,
        reason: tile.watered ? 'Watered soil · generated family' : 'Tilled soil',
      });
    }

    // Pen fence: the open-path suffix family, autotiled against itself
    // so the corners and the gateway resolve on their own.
    if (isPenWall(farm, x, y)) {
      const name = resolveDawnLikeWallName(fenceStyleProp, {
        n: isPenWall(farm, x, y - 1), s: isPenWall(farm, x, y + 1),
        e: isPenWall(farm, x + 1, y), w: isPenWall(farm, x - 1, y),
      }, atlas.byName);
      layers.push({ name, z: Z.fence, reason: 'Pen fence · open-path resolver' });
    }

    const scatter = farm.decor[`${x},${y}`];
    if (scatter) layers.push({ name: scatter, z: Z.scatter, reason: 'Wild growth' });

    const tree = orchardSprite(farm, x, y);
    if (tree) layers.push({ name: tree, z: Z.growth, reason: 'Orchard' });

    const crop = tile ? cropSprite(tile) : null;
    if (crop) layers.push({ name: crop, z: Z.growth, reason: `Crop · ${tile.stage}` });

    const animal = farm.animals.find((a) => a.x === x && a.y === y);
    if (animal) {
      layers.push({ name: animal.name, z: Z.animal, reason: animal.tended ? 'Tended' : 'Needs tending' });
    }

    if (farmer.x === x && farmer.y === y) {
      layers.push({ name: farmerSpriteProp, z: Z.farmer, reason: 'You' });
    }

    return layers;
  }, [farm, atlas, phase, farmer, waterStyleProp, shoreStyleProp, fenceStyleProp, farmerSpriteProp]);

  const targeted = useMemo(() => {
    if (!farm) return null;
    const [dx, dy] = FACING[farmer.facing];
    const x = farmer.x + dx;
    const y = farmer.y + dy;
    if (x < 0 || y < 0 || x >= farm.width || y >= farm.height) return null;
    return { x, y, ...actionFor(farm, x, y, selectedCrop) };
  }, [farm, farmer, selectedCrop]);

  if (!atlas || !farm) {
    return <div className="farm-layout"><div className="farm-panel">Loading…</div></div>;
  }

  const barn = stockValue(farm);
  const ready = Object.values(farm.tiles).filter((t) => t.stage === 'ready').length;
  const thirsty = Object.values(farm.tiles).filter((t) => t.crop && !t.watered && t.stage !== 'withered').length;

  return (
    <div className={`farm-layout farm-phase-${phase}`} style={dawnlikeAnimVars}>
      <div className="farm-hud">
        <div className="farm-stat"><span>Day</span><strong>{farm.day}</strong></div>
        <div className="farm-stat"><span>Gold</span><strong>{farm.gold}g</strong></div>
        <div className="farm-stat"><span>Barn</span><strong>{barn}g</strong></div>
        <div className="farm-stat"><span>Ready</span><strong>{ready}</strong></div>
        <div className="farm-stat"><span>Thirsty</span><strong>{thirsty}</strong></div>
        <div className="farm-stat" title="Refill at the pond">
          <span>Can</span><strong>{farm.can}/{CAN_CAPACITY}</strong>
        </div>
        <div className="farm-energy" title={`${farm.energy} / ${ENERGY_PER_DAY} stamina — the tint follows this`}>
          <span>{phase}</span>
          <div className="farm-energy-bar">
            <div style={{ width: `${Math.max(0, farm.energy / ENERGY_PER_DAY) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="farm-body">
        <div
          className="farm-viewport"
          ref={gridRef}
          tabIndex={0}
          onClick={() => gridRef.current?.focus()}
        >
          <div className="farm-grid" style={{ width: farm.width * TILE, height: farm.height * TILE }}>
            {Array.from({ length: farm.height }).map((_, y) =>
              Array.from({ length: farm.width }).map((__, x) => {
                const isTarget = targeted && targeted.x === x && targeted.y === y;
                return (
                  <div
                    key={`${x},${y}`}
                    className={`farm-cell${isTarget ? ' farm-cell-target' : ''}`}
                    style={{ left: x * TILE, top: y * TILE, width: TILE, height: TILE }}
                    onClick={() => doAct(x, y)}
                  >
                    {layersFor(x, y).map((layer, i) => {
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
                            zIndex: layer.z,
                            imageRendering: 'pixelated',
                          }}
                        />
                      );
                    })}
                  </div>
                );
              }),
            )}
          </div>
        </div>

        <div className="farm-panel">
          <h3>Seed shop</h3>
          <ul className="farm-seeds">
            {CROP_IDS.map((id, i) => {
              const crop = CROPS[id];
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={id === selectedCrop ? 'selected' : ''}
                    onClick={() => setSelectedCrop(id)}
                    disabled={farm.gold < crop.seedCost}
                  >
                    <span className="farm-seed-key">{i + 1}</span>
                    <span className="farm-seed-name">{crop.label}</span>
                    <span className="farm-seed-meta">
                      {crop.seedCost}g · {crop.days}d · sells {crop.sellPrice}g
                      {crop.regrows ? ' · regrows' : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="farm-buttons">
            <button type="button" onClick={sell} disabled={!barn}>Sell barn ({barn}g)</button>
            <button type="button" className="primary" onClick={endDay}>End day (E)</button>
          </div>

          <h3>Facing</h3>
          <p className="farm-target">
            {targeted
              ? <>({targeted.x}, {targeted.y}) — <strong>{targeted.label}</strong></>
              : 'the edge of the world'}
          </p>

          <h3>Controls</h3>
          <p className="farm-help">
            <kbd>WASD</kbd>/<kbd>↑↓←→</kbd> walk · <kbd>Space</kbd> act on the tile you face ·
            {' '}<kbd>1</kbd>–<kbd>{CROP_IDS.length}</kbd> pick seed · <kbd>E</kbd> end the day.
            You can also click any tile next to you.
          </p>
          <p className="farm-help">
            Crops only grow on days they were <strong>watered</strong>. The can holds
            {' '}{CAN_CAPACITY} tiles' worth and only refills at the pond, so the walk
            back and forth is the real cost of a big field. Two dry days in a row
            and the crop withers; three days of bare tilled soil and the weeds
            take it back.
          </p>

          <h3>Log</h3>
          <ul className="farm-log">
            {farm.log.slice(-6).reverse().map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        </div>
      </div>

      {flash && (
        <div key={flash.at} className={`farm-flash${flash.ok ? '' : ' bad'}`}>{flash.message}</div>
      )}
    </div>
  );
}
