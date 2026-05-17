#!/usr/bin/env node
// One-off utility: extract every named sprite tile from multiple input dirs
// and bin-pack them into a single tightly-packed atlas.
//
// Usage:
//   node tools/build-mega-atlas.mjs \
//     --input asset-packs/dawnlike/Characters \
//     --input asset-packs/dawnlike/Items \
//     --input asset-packs/dawnlike/Objects \
//     --input asset-packs/dawnlike/GUI \
//     --output asset-packs/dawnlike/atlas \
//     --name Dawnlike \
//     [--cols 64] [--tile 16]

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';

// ── CLI ───────────────────────────────────────────────────────────────────────

const { values: args } = parseArgs({
  options: {
    input:  { type: 'string', multiple: true },
    output: { type: 'string' },
    name:   { type: 'string' },
    tile:   { type: 'string', default: '16' },
    cols:   { type: 'string', default: '64' },
  },
  strict: true,
  allowPositionals: false,
});

if (!args.input?.length || !args.output || !args.name) {
  console.error('Usage: node tools/build-mega-atlas.mjs --input <dir> [--input <dir>...] --output <dir> --name <Name>');
  process.exit(1);
}

const tileSize  = parseInt(args.tile);
const targetCols = parseInt(args.cols);
const inputDirs = args.input.map(p => resolve(p));
const outputDir = resolve(args.output);
const atlasName = args.name;

// ── Discover sprites across all input dirs ────────────────────────────────────

const loadJson = p => JSON.parse(readFileSync(p, 'utf8'));
const hasNamedFrames = d => d.frames && typeof d.frames === 'object' && Object.keys(d.frames).length > 0;

// Normalize names (strip redundant libGDX frame suffixes)
const normalizeName = name => name.replace(/_[0-9]+$/, '').trim();

// Each sprite: { name, group, category, sourcePng, sourcePngAlt, srcX, srcY, isAnimated }
const sprites = [];
const sourcePaths = new Set();

for (const dir of inputDirs) {
  const category = dir.split('/').filter(Boolean).pop();
  const framesFiles = readdirSync(dir).filter(f => f.endsWith('.frames.json')).sort();
  const covered = new Set();

  // Pass 1: paired primaries (files: [...])
  for (const fn of framesFiles) {
    const data = loadJson(join(dir, fn));
    if (!hasNamedFrames(data) || !Array.isArray(data.files) || data.files.length === 0) continue;

    const groupName = fn.replace(/0\.frames\.json$/, '');
    const png0 = join(dir, data.files[0]);
    const png1 = data.files[1] ? join(dir, data.files[1]) : null;
    data.files.forEach(f => covered.add(f));

    const meta = await sharp(png0).metadata();
    const cols = data.columns || Math.round(meta.width / tileSize);

    sourcePaths.add(png0);
    if (png1) sourcePaths.add(png1);

    for (const [idxStr, name] of Object.entries(data.frames)) {
      const idx = parseInt(idxStr);
      const srcX = (idx % cols) * tileSize;
      const srcY = Math.floor(idx / cols) * tileSize;
      // Bounds-check against actual PNG (skip out-of-bounds frames silently)
      if (srcX + tileSize > meta.width || srcY + tileSize > meta.height) continue;
      sprites.push({
        name: normalizeName(name), group: groupName, category,
        sourcePng: png0, sourcePngAlt: png1 || png0,
        sourceFile: `${category}/${groupName}`,
        sourceIndex: idx,
        srcX, srcY,
        isAnimated: png1 !== null,
      });
    }
  }

  // Pass 2: single primaries (file: "...") not already covered
  for (const fn of framesFiles) {
    const data = loadJson(join(dir, fn));
    if (!hasNamedFrames(data) || Array.isArray(data.files)) continue;
    const fileRef = typeof data.file === 'string' ? data.file : '';
    if (!fileRef || covered.has(fileRef)) continue;
    covered.add(fileRef);

    const groupName = fn.replace('.frames.json', '');
    const png = join(dir, fileRef);
    const meta = await sharp(png).metadata();
    const cols = data.columns || Math.round(meta.width / tileSize);

    sourcePaths.add(png);

    for (const [idxStr, name] of Object.entries(data.frames)) {
      const idx = parseInt(idxStr);
      const srcX = (idx % cols) * tileSize;
      const srcY = Math.floor(idx / cols) * tileSize;
      if (srcX + tileSize > meta.width || srcY + tileSize > meta.height) continue;
      sprites.push({
        name: normalizeName(name), group: groupName, category,
        sourcePng: png, sourcePngAlt: png,
        sourceFile: `${category}/${groupName}`,
        sourceIndex: idx,
        srcX, srcY,
        isAnimated: false,
      });
    }
  }
}

// ── Deduplicate names (suffix with category/group on collision) ──────────────

