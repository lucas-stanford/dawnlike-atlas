/**
 * generate-farm-sim — the farming-sim sheet DawnLike does not ship.
 *
 * WHY A SECOND GENERATED SHEET
 *
 * DawnLike is a ROGUELIKE pack. It draws dungeons beautifully and it
 * draws a surprising amount of the countryside — grass, plowed field,
 * fences, orchards, livestock — but it draws no farm BUILDINGS. There
 * is no barn, no silo, no coop, nothing a farm is actually built
 * around. `generate-watered-field.mjs` already fills one farming gap by
 * palette-remapping the plowed field; this file starts the other, the
 * structures, and it is meant to grow: a barn today, and the sheet has
 * room for a silo, a coop and a windmill on the same ramp.
 *
 * WHAT IT DRAWS
 *
 *   barn r0c0 … r4c4   a gambrel-roofed barn, 5×5 tiles
 *   hay bale           a small stack of bound straw
 *   pitchfork          leaning against the wall
 *
 * A BUILDING IS NOT A SPRITE
 *
 * Everything else in the pack fits in one cell because everything else
 * is a thing you pick up, stand on, or fight. A barn is a thing you
 * walk AROUND, and at sixteen logical pixels a whole barn is a brown
 * smudge. So it is drawn once at full size on an 80×80 canvas and then
 * SLICED into 16px tiles, the same way a tile map is cut — which is
 * also what makes it composite correctly with everything else, because
 * each slice is an ordinary atlas sprite the example places by name.
 *
 * The slice is a plain row/column grid rather than an autotile family
 * on purpose: a barn has exactly one shape. There is nothing for a
 * resolver to decide, and naming the pieces `r2c3` keeps the mapping
 * from footprint to sprite a single line of arithmetic.
 *
 * PALETTE
 *
 * The same five DawnBringer 16 entries DawnLike uses for wood, in the
 * same ramp `generate-ship-deck.mjs` counted off the pack's own wooden
 * door: `maroon` seam, `brown` body, `orange` lit edge, `tan`
 * highlight, `black` outline. A barn is a very large area of one
 * material, so it lives or dies on that ramp being the pack's rather
 * than one invented for it.
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

/** DawnLike's wood ramp, plus the greys the pitchfork's tines need. */
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

const N = 16;      // logical authoring resolution, one tile
const SCALE = 2;   // → 32×32 cells, matching the pack

// ---------------------------------------------------------------------
// the barn
// ---------------------------------------------------------------------

export const BARN_COLS = 5;
export const BARN_ROWS = 5;

const W = BARN_COLS * N;   // 80
const H = BARN_ROWS * N;   // 80

/**
 * The barn's skeleton, in logical pixels on the 80×80 canvas.
 *
 * A gambrel roof — the double-pitched shape a hay barn has so the loft
 * gets headroom — is the whole silhouette, and it is what makes a barn
 * read as a barn rather than as a house. It is two slopes: a shallow
 * one from the ridge out to the KNUCKLE, then a much steeper one down
 * to the eaves. Getting the knuckle height wrong is the difference
 * between a barn and a shed, so it is a named constant, not a number
 * buried in a loop.
 */
const RIDGE_Y = 1;
const KNUCKLE_Y = 19;
const EAVE_Y = 49;
const WALL_TOP = 50;

const RIDGE_X0 = 30;
const RIDGE_X1 = 49;
const KNUCKLE_X0 = 1;
const KNUCKLE_X1 = 78;
const FOOT_X0 = 3;
const FOOT_X1 = 76;
const WALL_X0 = 5;
const WALL_X1 = 74;

const lerp = (a, b, t) => Math.round(a + (b - a) * t);

/** The roof's left and right edge on one row, or null off the roof. */
function roofSpan(y) {
  if (y < RIDGE_Y || y > EAVE_Y) return null;
  if (y <= KNUCKLE_Y) {
    const t = (y - RIDGE_Y) / (KNUCKLE_Y - RIDGE_Y);
    return [lerp(RIDGE_X0, KNUCKLE_X0, t), lerp(RIDGE_X1, KNUCKLE_X1, t)];
  }
  const t = (y - KNUCKLE_Y) / (EAVE_Y - KNUCKLE_Y);
  return [lerp(KNUCKLE_X0, FOOT_X0, t), lerp(KNUCKLE_X1, FOOT_X1, t)];
}

