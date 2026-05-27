/**
 * tactical/combat.js — Hit-chance + damage + attack resolution.
 *
 * Pure-functional combat math; uses tactical/cover for the cover
 * penalty and tactical/los for LOS gating.
 *
 * The `attacker` shape:
 *   { x, y, aim, weapon: { dmg, optimalRange, range, kind } }
 *      aim          — base hit chance modifier (e.g. 65 means
 *                     65% point-blank against an unarmoured target)
 *      weapon.dmg   — [min, max] damage range
 *      weapon.range — max range (tiles) — beyond this, no shot
 *      weapon.optimalRange — beyond this, distance penalty applies
 *      weapon.kind  — 'melee' | 'ranged' | 'spell'
 *
 * The `target` shape:
 *   { x, y, hp, maxHp, defense, armor }
 *      defense — flat % miss bonus
 *      armor   — flat damage reduction
 *
 * All RNG is via `rot-js` so seeded missions are deterministic.
 */

import * as ROT from 'rot-js';
import { coverBetween, coverPenalty, isFlanking } from './cover.js';

const DISTANCE_PENALTY_PER_TILE = 5;
const FLANK_CRIT_BONUS = 25;
const BASE_CRIT = 10;

/**
 * Compute the displayed hit chance for `attacker` vs `target`.
 * Returns an integer 5..95.
 *
 * Caller must pre-check that the attacker has LOS and range.
 *
 * @returns {{
 *   percent: number,           // 5..95
 *   breakdown: object,         // for HUD display
 *   cover: 'none'|'half'|'full',
 *   flanking: boolean,
 *   inRange: boolean,
 * }}
 */
export function hitChance(attacker, target, isObstacle) {
  const dist = Math.abs(attacker.x - target.x) + Math.abs(attacker.y - target.y);
  const aim = attacker.aim ?? 65;
  const defense = target.defense ?? 0;
  const cover = coverBetween(attacker, target, isObstacle);
  const flanking = isFlanking(attacker, target, isObstacle);
  const coverPen = flanking ? 0 : coverPenalty(cover);
  const range = attacker.weapon?.range ?? 1;
  const optimal = attacker.weapon?.optimalRange ?? range;
  const distPen = dist > optimal ? (dist - optimal) * DISTANCE_PENALTY_PER_TILE : 0;
  const inRange = dist <= range;
  let chance = aim - defense - coverPen - distPen;
  chance = Math.max(5, Math.min(95, Math.round(chance)));
  return {
    percent: inRange ? chance : 0,
    breakdown: { aim, defense, cover, coverPenalty: coverPen, distance: dist, distancePenalty: distPen, flanking },
    cover,
    flanking,
    inRange,
  };
}

/**
 * Returns the crit chance (0..100) for the attack. Flanking and
 * weapon-specific bonuses stack on top of the global BASE_CRIT.
 */
export function critChance(attacker, target, flanking) {
  let crit = BASE_CRIT + (attacker.critBonus ?? 0);
  if (flanking) crit += FLANK_CRIT_BONUS;
  return Math.max(0, Math.min(95, crit));
}

/**
 * Resolve an attack. Mutates `target.hp` and returns a result
 * record. Caller is responsible for VFX, log lines, corpse drops.
 *
 * @returns {{
 *   hit: boolean, crit: boolean, damage: number, killed: boolean,
 *   chance: number, critChance: number, cover, flanking,
 * }}
 */
export function resolveAttack(attacker, target, isObstacle) {
  const ch = hitChance(attacker, target, isObstacle);
  if (!ch.inRange) {
    return { hit: false, crit: false, damage: 0, killed: false, chance: 0, critChance: 0, cover: ch.cover, flanking: ch.flanking, outOfRange: true };
  }
  const roll = ROT.RNG.getUniform() * 100;
  const hit = roll < ch.percent;
  if (!hit) {
    return { hit: false, crit: false, damage: 0, killed: false, chance: ch.percent, critChance: 0, cover: ch.cover, flanking: ch.flanking };
  }
  const cc = critChance(attacker, target, ch.flanking);
  const critRoll = ROT.RNG.getUniform() * 100;
  const crit = critRoll < cc;
  const [dmgMin, dmgMax] = attacker.weapon?.dmg ?? [1, 3];
  let dmg = dmgMin + ROT.RNG.getUniformInt(0, dmgMax - dmgMin);
  if (crit) dmg = Math.round(dmg * 1.5);
  dmg = Math.max(1, dmg - (target.armor ?? 0));
  target.hp -= dmg;
  const killed = target.hp <= 0;
  return { hit: true, crit, damage: dmg, killed, chance: ch.percent, critChance: cc, cover: ch.cover, flanking: ch.flanking };
}

/**
 * Resolve a heal. Mutates `target.hp` (clamped to maxHp) and returns
 * the amount actually healed (0 if target was full).
 */
export function resolveHeal(caster, target, amount) {
  const before = target.hp;
  target.hp = Math.min(target.maxHp ?? target.hp + amount, target.hp + amount);
  return target.hp - before;
}
