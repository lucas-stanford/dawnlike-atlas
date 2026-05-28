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
import {
  Footprints, Crosshair, Flame, Eye, Shield, Sword, Sparkles,
  Heart, HeartPulse, SkipForward, RotateCcw, Skull, X,
  Target, Activity, ShieldAlert, Wand2, Award, TrendingUp,
  User as UserIcon, Move as MoveIcon, ChevronRight, Zap, BookOpen,
} from 'lucide-react';
import { resolveAssetPath } from './utils/paths';
import { dawnlikeAnimVars, isAnimatedSprite, DAWNLIKE_ATLAS_0_URL } from './utils/spriteAnim';
import './utils/spriteAnim.css';
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

// ===== HUD theme =====
// Tactical-HUD palette + reusable style fragments for a consistent look.
const HUD = {
  bg:         'rgba(8, 12, 20, 0.88)',
  bgSolid:    'rgba(12, 18, 28, 0.96)',
  panelBg:    'linear-gradient(180deg, rgba(18,26,40,0.94) 0%, rgba(10,16,26,0.94) 100%)',
  border:     '1px solid rgba(120, 190, 240, 0.30)',
  borderHot:  '1px solid rgba(120, 190, 240, 0.65)',
  shadow:     '0 6px 22px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
  text:       '#e6eef9',
  textDim:    '#90a4be',
  textMuted:  '#5d728e',
  cyan:       '#5cc8ff',
  amber:      '#ffc658',
  red:        '#ff6470',
  green:      '#74ff9a',
  purple:     '#c690ff',
  font:       "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  fontMono:   "ui-monospace, 'JetBrains Mono', Menlo, monospace",
};

const CLASS_COLORS = {
  knight: HUD.amber,
  wizard: HUD.purple,
  rogue:  HUD.green,
  cleric: HUD.cyan,
};

const MODE_THEME = {
  move:    { color: HUD.cyan,   label: 'MOVE'      },
  attack:  { color: HUD.red,    label: 'ATTACK'    },
  cast:    { color: HUD.purple, label: 'ABILITY'   },
  heal:    { color: HUD.green,  label: 'HEAL'      },
  overwatch:{color: HUD.amber,  label: 'OVERWATCH' },
};

// Reusable Lucide icon wrapper — consistent stroke + glow.
function Icon({ component: C, size = 16, color = 'currentColor', glow = false, strokeWidth = 1.75, style }) {
  if (!C) return null;
  return (
    <C
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      style={{
        flexShrink: 0,
        filter: glow ? `drop-shadow(0 0 4px ${color}aa)` : undefined,
        ...style,
      }}
    />
  );
}

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
  'procedural-stone': {
    groundStyle: 'day tile floor', obstacleKind: 'wall', obstacleStyle: 'bright brick wall',
    hazardSprite: 'blue puddle', hazardDensity: 0, ringNoiseScale: 4, ringThickness: 3,
    trailStyle: 'dusk tile floor',
    monsterPack: ['goblin', 'kobold', 'imp'],
  },
};

const DIFFICULTY = {
  easy:   { enemyCount: 4, enemyAimMod: -10 },
  normal: { enemyCount: 6, enemyAimMod: 0 },
  hard:   { enemyCount: 8, enemyAimMod: +10 },
};

const MONSTER_STATS = {
  goblin:           { hp: 6,  atk: 3, def: 0, armor: 0, aim: 55, weapon: { dmg: [2,4], range: 1, optimalRange: 1, kind: 'melee' }, corpse: 'corpse', xp: 12, rank: 'Common' },
  kobold:           { hp: 5,  atk: 3, def: 0, armor: 0, aim: 50, weapon: { dmg: [2,3], range: 1, optimalRange: 1, kind: 'melee' }, corpse: 'corpse', xp: 10, rank: 'Common' },
  'kobold barbarian':{hp: 8,  atk: 4, def: 5, armor: 1, aim: 55, weapon: { dmg: [3,5], range: 1, optimalRange: 1, kind: 'melee' }, corpse: 'corpse', xp: 22, rank: 'Veteran' },
  'kobold zombie':  { hp: 7,  atk: 3, def: 0, armor: 0, aim: 45, weapon: { dmg: [2,3], range: 1, optimalRange: 1, kind: 'melee' }, corpse: 'bones',  xp: 14, rank: 'Undead' },
  imp:              { hp: 7,  atk: 4, def: 5, armor: 0, aim: 60, weapon: { dmg: [2,4], range: 4, optimalRange: 3, kind: 'ranged' }, corpse: 'corpse', xp: 24, rank: 'Demon' },
  'lava demon':     { hp: 14, atk: 5, def: 10, armor: 2, aim: 60, weapon: { dmg: [4,6], range: 1, optimalRange: 1, kind: 'melee' }, corpse: 'spoiled corpse', xp: 50, rank: 'Elite' },
  'fire elemental': { hp: 10, atk: 5, def: 0, armor: 1, aim: 65, weapon: { dmg: [3,5], range: 5, optimalRange: 5, kind: 'ranged' }, corpse: 'spoiled corpse', xp: 32, rank: 'Elemental' },
  'fire skeleton':  { hp: 8,  atk: 4, def: 5, armor: 1, aim: 60, weapon: { dmg: [2,4], range: 5, optimalRange: 5, kind: 'ranged' }, corpse: 'bones',  xp: 22, rank: 'Undead' },
  'human zombie':   { hp: 10, atk: 3, def: 0, armor: 0, aim: 40, weapon: { dmg: [2,4], range: 1, optimalRange: 1, kind: 'melee' }, corpse: 'spoiled corpse', xp: 16, rank: 'Undead' },
  skeleton:         { hp: 6,  atk: 4, def: 5, armor: 1, aim: 60, weapon: { dmg: [2,4], range: 5, optimalRange: 5, kind: 'ranged' }, corpse: 'bones',  xp: 18, rank: 'Undead' },
  ghost:            { hp: 5,  atk: 5, def: 20, armor: 0, aim: 70, weapon: { dmg: [3,4], range: 1, optimalRange: 1, kind: 'melee' }, corpse: 'old bones', xp: 28, rank: 'Spirit' },
  'hell hound':     { hp: 9,  atk: 4, def: 5, armor: 1, aim: 60, weapon: { dmg: [3,5], range: 1, optimalRange: 1, kind: 'melee' }, corpse: 'corpse', xp: 26, rank: 'Beast' },
};

