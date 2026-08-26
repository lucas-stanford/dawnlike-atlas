/**
 * generate-ship-deck — draw the planking DawnLike does not ship.
 *
 * WHY
 *
 * There is no boat anywhere in DawnLike. Not a hull, not a deck, not a
 * sail — 4,157 sprites and nothing that floats. The Pirate example needs
 * a ship, and the nearest thing the pack has is `board a/b/c`, which are
 * TRESTLE TABLES: a plank top on visible legs. Tiled six-up they read as
 * a bookcase lying on the water, because that is roughly what they are.
 *
 * So this draws deck planking directly, the same way
 * `generate-shore.mjs` draws coastline the pack also lacks. Planking is
 * a good candidate for generation: it is bands of flat colour with a
 * seam between them, which is exactly what pixel art of wood already is,
 * and there is no organic shape to get wrong.
 *
 * WHAT IT DRAWS
 *
 * Two orientations, three variants each — six tiles:
 *
 *   ship deck ns a|b|c   planks running north-south
 *   ship deck we a|b|c   planks running east-west
 *
 * The two orientations exist because a ship's planks run fore-and-aft,
 * so they have to turn when she does. The example picks the set by
 * heading, which means the deck re-planks itself as the ship comes about
 * — the same idea as the rail re-resolving, one layer down.
 *
 * The three variants exist because a butt joint in the same place on
 * every tile turns a deck into graph paper. Seams between planks line up
 * across tiles (they are at fixed columns); butt joints do not.
 *
 * PALETTE
 *
 * Three DawnBringer 16 entries and nothing else, in the ramp DawnLike
 * uses for wood everywhere: `maroon` for the seam, `brown` for the plank,
 * `orange` for the lit edge — plus `darkGrey` for nail heads. Verified
 * against the pack's own `closed wooden door front`, which uses the same
 * three.
 */

import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const ATLAS_JSON = path.join(ROOT, 'atlas/DawnlikeAtlas.json');
const SHEETS = [
  path.join(ROOT, 'atlas/DawnlikeAtlas0.png'),
  path.join(ROOT, 'atlas/DawnlikeAtlas1.png'),
];

/**
 * DawnBringer 16, and specifically the five entries DawnLike itself uses
 * for wood. Counted off `closed wooden door front`, which is 184px of
 * `brown` body, 108px of `black` seam, 52px of `maroon` shadow and 100px
 * of `orange` highlight — so that is the ramp used here, in roughly that
 * proportion. Guessing a ramp is how generated art ends up looking
 * generated.
 */
const PALETTE = {
  black:    [0x14, 0x0c, 0x1c],
  maroon:   [0x45, 0x24, 0x34],
  darkGrey: [0x4d, 0x49, 0x4d],
  brown:    [0x86, 0x4d, 0x30],
  orange:   [0xd3, 0x7d, 0x2c],
  tan:      [0xd3, 0xaa, 0x9a],
  grey:     [0x75, 0x71, 0x61],
  blueGrey: [0x86, 0x96, 0xa2],
  white:    [0xdf, 0xef, 0xd7],
};

const N = 16;      // logical authoring resolution
const SCALE = 2;   // → 32×32, matching the pack

/**
 * Where the seams between planks fall, in logical pixels.
 *
 * Fixed, and shared by every variant, because a seam that moves from
 * tile to tile is a plank that changes width halfway along the deck. The
 * seam at 15 is the tile boundary, which is what makes the planking run
 * continuously from one cell into the next.
 */
const SEAMS = [5, 10, 15];

/**
 * Butt joints per variant: `[column, row]`, where the column names any
 * pixel inside the plank to break. These are what stop the deck reading
 * as a woven mat, and they are the only thing that differs between a, b
 * and c.
 */
const BUTTS = {
  a: [[2, 4], [13, 11]],
  b: [[8, 7]],
  c: [[2, 12], [8, 2], [13, 6]],
};

/** Grain flecks: a handful of lit pixels so a plank is not a flat field. */
const GRAIN = {
  a: [[3, 9], [12, 3]],
  b: [[2, 5], [9, 10]],
  c: [[7, 5], [13, 9]],
};

export const ORIENTATIONS = ['ns', 'we'];
export const VARIANTS = ['a', 'b', 'c'];

