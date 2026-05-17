import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

/**
 * generate-attributes.mjs
 * 
 * Strategy:
 * 1. Load the mega-atlas JSON.
 * 2. Group sprites into 8x8 grids (64 sprites per image).
 * 3. Generate a composite PNG for each batch.
 * 4. Provide a prompt for Gemini 1.5 Flash to process these grids.
 */

const ATLAS_JSON_PATH = resolve('atlas/DawnlikeAtlas.json');
const ATLAS_PNG_PATH  = resolve('atlas/DawnlikeAtlas0.png');
const OUTPUT_DIR      = resolve('tmp/attribute-batches');

const atlas = JSON.parse(readFileSync(ATLAS_JSON_PATH, 'utf8'));
const spriteNames = Object.keys(atlas.byName);
const BATCH_SIZE = 64; // 8x8 grid
const TILE_SIZE = 16;

import { mkdirSync } from 'node:fs';
mkdirSync(OUTPUT_DIR, { recursive: true });

async function generateBatches() {
  const total = spriteNames.length;
  console.log(`Processing ${total} sprites into batches of ${BATCH_SIZE}...`);

  const atlasImage = sharp(ATLAS_PNG_PATH);

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batchIndex = i / BATCH_SIZE;
    const currentBatch = spriteNames.slice(i, i + BATCH_SIZE);
    
    // Create a blank 8x8 grid (128x128px)
    const compositeOperations = [];

    for (let j = 0; j < currentBatch.length; j++) {
      const name = currentBatch[j];
      const sprite = atlas.byName[name];
      
      const gridX = (j % 8) * TILE_SIZE;
      const gridY = Math.floor(j / 8) * TILE_SIZE;

      // Extract the tile
      const tileBuffer = await sharp(ATLAS_PNG_PATH)
        .extract({ left: sprite.x, top: sprite.y, width: TILE_SIZE, height: TILE_SIZE })
        .toBuffer();

      compositeOperations.push({
        input: tileBuffer,
        left: gridX,
        top: gridY
      });
    }

    const batchFilename = `batch-${String(batchIndex).padStart(3, '0')}.png`;
    const batchPath = join(OUTPUT_DIR, batchFilename);

    await sharp({
      create: {
        width: TILE_SIZE * 8,
        height: TILE_SIZE * 8,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite(compositeOperations)
    .png()
    .toFile(batchPath);

    process.stdout.write(`\rGenerated batch ${batchIndex + 1}/${Math.ceil(total / BATCH_SIZE)}`);
  }
  console.log('\nDone! Batches are in tmp/attribute-batches/');
  console.log('\nPrompt for Gemini 1.5 Flash:');
  console.log('---------------------------');
  console.log('This is an 8x8 grid of 16x16 pixel art sprites from a roguelike tileset.');
  console.log('Indices are 0-63, row-major. For each sprite, provide 3-5 descriptive tags.');
  console.log('Format as JSON: { "0": ["tag1", "tag2"], "1": [...] }');
}

generateBatches().catch(console.error);
