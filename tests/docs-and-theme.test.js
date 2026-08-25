/**
 * Two kinds of drift this repo has actually suffered, both caught here so
 * they cannot come back quietly.
 *
 * 1. Sprite counts in prose. The atlas has grown twice — 235 generated
 *    shore tiles, then 64 watered-soil tiles — and each time the numbers
 *    quoted in the Storybook copy, the getting-started page and the skill
 *    file were left behind. Six separate places still said "4,157 sprites
 *    in a 2048x2080 PNG" long after neither was true.
 *
 * 2. Off-palette UI chrome. Every sprite is DawnBringer 16; the interface
 *    around them had drifted to Material Design green, Material blue and a
 *    spread of neutral greys, so the chrome and the art no longer looked
 *    like one project. src/theme.css is now the only place a raw colour is
 *    allowed to be written down.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const atlas = JSON.parse(read('atlas/DawnlikeAtlas.json'));

const SPRITES = Object.keys(atlas.byName).length;
const ANIMATED = Object.values(atlas.byName).filter((s) => s.isAnimated).length;
const { w: SHEET_W, h: SHEET_H } = atlas.meta.size;
const COLS = SHEET_W / 32;
const ROWS = SHEET_H / 32;

const group = (n) => n.toLocaleString('en-US');

/**
 * Files that quote atlas figures in prose a reader will believe.
 *
 * CHANGELOG.md is deliberately NOT in this list. A changelog entry
 * records the atlas as it was when that change landed — "the atlas grew
 * from 69 to 70 rows" is *supposed* to name a size that is no longer
 * current, and rewriting it to today's numbers would turn a history into
 * a lie. Do not add it here.
 */
const PROSE = [
  'stories/MegaAtlas.stories.jsx',
  'stories/SpriteBrowser.stories.jsx',
  'stories/GettingStarted.mdx',
  'stories/AtlasApi.mdx',
  'README.md',
  '.claude/skills/dawnlike-atlas/SKILL.md',
];

describe('documented atlas figures', () => {
  it('the atlas is the size the tests expect', () => {
    expect(SHEET_W % 32).toBe(0);
    expect(SHEET_H % 32).toBe(0);
    expect(SPRITES).toBeLessThanOrEqual(COLS * ROWS);
  });

  it.each(PROSE)('%s quotes no superseded sprite count', (file) => {
    const text = read(file);
    // Any five-figure-with-comma number in the 4,000s that is not the live
    // count is a leftover. 4,157 is the one legitimate exception: it is the
    // count of ORIGINAL DawnLike art, which does not change when this repo
    // generates new tiles on top of it.
    const quoted = [...text.matchAll(/\b4,\d{3}\b/g)].map((m) => m[0]);
    const stale = quoted.filter((n) => n !== group(SPRITES) && n !== '4,157');
    expect(stale, `stale sprite counts in ${file}`).toEqual([]);
  });

  it.each(PROSE)('%s quotes no superseded sheet dimensions', (file) => {
    const text = read(file);
    const dims = [...text.matchAll(/\b2048[x×](\d{3,4})\b/g)].map((m) => m[0]);
    const stale = dims.filter((d) => !d.endsWith(String(SHEET_H)));
    expect(stale, `stale sheet size in ${file}`).toEqual([]);
  });

  it.each(PROSE)('%s quotes no superseded grid shape', (file) => {
    const text = read(file);
    const grids = [...text.matchAll(/\b64[x×](\d{2})\b/g)].map((m) => m[0]);
    const stale = grids.filter((g) => !g.endsWith(String(ROWS)));
    expect(stale, `stale grid shape in ${file}`).toEqual([]);
  });

  it.each(PROSE)('%s quotes no superseded animated-sprite count', (file) => {
    const text = read(file);
    // Any 1,xxx figure in this corpus is an animated-sprite count; there
    // is nothing else in that range the docs talk about. The README and
    // the skill file both drifted to 1,258 and stayed there through two
    // atlas growths.
    const quoted = [...text.matchAll(/\b1,\d{3}\b/g)].map((m) => m[0]);
    const stale = quoted.filter((n) => n !== group(ANIMATED));
    expect(stale, `stale animated counts in ${file}`).toEqual([]);
  });
});

describe('UI chrome stays on the DawnBringer 16 palette', () => {
  const DB16 = [
    '#140c1c', '#452434', '#30346d', '#4d494d', '#864d30', '#346524',
    '#d34549', '#757161', '#6daa2c', '#d37d2c', '#597dcf', '#dbd75d',
    '#6dc3cb', '#d3aa9a', '#dfefd7', '#8696a2',
  ];

  /** Surfaces sit under the art rather than in it; see src/theme.css. */
  const SURFACES = ['#0a0710', '#1b1220', '#241a2b', '#2f2337', '#3a2b41', '#55405d'];

  /** The Farm story's four daylight letterbox grounds, documented in Farm.css. */
  const FARM_PHASES = ['#3a2b1f', '#2a2419', '#201d26', '#14121c'];

  const ALLOWED = new Set([...DB16, ...SURFACES, ...FARM_PHASES]);

  const cssFiles = [
    'src/theme.css', 'src/Autotile.css', 'src/AutotileLab.css', 'src/Farm.css',
    'src/Menu.css', 'src/SpriteBrowser.css', 'src/Components.css',
    'src/CharacterGallery.css', 'src/components/SpriteSheet.css',
  ];

  it.each(cssFiles)('%s writes no colour outside the palette', (file) => {
    const text = read(file)
      // Comments explain what was removed, and name the colours by value.
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const hexes = [...text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase());
    const offPalette = [...new Set(hexes)].filter((h) => !ALLOWED.has(h));
    expect(offPalette, `off-palette colours in ${file}`).toEqual([]);
  });

  it('theme.css defines every DawnBringer 16 entry', () => {
    const text = read('src/theme.css');
    for (const c of DB16) expect(text).toContain(c);
  });

  it('no stylesheet reintroduces Material Design green', () => {
    for (const file of cssFiles) {
      const body = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
      expect(body.toLowerCase(), file).not.toContain('#4caf50');
    }
  });
});