/**
 * The sixteen floor-family suffixes, in the pack's own order. A suffix
 * names the sides that are MISSING — `nw` is the corner piece open to the
 * north and west — which is precisely what `resolveDawnLikeFloorName`
 * computes from a neighbour truth table.
 *
 * The bulwark is generated as one of these families rather than as a
 * fence for a specific reason. The fence sprites draw their rail down the
 * CENTRE of a tile, because a fence occupies a whole cell of a map. A
 * ship's rail is on the EDGE of the deck, so a fence laid along the hull
 * puts a bar a quarter of a tile inboard and the ship comes out looking
 * like a portcullis. A floor family draws its transition at the tile
 * boundary, which is exactly where a gunwale goes — so the ship's hull
 * autotiles with the same resolver a ploughed field uses.
 */
export const RAIL_SUFFIXES = [
  'nw', 'n', 'ne', 'nwe', 'nswe', 'w', 'c', 'e',
  'sw', 's', 'se', 'swe', 'ns', 'nsw', 'nse', 'we',
];

/**
 * Bow pieces: the four corner suffixes again, with the named corner
 * chamfered off.
 *
 * A 3x2 hull whose every cell is a square corner is a barge. The two
 * cells at the leading edge are always corner pieces — heading north
 * they are `nw` and `ne`, heading east `ne` and `se` — and in each case
 * the corner to cut away is the one the suffix names.
 *
 * Unlike the rail, a bow piece is OPAQUE and carries its own planking.
 * It has to: the chamfer removes part of the cell, and a transparent
 * overlay would leave the deck tile underneath showing through the cut,
 * so the prow would read as a rope stretched across a square hull rather
 * than as a cut-away corner. That is why there are two of each — the
 * planks it bakes in have to run the right way for the heading.
 */
export const BOW_SUFFIXES = ['nw', 'ne', 'sw', 'se'];

/**
 * ONE-CELL VESSELS, AND WHY THEY ARE NOT ONE SPRITE ROTATED
 *
 * The first version of these drew a single boat and rotated it 90 degrees
 * three times. It was wrong, and obviously wrong once anyone looked at
 * the four headings side by side: it read as one paper cut-out being spun
 * on a table rather than as a boat seen from four directions.
 *
 * Two things cause that, and both are well documented in the pixel-art
 * literature on directional sprites:
 *
 * 1. **The light rotates with the sprite.** Shading is baked into pixel
 *    art — a lit rim on the upper left and a shadow on the lower right is
 *    what makes a flat shape read as a solid. Rotate the finished tile
 *    and the lit rim marches round with it, so the sun appears to orbit
 *    the boat as it turns. The fix is to build the SHAPE in boat space,
 *    rotate that, and only then light it in SCREEN space. Every heading
 *    then shares one fixed light, here from the north-west, which is the
 *    direction DawnLike's own wall tiles are lit from.
 *
 * 2. **Nothing foreshortens.** A top-down tile game is not a true
 *    orthographic plan; the camera is tilted a little, which is why
 *    DawnLike's walls show a face at all. Under a tilted camera a sail
 *    seen from ahead or astern is narrower than the same sail seen
 *    broadside, and a hull seen end-on shows less of its side. A pure
 *    rotation keeps every dimension identical and the effect disappears.
 *    So the sail has two profiles, one for the north/south headings and a
 *    wider one for east/west.
 *
 * What still rotates is the boat's own geometry — which end is pointed,
 * which side the sail is set. That is a property of the boat, not of the
 * camera, and it is correct for it to turn.
 */
export const BOAT_HEADINGS = ['n', 'e', 's', 'w'];

/**
 * A one-cell fore-and-aft rigged sailing boat — a sloop, the small
 * working craft of the 1790s–1850s: one mast stepped well forward with a
 * boomed mainsail abaft it.
 *
 * Two liveries. `sloop` carries working canvas; `black sloop` is the same
 * hull under a black mainsail with a white device on it — a Jolly Roger,
 * which is the one piece of pirate iconography that survives being drawn
 * at sixteen logical pixels.
 *
 * The rowboat stays exactly what it was. It is the boat you row ashore
 * in; this is the boat you arrive in.
 */
export const SLOOP_LIVERIES = ['sloop', 'black sloop'];

// ---------------------------------------------------------------------
// shapes, in boat space: bow to the north
// ---------------------------------------------------------------------

