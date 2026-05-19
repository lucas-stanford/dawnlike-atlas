/**
 * dawnlike-atlas/roguelike/phaser — drop-in Phaser 3/4 implementation of the
 * generators + autotile + per-scene movement/transition pipeline.
 *
 * Minimal example:
 *
 *   import { createGame } from 'dawnlike-atlas/roguelike/phaser';
 *   const game = createGame(document.getElementById('host'), {
 *     width: 800, height: 696,
 *     manifests: {
 *       world:   { treeThreshold: 0.3, decorChance: 0.06 },
 *       town:    { buildingCount: { min: 6, max: 8 } },
 *       dungeon: { dugPercentage: 0.4 },
 *     },
 *   });
 *
 * Subclass the exported scene classes if you need to customize rendering,
 * input, or transitions further.
 *
 * Repo source:
 *   https://github.com/lucas-stanford/dawnlike-atlas/tree/master/src/phaser
 */

export { createGame }    from '../src/phaser/index.js';
export { default as BootScene }    from '../src/phaser/scenes/BootScene.js';
export { default as MapScene }     from '../src/phaser/scenes/MapScene.js';
export { default as WorldScene }   from '../src/phaser/scenes/WorldScene.js';
export { default as TownScene }    from '../src/phaser/scenes/TownScene.js';
export { default as DungeonScene } from '../src/phaser/scenes/DungeonScene.js';
export { default as UIScene, HUD_HEIGHT } from '../src/phaser/scenes/UIScene.js';