const seenNames = new Map();
const duplicates = [];
for (const s of sprites) {
  if (!seenNames.has(s.name)) {
    seenNames.set(s.name, s);
  } else {
    const prior = seenNames.get(s.name);
    duplicates.push(`  "${s.name}" in ${prior.category}/${prior.group} and ${s.category}/${s.group}`);
    s.name = `${s.name} (${s.category}/${s.group})`;
    seenNames.set(s.name, s);
  }
}

// ── Compute grid layout ───────────────────────────────────────────────────────

const totalSprites = sprites.length;
const cols   = targetCols;
const rows   = Math.ceil(totalSprites / cols);
const width  = cols * tileSize;
const height = rows * tileSize;

for (let i = 0; i < sprites.length; i++) {
  sprites[i].x = (i % cols) * tileSize;
  sprites[i].y = Math.floor(i / cols) * tileSize;
}

// ── Read all source PNGs as raw RGBA buffers (for fast tile copies) ──────────

console.log(`Reading ${sourcePaths.size} source PNGs into raw buffers...`);
const sourceBuffers = new Map();
for (const path of sourcePaths) {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  sourceBuffers.set(path, { data, width: info.width, height: info.height });
}

// ── Build output buffers (Atlas0 = primary, Atlas1 = alt frame) ──────────────

console.log(`Building ${width}×${height}px atlas (${totalSprites} sprites, ${cols}×${rows} grid)...`);

function blitTiles(useAlt) {
  const out = Buffer.alloc(width * height * 4); // RGBA, fully transparent (zeros)
  for (const s of sprites) {
    const src = sourceBuffers.get(useAlt ? s.sourcePngAlt : s.sourcePng);
    if (!src) continue;
    for (let row = 0; row < tileSize; row++) {
      const srcStart = ((s.srcY + row) * src.width + s.srcX) * 4;
      const dstStart = ((s.y + row) * width + s.x) * 4;
      src.data.copy(out, dstStart, srcStart, srcStart + tileSize * 4);
    }
  }
  return out;
}

const atlas0Buffer = blitTiles(false);
const atlas1Buffer = blitTiles(true);

// ── Write output PNGs ─────────────────────────────────────────────────────────

mkdirSync(outputDir, { recursive: true });

const atlas0Path = join(outputDir, `${atlasName}Atlas0.png`);
const atlas1Path = join(outputDir, `${atlasName}Atlas1.png`);

const writeAtlas = (buf, path) => sharp(buf, {
  raw: { width, height, channels: 4 },
}).png({ compressionLevel: 9 }).toFile(path);

await writeAtlas(atlas0Buffer, atlas0Path);
await writeAtlas(atlas1Buffer, atlas1Path);

// ── Build atlas JSON ──────────────────────────────────────────────────────────

const phaserFrames = {};
const byName       = {};
const byCategory   = {};
const legacyFrames = {};

for (const s of sprites) {
  const globalFrame = (s.y / tileSize) * cols + (s.x / tileSize);

  phaserFrames[s.name] = {
    frame:            { x: s.x, y: s.y, w: tileSize, h: tileSize },
    sourceSize:       { w: tileSize, h: tileSize },
    spriteSourceSize: { x: 0, y: 0, w: tileSize, h: tileSize },
    rotated: false,
    trimmed: false,
  };
  byName[s.name] = {
    name: s.name,
    x: s.x, y: s.y,
    category:   s.category,
    group:      s.group,
    sourceFile: s.sourceFile,
    sourceIndex: s.sourceIndex,
    globalFrame,
    isAnimated: s.isAnimated,
  };
  legacyFrames[String(globalFrame)] = s.name;

  if (!byCategory[s.category]) byCategory[s.category] = {};
  if (!byCategory[s.category][s.group]) byCategory[s.category][s.group] = [];
  byCategory[s.category][s.group].push(s.name);
}

const atlasJson = {
  meta: {
    version: '1.0',
    name:    atlasName,
    sheets:  [`${atlasName}Atlas0.png`, `${atlasName}Atlas1.png`],
    size:    { w: width, h: height },
    tile:    { w: tileSize, h: tileSize },
    columns: cols,
    rows,
    spriteCount: totalSprites,
    inputDirs:   args.input,
    note: 'Per-sprite bin-packed atlas. Each named sprite occupies a single 16×16 cell. Atlas1 has alt animation frames where source group is paired (isAnimated: true); otherwise mirrors Atlas0.',
  },
  frames: phaserFrames,
  byName,
  byCategory,
  legacyFrames,
};

writeFileSync(join(outputDir, `${atlasName}Atlas.json`), JSON.stringify(atlasJson, null, 2));

// Legacy sidecar for SpriteSheet.jsx tooltip auto-loading
const legacyJson = {
  files:       [`${atlasName}Atlas0.png`, `${atlasName}Atlas1.png`],
  frameWidth:  tileSize,
  frameHeight: tileSize,
  columns:     cols,
  rows,
  frames:      legacyFrames,
};
writeFileSync(join(outputDir, `${atlasName}Atlas0.frames.json`), JSON.stringify(legacyJson, null, 2));

