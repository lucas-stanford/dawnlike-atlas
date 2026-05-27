/**
 * TacticalCombatExample — XCOM-style tactical combat demo.
 *
 * Built on the same noisy-perimeter terrain generator as the Arena
 * stories (and the matching obstacle/floor/trail autotile resolvers)
 * but the gameplay layer is fundamentally different: instead of one
 * keyboard-driven hero bumping in real-time, the player commands a
 * fixed four-class squad, every action costs from a per-unit pool of
 * action points, and everything (movement preview, hit-chance, cover,
 * fog of war, overwatch reaction shots) is visible before commit.
 *
 * Squad: Knight (sword, push), Wizard (3x3 fireball), Rogue
 * (crossbow + flank crit), Cleric (heal adjacent ally).
 *
 * Map: pick a procedural theme (forest / desert / volcanic / swamp /
 * ruined / chaos) for terrain variety, OR pick one of the hand-
 * designed signature missions ("The Bridge", "The Vault") for a
 * scripted scenario.
 *
 * Implementation:
 *   - Terrain pipeline reused from ArenaCombatExample (inlined here
 *     so the Arena story stays untouched; ~80 LOC of duplication is
 *     OK).
 *   - All combat math lives in src/utils/tactical/ (ap, move, cover,
 *     los, combat, ai) so consumers can `import` the systems.
 *   - Rendering is plain React (one absolutely-positioned div per
 *     tile + sprite layer + actor layer + UI overlays).
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as ROT from 'rot-js';
import { resolveAssetPath } from './utils/paths';
import {
  resolveDawnLikeFloorName,
  resolveDawnLikeForestName,
  resolveDawnLikeMountainName,
  resolveDawnLikeDungeonWallName,
} from './utils/autotile';
import {
  resetAP, actionPoints, spendAP, endUnitTurn, refreshSquad, allActed,
  reachableTiles, previewPath, tileDistance,
  squadVisibleSet, visibleSet, visibleEnemies, losBetween,
  coverBetween, coverPenalty, isFlanking,
  hitChance, resolveAttack, resolveHeal,
  planTurn,
} from './utils/tactical/index.js';
import './Autotile.css';
import theBridge from './utils/tactical/missions/the-bridge.json';
import theVault from './utils/tactical/missions/the-vault.json';

const TILE_SIZE = 32;

const OBSTACLE_KIND_INFO = {
  tree:     { autotile: 'forest' },
  mountain: { autotile: 'mountain' },
  wall:     { autotile: 'wall' },
  sprite:   { autotile: 'none' },
};

const CLASSES = {
  knight: {
    name: 'Knight', sprite: 'knight',
    maxHp: 16, armor: 3, defense: 10, aim: 70, maxAp: 2,
    moveRange: 5,
    weapon: { dmg: [3, 6], range: 1, optimalRange: 1, kind: 'melee' },
    ability: { kind: 'bash', name: 'Shield bash', uses: Infinity, apCost: 1, range: 1 },
  },
  wizard: {
    name: 'Wizard', sprite: 'wizard',
    maxHp: 8, armor: 0, defense: 0, aim: 65, maxAp: 2,
    moveRange: 4,
    weapon: { dmg: [2, 4], range: 6, optimalRange: 6, kind: 'ranged' },
    ability: { kind: 'fireball', name: 'Fireball', uses: 3, apCost: 2, range: 8, dmg: [4, 7] },
  },
  rogue: {
    name: 'Rogue', sprite: 'rogue s',
    maxHp: 11, armor: 1, defense: 5, aim: 70, maxAp: 2,
    moveRange: 6,
    weapon: { dmg: [2, 5], range: 7, optimalRange: 5, kind: 'ranged' },
    ability: { kind: 'dagger', name: 'Dagger thrust', uses: Infinity, apCost: 1, range: 1, dmg: [3, 5] },
  },
  cleric: {
    name: 'Cleric', sprite: 'priest',
    maxHp: 12, armor: 1, defense: 5, aim: 60, maxAp: 2,
    moveRange: 5,
    weapon: { dmg: [2, 3], range: 4, optimalRange: 3, kind: 'ranged' },
    ability: { kind: 'heal', name: 'Heal', uses: 4, apCost: 1, range: 1, healAmount: 6 },
  },
};
const SQUAD_ORDER = ['knight', 'wizard', 'rogue', 'cleric'];

const SIGNATURE_MISSIONS = {
  'the-bridge': theBridge,
  'the-vault':  theVault,
};

const PROCEDURAL_THEMES = {
  'procedural-forest': {
    groundStyle: 'day grass floor', obstacleKind: 'tree', obstacleStyle: 'light oak',
    hazardSprite: null, hazardDensity: 0, ringNoiseScale: 4, ringThickness: 3,
    trailStyle: 'day stone floor',
    monsterPack: ['goblin', 'kobold', 'imp'],
  },
  'procedural-desert': {
    groundStyle: 'day dirt floor', obstacleKind: 'mountain', obstacleStyle: 'brown peak',
    hazardSprite: null, hazardDensity: 0, ringNoiseScale: 5, ringThickness: 3,
    trailStyle: 'day stone floor',
    monsterPack: ['kobold', 'kobold barbarian', 'imp'],
  },
  'procedural-volcanic': {
    groundStyle: 'dusk dirt floor', obstacleKind: 'mountain', obstacleStyle: 'red volcano',
    hazardSprite: 'lava puddle', hazardDensity: 0.05, ringNoiseScale: 5, ringThickness: 3,
    trailStyle: 'dusk stone floor',
    monsterPack: ['fire elemental', 'lava demon', 'fire skeleton'],
  },
  'procedural-swamp': {
    groundStyle: 'night dirt floor', obstacleKind: 'tree', obstacleStyle: 'dark mangrove',
    hazardSprite: 'green puddle', hazardDensity: 0.06, ringNoiseScale: 5, ringThickness: 3,
    trailStyle: 'night stone floor',
    monsterPack: ['human zombie', 'hell hound', 'kobold zombie'],
  },
  'procedural-ruined': {
    groundStyle: 'dusk tile floor', obstacleKind: 'wall', obstacleStyle: 'bright brick wall',
    hazardSprite: null, hazardDensity: 0, ringNoiseScale: 3, ringThickness: 2,
    trailStyle: 'dusk brick floor',
    monsterPack: ['human zombie', 'skeleton', 'ghost'],
  },
  'procedural-chaos': {
    groundStyle: 'night dirt floor', obstacleKind: 'tree', obstacleStyle: 'burning oak',
    hazardSprite: 'lava puddle', hazardDensity: 0.06, ringNoiseScale: 4, ringThickness: 3,
    trailStyle: 'night stone floor',
    monsterPack: ['lava demon', 'fire skeleton', 'imp'],
  },
};

const DIFFICULTY = {
  easy:   { enemyCount: 4, enemyAimMod: -10 },
  normal: { enemyCount: 6, enemyAimMod: 0 },
  hard:   { enemyCount: 8, enemyAimMod: +10 },
};

const MONSTER_STATS = {
  goblin:           { hp: 6,  atk: 3, def: 0, armor: 0, aim: 55, weapon: { dmg: [2,4], range: 1, optimalRange: 1, kind: 'melee' }, corpse: 'corpse' },
  kobold:           { hp: 5,  atk: 3, def: 0, armor: 0, aim: 50, weapon: { dmg: [2,3], range: 1, optimalRange: 1, kind: 'melee' }, corpse: 'corpse' },
  'kobold barbarian':{hp: 8,  atk: 4, def: 5, armor: 1, aim: 55, weapon: { dmg: [3,5], range: 1, optimalRange: 1, kind: 'melee' }, corpse: 'corpse' },
  'kobold zombie':  { hp: 7,  atk: 3, def: 0, armor: 0, aim: 45, weapon: { dmg: [2,3], range: 1, optimalRange: 1, kind: 'melee' }, corpse: 'bones' },
  imp:              { hp: 7,  atk: 4, def: 5, armor: 0, aim: 60, weapon: { dmg: [2,4], range: 4, optimalRange: 3, kind: 'ranged' }, corpse: 'corpse' },
  'lava demon':     { hp: 14, atk: 5, def: 10, armor: 2, aim: 60, weapon: { dmg: [4,6], range: 1, optimalRange: 1, kind: 'melee' }, corpse: 'spoiled corpse' },
  'fire elemental': { hp: 10, atk: 5, def: 0, armor: 1, aim: 65, weapon: { dmg: [3,5], range: 5, optimalRange: 5, kind: 'ranged' }, corpse: 'spoiled corpse' },
  'fire skeleton':  { hp: 8,  atk: 4, def: 5, armor: 1, aim: 60, weapon: { dmg: [2,4], range: 5, optimalRange: 5, kind: 'ranged' }, corpse: 'bones' },
  'human zombie':   { hp: 10, atk: 3, def: 0, armor: 0, aim: 40, weapon: { dmg: [2,4], range: 1, optimalRange: 1, kind: 'melee' }, corpse: 'spoiled corpse' },
  skeleton:         { hp: 6,  atk: 4, def: 5, armor: 1, aim: 60, weapon: { dmg: [2,4], range: 5, optimalRange: 5, kind: 'ranged' }, corpse: 'bones' },
  ghost:            { hp: 5,  atk: 5, def: 20, armor: 0, aim: 70, weapon: { dmg: [3,4], range: 1, optimalRange: 1, kind: 'melee' }, corpse: 'old bones' },
  'hell hound':     { hp: 9,  atk: 4, def: 5, armor: 1, aim: 60, weapon: { dmg: [3,5], range: 1, optimalRange: 1, kind: 'melee' }, corpse: 'corpse' },
};

export default function TacticalCombatExample({
  mission = 'procedural-forest',
  difficulty = 'normal',
  seed: seedProp,
  squadSeed: squadSeedProp,
  width = 32,
  height = 24,
  fovRadius = 8,
  showHitPreview = true,
} = {}) {
  const [atlas, setAtlas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState(null);
  const [tick, setTick] = useState(0);
  const seedRef = useRef(seedProp ?? Math.floor(Math.random() * 1_000_000));
  const squadSeedRef = useRef(squadSeedProp ?? (seedRef.current + 1));
  const vfxRef = useRef([]);
  const [hoverTile, setHoverTile] = useState(null);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [mode, setMode] = useState('idle'); // 'idle' | 'move' | 'attack' | 'cast' | 'heal' | 'overwatch'

  // Atlas load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(resolveAssetPath('/DawnlikeAtlas.json'));
      const json = await res.json();
      if (!cancelled) { setAtlas(json); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Build the level on prop change.
  const buildLevel = useCallback(() => {
    if (!atlas) return;
    const isSignature = !!SIGNATURE_MISSIONS[mission];
    if (isSignature) {
      buildSignature(SIGNATURE_MISSIONS[mission]);
    } else {
      buildProcedural(mission);
    }
    function buildProcedural(themeKey) {
      const theme = PROCEDURAL_THEMES[themeKey] || PROCEDURAL_THEMES['procedural-forest'];
      ROT.RNG.setSeed(seedRef.current);
      const simplex = new ROT.Noise.Simplex();
      const W = width, H = height;
      const tiles = {};
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          tiles[`${x},${y}`] = { obstacle: false, decor: null, trail: false, hazard: false, corpse: null };
        }
      }
      // Noisy ring (copied from ArenaCombatExample).
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const ed = Math.min(x, y, W - 1 - x, H - 1 - y);
          if (ed > theme.ringThickness) continue;
          if (ed === 0) { tiles[`${x},${y}`].obstacle = true; continue; }
          const n = simplex.get(x / theme.ringNoiseScale, y / theme.ringNoiseScale);
          const bias = 1 - ed / (theme.ringThickness + 1);
          if (n + bias > 0) tiles[`${x},${y}`].obstacle = true;
        }
      }
      // West-edge entry strip — widen to a 4-row beachhead so the
      // squad has elbow room around their spawn.
      const midY = Math.floor(H / 2);
      const trailLen = theme.ringThickness + 4;
      for (let dy = -1; dy <= 2; dy++) {
        const ty = midY + dy;
        if (ty < 0 || ty >= H) continue;
        for (let i = 0; i < trailLen; i++) {
          const t = tiles[`${i},${ty}`];
          if (t) {
            t.obstacle = false;
            // Only the centre row is paved as trail; the rest is just
            // grass so the squad doesn't look like it's spawned on
            // a road.
            if (dy === 0) t.trail = true;
          }
        }
      }
      // Interior cover.
      const interior = [];
      for (let y = 2; y < H - 2; y++) {
        for (let x = 2; x < W - 2; x++) {
          if (!tiles[`${x},${y}`].obstacle && !tiles[`${x},${y}`].trail) interior.push({ x, y });
        }
      }
      const coverN = Math.max(8, Math.floor(interior.length * 0.06));
      for (let i = 0; i < coverN && interior.length; i++) {
        const idx = ROT.RNG.getUniformInt(0, interior.length - 1);
        const cell = interior.splice(idx, 1)[0];
        tiles[`${cell.x},${cell.y}`].obstacle = true;
      }
      // Hazards.
      if (theme.hazardSprite && atlas.byName[theme.hazardSprite]) {
        for (let y = 1; y < H - 1; y++) {
          for (let x = 1; x < W - 1; x++) {
            const t = tiles[`${x},${y}`];
            if (t.obstacle || t.trail) continue;
            if (ROT.RNG.getUniform() < theme.hazardDensity) t.hazard = true;
          }
        }
      }
      spawnUnits(tiles, W, H, theme, midY, theme.monsterPack);
      function spawnUnits(tiles, W, H, theme, midY, pack) {
        // Place squad on the beachhead in a 2x2 cluster around the
        // trail row so they all have movement room.
        const slots = [
          { x: 1, y: midY - 1 },
          { x: 2, y: midY - 1 },
          { x: 1, y: midY + 1 },
          { x: 2, y: midY + 1 },
        ];
        const squad = SQUAD_ORDER.map((cls, i) => {
          const c = CLASSES[cls];
          const slot = slots[i] || slots[0];
          return makeUnit(cls, c, slot, i);
        });
        // Make sure squad spawn tiles are walkable.
        for (const u of squad) {
          const t = tiles[`${u.x},${u.y}`];
          if (t) { t.obstacle = false; }
        }
        // Enemy spawns: random walkable tiles in eastern 2/3.
        ROT.RNG.setSeed(squadSeedRef.current);
        const diff = DIFFICULTY[difficulty] || DIFFICULTY.normal;
        const spawnCandidates = [];
        for (let y = 2; y < H - 2; y++) {
          for (let x = Math.floor(W / 3); x < W - 2; x++) {
            const t = tiles[`${x},${y}`];
            if (!t || t.obstacle || t.trail) continue;
            spawnCandidates.push({ x, y });
          }
        }
        const enemies = [];
        let id = 100;
        while (enemies.length < diff.enemyCount && spawnCandidates.length) {
          const idx = ROT.RNG.getUniformInt(0, spawnCandidates.length - 1);
          const cell = spawnCandidates.splice(idx, 1)[0];
          const sprite = pack[ROT.RNG.getUniformInt(0, pack.length - 1)];
          enemies.push(makeMonster(sprite, cell, ++id, diff.enemyAimMod));
        }
        finishBuild(tiles, W, H, squad, enemies, theme, /*objective*/ null);
      }
    }
    function buildSignature(missionData) {
      const { width: W, height: H, theme, grid, squadStarts, enemySpawns, objective, decorations } = missionData;
      const themeCfg = PROCEDURAL_THEMES[`procedural-${theme}`] || PROCEDURAL_THEMES['procedural-forest'];
      const tiles = {};
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          tiles[`${x},${y}`] = { obstacle: false, decor: null, trail: false, hazard: false, corpse: null };
        }
      }
      // Parse the grid: '#' = obstacle, '=' = trail, 'B' = bridge tile, '~' = hazard, '.' = open, 'C' = chest.
      for (let y = 0; y < H; y++) {
        const row = grid[y] || '';
        for (let x = 0; x < W; x++) {
          const ch = row[x] || '.';
          const t = tiles[`${x},${y}`];
          if (ch === '#') t.obstacle = true;
          else if (ch === '=') t.trail = true;
          else if (ch === 'B') t.bridge = true;
          else if (ch === '~') t.hazard = true;
          else if (ch === 'C') t.chest = true;
        }
      }
      // Squad spawn.
      const squad = SQUAD_ORDER.map((cls, i) => {
        const c = CLASSES[cls];
        const pos = squadStarts[i] || squadStarts[0];
        return makeUnit(cls, c, { x: pos.x, y: pos.y }, i);
      });
      // Enemies.
      ROT.RNG.setSeed(squadSeedRef.current);
      const diff = DIFFICULTY[difficulty] || DIFFICULTY.normal;
      const enemies = [];
      let id = 100;
      for (const s of enemySpawns) {
        enemies.push(makeMonster(s.sprite, { x: s.x, y: s.y }, ++id, diff.enemyAimMod));
      }
      // Decor overlays (just for flavour).
      if (decorations) {
        for (const d of decorations) {
          const t = tiles[`${d.x},${d.y}`];
          if (t && atlas.byName[d.sprite]) t.decor = d.sprite;
        }
      }
      finishBuild(tiles, W, H, squad, enemies, themeCfg, objective);
    }
    function makeUnit(classKey, cfg, pos, slot) {
      const u = {
        id: slot + 1,
        classKey,
        sprite: cfg.sprite,
        name: cfg.name,
        x: pos.x, y: pos.y,
        hp: cfg.maxHp, maxHp: cfg.maxHp,
        ap: cfg.maxAp, maxAp: cfg.maxAp,
        aim: cfg.aim, defense: cfg.defense, armor: cfg.armor,
        moveRange: cfg.moveRange,
        weapon: cfg.weapon,
        ability: { ...cfg.ability },
        abilityUsesLeft: cfg.ability.uses,
        ended: false,
        overwatching: false,
        side: 'player',
      };
      resetAP(u);
      return u;
    }
    function makeMonster(sprite, pos, id, aimMod) {
      const stats = MONSTER_STATS[sprite] || MONSTER_STATS.goblin;
      const u = {
        id,
        sprite,
        name: sprite,
        x: pos.x, y: pos.y,
        hp: stats.hp, maxHp: stats.hp,
        ap: 2, maxAp: 2,
        aim: stats.aim + (aimMod || 0),
        defense: stats.def, armor: stats.armor,
        moveRange: 4,
        weapon: stats.weapon,
        corpse: stats.corpse,
        ended: false,
        aware: false,
        side: 'enemy',
      };
      return u;
    }
    function finishBuild(tiles, W, H, squad, enemies, theme, objective) {
      // Initial FOV is the squad's combined visibility.
      const isBlocking = (x, y) => {
        if (x < 0 || y < 0 || x >= W || y >= H) return true;
        return !!tiles[`${x},${y}`]?.obstacle;
      };
      const fov = squadVisibleSet(squad, fovRadius, isBlocking);
      const explored = new Set(fov);
      setState({
        tiles, W, H, theme, squad, enemies, objective,
        turn: 'player', turnNumber: 1,
        fov, explored,
        log: [`Mission begins. ${objective || 'Defeat all enemies.'}`],
        victory: false, defeat: false,
      });
      setSelectedUnitId(squad[0].id);
      setMode('idle');
    }
  }, [atlas, mission, difficulty, width, height, fovRadius]);

  useEffect(() => { buildLevel(); }, [buildLevel]);

  // Derived helpers.
  const isObstacle = useCallback((x, y) => {
    if (!state) return false;
    if (x < 0 || y < 0 || x >= state.W || y >= state.H) return true;
    return !!state.tiles[`${x},${y}`]?.obstacle;
  }, [state]);
  const isBlockingForUnit = useCallback((x, y) => {
    if (!state) return true;
    if (x < 0 || y < 0 || x >= state.W || y >= state.H) return true;
    if (state.tiles[`${x},${y}`]?.obstacle) return true;
    // Other actors (alive) block movement.
    const occ = [...state.squad, ...state.enemies].some(u => u.hp > 0 && u.x === x && u.y === y);
    if (occ) return true;
    return false;
  }, [state]);

  const selectedUnit = state?.squad.find(u => u.id === selectedUnitId) || null;

  // Compute movement preview when in 'move' mode + a tile is hovered.
  const moveReachable = useMemo(() => {
    if (!state || !selectedUnit || mode !== 'move') return null;
    return reachableTiles(selectedUnit, selectedUnit.moveRange, isBlockingForUnit);
  }, [state, selectedUnit, mode, isBlockingForUnit]);

  // Pick the next un-ended unit, if any.
  const pickNextUnit = useCallback(() => {
    if (!state) return null;
    return state.squad.find(u => u.hp > 0 && !u.ended) || null;
  }, [state]);

  // Auto-advance: if the currently-selected unit ended, jump to the next.
  useEffect(() => {
    if (!state || state.turn !== 'player') return;
    if (!selectedUnit || selectedUnit.ended) {
      const next = pickNextUnit();
      if (next) setSelectedUnitId(next.id);
    }
  }, [state, selectedUnit, pickNextUnit]);

  // ===== Player actions =====
  const moveTo = (dest) => {
    if (!selectedUnit || mode !== 'move') return;
    if (actionPoints(selectedUnit) < 1) return;
    const reach = reachableTiles(selectedUnit, selectedUnit.moveRange, isBlockingForUnit);
    if (!reach.has(`${dest.x},${dest.y}`)) return;
    selectedUnit.x = dest.x;
    selectedUnit.y = dest.y;
    spendAP(selectedUnit, 1);
    setState({ ...state, ...refreshFov() });
    setMode('idle');
    pushLog(`${selectedUnit.name} moves to (${dest.x}, ${dest.y}).`);
  };

  const attackTarget = (target, abilityMode = false) => {
    if (!selectedUnit) return;
    const ability = abilityMode ? selectedUnit.ability : null;
    const apCost = ability ? ability.apCost : 1;
    if (actionPoints(selectedUnit) < apCost) return;
    const dist = tileDistance(selectedUnit, target);
    const maxRange = ability ? (ability.range ?? selectedUnit.weapon.range) : selectedUnit.weapon.range;
    if (dist > maxRange) return;
    if (!ability || ability.kind !== 'bash') {
      // LOS required for ranged + spells, but not for melee bash.
      if (selectedUnit.weapon.kind !== 'melee' &&
          !losBetween(selectedUnit, target, fovRadius * 2, (x, y) => isObstacle(x, y))) {
        return;
      }
    }
    // Fireball (3x3 AOE)
    if (ability && ability.kind === 'fireball') {
      if (selectedUnit.abilityUsesLeft <= 0) { pushLog('No fireballs left.'); return; }
      const center = target;
      const damaged = [];
      const fireDmgRange = ability.dmg || [4, 7];
      const attacker = { ...selectedUnit, weapon: { ...selectedUnit.weapon, dmg: fireDmgRange } };
      spawnAOE(center);
      for (const e of [...state.enemies, ...state.squad]) {
        if (e.hp <= 0) continue;
        if (Math.max(Math.abs(e.x - center.x), Math.abs(e.y - center.y)) > 1) continue;
        const r = resolveAttack(attacker, e, isObstacle);
        if (r.hit) damaged.push({ e, r });
      }
      selectedUnit.abilityUsesLeft -= 1;
      damaged.forEach(({ e, r }) => {
        pushLog(`Fireball hits ${e.name} for ${r.damage}${r.crit ? ' (CRIT!)' : ''}.`);
        if (r.killed) { e.hp = 0; state.tiles[`${e.x},${e.y}`].corpse = e.corpse; pushLog(`${e.name} dies.`); }
      });
      spendAP(selectedUnit, ability.apCost);
      endUnitTurn(selectedUnit);
      setState({ ...state, ...refreshFov() });
      checkVictoryDefeat();
      setMode('idle');
      return;
    }
    // Heal (cleric)
    if (ability && ability.kind === 'heal') {
      if (selectedUnit.abilityUsesLeft <= 0) { pushLog('Cleric is out of heals.'); return; }
      const ally = state.squad.find(u => u.hp > 0 && u.x === target.x && u.y === target.y && u.id !== selectedUnit.id);
      if (!ally) return;
      const healed = resolveHeal(selectedUnit, ally, ability.healAmount);
      selectedUnit.abilityUsesLeft -= 1;
      pushLog(`Cleric heals ${ally.name} for ${healed}.`);
      spawnVfx('aligned priest', ally.x, ally.y, 400);
      spendAP(selectedUnit, ability.apCost);
      setState({ ...state });
      setMode('idle');
      return;
    }
    // Normal attack or bash or dagger
    const wpn = ability && ability.dmg ? { ...selectedUnit.weapon, dmg: ability.dmg, range: ability.range, optimalRange: ability.range, kind: 'melee' } : selectedUnit.weapon;
    const r = resolveAttack({ ...selectedUnit, weapon: wpn }, target, isObstacle);
    if (r.hit) {
      pushLog(`${selectedUnit.name} hits ${target.name} for ${r.damage}${r.crit ? ' (CRIT!)' : ''}.`);
      spawnVfx(wpn.kind === 'ranged' ? 'arrow' : 'red liquid spatter', target.x, target.y, 220);
      if (ability && ability.kind === 'bash') {
        // Push target back one tile if free.
        const dx = Math.sign(target.x - selectedUnit.x);
        const dy = Math.sign(target.y - selectedUnit.y);
        const nx = target.x + dx, ny = target.y + dy;
        if (!isBlockingForUnit(nx, ny)) {
          target.x = nx; target.y = ny;
          pushLog(`${target.name} is shoved back.`);
        }
      }
      if (r.killed) { target.hp = 0; state.tiles[`${target.x},${target.y}`].corpse = target.corpse; pushLog(`${target.name} dies.`); }
    } else {
      pushLog(`${selectedUnit.name} misses ${target.name}.`);
      spawnVfx('fire burst c', target.x, target.y, 100); // tiny puff for misses
    }
    spendAP(selectedUnit, apCost);
    endUnitTurn(selectedUnit);
    setState({ ...state, ...refreshFov() });
    checkVictoryDefeat();
    setMode('idle');
  };

  const setOverwatch = () => {
    if (!selectedUnit) return;
    if (actionPoints(selectedUnit) < 1) return;
    selectedUnit.overwatching = true;
    endUnitTurn(selectedUnit);
    pushLog(`${selectedUnit.name} goes on overwatch.`);
    setState({ ...state });
    setMode('idle');
  };

  const endTurn = () => {
    if (!state || state.turn !== 'player') return;
    runEnemyTurn();
  };

  // Mid-action helpers.
  function refreshFov() {
    if (!state) return {};
    const isBlocking = (x, y) => {
      if (x < 0 || y < 0 || x >= state.W || y >= state.H) return true;
      return !!state.tiles[`${x},${y}`]?.obstacle;
    };
    const fov = squadVisibleSet(state.squad, fovRadius, isBlocking);
    const explored = new Set(state.explored);
    for (const k of fov) explored.add(k);
    return { fov, explored };
  }
  function pushLog(line) {
    state.log = [...state.log.slice(-9), line];
  }
  function spawnVfx(name, x, y, ms = 300) {
    if (!atlas?.byName[name]) return;
    const id = Math.random();
    vfxRef.current = [...vfxRef.current, { id, name, x, y }];
    setTimeout(() => {
      vfxRef.current = vfxRef.current.filter(v => v.id !== id);
      setTick(t => t + 1);
    }, ms);
    setTick(t => t + 1);
  }
  function spawnAOE(center) {
    const offsets = [
      ['c', 0, 0], ['n', 0, -1], ['s', 0, 1], ['e', 1, 0], ['w', -1, 0],
      ['ne', 1, -1], ['nw', -1, -1], ['se', 1, 1], ['sw', -1, 1],
    ];
    for (const [suf, ox, oy] of offsets) {
      spawnVfx(`fire burst ${suf}`, center.x + ox, center.y + oy, 420);
    }
  }
  function checkVictoryDefeat() {
    if (state.victory || state.defeat) return;
    const aliveEnemies = state.enemies.filter(e => e.hp > 0).length;
    const aliveSquad = state.squad.filter(u => u.hp > 0).length;
    if (aliveSquad === 0) {
      state.defeat = true;
      pushLog(`The squad has fallen on turn ${state.turnNumber}.`);
    } else if (aliveEnemies === 0) {
      state.victory = true;
      pushLog(`Mission complete on turn ${state.turnNumber}.`);
    }
  }

  // ===== Enemy turn =====
  async function runEnemyTurn() {
    if (!state) return;
    const isBlocking = (x, y) => isObstacle(x, y);
    const mapCtx = {
      isBlocking,
      isObstacle,
      isBlockingForUnit: (x, y) => isBlockingForUnit(x, y),
      fovRange: fovRadius,
      enemies: state.enemies,
    };
    state.turn = 'enemy';
    setState({ ...state });
    for (const enemy of state.enemies) {
      if (state.victory || state.defeat) break;
      if (enemy.hp <= 0) continue;
      const actions = planTurn(enemy, state.squad, mapCtx);
      for (const action of actions) {
        if (state.victory || state.defeat) break;
        await new Promise(r => setTimeout(r, 180));
        if (action.kind === 'move') {
          // Move tile-by-tile so overwatch can react.
          for (let i = 1; i < action.path.length; i++) {
            enemy.x = action.path[i].x;
            enemy.y = action.path[i].y;
            // Overwatch check: any squad member on overwatch with LOS?
            for (const w of state.squad) {
              if (w.hp <= 0 || !w.overwatching) continue;
              if (losBetween(w, enemy, fovRadius * 2, (x, y) => isObstacle(x, y))) {
                const r = resolveAttack(w, enemy, isObstacle);
                w.overwatching = false;
                if (r.hit) {
                  spawnVfx(w.weapon.kind === 'ranged' ? 'arrow' : 'red liquid spatter', enemy.x, enemy.y, 220);
                  pushLog(`Overwatch: ${w.name} hits ${enemy.name} for ${r.damage}.`);
                  if (r.killed) { enemy.hp = 0; state.tiles[`${enemy.x},${enemy.y}`].corpse = enemy.corpse; pushLog(`${enemy.name} dies.`); }
                } else {
                  pushLog(`Overwatch: ${w.name} misses ${enemy.name}.`);
                }
                if (enemy.hp <= 0) break;
              }
            }
            setState({ ...state, ...refreshFov() });
            await new Promise(r => setTimeout(r, 80));
            if (enemy.hp <= 0) break;
          }
        } else if (action.kind === 'attack' && enemy.hp > 0) {
          const target = action.target;
          if (!target || target.hp <= 0) continue;
          const r = resolveAttack(enemy, target, isObstacle);
          if (r.hit) {
            pushLog(`${enemy.name} hits ${target.name} for ${r.damage}${r.crit ? ' (CRIT!)' : ''}.`);
            spawnVfx('red liquid spatter', target.x, target.y, 220);
            if (r.killed) { target.hp = 0; pushLog(`${target.name} falls!`); }
          } else {
            pushLog(`${enemy.name} misses ${target.name}.`);
          }
          setState({ ...state });
        } else if (action.kind === 'aoe') {
          spawnAOE(action.target);
          for (const u of state.squad) {
            if (u.hp <= 0) continue;
            if (Math.max(Math.abs(u.x - action.target.x), Math.abs(u.y - action.target.y)) > 1) continue;
            const fakeAtk = { ...enemy, weapon: { ...enemy.weapon, dmg: [4, 7] } };
            const r = resolveAttack(fakeAtk, u, isObstacle);
            if (r.hit) {
              pushLog(`${enemy.name}'s blast hits ${u.name} for ${r.damage}.`);
              if (r.killed) { u.hp = 0; pushLog(`${u.name} falls!`); }
            }
          }
          setState({ ...state });
        } else if (action.kind === 'telegraph') {
          pushLog(`${enemy.name} winds up an attack at (${action.target.x}, ${action.target.y}).`);
        }
        checkVictoryDefeat();
      }
    }
    // End of enemy phase: refresh squad AP, advance turn.
    refreshSquad(state.squad);
    state.squad.forEach(u => { u.overwatching = false; });
    state.turn = 'player';
    state.turnNumber += 1;
    setState({ ...state, ...refreshFov() });
    const next = state.squad.find(u => u.hp > 0 && !u.ended);
    if (next) setSelectedUnitId(next.id);
  }

  const restart = () => {
    seedRef.current = Math.floor(Math.random() * 1_000_000);
    squadSeedRef.current = seedRef.current + 1;
    buildLevel();
  };

  // ===== Render =====
  const renderTileLayers = (x, y, s) => {
    if (!atlas) return [];
    const tile = s.tiles[`${x},${y}`];
    if (!tile) return [];
    const theme = s.theme;
    const layers = [];

    const floor = resolveDawnLikeFloorName(theme.groundStyle, { n: true, s: true, e: true, w: true }, atlas.byName);
    layers.push({ name: floor.name, z: 0 });

    if (tile.trail) {
      const tn = !!s.tiles[`${x},${y - 1}`]?.trail;
      const ts = !!s.tiles[`${x},${y + 1}`]?.trail;
      const te = !!s.tiles[`${x + 1},${y}`]?.trail;
      const tw = !!s.tiles[`${x - 1},${y}`]?.trail;
      const trail = resolveDawnLikeFloorName(theme.trailStyle, { n: tn, s: ts, e: te, w: tw }, atlas.byName);
      if (atlas.byName[trail.name]) layers.push({ name: trail.name, z: 1 });
    }

    if (tile.bridge && atlas.byName['bridge e w']) {
      layers.push({ name: 'bridge e w', z: 1 });
    }
    if (tile.hazard && theme.hazardSprite && atlas.byName[theme.hazardSprite]) {
      layers.push({ name: theme.hazardSprite, z: 1.5 });
    }
    if (tile.obstacle) {
      const info = OBSTACLE_KIND_INFO[theme.obstacleKind] || OBSTACLE_KIND_INFO.tree;
      const same = (nx, ny) => !!s.tiles[`${nx},${ny}`]?.obstacle;
      const n = same(x, y - 1);
      const sn = same(x, y + 1);
      const e = same(x + 1, y);
      const w = same(x - 1, y);
      let name;
      if (info.autotile === 'forest') {
        const nw = same(x - 1, y - 1);
        const ne = same(x + 1, y - 1);
        const sw = same(x - 1, y + 1);
        const se = same(x + 1, y + 1);
        name = resolveDawnLikeForestName(theme.obstacleStyle, { n, s: sn, e, w, nw, ne, sw, se }, atlas.byName).name;
      } else if (info.autotile === 'mountain') {
        name = resolveDawnLikeMountainName(theme.obstacleStyle, { n, s: sn, e, w }, atlas.byName);
      } else if (info.autotile === 'wall') {
        name = resolveDawnLikeDungeonWallName(theme.obstacleStyle, x, y,
          (xx, yy) => {
            if (xx < 0 || yy < 0 || xx >= s.W || yy >= s.H) return true;
            return !!s.tiles[`${xx},${yy}`]?.obstacle;
          }, atlas.byName);
      } else {
        name = theme.obstacleStyle;
      }
      if (atlas.byName[name]) layers.push({ name, z: 2 });
    }
    if (tile.chest && atlas.byName['closed big chest']) {
      layers.push({ name: 'closed big chest', z: 1.7 });
    }
    if (tile.corpse && atlas.byName[tile.corpse]) {
      layers.push({ name: tile.corpse, z: 1.7 });
    }
    if (tile.decor && atlas.byName[tile.decor]) {
      layers.push({ name: tile.decor, z: 0.5 });
    }
    return layers;
  };

  // Tile click dispatch.
  const onTileClick = (x, y) => {
    if (!state || state.turn !== 'player' || state.victory || state.defeat) return;
    if (mode === 'move') {
      moveTo({ x, y });
      return;
    }
    // Click an enemy in LOS → attack with the current mode.
    const target = state.enemies.find(e => e.hp > 0 && e.x === x && e.y === y && state.fov.has(`${x},${y}`));
    if (target && (mode === 'attack' || mode === 'cast')) {
      attackTarget(target, mode === 'cast');
      return;
    }
    if (mode === 'heal') {
      // Click an ally adjacent to selected unit.
      attackTarget({ x, y }, true);
      return;
    }
    // Click a squad member → select.
    const ally = state.squad.find(u => u.hp > 0 && u.x === x && u.y === y);
    if (ally) { setSelectedUnitId(ally.id); setMode('idle'); return; }
  };

  if (loading || !atlas || !state) {
    return <div className="autotile-layout full-viewport"><div className="control-card">Loading…</div></div>;
  }

  const { squad, enemies, fov, explored, W, H } = state;
  const visibleEnemiesNow = enemies.filter(e => e.hp > 0 && fov.has(`${e.x},${e.y}`));
  const px = W * TILE_SIZE, py = H * TILE_SIZE;

  // Hit-chance preview when in 'attack' mode + hovering an enemy.
  let hitPreview = null;
  if (showHitPreview && mode === 'attack' && hoverTile && selectedUnit) {
    const en = visibleEnemiesNow.find(e => e.x === hoverTile.x && e.y === hoverTile.y);
    if (en) {
      hitPreview = hitChance({ ...selectedUnit, weapon: selectedUnit.weapon }, en, isObstacle);
    }
  }

  return (
    <div className="autotile-layout full-viewport" style={{ outline: 'none' }}>
      <TopBar state={state} onEndTurn={endTurn} onRestart={restart} />
      <div className="map-viewport maximized" style={{ paddingRight: 220 }}>
        <div
          className="map-grid"
          style={{ width: px, height: py }}
          onMouseLeave={() => setHoverTile(null)}
        >
          {Array.from({ length: H }).map((_, y) =>
            Array.from({ length: W }).map((__, x) => {
              const key = `${x},${y}`;
              const visible = fov.has(key);
              const seen = explored.has(key);
              const dim = visible ? 1 : seen ? 0.45 : 0;
              const layers = dim > 0 ? renderTileLayers(x, y, state) : [];
              const onMove = () => setHoverTile({ x, y });
              const baseStyle = {
                position: 'absolute',
                left: x * TILE_SIZE, top: y * TILE_SIZE,
                width: TILE_SIZE, height: TILE_SIZE,
                cursor: 'pointer',
              };
              if (dim === 0) {
                return <div key={key} style={{ ...baseStyle, background: '#0a0a0c', cursor: 'default' }} />;
              }
              // Move-range tint
              const reachKey = moveReachable?.has(key);
              const isMoveTarget = mode === 'move' && reachKey;
              const tintColor = isMoveTarget ? 'rgba(120,200,255,0.25)' : null;
              return (
                <div
                  key={key}
                  onMouseEnter={onMove}
                  onClick={() => onTileClick(x, y)}
                  style={{
                    ...baseStyle,
                    opacity: dim,
                    filter: visible ? 'none' : 'grayscale(0.4) brightness(0.7)',
                  }}
                >
                  {layers.map((layer, i) => {
                    const sp = atlas.byName[layer.name];
                    if (!sp) return null;
                    return (
                      <div
                        key={i}
                        style={{
                          position: 'absolute', inset: 0,
                          backgroundImage: `url(${resolveAssetPath('/DawnlikeAtlas0.png')})`,
                          backgroundPosition: `-${sp.x}px -${sp.y}px`,
                          backgroundSize: `${atlas.meta.size.w}px ${atlas.meta.size.h}px`,
                          zIndex: Math.round(layer.z * 10),
                          imageRendering: 'pixelated',
                        }}
                      />
                    );
                  })}
                  {tintColor && (
                    <div style={{ position: 'absolute', inset: 0, background: tintColor, zIndex: 25 }} />
                  )}
                </div>
              );
            })
          )}

          {/* Squad sprites (always visible). */}
          {squad.filter(u => u.hp > 0).map(u => (
            <ActorSprite key={u.id} atlas={atlas} sprite={u.sprite} x={u.x} y={u.y}
              selected={u.id === selectedUnitId} overwatching={u.overwatching} />
          ))}

          {/* Enemy sprites (in FOV only). */}
          {visibleEnemiesNow.map(e => (
            <ActorSprite key={e.id} atlas={atlas} sprite={e.sprite} x={e.x} y={e.y} side="enemy" />
          ))}

          {/* Transient VFX. */}
          {vfxRef.current.map(v => (
            <ActorSprite key={v.id} atlas={atlas} sprite={v.name} x={v.x} y={v.y} z={7} />
          ))}

          {/* Hit-chance hover preview. */}
          {hitPreview && hoverTile && (
            <div style={{
              position: 'absolute',
              left: hoverTile.x * TILE_SIZE + TILE_SIZE / 2,
              top: hoverTile.y * TILE_SIZE - 4,
              transform: 'translate(-50%, -100%)',
              background: 'rgba(0,0,0,0.85)',
              color: hitPreview.percent >= 70 ? '#7f7' : hitPreview.percent >= 40 ? '#ffd' : '#f99',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontFamily: 'system-ui, sans-serif',
              fontWeight: 700,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 50,
            }}>
              {hitPreview.percent}%
              {hitPreview.flanking && ' FLANK'}
              {hitPreview.cover !== 'none' && !hitPreview.flanking && ` · ${hitPreview.cover} cover`}
            </div>
          )}
        </div>
      </div>

      <SidePanel state={state} squad={squad} selectedUnitId={selectedUnitId} setSelected={setSelectedUnitId} atlas={atlas} />
      <ActionBar
        state={state} selectedUnit={selectedUnit} mode={mode} setMode={setMode}
        onMove={() => setMode('move')}
        onAttack={() => setMode('attack')}
        onCast={() => setMode('cast')}
        onHeal={() => setMode('heal')}
        onOverwatch={setOverwatch}
        atlas={atlas}
      />

      {/* Combat log (bottom-left). */}
      <div style={{
        position: 'absolute', left: 8, bottom: 72, zIndex: 30,
        background: 'rgba(0,0,0,0.7)', color: '#fff',
        padding: '6px 10px', borderRadius: 4,
        fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11,
        maxWidth: 360, lineHeight: 1.35,
      }}>
        {state.log.slice(-8).map((line, i) => <div key={i}>{line}</div>)}
      </div>

      {(state.victory || state.defeat) && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            padding: 24, background: '#181818', color: '#fff',
            borderRadius: 8, border: '1px solid #444',
            fontFamily: 'system-ui, sans-serif', textAlign: 'center', minWidth: 320,
          }}>
            <h2 style={{ marginTop: 0, color: state.victory ? '#7f7' : '#f77' }}>
              {state.victory ? 'Victory!' : 'Squad wiped.'}
            </h2>
            <p>Turn {state.turnNumber}. Squad alive: {squad.filter(u => u.hp > 0).length} / 4.</p>
            <button onClick={restart} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
              New mission
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TopBar({ state, onEndTurn, onRestart }) {
  return (
    <div style={{
      position: 'absolute', top: 8, left: 8, zIndex: 30,
      display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
    }}>
      <button onClick={onRestart} style={{ padding: '6px 12px', cursor: 'pointer' }}>🔄 New mission</button>
      <div style={{
        padding: '6px 10px',
        background: 'rgba(0,0,0,0.7)',
        color: state.turn === 'player' ? '#7df' : '#f77',
        fontFamily: 'system-ui, sans-serif', fontSize: 12, fontWeight: 700,
        borderRadius: 4,
      }}>
        Turn {state.turnNumber} · {state.turn === 'player' ? 'YOUR TURN' : 'enemy phase…'}
      </div>
      {state.objective && (
        <div style={{
          padding: '6px 10px',
          background: 'rgba(0,0,0,0.6)',
          color: '#ffd',
          fontFamily: 'system-ui, sans-serif', fontSize: 12,
          borderRadius: 4, maxWidth: 360,
        }}>
          📜 {state.objective}
        </div>
      )}
      {state.turn === 'player' && !state.victory && !state.defeat && (
        <button onClick={onEndTurn} style={{ padding: '6px 12px', cursor: 'pointer', background: '#553', color: '#fff', border: '1px solid #774' }}>
          End turn ⏩
        </button>
      )}
    </div>
  );
}

