/**
 * tactical/ai.js — Enemy archetype dispatch.
 *
 * Returns a planned action for each enemy on the enemy turn. Actions
 * are intent records the caller executes (with visible delay between
 * each so the player can follow what happened).
 *
 * Action shape:
 *   { unit, kind: 'move'|'attack'|'pass', target?, path?, ... }
 *
 * Archetypes:
 *   chaser   — close to melee distance + attack
 *   camper   — stay where you are if you have a shot; otherwise
 *              reposition to LOS
 *   bruiser  — straight-line charge, ignore cover
 *   pack     — move toward pack centroid; attack only if outnumbered
 *              locally
 *   boss     — telegraphed AOE on a 2-turn cycle (wind-up → release)
 */

import * as ROT from 'rot-js';
import { reachableTiles, previewPath, tileDistance } from './move.js';
import { visibleEnemies } from './los.js';

const SPRITE_TO_ARCHETYPE = {
  goblin:           'chaser',
  kobold:           'chaser',
  'kobold barbarian': 'pack',
  'kobold zombie':  'chaser',
  imp:              'chaser',
  'lava demon':     'bruiser',
  'fire elemental': 'camper',
  'fire skeleton':  'camper',
  'human zombie':   'chaser',
  skeleton:         'camper',
  ghost:            'pack',
  'hell hound':     'bruiser',
};

/**
 * Returns the archetype keyword for an enemy unit by its sprite
 * name. Defaults to 'chaser' for anything unrecognised.
 */
export function archetypeFor(unit) {
  if (unit.archetype) return unit.archetype;
  return SPRITE_TO_ARCHETYPE[unit.sprite] || 'chaser';
}

/**
 * Plan one enemy's turn. Returns an array of intent records (each
 * costing 1 AP); the caller executes them sequentially with visible
 * delay between.
 *
 * @param {object} enemy
 * @param {object[]} squad
 * @param {object} mapCtx  { isBlocking, isObstacle, isBlockingForUnit, fovRange }
 */
export function planTurn(enemy, squad, mapCtx) {
  if (enemy.hp <= 0) return [];
  const arch = archetypeFor(enemy);
  const actions = [];
  let apLeft = enemy.maxAp ?? 2;

  // The "see" set for this enemy: which squad members are in LOS?
  const visible = visibleEnemies(enemy, squad, mapCtx.fovRange ?? 8, mapCtx.isBlocking);

  // If we can see somebody and we're already in range, attack first.
  const inRange = (s) => tileDistance(enemy, s) <= (enemy.weapon?.range ?? 1);
  let target = visible.find(inRange);

  // No target in range — pick a move based on archetype.
  if (!target) {
    let dest = null;
    if (arch === 'chaser' || arch === 'bruiser') {
      // Closest squad member; charge in. Bruiser ignores cover, so
      // we don't care about cover-tile selection.
      const nearest = visible[0] || squad.find(s => s.hp > 0) || null;
      if (nearest) {
        dest = stepToward(enemy, nearest, enemy.maxAp ?? 2, mapCtx);
      }
    } else if (arch === 'pack') {
      // Move toward centroid of own pack (other alive enemies with
      // same archetype). If alone, behave like a chaser.
      const pack = mapCtx.enemies?.filter(e => e !== enemy && e.hp > 0 && archetypeFor(e) === 'pack') || [];
      if (pack.length) {
        const cx = Math.round(pack.reduce((s, e) => s + e.x, 0) / pack.length);
        const cy = Math.round(pack.reduce((s, e) => s + e.y, 0) / pack.length);
        dest = stepToward(enemy, { x: cx, y: cy }, enemy.maxAp ?? 2, mapCtx);
      } else if (visible.length) {
        dest = stepToward(enemy, visible[0], enemy.maxAp ?? 2, mapCtx);
      }
    } else if (arch === 'camper') {
      // Camp unless we have no shot at all. If no squad in LOS at
      // all, reposition toward the last-seen player tile (we use
      // closest alive squad as a proxy).
      if (!visible.length) {
        const nearest = squad.find(s => s.hp > 0);
        if (nearest) dest = stepToward(enemy, nearest, enemy.maxAp ?? 2, mapCtx);
      }
    } else if (arch === 'boss') {
      // Boss telegraph: 1 turn of "winding up" (no action), then
      // releases a 3x3 AOE on its target tile on the next turn. We
      // implement that with a tag on the unit.
      if (!enemy.windup) {
        enemy.windup = true;
        actions.push({ kind: 'telegraph', unit: enemy, target: visible[0] || squad[0] });
        return actions;
      }
      // Release the AOE.
      actions.push({ kind: 'aoe', unit: enemy, target: visible[0] || squad[0] });
      enemy.windup = false;
      return actions;
    }
    if (dest && (dest.x !== enemy.x || dest.y !== enemy.y)) {
      const path = previewPath(enemy, dest, mapCtx.isBlockingForUnit);
      if (path && path.length > 1) {
        actions.push({ kind: 'move', unit: enemy, path });
        apLeft -= 1;
        enemy.x = path[path.length - 1].x;
        enemy.y = path[path.length - 1].y;
      }
    }
    // After moving, check again whether we have any in-range target.
    const newVisible = visibleEnemies(enemy, squad, mapCtx.fovRange ?? 8, mapCtx.isBlocking);
    target = newVisible.find(inRange) || null;
  }

  if (target && apLeft >= 1) {
    actions.push({ kind: 'attack', unit: enemy, target });
    apLeft -= 1;
  }

  if (!actions.length) actions.push({ kind: 'pass', unit: enemy });
  return actions;
}

/**
 * Helper: given an enemy and a target, return the closest tile the
 * enemy can reach within `range` cardinal steps. Uses BFS-style
 * reachable, then picks the candidate with smallest Manhattan
 * distance to the target.
 */
function stepToward(unit, target, range, mapCtx) {
  const reachable = reachableTiles(unit, range, mapCtx.isBlockingForUnit);
  let best = null, bestD = Infinity;
  for (const [k] of reachable) {
    const [xs, ys] = k.split(',').map(Number);
    const d = Math.abs(xs - target.x) + Math.abs(ys - target.y);
    if (d < bestD) { bestD = d; best = { x: xs, y: ys }; }
  }
  return best;
}