// ── Instructions.md ───────────────────────────────────────────────────────────

const sampleName = sprites.find(s => s.name === 'wizard')?.name ?? sprites[0]?.name ?? 'sprite';

const instructions = `# ${atlasName} Mega-Atlas — Usage Guide

Generated ${new Date().toISOString().slice(0, 10)} from:
${args.input.map(p => `- \`${p}\``).join('\n')}

**${totalSprites} named sprites** across ${Object.keys(byCategory).length} categories,
bin-packed into ${width}×${height}px (${cols}×${rows} grid, ${tileSize}px tiles).
Wasted cells: ${cols * rows - totalSprites} of ${cols * rows}
(${(100 * (cols * rows - totalSprites) / (cols * rows)).toFixed(1)}% empty).

## Categories Included

${Object.entries(byCategory).map(([cat, groups]) =>
  `- **${cat}**: ${Object.keys(groups).length} groups, ${Object.values(groups).reduce((a, g) => a + g.length, 0)} sprites`
).join('\n')}

## Phaser 3

\`\`\`javascript
// preload
this.load.atlas('${atlasName.toLowerCase()}',  '${atlasName}Atlas0.png', '${atlasName}Atlas.json');
this.load.atlas('${atlasName.toLowerCase()}1', '${atlasName}Atlas1.png', '${atlasName}Atlas.json');

// create — static sprite by name
this.add.sprite(x, y, '${atlasName.toLowerCase()}', '${sampleName}');

// 2-frame walk animation (only meaningful when isAnimated: true)
this.anims.create({
  key: '${sampleName}-walk',
  frames: [
    { key: '${atlasName.toLowerCase()}',  frame: '${sampleName}' },
    { key: '${atlasName.toLowerCase()}1', frame: '${sampleName}' },
  ],
  frameRate: 2,
  repeat: -1,
});
\`\`\`

## Plain HTML / CSS

\`\`\`html
<script type="module">
  const atlas = await fetch('${atlasName}Atlas.json').then(r => r.json());
  function showSprite(name, el) {
    const { x, y } = atlas.byName[name];
    Object.assign(el.style, {
      backgroundImage:    'url(${atlasName}Atlas0.png)',
      backgroundPosition: \`-\${x}px -\${y}px\`,
      width:  '${tileSize}px',
      height: '${tileSize}px',
      imageRendering: 'pixelated',
      display: 'inline-block',
    });
  }
  showSprite('${sampleName}', document.querySelector('#sprite'));
</script>
<div id="sprite"></div>
\`\`\`

## React (existing Sprite / SpriteSheet components)

\`\`\`jsx
import atlas from './${atlasName}Atlas.json';

// Single frame:
<Sprite
  src="${atlasName}Atlas0.png"
  frame={atlas.byName['${sampleName}'].globalFrame}
  cols={${cols}}
  tileSize={${tileSize}}
/>

// Full atlas browser — tooltips load automatically from sidecar:
<SpriteSheet
  imagePath="/atlas/${atlasName}Atlas0.png"
  columns={${cols}}
  tileSize={${tileSize}}
  animated={true}
  animationPair="/atlas/${atlasName}Atlas1.png"
/>
\`\`\`

## Lookup by category / group

\`\`\`javascript
const atlas = await fetch('${atlasName}Atlas.json').then(r => r.json());
// All Player character names:
atlas.byCategory.Characters.Player;          // → ['ordinary human', 'fighter', ...]
// Where is the wizard sprite?
atlas.byName.wizard;                         // → { x, y, category, group, globalFrame, isAnimated }
\`\`\`
`;

writeFileSync(join(outputDir, `${atlasName}Atlas.instructions.md`), instructions);

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${atlasName} mega-atlas generated:`);
console.log(`  ${totalSprites} sprites · ${Object.keys(byCategory).length} categories · ${sourcePaths.size} source PNGs`);
console.log(`  ${width}×${height}px · ${cols}×${rows} grid (${(100 * totalSprites / (cols * rows)).toFixed(1)}% utilization)`);
if (duplicates.length) {
  console.warn(`\n${duplicates.length} duplicate name(s) suffixed with category/group:`);
  duplicates.slice(0, 10).forEach(d => console.warn(d));
  if (duplicates.length > 10) console.warn(`  ... and ${duplicates.length - 10} more`);
}
console.log(`\nOutput:`);
[atlas0Path, atlas1Path,
  join(outputDir, `${atlasName}Atlas.json`),
  join(outputDir, `${atlasName}Atlas0.frames.json`),
  join(outputDir, `${atlasName}Atlas.instructions.md`),
].forEach(f => console.log(`  ${f}`));
