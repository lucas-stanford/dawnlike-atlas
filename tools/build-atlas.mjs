#!/usr/bin/env node
// One-off utility: combine a folder of sprite PNGs into a single atlas.
// Usage: node tools/build-atlas.mjs --input <dir> --output <dir> --name <Name>
// Optional: --tile 16  --columns auto|<N>  --order Group1,Group2,...

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';

// ── CLI ───────────────────────────────────────────────────────────────────────

const { values: args } = parseArgs({
  options: {
    input:   { type: 'string' },
    output:  { type: 'string' },
    name:    { type: 'string' },
    tile:    { type: 'string', default: '16' },
    columns: { type: 'string', default: 'auto' },
    order:   { type: 'string', default: '' },
  },
  strict: true,
  allowPositionals: false,
});

if (!args.input || !args.output || !args.name) {
  console.error('Usage: node tools/build-atlas.mjs --input <dir> --output <dir> --name <Name>');
  process.exit(1);
}

const tileSize  = parseInt(args.tile);
const inputDir  = resolve(args.input);
const outputDir = resolve(args.output);
const atlasName = args.name;

// ── Group discovery ───────────────────────────────────────────────────────────

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function hasNamedFrames(data) {
  return data.frames && typeof data.frames === 'object' && Object.keys(data.frames).length > 0;
}

const framesFiles = readdirSync(inputDir).filter(f => f.endsWith('.frames.json')).sort();
const covered     = new Set();
const groups      = [];

// Pass 1: paired primaries — .frames.json with `files: [...]` and non-empty frames
for (const fn of framesFiles) {
  const data = loadJson(join(inputDir, fn));
  if (!hasNamedFrames(data) || !Array.isArray(data.files) || data.files.length === 0) continue;

  const groupName = fn.replace(/0\.frames\.json$/, '');
  if (!groupName) continue;

  const pngPaths = data.files.map(f => join(inputDir, f));
  data.files.forEach(f => covered.add(f));
  groups.push({ name: groupName, framesData: data, pngPaths, isPaired: true });
}

// Pass 2: single primaries — `file: "..."` not already covered by a paired primary
for (const fn of framesFiles) {
  const data = loadJson(join(inputDir, fn));
  if (!hasNamedFrames(data) || Array.isArray(data.files)) continue;

  const fileRef = typeof data.file === 'string' ? data.file : '';
  if (!fileRef || covered.has(fileRef)) continue;

  covered.add(fileRef);
  groups.push({
    name:       fn.replace('.frames.json', ''),
    framesData: data,
    pngPaths:   [join(inputDir, fileRef)],
    isPaired:   false,
  });
}

// Apply optional --order (listed groups first, remainder appended alphabetically)
if (args.order) {
  const orderedNames = args.order.split(',').map(s => s.trim());
  const pool         = [...groups];
  const sorted       = [];
  for (const n of orderedNames) {
    const i = pool.findIndex(g => g.name === n);
    if (i >= 0) sorted.push(...pool.splice(i, 1));
  }
  groups.length = 0;
  groups.push(...sorted, ...pool);
}

// ── Read actual PNG dimensions ────────────────────────────────────────────────

for (const g of groups) {
  const meta    = await sharp(g.pngPaths[0]).metadata();
  g.width       = meta.width;
  g.height      = meta.height;
  g.actualCols  = Math.round(meta.width  / tileSize);
  g.actualRows  = Math.round(meta.height / tileSize);
  // The JSON's `columns` field is the source of truth for index→position
  // mapping (some PNGs are wider/narrower than the conceptual grid). Fall back
  // to actual cols only when JSON omits it.
  g.frameCols   = g.framesData.columns || g.actualCols;
}

// ── Determine canvas column count and which groups to include ─────────────────
// When --columns is explicitly provided, use it as the canvas width and include
// ALL groups regardless of their own column count (groups narrower than the
// canvas are left-aligned with transparent padding).
// When --columns is 'auto', detect the dominant column count and skip outliers.

let canvasCols;
let skipped  = [];
let included;

if (args.columns !== 'auto') {
  canvasCols = parseInt(args.columns);
  included   = groups;
} else {
  const tally = {};
  for (const g of groups) tally[g.actualCols] = (tally[g.actualCols] || 0) + 1;
  canvasCols = parseInt(Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0]);
  skipped    = groups.filter(g => g.actualCols !== canvasCols);
  included   = groups.filter(g => g.actualCols === canvasCols);
}

if (skipped.length) {
  console.warn(`\nSkipped (non-standard column count, expected ${canvasCols}):`);
  skipped.forEach(g => console.warn(`  ${g.name}: ${g.actualCols} cols (${g.width}px wide)`));
}

if (!included.length) {
  console.error('No groups to combine after filtering. Check --columns or source files.');
  process.exit(1);
}

// ── Compute y-offsets ─────────────────────────────────────────────────────────

let yOffset = 0;
for (const g of included) {
  g.yOffset = yOffset;
  yOffset  += g.height;
}

const atlasWidth  = canvasCols * tileSize;
const totalHeight = yOffset;

// ── Composite combined sheets ─────────────────────────────────────────────────

mkdirSync(outputDir, { recursive: true });

const atlas0Path = join(outputDir, `${atlasName}Atlas0.png`);
const atlas1Path = join(outputDir, `${atlasName}Atlas1.png`);

