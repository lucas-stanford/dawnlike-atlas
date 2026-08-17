/**
 * Tests for the tactical-combat toolkit (`dawnlike-atlas/utils/tactical`).
 *
 * The toolkit is framework-agnostic plain JS, so it is testable without
 * a DOM. RNG-driven paths are pinned with a seeded `ROT.RNG` so the
 * assertions are deterministic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as ROT from 'rot-js';
import {
  DEFAULT_MAX_AP,
  resetAP,
  actionPoints,
  spendAP,
  endUnitTurn,
  refreshSquad,
  allActed,
  reachableTiles,
  previewPath,
  tileDistance,
  chebyshevDistance,
  coverBetween,
  coverPenalty,
  isFlanking,
  visibleSet,
  losBetween,
  visibleEnemies,
  hitChance,
  critChance,
  resolveAttack,
  resolveHeal,
} from '../src/utils/tactical/index.js';

/** A 10×10 arena with a solid wall border; interior open unless listed. */
function makeArena(obstacles = []) {
  const blocked = new Set(obstacles.map(([x, y]) => `${x},${y}`));
  return (x, y) => x <= 0 || y <= 0 || x >= 9 || y >= 9 || blocked.has(`${x},${y}`);
}

describe('action points', () => {
  it('resets to maxAp, defaulting to 2', () => {
    const unit = {};
    resetAP(unit);
    expect(unit).toMatchObject({ ap: DEFAULT_MAX_AP, maxAp: DEFAULT_MAX_AP, ended: false });
  });

  it('honours an explicit maxAp', () => {
    const unit = { maxAp: 3 };
    resetAP(unit);
    expect(unit.ap).toBe(3);
  });

  it('spends AP and refuses to overdraw', () => {
    const unit = { ap: 2, maxAp: 2 };
    expect(spendAP(unit, 1)).toBe(true);
    expect(unit.ap).toBe(1);
    expect(spendAP(unit, 5)).toBe(false);
    expect(unit.ap).toBe(1);
  });

  it('ends the turn when AP hits zero', () => {
    const unit = { ap: 1, maxAp: 2 };
    spendAP(unit, 1);
    expect(unit).toMatchObject({ ap: 0, ended: true });
  });

  it('clamps reported action points at zero', () => {
    expect(actionPoints({ ap: -3 })).toBe(0);
    expect(actionPoints({})).toBe(0);
  });

  it('endUnitTurn burns the remaining AP', () => {
    const unit = { ap: 2, maxAp: 2, ended: false };
    endUnitTurn(unit);
    expect(unit).toMatchObject({ ap: 0, ended: true });
  });

  it('refreshSquad skips the dead', () => {
    const squad = [
      { hp: 10, maxAp: 2, ap: 0, ended: true },
      { hp: 0, maxAp: 2, ap: 0, ended: true },
    ];
    refreshSquad(squad);
    expect(squad[0]).toMatchObject({ ap: 2, ended: false });
    expect(squad[1]).toMatchObject({ ap: 0, ended: true });
  });

  it('allActed ignores the dead', () => {
    expect(allActed([{ hp: 10, ended: true }, { hp: 0, ended: false }])).toBe(true);
    expect(allActed([{ hp: 10, ended: false }])).toBe(false);
    expect(allActed([])).toBe(true);
  });
});