/**
 * HULLS, DRAWN RATHER THAN DERIVED
 *
 * These started as a list of per-row widths with the shading computed
 * from distance-to-edge. That is fine for a rail or a plank field and
 * hopeless for a boat: a hull tapering equally at both ends is an almond,
 * and an almond reads as a bean. A hull's profile is bounded on top by
 * the SHEERLINE, at the bow by the CURVE OF THE STEM, and aft by the
 * TRANSOM, which on a small working boat is flat and near vertical — so
 * the bow rakes forward and sweeps up to the deck while the stern is a
 * straight ninety-degree face. None of that survives being computed.
 *
 * So the hulls are pixel maps. At sixteen logical pixels a hull is a
 * dozen short strings, and every one of them can be placed on purpose:
 * the vertical run of `K` down the left of the `e` map IS the transom,
 * and the right edge stepping in as it descends IS the rake of the stem.
 * The alternating `B` and `M` courses are STRAKES — the planking that
 * runs stem to transom — which is what was missing when the topsides
 * were one flat field of brown.
 *
 * Each heading is authored separately, because the four are genuinely
 * different views rather than one drawing turned. `w` is `e` mirrored,
 * which is safe: a hull is symmetric port to starboard.
 *
 *   K black   outline and the darkest seams
 *   O orange  the lit gunwale, catching the north-west light
 *   T tan     capping rail
 *   B brown   a strake in full light
 *   M maroon  a strake in shadow
 *   .         transparent
 */
const ART = {
  black: 'K', orange: 'O', tan: 'T', brown: 'B', maroon: 'M', grey: 'G', white: 'W',
};
const FROM_CHAR = Object.fromEntries(Object.entries(ART).map(([k, v]) => [v, k]));

/** Turn a block of art into a logical grid. */
function parseArt(lines) {
  const g = Array.from({ length: N }, () => Array(N).fill(null));
  lines.forEach((line, y) => {
    for (let x = 0; x < line.length && x < N; x += 1) {
      const tone = FROM_CHAR[line[x]];
      if (tone) g[y][x] = tone;
    }
  });
  return g;
}

const HULL_ART = {
  sloop: {
    // Profile, bow to the right. Left edge: `K` straight down from the
    // sheer to the keel — the transom. Right edge stepping in as it
    // descends — the rake of the stem. And the top edge DIPS between the
    // two: that is the sheer, and it is what stops the hull reading as a
    // crate with stripes on it.
    e: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.KK........KKKK.',
      '.KOKKKKKKKKKOOK.',
      '.KOOOOOOOOOOOOK.',
      '.KTTTTTTTTTTTKK.',
      '.KBBBBBBBBBBBK..',
      '.KMMMMMMMMMMK...',
      '.KKKKKKKKKKK....',
      '................',
    ],
    // Stern-on. Narrow, because end-on you see almost none of her length
    // — the flat bottom edge is the transom, seen square.
    n: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.....KKKKKK.....',
      '....KKOOOOKK....',
      '....KTTTTTTK....',
      '....KBBBBBBK....',
      '....KMMMMMMK....',
      '....KBBBBBBK....',
      '....KKKKKKKK....',
    ],
    // Bow-on. The stem is nearest, so she narrows to a point at the foot
    // of the tile; the wider square top is the far transom.
    s: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '....KKKKKKKK....',
      '....KOOOOOOK....',
      '....KTTTTTTK....',
      '....KBBBBBBK....',
      '.....KMMMMK.....',
      '.....KBBBBK.....',
      '......KKKK......',
    ],
  },
  boat: {
    // The rowboat carries no rig, so she has the whole tile and can be
    // both longer and deeper in the water.
    e: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.KK........KKKK.',
      '.KOKKKKKKKKKOOK.',
      '.KOOOOOOOOOOOOK.',
      '.KTTTTTTTTTTTKK.',
      '.KBBBBBBBBBBBK..',
      '.KMMMMMMMMMMK...',
      '.KBBBBBBBBBK....',
      '.KMMMMMMMMK.....',
      '.KKKKKKKKK......',
      '................',
    ],
    n: [
      '................',
      '................',
      '................',
      '................',
      '.....KKKKKK.....',
      '....KKOOOOKK....',
      '....KTTTTTTK....',
      '....KBBBBBBK....',
      '....KTBBBBTK....',
      '....KMMMMMMK....',
      '....KBBBBBBK....',
      '....KTBBBBTK....',
      '....KMMMMMMK....',
      '....KBBBBBBK....',
      '....KKKKKKKK....',
      '................',
    ],
    s: [
      '................',
      '................',
      '................',
      '................',
      '....KKKKKKKK....',
      '....KOOOOOOK....',
      '....KTBBBBTK....',
      '....KBBBBBBK....',
      '....KMMMMMMK....',
      '....KTBBBBTK....',
      '....KBBBBBBK....',
      '.....KMMMMK.....',
      '.....KBBBBK.....',
      '......KMMK......',
      '......KKKK......',
      '................',
    ],
  },
};

