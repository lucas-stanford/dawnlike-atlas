/**
 * tactical/cover.js — Per-axis cover detection + flanking checks.
 *
 * Cover model: for any tile, the "cover provided" against an
 * attacker depends on which cardinal direction the attack comes from.
 * If the tile has an obstacle immediately in that direction, the
 * defender is using the obstacle as cover.
 *
 * - 1 obstacle adjacent to the defender on the side facing the
 *   attacker → HALF cover (25% miss bonus)
 * - 2+ obstacles (e.g. wall corner) on the firing axis → FULL cover
 *   (50% miss bonus)
 * - 0 obstacles → NO cover
 *
 * Flanking: if a defender is in cover but the attacker is positioned
 * on a side WITHOUT an adjacent obstacle, the attacker is flanking
 * (cover doesn't apply + +25% crit chance).
 *
 * `isObstacle(x, y)` is caller-supplied: returns true for any tile
 * that physically blocks (walls, mountains, trees…). Half- vs full-
 * cover is the same callback — granularity comes from the *count* of
 * adjacent obstacles facing the attacker, not from a separate tag.
 */

/**
 * Returns the cover tier ('none' | 'half' | 'full') that `defender`
 * gets vs an attack incoming from `attacker`.
 *
 * @param {{x:number, y:number}} attacker
 * @param {{x:number, y:number}} defender
 * @param {(x:number, y:number) => boolean} isObstacle
 */
export function coverBetween(attacker, defender, isObstacle) {
  // Determine the dominant axis the attack comes from. Half cover
  // counts an obstacle on the SAME axis as the attack; full cover
  // counts obstacles on BOTH the attack axis and the perpendicular
  // (so a defender pressed into a wall corner gets full cover from
  // attacks coming on either axis).
  const dx = Math.sign(defender.x - attacker.x);
  const dy = Math.sign(defender.y - attacker.y);
  // The "facing the attacker" obstacle would be opposite of (dx,dy)
  // — i.e. the obstacle sits between defender and attacker.
  const sides = [];
  if (dx !== 0) sides.push({ ox: -dx, oy: 0 });
  if (dy !== 0) sides.push({ ox: 0, oy: -dy });
  // No sides? Same-tile / overlapping (shouldn't happen) → no cover.
  if (!sides.length) return 'none';
  let count = 0;
  for (const { ox, oy } of sides) {
    if (isObstacle(defender.x + ox, defender.y + oy)) count++;
  }
  if (count >= 2) return 'full';
  if (count === 1) return 'half';
  return 'none';
}

/**
 * The hit-chance penalty (positive number) the cover tier imposes
 * on the attacker. Use as `hitChance -= coverPenalty(...)`.
 */
export function coverPenalty(tier) {
  switch (tier) {
    case 'full': return 50;
    case 'half': return 25;
    default:     return 0;
  }
}

/**
 * True iff `attacker` is FLANKING `defender` — i.e. defender would
 * be in cover from SOME approach but the attacker's specific
 * position has no obstacle in the way. Returns false if defender
 * has no cover from any direction (nothing to flank).
 */
export function isFlanking(attacker, defender, isObstacle) {
  // Defender has SOME potential cover if any of its 4 cardinal
  // neighbours are obstacles.
  const hasAnyCover =
    isObstacle(defender.x - 1, defender.y) ||
    isObstacle(defender.x + 1, defender.y) ||
    isObstacle(defender.x, defender.y - 1) ||
    isObstacle(defender.x, defender.y + 1);
  if (!hasAnyCover) return false;
  // Flanked iff the cover on the firing axis is absent (i.e.
  // coverBetween reports 'none').
  return coverBetween(attacker, defender, isObstacle) === 'none';
}