describe('movement', () => {
  const open = makeArena();

  it('includes the start tile at cost 0', () => {
    expect(reachableTiles({ x: 5, y: 5 }, 3, open).get('5,5')).toBe(0);
  });

  it('flood-fills a diamond of the right size in open ground', () => {
    // A cardinal flood-fill of range r covers 2r² + 2r + 1 tiles.
    const reached = reachableTiles({ x: 5, y: 5 }, 2, open);
    expect(reached.size).toBe(13);
    expect(reached.get('7,5')).toBe(2);
    expect(reached.has('8,5')).toBe(false);
  });

  it('does not leak through blocked tiles', () => {
    // Wall off column 4 so the left half is unreachable from (5,5).
    const walled = makeArena([[4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [4, 7], [4, 8]]);
    const reached = reachableTiles({ x: 5, y: 5 }, 6, walled);
    expect([...reached.keys()].some((k) => Number(k.split(',')[0]) < 4)).toBe(false);
  });

  it('never enters the arena border', () => {
    const reached = reachableTiles({ x: 1, y: 1 }, 5, open);
    expect(reached.has('0,1')).toBe(false);
    expect(reached.has('1,0')).toBe(false);
  });

  it('previews a cardinal path that starts at start and ends at dest', () => {
    const path = previewPath({ x: 2, y: 2 }, { x: 5, y: 4 }, open);
    expect(path[0]).toEqual({ x: 2, y: 2 });
    expect(path[path.length - 1]).toEqual({ x: 5, y: 4 });
    // Every step moves exactly one tile cardinally.
    for (let i = 1; i < path.length; i++) {
      expect(tileDistance(path[i - 1], path[i])).toBe(1);
    }
  });

  it('returns null when the destination is walled off', () => {
    const walled = makeArena([[4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [4, 7], [4, 8]]);
    expect(previewPath({ x: 5, y: 5 }, { x: 2, y: 5 }, walled)).toBeNull();
  });

  it('measures Manhattan and Chebyshev distance', () => {
    expect(tileDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7);
    expect(chebyshevDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(4);
  });
});

describe('cover', () => {
  // Defender at (5,5) with a wall to its west.
  const wallWest = (x, y) => x === 4 && y === 5;

  it('reports no cover in the open', () => {
    expect(coverBetween({ x: 1, y: 5 }, { x: 5, y: 5 }, () => false)).toBe('none');
  });

  it('reports half cover when one obstacle faces the attacker', () => {
    expect(coverBetween({ x: 1, y: 5 }, { x: 5, y: 5 }, wallWest)).toBe('half');
  });

  it('reports no cover when the attacker comes from the open side', () => {
    expect(coverBetween({ x: 8, y: 5 }, { x: 5, y: 5 }, wallWest)).toBe('none');
  });

  it('reports full cover in a corner', () => {
    const corner = (x, y) => (x === 4 && y === 5) || (x === 5 && y === 4);
    expect(coverBetween({ x: 1, y: 1 }, { x: 5, y: 5 }, corner)).toBe('full');
  });

  it('scores the penalty by tier', () => {
    expect(coverPenalty('full')).toBe(50);
    expect(coverPenalty('half')).toBe(25);
    expect(coverPenalty('none')).toBe(0);
  });

  it('flanks a defender approached from its open side', () => {
    expect(isFlanking({ x: 8, y: 5 }, { x: 5, y: 5 }, wallWest)).toBe(true);
    expect(isFlanking({ x: 1, y: 5 }, { x: 5, y: 5 }, wallWest)).toBe(false);
  });

  it('is not flanking when there is no cover to flank', () => {
    expect(isFlanking({ x: 8, y: 5 }, { x: 5, y: 5 }, () => false)).toBe(false);
  });
});

describe('line of sight', () => {
  const open = () => false;

  it('sees itself and its neighbours in the open', () => {
    const seen = visibleSet({ x: 5, y: 5 }, 3, open);
    expect(seen.has('5,5')).toBe(true);
    expect(seen.has('5,8')).toBe(true);
  });

  it('does not see past its range', () => {
    expect(losBetween({ x: 5, y: 5 }, { x: 5, y: 20 }, 3, open)).toBe(false);
  });

  it('is blocked by a wall between the two tiles', () => {
    const wall = (x) => x === 6;
    expect(losBetween({ x: 5, y: 5 }, { x: 8, y: 5 }, 10, wall)).toBe(false);
    expect(losBetween({ x: 5, y: 5 }, { x: 8, y: 5 }, 10, open)).toBe(true);
  });

  it('filters enemies to the visible, living ones', () => {
    const enemies = [
      { x: 6, y: 5, hp: 10 },   // visible
      { x: 5, y: 6, hp: 0 },    // dead
      { x: 5, y: 30, hp: 10 },  // out of range
    ];
    const seen = visibleEnemies({ x: 5, y: 5 }, enemies, 4, open);
    expect(seen).toEqual([enemies[0]]);
  });
});

describe('combat math', () => {
  const open = () => false;
  const shooter = { x: 1, y: 5, aim: 75, weapon: { dmg: [4, 6], range: 10, optimalRange: 5, kind: 'ranged' } };
  const target = () => ({ x: 5, y: 5, hp: 10, maxHp: 10, defense: 0, armor: 0 });

  it('starts from aim in the open at optimal range', () => {
    expect(hitChance(shooter, target(), open).percent).toBe(75);
  });

  it('subtracts the defender\'s defense', () => {
    expect(hitChance(shooter, { ...target(), defense: 20 }, open).percent).toBe(55);
  });

  it('subtracts a cover penalty', () => {
    const wall = (x, y) => x === 4 && y === 5;
    const ch = hitChance(shooter, target(), wall);
    expect(ch.cover).toBe('half');
    expect(ch.percent).toBe(50);
  });

  it('ignores cover when flanking', () => {
    // Wall north of the defender; the shot comes from due west, so the
    // defender has cover available but not on this axis.
    const wall = (x, y) => x === 5 && y === 4;
    const ch = hitChance(shooter, target(), wall);
    expect(ch.flanking).toBe(true);
    expect(ch.percent).toBe(75);
  });

  it('applies a distance penalty past optimal range', () => {
    const far = { ...target(), x: 9 };
    // 8 tiles away, optimal 5 → 3 tiles × 5% = 15% penalty.
    expect(hitChance(shooter, far, open).percent).toBe(60);
  });

  it('clamps the displayed chance to 5..95', () => {
    expect(hitChance({ ...shooter, aim: 400 }, target(), open).percent).toBe(95);
    expect(hitChance({ ...shooter, aim: -400 }, target(), open).percent).toBe(5);
  });

  it('reports zero chance and inRange=false beyond weapon range', () => {
    const ch = hitChance({ ...shooter, weapon: { ...shooter.weapon, range: 2 } }, target(), open);
    expect(ch.inRange).toBe(false);
    expect(ch.percent).toBe(0);
  });

  it('adds a flanking bonus to crit', () => {
    expect(critChance({ }, {}, true) - critChance({}, {}, false)).toBe(25);
  });

  it('honours a per-unit crit bonus and clamps at 95', () => {
    expect(critChance({ critBonus: 15 }, {}, false)).toBe(25);
    expect(critChance({ critBonus: 500 }, {}, true)).toBe(95);
  });
});

describe('attack resolution', () => {
  const open = () => false;
  const shooter = { x: 1, y: 5, aim: 95, weapon: { dmg: [4, 6], range: 10, optimalRange: 10 } };

  beforeEach(() => ROT.RNG.setSeed(1234));

  it('refuses an out-of-range attack without touching the target', () => {
    const target = { x: 5, y: 5, hp: 10, maxHp: 10 };
    const res = resolveAttack({ ...shooter, weapon: { ...shooter.weapon, range: 1 } }, target, open);
    expect(res).toMatchObject({ hit: false, damage: 0, outOfRange: true });
    expect(target.hp).toBe(10);
  });

  it('deals damage inside the weapon\'s range band on a hit', () => {
    const target = { x: 5, y: 5, hp: 100, maxHp: 100 };
    const res = resolveAttack(shooter, target, open);
    if (res.hit) {
      // 4..6 base, ×1.5 on a crit → never above 9, never below 1.
      expect(res.damage).toBeGreaterThanOrEqual(1);
      expect(res.damage).toBeLessThanOrEqual(9);
      expect(target.hp).toBe(100 - res.damage);
    } else {
      expect(target.hp).toBe(100);
    }
  });

  it('is deterministic for a given seed', () => {
    const runOnce = () => {
      ROT.RNG.setSeed(42);
      const target = { x: 5, y: 5, hp: 100, maxHp: 100 };
      return [0, 1, 2].map(() => resolveAttack(shooter, target, open).damage);
    };
    expect(runOnce()).toEqual(runOnce());
  });

  it('always deals at least 1 damage through armor', () => {
    const target = { x: 5, y: 5, hp: 100, maxHp: 100, armor: 99 };
    for (let i = 0; i < 20; i++) {
      const res = resolveAttack(shooter, target, open);
      if (res.hit) expect(res.damage).toBe(1);
    }
  });

  it('flags a kill when hp drops to zero', () => {
    const target = { x: 5, y: 5, hp: 1, maxHp: 10 };
    let res;
    for (let i = 0; i < 50 && !(res?.hit); i++) res = resolveAttack(shooter, target, open);
    expect(res.hit).toBe(true);
    expect(res.killed).toBe(true);
  });
});

describe('healing', () => {
  it('heals up to maxHp and reports the amount applied', () => {
    const target = { hp: 4, maxHp: 10 };
    expect(resolveHeal({}, target, 3)).toBe(3);
    expect(target.hp).toBe(7);
  });

  it('clamps at maxHp', () => {
    const target = { hp: 9, maxHp: 10 };
    expect(resolveHeal({}, target, 100)).toBe(1);
    expect(target.hp).toBe(10);
  });

  it('reports zero on a full-health target', () => {
    const target = { hp: 10, maxHp: 10 };
    expect(resolveHeal({}, target, 5)).toBe(0);
  });
});
