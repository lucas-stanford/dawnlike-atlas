#!/usr/bin/env node
/**
 * generate-shore — draw the DawnLike shore (land ↔ water) transition tiles.
 *
 * WHY THIS EXISTS
 *
 * DawnLike has no coastline art. The pool families (`stone clear pool …`)
 * draw a dark blue rocky rim, because they are meant for a pool set into
 * a dungeon floor — put one next to a beach and you get a hard navy ring
 * around your island. The floor families (`day dirt floor …`) are fully
 * opaque with a pale rim on their missing sides, so a sand tile beside a
 * water tile draws *two* competing borders.
 *
 * These tiles do the whole transition inside one cell: land in the
 * middle, surf at the boundary, and TRANSPARENT where the water goes so
 * whatever water tile you render underneath shows through. One shore set
 * therefore works over clear water, murky water, or lava.
 *
 * HOW THEY ARE DRAWN
 *
 * Every tile is authored at 16×16 and upscaled 2× with nearest-neighbour,
 * because the whole atlas is a strict 2× upscale of DawnLike's original
 * 16×16 art. Drawing straight at 32×32 would put pixels off DawnLike's
 * grid and read as a different art style. Colours come only from the
 * DawnBringer 16 palette the pack already uses (see PALETTE below).
 *
 * The water mask is built from per-side bands, then:
 *   - convex land corners are carved by one pixel so the coast rounds
 *     the way DawnLike's own rims do,
 *   - land pixels touching water become a darker "wet" tone,
 *   - water pixels touching land get broken foam,
 *   - everything else in the water region is left transparent.
 *
 * Foam differs between frame 0 and frame 1, so the surf shimmers in sync
 * with DawnLike's 2-frame animated water.
 *
 * USAGE
 *
 *   node scripts/generate-shore.mjs              # preview PNGs only
 *   node scripts/generate-shore.mjs --apply      # write into the atlas
 *   node scripts/generate-shore.mjs --out DIR    # where previews land
 *
 * `--apply` is purely additive: existing sprites never move. New cells
 * are appended after the last used cell, growing the sheet by whole rows
 * when it runs out, and `meta.size` / `meta.rows` are updated to match.
 * Re-running it rewrites the shore tiles in the cells they already
 * occupy, so it is safe to iterate on the art.
 */

import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ATLAS_JSON = path.join(ROOT, 'atlas/DawnlikeAtlas.json');
const SHEETS = [
  path.join(ROOT, 'atlas/DawnlikeAtlas0.png'),
  path.join(ROOT, 'atlas/DawnlikeAtlas1.png'),
];

/** DawnBringer 16 — the exact palette the rest of the pack is drawn in. */
const PALETTE = {
  black:    [0x14, 0x0c, 0x1c],
  maroon:   [0x45, 0x24, 0x34],
  navy:     [0x30, 0x34, 0x6d],
  darkGrey: [0x4d, 0x49, 0x4d],
  brown:    [0x86, 0x4d, 0x30],
  darkGreen:[0x34, 0x65, 0x24],
  red:      [0xd3, 0x45, 0x49],
  grey:     [0x75, 0x71, 0x61],
  green:    [0x6d, 0xaa, 0x2c],
  orange:   [0xd3, 0x7d, 0x2c],
  blue:     [0x59, 0x7d, 0xcf],
  yellow:   [0xdb, 0xd7, 0x5d],
  cyan:     [0x6d, 0xc3, 0xcb],
  tan:      [0xd3, 0xaa, 0x9a],
  white:    [0xdf, 0xef, 0xd7],
  blueGrey: [0x86, 0x96, 0xa2],
};

/**
 * Shore themes. Each is four palette roles:
 *   base    — the land fill
 *   speckle — sparse grains scattered through the land
 *   wet     — land pixels touching water (damp sand / wet rock)
 *   foam    — broken surf line just outside the land
 */
const THEMES = {
  // `wet` follows DawnLike's own floor convention: its dirt floor rims
  // its edges in a LIGHTER tan, and its grass floor falls back to dirt
  // at the edges rather than to a darker green. Matching that keeps the
  // shores looking like part of the pack instead of a bolt-on.
  'sand shore':  { base: 'orange',   speckle: 'grey',      wet: 'tan',      foam: 'white' },
  'grass shore': { base: 'green',    speckle: 'darkGreen', wet: 'orange',   foam: 'white' },
  'snow shore':  { base: 'white',    speckle: 'blueGrey',  wet: 'blueGrey', foam: 'blue' },
  'mud shore':   { base: 'brown',    speckle: 'maroon',    wet: 'maroon',   foam: 'grey' },
  'ash shore':   { base: 'darkGrey', speckle: 'black',     wet: 'maroon',   foam: 'red' },
};