const blank = () => Array.from({ length: H }, () => Array(W).fill(null));

/**
 * Step a tone one place along the ramp.
 *
 * The barn is lit from the north-west like everything else in the
 * examples, and a single 80px face needs that light to be a RAMP rather
 * than a switch — a wall that is one flat brown reads as cardboard. So
 * the courses are drawn once at their nominal tone and then walked up
 * or down this ladder by position.
 */
const RAMP = ['black', 'maroon', 'brown', 'orange', 'tan'];
function shift(tone, by) {
  const i = RAMP.indexOf(tone);
  if (i < 0) return tone;
  return RAMP[Math.min(RAMP.length - 1, Math.max(0, i + by))];
}

/** The gable batten's columns — also the seam between the roof's two planes. */
const BATTEN_X0 = 36;
const BATTEN_X1 = 43;

/**
 * One course of clapboard, four pixels deep, per roof plane.
 *
 * The two planes differ by ONE tone on ONE row, not by a step of the
 * whole ramp. A roof's two faces are only a few degrees apart, so the
 * plane in shade simply loses its lit edge — dropping every tone a step
 * turns the far slope into a hole in the sky.
 */
const COURSE = {
  lit:   ['orange', 'brown', 'brown', 'maroon'],
  shade: ['brown', 'brown', 'brown', 'maroon'],
};

