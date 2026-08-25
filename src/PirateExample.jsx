/**
 * PirateExample — an archipelago treasure run.
 *
 * The rules live in `src/utils/pirate.js` and know nothing about React or
 * the atlas; this file is input handling and drawing, nothing else. The
 * module is exported from the package as `dawnlike-atlas/utils/pirate`.
 *
 * FOUR RESOLVERS ON ONE MAP
 *
 *   coastline    → resolveDawnLikeShoreName  (8-way, 47-tile blob set)
 *   palm canopy  → resolveDawnLikeForestName (corner blob)
 *   the SHIP'S HULL → resolveDawnLikeFloorName (the 16 floor suffixes)
 *   open sea     → two flat tiles, deep and shallow
 *
 * THE TRICK WORTH STEALING
 *
 * DawnLike does not draw a ship. Not one, anywhere in the pack. So this
 * one is not a sprite — it is a six-cell tile map that moves, over
 * planking, gunwales and a mast drawn by
 * `scripts/generate-ship-deck.mjs` in DawnLike's own five wood colours.
 *
 * The interesting part is the hull. Autotile resolvers are normally run
 * once over a static map, but here the gunwale is re-resolved from the
 * footprint every time the ship comes about: heading north the six cells
 * resolve to `nw ne / w e / sw se`, heading east to `nw sw / n s / ne
 * se`, and nothing in this file knows that — `resolveDawnLikeFloorName`
 * works it out from the neighbour truth table, exactly the way it works
 * out the outline of a ploughed field. A rigid body is just a very small
 * map that happens to rotate.
 *
 * The sea underneath costs nothing: the generated `sand shore` tiles are
 * transparent where their water goes, so open water is painted flat under
 * every cell and the coast composites over it.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { resolveAssetPath } from './utils/paths';
import { dawnlikeAnimVars, DAWNLIKE_ATLAS_0_URL } from './utils/spriteAnim';
import './utils/spriteAnim.css';
import {
  resolveDawnLikeShoreName,
  resolveDawnLikeForestName,
  resolveDawnLikeFloorName,
} from './utils/autotile';
import {
  SAND, COMPASS_LABEL, WATCHES_PER_DAY, LOOT, VESSEL_IDS,
  hullMax, holdCapacity, vesselOf, boatSprite,
  createSea, cellAt, shipCells, hullNeighbours, hullSuffix, bowSprite,
  beastAt, propAt, hasCanopy, holdWeight, holdValue, atCove, canLand,
  sailCost, pointOfSail, waterSprite, deckSprite, primaryAction,
  MAST_SPRITE, MAST_INDEX, HULL_FAMILY,
  sail, turn, walk, toggleShore, act, endDay,
  CAPTAIN_SPRITE, COVE_SPRITE,
} from './utils/pirate';
import './Pirate.css';

const TILE = 32;

/**
 * Draw order, bottom to top. Whole numbers only — CSS rejects a
 * fractional `z-index` outright and silently falls back to `auto`, which
 * then stacks by DOM order and looks correct right up until something
 * reorders the layer list.
 */
const Z = {
  sea: 0, shore: 1, canopy: 2, flotsam: 3,
  deck: 4, rail: 5, beast: 6, crew: 7, marker: 8,
};

/** Keys that steer. Turning is separate from sailing, by design. */
const KEY_WALK = {
  ArrowUp: 'n', w: 'n', W: 'n',
  ArrowDown: 's', s: 's', S: 's',
  ArrowLeft: 'w', a: 'w', A: 'w',
  ArrowRight: 'e', d: 'e', D: 'e',
};

