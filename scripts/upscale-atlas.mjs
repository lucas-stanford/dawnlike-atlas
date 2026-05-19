/**
 * scripts/upscale-atlas.mjs
 *
 * Generate a 2x-upscaled mirror of the DawnLike atlas using a strict
 * NEAREST-NEIGHBOUR upscale. Each 16x16 (or 48x48) source pixel
 * becomes a 2x2 block — so the result preserves the original
 * pixelated look exactly, just at twice the resolution. Useful when
 * you want renderers to display at native pixel size (1 atlas px =
 * 1 screen px) and still get the doubled pixel-art look without
 * relying on CSS image-rendering: pixelated.
 *
 *   atlas/DawnlikeAtlas0@2x.png    — 2x of DawnlikeAtlas0.png
 *   atlas/DawnlikeAtlas1@2x.png    — 2x of DawnlikeAtlas1.png
 *   atlas/DawnlikeAtlas@2x.json    — frames JSON with doubled coords +
 *                                    meta.tile = 32x32 and meta.scale = 2.
 *
 * Run with:  bun run scripts/upscale-atlas.mjs   (or node)
 *
 * Requires `sharp`. The script tries the repo's node_modules first;
 * if missing, falls back to /tmp/upscale/node_modules
 * (set up with `cd /tmp/upscale && npm install sharp`).
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const atlasDir = path.resolve(here, '..', 'atlas');
const SCALE = 2;

async function importDep(name) {
  try { return await import(name); } catch {}
  for (const root of ['/tmp/upscale']) {
    try {
      const req = createRequire(path.join(root, 'package.json'));
      return await import(req.resolve(name));
    } catch {}
  }
  throw new Error(`Cannot resolve ${name}. Run: cd /tmp/upscale && npm install sharp`);
}
const sharp = (await importDep('sharp')).default;

async function loadAtlasMeta() {
  const raw = await readFile(path.join(atlasDir, 'DawnlikeAtlas.json'), 'utf8');
  return JSON.parse(raw);
}

function scaledFrames(frames) {
  const out = {};
  for (const [name, frame] of Object.entries(frames)) {
    const fr = frame.frame;
    const ss = frame.spriteSourceSize;
    const src = frame.sourceSize;
    out[name] = {
      ...frame,
      frame: { x: fr.x * SCALE, y: fr.y * SCALE, w: fr.w * SCALE, h: fr.h * SCALE },
      spriteSourceSize: { x: ss.x * SCALE, y: ss.y * SCALE, w: ss.w * SCALE, h: ss.h * SCALE },
      sourceSize: { w: src.w * SCALE, h: src.h * SCALE },
    };
  }
  return out;
}

async function upscaleSheet(srcPath, dstPath, srcW, srcH) {
  // Sharp's nearest-neighbour kernel preserves every source pixel
  // exactly — no anti-aliasing, no smoothing. Each source pixel
  // becomes a SCALE x SCALE block.
  await sharp(srcPath)
    .resize(srcW * SCALE, srcH * SCALE, { kernel: sharp.kernel.nearest })
    .png({ compressionLevel: 9 })
    .toFile(dstPath);
}

async function main() {
  console.log('Loading atlas metadata...');
  const meta = await loadAtlasMeta();
  const origFrames = meta.frames;
  console.log(`  ${Object.keys(origFrames).length} sprites`);

  const doubledFrames = scaledFrames(origFrames);
  const byName = {};
  for (const [name, fr] of Object.entries(doubledFrames)) {
    byName[name] = {
      x: fr.frame.x, y: fr.frame.y,
      w: fr.frame.w, h: fr.frame.h,
      tags: fr.tags || [],
    };
  }
  const newMeta = {
    ...meta,
    meta: {
      ...meta.meta,
      tile: { w: meta.meta.tile.w * SCALE, h: meta.meta.tile.h * SCALE },
      size: { w: meta.meta.size.w * SCALE, h: meta.meta.size.h * SCALE },
      scale: SCALE,
      sheets: meta.meta.sheets.map(s => s.replace(/\.png$/, '@2x.png')),
      note: (meta.meta.note || '') + ` 2x nearest-neighbour mirror — preserves the original pixelated look.`,
    },
    frames: doubledFrames,
    byName,
  };
  const outJsonPath = path.join(atlasDir, 'DawnlikeAtlas@2x.json');
  await writeFile(outJsonPath, JSON.stringify(newMeta));
  console.log(`Wrote ${path.basename(outJsonPath)} (${Object.keys(doubledFrames).length} sprites)`);

  for (const sheetName of meta.meta.sheets) {
    const inPath = path.join(atlasDir, sheetName);
    if (!existsSync(inPath)) {
      console.log(`  (skipping ${sheetName} — file missing)`);
      continue;
    }
    console.log(`Upscaling ${sheetName}...`);
    const outName = sheetName.replace(/\.png$/, '@2x.png');
    await upscaleSheet(inPath, path.join(atlasDir, outName), meta.meta.size.w, meta.meta.size.h);
    console.log(`  Wrote ${outName} (${meta.meta.size.w * SCALE}x${meta.meta.size.h * SCALE})`);
  }
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });

