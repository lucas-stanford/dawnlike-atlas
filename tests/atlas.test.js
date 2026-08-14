/**
 * Integrity tests for the packed atlas metadata.
 *
 * These guard the invariants every consumer relies on: the JSON agrees
 * with itself, every sprite lands inside the sheet, no two sprites share
 * a cell, and the names the examples/docs reference actually exist. If a
 * repack ever drifts, these fail loudly instead of shipping holes.
 */

import { describe, it, expect } from 'vitest';
import atlas from '../atlas/DawnlikeAtlas.json' with { type: 'json' };

const { meta, byName, frames, legacyFrames } = atlas;

describe('atlas metadata', () => {
  it('declares a coherent 32px grid', () => {
    expect(meta.tile).toEqual({ w: 32, h: 32 });
    expect(meta.size.w).toBe(meta.columns * meta.tile.w);
    expect(meta.size.h).toBe(meta.rows * meta.tile.h);
  });

  it('reports the true sprite count', () => {
    expect(Object.keys(byName)).toHaveLength(meta.spriteCount);
  });

  it('reports the true animated count', () => {
    const animated = Object.values(byName).filter((s) => s.isAnimated);
    expect(animated).toHaveLength(meta.animatedCount);
  });

  it('never packs more sprites than the grid has cells', () => {
    expect(meta.spriteCount).toBeLessThanOrEqual(meta.columns * meta.rows);
  });
});

describe('sprite placement', () => {
  it('keeps every sprite fully inside the sheet', () => {
    const outside = Object.entries(byName).filter(
      ([, s]) => s.x < 0 || s.y < 0 || s.x + s.w > meta.size.w || s.y + s.h > meta.size.h,
    );
    expect(outside).toEqual([]);
  });

  it('aligns every sprite to the tile grid', () => {
    const misaligned = Object.entries(byName)
      .filter(([, s]) => s.x % meta.tile.w !== 0 || s.y % meta.tile.h !== 0)
      .map(([name]) => name);
    expect(misaligned).toEqual([]);
  });

  it('gives every sprite the full tile footprint', () => {
    const wrongSize = Object.entries(byName)
      .filter(([, s]) => s.w !== meta.tile.w || s.h !== meta.tile.h)
      .map(([name]) => name);
    expect(wrongSize).toEqual([]);
  });

  it('never packs two sprites into the same cell', () => {
    const seen = new Map();
    const collisions = [];
    for (const [name, s] of Object.entries(byName)) {
      const key = `${s.x},${s.y}`;
      if (seen.has(key)) collisions.push([seen.get(key), name, key]);
      else seen.set(key, name);
    }
    expect(collisions).toEqual([]);
  });
});

describe('lookup tables agree', () => {
  it('has a `frames` entry for every `byName` entry', () => {
    const missing = Object.keys(byName).filter((name) => !frames[name]);
    expect(missing).toEqual([]);
  });

  it('places `frames` and `byName` at identical coordinates', () => {
    const mismatched = Object.entries(byName)
      .filter(([name, s]) => {
        const f = frames[name]?.frame;
        return !f || f.x !== s.x || f.y !== s.y || f.w !== s.w || f.h !== s.h;
      })
      .map(([name]) => name);
    expect(mismatched).toEqual([]);
  });

  it('round-trips every name through legacyFrames', () => {
    const broken = [];
    for (const [name, s] of Object.entries(byName)) {
      const index = (s.y / meta.tile.h) * meta.columns + s.x / meta.tile.w;
      if (legacyFrames[String(index)] !== name) broken.push(name);
    }
    expect(broken).toEqual([]);
  });
});

describe('tags', () => {
  it('tags a large majority of sprites', () => {
    const tagged = Object.values(byName).filter((s) => s.tags?.length).length;
    expect(tagged / meta.spriteCount).toBeGreaterThan(0.8);
  });

  it('uses only non-empty lowercase-ish string tags', () => {
    const bad = new Set();
    for (const s of Object.values(byName)) {
      for (const tag of s.tags ?? []) {
        if (typeof tag !== 'string' || tag.trim() === '' || tag !== tag.trim()) bad.add(String(tag));
      }
    }
    expect([...bad]).toEqual([]);
  });
});

describe('names referenced by the docs and examples exist', () => {
  // Anything named in README.md, the skills, or an example's default
  // props. A repack that renames these silently breaks the demos.
  const REFERENCED = [
    'fighting fish',
    'wizard',
    'bright brick wall left right down',
    'dark brick wall center',
    'dusk brick floor c',
    'stone murky pool center',
  ];

  it.each(REFERENCED)('has "%s"', (name) => {
    expect(byName[name]).toBeDefined();
  });
});
