/**
 * BootScene.js — loads the atlas + JSON, registers animations, then jumps
 * to whatever scene the save file says we were last in.
 *
 * The atlas is loaded TWICE:
 *   - texture key 'dawnlike0' → DawnlikeAtlas0.png (primary frames)
 *   - texture key 'dawnlike1' → DawnlikeAtlas1.png (alt frames, same JSON)
 *
 * For every sprite with isAnimated:true in the atlas JSON we register a
 * 2-frame anim "anim:<spritename>" that ping-pongs between the two
 * textures at 3 fps — that's how water tiles, candles, the player,
 * and ~2,200 other sprites in the atlas animate.
 *
 * Finally we read save.load() (which bootstraps a seed on first run),
 * stash it in the Phaser registry so every scene can read/write it,
 * scene.launch the UI overlay, and scene.start the saved current scene.
 */

import Phaser from 'phaser';
import { resolveAssetPath } from '../../utils/paths.js';
import { load as loadSave } from '../save.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'Boot' }); }

  preload() {
    // Caller can pass `atlasPaths: { json, atlas0, atlas1 }` via createGame
    // to load the atlas from a custom location (e.g. when this package is
    // consumed and the assets live somewhere other than the storybook's
    // /public dir). Defaults reproduce the storybook behaviour via the
    // existing path resolver.
    const overrides = this.registry.get('atlasPaths') || {};
    const atlasJson = overrides.json   || resolveAssetPath('/DawnlikeAtlas.json');
    const atlas0    = overrides.atlas0 || resolveAssetPath('/DawnlikeAtlas0.png');
    const atlas1    = overrides.atlas1 || resolveAssetPath('/DawnlikeAtlas1.png');

    // First atlas. We also need the JSON object accessible after load() to
    // walk frame metadata, so load it again as a plain JSON.
    this.load.atlas('dawnlike0', atlas0, atlasJson);
    this.load.atlas('dawnlike1', atlas1, atlasJson);
    this.load.json('atlasMeta', atlasJson);
  }

  create() {
    const atlasMeta = this.cache.json.get('atlasMeta');

    // Register a per-sprite anim for every animated frame in the atlas.
    // Two-frame loop alternating Atlas0 ↔ Atlas1.
    const frames = atlasMeta?.byName || {};
    let count = 0;
    for (const [name, info] of Object.entries(frames)) {
      if (!info?.isAnimated) continue;
      const key = `anim:${name}`;
      if (this.anims.exists(key)) continue;
      this.anims.create({
        key,
        frames: [
          { key: 'dawnlike0', frame: name },
          { key: 'dawnlike1', frame: name },
        ],
        frameRate: 3,
        repeat: -1,
      });
      count++;
    }

    // Make atlas + save available to all other scenes via the registry.
    this.registry.set('atlas', atlasMeta);
    this.registry.set('save', loadSave());
    this.registry.set('animCount', count);

    // UI overlay (always on top).
    this.scene.launch('UI');

    // Jump to whatever scene we were last in.
    const save = this.registry.get('save');
    this.scene.start(save.currentScene || 'World');
  }
}