/** Mirror a logical grid left to right. */
function mirrorX(px) {
  return px.map((row) => [...row].reverse());
}

/** The drawn hull for one vessel and heading; `w` is `e` mirrored. */
function hullArt(kind, heading) {
  const art = parseArt(HULL_ART[kind][heading === 'w' ? 'e' : heading]);
  return heading === 'w' ? mirrorX(art) : art;
}

/** Rows a drawn grid occupies, or null when it is empty. */
function artRows(px) {
  let min = null;
  let max = null;
  for (let y = 0; y < N; y += 1) {
    if (px[y].some(Boolean)) { if (min === null) min = y; max = y; }
  }
  return min === null ? null : { min, max };
}

/**
 * The mainsail, drawn per heading in SCREEN space, never turned.
 *
 * A hull lies flat on the water and turns with the boat. A mast does
 * not: it is vertical, and under a tilted top-down camera anything
 * vertical projects UP THE SCREEN whichever way its base is pointing —
 * the same reason a tree in a game like this leans up its tile rather
 * than lying flat on it. Rotating the finished boat sent the rig
 * orbiting the hull instead, so she appeared to capsize as she came
 * about.
 *
 *   e / w   broadside — the full chord of the canvas, trailing aft with
 *           the luff on the bow side, so the two are mirror images.
 *   n / s   foreshortened to about half chord, seen end-on. South is
 *           nearer the camera than north, so its sail is a shade larger.
 */
const MAINSAIL = {
  n: { 3: [8, 8], 4: [7, 9], 5: [7, 9], 6: [6, 10], 7: [6, 10], 8: [6, 10] },
  s: { 2: [8, 8], 3: [7, 9], 4: [7, 10], 5: [6, 10], 6: [6, 11], 7: [5, 11], 8: [5, 11] },
  e: {
    1: [10, 10], 2: [8, 11], 3: [7, 11], 4: [6, 11],
    5: [5, 11], 6: [4, 11], 7: [3, 11],
  },
  w: {
    1: [5, 5], 2: [4, 7], 3: [4, 8], 4: [4, 9],
    5: [4, 10], 6: [4, 11], 7: [4, 12],
  },
};

/** The column the mast stands in, per heading — the sail's luff. */
const MAST_COLUMN = { n: 8, s: 8, e: 11, w: 4 };

// ---------------------------------------------------------------------
// mask plumbing
// ---------------------------------------------------------------------

const blankGrid = () => Array.from({ length: N }, () => Array(N).fill(false));

/** Rotate any grid a quarter turn clockwise. */
function rotateCW(px) {
  return Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => px[N - 1 - x][y]));
}

/** A mask from explicit per-row x spans. */
function maskFromSpans(spans, top = 1) {
  const g = blankGrid();
  for (const [row, [a, b]] of Object.entries(spans)) {
    for (let x = a; x <= b; x += 1) g[top + Number(row)][x] = true;
  }
  return g;
}

/** Rows the mask occupies, or null when it is empty. */
function maskRows(mask) {
  let min = null;
  let max = null;
  for (let y = 0; y < N; y += 1) {
    if (mask[y].some(Boolean)) { if (min === null) min = y; max = y; }
  }
  return min === null ? null : { min, max };
}

/**
 * How many steps it takes to leave the mask travelling one way. A pixel
 * on the very edge answers 1.
 */
function runTo(mask, x, y, dx, dy) {
  let n = 0;
  let cx = x;
  let cy = y;
  while (cx >= 0 && cy >= 0 && cx < N && cy < N && mask[cy][cx]) {
    n += 1; cx += dx; cy += dy;
  }
  return n;
}

/**
 * Light a mask in SCREEN space, from the north-west.
 *
 * This is the whole point of the rewrite: it runs AFTER the shape has
 * been turned to its heading, so the lit rim stays on the upper left of
 * every sprite in the set instead of orbiting the boat as it comes about.
 *
 * `tones` is [outline, lit, shadow, body]; `bias` nudges an interior that
 * is neither rim toward the lit or the shadowed tone, which is how the
 * same sail reads as front-lit sailing towards the camera and backlit
 * sailing away from it.
 */
