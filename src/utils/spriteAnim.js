/**
 * Shared 2-frame tile animation helpers for the DOM-rendered
 * Storybook examples. Phaser scenes have their own animation
 * pipeline (BootScene.js registers a Phaser.Anim per sprite); this
 * module gives the React/DOM examples the same effect through a
 * pure-CSS opacity flicker (see spriteAnim.css for the gritty bits).
 *
 * Usage:
 *   1. Import the stylesheet once per example:
 *        import './utils/spriteAnim.css';
 *   2. Spread `dawnlikeAnimVars` onto any ancestor of your sprite
 *      tiles (e.g. the outer viewport `<div>`):
 *        <div style={{ ...dawnlikeAnimVars, ... }} />
 *   3. For each tile sprite, call `tileSpriteProps(atlas, name)` to
 *      get a `{ className, style }` bag. When the sprite is marked
 *      `isAnimated: true` in the atlas JSON, the helper returns
 *      `className: 'dawnlike-tile-anim'` and omits inline
 *      `background-image` so the class can drive it (frame 0 stays
 *      on the element; frame 1 fades in over the top via ::after).
 */

import { resolveAssetPath } from './paths';

export const DAWNLIKE_ATLAS_0_URL = resolveAssetPath('/DawnlikeAtlas0.png');
export const DAWNLIKE_ATLAS_1_URL = resolveAssetPath('/DawnlikeAtlas1.png');

export const dawnlikeAnimVars = {
  '--dawnlike-atlas-0': `url("${DAWNLIKE_ATLAS_0_URL}")`,
  '--dawnlike-atlas-1': `url("${DAWNLIKE_ATLAS_1_URL}")`,
};

export function isAnimatedSprite(atlas, name) {
  return Boolean(atlas?.byName?.[name]?.isAnimated);
}

/**
 * Build a `{ className, style }` bag for a tile-sized sprite render.
 * When the sprite is animated the returned style intentionally omits
 * `backgroundImage` so the `.dawnlike-tile-anim` class can drive it.
 *
 * @param {object} atlas - the DawnlikeAtlas.json metadata
 * @param {string} name  - sprite name (key into atlas.byName)
 * @param {object} [opts]
 * @param {number} [opts.scale=1] - extra render scale (e.g. MenuExample uses 1.5)
 * @param {object} [opts.extraStyle] - merged into the returned style
 */
export function tileSpriteProps(atlas, name, opts = {}) {
  const { scale = 1, extraStyle } = opts;
  const sprite = atlas?.byName?.[name];
  if (!sprite) return null;
  const animated = !!sprite.isAnimated;
  const style = {
    backgroundPosition: `-${sprite.x * scale}px -${sprite.y * scale}px`,
    backgroundSize: `${atlas.meta.size.w * scale}px ${atlas.meta.size.h * scale}px`,
    imageRendering: 'pixelated',
    ...extraStyle,
  };
  if (!animated) {
    style.backgroundImage = `url("${DAWNLIKE_ATLAS_0_URL}")`;
  }
  return {
    className: animated ? 'dawnlike-tile-anim' : undefined,
    style,
  };
}