/** Draw the barn at full size, before it is cut into tiles. */
export function drawBarn() {
  const px = blank();
  const put = (x, y, tone) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    px[y][x] = tone;
  };

  // ---- roof: horizontal clapboard courses -------------------------
  //
  // Courses three pixels deep — a lit top edge, a body, a shadowed
  // seam. That is the same three-tone plank the deck generator draws,
  // stood on its side and repeated up the slope.
  //
  // The light is a two-PLANE read, not a gradient: a gable roof is two
  // flat faces meeting at the ridge, so one catches the sun and the
  // other does not, and the step between them falls exactly on the
  // batten that covers the join. An interpolated gradient across the
  // whole roof would be the lighting of a cylinder.
  for (let y = RIDGE_Y; y <= EAVE_Y; y += 1) {
    const span = roofSpan(y);
    if (!span) continue;
    const [x0, x1] = span;
    for (let x = x0; x <= x1; x += 1) {
      put(x, y, COURSE[x < BATTEN_X0 ? 'lit' : 'shade'][y % 4]);
    }
    // Rake boards: the roof's own outline, down both slopes.
    put(x0, y, 'black');
    put(x1, y, 'black');
  }

  // Ridge cap.
  for (let x = RIDGE_X0; x <= RIDGE_X1; x += 1) put(x, RIDGE_Y - 1, 'black');

  // ---- the gable batten -------------------------------------------
  //
  // The vertical board down the centre of the gable. It stops the roof
  // reading as a plain field of stripes, and it is what your eye uses
  // to find the front of the building — so it runs the full height of
  // the roof, ridge to eaves, unbroken by the courses behind it.
  for (let y = RIDGE_Y; y <= EAVE_Y; y += 1) {
    for (let x = BATTEN_X0; x <= BATTEN_X1; x += 1) put(x, y, 'brown');
    put(BATTEN_X0, y, 'maroon');
    put(BATTEN_X0 + 1, y, 'orange');
    put(BATTEN_X1, y, 'maroon');
  }

  // ---- eaves -------------------------------------------------------
  //
  // The roof oversails the wall by two pixels, and the shadow that
  // throws is what separates roof from wall. Without it the two
  // materials meet edge to edge and the barn goes flat.
  for (let x = FOOT_X0; x <= FOOT_X1; x += 1) put(x, EAVE_Y, 'black');

  // ---- wall: vertical board-and-batten siding ----------------------
  for (let y = WALL_TOP; y < H; y += 1) {
    for (let x = WALL_X0; x <= WALL_X1; x += 1) {
      const step = (x - WALL_X0) % 4;
      const base = step === 0 ? 'maroon' : step === 1 ? 'orange' : 'brown';
      put(x, y, shift(base, x > WALL_X1 - 7 ? -1 : 0));
    }
    put(WALL_X0, y, 'black');
    put(WALL_X1, y, 'black');
  }
  for (let x = WALL_X0; x <= WALL_X1; x += 1) put(x, H - 1, 'black');

  // ---- the arched face ---------------------------------------------
  //
  // A hay barn's front is an arch, because that is the shape a loft
  // door and the track above it want. It is drawn as MASS rather than
  // as a line: the spandrels — the corners the arch cuts off — go to
  // shadow, and the header board rides the curve. A one-pixel arc over
  // flat siding reads as somebody drew on the barn.
  const ARCH_CX = (WALL_X0 + WALL_X1) / 2;
  const ARCH_RX = (WALL_X1 - WALL_X0) / 2 - 2;
  const ARCH_RY = 12;
  const ARCH_BASE = WALL_TOP + 14;
  for (let x = WALL_X0 + 1; x < WALL_X1; x += 1) {
    const t = (x - ARCH_CX) / ARCH_RX;
    const crown = Math.abs(t) >= 1
      ? ARCH_BASE
      : Math.round(ARCH_BASE - ARCH_RY * Math.sqrt(1 - t * t));
    for (let y = WALL_TOP; y < crown; y += 1) put(x, y, 'maroon');
    put(x, crown, 'brown');
    put(x, crown + 1, 'tan');
    put(x, crown + 2, 'orange');
  }

  // ---- the doors ----------------------------------------------------
  //
  // Double leaves, each cross-braced. The brace is the detail that
  // says "barn": a plain rectangle of darker wood is a doorway on any
  // building, but an X across two leaves is a barn door. The leaves are
  // kept near square, because an X drawn corner to corner on a tall
  // narrow leaf is an hourglass.
  const DOOR_X0 = 25;
  const DOOR_X1 = 54;
  const DOOR_Y0 = H - 16;
  const DOOR_Y1 = H - 2;
  const MID = Math.floor((DOOR_X0 + DOOR_X1) / 2);

  for (let y = DOOR_Y0; y <= DOOR_Y1; y += 1) {
    for (let x = DOOR_X0; x <= DOOR_X1; x += 1) {
      put(x, y, (x - DOOR_X0) % 3 === 0 ? 'maroon' : 'brown');
    }
  }
  // Frame, then the meeting stile between the leaves.
  for (let y = DOOR_Y0 - 1; y <= DOOR_Y1 + 1; y += 1) {
    put(DOOR_X0 - 1, y, 'black');
    put(DOOR_X1 + 1, y, 'black');
  }
  for (let x = DOOR_X0 - 1; x <= DOOR_X1 + 1; x += 1) put(x, DOOR_Y0 - 1, 'black');
  // Trim: a light board just inside the frame, so the opening reads as
  // a doorway set into the wall rather than a rectangle painted on it.
  for (let y = DOOR_Y0; y <= DOOR_Y1; y += 1) {
    put(DOOR_X0, y, 'tan');
    put(DOOR_X1, y, 'tan');
  }
  for (let x = DOOR_X0; x <= DOOR_X1; x += 1) put(x, DOOR_Y0, 'tan');
  for (let y = DOOR_Y0; y <= DOOR_Y1 + 1; y += 1) put(MID, y, 'black');

  // One X per leaf, walked down the diagonals so both strokes stay a
  // single pixel wide whatever the leaf measures.
  const brace = (lx0, lx1) => {
    const h = DOOR_Y1 - DOOR_Y0;
    for (let i = 0; i <= h; i += 1) {
      const t = i / h;
      const y = DOOR_Y0 + i;
      put(lerp(lx0, lx1, t), y, 'tan');
      put(lerp(lx1, lx0, t), y, 'tan');
    }
  };
  brace(DOOR_X0 + 1, MID - 1);
  brace(MID + 1, DOOR_X1 - 1);

  return px;
}

// ---------------------------------------------------------------------
// props
// ---------------------------------------------------------------------