export default function PirateExample({
  width: widthProp = 34,
  height: heightProp = 22,
  islands: islandsProp = 5,
  /** `'ship'` (six cells, autotiled hull) or `'boat'` (one cell, one sprite). */
  vessel: vesselProp = 'ship',
  seed: seedProp,
  captainSprite: captainSpriteProp = CAPTAIN_SPRITE,
  canopyStyle: canopyStyleProp = 'palm',
} = {}) {
  const [atlas, setAtlas] = useState(null);
  const [seed] = useState(seedProp ?? Math.floor(Math.random() * 1_000_000));
  const [sea, setSea] = useState(null);
  const [flash, setFlash] = useState(null);
  const stageRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch(resolveAssetPath('/DawnlikeAtlas.json'))
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setAtlas(json); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setSea(createSea({
      width: widthProp, height: heightProp, islands: islandsProp,
      vessel: VESSEL_IDS.includes(vesselProp) ? vesselProp : 'ship',
      seed,
    }));
  }, [seed, widthProp, heightProp, islandsProp, vesselProp]);

  const say = useCallback((message, ok = true) => {
    if (message) setFlash({ message, ok, at: Date.now() });
  }, []);

  /** Run an action and surface whatever it had to say. */
  const run = useCallback((fn) => {
    setSea((state) => {
      if (!state) return state;
      const result = fn(state);
      say(result.message, result.ok);
      return result.state;
    });
  }, [say]);

  const newDay = useCallback(() => {
    setSea((state) => {
      if (!state) return state;
      const { state: next, report } = endDay(state);
      say(next.log[0], !report.wrecked && !report.hullLost);
      return next;
    });
  }, [say]);

  const restart = useCallback(() => {
    setSea(createSea({
      width: widthProp, height: heightProp, islands: islandsProp,
      vessel: VESSEL_IDS.includes(vesselProp) ? vesselProp : 'ship',
      seed: Math.floor(Math.random() * 1_000_000),
    }));
  }, [widthProp, heightProp, islandsProp, vesselProp]);

  // ---- input -------------------------------------------------------

  useEffect(() => {
    const onKey = (event) => {
      if (!sea) return;
      const k = event.key;

      // Ashore, the arrows walk. Aboard, up sails and left/right steer —
      // a ship only ever moves forwards, which is the whole point of the
      // wind rule.
      if (KEY_WALK[k]) {
        event.preventDefault();
        if (sea.ashore) { run((s) => walk(s, KEY_WALK[k])); return; }
        const dir = KEY_WALK[k];
        if (dir === 'n') { run(sail); return; }
        if (dir === 'w') { run((s) => turn(s, 'port')); return; }
        if (dir === 'e') { run((s) => turn(s, 'starboard')); return; }
        return;
      }
      if (k === ' ' || k === 'Enter') { event.preventDefault(); run(act); return; }
      if (k === 'r' || k === 'R') { event.preventDefault(); run(toggleShore); return; }
      if (k === 'e' || k === 'E') { event.preventDefault(); newDay(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sea, run, newDay]);

  // ---- drawing -----------------------------------------------------

  /**
   * The ship's own tiles, computed once per render rather than per cell:
   * six deck sprites and six rail names for a 34x22 map is a rounding
   * error, but asking `shipCells` inside the per-cell loop would run it
   * seven hundred times a frame.
   */
  const shipLayer = useMemo(() => {
    if (!sea || !atlas) return new Map();
    const map = new Map();
    const heading = sea.ship.heading;

    // A one-cell boat is a sprite, not a tile map: there is no outline to
    // resolve, no deck to plank and nowhere to step a mast. It is drawn
    // the way a creature is drawn.
    if (vesselOf(sea.ship).along === 1) {
      const [cell] = shipCells(sea.ship);
      map.set(`${cell.x},${cell.y}`, { boat: boatSprite(heading) });
      return map;
    }

    hullNeighbours(sea.ship).forEach((cell, i) => {
      const suffix = hullSuffix(cell);
      map.set(`${cell.x},${cell.y}`, {
        // A bow piece is one opaque tile — planking and chamfer together.
        // Everywhere else the deck is drawn first and the gunwale over it.
        bow: cell.bow ? bowSprite(suffix, heading) : null,
        deck: deckSprite(i, heading),
        rail: resolveDawnLikeFloorName(HULL_FAMILY, cell, atlas.byName).name,
        mast: i === MAST_INDEX,
        // The helm is cell 0, which is also the ship's own {x, y}.
        helm: i === 0,
      });
    });
    return map;
  }, [sea, atlas]);

  const layersFor = useCallback((x, y) => {
    if (!sea || !atlas) return [];
    const layers = [];

    // Open water under everything. The shore tiles are transparent where
    // their water goes, so this is the only water anyone has to place.
    layers.push({ name: waterSprite(sea, x, y), z: Z.sea });

    const land = (nx, ny) => {
      if (nx < 0 || ny < 0 || nx >= sea.width || ny >= sea.height) return false;
      return cellAt(sea, nx, ny) === SAND;
    };

    if (land(x, y)) {
      const shore = resolveDawnLikeShoreName('sand shore', {
        n: land(x, y - 1), s: land(x, y + 1), w: land(x - 1, y), e: land(x + 1, y),
        nw: land(x - 1, y - 1), ne: land(x + 1, y - 1),
        sw: land(x - 1, y + 1), se: land(x + 1, y + 1),
      }, atlas.byName);
      layers.push({ name: shore.name, z: Z.shore });

      // The canopy set is decided once, at generation, so the resolver
      // gets a stable shape to work with — and so the clearings between
      // clumps stay put instead of re-rolling on every render.
      const wooded = (nx, ny) => hasCanopy(sea, nx, ny);
      if (wooded(x, y)) {
        const canopy = resolveDawnLikeForestName(canopyStyleProp, {
          n: wooded(x, y - 1), s: wooded(x, y + 1), e: wooded(x + 1, y), w: wooded(x - 1, y),
          nw: wooded(x - 1, y - 1), ne: wooded(x + 1, y - 1),
          sw: wooded(x - 1, y + 1), se: wooded(x + 1, y + 1),
        }, atlas.byName);
        if (canopy?.name) layers.push({ name: canopy.name, z: Z.canopy });
      }
    }

    const prop = propAt(sea, x, y);
    if (prop) layers.push({ name: prop.sprite, z: Z.flotsam });

    if (sea.cove.x === x && sea.cove.y === y) {
      layers.push({ name: COVE_SPRITE, z: Z.flotsam });
    }

    const ship = shipLayer.get(`${x},${y}`);
    if (ship) {
      if (ship.boat) {
        // No figure at the helm: at one cell the boat sprite already has
        // someone in it, and a captain drawn on top just hides the boat.
        layers.push({ name: ship.boat, z: Z.deck });
      } else if (ship.bow) {
        layers.push({ name: ship.bow, z: Z.deck });
      } else {
        layers.push({ name: ship.deck, z: Z.deck });
        if (ship.rail) layers.push({ name: ship.rail, z: Z.rail });
      }
      if (ship.mast) layers.push({ name: MAST_SPRITE, z: Z.rail });
      // A figure at the helm is what tells you at a glance which of the
      // things on the water is yours. Only when aboard, obviously.
      if (ship.helm && !sea.ashore) layers.push({ name: captainSpriteProp, z: Z.crew });
    }

    const beast = beastAt(sea, x, y);
    if (beast) layers.push({ name: beast.sprite, z: Z.beast });

    if (sea.ashore && sea.ashore.x === x && sea.ashore.y === y) {
      layers.push({ name: captainSpriteProp, z: Z.crew });
    }

    return layers;
  }, [sea, atlas, shipLayer, canopyStyleProp, captainSpriteProp]);

  if (!atlas || !sea) {
    return <div className="dl-page pirate-page"><div className="dl-panel dl-panel-body">Loading…</div></div>;
  }

  const primary = primaryAction(sea);
  const maxHull = hullMax(sea);
  const maxHold = holdCapacity(sea);
  const cost = sailCost(sea.ship.heading, sea.wind);
  const trim = pointOfSail(sea.ship.heading, sea.wind);
  const cargo = holdWeight(sea);
  const dug = sea.caches.filter((c) => c.dug).length;

  return (
    <div className="dl-page pirate-page dl-ui" style={dawnlikeAnimVars}>
      <div className="dl-toolbar">
        <span className="dl-toolbar-title">{vesselOf(sea.ship).label}</span>
        <div className="dl-stat"><span>Day</span><strong>{sea.day}</strong></div>
        <div className="dl-stat gold"><span>Banked</span><strong>{sea.banked}</strong></div>
        <div className="dl-stat"><span>Hold</span><strong>{holdValue(sea)}</strong></div>
        <div className="dl-stat"><span>Caches</span><strong>{dug}/{sea.caches.length}</strong></div>

        <div className="pirate-gauge" title={`Hull ${sea.hull} of ${maxHull}`}>
          <span>Hull</span>
          <div className="dl-meter hp"><i style={{ width: `${(sea.hull / maxHull) * 100}%` }} /></div>
        </div>

        <div className="pirate-gauge" title={`${sea.watches} watches left of ${WATCHES_PER_DAY}`}>
          <span>Watch</span>
          <div className="dl-meter">
            <i style={{ width: `${Math.max(0, sea.watches / WATCHES_PER_DAY) * 100}%` }} />
          </div>
        </div>

        <div className="dl-toolbar-spacer" />
        <div className={`pirate-wind trim-${trim}`} title="Sailing with the wind costs one watch, across it two, into it three">
          <span className="pirate-wind-label">Wind</span>
          <b className={`pirate-arrow arrow-${sea.wind}`} aria-hidden="true">↑</b>
          <span className="pirate-wind-from">{COMPASS_LABEL[sea.wind]}</span>
          <em>{trim} · {cost}w</em>
        </div>
      </div>

      <div className="dl-body">
        <div className="dl-stage" ref={stageRef} tabIndex={0} onClick={() => stageRef.current?.focus()}>
          <div
            className="pirate-grid dl-stage-inner"
            style={{ width: sea.width * TILE, height: sea.height * TILE }}
          >
            {Array.from({ length: sea.height }).map((_, y) =>
              Array.from({ length: sea.width }).map((__, x) => (
                <div
                  key={`${x},${y}`}
                  className="pirate-cell"
                  style={{ left: x * TILE, top: y * TILE, width: TILE, height: TILE }}
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
              )),
            )}
          </div>
        </div>

        <aside className="dl-sidebar">
          <section className="dl-panel">
            <h3 className="dl-panel-head">Orders</h3>
            <div className="dl-panel-body pirate-orders">
              <button
                type="button"
                className="dl-btn primary"
                onClick={() => run(act)}
                disabled={primary.action === 'none'}
              >
                {primary.label}
              </button>
              <div className="pirate-order-row">
                <button type="button" className="dl-btn" onClick={() => run((s) => turn(s, 'port'))}>
                  ⟲ Port
                </button>
                <button type="button" className="dl-btn" onClick={() => run(sail)}>
                  ▲ Sail ({cost}w)
                </button>
                <button type="button" className="dl-btn" onClick={() => run((s) => turn(s, 'starboard'))}>
                  ⟳ Starboard
                </button>
              </div>
              <div className="pirate-order-row">
                <button
                  type="button"
                  className="dl-btn"
                  onClick={() => run(toggleShore)}
                  disabled={!sea.ashore && !canLand(sea)}
                >
                  {sea.ashore ? 'Row back (R)' : 'Row ashore (R)'}
                </button>
                <button type="button" className="dl-btn" onClick={newDay}>New day (E)</button>
              </div>
              {sea.wrecked && (
                <button type="button" className="dl-btn danger" onClick={restart}>New voyage</button>
              )}
            </div>
          </section>

          <section className="dl-panel">
            <h3 className="dl-panel-head">Hold · {cargo}/{maxHold}</h3>
            <div className="dl-panel-body">
              {sea.hold.length ? (
                <ul className="pirate-hold">
                  {sea.hold.map((id, i) => (
                    <li key={i}>
                      <Sprite atlas={atlas} name={LOOT[id].sprite} />
                      <span>{LOOT[id].label}</span>
                      <b>{LOOT[id].value}</b>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pirate-note">
                  Empty. Loot in the hold goes down with the ship; loot landed at
                  the cove is safe. That is the whole gamble.
                </p>
              )}
            </div>
          </section>

          <section className="dl-panel">
            <h3 className="dl-panel-head">Watch</h3>
            <div className="dl-panel-body">
              <p className="pirate-note">
                {sea.ashore
                  ? `Ashore at (${sea.ashore.x}, ${sea.ashore.y}). ${primary.label}.`
                  : `Aboard, heading ${COMPASS_LABEL[sea.ship.heading].toLowerCase()} and ${trim}. ${primary.label}.`}
                {atCove(sea) ? ' The cove is alongside.' : ''}
              </p>
              <p className="pirate-help">
                {sea.ashore ? (
                  <>
                    <kbd className="dl-kbd">WASD</kbd> walk the beach ·
                    {' '}<kbd className="dl-kbd">Space</kbd> dig or prise open ·
                    {' '}<kbd className="dl-kbd">R</kbd> row back
                  </>
                ) : (
                  <>
                    <kbd className="dl-kbd">W</kbd> sail ahead ·
                    {' '}<kbd className="dl-kbd">A</kbd>/<kbd className="dl-kbd">D</kbd> put the helm over ·
                    {' '}<kbd className="dl-kbd">Space</kbd> {primary.label.toLowerCase()} ·
                    {' '}<kbd className="dl-kbd">R</kbd> row ashore
                  </>
                )}
                {' · '}<kbd className="dl-kbd">E</kbd> end the day
              </p>
              <p className="pirate-help">
                She only moves forwards, so every course change is a turn first.
                Running before the wind costs one watch, reaching across it two,
                beating into it three — which is why the way home is the part
                worth planning.
              </p>
            </div>
          </section>

          <section className="dl-panel">
            <h3 className="dl-panel-head">Log</h3>
            <div className="dl-panel-body">
              <ul className="pirate-log">
                {sea.log.slice(0, 7).map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            </div>
          </section>
        </aside>
      </div>

      {sea.wrecked && (
        <div className="dl-scrim">
          <div className="dl-modal">
            <h2>She is on the bottom.</h2>
            <p>
              Day {sea.day}. {sea.banked} landed at the cove — everything still in
              the hold went down with her.
            </p>
            <button type="button" className="dl-btn primary" onClick={restart}>New voyage</button>
          </div>
        </div>
      )}

      {flash && (
        <div key={flash.at} className={`pirate-flash${flash.ok ? '' : ' bad'}`}>{flash.message}</div>
      )}
    </div>
  );
}

/** A single atlas sprite at 1x, for the hold list. */
function Sprite({ atlas, name }) {
  const s = atlas?.byName?.[name];
  if (!s) return <i className="pirate-sprite" />;
  return (
    <i
      className="pirate-sprite"
      style={{
        backgroundImage: `url(${DAWNLIKE_ATLAS_0_URL})`,
        backgroundPosition: `-${s.x}px -${s.y}px`,
        backgroundSize: `${atlas.meta.size.w}px ${atlas.meta.size.h}px`,
      }}
    />
  );
}
