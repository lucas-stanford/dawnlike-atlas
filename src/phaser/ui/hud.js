/**
 * hud.js — primitives that re-create the MenuExample HUD in Phaser:
 *
 *   - drawFrame(scene, x, y, wTiles, hTiles, family) — 9-slice chrome
 *   - drawGauge(scene, x, y, color, value, segments) — segmented bar
 *   - heartSprite(color, value) — picks the matching atlas frame
 *
 * The atlas only ships nw/n/ne/w/c/e frame parts for each chrome family;
 * we flip those vertically to draw the bottom row, exactly like
 * MenuExample.jsx's <Frame> component.
 *
 * All values are 0..1 fractions. The chrome runs ON TOP of the colored
 * fill, both at the same x,y — same as the React Gauge component.
 */

const TILE = 16;
const PIXEL_SCALE = 2;

export function heartSprite(color, value) {
  if (value >= 0.7) return `${color} heart full`;
  if (value >= 0.4) return `${color} heart half`;
  if (value >= 0.2) return `${color} heart low`;
  if (value >  0)   return `${color} heart sliver`;
  return `${color} heart sliver`;
}

/**
 * Draws a 9-slice chrome frame anchored at (x, y) (top-left) sized in
 * tile-units. Returns a Phaser container so the caller can position the
 * whole thing or destroy it on re-draw.
 */
export function drawFrame(scene, x, y, wTiles, hTiles, family) {
  const c = scene.add.container(x, y);
  for (let yy = 0; yy < hTiles; yy++) {
    for (let xx = 0; xx < wTiles; xx++) {
      const isTop = yy === 0, isBot = yy === hTiles - 1;
      const isL   = xx === 0, isR   = xx === wTiles - 1;
      let part = 'c', flipY = false;
      if (isTop && isL)      part = 'nw';
      else if (isTop && isR) part = 'ne';
      else if (isTop)        part = 'n';
      else if (isBot && isL) { part = 'nw'; flipY = true; }
      else if (isBot && isR) { part = 'ne'; flipY = true; }
      else if (isBot)        { part = 'n';  flipY = true; }
      else if (isL)          part = 'w';
      else if (isR)          part = 'e';
      const img = scene.add.image(
        xx * TILE * PIXEL_SCALE,
        yy * TILE * PIXEL_SCALE,
        'dawnlike0', `${family} ${part}`
      ).setOrigin(0, 0).setScale(PIXEL_SCALE);
      if (flipY) img.setFlipY(true);
      c.add(img);
    }
  }
  return c;
}

/**
 * Draws a segmented gauge anchored at (x, y) (top-left) showing `value`
 * (0..1) using `color`-themed atlas sprites. Returns a container.
 */
export function drawGauge(scene, x, y, color, value, segments = 6) {
  const c = scene.add.container(x, y);
  const segWidth = 1 / segments;
  const pickLevel = (i) => {
    const segStart = i * segWidth, segEnd = (i + 1) * segWidth;
    if (value >= segEnd)  return 'full';
    if (value <= segStart) return null;
    const frac = (value - segStart) / segWidth;
    if (frac > 0.75) return 'full';
    if (frac > 0.5)  return 'most';
    if (frac > 0.25) return 'half';
    return 'low';
  };
  for (let i = 0; i < segments; i++) {
    const level = pickLevel(i);
    if (level) {
      c.add(
        scene.add.image(i * TILE * PIXEL_SCALE, 0, 'dawnlike0', `gauge ${color} ${level}`)
          .setOrigin(0, 0).setScale(PIXEL_SCALE)
      );
    }
  }
  for (let i = 0; i < segments; i++) {
    const part = segments === 1
      ? 'single'
      : i === 0 ? 'left' : i === segments - 1 ? 'right' : 'center';
    c.add(
      scene.add.image(i * TILE * PIXEL_SCALE, 0, 'dawnlike0', `gauge chrome ${part}`)
        .setOrigin(0, 0).setScale(PIXEL_SCALE)
    );
  }
  return c;
}