const ART = {
  '.': null, K: 'black', M: 'maroon', D: 'darkGrey', B: 'brown',
  O: 'orange', T: 'tan', G: 'grey', S: 'blueGrey', W: 'white',
};

function parseArt(lines) {
  const g = Array.from({ length: N }, () => Array(N).fill(null));
  lines.forEach((line, y) => {
    for (let x = 0; x < line.length && x < N; x += 1) g[y][x] = ART[line[x]] ?? null;
  });
  return g;
}

/**
 * A small stack of bound straw, and the fork you moved it with.
 *
 * Both are drawn rather than derived because they are objects, not
 * materials — there is no course or seam to repeat, just a shape. They
 * exist so a built barn has a yard rather than standing on bare grass.
 */
const PROPS = {
  'hay bale': [
    '................',
    '................',
    '....KKKKKKKK....',
    '...KTTOTTOTTK...',
    '...KTOTTOTTOK...',
    '...KKKKKKKKKK...',
    '...KTOTTOTTOK...',
    '...KTTOTTOTTK...',
    '..KKKKKKKKKKKK..',
    '..KTTOTTOTTOTK..',
    '..KTOTTOTTOTTK..',
    '..KKKKKKKKKKKK..',
    '..KTOTTOTTOTTK..',
    '..KTTOTTOTTOTK..',
    '..KKKKKKKKKKKK..',
    '................',
  ],
  pitchfork: [
    '................',
    '.....S..S..S....',
    '.....S..S..S....',
    '.....S..S..S....',
    '.....S..S..S....',
    '.....SSSSSSS....',
    '........S.......',
    '........D.......',
    '........B.......',
    '........B.......',
    '........B.......',
    '........B.......',
    '........B.......',
    '........B.......',
    '........K.......',
    '................',
  ],
};

// ---------------------------------------------------------------------
// extraction
// ---------------------------------------------------------------------

/**
 * Lift a barn out of a screenshot instead of drawing one.
 *
 * `--from <png>` exists because the drawn barn is a RECONSTRUCTION.
 * When there is real art to work from, tracing it by eye throws away
 * the only thing that matters — the actual pixels — so this reads them
 * directly and the drawing becomes the fallback rather than the source.
 *
 * Three problems have to be solved in order, and the middle one is the
 * one people get wrong:
 *
 *  1. KEY OUT the background. Sprite sheets are shipped on magenta
 *     because no artist picks magenta, so anything close to it is
 *     transparent — with a generous tolerance, since a screenshot has
 *     been through a lossy encoder and the field will not be one exact
 *     value.
 *
 *  2. UNDO THE UPSCALE. A screenshot of pixel art is not pixel art: it
 *     is pixel art blown up by some integer factor. Resampling it to
 *     80×80 without first dividing that factor out lands sample points
 *     inside blocks at irregular offsets, and the result is a mush of
 *     half-tones that no longer sits on any palette. So the factor is
 *     MEASURED — the greatest common divisor of the runs of identical
 *     colour along the sprite's rows — and then every block is read at
 *     its centre.
 *
 *  3. SNAP to the pack's ramp, so the extracted barn is on the same
 *     nine colours as everything else in the atlas and cannot be picked
 *     out by eye as an import.
 */
const MAGENTA_TOLERANCE = 60;

function isKeyColour(r, g, b) {
  // Magenta: red and blue both high, green low.
  return r > 255 - MAGENTA_TOLERANCE
    && b > 255 - MAGENTA_TOLERANCE
    && g < MAGENTA_TOLERANCE + 40;
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/** Nearest entry in the pack's wood ramp, by squared RGB distance. */
function snap(r, g, b) {
  let best = null;
  let bestD = Infinity;
  for (const [name, [pr, pg, pb]] of Object.entries(PALETTE)) {
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < bestD) { bestD = d; best = name; }
  }
  return best;
}

/**
 * Read a source PNG into an 80×80 logical grid of tone names.
 *
 * @param {string} file - a screenshot or sheet with the barn on magenta
 * @returns {string[][]} the same shape `drawBarn` returns
 */