/**
 * THE 47-TILE BLOB SET
 *
 * A tile's appearance depends on all 8 neighbours, which is 2^8 = 256
 * configurations — but most collapse. A diagonal only changes anything
 * when BOTH of its adjacent cardinals are land: if the north side is
 * already water, the north band has cut the whole NW corner away and the
 * NW diagonal cannot matter. Collapsing on that rule leaves exactly 47
 * distinct tiles, the classic "blob" set:
 *
 *   4 cardinals land  → 4 eligible corners  → 16
 *   3 cardinals land  → 2 eligible corners  → 4 × 4 = 16
 *   2 adjacent land   → 1 eligible corner   → 4 × 2 = 8
 *   2 opposite land   → 0 eligible corners  → 2
 *   1 cardinal land   → 0 eligible corners  → 4
 *   0 cardinals land  → 0 eligible corners  → 1
 *                                             ------
 *                                               47
 *
 * NAMING. The suffix is the water cardinals (n-s-w-e order, the same
 * spelling the floor families use for their missing neighbours), then one
 * `d<corner>` token per corner cut by a water diagonal:
 *
 *   'c'            no water at all
 *   'n'            water to the north
 *   'nw'           water north AND west  (cardinals — not a corner)
 *   'dnw'          all cardinals land, NW diagonal is water
 *   'n dse'        water north, and the SE diagonal is water too
 *   'dnw dse'      all cardinals land, two opposite diagonals are water
 *
 * The 20 tiles this generator originally shipped are exactly the subset
 * with no `d` token, plus the four single-corner tiles — so growing to
 * the full set renamed nothing and moved no cell.
 */
const CARDINALS = ['n', 's', 'w', 'e'];

/** Which two cardinals flank each corner. */
const CORNER_CARDINALS = { nw: ['n', 'w'], ne: ['n', 'e'], sw: ['s', 'w'], se: ['s', 'e'] };
const CORNERS = Object.keys(CORNER_CARDINALS);

const subsetsOf = (items) =>
  items.reduce((acc, item) => acc.concat(acc.map((s) => [...s, item])), [[]]);

/** Build the suffix for a given water-cardinal / cut-corner pair. */
export function shoreSuffix(water, cut) {
  const cardinalToken = CARDINALS.filter((d) => water.includes(d)).join('');
  const cornerTokens = CORNERS.filter((c) => cut.includes(c)).map((c) => `d${c}`);
  return [cardinalToken, ...cornerTokens].filter(Boolean).join(' ') || 'c';
}

/** All 47 variants, each as { suffix, water, cut }. */
export const VARIANTS = (() => {
  const out = [];
  for (const water of subsetsOf(CARDINALS)) {
    // A corner is only eligible to be cut when neither flanking cardinal
    // is already water — otherwise the band has removed it anyway.
    const eligible = CORNERS.filter((c) => CORNER_CARDINALS[c].every((d) => !water.includes(d)));
    for (const cut of subsetsOf(eligible)) {
      out.push({ suffix: shoreSuffix(water, cut), water, cut });
    }
  }
  return out;
})();

const ALL_SUFFIXES = VARIANTS.map((v) => v.suffix);
const VARIANT_BY_SUFFIX = new Map(VARIANTS.map((v) => [v.suffix, v]));

const N = 16;          // logical authoring resolution
const SCALE = 2;       // → 32×32, matching the pack
const BAND = 5;        // water band depth, logical px
const DIAG = 5;        // corner notch reach — matches BAND so seams line up

/** Deterministic small hash → the art is identical on every run. */
function hash(x, y, salt = 0) {
  let h = (x * 374761393 + y * 668265263 + salt * 2246822519) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff;
}

/**
 * Water mask for one variant.
 *
 * Cardinal sides get a band whose depth wobbles by ±1 along its length,
 * so a long coast does not read as a ruled line. The wobble is a pure
 * function of the coordinate running along the edge, so two adjacent
 * tiles of the same family always meet cleanly at the seam.
 *
 * Cut corners add a 45° notch anchored at that corner, which is what a
 * water diagonal looks like when both flanking cardinals are land. Its
 * reach along each edge matches the band depth, so a notch lines up with
 * the neighbouring tile's band.
 */
