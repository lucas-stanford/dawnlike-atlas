/**
 * buildings — the pieces of scenery that are too big to be sprites.
 *
 * DawnLike is a roguelike pack, and everything in it is one 16px cell
 * because everything in it is a thing you pick up, stand on or fight. A
 * building is a thing you walk AROUND, and it does not fit that shape.
 *
 * The tempting fix is to draw one big, slice it into cells, name them
 * `barn r0c0` … `barn r4c4` and place them like any other sprite so the
 * pack stays uniform. Don't. Those cells are only ever drawn together, in
 * one fixed arrangement, so the grid buys nothing a single image does not
 * — and it costs the art, because fitting into the mega-atlas means
 * fitting the mega-atlas's palette. These live in `atlas/buildings/` as
 * ordinary PNGs, each on its own palette, and are drawn as one image.
 *
 * They are traced from art rather than drawn in code; see
 * `scripts/trace_building.py`.
 */

/** DawnLike's logical cell. The art below is measured in these. */
export const TILE_PX = 16;

/**
 * Every building, measured from the PNG that ships with it.
 *
 * `w`/`h` are the art's real size in logical pixels — not rounded to
 * whole tiles, because almost none of them are, and rounding is what
 * makes a roof sit half a pixel off its own walls.
 *
 * `cols` is how many tiles the building BLOCKS, taken from the width of
 * the part that actually meets the ground rather than from the width of
 * the picture. Those differ on every one of these: a roof oversails, and
 * a barn whose 6-tile roof also blocked 6 tiles of floor would have the
 * farmer bouncing off thin air a tile away from the wall.
 *
 * How DEEP the footprint is, is not recorded here. These are drawn
 * front-on, so the art says nothing about it — depth is the game's
 * decision, not the sprite's.
 *
 * `url` is the path under the static root, which is `atlas/`.
 */
export const BUILDINGS = {
  barn: { url: '/buildings/barn.png', w: 96, h: 110, cols: 5 },
  cabin: { url: '/buildings/cabin.png', w: 65, h: 75, cols: 4 },
  cottage: { url: '/buildings/cottage.png', w: 62, h: 74, cols: 3 },
  townhouse: { url: '/buildings/townhouse.png', w: 78, h: 89, cols: 5 },
  outhouse: { url: '/buildings/outhouse.png', w: 28, h: 46, cols: 1 },
};

export const BUILDING_NAMES = Object.keys(BUILDINGS);

/**
 * Where to draw a building, in TILES, given the ground it stands on.
 *
 * Returned in tiles rather than pixels so the caller keeps its own zoom:
 * multiply by whatever tile size it is drawing at.
 *
 * The rectangle is deliberately BIGGER than the footprint. It is anchored
 * by its bottom edge and centred left-to-right, so the roof oversails the
 * walls on three sides — which is the whole reason not to rasterise these
 * into the tile grid. A roof that stops dead at its own footprint reads as
 * flat, and the overhang is what makes the walls look like they have a
 * building on top of them rather than a texture.
 *
 * Nothing is ever hidden behind the part that oversails, because the
 * footprint is solid and no one can stand inside it.
 *
 * @param {string} name - a key of `BUILDINGS`
 * @param {{x0: number, y1: number}} at - the footprint's left column and
 *   its BOTTOM row, in tiles
 * @returns {{x: number, y: number, w: number, h: number}|null} in tiles
 */
export function buildingRect(name, at) {
  const art = BUILDINGS[name];
  if (!art || !at) return null;
  const w = art.w / TILE_PX;
  const h = art.h / TILE_PX;
  return {
    x: at.x0 + (art.cols - w) / 2,
    y: at.y1 + 1 - h,
    w,
    h,
  };
}