export function extractBarn(file) {
  const src = PNG.sync.read(fs.readFileSync(file));
  const opaque = (x, y) => {
    const i = (src.width * y + x) << 2;
    if (src.data[i + 3] < 128) return null;
    const [r, g, b] = [src.data[i], src.data[i + 1], src.data[i + 2]];
    return isKeyColour(r, g, b) ? null : [r, g, b];
  };

  // 1. Bounding box of everything that is not background.
  let x0 = src.width;
  let y0 = src.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < src.height; y += 1) {
    for (let x = 0; x < src.width; x += 1) {
      if (!opaque(x, y)) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < x0) throw new Error(`${file}: found nothing but background`);

  // 2. The upscale factor, from the runs of identical colour. Sampling
  //    every fourth row keeps this quick on a large screenshot without
  //    changing the answer — one row of real pixel art is enough to
  //    give the factor away, and four are enough to be sure.
  let factor = 0;
  for (let y = y0; y <= y1; y += 4) {
    let run = 0;
    let prev = null;
    for (let x = x0; x <= x1 + 1; x += 1) {
      const c = x > x1 ? null : opaque(x, y);
      const same = c && prev && c[0] === prev[0] && c[1] === prev[1] && c[2] === prev[2];
      if (same) { run += 1; continue; }
      if (run) factor = gcd(factor, run);
      run = c ? 1 : 0;
      prev = c;
    }
  }
  const block = Math.max(1, factor);

  // 3. Read one sample from the centre of each block, then fit the
  //    result into the 80×80 canvas the slicer expects.
  const cols = Math.round((x1 - x0 + 1) / block);
  const rows = Math.round((y1 - y0 + 1) / block);
  const px = blank();
  const offX = Math.floor((W - cols) / 2);
  const offY = H - rows;   // stand it on the bottom of the canvas
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const sx = Math.min(src.width - 1, x0 + Math.floor((c + 0.5) * block));
      const sy = Math.min(src.height - 1, y0 + Math.floor((r + 0.5) * block));
      const rgb = opaque(sx, sy);
      const dx = offX + c;
      const dy = offY + r;
      if (!rgb || dx < 0 || dy < 0 || dx >= W || dy >= H) continue;
      px[dy][dx] = snap(rgb[0], rgb[1], rgb[2]);
    }
  }

  console.log(`extract  ${file} — barn at ${x0},${y0} ${x1 - x0 + 1}×${y1 - y0 + 1}px`);
  console.log(`         upscale ×${block} → ${cols}×${rows} logical, placed at ${offX},${offY}`);
  if (cols > W || rows > H) {
    console.log(`         WARNING: larger than the ${W}×${H} canvas — it will be cropped`);
  }
  return px;
}

// ---------------------------------------------------------------------
// slicing
// ---------------------------------------------------------------------

/**
 * Every sprite this script owns, each with its own 16×16 logical grid.
 *
 * @param {string[][]} [barnArt] - an 80×80 grid to slice instead of the
 *   drawn barn, as returned by `extractBarn`.
 */
export function farmSimSprites(barnArt = null) {
  const out = [];
  const barn = barnArt ?? drawBarn();
  for (let r = 0; r < BARN_ROWS; r += 1) {
    for (let c = 0; c < BARN_COLS; c += 1) {
      const cell = Array.from({ length: N }, (_, y) =>
        Array.from({ length: N }, (_, x) => barn[r * N + y][c * N + x]));
      // A gambrel roof leaves the top corners of the bounding box empty.
      // Those cells are not written to the atlas at all — an all-alpha
      // sprite is a cell of sheet nobody can ever see.
      if (!cell.some((row) => row.some(Boolean))) continue;
      out.push({ name: `barn r${r}c${c}`, kind: 'barn', row: r, col: c, px: cell });
    }
  }
  for (const [name, lines] of Object.entries(PROPS)) {
    out.push({ name, kind: 'prop', px: parseArt(lines) });
  }
  return out;
}

