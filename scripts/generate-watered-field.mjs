#!/usr/bin/env node
/**
 * generate-watered-field — derive "watered soil" tiles from DawnLike's
 * own plowed-field art.
 *
 * WHY THIS EXISTS
 *
 * DawnLike ships `<time> plowed field <suffix>` in all four daylight
 * tints and the full 16-suffix floor set, which is everything a farming
 * game needs for tilled earth — except the other half of the mechanic.
 * Every farming sim distinguishes DRY tilled soil from WATERED tilled
 * soil, because watering is the daily chore the whole loop is built
 * around. There is no wet variant in the pack, so `FarmExample` had
 * nothing to render for a watered tile.
 *
 * HOW THEY ARE DERIVED
 *
 * These are not drawn from scratch like the shore tiles — the plowed
 * field already has the right furrows, and redrawing them would only
 * make the wet and dry tiles disagree about where the ridges are. Each
 * watered tile is the corresponding plowed tile with its palette
 * remapped, so wet and dry are pixel-for-pixel the same relief.
 *
 * The interesting part is what "wet" means in a 16-colour palette.
 * DawnLike's four daylight tints are not lighting passes — they are the
 * same three-tone ramp rotated one step darker and cooler each time
 * (morning orange → day brown → dusk dark grey → night navy). So the
 * obvious rule, "darken it", produces `day plowed field` when applied to
 * morning, and produces *nothing at all* at night, where the tile has
 * already bottomed out at navy and black. An automatic
 * blend-toward-navy-and-snap-to-DB16 pass was tried first and collapsed
 * exactly there: at dusk and night, every source colour snapped back to
 * itself.
 *
 * What actually reads as wet across all four tints is a hue move, not a
 * value move: **replace the warm highlight with a cool sheen and deepen
 * the shadow**. Wet earth loses its warm scatter and picks up a cold
 * specular. That is a per-tint lookup table (below), small enough to
 * read and reason about, and it guarantees contrast at every time of day
 * instead of hoping a formula lands. At night, where there is no room
 * left to darken, the rule inverts and the sheen BRIGHTENS — moonlight
 * on standing water — which is the one case a mechanical darkening rule
 * could never have produced.
 *
 * Every destination colour is a DawnBringer 16 entry, so the results
 * stay inside the palette the rest of the pack is drawn in.
 *
 * USAGE
 *
 *   node scripts/generate-watered-field.mjs           # preview PNG only
 *   node scripts/generate-watered-field.mjs --apply   # write into the atlas
 *   node scripts/generate-watered-field.mjs --out DIR # where previews land
 *
 * `--apply` is purely additive and idempotent, exactly as in
 * generate-shore.mjs: existing sprites never move, re-running rewrites
 * the watered tiles in the cells they already occupy, and the sheet
 * grows by whole rows only when it runs out of free cells.
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

/** The 16 floor suffixes every DawnLike floor family carries. */
export const FLOOR_SUFFIXES = [
  'nw', 'n', 'ne', 'nwe', 'nswe', 'w', 'c', 'e',
  'sw', 's', 'se', 'swe', 'ns', 'nsw', 'nse', 'we',
];

/** The four daylight tints, and the source family they derive from. */
export const TIMES = ['morning', 'day', 'dusk', 'night'];

const SOURCE_FAMILY = (time) => `${time} plowed field`;
const TARGET_FAMILY = (time) => `${time} watered field`;

/**
 * Per-tint palette remap, keyed by DB16 name.
 *
 * Read each row as: body → wetter body, warm highlight → cool sheen,
 * shadow → deeper shadow. The roles differ per tint because DawnLike
 * rotates the ramp: at dusk and night a single colour plays both the
 * highlight and the rim-highlight, which is why those rows are shorter.
 *
 * Collisions are intentional where they occur (e.g. `day` sends both
 * `orange` and `grey` to `blueGrey`): merging the highlight and
 * rim-highlight into one tone is what the pack itself does at dusk and
 * night, so doing it here keeps the wet tiles consistent with the dry
 * ones rather than inventing extra detail.
 */
