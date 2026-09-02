/**
 * roofs — the roof that lifts the moment you walk in.
 *
 * A top-down town has a problem no dungeon has: a building drawn as walls
 * and a floor is a building you can see the whole inside of from the
 * street. Every shop's furniture, every NPC, every rug is on display
 * before you have opened the door, and the settlement reads as a set of
 * open-topped boxes rather than as houses.
 *
 * The fix is to draw a roof ON TOP of each building — above the player and
 * everything else in the world — and hide that one building's roof while
 * the player is standing inside it. Walking through a doorway then does
 * what it does in Zelda or Stardew: the lid comes off, the room is
 * revealed, and it goes back on behind you.
 *
 * Three decisions in here are load-bearing, and each one is the fix for
 * something that looked wrong:
 *
 * 1. **The roof is a (w-1)x(h-1) block drawn half a tile down-right.**
 *    Not a w*h block drawn square on the footprint. The half-tile shift
 *    (`ROOF_OFFSET_RATIO`) lands the roof's edges on the MIDDLE of the
 *    wall tiles, so the roof overhangs halfway onto the wall and reads as
 *    sitting on top of it — with the outer half of the wall, and the
 *    doorway, still showing. A roof that stops dead on its own footprint
 *    covers the walls completely and the building reads as a flat
 *    coloured rectangle.
 *
 * 2. **`roofBuildingId` tags the WHOLE footprint; `roofName` only the
 *    inset block.** The doorway and the walls are part of the building for
 *    the purposes of "am I inside?" even though no roof tile is drawn on
 *    them. That is what makes the roof lift the instant you step onto the
 *    threshold rather than one tile later, standing in a room you cannot
 *    see.
 *
 * 3. **Roofs are recoloured per theme, and the constraint that matters is
 *    separation from the GROUND the buildings stand on** — not prettiness.
 *    Roof and grass sharing a hue makes a town read as coloured rectangles,
 *    and luminance alone will not save it: the dawn theme's terracotta is
 *    only 15 apart from its grass in luminance but 119 apart in RGB
 *    distance, and reads perfectly. See `ROOF_THEMES` for the measurements.
 *
 * Engine-agnostic on purpose. `stampRoofs` only writes two fields onto
 * whatever tile objects you hand it, and the renderer helpers return plain
 * numbers — so the same module drives the Phaser scenes in this repo, a
 * 2D-canvas renderer, or an offline map-preview script, without any of
 * them keeping their own copy of the tint table. A mirrored constant is
 * exactly the kind of drift that makes previews untrustworthy.
 */

import { resolveDawnLikeFloorName } from './autotile.js';

/**
 * Theme → the floor family a roof is drawn from, and the tint it is
 * recoloured with.
 *
 * Tints MULTIPLY (that is what Phaser's `setTint` and a canvas
 * `multiply` composite both do), so a tint can only ever darken the
 * base. Pick colours on that understanding rather than expecting one to
 * brighten anything.
 *
 * `distance` records the measured mean RGB distance between the tinted
 * roof and that theme's ground tile — the number these colours were
 * actually chosen against. It is documentation, not input.
 */
export const ROOF_THEMES = {
  // Terracotta on morning grass.
  town:       { base: 'morning brick floor', tint: 0xff9e7a, distance: 119 },
  // Cool slate on morning stone.
  dwarf_hold: { base: 'dusk brick floor',    tint: 0x9aa6c0, distance: 177 },
  // Russet timber on morning grass. This was a mossy green once — the same
  // hue AND the same value as the grass, 52 apart, and the buildings
  // vanished into the lawn.
  elf_glade:  { base: 'morning tile floor',  tint: 0xb07048, distance: 95 },
};

/** Fallback theme for anything not in `ROOF_THEMES`. */
export const DEFAULT_ROOF_THEME = 'town';

/** Theme → roof tint, for callers that only want the colour table. */
export const ROOF_TINT_BY_THEME = Object.fromEntries(
  Object.entries(ROOF_THEMES).map(([k, v]) => [k, v.tint]),
);

export const DEFAULT_ROOF_TINT = ROOF_THEMES[DEFAULT_ROOF_THEME].tint;
export const DEFAULT_ROOF_BASE = ROOF_THEMES[DEFAULT_ROOF_THEME].base;

/** Resolve a theme, falling back to the dawn-realm terracotta. */
export function roofThemeFor(theme) {
  return ROOF_THEMES[theme] ?? ROOF_THEMES[DEFAULT_ROOF_THEME];
}

/** Resolve a theme's tint as a 0xRRGGBB number. */
export function roofTintForTheme(theme) {
  return roofThemeFor(theme).tint;
}

/** Resolve the floor family a theme's roofs are autotiled from. */
export function roofBaseForTheme(theme) {
  return roofThemeFor(theme).base;
}

/**
 * The same tint as per-channel multipliers in 0..1, for renderers that
 * composite pixels themselves rather than handing a colour to Phaser.
 *
 * @returns {[number, number, number]} r, g, b — each 0..1
 */
export function roofTintChannels(theme) {
  const hex = roofTintForTheme(theme);
  return [((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255];
}

/** The same tint as a CSS colour, for DOM and 2D-canvas renderers. */
export function roofTintCss(theme) {
  return `#${roofTintForTheme(theme).toString(16).padStart(6, '0')}`;
}

/**
 * How far the roof block is inset from the footprint, in tiles per side.
 * The roof covers `(w - ROOF_INSET) x (h - ROOF_INSET)` tiles.
 */
export const ROOF_INSET = 1;

/**
 * How far down-right the roof is drawn, as a fraction of a tile. Half a
 * tile puts the roof's edge on the middle of the wall. Paired with
 * `ROOF_INSET = 1` this is what produces the overhang — change one and
 * you must change the other.
 */
export const ROOF_OFFSET_RATIO = 0.5;

/**
 * The draw offset in pixels for a given tile size. Add this to BOTH the x
 * and y you would otherwise draw the roof tile at.
 *
 * @param {number} tileSize - pixels per tile in the renderer
 * @returns {number} pixels to shift the roof down and right
 */
export function roofOffsetPx(tileSize) {
  return tileSize * ROOF_OFFSET_RATIO;
}

/**
 * Stamp roofs onto a generated map.
 *
 * Writes two fields onto the tile objects you pass in:
 *
 *   - `roofBuildingId` — on EVERY footprint tile, walls and doorway
 *     included. This is the "which building am I in?" tag.
 *   - `roofName` — an atlas frame name, on the inset block only. Tiles
 *     with no `roofName` draw no roof sprite.
 *
 * Mutates `tiles` in place (the generators in this repo build their tile
 * objects and then decorate them in passes; this is another pass) and
 * returns it for chaining.
 *
 * @param {Array<Array<object>>} tiles - row-major grid, `tiles[y][x]`
 * @param {Array<{x:number,y:number,w:number,h:number,id?:number|string}>} buildings
 *   footprint rectangles. `id` defaults to the index in this array.
 * @param {object} [options]
 * @param {string} [options.theme='town'] - key of `ROOF_THEMES`
 * @param {string} [options.base] - override the floor family to autotile
 *   from. Defaults to the theme's `base`.
 * @param {Object<string, object>} [options.byName={}] - the atlas's
 *   name→frame lookup, so the resolver can check a variant exists before
 *   choosing it. Passing `{}` yields the un-suffixed fallback name.
 * @param {number} [options.inset=ROOF_INSET] - tiles to inset per side
 * @returns {Array<Array<object>>} the same `tiles`, decorated
 */
export function stampRoofs(tiles, buildings, options = {}) {
  const {
    theme = DEFAULT_ROOF_THEME,
    base = roofBaseForTheme(theme),
    byName = {},
    inset = ROOF_INSET,
  } = options;

  if (!Array.isArray(tiles) || !Array.isArray(buildings)) return tiles;

  buildings.forEach((b, index) => {
    if (!b) return;
    const id = b.id ?? index;

    // The inset block, as a set, so the autotile resolver can ask about
    // neighbours without re-deriving the rectangle four times per tile.
    const roofCells = new Set();
    for (let yy = b.y; yy < b.y + b.h - inset; yy++) {
      for (let xx = b.x; xx < b.x + b.w - inset; xx++) roofCells.add(`${xx},${yy}`);
    }
    const isRoof = (xx, yy) => roofCells.has(`${xx},${yy}`);

    for (let yy = b.y; yy < b.y + b.h; yy++) {
      for (let xx = b.x; xx < b.x + b.w; xx++) {
        const tile = tiles[yy]?.[xx];
        if (!tile) continue;
        // The whole footprint is tagged — including the walls and the
        // doorway, which carry no roof sprite but are still "inside".
        tile.roofBuildingId = id;
        if (isRoof(xx, yy)) {
          tile.roofName = resolveDawnLikeFloorName(base, {
            n: isRoof(xx, yy - 1),
            s: isRoof(xx, yy + 1),
            e: isRoof(xx + 1, yy),
            w: isRoof(xx - 1, yy),
          }, byName).name;
        }
      }
    }
  });

  return tiles;
}

/**
 * Which building, if any, the given tile belongs to.
 *
 * Returns `undefined` for anything outdoors — which is the right answer
 * to feed `isRoofVisible`, because `undefined` matches no building and so
 * every roof stays on.
 *
 * @returns {number|string|undefined}
 */
export function roofBuildingIdAt(tiles, x, y) {
  return tiles?.[y]?.[x]?.roofBuildingId;
}

/**
 * Should this tile's roof be drawn, given where the player is standing?
 *
 * The whole feature is this one comparison; it is a named function so the
 * renderers cannot each invent their own subtly different version of it.
 *
 * @param {object} tile - a tile carrying `roofBuildingId`
 * @param {number|string|undefined} occupiedBuildingId - from
 *   `roofBuildingIdAt(tiles, player.x, player.y)`
 * @returns {boolean}
 */
export function isRoofVisible(tile, occupiedBuildingId) {
  if (!tile) return false;
  if (occupiedBuildingId === undefined || occupiedBuildingId === null) return true;
  return tile.roofBuildingId !== occupiedBuildingId;
}
