/**
 * scripts/upscale-atlas.mjs
 *
 * Generate a 2x-upscaled mirror of the DawnLike atlas using the xBRZ
 * pixel-art upscaler. Output:
 *
 *   atlas/DawnlikeAtlas0@2x.png    — 2x of DawnlikeAtlas0.png
 *   atlas/DawnlikeAtlas1@2x.png    — 2x of DawnlikeAtlas1.png
 *   atlas/DawnlikeAtlas@2x.json    — frames JSON with doubled coords +
 *                                    meta.tile = 32x32 and meta.scale = 2.
 *
 * Each sprite is upscaled INDIVIDUALLY (extract → xBRZ → paste at 2x
 * position) so adjacent cells in the packed atlas can't bleed into
 * each other. This keeps sprite edges clean.
 *
 * Run with:  bun run scripts/upscale-atlas.mjs   (or node)
 *
 * Requires `@kayahr/xbrz` and `sharp`. The script tries the repo's
 * node_modules first; if missing, falls back to /tmp/upscale/node_modules
 * (set up with `cd /tmp/upscale && npm install @kayahr/xbrz sharp`).
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
  throw new Error(`Cannot resolve ${name}. Run: cd /tmp/upscale && npm install @kayahr/xbrz sharp`);
}
const { Scaler } = await importDep('@kayahr/xbrz');
const sharp = (await importDep('sharp')).default;

async function loadAtlasMeta() {
  const raw = await readFile(path.join(atlasDir, 'DawnlikeAtlas.json'), 'utf8');
  return JSON.parse(raw);
}

async function loadSheet(name) {
  const buf = await readFile(path.join(atlasDir, name));
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function upscaleSubImage(srcRGBA, srcW, x, y, w, h, scaler) {
  const sub = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < h; row++) {
    const srcOff = ((y + row) * srcW + x) * 4;
    const dstOff = row * w * 4;
    sub.set(srcRGBA.subarray(srcOff, srcOff + w * 4), dstOff);
  }
  // Copy the result so we can keep it after the scaler reuses its
  // internal buffer on the next call.
  return new Uint8ClampedArray(scaler.scale(sub));
}

function pasteRGBA(dstRGBA, dstW, srcRGBA, srcW, srcH, x, y) {
  for (let row = 0; row < srcH; row++) {
    const srcOff = row * srcW * 4;
    const dstOff = ((y + row) * dstW + x) * 4;
    dstRGBA.set(srcRGBA.subarray(srcOff, srcOff + srcW * 4), dstOff);
  }
}

async function saveSheet(dstRGBA, dstW, dstH, outPath) {
  await sharp(Buffer.from(dstRGBA.buffer), {
    raw: { width: dstW, height: dstH, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

function scaledFrames(frames) {
  const out = {};
  const scalerCache = new Map();
  const getScaler = (w, h) => {
    const key = `${w}x${h}`;
    if (!scalerCache.has(key)) scalerCache.set(key, new Scaler(w, h, SCALE));
    return scalerCache.get(key);
  };
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
    getScaler(fr.w, fr.h);
  }
  return { out, getScaler };
}

async function upscaleSheet(srcRGBA, srcW, srcH, frames, getScaler) {
  const dstW = srcW * SCALE;
  const dstH = srcH * SCALE;
  const dst = new Uint8ClampedArray(dstW * dstH * 4);
  let n = 0;
  for (const [, frame] of Object.entries(frames)) {
    const { x, y, w, h } = frame.frame; // ORIGINAL 1x coords
    const scaler = getScaler(w, h);
    const scaled = upscaleSubImage(srcRGBA, srcW, x, y, w, h, scaler);
    pasteRGBA(dst, dstW, scaled, w * SCALE, h * SCALE, x * SCALE, y * SCALE);
    n++;
    if (n % 500 === 0) process.stdout.write(`  ${n} sprites\r`);
  }
  process.stdout.write(`  ${n} sprites total\n`);
  return { rgba: dst, w: dstW, h: dstH };
}

async function main() {
  console.log('Loading atlas metadata...');
  const meta = await loadAtlasMeta();
  const origFrames = meta.frames;
  console.log(`  ${Object.keys(origFrames).length} sprites`);

  const { out: doubledFrames, getScaler } = scaledFrames(origFrames);
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
      note: (meta.meta.note || '') + ` 2x xBRZ-upscaled mirror.`,
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
    const sheet = await loadSheet(sheetName);
    const { rgba, w, h } = await upscaleSheet(sheet.data, sheet.width, sheet.height, origFrames, getScaler);
    const outName = sheetName.replace(/\.png$/, '@2x.png');
    await saveSheet(rgba, w, h, path.join(atlasDir, outName));
    console.log(`  Wrote ${outName} (${w}x${h})`);
  }
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
