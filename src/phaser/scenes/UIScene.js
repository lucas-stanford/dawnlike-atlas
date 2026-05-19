/**
 * UIScene.js — top-band HUD that sits in its own 96px strip ABOVE the
 * map area, never overlapping it. The UI camera viewport is locked to
 * (0,0,canvasW,HUD_HEIGHT) and map scenes camera-clip to (0,HUD_HEIGHT,
 * canvasW, mapH) so the two regions never fight for the same pixels.
 *
 * Horizontal layout inside the strip:
 *   [9-slice chrome frame spans the whole strip]
 *     red heart + HP gauge (4 segments)
 *     blue heart + MP gauge (4 segments)
 *     area label (centered-ish)
 *     [ New Game ] button (right)
 *     hint (below button)
 */

import Phaser from 'phaser';
import { drawFrame, drawGauge, heartSprite } from '../ui/hud.js';
import { reset as resetSave } from '../save.js';

const TILE = 32;
const SCALE = 1;

// Total HUD height in pixels — matches the canvas-top band reserved by
// the map scenes' camera viewports.
export const HUD_HEIGHT = 96;

export default class UIScene extends Phaser.Scene {
  constructor() { super({ key: 'UI', active: false }); }

  create() {
    this.scene.bringToTop();

    // Phaser scene instances are reused across scene.start/launch cycles
    // (e.g. when the player clicks "New Game" and we relaunch Boot, the
    // UI instance is the same object). The 'hud-update' listener added
    // below is on the GAME-level event emitter, which is shared across
    // scene restarts — without this removeAllListeners it would
    // accumulate one duplicate per restart, firing redraw() N times per
    // event.
    this.game.events.off('hud-update');

    const canvasW = this.scale.width;
    // Constrain the UI camera to the top strip ONLY — anything drawn
    // below y=HUD_HEIGHT here would be clipped away, but we keep all UI
    // content above that line anyway.
    this.cameras.main.setViewport(0, 0, canvasW, HUD_HEIGHT);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setBackgroundColor('#1a1410');

    // Chrome frame spans the whole HUD strip (3 tiles tall × N tiles
    // wide). Tile pixel size = TILE * SCALE = 32; HUD strip = 3 tiles.
    // (TILE is the atlas tile size in pixels; SCALE is the chrome's
    // pixel multiplier — kept at 1 since the atlas is already 32px.)
    const tilesWide = Math.floor(canvasW / (TILE * SCALE));
    this.frame = drawFrame(this, 0, 0, tilesWide, 3, 'gray white');

    // Inner content baseline — left edge of the frame interior.
    const innerX = TILE * SCALE + 4;
    const rowY   = TILE * SCALE - 12;   // first row centered in upper half
    const row2Y  = TILE * SCALE + 14;   // second row centered in lower half

    // Row 1: red heart + HP gauge (4-segment).
    this.heartRow = this.add.container(innerX, rowY);
    // Row 2: blue heart + MP gauge.
    this.mpRow    = this.add.container(innerX, row2Y);

    // Area label sits to the right of the gauges, vertically centered.
    const labelX = innerX + (TILE * SCALE) + (4 * TILE * SCALE) + 24;
    this.areaLabel = this.add.text(labelX, TILE * SCALE - 6, '', {
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      fontSize: '12px',
      color: '#3a2614',
    });

    // Right-aligned button + hint.
    const rightX = canvasW - 24;
    this.newGameBtn = this.add.text(rightX, rowY, '[ New Game ]', {
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      fontSize: '10px',
      color: '#ff9090',
      backgroundColor: '#22151a',
      padding: { left: 6, right: 6, top: 4, bottom: 4 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.newGameBtn.on('pointerdown', () => this.confirmNewGame());

    this.hint = this.add.text(rightX, row2Y + 4,
      'WASD/Arrows', {
        fontFamily: '"Silkscreen", "Press Start 2P", "Courier New", monospace',
        fontSize: '10px',
        color: '#3a2614',
      }
    ).setOrigin(1, 0);

    // React to hud-update messages from map scenes.
    this.game.events.on('hud-update', (data) => this.redraw(data));

    // Initial paint from the save file.
    const save = this.registry.get('save') || { hp: 1.0, mp: 1.0 };
    this.redraw({ hp: save.hp, mp: save.mp, area: this.firstAreaLabel() });
  }

  firstAreaLabel() {
    const save = this.registry.get('save');
    if (!save) return '';
    if (save.currentScene === 'World') return 'Overworld';
    if (save.currentScene === 'Town')  return 'Town';
    if (save.currentScene?.startsWith('Dungeon')) {
      return `Dungeon — Level ${save.currentScene.replace('Dungeon', '')}`;
    }
    return save.currentScene || '';
  }

  redraw({ hp, mp, area } = {}) {
    const save = this.registry.get('save') || { hp: 1.0, mp: 1.0 };
    const useHp = typeof hp === 'number' ? hp : save.hp;
    const useMp = typeof mp === 'number' ? mp : save.mp;

    this.heartRow?.removeAll(true);
    this.mpRow?.removeAll(true);

    const heart = this.add.image(0, 0, 'dawnlike0', heartSprite('red', useHp))
      .setOrigin(0, 0).setScale(SCALE);
    const gauge = drawGauge(this, 0, 0, 'red', useHp, 4);
    gauge.setPosition(TILE * SCALE + 4, 0);
    this.heartRow.add([heart, gauge]);

    const heartB = this.add.image(0, 0, 'dawnlike0', heartSprite('blue', useMp))
      .setOrigin(0, 0).setScale(SCALE);
    const gaugeB = drawGauge(this, 0, 0, 'blue', useMp, 4);
    gaugeB.setPosition(TILE * SCALE + 4, 0);
    this.mpRow.add([heartB, gaugeB]);

    if (area !== undefined && area !== null) this.areaLabel.setText(area);
  }

  confirmNewGame() {
    if (typeof window !== 'undefined' && window.confirm) {
      const ok = window.confirm('Start a new game? Current world will be lost.');
      if (!ok) return;
    }
    // Wipe the save first. The reset guard inside save.js then no-ops
    // any further save() calls from the still-running Phaser game, so
    // pending tween-onComplete writes can't race with the reload and
    // resurrect the old position / currentScene. Then destroy the game
    // (which stops scene update() ticks immediately) and navigate with
    // a `dawnlike-newgame=1` URL flag — BootScene honours that flag on
    // the next boot and calls reset() once more before loadSave(), so
    // even if some other write managed to slip in after destroy but
    // before navigation, the fresh boot still starts from scratch.
    resetSave();
    if (this.game) this.game.destroy(true);
    if (typeof window !== 'undefined' && window.location) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('dawnlike-newgame', '1');
        window.location.replace(url.toString());
      } catch (_) {
        window.location.reload();
      }
    }
  }
}
