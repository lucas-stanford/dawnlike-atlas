/**
 * dawnlike-atlas/roguelike/save — localStorage persistence helpers
 * shared between scenes. Use these if you bring your own scene
 * implementations but want to share the seed/position/HUD save shape.
 *
 * Repo source:
 *   https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/save.js
 */

export {
  load,
  save,
  reset,
  seedFor,
  SAVE_KEY,
  SCENE_KEYS,
} from '../src/phaser/save.js';