export const WET_MAP = {
  // Bright and warm — the most room to move. The tan highlight becoming
  // blueGrey is the whole effect in one substitution.
  morning: {
    orange:   'brown',      // body: soaked earth
    tan:      'blueGrey',   // highlight → cool sheen
    brown:    'navy',       // shadow deepens
    grey:     'darkGrey',   // furrow rim
    blueGrey: 'grey',       // rim highlight
  },
  day: {
    brown:    'darkGrey',
    orange:   'blueGrey',   // highlight → cool sheen
    navy:     'black',      // shadow deepens
    darkGrey: 'navy',
    grey:     'blueGrey',
  },
  dusk: {
    darkGrey: 'navy',
    brown:    'blueGrey',   // highlight → cool sheen
    navy:     'maroon',
    maroon:   'black',
  },
  // Nowhere darker to go: navy is already the body and black is already
  // the shadow. So night inverts the rule — the sheen BRIGHTENS to blue,
  // which reads as moonlight sitting on the water.
  night: {
    navy:     'navy',       // body unchanged
    darkGrey: 'blue',       // highlight → moon sheen
    maroon:   'navy',
    black:    'maroon',
  },
};

const rgbKey = (r, g, b) => `${r},${g},${b}`;

/** DB16 colour → its palette name, for looking source pixels up. */
const NAME_BY_RGB = new Map(
  Object.entries(PALETTE).map(([name, [r, g, b]]) => [rgbKey(r, g, b), name]),
);

// ---------------------------------------------------------------------
// recolour
// ---------------------------------------------------------------------

/**
 * Recolour one source tile through a tint's map.
 *
 * Every opaque pixel must be a DB16 colour the map covers. Anything else
 * is a sign the source art changed under us, so this throws rather than
 * silently passing an unmapped colour through and shipping a tile that
 * is half wet.
 *
 * @param {PNG} sheet  - the atlas sheet to read from
 * @param {{x:number,y:number,w:number,h:number}} src - source cell
 * @param {Record<string,string>} map - DB16 name → DB16 name
 * @param {string} label - for error messages
 * @returns {PNG} a w×h tile
 */
export function recolourTile(sheet, src, map, label) {
  const out = new PNG({ width: src.w, height: src.h });
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const si = (sheet.width * (src.y + y) + (src.x + x)) << 2;
      const di = (out.width * y + x) << 2;
      const alpha = sheet.data[si + 3];
      if (alpha === 0) {
        out.data[di] = 0; out.data[di + 1] = 0; out.data[di + 2] = 0; out.data[di + 3] = 0;
        continue;
      }
      const key = rgbKey(sheet.data[si], sheet.data[si + 1], sheet.data[si + 2]);
      const sourceName = NAME_BY_RGB.get(key);
      if (!sourceName) {
        throw new Error(`${label}: pixel (${x},${y}) colour ${key} is not a DawnBringer 16 entry`);
      }
      const targetName = map[sourceName];
      if (!targetName) {
        throw new Error(
          `${label}: no wet mapping for '${sourceName}' — add it to WET_MAP`,
        );
      }
      const [r, g, b] = PALETTE[targetName];
      out.data[di] = r; out.data[di + 1] = g; out.data[di + 2] = b; out.data[di + 3] = alpha;
    }
  }
  return out;
}

/** Every sprite this generator owns, in a stable order. */
export function wateredSprites() {
  const out = [];
  for (const time of TIMES) {
    for (const suffix of FLOOR_SUFFIXES) {
      out.push({
        name: `${TARGET_FAMILY(time)} ${suffix}`,
        source: `${SOURCE_FAMILY(time)} ${suffix}`,
        time,
        suffix,
      });
    }
  }
  return out;
}

function readAtlas() {
  return JSON.parse(fs.readFileSync(ATLAS_JSON, 'utf8'));
}

// ---------------------------------------------------------------------
// preview
// ---------------------------------------------------------------------