function shadeMask(px, mask, [outline, lit, shadow, body], bias = 0) {
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      if (!mask[y][x]) continue;
      const up = runTo(mask, x, y, 0, -1);
      const left = runTo(mask, x, y, -1, 0);
      const down = runTo(mask, x, y, 0, 1);
      const right = runTo(mask, x, y, 1, 0);
      if (up === 1 || left === 1 || down === 1 || right === 1) px[y][x] = outline;
      else if (up === 2 || left === 2) px[y][x] = lit;
      else if (down === 2 || right === 2) px[y][x] = shadow;
      else px[y][x] = bias > 0 ? lit : bias < 0 ? shadow : body;
    }
  }
}

/** Paint a mask flat, ignoring the light. Used for spars and devices. */
function stamp(px, mask, tone) {
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) if (mask[y][x]) px[y][x] = tone;
  }
}

// ---------------------------------------------------------------------
// the vessels
// ---------------------------------------------------------------------

/**
 * The rowboat is now the drawing itself — hull, strakes, capping rail and
 * all — so there is nothing left to compute.
 */
function boatFor(heading) {
  return hullArt('boat', heading);
}

/**
 * The sloop: the drawn hull, a mast, and the sail laid over the top of
 * the tile in screen space.
 *
 * The sail stays procedural because what it needs is exactly what a rule
 * gives well — an outline, a lit rim, a shadowed rim and a body, with the
 * tones swapped per heading. The hull needed the opposite, which is why
 * it is drawn.
 */
function sloopFor(livery, heading) {
  const dark = livery === 'black sloop';
  const px = hullArt('sloop', heading);
  const hullTop = artRows(px).min;

  // Mast: from the masthead down to the deck, stopping short of the hull
  // so it never cuts a black line through the boat.
  const mast = blankGrid();
  const col = MAST_COLUMN[heading];
  for (let y = 1; y < hullTop; y += 1) mast[y][col] = true;
  stamp(px, mast, 'black');

  /**
   * Canvas tones per heading, as [outline, lit rim, shadow rim, body].
   *
   * The sun in a game like this sits behind the viewer, so a sail coming
   * AT the camera shows its lit face and one going away shows its shaded
   * back. Broadside is modelled properly, lit on the upper left.
   */
  const CANVAS = {
    white: {
      s: ['black', 'white', 'white', 'white'],
      n: ['black', 'blueGrey', 'blueGrey', 'blueGrey'],
      side: ['black', 'white', 'blueGrey', 'white'],
    },
    black: {
      s: ['darkGrey', 'grey', 'grey', 'grey'],
      n: ['darkGrey', 'black', 'black', 'black'],
      side: ['darkGrey', 'grey', 'black', 'black'],
    },
  }[dark ? 'black' : 'white'];

  const sail = maskFromSpans(MAINSAIL[heading], 0);
  shadeMask(px, sail, CANVAS[heading === 's' || heading === 'n' ? heading : 'side']);

  if (dark) {
    // The device, placed relative to the sail it sits on so it never
    // hangs off a foreshortened one into open water.
    const at = maskRows(sail);
    const mid = Math.floor((at.min + at.max) / 2);
    for (const y of [mid, mid + 1]) {
      const span = MAINSAIL[heading][y];
      if (!span) continue;
      const cx = Math.floor((span[0] + span[1]) / 2);
      for (const x of [cx, cx + 1]) if (sail[y][x]) px[y][x] = 'white';
    }
  }

  return px;
}

/** Every sprite this script owns. */
export function deckSprites() {
  const out = [];
  for (const orientation of ORIENTATIONS) {
    for (const variant of VARIANTS) {
      out.push({ name: `ship deck ${orientation} ${variant}`, orientation, variant });
    }
  }
  for (const suffix of RAIL_SUFFIXES) {
    out.push({ name: `ship rail ${suffix}`, rail: suffix });
  }
  for (const orientation of ORIENTATIONS) {
    for (const suffix of BOW_SUFFIXES) {
      out.push({ name: `ship bow ${orientation} ${suffix}`, rail: suffix, bow: orientation });
    }
  }
  for (const heading of BOAT_HEADINGS) {
    out.push({ name: `boat ${heading}`, boat: heading });
  }
  for (const livery of SLOOP_LIVERIES) {
    for (const heading of BOAT_HEADINGS) {
      out.push({ name: `${livery} ${heading}`, sloop: livery, heading });
    }
  }
  // The mast is what stops six planked cells reading as a raft. Drawn
  // over transparency so it composites onto whichever deck tile it
  // lands on, and with no orientation — a spar seen from directly above
  // is round whichever way the ship is pointing.
  out.push({ name: 'ship mast', mast: true });
  return out;
}

