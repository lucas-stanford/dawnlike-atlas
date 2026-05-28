/**
 * ArenaCombatExample — playable turn-based roguelike combat demo.
 *
 * Reuses the noisy-perimeter terrain generator from ArenaExample (kept
 * in-component here so the original ArenaExample stays untouched per
 * the plan) and layers on:
 *
 *   - WASD / arrow-key movement, one-tile-per-keypress, turn loop.
 *   - ROT.FOV.PreciseShadowcasting fog-of-war (visible / explored /
 *     unseen states; obstacles block sight).
 *   - ROT.Path.AStar monster AI with idle wander → aggro-on-sight state
 *     machine; bump-to-attack against the player when adjacent.
 *   - hp / atk / def combat with d3 damage roll.
 *   - One ranged action per class:
 *       * wizard → 3x3 fire-burst VFX, 4-turn cooldown
 *       * rogue  → single-tile dart, 2-turn cooldown
 *       * knight → "shield bash" bonus melee + push, no cooldown
 *   - HP gauge HUD using the `gauge red` family.
 *   - Corpses on monster death; gravestone + game-over modal on player
 *     death.
 *
 * The component is self-contained: one file, no save, no Phaser. Re-mounts
 * on Storybook args change.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as ROT from 'rot-js';
import { resolveAssetPath } from './utils/paths';
import { dawnlikeAnimVars, DAWNLIKE_ATLAS_0_URL } from './utils/spriteAnim';
import './utils/spriteAnim.css';
import {
  resolveDawnLikeFloorName,
  resolveDawnLikeForestName,
  resolveDawnLikeMountainName,
  resolveDawnLikeDungeonWallName,
} from './utils/autotile';
import './Autotile.css';

const TILE_SIZE = 32;

// Map an obstacle preset's kind to the right autotile resolver.
const OBSTACLE_KIND_INFO = {
  tree:     { autotile: 'forest' },
  mountain: { autotile: 'mountain' },
  wall:     { autotile: 'wall' },
  sprite:   { autotile: 'none' },
};

// Per-class loadout. atk/def/hp are baseline; the ranged action shape
// (aoe / dart / bash) drives the F-key behaviour.
const CLASS_STATS = {
  knight: { hp: 30, atk: 6, def: 3, sprite: 'knight', action: 'bash',
            actionName: 'Shield bash', actionCooldown: 0 },
  wizard: { hp: 18, atk: 3, def: 1, sprite: 'wizard', action: 'aoe',
            actionName: 'Fire burst',  actionCooldown: 4 },
  rogue:  { hp: 22, atk: 4, def: 2, sprite: 'rogue s', action: 'dart',
            actionName: 'Throw dart',  actionCooldown: 2 },
};

// Generic monster archetype. The story's per-theme pack provides the
// sprite name; we look up stats by name first, else use the default.
const MONSTER_DEFAULT = { hp: 6, atk: 3, def: 1, corpse: 'corpse' };
const MONSTER_STATS = {
  goblin:           { hp: 6,  atk: 3, def: 1, corpse: 'corpse' },
  kobold:           { hp: 5,  atk: 3, def: 1, corpse: 'corpse' },
  'kobold barbarian':{hp: 8,  atk: 4, def: 1, corpse: 'corpse' },
  'kobold zombie':  { hp: 7,  atk: 3, def: 1, corpse: 'bones' },
  imp:              { hp: 7,  atk: 4, def: 1, corpse: 'corpse' },
  'lava demon':     { hp: 14, atk: 5, def: 2, corpse: 'spoiled corpse' },
  'fire elemental': { hp: 10, atk: 5, def: 1, corpse: 'spoiled corpse' },
  'fire skeleton':  { hp: 8,  atk: 4, def: 1, corpse: 'bones' },
  'human zombie':   { hp: 10, atk: 3, def: 1, corpse: 'spoiled corpse' },
  skeleton:         { hp: 6,  atk: 4, def: 2, corpse: 'bones' },
  ghost:            { hp: 5,  atk: 5, def: 0, corpse: 'old bones' },
  'hell hound':     { hp: 9,  atk: 4, def: 2, corpse: 'corpse' },
};

export default function ArenaCombatExample({
  // Terrain knobs (mirror ArenaExample)
  width: widthProp = 24,
  height: heightProp = 18,
  seed: seedProp,
  groundStyle = 'day grass floor',
  obstacleStyle = 'light oak',
  obstacleKind = 'tree',
  hazardSprite = null,
  hazardDensity = 0,
  ringNoiseScale = 4,
  ringThickness = 3,
  trailStyle = 'day dirt floor',
  // Combat knobs
  playerClass = 'knight',
  monsterPack = ['goblin', 'kobold', 'imp'],
  monsterCount = 5,
  fovRadius = 7,
} = {}) {
  const [atlas, setAtlas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState(null);
  const [tick, setTick] = useState(0); // bump to force re-render after mutations
  const seedRef = useRef(seedProp ?? Math.floor(Math.random() * 1_000_000));
  const vfxRef = useRef([]); // [{ id, name, x, y, expires }]
  const containerRef = useRef(null);

  // Load atlas once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(resolveAssetPath('/DawnlikeAtlas.json'));
      const json = await res.json();
      if (!cancelled) { setAtlas(json); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Build the level (terrain + actor spawns + initial FOV). Re-runs on
  // any topology / theme / class / pack / count change.
  const buildLevel = useCallback(() => {
    if (!atlas) return;
    const seed = seedRef.current;
    ROT.RNG.setSeed(seed);
    const simplex = new ROT.Noise.Simplex();
    const W = widthProp, H = heightProp;
    const inB = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    const tiles = {};
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        tiles[`${x},${y}`] = { obstacle: false, decor: null, trail: false, hazard: false, corpse: null };
      }
    }
    // Noisy perimeter ring (copied from ArenaExample).
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const ed = Math.min(x, y, W - 1 - x, H - 1 - y);
        if (ed > ringThickness) continue;
        if (ed === 0) { tiles[`${x},${y}`].obstacle = true; continue; }
        const n = simplex.get(x / ringNoiseScale, y / ringNoiseScale);
        const bias = 1 - ed / (ringThickness + 1);
        if (n + bias > 0) tiles[`${x},${y}`].obstacle = true;
      }
    }
    // Entry trail from west — also fixes the player spawn.
    const trailLen = ringThickness + 2;
    const midY = Math.floor(H / 2);
    let playerStart = null;
    for (let i = 0; i < trailLen; i++) {
      const x = i, y = midY;
      if (!inB(x, y)) break;
      const t = tiles[`${x},${y}`];
      t.obstacle = false; t.trail = true;
      if (i === trailLen - 1) playerStart = { x, y };
    }
    // Interior cover scatter.
    const interior = [];
    for (let y = 2; y < H - 2; y++) {
      for (let x = 2; x < W - 2; x++) {
        const t = tiles[`${x},${y}`];
        if (t.obstacle || t.trail) continue;
        interior.push({ x, y });
      }
    }
    const coverN = Math.max(2, Math.floor(interior.length * 0.05));
    for (let i = 0; i < coverN && interior.length; i++) {
      const idx = ROT.RNG.getUniformInt(0, interior.length - 1);
      const cell = interior.splice(idx, 1)[0];
      tiles[`${cell.x},${cell.y}`].obstacle = true;
    }
    // Hazard sprinkle.
    if (hazardSprite && atlas.byName[hazardSprite]) {
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const t = tiles[`${x},${y}`];
          if (t.obstacle || t.trail) continue;
          if (ROT.RNG.getUniform() < hazardDensity) t.hazard = true;
        }
      }
    }

    // Player.
    const classKey = CLASS_STATS[playerClass] ? playerClass : 'knight';
    const cstats = CLASS_STATS[classKey];
    const player = {
      x: playerStart ? playerStart.x : 1,
      y: playerStart ? playerStart.y : midY,
      hp: cstats.hp, maxHp: cstats.hp,
      atk: cstats.atk, def: cstats.def,
      sprite: cstats.sprite,
      classKey,
      cooldown: 0,
    };

    // Monsters — distribute on free tiles in the eastern 2/3 of the
    // map so the player has to fight their way in.
    const monsters = [];
    const spawnCandidates = [];
    for (let y = 2; y < H - 2; y++) {
      for (let x = Math.floor(W / 3); x < W - 2; x++) {
        const t = tiles[`${x},${y}`];
        if (t.obstacle || t.trail) continue;
        spawnCandidates.push({ x, y });
      }
    }
    let mid = 0;
    while (monsters.length < monsterCount && spawnCandidates.length) {
      const idx = ROT.RNG.getUniformInt(0, spawnCandidates.length - 1);
      const cell = spawnCandidates.splice(idx, 1)[0];
      const sprite = monsterPack[ROT.RNG.getUniformInt(0, monsterPack.length - 1)];
      const stats = MONSTER_STATS[sprite] || MONSTER_DEFAULT;
      monsters.push({
        id: ++mid,
        x: cell.x, y: cell.y,
        hp: stats.hp, maxHp: stats.hp,
        atk: stats.atk, def: stats.def,
        corpse: stats.corpse,
        sprite,
        aware: false,
      });
    }

    setState({
      tiles, W, H, player, monsters,
      turn: 0,
      gameOver: false,
      fov: new Set([`${player.x},${player.y}`]),
      explored: new Set([`${player.x},${player.y}`]),
      log: [`You enter the arena. (class: ${classKey})`],
      gravestone: null,
    });
  }, [
    atlas, widthProp, heightProp,
    obstacleKind, ringNoiseScale, ringThickness,
    playerClass, monsterPack, monsterCount,
    hazardSprite, hazardDensity,
  ]);

  // Recompute FOV around any actor. Returns a Set of "x,y" keys.
  const computeFovAt = useCallback((cx, cy, radius, tiles, W, H) => {
    const seen = new Set();
    const isBlocking = (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return true;
      const t = tiles[`${x},${y}`];
      return !t || t.obstacle;
    };
    const fov = new ROT.FOV.PreciseShadowcasting((x, y) => !isBlocking(x, y));
    fov.compute(cx, cy, radius, (x, y, _r, vis) => {
      if (vis > 0) seen.add(`${x},${y}`);
    });
    return seen;
  }, []);

  // Bump-attack: actor a attacks actor d. Returns log lines + whether
  // the defender died. Mutates a/d in place.
  const bump = (attacker, defender) => {
    const roll = ROT.RNG.getUniformInt(0, 2); // d3 0..2
    const dmg = Math.max(1, attacker.atk - defender.def + roll);
    defender.hp -= dmg;
    return { dmg, dead: defender.hp <= 0 };
  };

  // Apply VFX (transient sprite at a tile). Cleaned up after `ms`.
  const spawnVfx = (name, x, y, ms = 300) => {
    if (!atlas?.byName[name]) return;
    const id = Math.random();
    const expires = Date.now() + ms;
    vfxRef.current = [...vfxRef.current, { id, name, x, y, expires }];
    setTimeout(() => {
      vfxRef.current = vfxRef.current.filter(v => v.id !== id);
      setTick(t => t + 1);
    }, ms);
    setTick(t => t + 1);
  };

  // Move/attack handler for the player. Resolves the player turn,
  // then runs all monster turns. Returns nothing; mutates state.
  const playerAct = useCallback((action) => {
    if (!state || state.gameOver) return;
    const s = state;
    const { tiles, W, H, player, monsters, fov } = s;
    const inB = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    const log = [];
    let acted = false;

    if (action.type === 'move') {
      const nx = player.x + action.dx, ny = player.y + action.dy;
      if (!inB(nx, ny)) return;
      const t = tiles[`${nx},${ny}`];
      if (!t || t.obstacle) return;
      // Bump-attack if a monster is on the target tile.
      const hit = monsters.find(m => m.x === nx && m.y === ny && m.hp > 0);
      if (hit) {
        const r = bump(player, hit);
        log.push(`You hit the ${hit.sprite} for ${r.dmg}.`);
        spawnVfx('fire burst c', hit.x, hit.y, 200);
        if (r.dead) {
          log.push(`The ${hit.sprite} dies!`);
          t.corpse = hit.corpse;
          hit.hp = 0;
        }
        // Knight bonus push on bash.
        if (player.classKey === 'knight' && !r.dead) {
          // Push back along attack axis if the tile is walkable.
          const px = hit.x + action.dx, py = hit.y + action.dy;
          if (inB(px, py)) {
            const tt = tiles[`${px},${py}`];
            if (tt && !tt.obstacle && !monsters.some(m => m.x === px && m.y === py && m.hp > 0)) {
              hit.x = px; hit.y = py;
              log.push(`The ${hit.sprite} is shoved back.`);
            }
          }
        }
        acted = true;
      } else {
        // Just walk.
        player.x = nx; player.y = ny;
        acted = true;
      }
    } else if (action.type === 'wait') {
      acted = true;
    } else if (action.type === 'ranged') {
      const cstats = CLASS_STATS[player.classKey];
      if (player.cooldown > 0) {
        log.push(`${cstats.actionName} on cooldown (${player.cooldown}).`);
      } else {
        // Find nearest visible monster.
        const targets = monsters
          .filter(m => m.hp > 0 && fov.has(`${m.x},${m.y}`))
          .map(m => ({ m, d: Math.abs(m.x - player.x) + Math.abs(m.y - player.y) }))
          .sort((a, b) => a.d - b.d);
        if (!targets.length) {
          log.push('No visible target.');
        } else {
          const tm = targets[0].m;
          if (cstats.action === 'aoe') {
            // 3x3 fire burst centred on the target.
            const burstNames = {
              '0,0':'fire burst c','-1,0':'fire burst w','1,0':'fire burst e',
              '0,-1':'fire burst n','0,1':'fire burst s',
              '-1,-1':'fire burst nw','1,-1':'fire burst ne',
              '-1,1':'fire burst sw','1,1':'fire burst se',
            };
            for (const key of Object.keys(burstNames)) {
              const [ox, oy] = key.split(',').map(Number);
              spawnVfx(burstNames[key], tm.x + ox, tm.y + oy, 320);
              const victim = monsters.find(m => m.x === tm.x + ox && m.y === tm.y + oy && m.hp > 0);
              if (victim) {
                const r = bump({ atk: player.atk + 3, def: 0 }, victim); // spell power
                log.push(`Fire burst hits the ${victim.sprite} for ${r.dmg}.`);
                if (r.dead) {
                  log.push(`The ${victim.sprite} burns to ash!`);
                  tiles[`${victim.x},${victim.y}`].corpse = victim.corpse;
                  victim.hp = 0;
                }
              }
            }
          } else if (cstats.action === 'dart') {
            spawnVfx('dart', tm.x, tm.y, 220);
            const r = bump({ atk: player.atk + 1, def: 0 }, tm);
            log.push(`Dart hits the ${tm.sprite} for ${r.dmg}.`);
            if (r.dead) {
              log.push(`The ${tm.sprite} dies!`);
              tiles[`${tm.x},${tm.y}`].corpse = tm.corpse;
              tm.hp = 0;
            }
          }
          player.cooldown = cstats.actionCooldown;
          acted = true;
        }
      }
    }

    if (!acted) return;

    // Monster turns. Anyone with LOS to the player chases via A*; the
    // rest wander one tile in a random cardinal direction.
    const passable = (x, y) => {
      if (!inB(x, y)) return false;
      const t = tiles[`${x},${y}`];
      if (!t || t.obstacle) return false;
      return true;
    };
    for (const m of monsters) {
      if (m.hp <= 0) continue;
      const seesPlayer = !!computeFovAt(m.x, m.y, fovRadius, tiles, W, H).has(`${player.x},${player.y}`);
      if (seesPlayer) m.aware = true;
      // If aware: A* toward player; if adjacent, attack instead.
      if (m.aware) {
        if (Math.abs(m.x - player.x) + Math.abs(m.y - player.y) === 1) {
          const r = bump(m, player);
          log.push(`The ${m.sprite} hits you for ${r.dmg}.`);
          if (r.dead) {
            log.push(`You die!`);
          }
        } else {
          // A* respecting other monsters as walls (so they don't pile
          // on a single tile).
          const blocked = new Set();
          for (const o of monsters) if (o !== m && o.hp > 0) blocked.add(`${o.x},${o.y}`);
          const astar = new ROT.Path.AStar(player.x, player.y, (x, y) =>
            passable(x, y) && !blocked.has(`${x},${y}`), { topology: 4 });
          const path = [];
          astar.compute(m.x, m.y, (x, y) => path.push([x, y]));
          if (path.length > 1) {
            const [nx, ny] = path[1];
            m.x = nx; m.y = ny;
          }
        }
      } else if (ROT.RNG.getUniform() < 0.4) {
        // Idle wander.
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        const [dx, dy] = dirs[ROT.RNG.getUniformInt(0, 3)];
        const nx = m.x + dx, ny = m.y + dy;
        if (passable(nx, ny) && !monsters.some(o => o !== m && o.hp > 0 && o.x === nx && o.y === ny) &&
            !(nx === player.x && ny === player.y)) {
          m.x = nx; m.y = ny;
        }
      }
    }

    // Tick cooldown.
    if (player.cooldown > 0) player.cooldown -= 1;

    // Update FOV.
    const newFov = computeFovAt(player.x, player.y, fovRadius, tiles, W, H);
    const newExplored = new Set(s.explored);
    for (const k of newFov) newExplored.add(k);

    // Game-over check.
    let gameOver = s.gameOver;
    let gravestone = s.gravestone;
    if (player.hp <= 0 && !gameOver) {
      gameOver = true;
      gravestone = { x: player.x, y: player.y };
      log.push(`You died on turn ${s.turn + 1}.`);
    }

    setState({
      ...s,
      tiles,
      monsters: monsters.filter(m => m.hp > 0 || tiles[`${m.x},${m.y}`].corpse), // keep all; corpses already on tile
      turn: s.turn + 1,
      fov: newFov,
      explored: newExplored,
      log: [...s.log, ...log].slice(-8),
      gameOver,
      gravestone,
    });
  }, [state, fovRadius, computeFovAt, atlas]);

  // Initial build + rebuild on prop change.
  useEffect(() => { buildLevel(); }, [buildLevel]);

  // Recompute initial FOV after build (the build only seeds 1 tile).
  useEffect(() => {
    if (!state || !atlas) return;
    if (state.fov.size <= 1 && !state.gameOver) {
      const fov = computeFovAt(state.player.x, state.player.y, fovRadius, state.tiles, state.W, state.H);
      const explored = new Set(fov);
      setState({ ...state, fov, explored });
    }
  }, [state, atlas, fovRadius, computeFovAt]);

  // Keyboard handling. Focus the container so it receives key events.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.focus();
  }, [state]);

  const onKeyDown = (e) => {
    if (!state || state.gameOver) return;
    const key = e.key.toLowerCase();
    let handled = true;
    if (key === 'arrowup' || key === 'w')        playerAct({ type: 'move', dx: 0, dy: -1 });
    else if (key === 'arrowdown' || key === 's') playerAct({ type: 'move', dx: 0, dy: 1 });
    else if (key === 'arrowleft' || key === 'a') playerAct({ type: 'move', dx: -1, dy: 0 });
    else if (key === 'arrowright' || key === 'd') playerAct({ type: 'move', dx: 1, dy: 0 });
    else if (key === '.' || key === ' ')         playerAct({ type: 'wait' });
    else if (key === 'f')                        playerAct({ type: 'ranged' });
    else handled = false;
    if (handled) e.preventDefault();
  };

  const restart = () => {
    seedRef.current = Math.floor(Math.random() * 1_000_000);
    buildLevel();
  };

  // Floor + decor render helper (subset of ArenaExample's logic).
  const renderTileLayers = (x, y, s) => {
    if (!atlas) return [];
    const tile = s.tiles[`${x},${y}`];
    if (!tile) return [];
    const layers = [];

    const floor = resolveDawnLikeFloorName(groundStyle, { n: true, s: true, e: true, w: true }, atlas.byName);
    layers.push({ name: floor.name, z: 0 });

    if (tile.trail) {
      const tn = !!s.tiles[`${x},${y - 1}`]?.trail;
      const ts = !!s.tiles[`${x},${y + 1}`]?.trail;
      const te = !!s.tiles[`${x + 1},${y}`]?.trail;
      const tw = !!s.tiles[`${x - 1},${y}`]?.trail;
      const trail = resolveDawnLikeFloorName(trailStyle, { n: tn, s: ts, e: te, w: tw }, atlas.byName);
      if (atlas.byName[trail.name]) layers.push({ name: trail.name, z: 1 });
    }

    if (tile.hazard && hazardSprite && atlas.byName[hazardSprite]) {
      layers.push({ name: hazardSprite, z: 1.5 });
    }

    if (tile.obstacle) {
      const info = OBSTACLE_KIND_INFO[obstacleKind] || OBSTACLE_KIND_INFO.tree;
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
        name = resolveDawnLikeForestName(obstacleStyle, { n, s: sn, e, w, nw, ne, sw, se }, atlas.byName).name;
      } else if (info.autotile === 'mountain') {
        name = resolveDawnLikeMountainName(obstacleStyle, { n, s: sn, e, w }, atlas.byName);
      } else if (info.autotile === 'wall') {
        name = resolveDawnLikeDungeonWallName(obstacleStyle, x, y,
          (xx, yy) => {
            if (xx < 0 || yy < 0 || xx >= s.W || yy >= s.H) return true;
            return !!s.tiles[`${xx},${yy}`]?.obstacle;
          }, atlas.byName);
      } else {
        name = obstacleStyle;
      }
      if (atlas.byName[name]) layers.push({ name, z: 2 });
    }

    if (tile.corpse && atlas.byName[tile.corpse]) {
      layers.push({ name: tile.corpse, z: 1.7 });
    }

    return layers;
  };

  if (loading || !atlas || !state) {
    return <div className="autotile-layout full-viewport"><div className="control-card">Loading…</div></div>;
  }

  const { player, monsters, fov, explored, W, H } = state;
  const cstats = CLASS_STATS[player.classKey];
  const aliveMonsters = monsters.filter(m => m.hp > 0).length;
  const px = W * TILE_SIZE, py = H * TILE_SIZE;
  // Pick the closest gauge step for the HP fraction.
  const hpFrac = Math.max(0, player.hp) / player.maxHp;
  const gaugeName =
    hpFrac > 0.75 ? 'gauge red full' :
    hpFrac > 0.5  ? 'gauge red most' :
    hpFrac > 0.25 ? 'gauge red half' :
                    'gauge red low';

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="autotile-layout full-viewport"
      style={{ outline: 'none', ...dawnlikeAnimVars }}
    >
      <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 30, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={restart} style={{ padding: '6px 12px', cursor: 'pointer' }}>🔄 Restart</button>
        <HudPanel atlas={atlas} player={player} gaugeName={gaugeName} cstats={cstats} />
        <div style={{
          padding: '6px 10px',
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 12,
          borderRadius: 4,
        }}>
          turn {state.turn} · monsters {aliveMonsters} · cd {player.cooldown}
        </div>
        <div style={{
          padding: '6px 10px',
          background: 'rgba(0,0,0,0.6)',
          color: '#aef',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 11,
          borderRadius: 4,
        }}>
          WASD / arrows move · F = {cstats.actionName.toLowerCase()} · . wait
        </div>
      </div>

      <div className="map-viewport maximized">
        <div className="map-grid" style={{ width: px, height: py }}>
          {Array.from({ length: H }).map((_, y) =>
            Array.from({ length: W }).map((__, x) => {
              const layers = renderTileLayers(x, y, state);
              const key = `${x},${y}`;
              const visible = fov.has(key);
              const seen = explored.has(key);
              const dim = visible ? 1 : seen ? 0.4 : 0;
              if (dim === 0) {
                return (
                  <div
                    key={key}
                    style={{
                      position: 'absolute',
                      left: x * TILE_SIZE, top: y * TILE_SIZE,
                      width: TILE_SIZE, height: TILE_SIZE,
                      background: '#0a0a0c',
                    }}
                  />
                );
              }
              return (
                <div
                  key={key}
                  style={{
                    position: 'absolute',
                    left: x * TILE_SIZE, top: y * TILE_SIZE,
                    width: TILE_SIZE, height: TILE_SIZE,
                    opacity: dim,
                    filter: visible ? 'none' : 'grayscale(0.4) brightness(0.7)',
                  }}
                >
                  {layers.map((layer, i) => {
                    const sprite = atlas.byName[layer.name];
                    if (!sprite) return null;
                    const animated = !!sprite.isAnimated;
                    return (
                      <div
                        key={i}
                        className={animated ? 'dawnlike-tile-anim' : undefined}
                        style={{
                          position: 'absolute', inset: 0,
                          ...(animated ? null : { backgroundImage: `url(${DAWNLIKE_ATLAS_0_URL})` }),
                          backgroundPosition: `-${sprite.x}px -${sprite.y}px`,
                          backgroundSize: `${atlas.meta.size.w}px ${atlas.meta.size.h}px`,
                          zIndex: Math.round(layer.z * 10),
                          imageRendering: 'pixelated',
                        }}
                      />
                    );
                  })}
                </div>
              );
            })
          )}

          {/* Player sprite. */}
          <ActorSprite atlas={atlas} sprite={player.sprite} x={player.x} y={player.y} />

          {/* Monster sprites (visible only). */}
          {monsters.filter(m => m.hp > 0 && fov.has(`${m.x},${m.y}`)).map(m => (
            <ActorSprite key={m.id} atlas={atlas} sprite={m.sprite} x={m.x} y={m.y} />
          ))}

          {/* Gravestone on player death. */}
          {state.gravestone && (
            <ActorSprite atlas={atlas} sprite="gravestone a" x={state.gravestone.x} y={state.gravestone.y} z={6} />
          )}

          {/* Transient VFX. */}
          {vfxRef.current.map(v => (
            <ActorSprite key={v.id} atlas={atlas} sprite={v.name} x={v.x} y={v.y} z={7} />
          ))}
        </div>
      </div>

      {/* Combat log overlay (bottom-left). */}
      <div style={{
        position: 'absolute', left: 8, bottom: 8, zIndex: 30,
        background: 'rgba(0,0,0,0.65)', color: '#fff',
        padding: '6px 10px', borderRadius: 4,
        fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11,
        maxWidth: 360, lineHeight: 1.35,
      }}>
        {state.log.map((line, i) => <div key={i}>{line}</div>)}
      </div>

      {/* Game-over modal. */}
      {state.gameOver && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            padding: 24,
            background: '#181818', color: '#fff',
            borderRadius: 8, border: '1px solid #444',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
            minWidth: 280,
          }}>
            <h2 style={{ marginTop: 0 }}>You died.</h2>
            <p>Turn {state.turn}. Monsters alive: {aliveMonsters}.</p>
            <button onClick={restart} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActorSprite({ atlas, sprite, x, y, z = 5 }) {
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

function HudPanel({ atlas, player, gaugeName, cstats }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 8px',
      background: 'rgba(0,0,0,0.6)',
      borderRadius: 4,
    }}>
      <div style={{ width: TILE_SIZE, height: TILE_SIZE, position: 'relative' }}>
        <SpriteFrame atlas={atlas} sprite={player.sprite} />
      </div>
      <div style={{ width: TILE_SIZE, height: TILE_SIZE, position: 'relative' }}>
        <SpriteFrame atlas={atlas} sprite={gaugeName} />
      </div>
      <div style={{ color: '#fff', fontSize: 12, fontFamily: 'system-ui, sans-serif' }}>
        <div><strong>{cstats.actionName}</strong></div>
        <div>HP {Math.max(0, player.hp)} / {player.maxHp}</div>
      </div>
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