function waterMask({ water, cut }) {
  const mask = Array.from({ length: N }, () => new Array(N).fill(false));
  const depth = (t, salt) => BAND + Math.round(hash(t, 0, salt) * 2) - 1;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (water.includes('n') && y < depth(x, 1)) mask[y][x] = true;
      if (water.includes('s') && y >= N - depth(x, 2)) mask[y][x] = true;
      if (water.includes('w') && x < depth(y, 3)) mask[y][x] = true;
      if (water.includes('e') && x >= N - depth(y, 4)) mask[y][x] = true;

      for (const corner of cut) {
        const dx = corner.includes('w') ? x : N - 1 - x;
        const dy = corner.includes('n') ? y : N - 1 - y;
        if (dx + dy < DIAG + Math.round(hash(dx, dy, 7) * 1.4)) mask[y][x] = true;
      }
    }
  }

  // Round convex land corners: a land pixel with water on two
  // perpendicular sides is a 90° spike, which DawnLike's own rims never
  // have. Carve it, using a snapshot so the pass is order-independent.
  const before = mask.map((row) => [...row]);
  const wet = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? false : before[y][x]);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (before[y][x]) continue;
      const vert = wet(x, y - 1) || wet(x, y + 1);
      const horiz = wet(x - 1, y) || wet(x + 1, y);
      if (vert && horiz) mask[y][x] = true;
    }
  }

  return mask;
}

/**
 * Render one 32×32 RGBA tile.
 *
 * @param {string} theme   key into THEMES
 * @param {string} suffix  one of the 47 variant suffixes
 * @param {0|1} frame      which animation frame (shifts the foam)
 */
function renderTile(theme, suffix, frame) {
  const spec = THEMES[theme];
  const variant = VARIANT_BY_SUFFIX.get(suffix);
  if (!variant) throw new Error(`Unknown shore variant: "${suffix}"`);
  const mask = waterMask(variant);
  const png = new PNG({ width: N * SCALE, height: N * SCALE });

  const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? null : mask[y][x]);
  // Off-tile counts as the same kind as the edge pixel, so a coast never
  // grows a spurious foam line along the tile border.
  const isWater = (x, y) => at(x, y) ?? mask[Math.min(N - 1, Math.max(0, y))][Math.min(N - 1, Math.max(0, x))];

  const touches = (x, y, want) =>
    isWater(x - 1, y) === want || isWater(x + 1, y) === want ||
    isWater(x, y - 1) === want || isWater(x, y + 1) === want;

  const put = (x, y, rgb, alpha = 255) => {
    for (let sy = 0; sy < SCALE; sy++) {
      for (let sx = 0; sx < SCALE; sx++) {
        const i = (png.width * (y * SCALE + sy) + (x * SCALE + sx)) << 2;
        png.data[i] = rgb ? rgb[0] : 0;
        png.data[i + 1] = rgb ? rgb[1] : 0;
        png.data[i + 2] = rgb ? rgb[2] : 0;
        png.data[i + 3] = rgb ? alpha : 0;
      }
    }
  };

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (mask[y][x]) {
        // Water region: transparent, except a broken foam line hugging
        // the land. The break pattern differs per frame so the surf
        // shimmers along with DawnLike's animated water underneath.
        const onEdge = touches(x, y, false);
        // Mostly-continuous surf. Fully solid reads as a drawn outline;
        // much below this and the line breaks into noise.
        if (onEdge && hash(x, y, 11 + frame * 29) > 0.15) {
          put(x, y, PALETTE[spec.foam]);
        } else {
          put(x, y, null);
        }
      } else {
        // Land region: base fill, damp tone where it meets the water,
        // sparse grains elsewhere.
        if (touches(x, y, true)) {
          put(x, y, PALETTE[spec.wet]);
        } else if (hash(x, y, 3) > 0.91) {
          put(x, y, PALETTE[spec.speckle]);
        } else {
          put(x, y, PALETTE[spec.base]);
        }
      }
    }
  }

  return png;
}

/** Every sprite this generator owns, in a stable order. */
function shoreSprites() {
  const out = [];
  for (const theme of Object.keys(THEMES)) {
    for (const suffix of ALL_SUFFIXES) out.push({ name: `${theme} ${suffix}`, theme, suffix });
  }
  return out;
}

// ---------------------------------------------------------------------
// preview
// ---------------------------------------------------------------------