/** Render one sprite's logical grid to a 32×32 PNG. */
export function renderTile(sprite) {
  const png = new PNG({ width: N * SCALE, height: N * SCALE });
  for (let y = 0; y < N * SCALE; y += 1) {
    for (let x = 0; x < N * SCALE; x += 1) {
      const i = (png.width * y + x) << 2;
      const role = sprite.px[Math.floor(y / SCALE)][Math.floor(x / SCALE)];
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

function writePreview(dir, sprites) {
  fs.mkdirSync(dir, { recursive: true });
  const SC = 3;
  const TILE = N * SCALE * SC;
  const png = new PNG({ width: TILE * (BARN_COLS + 2), height: TILE * BARN_ROWS });
  png.data.fill(0);

  const paste = (img, col, row) => {
    for (let y = 0; y < N * SCALE; y += 1) {
      for (let x = 0; x < N * SCALE; x += 1) {
        const si = (img.width * y + x) << 2;
        if (!img.data[si + 3]) continue;
        for (let dy = 0; dy < SC; dy += 1) {
          for (let dx = 0; dx < SC; dx += 1) {
            const di = (png.width * (row * TILE + y * SC + dy) + col * TILE + x * SC + dx) << 2;
            png.data[di] = img.data[si];
            png.data[di + 1] = img.data[si + 1];
            png.data[di + 2] = img.data[si + 2];
            png.data[di + 3] = 255;
          }
        }
      }
    }
  };

  let prop = 0;
  for (const sprite of sprites) {
    if (sprite.kind === 'barn') paste(renderTile(sprite), sprite.col, sprite.row);
    else paste(renderTile(sprite), BARN_COLS + (prop % 2), Math.floor(prop++ / 2));
  }

  const dst = path.join(dir, 'farm-sim.png');
  fs.writeFileSync(dst, PNG.sync.write(png));
  console.log(`preview  ${dst} — ${sprites.length} tiles`);
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

const TAGS = {
  barn: ['structure', 'building', 'wooden', 'barn', 'farm', 'roof'],
  'hay bale': ['object', 'farm', 'hay', 'straw', 'decoration'],
  pitchfork: ['tool', 'farm', 'pitchfork', 'decoration'],
};

function apply(sprites) {
  const atlas = JSON.parse(fs.readFileSync(ATLAS_JSON, 'utf8'));
  const cols = atlas.meta.columns;
  const tile = atlas.meta.tile.w;

  // Same contract as the other generators: re-running reuses whatever
  // cells these names already hold, so a second `--apply` is a no-op
  // and no existing sprite ever moves.
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
        // Nothing here animates; frame 1 is zeroed explicitly so a
        // re-run cannot inherit whatever used to sit in the cell.
        sheets[1].data[di] = 0; sheets[1].data[di + 1] = 0;
        sheets[1].data[di + 2] = 0; sheets[1].data[di + 3] = 0;
      }
    }

    atlas.byName[sprite.name] = {
      x: cx, y: cy, w: tile, h: tile,
      tags: TAGS[sprite.kind === 'barn' ? 'barn' : sprite.name],
    };
    atlas.frames[sprite.name] = { frame: { x: cx, y: cy, w: tile, h: tile } };
    atlas.legacyFrames[String(index)] = sprite.name;
  }

  atlas.meta.size.h = height;
  atlas.meta.rows = rows;
  atlas.meta.spriteCount = Object.keys(atlas.byName).length;
  atlas.meta.animatedCount = Object.values(atlas.byName).filter((s) => s.isAnimated).length;

  // See generate-shore.mjs: pngjs's defaults quadruple the file size for
  // flat pixel art.
  const PNG_OPTS = { deflateLevel: 9, deflateStrategy: 0, filterType: 0 };
  SHEETS.forEach((p, i) => fs.writeFileSync(p, PNG.sync.write(sheets[i], PNG_OPTS)));
  fs.writeFileSync(ATLAS_JSON, `${JSON.stringify(atlas, null, 0)}\n`);

  console.log(`applied  ${sprites.length} farm-sim tiles`);
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
  const fromIdx = args.indexOf('--from');
  const sprites = farmSimSprites(fromIdx >= 0 ? extractBarn(args[fromIdx + 1]) : null);
  writePreview(outDir, sprites);
  if (args.includes('--apply')) apply(sprites);
  else console.log('\n(dry run — pass --apply to write into the atlas)');
}
