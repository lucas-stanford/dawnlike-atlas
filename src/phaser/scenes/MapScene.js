/**
 * MapScene.js — shared base for World/Town/Dungeon scenes.
 *
 * Handles:
 *   - rendering a generator output via autotileRender (one Phaser image per
 *     layer per tile, plus animated sprites for `isAnimated` frames)
 *   - spawning the player at a save-restored position
 *   - per-tile arrow / WASD movement with a quick tween
 *   - on-step marker callbacks
 *   - transitionTo(targetScene, spawnPos) that persists state then starts
 *     the next scene
 *
 * Subclasses provide:
 *   - this.SCENE_KEY        (string, e.g. 'World')
 *   - this.generate()       → { width, height, tiles, markers, walkable }
 *   - this.renderTileLayers(tiles, x, y, byName) → [{ name, z }]
 *   - this.defaultSpawn(map)         → { x, y }
 *   - this.handleMarker(marker, map) → void  (transitions on stairs/doors/etc)
 */

import Phaser from 'phaser';
import { HUD_HEIGHT } from './UIScene.js';
import { save as persistSave } from '../save.js';

const TILE = 32;

export default class MapScene extends Phaser.Scene {
  constructor(key) {
    super({ key });
    this.SCENE_KEY = key;
  }

  init(data) {
    // Subclasses may receive a spawn hint via scene.start(key, { spawn }).
    this.spawnHint = data?.spawn || null;
    // Phaser reuses scene instances across scene.start() calls. If the
    // previous run of this scene was interrupted mid-tween or mid-transition
    // (held-key tween killed by scene shutdown, fade-out scene.start, etc.)
    // these flags can remain true, which would freeze the player on
    // re-entry. Defensively reset all per-run state every time the scene
    // boots so we never inherit stale flags.
    this.moving = false;
    this.transitioning = false;
    this.previousTile = null;
  }