function writePreview(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const SC = 4, TILE = N * SCALE * SC, COLS = 8;
  const rows = Math.ceil(VARIANTS.length / COLS);

  for (const theme of Object.keys(THEMES)) {
    const png = new PNG({ width: COLS * TILE, height: rows * TILE });
    // Water backdrop: these tiles are transparent where their water goes,
    // so a preview on anything else shows the wrong thing.
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = PALETTE.cyan[0]; png.data[i + 1] = PALETTE.cyan[1];
      png.data[i + 2] = PALETTE.cyan[2]; png.data[i + 3] = 255;
    }

    VARIANTS.forEach((variant, vi) => {
      const cx = (vi % COLS) * TILE, cy = Math.floor(vi / COLS) * TILE;
      const tile = renderTile(theme, variant.suffix, 0);
      for (let y = 0; y < tile.height; y++) {
        for (let x = 0; x < tile.width; x++) {
          const i = (tile.width * y + x) << 2;
          if (tile.data[i + 3] === 0) continue;
          for (let sy = 0; sy < SC; sy++) {
            for (let sx = 0; sx < SC; sx++) {
              const j = (png.width * (cy + y * SC + sy) + cx + x * SC + sx) << 2;
              png.data[j] = tile.data[i]; png.data[j + 1] = tile.data[i + 1];
              png.data[j + 2] = tile.data[i + 2]; png.data[j + 3] = 255;
            }
          }
        }
      }
    });

    const dst = path.join(dir, `shore-${theme.replace(/\s+/g, '-')}.png`);
    fs.writeFileSync(dst, PNG.sync.write(png));
  }

  console.log(`preview  ${dir}/shore-<theme>.png — ${VARIANTS.length} variants, ${COLS} per row`);
  console.log(`         order: ${ALL_SUFFIXES.join(' · ')}`);
}

// ---------------------------------------------------------------------
// apply
// ---------------------------------------------------------------------

function grow(sheet, height) {
  if (sheet.height >= height) return sheet;
  const next = new PNG({ width: sheet.width, height });
  // New rows start fully transparent.
  next.data.fill(0);
  sheet.data.copy(next.data, 0, 0, sheet.data.length);
  return next;
}

function apply() {
  const atlas = JSON.parse(fs.readFileSync(ATLAS_JSON, 'utf8'));
  const sprites = shoreSprites();
  const cols = atlas.meta.columns;
  const tile = atlas.meta.tile.w;

  // Which cells are already taken? Re-running must reuse the cells the
  // shore tiles already occupy rather than appending a second copy.
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

    sheets.forEach((sheet, frame) => {
      const img = renderTile(sprite.theme, sprite.suffix, frame);
      for (let y = 0; y < tile; y++) {
        for (let x = 0; x < tile; x++) {
          const si = (img.width * y + x) << 2;
          const di = (sheet.width * (cy + y) + (cx + x)) << 2;
          sheet.data[di] = img.data[si];
          sheet.data[di + 1] = img.data[si + 1];
          sheet.data[di + 2] = img.data[si + 2];
          sheet.data[di + 3] = img.data[si + 3];
        }
      }
    });

    const record = {
      x: cx, y: cy, w: tile, h: tile,
      tags: ['terrain', 'shore', 'water', sprite.theme.split(' ')[0]],
      isAnimated: true,
    };
    atlas.byName[sprite.name] = record;
    atlas.frames[sprite.name] = { frame: { x: cx, y: cy, w: tile, h: tile } };
    atlas.legacyFrames[String(index)] = sprite.name;
  }

  atlas.meta.size.h = height;
  atlas.meta.rows = rows;
  atlas.meta.spriteCount = Object.keys(atlas.byName).length;
  atlas.meta.animatedCount = Object.values(atlas.byName).filter((s) => s.isAnimated).length;

  // Encoding matters a lot here: these sheets ship in the npm package.
  // pngjs defaults to Z_RLE with adaptive filtering, which quadruples
  // the file for pixel art. Flat colour fields compress best with no
  // per-scanline filter and the default deflate strategy — that lands
  // within a few KB of how the pack was originally encoded.
  const PNG_OPTS = { deflateLevel: 9, deflateStrategy: 0, filterType: 0 };
  SHEETS.forEach((p, i) => fs.writeFileSync(p, PNG.sync.write(sheets[i], PNG_OPTS)));
  fs.writeFileSync(ATLAS_JSON, `${JSON.stringify(atlas, null, 0)}\n`);

  console.log(`applied  ${sprites.length} sprites across ${Object.keys(THEMES).length} themes`);
  console.log(`         sheet ${atlas.meta.size.w}×${height} (${rows} rows)`);
  console.log(`         spriteCount ${atlas.meta.spriteCount}, animated ${atlas.meta.animatedCount}`);
}

// ---------------------------------------------------------------------

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outDir = outIdx >= 0 ? args[outIdx + 1] : path.join(ROOT, 'tmp');

writePreview(outDir);
if (args.includes('--apply')) apply();
else console.log('\n(dry run — pass --apply to write into the atlas)');

export { THEMES, ALL_SUFFIXES, renderTile, shoreSprites };
