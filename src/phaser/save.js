/**
 * save.js — single-key localStorage persistence for the Phaser roguelike.
 *
 * Schema (v1):
 *   {
 *     seed: 123456789,           // generated once on first load, never re-rolled
 *     currentScene: 'World',     // last scene the player was in
 *     positions: {               // last tile coords per scene; null = use default
 *       World: { x, y } | null,
 *       Town:  { x, y } | null,
 *       Dungeon1: { x, y } | null,
 *       Dungeon2: { x, y } | null,
 *       Dungeon3: { x, y } | null,
 *     },
 *     hp: 1.0, mp: 1.0,          // 0..1 fractions for the HUD gauges
 *   }
 *
 * Same seed → identical world forever. Per-scene generators derive their
 * own seeds off this single root (see save.seedFor(sceneKey)).
 */

export const SAVE_KEY = 'dawnlike:roguelike:v1';

export const SCENE_KEYS = ['World', 'Town', 'Dungeon1', 'Dungeon2', 'Dungeon3'];

// Set by `reset()` to suppress any later `save()` calls that the running
// Phaser game might fire after the user clicks "New Game" but before
// `window.location.reload()` actually navigates away. Without this guard,
// a pending async save() can re-create the entry (with the old position
// and currentScene) on top of the freshly-bootstrapped one — the new
// game would then load that stale state instead of a true reset.
let _resetGuard = false;

function emptyPositions() {
  return SCENE_KEYS.reduce((acc, k) => { acc[k] = null; return acc; }, {});
}

function bootstrap() {
  return {
    seed: Math.floor(Math.random() * 1e9),
    currentScene: 'World',
    positions: emptyPositions(),
    hp: 1.0,
    mp: 1.0,
  };
}

function safeStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch (_) {
    return null;
  }
}

export function load() {
  const ls = safeStorage();
  if (!ls) return bootstrap();
  try {
    const raw = ls.getItem(SAVE_KEY);
    if (!raw) {
      const fresh = bootstrap();
      ls.setItem(SAVE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw);
    // Defensive merge — if the stored blob is from an older minor version
    // that's missing fields, fill them in rather than crash.
    return {
      seed: typeof parsed.seed === 'number' ? parsed.seed : Math.floor(Math.random() * 1e9),
      currentScene: SCENE_KEYS.includes(parsed.currentScene) ? parsed.currentScene : 'World',
      positions: { ...emptyPositions(), ...(parsed.positions || {}) },
      hp: typeof parsed.hp === 'number' ? parsed.hp : 1.0,
      mp: typeof parsed.mp === 'number' ? parsed.mp : 1.0,
    };
  } catch (_) {
    return bootstrap();
  }
}

export function save(partial) {
  if (_resetGuard) return;
  const ls = safeStorage();
  if (!ls) return;
  const current = load();
  const next = {
    ...current,
    ...partial,
    positions: { ...current.positions, ...(partial?.positions || {}) },
  };
  try {
    ls.setItem(SAVE_KEY, JSON.stringify(next));
  } catch (_) { /* quota / private mode — ignore */ }
}

export function reset() {
  _resetGuard = true;
  const ls = safeStorage();
  if (!ls) return;
  try { ls.removeItem(SAVE_KEY); } catch (_) { /* ignore */ }
}

/**
 * Derived seed for a particular scene. Single source of randomness so two
 * playthroughs with the same root seed produce identical maps in every
 * scene.
 */
export function seedFor(sceneKey, rootSeed) {
  switch (sceneKey) {
    case 'World':    return rootSeed;
    case 'Town':     return rootSeed + 1;
    case 'Dungeon1': return rootSeed + 101;
    case 'Dungeon2': return rootSeed + 102;
    case 'Dungeon3': return rootSeed + 103;
    default:         return rootSeed;
  }
}