/**
 * The bulwark for one floor suffix: a three-pixel band along every open
 * side, transparent everywhere else so it composites over the planking.
 *
 * Each pixel takes its role from how far it is from the NEAREST open
 * side, which mitres the corners for free — a north-west piece gets one
 * continuous rail turning the corner rather than two bands crossing.
 */
function drawRail(suffix, bow = null) {
  const open = suffix === 'c' ? [] : suffix.split('');
  // A rail is an overlay and starts empty; a bow is a whole tile and
  // starts as planking, which the chamfer then cuts into.
  const px = bow
    ? (bow === 'ns' ? drawVertical('b') : transpose(drawVertical('b')))
    : Array.from({ length: N }, () => Array(N).fill(null));
  /**
   * How deep the chamfer bites, measured diagonally from the corner.
   * Seven of sixteen takes a little under half the cell, which is a
   * prow rather than a clipped corner.
   */
  const CUT = 7;
  /** Manhattan distance from whichever corner the suffix names. */
  const fromCorner = (x, y) => (open.includes('n') ? y : N - 1 - y)
    + (open.includes('w') ? x : N - 1 - x);
  // Outboard first, inboard last, reading the way you would see a
  // gunwale from directly above: the dark outside of the hull where it
  // meets the water, the planking of the bulwark itself, then the lit
  // cap rail on top. Putting the bright pixel on the OUTSIDE instead
  // outlines the ship in orange and it stops looking like a hull.
  const BAND = ['black', 'brown', 'orange'];

  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      if (bow) {
        const d = fromCorner(x, y);
        // Outboard of the cut there is no ship at all.
        if (d < CUT) { px[y][x] = null; continue; }
        // Inboard of it, the band follows the diagonal as well as the
        // two straight sides — whichever it is nearest to.
        const diagonal = d - CUT;
        if (diagonal < BAND.length) { px[y][x] = BAND[diagonal]; continue; }
      }

      let nearest = Infinity;
      if (open.includes('n')) nearest = Math.min(nearest, y);
      if (open.includes('s')) nearest = Math.min(nearest, N - 1 - y);
      if (open.includes('w')) nearest = Math.min(nearest, x);
      if (open.includes('e')) nearest = Math.min(nearest, N - 1 - x);
      if (nearest < BAND.length) px[y][x] = BAND[nearest];
    }
  }
  return px;
}

/**
 * The mast, from directly above: a round spar with a lit crown, a dark
 * outline, and four short stays running off toward the rail.
 *
 * Everything outside the spar is transparent, so this is an overlay, not
 * a tile — which is why it can sit on any of the six deck variants.
 */
function drawMast() {
  const px = Array.from({ length: N }, () => Array(N).fill(null));
  const cx = 7.5;
  const cy = 7.5;
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= 1.6) px[y][x] = 'orange';       // lit crown
      else if (d <= 3.1) px[y][x] = 'brown';   // the spar itself
      else if (d <= 4.0) px[y][x] = 'black';   // outline and its shadow
    }
  }
  // Stays. Short, and in the shadow tone rather than a bright one, so
  // they read as rigging rather than as a drawn star.
  for (let i = 4; i <= 7; i += 1) {
    for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const x = Math.round(cx + sx * i * 0.72);
      const y = Math.round(cy + sy * i * 0.72);
      if (x >= 0 && y >= 0 && x < N && y < N && px[y][x] === null) px[y][x] = 'maroon';
    }
  }
  return px;
}

/** Which plank a logical column belongs to. */
function plankOf(col) {
  for (let i = 0; i < SEAMS.length; i += 1) if (col <= SEAMS[i]) return i;
  return SEAMS.length - 1;
}

/**
 * Draw one tile at logical resolution, planks running vertically. The
 * other orientation is this transposed — see `transpose`.
 */
