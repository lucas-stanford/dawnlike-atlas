/**
 * Render a small island with the generated shore tiles composited over a
 * water tile — the only way to judge whether the set actually works.
 *
 * Usage: node scripts/preview-shore-context.mjs <theme> <waterSprite> <out.png>
 */
import { PNG } from 'pngjs';
import fs from 'node:fs';
import { renderTile } from './generate-shore.mjs';

const theme = process.argv[2] || 'sand shore';
const waterName = process.argv[3] || 'stone clear pool center';
const out = process.argv[4] || '/tmp/context.png';

const ATLAS = JSON.parse(fs.readFileSync('atlas/DawnlikeAtlas.json', 'utf8'));
const sheet = PNG.sync.read(fs.readFileSync('atlas/DawnlikeAtlas0.png'));

const W = 20, H = 14, T = 32, SC = 2;

// A hand-shaped landmass with every interesting case: straight coasts,
// outer corners, a peninsula, a one-tile islet, and a diagonal inlet.
const rows = [
  '....................',
  '.....#######........',
  '....##########......',
  '...############.....',
  '...#############....',
  '..##############....',
  '..#############.....',
  '..###########.......',
  '...####..####.......',
  '...###....##........',
  '....#.....##....#...',
  '..........#.........',
  '....................',
  '....................',
];
const land = (x, y) => x >= 0 && y >= 0 && x < W && y < H && rows[y][x] === '#';

/** Same rule the shore resolver uses: suffix names the WATER sides. */
function suffixFor(x, y) {
  const n = !land(x, y - 1), s = !land(x, y + 1);
  const w = !land(x - 1, y), e = !land(x + 1, y);
  let suf = (n ? 'n' : '') + (s ? 's' : '') + (w ? 'w' : '') + (e ? 'e' : '');
  if (suf) return suf;
  // All cardinals are land — check the diagonals for an inner corner.
  if (!land(x - 1, y - 1)) return 'dnw';
  if (!land(x + 1, y - 1)) return 'dne';
  if (!land(x - 1, y + 1)) return 'dsw';
  if (!land(x + 1, y + 1)) return 'dse';
  return 'c';
}

const png = new PNG({ width: W * T * SC, height: H * T * SC });
const water = ATLAS.byName[waterName];

const blit = (getPx, dx, dy) => {
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const p = getPx(x, y);
      if (!p || p[3] === 0) continue;
      for (let sy = 0; sy < SC; sy++) {
        for (let sx = 0; sx < SC; sx++) {
          const i = (png.width * ((dy + y) * SC + sy) + (dx + x) * SC + sx) << 2;
          png.data[i] = p[0]; png.data[i + 1] = p[1]; png.data[i + 2] = p[2]; png.data[i + 3] = 255;
        }
      }
    }
  }
};

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    // Water everywhere underneath, exactly like the real renderer.
    blit((tx, ty) => {
      const i = (sheet.width * (water.y + ty) + (water.x + tx)) << 2;
      return [sheet.data[i], sheet.data[i + 1], sheet.data[i + 2], sheet.data[i + 3]];
    }, x * T, y * T);

    if (!land(x, y)) continue;
    const tile = renderTile(theme, suffixFor(x, y), 0);
    blit((tx, ty) => {
      const i = (tile.width * ty + tx) << 2;
      return [tile.data[i], tile.data[i + 1], tile.data[i + 2], tile.data[i + 3]];
    }, x * T, y * T);
  }
}

fs.writeFileSync(out, PNG.sync.write(png));
console.log('wrote', out, `${theme} over ${waterName}`);