const canvas = () => ({
  create: { width: atlasWidth, height: totalHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
});

await sharp(canvas())
  .composite(included.map(g => ({ input: g.pngPaths[0], top: g.yOffset, left: 0 })))
  .png().toFile(atlas0Path);

await sharp(canvas())
  .composite(included.map(g => ({ input: g.pngPaths[g.pngPaths.length > 1 ? 1 : 0], top: g.yOffset, left: 0 })))
  .png().toFile(atlas1Path);

// ── Build atlas JSON ──────────────────────────────────────────────────────────

const phaserFrames = {};
const byName       = {};
const legacyFrames = {};
const duplicates   = [];

for (const g of included) {
  for (const [idxStr, rawName] of Object.entries(g.framesData.frames)) {
    const idx      = parseInt(idxStr);
    const localCol = idx % g.frameCols;
    const localRow = Math.floor(idx / g.frameCols);
    const x        = localCol * tileSize;
    const y        = g.yOffset + localRow * tileSize;
    // Bounds-check against the source PNG (skip if JSON cols mismatched real layout)
    if (x + tileSize > g.width || (localRow + 1) * tileSize > g.height) continue;
    const globalFrame = Math.round(y / tileSize) * canvasCols + Math.round(x / tileSize);

    let name = rawName;
    if (byName[name] !== undefined) {
      duplicates.push(`  "${name}" in ${byName[name].group} and ${g.name}`);
      name = `${rawName} (${g.name})`;
    }

    phaserFrames[name] = {
      frame:            { x, y, w: tileSize, h: tileSize },
      sourceSize:       { w: tileSize, h: tileSize },
      spriteSourceSize: { x: 0, y: 0, w: tileSize, h: tileSize },
      rotated: false,
      trimmed: false,
    };

    byName[name]       = { x, y, group: g.name, originalFrame: idx, globalFrame };
    legacyFrames[String(globalFrame)] = name;
  }
}

const atlasJson = {
  meta: {
    version: '1.0',
    name:    atlasName,
    sheets:  [`${atlasName}Atlas0.png`, `${atlasName}Atlas1.png`],
    size:    { w: atlasWidth, h: totalHeight },
    tile:    { w: tileSize, h: tileSize },
    columns: canvasCols,
    groups:  Object.fromEntries(
      included.map(g => [g.name, { yOffset: g.yOffset, rows: g.actualRows, height: g.height }])
    ),
  },
  frames: phaserFrames,
  byName,
};

writeFileSync(join(outputDir, `${atlasName}Atlas.json`), JSON.stringify(atlasJson, null, 2));

// Legacy sidecar (.frames.json) for SpriteSheet.jsx tooltip auto-loading
const legacyJson = {
  files:       [`${atlasName}Atlas0.png`, `${atlasName}Atlas1.png`],
  frameWidth:  tileSize,
  frameHeight: tileSize,
  columns:     canvasCols,
  rows:        Math.round(totalHeight / tileSize),
  frames:      legacyFrames,
};
writeFileSync(join(outputDir, `${atlasName}Atlas0.frames.json`), JSON.stringify(legacyJson, null, 2));

// ── Instructions.md ───────────────────────────────────────────────────────────

const groupList = included.map(g => {
  const r0 = g.yOffset / tileSize;
  const r1 = (g.yOffset + g.height) / tileSize - 1;
  return `- **${g.name}**: rows ${r0}–${r1} (y ${g.yOffset}–${g.yOffset + g.height - tileSize}px)`;
}).join('\n');

const skipSection = skipped.length
  ? `\n## Groups Excluded (non-standard column count)\n\n${skipped.map(g => `- ${g.name}: ${g.actualCols} cols`).join('\n')}\n`
  : '';

const sampleName = Object.keys(byName)[0] ?? 'sprite';

const instructions = `# ${atlasName} Atlas — Usage Guide

Generated ${new Date().toISOString().slice(0, 10)} from \`${args.input}\`.
${included.length} groups, ${Object.keys(byName).length} named sprites.
Sheet: ${atlasWidth}×${totalHeight}px · ${canvasCols} columns · ${tileSize}×${tileSize}px tiles.

## Groups Included

${groupList}
${skipSection}
## Phaser 3

\`\`\`javascript
// preload
this.load.atlas('${atlasName.toLowerCase()}',  '${atlasName}Atlas0.png', '${atlasName}Atlas.json');
this.load.atlas('${atlasName.toLowerCase()}1', '${atlasName}Atlas1.png', '${atlasName}Atlas.json');

// create — static sprite by name
this.add.sprite(x, y, '${atlasName.toLowerCase()}', '${sampleName}');

// 2-frame walk animation (shared atlas JSON, two texture keys)
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

// Single frame via Sprite component
<Sprite
  src="${atlasName}Atlas0.png"
  frame={atlas.byName['${sampleName}'].globalFrame}
  cols={${canvasCols}}
  tileSize={${tileSize}}
/>

// Full atlas via SpriteSheet — tooltips load automatically from ${atlasName}Atlas0.frames.json
<SpriteSheet
  imagePath="/atlas/${atlasName}Atlas0.png"
  columns={${canvasCols}}
  tileSize={${tileSize}}
  animated={true}
  animationPair="/atlas/${atlasName}Atlas1.png"
/>
\`\`\`
`;

writeFileSync(join(outputDir, `${atlasName}Atlas.instructions.md`), instructions);

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${atlasName} atlas generated:`);
console.log(`  ${included.length} groups · ${Object.keys(byName).length} named sprites`);
console.log(`  ${atlasWidth}×${totalHeight}px · ${canvasCols} cols · ${Math.round(totalHeight / tileSize)} rows`);
if (duplicates.length) {
  console.warn(`\n${duplicates.length} duplicate name(s) resolved with group suffix:`);
  duplicates.forEach(d => console.warn(d));
}
console.log(`\nOutput:`);
[atlas0Path, atlas1Path,
  join(outputDir, `${atlasName}Atlas.json`),
  join(outputDir, `${atlasName}Atlas0.frames.json`),
  join(outputDir, `${atlasName}Atlas.instructions.md`),
].forEach(f => console.log(`  ${f}`));
