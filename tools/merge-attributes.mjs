import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ATLAS_JSON_PATH = resolve('atlas/DawnlikeAtlas.json');
const RESULTS_DIR     = resolve('tmp/attribute-results');

const atlas = JSON.parse(readFileSync(ATLAS_JSON_PATH, 'utf8'));
const spriteNames = Object.keys(atlas.byName);
const BATCH_SIZE = 64;

function merge() {
  const resultFiles = readdirSync(RESULTS_DIR).filter(f => f.endsWith('.json')).sort();
  console.log(`Found ${resultFiles.length} result files.`);

  let totalTags = 0;

  for (const file of resultFiles) {
    const batchIndex = parseInt(file.match(/batch-(\d+)/)[1]);
    const results = JSON.parse(readFileSync(join(RESULTS_DIR, file), 'utf8'));
    
    const startIndex = batchIndex * BATCH_SIZE;
    
    for (const [gridIdxStr, tags] of Object.entries(results)) {
      const gridIdx = parseInt(gridIdxStr);
      const spriteIdx = startIndex + gridIdx;
      
      if (spriteIdx < spriteNames.length) {
        const name = spriteNames[spriteIdx];
        
        // Update byName with tags at the top
        const oldEntry = atlas.byName[name];
        atlas.byName[name] = {
          tags,
          ...oldEntry
        };
        delete atlas.byName[name].attributes; // Clean up old field if exists
        
        // Update phaser frames with tags at the top
        if (atlas.frames[name]) {
          const oldFrame = atlas.frames[name];
          atlas.frames[name] = {
            tags,
            ...oldFrame
          };
          delete atlas.frames[name].attributes; // Clean up old field
        }
        
        totalTags++;
      }
    }
  }

  writeFileSync(ATLAS_JSON_PATH, JSON.stringify(atlas, null, 2));
  console.log(`Merged attributes for ${totalTags} sprites.`);
}

merge();
