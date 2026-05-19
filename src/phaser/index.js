/**
 * index.js — single entry point that builds the Phaser.Game instance and
 * mounts it into a host DOM element.
 *
 * Scene roster:
 *   Boot      → preload + anim register
 *   World     → overworld
 *   Town      → town
 *   Dungeon1  ┐
 *   Dungeon2  ├ same class (DungeonScene), three instances
 *   Dungeon3  ┘
 *   UI        → HUD overlay (launched in parallel from Boot)
 *
 * Returns the Phaser.Game; the React wrapper calls .destroy(true) on
 * unmount.
 */

import Phaser from 'phaser';
import BootScene    from './scenes/BootScene.js';
import WorldScene   from './scenes/WorldScene.js';
import TownScene    from './scenes/TownScene.js';
import DungeonScene from './scenes/DungeonScene.js';
import UIScene      from './scenes/UIScene.js';

/**
 * Create the Phaser roguelike game.
 *
 * @param {HTMLElement|string} parent  Host element (or DOM id) Phaser mounts into.
 * @param {Object} [options]
 * @param {number} [options.width=800]   Canvas width in CSS pixels.
 * @param {number} [options.height=600]  Canvas height in CSS pixels.
 * @param {Object} [options.manifests]   Per-scene generator manifest overrides.
 * @param {import('./generators/world.js').WorldManifest}     [options.manifests.world]
 * @param {import('./generators/town.js').TownManifest}       [options.manifests.town]
 * @param {import('./generators/dungeon.js').DungeonManifest} [options.manifests.dungeon]
 * @param {Object} [options.atlasPaths]  Override the URLs the BootScene loads.
 * @param {string} [options.atlasPaths.json]
 * @param {string} [options.atlasPaths.atlas0]
 * @param {string} [options.atlasPaths.atlas1]
 * @returns {Phaser.Game}
 */
export function createGame(parent, {
  width = 800,
  height = 600,
  manifests = {},
  atlasPaths = null,
} = {}) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    pixelArt: true,
    backgroundColor: '#0a0a0a',
    scale: { mode: Phaser.Scale.NONE },
    // preBoot fires BEFORE any scene preload runs, so it's the earliest
    // safe place to seed registry values that the BootScene needs.
    callbacks: {
      preBoot: (g) => {
        g.registry.set('manifests', manifests);
        if (atlasPaths) g.registry.set('atlasPaths', atlasPaths);
      },
    },
    scene: [
      BootScene,
      WorldScene,
      TownScene,
      class Dungeon1 extends DungeonScene { constructor() { super('Dungeon1'); } },
      class Dungeon2 extends DungeonScene { constructor() { super('Dungeon2'); } },
      class Dungeon3 extends DungeonScene { constructor() { super('Dungeon3'); } },
      UIScene,
    ],
  });
  if (typeof window !== 'undefined') {
    window.__phaserGame = game;
  }
  return game;
}