  create() {
    const save = this.registry.get('save');
    const atlas = this.registry.get('atlas');

    const map = this.generate(save);
    this.map = map;

    // Constrain the map camera to the band BELOW the HUD strip so the
    // HUD never overlaps map tiles. Tiles render at their native 32px
    // (the atlas is 32x32 nearest-neighbour upscaled from 16x16), so no
    // camera zoom is needed to fill the canvas.
    const canvasW = this.scale.width;
    const canvasH = this.scale.height;
    this.cameras.main.setViewport(0, HUD_HEIGHT, canvasW, canvasH - HUD_HEIGHT);
    // Start at the persisted zoom (so re-entering a scene keeps the
    // user's preferred zoom across transitions and refreshes).
    const savedZoom = this.registry.get('mapZoom') ?? 1;
    this.cameras.main.setZoom(savedZoom);
    this.targetZoom = savedZoom;
    this.cameras.main.setBackgroundColor('#000');
    this.cameras.main.setRoundPixels(true);

    // Render every tile, layer by layer. Static layers use add.image (cheap);
    // any layer whose sprite is flagged isAnimated gets an add.sprite +
    // play('anim:<name>') so it cycles between Atlas0 and Atlas1 frames.
    // Sprites are added directly to the scene (not nested in a container)
    // so their setDepth values compete with the player's depth — without
    // this, signs at z=5.5 (depth 55) would still render under the player
    // (depth 50) because container children can only beat each other.
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const layers = this.renderTileLayers(map.tiles, x, y, atlas.byName);
        for (const layer of layers) {
          const info = atlas.byName[layer.name];
          if (!info) continue;
          const px = x * TILE + TILE / 2;
          const py = y * TILE + TILE / 2;
          let obj;
          if (info.isAnimated && this.anims.exists(`anim:${layer.name}`)) {
            obj = this.add.sprite(px, py, 'dawnlike0', layer.name).play(`anim:${layer.name}`);
          } else {
            obj = this.add.image(px, py, 'dawnlike0', layer.name);
          }
          obj.setDepth(layer.z * 10);
        }
      }
    }

    // Camera bounds = map size.
    this.cameras.main.setBounds(0, 0, map.width * TILE, map.height * TILE);

    // --- Player ---
    const spawn = this.resolveSpawn(map);
    this.playerTile = { x: spawn.x, y: spawn.y };
    this.player = this.add.sprite(
      spawn.x * TILE + TILE / 2,
      spawn.y * TILE + TILE / 2,
      'dawnlike0', 'knight'
    ).setDepth(50);
    if (this.anims.exists('anim:knight')) this.player.play('anim:knight');
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

    // --- Input ---
    // Held keys move continuously (polled in update()); we still keep a
    // one-shot keydown handler for the very first press so tap-to-step
    // feels instant.
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.input.keyboard.on('keydown-LEFT',  () => this.tryMove(-1, 0));
    this.input.keyboard.on('keydown-RIGHT', () => this.tryMove( 1, 0));
    this.input.keyboard.on('keydown-UP',    () => this.tryMove( 0,-1));
    this.input.keyboard.on('keydown-DOWN',  () => this.tryMove( 0, 1));
    this.input.keyboard.on('keydown-A',     () => this.tryMove(-1, 0));
    this.input.keyboard.on('keydown-D',     () => this.tryMove( 1, 0));
    this.input.keyboard.on('keydown-W',     () => this.tryMove( 0,-1));
    this.input.keyboard.on('keydown-S',     () => this.tryMove( 0, 1));

    this.initZoomInput();

    // --- HUD update ---
    this.game.events.emit('hud-update', { area: this.areaLabel() });

    // NB: we intentionally do NOT auto-trigger a marker on first frame.
    // Players legitimately spawn on stairs/exit tiles (that's how they
    // arrive in a scene) — auto-firing would loop straight back out.
    // Markers only fire when the player steps onto them mid-play.
  }

  /**
   * Restore from save → spawn hint → subclass default, in that order.
   * If the saved position happens to be a transition marker, fall back
   * to defaultSpawn — old saves from before this fix could land us on a
   * marker tile (and then any direction step would re-trigger it via
   * tryMove). Spawn hints from transitionTo() may legitimately land on
   * a marker (e.g. dungeon stairs) and are allowed through.
   */
  resolveSpawn(map) {
    const save = this.registry.get('save');
    const stored = save?.positions?.[this.SCENE_KEY];
    const onMarker = (p) => !!map.tiles[p.y]?.[p.x]?.marker;
    if (stored && map.walkable(stored.x, stored.y) && !onMarker(stored)) return stored;
    if (this.spawnHint && map.walkable(this.spawnHint.x, this.spawnHint.y)) return this.spawnHint;
    return this.defaultSpawn(map);
  }

  // Kept for backward compat — not currently called by MapScene itself
  // (the marker check is now inlined inside tryMove's tween onComplete).
  checkMarkerOnTile(x, y) {
    const t = this.map.tiles[y]?.[x];
    if (t?.marker) this.handleMarker(t.marker, this.map);
  }

  tryMove(dx, dy) {
    // Refuse new input while a transition is mid-fade or a tween is in
    // flight. Without the transitioning gate, the update()-loop polling
    // held keys would happily keep walking the player PAST a marker tile
    // during the 180ms camera fade-out (the marker's onComplete already
    // set this.moving=false before kicking off the fade), so the user
    // ends up two or three tiles past where they should have transitioned.
    if (this.moving || this.transitioning) return;
    const tx = this.playerTile.x + dx;
    const ty = this.playerTile.y + dy;
    if (!this.map.walkable(tx, ty)) return;
    this.moving = true;
    // Remember where we came FROM so that if this step lands on a
    // transition marker, we can persist the previous tile as our
    // "position in this scene" — otherwise we'd spawn back on the
    // marker on re-entry and immediately re-trigger the transition
    // (= infinite loop / crash).
    const sourceTile = { ...this.playerTile };
    this.playerTile = { x: tx, y: ty };
    this.tweens.add({
      targets: this.player,
      x: tx * TILE + TILE / 2,
      y: ty * TILE + TILE / 2,
      duration: 70,
      ease: 'Linear',
      onComplete: () => {
        this.moving = false;
        const landed = this.map.tiles[ty]?.[tx];
        if (landed?.marker) {
          // Save the tile we came from (so reload/re-entry doesn't
          // spawn us on the marker), then trigger the handler.
          this.previousTile = sourceTile;
          this.persistPosition(sourceTile);
          this.handleMarker(landed.marker, this.map);
        } else {
          this.previousTile = null;
          this.persistPosition();
        }
      },
    });
  }

  /**
   * Per-frame poll: if any movement key is HELD and the player isn't
   * mid-tween, attempt another step in that direction. This makes
   * holding a direction key walk continuously, rather than relying on
   * the OS's keyboard auto-repeat (which has a long initial delay).
   * Also smoothly lerps camera zoom toward the user-set target zoom.
   */
  update() {
    this.stepZoom();
    if (this.moving || this.transitioning || !this.cursors) return;
    const k = this.cursors, w = this.wasd;
    if (k.left.isDown  || w.left.isDown)  return this.tryMove(-1, 0);
    if (k.right.isDown || w.right.isDown) return this.tryMove( 1, 0);
    if (k.up.isDown    || w.up.isDown)    return this.tryMove( 0,-1);
    if (k.down.isDown  || w.down.isDown)  return this.tryMove( 0, 1);
  }

  /**
   * Wire scroll-wheel and pinch (two-finger) gestures to the camera
   * zoom. Both gestures target `this.targetZoom`; the actual camera
   * zoom is lerped toward it each frame in stepZoom() for smoothness.
   *
   * Clamped to [ZOOM_MIN, ZOOM_MAX] (0.5x .. 3x) so the player can't
   * zoom out past the camera bounds (Phaser handles that for us once
   * the camera bounds are set) or zoom in past unreadable pixel mush.
   * The target zoom is mirrored into the game registry so it survives
   * scene transitions and is restored on the next create().
   */
  initZoomInput() {
    const ZOOM_MIN = 0.5;
    const ZOOM_MAX = 3;
    const WHEEL_STEP = 0.0012;  // tuned for both trackpads and mousewheels

    const setTargetZoom = (z) => {
      this.targetZoom = Phaser.Math.Clamp(z, ZOOM_MIN, ZOOM_MAX);
      this.game.registry.set('mapZoom', this.targetZoom);
    };

    // Mouse / trackpad wheel — uses a DOM listener with passive:false
    // so we can call preventDefault and stop the host page from
    // scrolling while the user zooms over the canvas. Phaser's own
    // 'wheel' event is passive on canvas by default which makes
    // preventDefault a no-op.
    const onWheel = (event) => {
      event.preventDefault();
      // deltaY > 0 = scroll-down → zoom OUT. Trackpads send small
      // continuous values, mousewheels send chunky ±100 ticks; the
      // multiplicative form keeps both natural.
      setTargetZoom(this.targetZoom * (1 - event.deltaY * WHEEL_STEP));
    };
    const canvas = this.game.canvas;
    canvas.addEventListener('wheel', onWheel, { passive: false });

    // Touch pinch — Phaser exposes pointer1 + pointer2 directly. We
    // sample the distance between them and translate the delta into
    // a multiplicative zoom factor. Sensitivity matches the wheel
    // step so trackpad pinch and touch pinch feel similar.
    this._pinchPrevDist = null;
    const onPointerMove = () => {
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;
      if (!p1?.isDown || !p2?.isDown) {
        this._pinchPrevDist = null;
        return;
      }
      const dx = p1.position.x - p2.position.x;
      const dy = p1.position.y - p2.position.y;
      const dist = Math.hypot(dx, dy);
      if (this._pinchPrevDist != null && this._pinchPrevDist > 0) {
        const ratio = dist / this._pinchPrevDist;
        setTargetZoom(this.targetZoom * ratio);
      }
      this._pinchPrevDist = dist;
    };
    const onPointerUp = () => { this._pinchPrevDist = null; };
    this.input.on('pointermove', onPointerMove);
    this.input.on('pointerup', onPointerUp);
    this.input.on('pointerupoutside', onPointerUp);

    // Make sure multi-touch is enabled so pointer2 fires.
    this.input.addPointer(1);

    // Detach listeners on scene shutdown so they don't double up when
    // Phaser reuses the scene instance.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      canvas.removeEventListener('wheel', onWheel);
      this.input.off('pointermove', onPointerMove);
      this.input.off('pointerup', onPointerUp);
      this.input.off('pointerupoutside', onPointerUp);
    });
  }

  /**
   * Lerp the camera's zoom toward this.targetZoom each frame. The
   * lerp factor is generous (0.2) so the zoom feels responsive but
   * not jittery; tiny deltas snap so we don't waste frames at the
   * fractional tail.
   */
  stepZoom() {
    const cam = this.cameras.main;
    if (!cam || this.targetZoom == null) return;
    const cur = cam.zoom;
    const tgt = this.targetZoom;
    if (Math.abs(cur - tgt) < 0.001) {
      if (cur !== tgt) cam.setZoom(tgt);
      return;
    }
    cam.setZoom(cur + (tgt - cur) * 0.2);
  }

  persistPosition(overrideTile) {
    const tile = overrideTile || this.playerTile;
    const save = this.registry.get('save');
    const next = {
      ...save,
      currentScene: this.SCENE_KEY,
      positions: { ...save.positions, [this.SCENE_KEY]: { ...tile } },
    };
    this.registry.set('save', next);
    // Write through to localStorage on every step so a refresh always
    // returns the player to where they actually are. MUST be synchronous
    // — a dynamic import here creates a microtask that can race with
    // resetSave() during "New Game" and resurrect stale state.
    persistSave({
      currentScene: this.SCENE_KEY,
      positions: { [this.SCENE_KEY]: { ...tile } },
    });
  }

  /**
   * Persist + jump to another scene. `targetSpawn` is where the player
   * appears in the target scene (overrides any saved position). The
   * source-scene position written here is the tile the player was on
   * BEFORE stepping on the transition marker, not the marker itself, so
   * re-entering the source scene doesn't immediately re-trigger.
   */
  transitionTo(targetSceneKey, targetSpawn) {
    // Lock out further movement immediately. Without this, update()
    // would keep stepping the player through the 180ms fade-out window,
    // letting them walk PAST the marker that just fired (and possibly
    // off the map or onto another marker).
    if (this.transitioning) return;
    this.transitioning = true;
    // Cancel any in-flight tween targeting the player so they snap to
    // their logical tile rather than drifting visually mid-fade.
    this.tweens.killTweensOf(this.player);

    const sourcePos = this.previousTile || this.playerTile;
    const save = this.registry.get('save');
    const next = {
      ...save,
      currentScene: targetSceneKey,
      positions: {
        ...save.positions,
        [this.SCENE_KEY]: { ...sourcePos },
        [targetSceneKey]: targetSpawn ? { ...targetSpawn } : save.positions[targetSceneKey],
      },
    };
    this.registry.set('save', next);
    persistSave({
      currentScene: targetSceneKey,
      positions: {
        [this.SCENE_KEY]: { ...sourcePos },
        [targetSceneKey]: targetSpawn ? { ...targetSpawn } : undefined,
      },
    });
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(targetSceneKey, { spawn: targetSpawn });
    });
  }

  // ===== Subclass hooks =====
  generate(/* save */) { throw new Error('MapScene.generate() must be implemented'); }
  renderTileLayers(/* tiles, x, y, byName */) { throw new Error('MapScene.renderTileLayers() must be implemented'); }
  defaultSpawn(/* map */) { return { x: 1, y: 1 }; }
  handleMarker(/* marker, map */) { /* no-op by default */ }
  areaLabel() { return this.SCENE_KEY; }
}
