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
 * She is drawn the way such a boat actually reads from above — a long
 * SHALLOW hull, four pixels deep, under one big sail that takes most of
 * the tile. Canvas is the thing you recognise a sailing boat by at this
 * size; the hull is only what it stands on.
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

/**
 * Canvas tones, resolved per livery AND per heading.
 *
 * `W` is the body of the sail, `S` the shaded side of the belly and `L`
 * its outline. `L` is a separate character from the hull's `K` for one
 * reason: a black sail outlined in black loses its edge against the
 * water and reads as a hole punched in the boat, so the pirate livery
 * outlines its canvas a step lighter.
 *
 * The sun in a game like this sits behind the viewer, so a sail coming
 * AT the camera shows its lit face and one going away shows its shaded
 * back — which is why north and south flatten to one tone in opposite
 * directions while the broadside headings keep their modelling.
 *
 * `D` is the device on the canvas. The working sloop resolves it to
 * whatever its body already is, so the mark simply vanishes; only the
 * pirate paints it bone-white.
 */
const CANVAS = {
  sloop: {
    e: { W: 'white', S: 'blueGrey', L: 'black', D: 'white' },
    w: { W: 'white', S: 'blueGrey', L: 'black', D: 'white' },
    s: { W: 'white', S: 'white', L: 'black', D: 'white' },
    n: { W: 'blueGrey', S: 'blueGrey', L: 'black', D: 'blueGrey' },
  },
  'black sloop': {
    e: { W: 'black', S: 'darkGrey', L: 'darkGrey', D: 'white' },
    w: { W: 'black', S: 'darkGrey', L: 'darkGrey', D: 'white' },
    s: { W: 'grey', S: 'grey', L: 'darkGrey', D: 'white' },
    n: { W: 'black', S: 'black', L: 'darkGrey', D: 'white' },
  },
};
const FROM_CHAR = Object.fromEntries(Object.entries(ART).map(([k, v]) => [v, k]));

/** Turn a block of art into a logical grid, with an optional extra legend. */
function parseArt(lines, extra = {}) {
  const g = Array.from({ length: N }, () => Array(N).fill(null));
  lines.forEach((line, y) => {
    for (let x = 0; x < line.length && x < N; x += 1) {
      const tone = extra[line[x]] ?? FROM_CHAR[line[x]];
      if (tone) g[y][x] = tone;
    }
  });
  return g;
}

const HULL_ART = {
  // The sloop is drawn WHOLE — hull, mast, canvas and standing rigging in
  // one map per heading.
  //
  // The earlier version had a deep, heavily planked hull carrying a small
  // hard-edged triangle, and it read as a shed with a flag on it. Every
  // convincing top-down sailing boat inverts that: a long SHALLOW hull,
  // barely more than a sliver, under a single big BILLOWING sail that
  // fills most of the tile, with a visible mast and a stay or two. The
  // canvas is the subject; the hull is what it stands on.
  //
  // `L` outlines the canvas, `W` is its body, `S` the shaded side of the
  // belly — all three resolved per livery and heading through CANVAS
  // above, so the same drawing serves working white and a pirate's black.
  sloop: {
    // Profile, bow to the right. The luff is bent to the mast at x=10 and
    // the leech bellies away aft, bulging to x=2 amidships — that curve
    // is the whole difference between canvas and a paper triangle. The
    // forestay runs from the masthead down to the stemhead.
    e: [
      '..........K.....',
      '........LWK.....',
      '.......LWWK.....',
      '......LWWWKK....',
      '.....LWWWWK.....',
      '....LWWWWWK.K...',
      '...LWDWDWSK.....',
      '..LWWWDWWSK..K..',
      '..LWWDWDWSK.....',
      '..LWWWWWWSK...K.',
      '...LWWWWWSK.....',
      '....LLLLLLK...K.',
      '.KKKKKKKKKKKKKK.',
      '.KTTTTTTTTTTTTK.',
      '.KBBBBBBBBBBBK..',
      '.KKKKKKKKKKK....',
    ],
    // Stern-on: the transom is nearest, the hull squares off across the
    // foot of the tile, and the canvas is seen nearly edge-on so it
    // narrows to a sliver.
    n: [
      '.......K........',
      '.......K........',
      '.....LWK........',
      '.....LWK........',
      '....LWWK........',
      '....LWWK........',
      '....LWWK........',
      '...LWWWK........',
      '...LWWWK........',
      '...LWWWK........',
      '...LWWWK........',
      '....LLLK........',
      '....KKKKKKKK....',
      '....KTTTTTTK....',
      '....KBBBBBBK....',
      '....KKKKKKKK....',
    ],
    // Bow-on: nearer the camera, so the same canvas is a shade wider and
    // the hull narrows to the stem coming at you.
    s: [
      '.......K........',
      '.......K........',
      '....LWWK........',
      '....LWWK........',
      '...LWWWK........',
      '...LWWWK........',
      '...LWWWK........',
      '..LWWWWK........',
      '..LWWWWK........',
      '..LWWWWK........',
      '..LWWWWK........',
      '...LLLLK........',
      '...KKKKKKKKK....',
      '...KTTTTTTTK....',
      '....KBBBBBK.....',
      '.....KKKKK......',
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

/**
 * The drawing for one vessel and heading; `w` is `e` mirrored.
 *
 * A hull is symmetric port to starboard and the rig mirrors with it, so
 * the west profile is the east one flipped — which also flips the sail to
 * the correct side, since she tows her canvas astern either way.
 */
function hullArt(kind, heading, livery = null) {
  const key = HULL_ART[kind] ? kind : 'sloop';
  const canvas = livery ? CANVAS[livery]?.[heading] : null;
  const art = parseArt(HULL_ART[key][heading === 'w' ? 'e' : heading], canvas ?? {});
  return heading === 'w' ? mirrorX(art) : art;
}

// ---------------------------------------------------------------------
// mask plumbing
// ---------------------------------------------------------------------

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
 * The sloop.
 *
 * There is no computation left here. An earlier version built the sail
 * from spans and lit it with a rule, which gave a hard-edged triangle
 * that never bellied the way canvas does; the shape wanted drawing, not
 * deriving. All that remains is choosing which tones the livery lends to
 * the canvas characters.
 */
function sloopFor(livery, heading) {
  return hullArt('sloop', heading, livery);
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