function writePreview(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const atlas = readAtlas();
  const sheet = PNG.sync.read(fs.readFileSync(SHEETS[0]));
  const tile = atlas.meta.tile.w;

  const SC = 3;
  const CELL = tile * SC;
  const COLS = FLOOR_SUFFIXES.length;
  // Two rows per tint: dry on top, wet underneath, so the comparison is
  // the point of the preview rather than something you have to hunt for.
  const png = new PNG({ width: COLS * CELL, height: TIMES.length * 2 * CELL });
  png.data.fill(0);

  const blit = (img, cx, cy) => {
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const si = (img.width * y + x) << 2;
        if (img.data[si + 3] === 0) continue;
        for (let sy = 0; sy < SC; sy++) {
          for (let sx = 0; sx < SC; sx++) {
            const di = (png.width * (cy + y * SC + sy) + (cx + x * SC + sx)) << 2;
            png.data[di] = img.data[si];
            png.data[di + 1] = img.data[si + 1];
            png.data[di + 2] = img.data[si + 2];
            png.data[di + 3] = 255;
          }
        }
      }
    }
  };

  let missing = 0;
  TIMES.forEach((time, ti) => {
    FLOOR_SUFFIXES.forEach((suffix, si) => {
      const src = atlas.byName[`${SOURCE_FAMILY(time)} ${suffix}`];
      if (!src) { missing += 1; return; }
      const dry = new PNG({ width: tile, height: tile });
      for (let y = 0; y < tile; y++) {
        for (let x = 0; x < tile; x++) {
          const a = (sheet.width * (src.y + y) + (src.x + x)) << 2;
          const b = (tile * y + x) << 2;
          dry.data[b] = sheet.data[a]; dry.data[b + 1] = sheet.data[a + 1];
          dry.data[b + 2] = sheet.data[a + 2]; dry.data[b + 3] = sheet.data[a + 3];
        }
      }
      const wet = recolourTile(sheet, src, WET_MAP[time], `${time} ${suffix}`);
      blit(dry, si * CELL, (ti * 2) * CELL);
      blit(wet, si * CELL, (ti * 2 + 1) * CELL);
    });
  });

  const dst = path.join(dir, 'watered-field.png');
  fs.writeFileSync(dst, PNG.sync.write(png));
  console.log(`preview  ${dst}`);
  console.log(`         ${TIMES.length} tints × (dry row, wet row) × ${COLS} suffixes`);
  console.log(`         order: ${FLOOR_SUFFIXES.join(' · ')}`);
  if (missing) console.log(`         WARNING: ${missing} source tiles missing from the atlas`);
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
  const atlas = readAtlas();
  const sprites = wateredSprites();
  const cols = atlas.meta.columns;
  const tile = atlas.meta.tile.w;

  const absent = sprites.filter((s) => !atlas.byName[s.source]);
  if (absent.length) {
    throw new Error(
      `missing ${absent.length} source sprites, e.g. '${absent[0].source}'`,
    );
  }

  // Which cells are already taken? Re-running must reuse the cells the
  // watered tiles already occupy rather than appending a second copy.
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
  // Read every source tile BEFORE growing/writing, so a destination cell
  // can never be read back as a source mid-pass.
  const rendered = sprites.map((sprite) => ({
    sprite,
    img: recolourTile(sheets[0], atlas.byName[sprite.source], WET_MAP[sprite.time], sprite.name),
  }));

  sheets = sheets.map((s) => grow(s, height));

  for (const { sprite, img } of rendered) {
    const index = assign.get(sprite.name);
    const cx = (index % cols) * tile;
    const cy = Math.floor(index / cols) * tile;

    for (let y = 0; y < tile; y++) {
      for (let x = 0; x < tile; x++) {
        const si = (img.width * y + x) << 2;
        const di = (sheets[0].width * (cy + y) + (cx + x)) << 2;
        sheets[0].data[di] = img.data[si];
        sheets[0].data[di + 1] = img.data[si + 1];
        sheets[0].data[di + 2] = img.data[si + 2];
        sheets[0].data[di + 3] = img.data[si + 3];
        // Plowed fields are static, so the wet ones are too: frame 1
        // stays transparent. Zero it explicitly rather than trusting the
        // cell to have been empty, so a re-run is always idempotent.
        sheets[1].data[di] = 0; sheets[1].data[di + 1] = 0;
        sheets[1].data[di + 2] = 0; sheets[1].data[di + 3] = 0;
      }
    }

    atlas.byName[sprite.name] = {
      x: cx, y: cy, w: tile, h: tile,
      tags: ['terrain', 'floor', 'farm', 'soil', 'watered', sprite.time],
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

  console.log(`applied  ${sprites.length} sprites across ${TIMES.length} tints`);
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
