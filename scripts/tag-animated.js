#!/usr/bin/env node
/**
 * tag-animated.js — populate `isAnimated:true` on atlas sprites whose
 * pixels differ between DawnlikeAtlas0.png and DawnlikeAtlas1.png.
 *
 * The atlas JSON's `meta.animatedCount` records that 2202 sprites have
 * a second frame, but the per-sprite `isAnimated` flag was lost in a
 * prior atlas build — leaving BootScene.js's `anim:<name>` registration
 * a no-op. This script restores that flag.
 *
 * Strategy: decode both PNGs with pngjs, walk every entry in byName,
 * compare its (x, y, w, h) byte slice; if ANY pixel differs (including
 * alpha) set isAnimated:true; otherwise leave the field absent. Writes
 * the JSON back in place.
 *
 * Run with:
 *   node scripts/tag-animated.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const ATLAS_JSON = path.join(ROOT, 'atlas', 'DawnlikeAtlas.json');
const ATLAS_0_PNG = path.join(ROOT, 'atlas', 'DawnlikeAtlas0.png');
const ATLAS_1_PNG = path.join(ROOT, 'atlas', 'DawnlikeAtlas1.png');

function decode(file) {
  const buf = fs.readFileSync(file);
  return PNG.sync.read(buf);
}

function spritesDiffer(p0, p1, x, y, w, h) {
  const stride = p0.width * 4;
  for (let yy = 0; yy < h; yy++) {
    const row = (y + yy) * stride;
    for (let xx = 0; xx < w; xx++) {
      const i = row + (x + xx) * 4;
      if (p0.data[i]     !== p1.data[i] ||
          p0.data[i + 1] !== p1.data[i + 1] ||
          p0.data[i + 2] !== p1.data[i + 2] ||
          p0.data[i + 3] !== p1.data[i + 3]) {
        return true;
      }
    }
  }
  return false;
}

console.log('Reading atlas JSON…');
const atlas = JSON.parse(fs.readFileSync(ATLAS_JSON, 'utf8'));
console.log(`  ${Object.keys(atlas.byName).length} sprites`);

console.log('Decoding PNG sheets…');
const png0 = decode(ATLAS_0_PNG);
const png1 = decode(ATLAS_1_PNG);
if (png0.width !== png1.width || png0.height !== png1.height) {
  throw new Error('Sheet dimensions differ; refusing to compare.');
}
console.log(`  ${png0.width}x${png0.height}`);

console.log('Diffing every sprite…');
let animated = 0;
let already = 0;
let removed = 0;
const entries = Object.entries(atlas.byName);
for (let i = 0; i < entries.length; i++) {
  const [, info] = entries[i];
  const x = info.x, y = info.y;
  const w = info.w || 32, h = info.h || 32;
  const hadFlag = info.isAnimated === true;
  const differs = spritesDiffer(png0, png1, x, y, w, h);
  if (differs) {
    info.isAnimated = true;
    animated++;
    if (hadFlag) already++;
  } else if (hadFlag) {
    delete info.isAnimated;
    removed++;
  }
  if (i % 500 === 0) process.stdout.write(`\r  ${i + 1} / ${entries.length}`);
}
process.stdout.write('\r');
console.log(`  done. ${animated} animated, ${already} already-flagged, ${removed} reset.`);

atlas.meta = { ...atlas.meta, animatedCount: animated };

console.log('Writing atlas JSON…');
fs.writeFileSync(ATLAS_JSON, JSON.stringify(atlas) + '\n');
console.log('Done.');