function drawVertical(variant) {
  const px = Array.from({ length: N }, () => Array(N).fill('brown'));
  // A seam is one black pixel; the pixel AFTER it is the shadow the next
  // plank's edge casts. Without that second pixel the planks read as
  // stripes on a flat board rather than as separate boards.
  const shadowCols = new Set(SEAMS.map((c) => (c + 1) % N));

  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      if (SEAMS.includes(x)) px[y][x] = 'black';
      else if (shadowCols.has(x)) px[y][x] = 'maroon';
    }
  }

  for (const [x, y] of GRAIN[variant]) {
    if (px[y][x] === 'brown') px[y][x] = 'orange';
  }

  for (const [col, row] of BUTTS[variant]) {
    const plank = plankOf(col);
    for (let x = 0; x < N; x += 1) {
      if (plankOf(x) !== plank || SEAMS.includes(x) || shadowCols.has(x)) continue;
      px[row][x] = 'black';
      // One nail head either side of the joint, at the plank's edges,
      // which is where a shipwright would actually drive them.
      if (row - 1 >= 0 && px[row - 1][x] !== 'black') px[row - 1][x] = 'brown';
      if (row + 1 < N) px[row + 1][x] = 'maroon';
    }
    // Nails: single pixels, inboard of the joint.
    const edge = SEAMS[plank] - 1;
    if (row - 2 >= 0) px[row - 2][edge] = 'darkGrey';
    if (row + 2 < N) px[row + 2][edge] = 'darkGrey';
  }

  return px;
}

/** Swap rows and columns — a 90° turn for a texture with no handedness. */
function transpose(px) {
  return Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => px[x][y]));
}

/** Render one named sprite to a 32×32 PNG. */
export function renderTile(sprite) {
  const logical = sprite.mast ? drawMast()
    : sprite.sloop ? sloopFor(sprite.sloop, sprite.heading)
    : sprite.boat ? boatFor(sprite.boat)
    : sprite.rail ? drawRail(sprite.rail, sprite.bow)
    : (sprite.orientation === 'ns'
      ? drawVertical(sprite.variant)
      : transpose(drawVertical(sprite.variant)));

  const png = new PNG({ width: N * SCALE, height: N * SCALE });
  for (let y = 0; y < N * SCALE; y += 1) {
    for (let x = 0; x < N * SCALE; x += 1) {
      const i = (png.width * y + x) << 2;
      const role = logical[Math.floor(y / SCALE)][Math.floor(x / SCALE)];
      if (!role) { png.data[i + 3] = 0; continue; }
      const [r, g, b] = PALETTE[role];
      png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 255;
    }
  }
  return png;
}

// ---------------------------------------------------------------------
// preview
// ---------------------------------------------------------------------

function writePreview(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const SC = 3;
  const COLS = 8;
  const TILE = N * SCALE * SC;
  const sprites = deckSprites();
  const rows = Math.ceil(sprites.length / COLS);
  const png = new PNG({ width: COLS * TILE, height: rows * TILE });
  // The rail tiles are mostly transparent, so a preview on nothing shows
  // nothing. Sea blue is what they will actually sit against.
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 0x59; png.data[i + 1] = 0x7d; png.data[i + 2] = 0xcf; png.data[i + 3] = 255;
  }

  sprites.forEach((sprite, i) => {
    const cx = (i % COLS) * TILE;
    const cy = Math.floor(i / COLS) * TILE;
    const tile = renderTile(sprite);
    for (let y = 0; y < tile.height; y += 1) {
      for (let x = 0; x < tile.width; x += 1) {
        const si = (tile.width * y + x) << 2;
        if (tile.data[si + 3] === 0) continue;
        for (let sy = 0; sy < SC; sy += 1) {
          for (let sx = 0; sx < SC; sx += 1) {
            const di = (png.width * (cy + y * SC + sy) + cx + x * SC + sx) << 2;
            png.data[di] = tile.data[si]; png.data[di + 1] = tile.data[si + 1];
            png.data[di + 2] = tile.data[si + 2]; png.data[di + 3] = 255;
          }
        }
      }
    }
  });

  const dst = path.join(dir, 'ship-deck.png');
  fs.writeFileSync(dst, PNG.sync.write(png));
  console.log(`preview  ${dst} — ${sprites.length} tiles, ${COLS} per row`);
  console.log(`         ${sprites.map((s) => s.name).join(' · ')}`);
}

// ---------------------------------------------------------------------
// apply
// ---------------------------------------------------------------------

function grow(sheet, height) {
  if (sheet.height >= height) return sheet;
  const next = new PNG({ width: sheet.width, height });
  next.data.fill(0);
  sheet.data.copy(next.data, 0, 0, sheet.data.length);
  return next;
}