function SidePanel({ state, squad, selectedUnitId, setSelected, atlas }) {
  return (
    <div style={{
      position: 'absolute', right: 8, top: 60, zIndex: 30,
      width: 200,
      background: 'rgba(0,0,0,0.7)',
      borderRadius: 6,
      padding: 8,
      fontFamily: 'system-ui, sans-serif',
      color: '#fff',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Squad</div>
      {squad.map(u => {
        const sel = u.id === selectedUnitId;
        return (
          <div key={u.id}
            onClick={() => u.hp > 0 && setSelected(u.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: 6,
              marginBottom: 4,
              borderRadius: 4,
              background: sel ? 'rgba(120,200,255,0.25)' : 'rgba(255,255,255,0.06)',
              opacity: u.hp > 0 ? 1 : 0.45,
              cursor: u.hp > 0 ? 'pointer' : 'not-allowed',
              border: sel ? '1px solid #7df' : '1px solid transparent',
            }}
          >
            <div style={{ width: 32, height: 32, position: 'relative' }}>
              <SpriteFrame atlas={atlas} sprite={u.sprite} />
            </div>
            <div style={{ flex: 1, fontSize: 11 }}>
              <div style={{ fontWeight: 700 }}>{u.name}</div>
              <div>HP {Math.max(0, u.hp)}/{u.maxHp}</div>
              <div>{'•'.repeat(u.ap)}{u.ended && u.hp > 0 ? ' ended' : ''}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActionBar({ state, selectedUnit, mode, setMode, onMove, onAttack, onCast, onHeal, onOverwatch, atlas }) {
  if (!selectedUnit || selectedUnit.hp <= 0) return null;
  const cstats = CLASSES[selectedUnit.classKey];
  const apLeft = actionPoints(selectedUnit);
  const can = (cost) => apLeft >= cost && state.turn === 'player' && !state.victory && !state.defeat;
  const btn = (label, onClick, active, disabled) => (
    <button onClick={onClick} disabled={disabled || !can(1)}
      style={{
        padding: '6px 10px',
        marginRight: 4,
        background: active ? '#3a5' : '#222',
        color: '#fff',
        border: '1px solid #555',
        borderRadius: 4,
        cursor: (disabled || !can(1)) ? 'not-allowed' : 'pointer',
        opacity: (disabled || !can(1)) ? 0.5 : 1,
        fontSize: 12,
        fontFamily: 'system-ui, sans-serif',
      }}
    >{label}</button>
  );
  let abilityBtn = null;
  if (selectedUnit.classKey === 'wizard') {
    abilityBtn = btn(`🔥 Fireball (${selectedUnit.abilityUsesLeft})`, () => setMode('cast'), mode === 'cast', selectedUnit.abilityUsesLeft <= 0);
  } else if (selectedUnit.classKey === 'cleric') {
    abilityBtn = btn(`✚ Heal (${selectedUnit.abilityUsesLeft})`, () => setMode('heal'), mode === 'heal');
  } else if (selectedUnit.classKey === 'knight') {
    abilityBtn = btn('🛡 Bash', () => setMode('cast'), mode === 'cast');
  } else if (selectedUnit.classKey === 'rogue') {
    abilityBtn = btn('🗡 Dagger', () => setMode('cast'), mode === 'cast');
  }
  return (
    <div style={{
      position: 'absolute', bottom: 8, left: 8, zIndex: 30,
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'rgba(0,0,0,0.8)',
      padding: 8,
      borderRadius: 6,
      border: '1px solid #444',
      fontFamily: 'system-ui, sans-serif',
      color: '#fff',
    }}>
      <div style={{ width: 32, height: 32, position: 'relative' }}>
        <SpriteFrame atlas={atlas} sprite={selectedUnit.sprite} />
      </div>
      <div style={{ minWidth: 130 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{selectedUnit.name}</div>
        <div style={{ fontSize: 11 }}>HP {Math.max(0, selectedUnit.hp)} / {selectedUnit.maxHp}</div>
        <div style={{ fontSize: 11 }}>AP {'•'.repeat(apLeft)} {apLeft === 0 ? '(ended)' : ''}</div>
      </div>
      {btn('🚶 Move', onMove, mode === 'move')}
      {btn('🎯 Attack', onAttack, mode === 'attack')}
      {abilityBtn}
      {btn('👁 Overwatch', onOverwatch, false)}
    </div>
  );
}

function ActorSprite({ atlas, sprite, x, y, z = 5, selected, overwatching, side = 'player' }) {
  const s = atlas?.byName?.[sprite];
  if (!s) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x * TILE_SIZE, top: y * TILE_SIZE,
        width: TILE_SIZE, height: TILE_SIZE,
        zIndex: z * 10,
        pointerEvents: 'none',
      }}
    >
      {selected && (
        <div style={{
          position: 'absolute', inset: -2,
          border: '2px solid #7df',
          borderRadius: 4,
          boxSizing: 'border-box',
          zIndex: 1,
        }} />
      )}
      {overwatching && (
        <div style={{
          position: 'absolute', inset: -2,
          border: '2px dashed #ff7',
          borderRadius: 4,
          boxSizing: 'border-box',
          zIndex: 1,
        }} />
      )}
      {side === 'enemy' && (
        <div style={{
          position: 'absolute', inset: -1,
          border: '1px solid rgba(255,60,60,0.7)',
          borderRadius: 4,
          boxSizing: 'border-box',
          zIndex: 1,
        }} />
      )}
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${resolveAssetPath('/DawnlikeAtlas0.png')})`,
          backgroundPosition: `-${s.x}px -${s.y}px`,
          backgroundSize: `${atlas.meta.size.w}px ${atlas.meta.size.h}px`,
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}

function SpriteFrame({ atlas, sprite }) {
  const s = atlas?.byName?.[sprite];
  if (!s) return null;
  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${resolveAssetPath('/DawnlikeAtlas0.png')})`,
        backgroundPosition: `-${s.x}px -${s.y}px`,
        backgroundSize: `${atlas.meta.size.w}px ${atlas.meta.size.h}px`,
        imageRendering: 'pixelated',
      }}
    />
  );
}
