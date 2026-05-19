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

export function createGame(parent, { width = 800, height = 600 } = {}) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    pixelArt: true,
    backgroundColor: '#0a0a0a',
    scale: { mode: Phaser.Scale.NONE },
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
