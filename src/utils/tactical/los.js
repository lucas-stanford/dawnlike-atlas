/**
 * tactical/los.js — Line-of-sight using rot.js precise shadowcasting.
 *
 * Two exports:
 *   - losBetween(from, to, isBlocking)  — can `from` see tile `to`?
 *   - visibleSet(from, range, isBlocking) — all tiles `from` can see
 *     up to `range`, as a Set of "x,y" keys.
 *
 * `isBlocking(x, y)` should return true for any tile that fully
 * blocks LOS (walls, large obstacles); false for trail / open ground /
 * floor / etc. Caller chooses semantics (e.g. is half-cover
 * vision-blocking — usually no).
 */

import * as ROT from 'rot-js';

const losCache = new WeakMap();
function fovFor(isBlocking) {
  // Cache one FOV instance per `isBlocking` callback so we don't
  // recreate the rot.js helper on every call; rot.js' constructor is
  // cheap but reseating it has measurable cost during AI plans.
  let v = losCache.get(isBlocking);
  if (!v) {
    v = new ROT.FOV.PreciseShadowcasting((x, y) => !isBlocking(x, y));
    losCache.set(isBlocking, v);
  }
  return v;
}

/**
 * Returns the set of tile keys ("x,y") that `from` can see, out to
 * `range` tiles.
 *
 * @param {{x:number, y:number}} from
 * @param {number} range
 * @param {(x:number, y:number) => boolean} isBlocking
 */
export function visibleSet(from, range, isBlocking) {
  const seen = new Set();
  const fov = fovFor(isBlocking);
  fov.compute(from.x, from.y, range, (x, y, _r, vis) => {
    if (vis > 0) seen.add(`${x},${y}`);
  });
  return seen;
}

/**
 * Union of multiple units' FOVs (used to compute the squad's combined
 * vision for fog-of-war).
 */
export function squadVisibleSet(units, range, isBlocking) {
  const out = new Set();
  for (const u of units) {
    if (u.hp <= 0) continue;
    const v = visibleSet(u, range, isBlocking);
    for (const k of v) out.add(k);
  }
  return out;
}

/**
 * True iff `from` has direct line of sight to `to` within `range`.
 * Symmetric (LOS is mutual for the precise shadowcasting algorithm
 * but we treat range as one-way: from's range matters, not to's).
 *
 * @param {{x:number, y:number}} from
 * @param {{x:number, y:number}} to
 * @param {number} range
 * @param {(x:number, y:number) => boolean} isBlocking
 */
export function losBetween(from, to, range, isBlocking) {
  const set = visibleSet(from, range, isBlocking);
  return set.has(`${to.x},${to.y}`);
}

/**
 * Returns the subset of `enemies` that `unit` can see within `range`.
 * Skips any enemy whose hp <= 0.
 */
export function visibleEnemies(unit, enemies, range, isBlocking) {
  const set = visibleSet(unit, range, isBlocking);
  return enemies.filter(e => e.hp > 0 && set.has(`${e.x},${e.y}`));
}
