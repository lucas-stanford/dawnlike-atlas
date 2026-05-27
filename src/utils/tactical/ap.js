/**
 * tactical/ap.js — XCOM-classic action-point bookkeeping.
 *
 * Each unit has `ap` (current) and `maxAp` (default 2). AP is spent
 * by actions in tactical/combat.js and tactical/move.js. End-of-turn
 * resets every squad unit's AP back to maxAp and unsets any "ended
 * turn early" flag.
 *
 * Framework-agnostic: plain JS, no React, no Phaser, no DOM.
 */

export const DEFAULT_MAX_AP = 2;

/**
 * Initialise / reset a unit's AP block. Idempotent.
 * @param {object} unit  Must have at minimum `maxAp` (or 2 is used).
 */
export function resetAP(unit) {
  unit.maxAp = unit.maxAp ?? DEFAULT_MAX_AP;
  unit.ap = unit.maxAp;
  unit.ended = false;
}

/**
 * Returns the AP a unit currently has available.
 * @returns {number}
 */
export function actionPoints(unit) {
  return Math.max(0, unit.ap ?? 0);
}

/**
 * Deduct `cost` AP from `unit`. Returns true on success; returns
 * false (and does nothing) if the unit doesn't have enough AP.
 * @param {object} unit
 * @param {number} cost
 */
export function spendAP(unit, cost) {
  if ((unit.ap ?? 0) < cost) return false;
  unit.ap -= cost;
  if (unit.ap <= 0) {
    unit.ap = 0;
    unit.ended = true;
  }
  return true;
}

/**
 * Force this unit's turn to end (AP → 0, ended → true). Used by
 * shoot / cast (1-AP costs that consume the rest of the turn).
 */
export function endUnitTurn(unit) {
  unit.ap = 0;
  unit.ended = true;
}

/**
 * Reset every unit in the array to a full turn. Call between phases.
 */
export function refreshSquad(squad) {
  for (const u of squad) {
    if (u.hp <= 0) continue;
    resetAP(u);
  }
}

/**
 * True iff every alive unit in the squad has ended its turn.
 */
export function allActed(squad) {
  return squad.filter(u => u.hp > 0).every(u => u.ended);
}