// XP progression. Level N -> N+1 takes `xpForLevel(N)` XP earned this level.
// Tuned low so a single skirmish reliably levels squad members up — these
// stories are demos, not 40-hour campaigns.
const XP_BASE = 20;
const XP_GROWTH = 10;
function xpForLevel(level) {
  return XP_BASE + (Math.max(1, level) - 1) * XP_GROWTH;
}
// Per-level passive bumps applied to squad units on level up.
function applyLevelUpBumps(unit) {
  const hpBump = 2;
  const aimBump = 3;
  unit.maxHp += hpBump;
  unit.hp = Math.min(unit.maxHp, unit.hp + hpBump);
  unit.aim = (unit.aim ?? 50) + aimBump;
  if (Number.isFinite(unit.ability?.uses)) {
    unit.ability.uses += 1;
    unit.abilityUsesLeft = (unit.abilityUsesLeft ?? 0) + 1;
  }
}

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
  const [characterScreenUnitId, setCharacterScreenUnitId] = useState(null);
  const [enemyScreenId, setEnemyScreenId] = useState(null);
  const [mousePos, setMousePos] = useState(null);

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

  // ESC closes the character screen first, otherwise cancels mode.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        if (characterScreenUnitId) {
          setCharacterScreenUnitId(null);
          e.preventDefault();
        } else if (enemyScreenId) {
          setEnemyScreenId(null);
          e.preventDefault();
        } else if (mode !== 'idle') {
          setMode('idle');
          e.preventDefault();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [characterScreenUnitId, enemyScreenId, mode]);

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
        level: 1,
        xp: 0,
        kills: 0,
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
        rank: stats.rank,
        xpReward: stats.xp,
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
      // Newly-built level starts with squad[0] at full AP — open in MOVE
      // mode so the reachable-tile overlay shows immediately.
      setMode('move');
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

  // Compute attack / cast / heal range overlay (Manhattan range from selectedUnit).
  // optimalSet = full-effect range; maxSet = full range incl. falloff zone.
  const rangeOverlay = useMemo(() => {
    if (!state || !selectedUnit) return null;
    if (mode !== 'attack' && mode !== 'cast' && mode !== 'heal') return null;
    const u = selectedUnit;
    let maxR, optR, color;
    if (mode === 'attack') {
      maxR = u.weapon?.range ?? 1;
      optR = u.weapon?.optimalRange ?? maxR;
      color = 'rgba(255,90,90,0.42)';
    } else if (mode === 'cast') {
      const a = u.ability;
      maxR = a?.range ?? u.weapon?.range ?? 1;
      optR = maxR;
      color = 'rgba(190,120,255,0.42)';
    } else {
      const a = u.ability;
      maxR = a?.range ?? 1;
      optR = maxR;
      color = 'rgba(120,255,160,0.42)';
    }
    const optimalSet = new Set();
    const maxSet = new Set();
    for (let dy = -maxR; dy <= maxR; dy++) {
      for (let dx = -maxR; dx <= maxR; dx++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d === 0 || d > maxR) continue;
        const x = u.x + dx, y = u.y + dy;
        if (x < 0 || y < 0 || x >= state.W || y >= state.H) continue;
        const k = `${x},${y}`;
        maxSet.add(k);
        if (d <= optR) optimalSet.add(k);
      }
    }
    return { optimalSet, maxSet, color, maxR, optR };
  }, [state, selectedUnit, mode]);

  // 3x3 AOE preview tiles for fireball cast (hover dependent).
  const aoePreviewSet = useMemo(() => {
    if (!state || !selectedUnit || mode !== 'cast' || !hoverTile) return null;
    if (selectedUnit.ability?.kind !== 'fireball') return null;
    if (!rangeOverlay?.maxSet.has(`${hoverTile.x},${hoverTile.y}`)) return null;
    const set = new Set();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = hoverTile.x + dx, y = hoverTile.y + dy;
        if (x < 0 || y < 0 || x >= state.W || y >= state.H) continue;
        set.add(`${x},${y}`);
      }
    }
    return set;
  }, [state, selectedUnit, mode, hoverTile, rangeOverlay]);

  // Pick the next un-ended unit, if any.
  const pickNextUnit = useCallback(() => {
    if (!state) return null;
    return state.squad.find(u => u.hp > 0 && !u.ended) || null;
  }, [state]);

  // Selecting a squad member defaults to MOVE mode so the reachable-tile
  // overlay appears immediately — that's the dominant action almost every
  // turn. Dead or ended units fall back to idle (the move overlay would be
  // empty/confusing otherwise).
  const selectUnit = useCallback((unitId) => {
    setSelectedUnitId(unitId);
    if (!state || state.turn !== 'player') { setMode('idle'); return; }
    const u = state.squad.find(s => s.id === unitId);
    if (!u || u.hp <= 0 || u.ended || actionPoints(u) < 1) {
      setMode('idle');
    } else {
      setMode('move');
    }
  }, [state]);

  // Auto-advance: if the currently-selected unit ended, jump to the next.
  useEffect(() => {
    if (!state || state.turn !== 'player') return;
    if (!selectedUnit || selectedUnit.ended) {
      const next = pickNextUnit();
      if (next) selectUnit(next.id);
    }
  }, [state, selectedUnit, pickNextUnit, selectUnit]);

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
        if (r.killed) {
          e.hp = 0;
          state.tiles[`${e.x},${e.y}`].corpse = e.corpse;
          pushLog(`${e.name} dies.`);
          grantKillCredit(selectedUnit, e);
        } else if (e.side === 'enemy') {
          grantXp(selectedUnit, 2, 'fireball hit');
        }
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
      grantXp(selectedUnit, 5, 'healed ally');
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
      if (r.killed) {
        target.hp = 0;
        state.tiles[`${target.x},${target.y}`].corpse = target.corpse;
        pushLog(`${target.name} dies.`);
        grantKillCredit(selectedUnit, target);
      } else if (target.side === 'enemy') {
        grantXp(selectedUnit, 3, 'hit');
      }
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
  function grantXp(unit, amount, reason) {
    if (!unit || unit.side !== 'player' || amount <= 0) return;
    unit.xp = (unit.xp ?? 0) + amount;
    pushLog(`${unit.name} gains ${amount} XP${reason ? ` (${reason})` : ''}.`);
    let need = xpForLevel(unit.level ?? 1);
    while (unit.xp >= need) {
      unit.xp -= need;
      unit.level = (unit.level ?? 1) + 1;
      applyLevelUpBumps(unit);
      pushLog(`★ ${unit.name} reaches level ${unit.level}!`);
      spawnVfx('aligned priest', unit.x, unit.y, 520);
      need = xpForLevel(unit.level);
    }
  }
  function grantKillCredit(attacker, victim) {
    if (!attacker || attacker.side !== 'player') return;
    attacker.kills = (attacker.kills ?? 0) + 1;
    const reward = victim?.xpReward ?? 10;
    grantXp(attacker, reward, `slew ${victim?.name || 'enemy'}`);
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
                  if (r.killed) {
                    enemy.hp = 0;
                    state.tiles[`${enemy.x},${enemy.y}`].corpse = enemy.corpse;
                    pushLog(`${enemy.name} dies.`);
                    grantKillCredit(w, enemy);
                  } else {
                    grantXp(w, 3, 'overwatch hit');
                  }
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
    if (next) selectUnit(next.id);
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

    if (tile.bridge) {
      const bridgeN = !!s.tiles[`${x},${y - 1}`]?.bridge;
      const bridgeS = !!s.tiles[`${x},${y + 1}`]?.bridge;
      const bridgeName = (bridgeN || bridgeS) ? 'bridge n s' : 'bridge e w';
      if (atlas.byName[bridgeName]) layers.push({ name: bridgeName, z: 1 });
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
    if (!state || state.victory || state.defeat) return;
    // In idle mode, clicking a visible enemy opens its info screen (any turn).
    if (mode === 'idle') {
      const enemyOnTile = state.enemies.find(e => e.x === x && e.y === y && state.fov.has(`${x},${y}`));
      if (enemyOnTile) {
        setEnemyScreenId(enemyOnTile.id);
        return;
      }
    }
    if (state.turn !== 'player') return;
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
    if (ally) { selectUnit(ally.id); return; }
  };

  if (loading || !atlas || !state) {
    return <div className="autotile-layout full-viewport"><div className="control-card">Loading…</div></div>;
  }

  const { squad, enemies, fov, explored, W, H } = state;
  const visibleEnemiesNow = enemies.filter(e => e.hp > 0 && fov.has(`${e.x},${e.y}`));
  const px = W * TILE_SIZE, py = H * TILE_SIZE;

  // Enemy hovered (alive + visible) → drives the floating tooltip.
  const hoveredEnemy = hoverTile
    ? visibleEnemiesNow.find(e => e.x === hoverTile.x && e.y === hoverTile.y)
    : null;

  // Hit-chance preview when in 'attack' mode + hovering an enemy.
  let hitPreview = null;
  if (showHitPreview && mode === 'attack' && hoverTile && selectedUnit) {
    const en = visibleEnemiesNow.find(e => e.x === hoverTile.x && e.y === hoverTile.y);
    if (en) {
      hitPreview = hitChance({ ...selectedUnit, weapon: selectedUnit.weapon }, en, isObstacle);
    }
  }

  return (
    <div className="autotile-layout full-viewport" style={{ outline: 'none', ...dawnlikeAnimVars }}>
      <style>{`
        @keyframes tac-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.55; transform: scale(0.85); }
        }
        @keyframes tac-fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <TopBar state={state} onEndTurn={endTurn} />
      <div className="map-viewport maximized" style={{ paddingRight: 244, paddingTop: 64, paddingBottom: 132 }}>
        <div
          className="map-grid"
          style={{ width: px, height: py }}
          onMouseLeave={() => { setHoverTile(null); setMousePos(null); }}
          onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
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
              // Mode-specific tinting
              const reachKey = moveReachable?.has(key);
              const isMoveTarget = mode === 'move' && reachKey;
              const inOptRange = rangeOverlay?.optimalSet.has(key);
              const inMaxRange = rangeOverlay?.maxSet.has(key);
              const inAoe = aoePreviewSet?.has(key);
              let tintColor = null;
              if (isMoveTarget) {
                tintColor = 'rgba(120,200,255,0.25)';
              } else if (inAoe) {
                tintColor = 'rgba(255,150,60,0.50)';
              } else if (inOptRange) {
                tintColor = rangeOverlay.color;
              } else if (inMaxRange) {
                tintColor = rangeOverlay.color.replace(/0\.42\)/, '0.22)');
              }
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
                    const animated = !!sp.isAnimated;
                    return (
                      <div
                        key={i}
                        className={animated ? 'dawnlike-tile-anim' : undefined}
                        style={{
                          position: 'absolute', inset: 0,
                          ...(animated ? null : { backgroundImage: `url(${DAWNLIKE_ATLAS_0_URL})` }),
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
              top: hoverTile.y * TILE_SIZE - 6,
              transform: 'translate(-50%, -100%)',
              padding: '6px 10px',
              background: HUD.bgSolid,
              border: `1px solid ${
                hitPreview.percent >= 70 ? HUD.green :
                hitPreview.percent >= 40 ? HUD.amber : HUD.red
              }cc`,
              boxShadow: `0 0 14px ${
                hitPreview.percent >= 70 ? HUD.green :
                hitPreview.percent >= 40 ? HUD.amber : HUD.red
              }66`,
              color: hitPreview.percent >= 70 ? HUD.green :
                     hitPreview.percent >= 40 ? HUD.amber : HUD.red,
              borderRadius: 5,
              fontSize: 14,
              fontFamily: HUD.fontMono,
              fontWeight: 700,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 50,
              letterSpacing: '1px',
            }}>
              {hitPreview.percent}%
              {hitPreview.flanking && <span style={{ marginLeft: 6, fontSize: 10, letterSpacing: '1.5px' }}>FLANK</span>}
              {hitPreview.cover !== 'none' && !hitPreview.flanking && (
                <span style={{ marginLeft: 6, fontSize: 10, color: HUD.textDim, letterSpacing: '1px' }}>
                  · {hitPreview.cover.toUpperCase()} COVER
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <SidePanel state={state} squad={squad} selectedUnitId={selectedUnitId} setSelected={selectUnit} atlas={atlas} onShowCharacter={setCharacterScreenUnitId} />
      <ActionBar
        state={state} selectedUnit={selectedUnit} mode={mode} setMode={setMode}
        onMove={() => setMode('move')}
        onAttack={() => setMode('attack')}
        onCast={() => setMode('cast')}
        onHeal={() => setMode('heal')}
        onOverwatch={setOverwatch}
        atlas={atlas}
      />

      {/* Mode + range indicator (above action bar). */}
      {selectedUnit && mode !== 'idle' && (
        <ModeIndicator mode={mode} unit={selectedUnit} rangeOverlay={rangeOverlay} moveReachable={moveReachable} />
      )}

      {/* Combat log (top-right, below Squad). */}
      <CombatLog lines={state.log} />

      {/* Character screen modal (triggered from SidePanel info button). */}
      {characterScreenUnitId && (() => {
        const u = squad.find(s => s.id === characterScreenUnitId);
        return u ? (
          <CharacterScreen unit={u} atlas={atlas} onClose={() => setCharacterScreenUnitId(null)} />
        ) : null;
      })()}

      {/* Enemy detail modal (triggered by clicking an enemy in idle mode). */}
      {enemyScreenId && (() => {
        const e = enemies.find(en => en.id === enemyScreenId);
        return e ? (
          <EnemyScreen enemy={e} atlas={atlas} onClose={() => setEnemyScreenId(null)} />
        ) : null;
      })()}

      {/* Hover tooltip: visible enemy + idle mode + no modal open. */}
      {hoveredEnemy && mousePos && !enemyScreenId && !characterScreenUnitId && !state.victory && !state.defeat && (
        <EnemyTooltip enemy={hoveredEnemy} mouse={mousePos} atlas={atlas} />
      )}

      {(state.victory || state.defeat) && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.9) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        }}>
          <div style={{
            padding: '32px 36px',
            background: HUD.panelBg,
            color: HUD.text,
            borderRadius: 10,
            border: `1px solid ${state.victory ? HUD.green : HUD.red}88`,
            boxShadow: `${HUD.shadow}, 0 0 48px ${state.victory ? HUD.green : HUD.red}55`,
            fontFamily: HUD.font, textAlign: 'center', minWidth: 360,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '4px',
              color: HUD.textMuted, marginBottom: 4,
            }}>
              MISSION {state.victory ? 'COMPLETE' : 'FAILED'}
            </div>
            <h2 style={{
              margin: '0 0 16px', fontSize: 36, fontWeight: 800, letterSpacing: '2px',
              color: state.victory ? HUD.green : HUD.red,
              textShadow: `0 0 24px ${state.victory ? HUD.green : HUD.red}88`,
            }}>
              {state.victory ? 'VICTORY' : 'SQUAD WIPED'}
            </h2>
            <div style={{
              display: 'flex', justifyContent: 'space-around', gap: 24,
              padding: '12px 0 18px',
              borderTop: `1px solid ${HUD.cyan}22`,
              borderBottom: `1px solid ${HUD.cyan}22`,
              marginBottom: 20,
            }}>
              <Stat label="TURNS" value={state.turnNumber} />
              <Stat label="ALIVE" value={`${squad.filter(u => u.hp > 0).length}/${squad.length}`} />
              <Stat label="KILLS" value={state.enemies.filter(e => e.hp <= 0).length} />
            </div>
            <button onClick={restart}
              onMouseEnter={(e) => { e.currentTarget.style.background = `linear-gradient(180deg, ${HUD.cyan}33 0%, ${HUD.cyan}14 100%)`; e.currentTarget.style.borderColor = HUD.cyan; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(20,28,42,0.85)'; e.currentTarget.style.borderColor = `${HUD.cyan}88`; }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '12px 28px',
                background: 'rgba(20,28,42,0.85)',
                color: HUD.cyan,
                border: `1px solid ${HUD.cyan}88`,
                boxShadow: `0 0 16px ${HUD.cyan}33`,
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: HUD.font,
                fontSize: 12, fontWeight: 700, letterSpacing: '2px',
                transition: 'all 0.15s ease',
              }}>
              <Icon component={RotateCcw} size={14} color={HUD.cyan} strokeWidth={2.2} glow />
              NEW MISSION
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TopBar({ state, onEndTurn }) {
  const isPlayer = state.turn === 'player';
  const turnColor = isPlayer ? HUD.cyan : HUD.red;
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
      display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', gap: 10,
      padding: '10px 14px',
      background: 'linear-gradient(180deg, rgba(8,12,20,0.92) 0%, rgba(8,12,20,0.55) 70%, rgba(8,12,20,0) 100%)',
      pointerEvents: 'none',
      fontFamily: HUD.font,
    }}>
      {/* Turn badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 14px',
        background: HUD.panelBg,
        border: `1px solid ${turnColor}66`,
        boxShadow: `${HUD.shadow}, 0 0 24px ${turnColor}33`,
        borderRadius: 6,
        color: HUD.text,
        pointerEvents: 'auto',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: 4,
          background: turnColor,
          boxShadow: `0 0 12px ${turnColor}`,
          animation: isPlayer ? 'tac-pulse 1.6s ease-in-out infinite' : 'none',
        }} />
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', color: HUD.textMuted }}>
            TURN {state.turnNumber}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '1px', color: turnColor }}>
            {isPlayer ? 'YOUR PHASE' : 'ENEMY PHASE…'}
          </div>
        </div>
      </div>

      {/* Objective banner */}
      {state.objective && (
        <div style={{
          flex: 1, maxWidth: 540,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 14px',
          background: HUD.panelBg,
          border: HUD.border,
          boxShadow: HUD.shadow,
          borderRadius: 6,
          pointerEvents: 'auto',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
            color: HUD.amber, padding: '2px 7px',
            border: `1px solid ${HUD.amber}55`, borderRadius: 3,
            background: `${HUD.amber}14`,
          }}>
            <Icon component={Target} size={11} color={HUD.amber} strokeWidth={2.2} glow />
            OBJECTIVE
          </div>
          <div style={{ fontSize: 12.5, color: HUD.text, lineHeight: 1.35 }}>{state.objective}</div>
        </div>
      )}

      {/* End-turn button */}
      {isPlayer && !state.victory && !state.defeat && (
        <button onClick={onEndTurn}
          onMouseEnter={(e) => { e.currentTarget.style.background = `linear-gradient(180deg, ${HUD.amber}33 0%, ${HUD.amber}14 100%)`; e.currentTarget.style.borderColor = `${HUD.amber}cc`; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = HUD.panelBg; e.currentTarget.style.borderColor = `${HUD.amber}66`; }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px',
            background: HUD.panelBg,
            color: HUD.amber,
            border: `1px solid ${HUD.amber}66`,
            boxShadow: `${HUD.shadow}, 0 0 18px ${HUD.amber}22`,
            borderRadius: 6,
            cursor: 'pointer',
            fontFamily: HUD.font,
            fontSize: 12, fontWeight: 700, letterSpacing: '1.5px',
            transition: 'all 0.15s ease',
            pointerEvents: 'auto',
          }}>
          END TURN <Icon component={SkipForward} size={15} color={HUD.amber} glow />
        </button>
      )}
    </div>
  );
}

function SidePanel({ state, squad, selectedUnitId, setSelected, atlas, onShowCharacter }) {
  return (
    <div style={{
      position: 'absolute', right: 10, top: 78, zIndex: 30,
      width: 224,
      background: HUD.panelBg,
      border: HUD.border,
      boxShadow: HUD.shadow,
      borderRadius: 8,
      padding: '10px 10px 8px',
      fontFamily: HUD.font,
      color: HUD.text,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8, paddingBottom: 6,
        borderBottom: `1px solid ${HUD.cyan}22`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon component={Award} size={13} color={HUD.cyan} strokeWidth={2} />
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', color: HUD.cyan }}>SQUAD</div>
        </div>
        <div style={{ fontSize: 10, color: HUD.textMuted, letterSpacing: '1px' }}>
          {squad.filter(u => u.hp > 0).length}/{squad.length} ALIVE
        </div>
      </div>
      {squad.map(u => {
        const sel = u.id === selectedUnitId;
        const dead = u.hp <= 0;
        const ended = !dead && u.ended;
        const accent = CLASS_COLORS[u.classKey] || HUD.cyan;
        const hpPct = Math.max(0, u.hp) / u.maxHp;
        const hpColor = hpPct > 0.66 ? HUD.green : hpPct > 0.33 ? HUD.amber : HUD.red;
        return (
          <div key={u.id}
            onClick={() => u.hp > 0 && setSelected(u.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '7px 8px',
              marginBottom: 5,
              borderRadius: 5,
              background: sel
                ? `linear-gradient(90deg, ${accent}26 0%, ${accent}0d 100%)`
                : 'rgba(255,255,255,0.025)',
              opacity: dead ? 0.4 : ended ? 0.65 : 1,
              cursor: u.hp > 0 ? 'pointer' : 'not-allowed',
              border: sel ? `1px solid ${accent}aa` : '1px solid rgba(255,255,255,0.06)',
              boxShadow: sel ? `0 0 14px ${accent}33, inset 0 0 0 1px ${accent}22` : 'none',
              transition: 'all 0.12s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Class-color accent stripe (left edge) */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
              background: accent, opacity: sel ? 1 : 0.5,
            }} />
            <div style={{
              width: 34, height: 34, position: 'relative',
              padding: 1,
              background: `${accent}1a`,
              border: `1px solid ${accent}55`,
              borderRadius: 4,
              filter: dead ? 'grayscale(1)' : 'none',
            }}>
              <SpriteFrame atlas={atlas} sprite={u.sprite} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 3,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                  <span style={{
                    fontSize: 8.5, fontWeight: 800, letterSpacing: '0.5px',
                    color: accent,
                    padding: '1px 4px',
                    background: `${accent}1f`,
                    border: `1px solid ${accent}55`,
                    borderRadius: 3,
                    fontFamily: HUD.fontMono,
                    whiteSpace: 'nowrap',
                  }}>
                    L{u.level ?? 1}
                  </span>
                  <span style={{
                    fontSize: 11.5, fontWeight: 700, color: HUD.text, letterSpacing: '0.3px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {u.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {dead && <Icon component={Skull} size={11} color={HUD.red} />}
                  {ended && (
                    <span style={{ fontSize: 9, color: HUD.textMuted, letterSpacing: '0.5px' }}>
                      ENDED
                    </span>
                  )}
                  {!dead && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onShowCharacter && onShowCharacter(u.id); }}
                      title={`${u.name} — character sheet`}
                      onMouseEnter={(e) => { e.currentTarget.style.color = accent; e.currentTarget.style.borderColor = `${accent}88`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = HUD.textMuted; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 18, height: 18,
                        padding: 0,
                        background: 'rgba(8,12,20,0.55)',
                        color: HUD.textMuted,
                        border: '1px solid rgba(255,255,255,0.10)',
                        borderRadius: 3,
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                      }}>
                      <Icon component={UserIcon} size={11} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
              {/* HP bar */}
              <div style={{
                height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 2,
                overflow: 'hidden', marginBottom: 3,
              }}>
                <div style={{
                  width: `${hpPct * 100}%`, height: '100%',
                  background: dead ? HUD.textMuted : `linear-gradient(90deg, ${hpColor} 0%, ${hpColor}cc 100%)`,
                  boxShadow: dead ? 'none' : `0 0 6px ${hpColor}aa`,
                  transition: 'width 0.2s ease',
                }} />
              </div>
              {/* XP bar */}
              {!dead && (() => {
                const need = xpForLevel(u.level ?? 1);
                const xpPct = Math.max(0, Math.min(1, (u.xp ?? 0) / need));
                return (
                  <div title={`${u.xp ?? 0} / ${need} XP to level ${(u.level ?? 1) + 1}`}
                       style={{
                         height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 1.5,
                         overflow: 'hidden', marginBottom: 4,
                       }}>
                    <div style={{
                      width: `${xpPct * 100}%`, height: '100%',
                      background: accent,
                      boxShadow: `0 0 5px ${accent}aa`,
                      transition: 'width 0.25s ease',
                    }} />
                  </div>
                );
              })()}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: hpColor, fontWeight: 600, fontFamily: HUD.fontMono }}>
                  {Math.max(0, u.hp)}/{u.maxHp}
                </span>
                <ApPips ap={u.ap} maxAp={u.maxAp || CLASSES[u.classKey]?.maxAp || 2} dim={dead || ended} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApPips({ ap, maxAp = 2, dim = false }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: maxAp }).map((_, i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: 4,
          background: i < ap ? (dim ? HUD.textMuted : HUD.cyan) : 'transparent',
          border: `1px solid ${i < ap ? (dim ? HUD.textMuted : HUD.cyan) : HUD.textMuted}`,
          boxShadow: i < ap && !dim ? `0 0 4px ${HUD.cyan}aa` : 'none',
        }} />
      ))}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: HUD.textMuted, letterSpacing: '1.5px', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, color: HUD.text, fontWeight: 800, fontFamily: HUD.fontMono, marginTop: 4 }}>{value}</div>
    </div>
  );
}

// Categorize a log line for color coding.
function logLineStyle(line) {
  const l = line.toLowerCase();
  if (l.includes('dies') || l.includes('crit')) return { color: HUD.red,    icon: Skull };
  if (l.includes('hits') || l.includes('shoots') || l.includes('shoves')) return { color: HUD.amber, icon: Crosshair };
  if (l.includes('heal')) return { color: HUD.green, icon: HeartPulse };
  if (l.includes('misses')) return { color: HUD.textDim, icon: Activity };
  if (l.includes('fireball')) return { color: HUD.purple, icon: Flame };
  if (l.includes('bash')) return { color: HUD.amber, icon: Shield };
  if (l.includes('move')) return { color: HUD.cyan, icon: Footprints };
  if (l.includes('mission')) return { color: HUD.amber, icon: Award };
  if (l.includes('overwatch')) return { color: HUD.amber, icon: Eye };
  return { color: HUD.text, icon: ChevronRight };
}

const COMBAT_LOG_STORAGE_KEY = 'tac-combat-log-pos';
const COMBAT_LOG_WIDTH = 224;

function CombatLog({ lines }) {
  const recent = lines.slice(-8);
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const [pos, setPos] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(COMBAT_LOG_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && Number.isFinite(parsed.left) && Number.isFinite(parsed.top)) return parsed;
    } catch (_) {}
    return null;
  });
  const [dragging, setDragging] = useState(false);

  const clamp = (left, top, parentRect, panelRect) => {
    const maxLeft = Math.max(0, parentRect.width - panelRect.width);
    const maxTop = Math.max(0, parentRect.height - panelRect.height);
    return {
      left: Math.min(Math.max(0, left), maxLeft),
      top: Math.min(Math.max(0, top), maxTop),
    };
  };

  useEffect(() => {
    if (!pos) return;
    const el = panelRef.current;
    if (!el || !el.offsetParent) return;
    const parentRect = el.offsetParent.getBoundingClientRect();
    const panelRect = el.getBoundingClientRect();
    const next = clamp(pos.left, pos.top, parentRect, panelRect);
    if (next.left !== pos.left || next.top !== pos.top) setPos(next);
  }, []);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    const el = panelRef.current;
    if (!el || !el.offsetParent) return;
    const parentRect = el.offsetParent.getBoundingClientRect();
    const panelRect = el.getBoundingClientRect();
    dragRef.current = {
      parentRect, panelRect,
      grabOffsetX: e.clientX - panelRect.left,
      grabOffsetY: e.clientY - panelRect.top,
      pointerId: e.pointerId,
    };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    setDragging(true);
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const left = e.clientX - d.parentRect.left - d.grabOffsetX;
    const top = e.clientY - d.parentRect.top - d.grabOffsetY;
    setPos(clamp(left, top, d.parentRect, d.panelRect));
  };

  const finishDrag = (e) => {
    const d = dragRef.current;
    if (!d) return;
    try { e.currentTarget.releasePointerCapture(d.pointerId); } catch (_) {}
    dragRef.current = null;
    setDragging(false);
    setPos((p) => {
      if (p && typeof window !== 'undefined') {
        try { window.localStorage.setItem(COMBAT_LOG_STORAGE_KEY, JSON.stringify(p)); } catch (_) {}
      }
      return p;
    });
  };

  const onDoubleClick = () => {
    setPos(null);
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem(COMBAT_LOG_STORAGE_KEY); } catch (_) {}
    }
  };

  const positionStyle = pos
    ? { left: pos.left, top: pos.top }
    : { right: 10, bottom: 12 };

  return (
    <div ref={panelRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onDoubleClick={onDoubleClick}
      title="Drag anywhere to move · double-click to reset position"
      style={{
        position: 'absolute', zIndex: 30,
        ...positionStyle,
        width: COMBAT_LOG_WIDTH,
        background: HUD.panelBg,
        border: dragging ? `1px solid ${HUD.cyan}aa` : HUD.border,
        boxShadow: dragging ? `${HUD.shadow}, 0 0 22px ${HUD.cyan}55` : HUD.shadow,
        borderRadius: 8,
        padding: '8px 10px 8px',
        fontFamily: HUD.font,
        color: HUD.text,
        userSelect: 'none',
        transition: dragging ? 'none' : 'box-shadow 160ms ease, border-color 160ms ease',
        touchAction: 'none',
        cursor: dragging ? 'grabbing' : 'grab',
      }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 10, fontWeight: 700, letterSpacing: '2px', color: HUD.cyan,
        marginBottom: 6, paddingBottom: 4, borderBottom: `1px solid ${HUD.cyan}22`,
      }}>
        <Icon component={BookOpen} size={11} color={HUD.cyan} strokeWidth={2} />
        <span style={{ flex: 1 }}>COMBAT LOG</span>
        <Icon component={MoveIcon} size={11} color={HUD.cyan} strokeWidth={2} style={{ opacity: 0.7 }} />
      </div>
      <div style={{
        fontFamily: HUD.fontMono, fontSize: 11, lineHeight: 1.45,
        display: 'flex', flexDirection: 'column', gap: 3,
        maxHeight: 180, overflow: 'hidden',
      }}>
        {recent.map((line, i) => {
          const s = logLineStyle(line);
          const recencyOpacity = 0.5 + (0.5 * ((i + 1) / recent.length));
          return (
            <div key={`${i}-${line}`} style={{
              display: 'flex', gap: 6, alignItems: 'center',
              opacity: recencyOpacity,
            }}>
              <Icon component={s.icon} size={11} color={s.color} strokeWidth={2} glow />
              <span style={{ color: s.color, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {line}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModeIndicator({ mode, unit, rangeOverlay, moveReachable }) {
  const theme = MODE_THEME[mode];
  if (!theme) return null;
  let detail = null;
  if (mode === 'move') {
    detail = `up to ${unit.moveRange} tiles${moveReachable ? ` · ${moveReachable.size} reachable` : ''}`;
  } else if (mode === 'attack') {
    const { range, optimalRange } = unit.weapon || {};
    const r = range ?? 1;
    const o = optimalRange ?? r;
    detail = o === r ? `range ${r}` : `optimal ${o}, max ${r}`;
  } else if (mode === 'cast') {
    const a = unit.ability;
    const r = a?.range ?? unit.weapon?.range ?? 1;
    const extra = a?.kind === 'fireball' ? ' · 3×3 AOE' : '';
    detail = `${a?.name || 'Ability'} · range ${r}${extra}`;
  } else if (mode === 'heal') {
    const r = unit.ability?.range ?? 1;
    detail = `range ${r}`;
  } else if (mode === 'overwatch') {
    detail = 'will fire on visible enemies that move';
  }
  return (
    <div style={{
      position: 'absolute', left: '50%', bottom: 116, zIndex: 30,
      transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 14px',
      background: HUD.panelBg,
      border: `1px solid ${theme.color}80`,
      boxShadow: `${HUD.shadow}, 0 0 22px ${theme.color}44`,
      borderRadius: 6,
      fontFamily: HUD.font,
      color: HUD.text,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        display: 'inline-block', width: 10, height: 10, borderRadius: 5,
        background: theme.color, boxShadow: `0 0 10px ${theme.color}`,
        animation: 'tac-pulse 1.6s ease-in-out infinite',
      }} />
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.8px', color: theme.color }}>
        {theme.label}
      </span>
      <span style={{ fontSize: 11, color: HUD.text, opacity: 0.85 }}>{detail}</span>
      <span style={{ fontSize: 10, color: HUD.textMuted, letterSpacing: '0.5px', marginLeft: 4 }}>
        ESC to cancel
      </span>
    </div>
  );
}

function ActionBar({ state, selectedUnit, mode, setMode, onMove, onAttack, onCast, onHeal, onOverwatch, atlas }) {
  if (!selectedUnit || selectedUnit.hp <= 0) return null;
  const accent = CLASS_COLORS[selectedUnit.classKey] || HUD.cyan;
  const apLeft = actionPoints(selectedUnit);
  const maxAp = selectedUnit.maxAp || CLASSES[selectedUnit.classKey]?.maxAp || 2;
  const can = (cost) => apLeft >= cost && state.turn === 'player' && !state.victory && !state.defeat;
  const hpPct = Math.max(0, selectedUnit.hp) / selectedUnit.maxHp;
  const hpColor = hpPct > 0.66 ? HUD.green : hpPct > 0.33 ? HUD.amber : HUD.red;

  const ActionBtn = ({ iconComponent, label, sub, hotkey, onClick, active, accent: btnAccent = HUD.cyan, disabled }) => {
    const inactive = disabled || !can(1);
    return (
      <button onClick={onClick} disabled={inactive}
        onMouseEnter={(e) => { if (!inactive && !active) { e.currentTarget.style.borderColor = `${btnAccent}aa`; e.currentTarget.style.boxShadow = `0 0 14px ${btnAccent}55, inset 0 0 0 1px ${btnAccent}33`; }}}
        onMouseLeave={(e) => { if (!inactive && !active) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.boxShadow = 'none'; }}}
        style={{
          position: 'relative',
          minWidth: 92,
          padding: '8px 10px 6px',
          background: active
            ? `linear-gradient(180deg, ${btnAccent}33 0%, ${btnAccent}10 100%)`
            : 'rgba(20,28,42,0.85)',
          color: active ? btnAccent : HUD.text,
          border: active ? `1px solid ${btnAccent}` : '1px solid rgba(255,255,255,0.10)',
          boxShadow: active ? `0 0 16px ${btnAccent}66, inset 0 0 0 1px ${btnAccent}55` : 'none',
          borderRadius: 5,
          cursor: inactive ? 'not-allowed' : 'pointer',
          opacity: inactive ? 0.4 : 1,
          fontFamily: HUD.font,
          textAlign: 'center',
          transition: 'all 0.12s ease',
        }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <Icon component={iconComponent} size={20} color={active ? btnAccent : HUD.text} strokeWidth={1.75} glow={active} />
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '1.2px' }}>{label}</div>
        {sub && (
          <div style={{ fontSize: 9, color: active ? btnAccent : HUD.textMuted, marginTop: 2, letterSpacing: '0.4px' }}>{sub}</div>
        )}
        {hotkey && (
          <div style={{
            position: 'absolute', top: 3, right: 4,
            fontSize: 8, color: HUD.textMuted, letterSpacing: '0.5px',
            fontFamily: HUD.fontMono,
          }}>{hotkey}</div>
        )}
      </button>
    );
  };

  const wpn = selectedUnit.weapon;
  const wpnRange = wpn?.range ?? 1;
  const wpnOpt = wpn?.optimalRange ?? wpnRange;
  const attackSub = wpnRange === wpnOpt ? `rng ${wpnRange}` : `rng ${wpnOpt}/${wpnRange}`;

  let abilityBtn = null;
  if (selectedUnit.classKey === 'wizard') {
    const r = selectedUnit.ability?.range ?? '?';
    abilityBtn = (
      <ActionBtn iconComponent={Flame} label="FIREBALL" sub={`rng ${r} · ${selectedUnit.abilityUsesLeft} left`} hotkey="3"
        onClick={() => setMode('cast')} active={mode === 'cast'} accent={HUD.purple}
        disabled={selectedUnit.abilityUsesLeft <= 0} />
    );
  } else if (selectedUnit.classKey === 'cleric') {
    const r = selectedUnit.ability?.range ?? 1;
    abilityBtn = (
      <ActionBtn iconComponent={HeartPulse} label="HEAL" sub={`rng ${r} · ${selectedUnit.abilityUsesLeft} left`} hotkey="3"
        onClick={() => setMode('heal')} active={mode === 'heal'} accent={HUD.green} />
    );
  } else if (selectedUnit.classKey === 'knight') {
    const r = selectedUnit.ability?.range ?? 1;
    abilityBtn = (
      <ActionBtn iconComponent={ShieldAlert} label="BASH" sub={`rng ${r}`} hotkey="3"
        onClick={() => setMode('cast')} active={mode === 'cast'} accent={HUD.amber} />
    );
  } else if (selectedUnit.classKey === 'rogue') {
    const r = selectedUnit.ability?.range ?? 1;
    abilityBtn = (
      <ActionBtn iconComponent={Sword} label="DAGGER" sub={`rng ${r}`} hotkey="3"
        onClick={() => setMode('cast')} active={mode === 'cast'} accent={HUD.purple} />
    );
  }

  return (
    <div style={{
      position: 'absolute', bottom: 12, left: '50%', zIndex: 30,
      transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'stretch', gap: 0,
      background: HUD.panelBg,
      border: `1px solid ${accent}55`,
      boxShadow: `${HUD.shadow}, 0 0 24px ${accent}22`,
      padding: 0,
      borderRadius: 8,
      fontFamily: HUD.font,
      color: HUD.text,
      overflow: 'hidden',
    }}>
      {/* Selected-unit info */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px',
        background: `linear-gradient(180deg, ${accent}18 0%, ${accent}06 100%)`,
        borderRight: `1px solid ${accent}33`,
      }}>
        <div style={{
          width: 42, height: 42, position: 'relative',
          padding: 2,
          background: `${accent}14`,
          border: `1px solid ${accent}88`,
          borderRadius: 5,
          boxShadow: `0 0 14px ${accent}44, inset 0 0 0 1px ${accent}33`,
        }}>
          <SpriteFrame atlas={atlas} sprite={selectedUnit.sprite} />
        </div>
        <div style={{ minWidth: 130 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.5px' }}>{selectedUnit.name}</div>
            <div style={{ fontSize: 9, color: accent, letterSpacing: '1.5px', fontWeight: 700 }}>
              {CLASSES[selectedUnit.classKey]?.name?.toUpperCase()}
            </div>
          </div>
          {/* HP bar */}
          <div style={{
            height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3,
            overflow: 'hidden', marginTop: 4, marginBottom: 4,
          }}>
            <div style={{
              width: `${hpPct * 100}%`, height: '100%',
              background: `linear-gradient(90deg, ${hpColor} 0%, ${hpColor}cc 100%)`,
              boxShadow: `0 0 8px ${hpColor}aa`,
              transition: 'width 0.2s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: hpColor, fontFamily: HUD.fontMono }}>
              {Math.max(0, selectedUnit.hp)}/{selectedUnit.maxHp} HP
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 9, color: HUD.textMuted, letterSpacing: '0.8px' }}>AP</span>
              <ApPips ap={apLeft} maxAp={maxAp} />
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 12px', alignItems: 'center' }}>
        <ActionBtn iconComponent={Footprints} label="MOVE" sub={`rng ${selectedUnit.moveRange}`} hotkey="1"
          onClick={onMove} active={mode === 'move'} accent={HUD.cyan} />
        <ActionBtn iconComponent={Crosshair} label="ATTACK" sub={attackSub} hotkey="2"
          onClick={onAttack} active={mode === 'attack'} accent={HUD.red} />
        {abilityBtn}
        <ActionBtn iconComponent={Eye} label="OVERWATCH" sub="end turn" hotkey="4"
          onClick={onOverwatch} active={mode === 'overwatch'} accent={HUD.amber} />
      </div>
    </div>
  );
}

function ActorSprite({ atlas, sprite, x, y, z = 5, selected, overwatching, side = 'player' }) {
  const s = atlas?.byName?.[sprite];
  if (!s) return null;
  const animated = !!s.isAnimated;
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
        className={animated ? 'dawnlike-tile-anim' : undefined}
        style={{
          position: 'absolute', inset: 0,
          ...(animated ? null : { backgroundImage: `url(${DAWNLIKE_ATLAS_0_URL})` }),
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
  const animated = !!s.isAnimated;
  return (
    <div
      className={animated ? 'dawnlike-tile-anim' : undefined}
      style={{
        position: 'absolute', inset: 0,
        ...(animated ? null : { backgroundImage: `url(${DAWNLIKE_ATLAS_0_URL})` }),
        backgroundPosition: `-${s.x}px -${s.y}px`,
        backgroundSize: `${atlas.meta.size.w}px ${atlas.meta.size.h}px`,
        imageRendering: 'pixelated',
      }}
    />
  );
}

// Large pixel-art portrait that scales an atlas sprite cleanly.
function PortraitLarge({ atlas, sprite, size = 128, accent = HUD.cyan }) {
  const s = atlas?.byName?.[sprite];
  if (!s) return null;
  const tileW = s.w || atlas.meta.tile.w;
  const tileH = s.h || atlas.meta.tile.h;
  const scale = size / tileW;
  const animated = !!s.isAnimated;
  return (
    <div style={{
      position: 'relative',
      width: size, height: size,
      background: `linear-gradient(180deg, ${accent}22 0%, ${accent}08 100%)`,
      border: `1px solid ${accent}aa`,
      borderRadius: 6,
      boxShadow: `0 0 22px ${accent}55, inset 0 0 0 1px ${accent}33`,
      overflow: 'hidden',
    }}>
      <div
        className={animated ? 'dawnlike-tile-anim' : undefined}
        style={{
          position: 'absolute', left: 0, top: 0,
          width: tileW, height: tileH,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          ...(animated ? null : { backgroundImage: `url(${DAWNLIKE_ATLAS_0_URL})` }),
          backgroundPosition: `-${s.x}px -${s.y}px`,
          backgroundSize: `${atlas.meta.size.w}px ${atlas.meta.size.h}px`,
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}

// ====================================================================
// Character screen
// ====================================================================
// A full-screen modal that shows the selected squad member's portrait,
// vitals, attributes, weapon, and signature ability. Opened from the
// little User-icon button on each SidePanel row.
function CharacterScreen({ unit, atlas, onClose }) {
  const accent = CLASS_COLORS[unit.classKey] || HUD.cyan;
  const className = CLASSES[unit.classKey]?.name || unit.classKey;
  const hpPct = Math.max(0, unit.hp) / unit.maxHp;
  const hpColor = hpPct > 0.66 ? HUD.green : hpPct > 0.33 ? HUD.amber : HUD.red;
  const maxAp = unit.maxAp || CLASSES[unit.classKey]?.maxAp || 2;
  const wpn = unit.weapon || {};
  const ab = unit.ability || {};

  // Per-class flavor text & icons
  const FLAVOR = {
    knight: {
      tagline: 'Frontline bulwark — heavy plate, sword-and-shield discipline.',
      bio:     'Trained in the citadel guard, your knight specialises in soaking hits and bashing through enemy lines. Bring them within striking distance and let the steel do the talking.',
      abilityIcon: ShieldAlert,
      weaponIcon:  Sword,
    },
    wizard: {
      tagline: 'Glass-cannon caster — devastating area control, fragile in melee.',
      bio:     'A graduate of the Pyromancer\'s College, the wizard turns line-of-sight into kill zones. Save fireball charges for clustered enemies; never let them get adjacent.',
      abilityIcon: Flame,
      weaponIcon:  Wand2,
    },
    rogue: {
      tagline: 'Precision flanker — crossbow at range, dagger in the dark.',
      bio:     'Born in the city alleys, the rogue thrives by getting behind cover lines. Crit damage spikes when attacking from the flank — line them up before pulling the trigger.',
      abilityIcon: Sword,
      weaponIcon:  Crosshair,
    },
    cleric: {
      tagline: 'Field medic — keeps the squad standing under fire.',
      bio:     'A wandering priest of the Light. The cleric\'s heals are the only reason the rest of the squad reaches the extraction zone. Stay one move behind the line.',
      abilityIcon: HeartPulse,
      weaponIcon:  Sparkles,
    },
  };
  const flavor = FLAVOR[unit.classKey] || FLAVOR.knight;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 110,
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.92) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)',
        animation: 'tac-fadeIn 0.18s ease',
        fontFamily: HUD.font,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 720, maxWidth: '92vw', maxHeight: '92vh',
          padding: '24px 28px',
          background: HUD.panelBg,
          color: HUD.text,
          borderRadius: 10,
          border: `1px solid ${accent}88`,
          boxShadow: `${HUD.shadow}, 0 0 48px ${accent}55`,
          overflow: 'auto',
        }}
      >
        {/* Top accent bar */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 0, height: 3,
          background: `linear-gradient(90deg, transparent 0%, ${accent} 50%, transparent 100%)`,
          borderTopLeftRadius: 10, borderTopRightRadius: 10,
        }} />

        {/* Close button */}
        <button
          onClick={onClose}
          onMouseEnter={(e) => { e.currentTarget.style.color = HUD.text; e.currentTarget.style.borderColor = `${HUD.red}aa`; e.currentTarget.style.background = `${HUD.red}22`; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = HUD.textMuted; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.background = 'rgba(8,12,20,0.55)'; }}
          style={{
            position: 'absolute', top: 12, right: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28,
            background: 'rgba(8,12,20,0.55)',
            color: HUD.textMuted,
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 4,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Icon component={X} size={16} strokeWidth={2.2} />
        </button>

        {/* Header row: portrait + name */}
        <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>
          <PortraitLarge atlas={atlas} sprite={unit.sprite} size={132} accent={accent} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '3px', color: HUD.textMuted,
            }}>
              SQUAD MEMBER · {unit.id?.toString().padStart(2, '0')}
            </div>
            <div style={{
              fontSize: 28, fontWeight: 800, letterSpacing: '1px',
              color: HUD.text, marginTop: 2,
            }}>
              {unit.name}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 12, fontWeight: 700, letterSpacing: '2px',
              color: accent, marginTop: 4,
            }}>
              <Icon component={UserIcon} size={13} color={accent} strokeWidth={2.2} glow />
              {className.toUpperCase()}
              <span style={{
                fontSize: 10, color: accent, padding: '2px 7px',
                background: `${accent}1f`, border: `1px solid ${accent}66`,
                borderRadius: 4, letterSpacing: '1.5px',
                fontFamily: HUD.fontMono,
              }}>
                LVL {unit.level ?? 1}
              </span>
              {Number.isFinite(unit.kills) && (
                <span style={{
                  fontSize: 10, color: HUD.amber, padding: '2px 7px',
                  background: `${HUD.amber}1f`, border: `1px solid ${HUD.amber}55`,
                  borderRadius: 4, letterSpacing: '1.5px',
                  fontFamily: HUD.fontMono,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <Icon component={Skull} size={10} color={HUD.amber} strokeWidth={2.2} />
                  {unit.kills}
                </span>
              )}
            </div>
            <div style={{
              marginTop: 12,
              fontSize: 12.5, color: HUD.textDim,
              fontStyle: 'italic', lineHeight: 1.5,
            }}>
              {flavor.tagline}
            </div>

            {/* HP + AP bars */}
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <BarRow icon={Heart} color={hpColor} label="HEALTH" value={`${Math.max(0, unit.hp)} / ${unit.maxHp}`} pct={hpPct} />
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '4px 0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon component={Zap} size={14} color={HUD.cyan} strokeWidth={2} glow />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', color: HUD.textDim }}>
                    ACTION POINTS
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 12, fontFamily: HUD.fontMono, fontWeight: 700, color: HUD.text,
                  }}>
                    {unit.ap} / {maxAp}
                  </span>
                  <ApPips ap={unit.ap} maxAp={maxAp} />
                </div>
              </div>
              {(() => {
                const need = xpForLevel(unit.level ?? 1);
                const xpPct = Math.max(0, Math.min(1, (unit.xp ?? 0) / need));
                return (
                  <BarRow
                    icon={TrendingUp}
                    color={accent}
                    label={`EXPERIENCE · LVL ${unit.level ?? 1}`}
                    value={`${unit.xp ?? 0} / ${need}`}
                    pct={xpPct}
                  />
                );
              })()}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          margin: '20px 0 16px',
          borderTop: `1px solid ${accent}22`,
        }} />

        {/* Attribute grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
          marginBottom: 18,
        }}>
          <AttrCell icon={Target}      label="AIM"       value={`${unit.aim ?? CLASSES[unit.classKey]?.aim ?? '—'}%`} color={HUD.amber} />
          <AttrCell icon={Shield}      label="DEFENSE"   value={unit.defense ?? CLASSES[unit.classKey]?.defense ?? '—'} color={HUD.cyan} />
          <AttrCell icon={ShieldAlert} label="ARMOR"     value={unit.armor   ?? CLASSES[unit.classKey]?.armor   ?? '—'} color={HUD.green} />
          <AttrCell icon={Footprints}  label="MOVE"      value={`${unit.moveRange ?? CLASSES[unit.classKey]?.moveRange ?? '—'} tiles`} color={HUD.purple} />
        </div>

        {/* Weapon + Ability cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <DetailCard
            iconComponent={flavor.weaponIcon}
            tag="WEAPON"
            title={wpn.kind === 'melee' ? 'Melee weapon' : 'Ranged weapon'}
            color={HUD.red}
            stats={[
              { label: 'Damage',  value: wpn.dmg ? `${wpn.dmg[0]}–${wpn.dmg[1]}` : '—' },
              { label: 'Range',   value: wpn.optimalRange === wpn.range
                ? `${wpn.range}`
                : `${wpn.optimalRange ?? wpn.range} optimal · ${wpn.range} max` },
              { label: 'Kind',    value: wpn.kind || '—' },
            ]}
          />
          <DetailCard
            iconComponent={flavor.abilityIcon}
            tag="ABILITY"
            title={ab.name || '—'}
            color={accent}
            stats={[
              { label: 'AP cost',  value: ab.apCost ?? '—' },
              { label: 'Range',    value: ab.range ?? '—' },
              { label: 'Uses left', value: ab.uses === Infinity || ab.uses === undefined
                ? '∞'
                : `${unit.abilityUsesLeft ?? ab.uses} / ${ab.uses}` },
              ...(ab.dmg       ? [{ label: 'Damage',  value: `${ab.dmg[0]}–${ab.dmg[1]}` }] : []),
              ...(ab.healAmount ? [{ label: 'Heals',  value: `+${ab.healAmount}` }] : []),
            ]}
          />
        </div>

        {/* Bio */}
        <div style={{
          marginTop: 16,
          padding: '12px 14px',
          background: 'rgba(8,12,20,0.55)',
          border: `1px solid ${accent}22`,
          borderRadius: 6,
          fontSize: 12, color: HUD.textDim,
          lineHeight: 1.55,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 10, fontWeight: 700, letterSpacing: '2px', color: accent,
            marginBottom: 6,
          }}>
            <Icon component={BookOpen} size={11} color={accent} strokeWidth={2.2} />
            DOSSIER
          </div>
          {flavor.bio}
        </div>

        {/* Footer hint */}
        <div style={{
          marginTop: 14,
          fontSize: 10, color: HUD.textMuted, letterSpacing: '1.5px',
          textAlign: 'center',
        }}>
          ESC OR CLICK OUTSIDE TO CLOSE
        </div>
      </div>
    </div>
  );
}

function BarRow({ icon, color, label, value, pct }) {
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 3,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon component={icon} size={14} color={color} strokeWidth={2} glow />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', color: HUD.textDim }}>{label}</span>
        </div>
        <span style={{ fontSize: 12, fontFamily: HUD.fontMono, fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{
        height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden',
      }}>
        <div style={{
          width: `${Math.max(0, Math.min(1, pct)) * 100}%`, height: '100%',
          background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
          boxShadow: `0 0 10px ${color}aa`,
          transition: 'width 0.25s ease',
        }} />
      </div>
    </div>
  );
}

function AttrCell({ icon, label, value, color }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: 'rgba(8,12,20,0.55)',
      border: `1px solid ${color}33`,
      borderRadius: 6,
      textAlign: 'center',
      transition: 'border-color 0.15s ease',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        fontSize: 9, fontWeight: 700, letterSpacing: '2px', color: HUD.textMuted,
        marginBottom: 4,
      }}>
        <Icon component={icon} size={11} color={color} strokeWidth={2.2} />
        {label}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 800, fontFamily: HUD.fontMono, color,
        textShadow: `0 0 12px ${color}55`,
      }}>
        {value}
      </div>
    </div>
  );
}

function DetailCard({ iconComponent, tag, title, stats, color }) {
  return (
    <div style={{
      padding: '12px 14px',
      background: `linear-gradient(180deg, ${color}10 0%, rgba(8,12,20,0.65) 100%)`,
      border: `1px solid ${color}55`,
      borderRadius: 6,
      boxShadow: `inset 0 0 0 1px ${color}1a`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28,
          background: `${color}1a`,
          border: `1px solid ${color}66`,
          borderRadius: 4,
        }}>
          <Icon component={iconComponent} size={16} color={color} strokeWidth={2} glow />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', color }}>{tag}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: HUD.text, letterSpacing: '0.3px' }}>{title}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            fontSize: 11.5,
            paddingTop: i > 0 ? 4 : 0,
            borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          }}>
            <span style={{ color: HUD.textMuted, letterSpacing: '0.5px' }}>{s.label}</span>
            <span style={{ color: HUD.text, fontFamily: HUD.fontMono, fontWeight: 600 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================================
// Enemy hover tooltip and full-detail modal
// =====================================================================

function EnemyTooltip({ enemy, mouse, atlas }) {
  const hpPct = Math.max(0, enemy.hp) / enemy.maxHp;
  const hpColor = hpPct > 0.66 ? HUD.green : hpPct > 0.33 ? HUD.amber : HUD.red;
  const wpn = enemy.weapon || {};
  // Position the tooltip near the cursor, but clamp so it stays in viewport.
  const W = 220;
  const padX = 16;
  const left = Math.min(window.innerWidth - W - 8, mouse.x + padX);
  const top  = Math.max(8, mouse.y - 60);
  return (
    <div style={{
      position: 'fixed', left, top, zIndex: 95,
      width: W,
      background: HUD.panelBg,
      border: `1px solid ${HUD.red}66`,
      boxShadow: `${HUD.shadow}, 0 0 16px ${HUD.red}33`,
      borderRadius: 6,
      padding: '8px 10px',
      fontFamily: HUD.font,
      color: HUD.text,
      pointerEvents: 'none',
      animation: 'tac-fadeIn 0.12s ease',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
      }}>
        <div style={{
          width: 30, height: 30, padding: 1, position: 'relative',
          background: `${HUD.red}1a`,
          border: `1px solid ${HUD.red}66`,
          borderRadius: 3,
          flexShrink: 0,
        }}>
          <SpriteFrame atlas={atlas} sprite={enemy.sprite} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: HUD.text, letterSpacing: '0.3px',
            textTransform: 'capitalize',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {enemy.name}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', color: HUD.red,
            textTransform: 'uppercase',
          }}>
            <Icon component={Skull} size={9} color={HUD.red} strokeWidth={2.2} />
            {enemy.rank || 'Hostile'}
            {enemy.aware && (
              <span style={{
                marginLeft: 4, color: HUD.amber,
                padding: '0 4px', borderRadius: 2,
                background: `${HUD.amber}1a`, border: `1px solid ${HUD.amber}55`,
              }}>
                ALERT
              </span>
            )}
          </div>
        </div>
      </div>
      <div style={{
        height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 2,
        overflow: 'hidden', marginBottom: 2,
      }}>
        <div style={{
          width: `${hpPct * 100}%`, height: '100%',
          background: `linear-gradient(90deg, ${hpColor} 0%, ${hpColor}cc 100%)`,
          boxShadow: `0 0 6px ${hpColor}aa`,
        }} />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 6,
      }}>
        <span style={{ fontSize: 10, color: hpColor, fontWeight: 600, fontFamily: HUD.fontMono }}>
          HP {Math.max(0, enemy.hp)}/{enemy.maxHp}
        </span>
        <span style={{ fontSize: 9, color: HUD.textMuted, letterSpacing: '0.8px' }}>
          XP {enemy.xpReward ?? 0}
        </span>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3,
        fontSize: 10, fontFamily: HUD.fontMono,
        paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <TooltipStat icon={wpn.kind === 'ranged' ? Crosshair : Sword}
                     label={wpn.kind === 'ranged' ? 'RNG ATK' : 'MLE ATK'}
                     value={wpn.dmg ? `${wpn.dmg[0]}–${wpn.dmg[1]}` : '—'} color={HUD.red} />
        <TooltipStat icon={Target}      label="RANGE"   value={wpn.range ?? '—'}   color={HUD.amber} />
        <TooltipStat icon={Crosshair}   label="AIM"     value={`${enemy.aim ?? '—'}%`} color={HUD.amber} />
        <TooltipStat icon={Shield}      label="DEF"     value={enemy.defense ?? 0} color={HUD.cyan} />
        <TooltipStat icon={ShieldAlert} label="ARMOR"   value={enemy.armor ?? 0}   color={HUD.green} />
        <TooltipStat icon={Footprints}  label="MOVE"    value={`${enemy.moveRange ?? 4}t`} color={HUD.purple} />
      </div>
      <div style={{
        marginTop: 6, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: 9, color: HUD.textMuted, letterSpacing: '0.8px', textAlign: 'center',
      }}>
        CLICK FOR FULL DOSSIER
      </div>
    </div>
  );
}

function TooltipStat({ icon, label, value, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '2px 4px',
      background: 'rgba(8,12,20,0.45)',
      border: `1px solid ${color}22`,
      borderRadius: 3,
    }}>
      <Icon component={icon} size={9} color={color} strokeWidth={2.2} />
      <span style={{ color: HUD.textMuted, letterSpacing: '0.4px', fontSize: 8.5 }}>{label}</span>
      <span style={{ color: HUD.text, fontWeight: 700, marginLeft: 'auto' }}>{value}</span>
    </div>
  );
}

function EnemyScreen({ enemy, atlas, onClose }) {
  const accent = HUD.red;
  const hpPct = Math.max(0, enemy.hp) / enemy.maxHp;
  const hpColor = hpPct > 0.66 ? HUD.green : hpPct > 0.33 ? HUD.amber : HUD.red;
  const wpn = enemy.weapon || {};
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 110,
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.92) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)',
        animation: 'tac-fadeIn 0.18s ease',
        fontFamily: HUD.font,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 620, maxWidth: '92vw', maxHeight: '92vh',
          padding: '24px 28px',
          background: HUD.panelBg,
          color: HUD.text,
          borderRadius: 10,
          border: `1px solid ${accent}88`,
          boxShadow: `${HUD.shadow}, 0 0 48px ${accent}55`,
          overflow: 'auto',
        }}
      >
        {/* Top accent bar */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 0, height: 3,
          background: `linear-gradient(90deg, transparent 0%, ${accent} 50%, transparent 100%)`,
          borderTopLeftRadius: 10, borderTopRightRadius: 10,
        }} />

        {/* Close button */}
        <button
          onClick={onClose}
          onMouseEnter={(e) => { e.currentTarget.style.color = HUD.text; e.currentTarget.style.borderColor = `${accent}aa`; e.currentTarget.style.background = `${accent}22`; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = HUD.textMuted; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.background = 'rgba(8,12,20,0.55)'; }}
          style={{
            position: 'absolute', top: 12, right: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28,
            background: 'rgba(8,12,20,0.55)',
            color: HUD.textMuted,
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 4,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Icon component={X} size={16} strokeWidth={2.2} />
        </button>

        {/* Header row: portrait + name */}
        <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>
          <PortraitLarge atlas={atlas} sprite={enemy.sprite} size={120} accent={accent} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '3px', color: HUD.textMuted,
            }}>
              HOSTILE · ID {enemy.id?.toString().padStart(2, '0')}
            </div>
            <div style={{
              fontSize: 26, fontWeight: 800, letterSpacing: '1px',
              color: HUD.text, marginTop: 2,
              textTransform: 'capitalize',
            }}>
              {enemy.name}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 12, fontWeight: 700, letterSpacing: '2px',
              color: accent, marginTop: 4,
            }}>
              <Icon component={Skull} size={13} color={accent} strokeWidth={2.2} glow />
              {(enemy.rank || 'Hostile').toUpperCase()}
              {enemy.aware && (
                <span style={{
                  fontSize: 10, color: HUD.amber, padding: '2px 7px',
                  background: `${HUD.amber}1f`, border: `1px solid ${HUD.amber}66`,
                  borderRadius: 4, letterSpacing: '1.5px',
                  fontFamily: HUD.fontMono,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <Icon component={Eye} size={10} color={HUD.amber} strokeWidth={2.2} />
                  ALERT
                </span>
              )}
            </div>

            {/* HP + XP reward */}
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <BarRow icon={Heart} color={hpColor} label="HEALTH" value={`${Math.max(0, enemy.hp)} / ${enemy.maxHp}`} pct={hpPct} />
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '4px 0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon component={TrendingUp} size={14} color={HUD.amber} strokeWidth={2} glow />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', color: HUD.textDim }}>
                    BOUNTY
                  </span>
                </div>
                <span style={{
                  fontSize: 12, fontFamily: HUD.fontMono, fontWeight: 700, color: HUD.amber,
                }}>
                  +{enemy.xpReward ?? 0} XP
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          margin: '20px 0 16px',
          borderTop: `1px solid ${accent}22`,
        }} />

        {/* Attribute grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
          marginBottom: 18,
        }}>
          <AttrCell icon={Target}      label="AIM"     value={`${enemy.aim ?? '—'}%`} color={HUD.amber} />
          <AttrCell icon={Shield}      label="DEFENSE" value={enemy.defense ?? 0}      color={HUD.cyan} />
          <AttrCell icon={ShieldAlert} label="ARMOR"   value={enemy.armor ?? 0}        color={HUD.green} />
          <AttrCell icon={Footprints}  label="MOVE"    value={`${enemy.moveRange ?? 4} tiles`} color={HUD.purple} />
        </div>

        {/* Weapon card */}
        <DetailCard
          iconComponent={wpn.kind === 'ranged' ? Crosshair : Sword}
          tag="WEAPON"
          title={wpn.kind === 'melee' ? 'Melee strike' : 'Ranged attack'}
          color={HUD.red}
          stats={[
            { label: 'Damage', value: wpn.dmg ? `${wpn.dmg[0]}–${wpn.dmg[1]}` : '—' },
            { label: 'Range',  value: wpn.optimalRange === wpn.range
              ? `${wpn.range ?? '—'}`
              : `${wpn.optimalRange ?? wpn.range} optimal · ${wpn.range} max` },
            { label: 'Kind',   value: wpn.kind || '—' },
          ]}
        />

        {/* Position + awareness */}
        <div style={{
          marginTop: 16,
          padding: '12px 14px',
          background: 'rgba(8,12,20,0.55)',
          border: `1px solid ${accent}22`,
          borderRadius: 6,
          fontSize: 12, color: HUD.textDim,
          lineHeight: 1.55,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 10, fontWeight: 700, letterSpacing: '2px', color: accent,
            marginBottom: 6,
          }}>
            <Icon component={BookOpen} size={11} color={accent} strokeWidth={2.2} />
            INTEL
          </div>
          Spotted at <span style={{ color: HUD.text, fontFamily: HUD.fontMono, fontWeight: 700 }}>
            ({enemy.x}, {enemy.y})
          </span>. {enemy.aware
            ? 'Target is aware of the squad and will engage on its next turn.'
            : 'Target is not yet alerted — flanking attacks may strike from concealment.'}
        </div>

        {/* Footer hint */}
        <div style={{
          marginTop: 14,
          fontSize: 10, color: HUD.textMuted, letterSpacing: '1.5px',
          textAlign: 'center',
        }}>
          ESC OR CLICK OUTSIDE TO CLOSE
        </div>
      </div>
    </div>
  );
}