function apply() {
  const atlas = JSON.parse(fs.readFileSync(ATLAS_JSON, 'utf8'));
  const sprites = deckSprites();
  const cols = atlas.meta.columns;
  const tile = atlas.meta.tile.w;

  // Re-running must reuse the cells these sprites already occupy rather
  // than appending a second copy, so the script is idempotent and a
  // second `--apply` produces a byte-identical sheet.
  const used = new Set();
  for (const s of Object.values(atlas.byName)) used.add((s.y / tile) * cols + s.x / tile);

  const assign = new Map();
  for (const sprite of sprites) {
    const existing = atlas.byName[sprite.name];
    if (existing) assign.set(sprite.name, (existing.y / tile) * cols + existing.x / tile);
  }

  let cursor = 0;
  const nextFree = () => {
    while (used.has(cursor)) cursor += 1;
    used.add(cursor);
    return cursor;
  };
  for (const sprite of sprites) {
    if (!assign.has(sprite.name)) assign.set(sprite.name, nextFree());
  }

  const maxIndex = Math.max(...assign.values(), ...used);
  const rows = Math.floor(maxIndex / cols) + 1;
  const height = rows * tile;

  let sheets = SHEETS.map((p) => PNG.sync.read(fs.readFileSync(p)));
  sheets = sheets.map((s) => grow(s, height));

  for (const sprite of sprites) {
    const index = assign.get(sprite.name);
    const cx = (index % cols) * tile;
    const cy = Math.floor(index / cols) * tile;
    const img = renderTile(sprite);

    for (let y = 0; y < tile; y += 1) {
      for (let x = 0; x < tile; x += 1) {
        const si = (img.width * y + x) << 2;
        const di = (sheets[0].width * (cy + y) + (cx + x)) << 2;
        sheets[0].data[di] = img.data[si];
        sheets[0].data[di + 1] = img.data[si + 1];
        sheets[0].data[di + 2] = img.data[si + 2];
        sheets[0].data[di + 3] = img.data[si + 3];
        // A deck does not animate, so frame 1 stays transparent. Zero it
        // explicitly rather than trusting the cell to have been empty,
        // so a re-run is always idempotent.
        sheets[1].data[di] = 0; sheets[1].data[di + 1] = 0;
        sheets[1].data[di + 2] = 0; sheets[1].data[di + 3] = 0;
      }
    }

    atlas.byName[sprite.name] = {
      x: cx, y: cy, w: tile, h: tile,
      tags: sprite.sloop
        ? ['vehicle', 'wooden', 'boat', 'ship', 'water', 'sail',
           ...(sprite.sloop === 'black sloop' ? ['pirate', 'black'] : []), sprite.heading]
        : sprite.boat ? ['vehicle', 'wooden', 'boat', 'ship', 'water', 'rowboat', sprite.boat]
        : sprite.mast ? ['structure', 'wooden', 'mast', 'ship', 'decoration']
        : sprite.bow ? ['structure', 'wooden', 'bow', 'ship', 'edge']
        : sprite.rail ? ['structure', 'wooden', 'rail', 'ship', 'edge']
        : ['structure', 'wooden', 'deck', 'ship', 'floor', sprite.orientation],
    };
    atlas.frames[sprite.name] = { frame: { x: cx, y: cy, w: tile, h: tile } };
    atlas.legacyFrames[String(index)] = sprite.name;
  }

  atlas.meta.size.h = height;
  atlas.meta.rows = rows;
  atlas.meta.spriteCount = Object.keys(atlas.byName).length;
  atlas.meta.animatedCount = Object.values(atlas.byName).filter((s) => s.isAnimated).length;

  // See generate-shore.mjs: pngjs's defaults (Z_RLE + adaptive filtering)
  // quadruple the file size for flat pixel art.
  const PNG_OPTS = { deflateLevel: 9, deflateStrategy: 0, filterType: 0 };
  SHEETS.forEach((p, i) => fs.writeFileSync(p, PNG.sync.write(sheets[i], PNG_OPTS)));
  fs.writeFileSync(ATLAS_JSON, `${JSON.stringify(atlas, null, 0)}\n`);

  console.log(`applied  ${sprites.length} ship tiles`);
  console.log(`         sheet ${atlas.meta.size.w}×${height} (${rows} rows)`);
  console.log(`         spriteCount ${atlas.meta.spriteCount}, animated ${atlas.meta.animatedCount}`);
}

// ---------------------------------------------------------------------

const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(import.meta.filename);

if (invokedDirectly) {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const outDir = outIdx >= 0 ? args[outIdx + 1] : path.join(ROOT, 'tmp');
  writePreview(outDir);
  if (args.includes('--apply')) apply();
  else console.log('\n(dry run — pass --apply to write into the atlas)');
}
