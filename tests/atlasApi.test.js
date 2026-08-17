/**
 * Tests for the framework-agnostic atlas helpers.
 *
 * These run against the real atlas rather than a fixture, so they also
 * act as a second integrity check: a helper that returns nothing for a
 * well-known sprite means either the helper or the pack drifted.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import atlas from '../atlas/DawnlikeAtlas.json' with { type: 'json' };
import {
  ATLAS_JSON,
  ATLAS_SHEETS,
  loadAtlas,
  clearAtlasCache,
  getSprite,
  hasSprite,
  isAnimated,
  spriteNames,
  spriteTags,
  tagIndex,
  searchSprites,
  spritesByTag,
  autotileFamilies,
  spriteCell,
  nameAtIndex,
  spriteStyle,
  drawSprite,
  pickSprite,
  animationFrames,
} from '../src/utils/atlasApi.js';

describe('lookup helpers', () => {
  it('returns a sprite record by name', () => {
    const sprite = getSprite(atlas, 'wizard');
    expect(sprite).toMatchObject({ w: 32, h: 32 });
    expect(Number.isInteger(sprite.x)).toBe(true);
  });

  it('returns null for an unknown name instead of throwing', () => {
    expect(getSprite(atlas, 'no such sprite')).toBeNull();
    expect(getSprite(null, 'wizard')).toBeNull();
  });

  it('reports sprite existence', () => {
    expect(hasSprite(atlas, 'wizard')).toBe(true);
    expect(hasSprite(atlas, 'no such sprite')).toBe(false);
  });

  it('reports the animated flag as a boolean', () => {
    expect(isAnimated(atlas, 'fighting fish')).toBe(true);
    expect(isAnimated(atlas, 'no such sprite')).toBe(false);
  });

  it('lists every sprite name', () => {
    expect(spriteNames(atlas)).toHaveLength(atlas.meta.spriteCount);
    expect(spriteNames(null)).toEqual([]);
  });

  it('returns tags, or an empty array for unknown sprites', () => {
    expect(spriteTags(atlas, 'fighting fish')).toContain('creature');
    expect(spriteTags(atlas, 'no such sprite')).toEqual([]);
  });
});

describe('tagIndex', () => {
  const index = tagIndex(atlas);

  it('is sorted by descending count', () => {
    const counts = index.map((e) => e.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it('counts a tag against the sprites that carry it', () => {
    const entry = index.find((e) => e.tag === 'creature');
    expect(entry.count).toBe(spritesByTag(atlas, 'creature').length);
  });

  it('handles an empty atlas', () => {
    expect(tagIndex({ byName: {} })).toEqual([]);
  });
});

describe('searchSprites', () => {
  it('matches every query word in any order, across name and tags', () => {
    const results = searchSprites(atlas, { query: 'wall brick bright' });
    expect(results.length).toBeGreaterThan(0);
    for (const { name, sprite } of results) {
      const haystack = `${name} ${(sprite.tags ?? []).join(' ')}`;
      for (const word of ['wall', 'brick', 'bright']) {
        expect(haystack, `"${name}" should match "${word}"`).toContain(word);
      }
    }
  });

  it('narrows results as words are added', () => {
    const broad = searchSprites(atlas, { query: 'wall' }).length;
    const narrow = searchSprites(atlas, { query: 'wall brick bright' }).length;
    expect(narrow).toBeGreaterThan(0);
    expect(narrow).toBeLessThan(broad);
  });

  it('is case-insensitive', () => {
    expect(searchSprites(atlas, { query: 'WIZARD' }).length)
      .toBe(searchSprites(atlas, { query: 'wizard' }).length);
  });

  it('matches against tags as well as names', () => {
    const results = searchSprites(atlas, { query: 'aquatic', limit: 5 });
    expect(results.length).toBeGreaterThan(0);
  });

  it('requires every tag by default and any tag in "any" mode', () => {
    const all = searchSprites(atlas, { tags: ['creature', 'aquatic'] });
    const any = searchSprites(atlas, { tags: ['creature', 'aquatic'], tagMode: 'any' });
    expect(any.length).toBeGreaterThanOrEqual(all.length);
    for (const { sprite } of all) {
      expect(sprite.tags).toEqual(expect.arrayContaining(['creature', 'aquatic']));
    }
  });

  it('filters by animation state', () => {
    const animated = searchSprites(atlas, { animated: true });
    const still = searchSprites(atlas, { animated: false });
    expect(animated).toHaveLength(atlas.meta.animatedCount);
    expect(animated.length + still.length).toBe(atlas.meta.spriteCount);
  });

  it('filters by name prefix', () => {
    const results = searchSprites(atlas, { prefix: 'bright brick wall' });
    expect(results.length).toBeGreaterThan(5);
    for (const { name } of results) expect(name.startsWith('bright brick wall')).toBe(true);
  });

  it('respects the limit', () => {
    expect(searchSprites(atlas, { limit: 3 })).toHaveLength(3);
  });

  it('returns everything when given no criteria', () => {
    expect(searchSprites(atlas)).toHaveLength(atlas.meta.spriteCount);
  });
});

describe('autotileFamilies', () => {
  it('discovers wall families from their variant suffixes', () => {
    const families = autotileFamilies(atlas, ['left right', 'up down', 'center'], 3);
    expect(families).toContain('bright brick wall');
    expect(families).toContain('dark brick wall');
    // The base name must not carry the suffix it was discovered by.
    for (const base of families) expect(base.endsWith('center')).toBe(false);
  });

  it('discovers mountain families from the blob suffixes', () => {
    // The blob set is 10 sprites, 6 of which end in one of these
    // suffixes — a family must have all 6 to count.
    const families = autotileFamilies(atlas, ['nw', 'ne', 'sw', 'se', 'alone', 'c'], 6);
    expect(families).toContain('blue peak');
    expect(families).toContain('green snowcap');
  });

  it('honours the minimum-variant threshold', () => {
    const loose = autotileFamilies(atlas, ['center'], 1);
    const strict = autotileFamilies(atlas, ['center'], 999);
    expect(loose.length).toBeGreaterThan(strict.length);
    expect(strict).toEqual([]);
  });

  it('returns sorted, de-duplicated base names', () => {
    const families = autotileFamilies(atlas, ['left right', 'up down'], 2);
    expect(families).toEqual([...new Set(families)].sort());
  });
});

describe('grid addressing', () => {
  it('round-trips a sprite through its cell index', () => {
    for (const name of ['wizard', 'fighting fish', 'bright brick wall center']) {
      const cell = spriteCell(atlas, name);
      expect(nameAtIndex(atlas, cell.index)).toBe(name);
    }
  });

  it('derives the cell from the pixel offsets', () => {
    const sprite = getSprite(atlas, 'wizard');
    const cell = spriteCell(atlas, 'wizard');
    expect(cell.col).toBe(sprite.x / atlas.meta.tile.w);
    expect(cell.row).toBe(sprite.y / atlas.meta.tile.h);
  });

  it('returns null for unknown sprites and indices', () => {
    expect(spriteCell(atlas, 'no such sprite')).toBeNull();
    expect(nameAtIndex(atlas, 999999)).toBeNull();
  });
});

describe('spriteStyle', () => {
  it('offsets the background by the sprite position', () => {
    const sprite = getSprite(atlas, 'wizard');
    const css = spriteStyle(atlas, 'wizard');
    expect(css.backgroundPosition).toBe(`-${sprite.x}px -${sprite.y}px`);
    expect(css.backgroundSize).toBe(`${atlas.meta.size.w}px ${atlas.meta.size.h}px`);
    expect(css.imageRendering).toBe('pixelated');
  });

  it('scales position, size, and sheet together', () => {
    const sprite = getSprite(atlas, 'wizard');
    const css = spriteStyle(atlas, 'wizard', { scale: 3 });
    expect(css.width).toBe('96px');
    expect(css.backgroundPosition).toBe(`-${sprite.x * 3}px -${sprite.y * 3}px`);
    expect(css.backgroundSize).toBe(`${atlas.meta.size.w * 3}px ${atlas.meta.size.h * 3}px`);
  });

  it('selects the alternate sheet for frame 1', () => {
    expect(spriteStyle(atlas, 'wizard', { frame: 1 }).backgroundImage)
      .toContain(ATLAS_SHEETS[1]);
  });

  it('prefixes the sheet URL with basePath', () => {
    expect(spriteStyle(atlas, 'wizard', { basePath: '/assets/' }).backgroundImage)
      .toBe(`url("/assets/${ATLAS_SHEETS[0]}")`);
  });

  it('lets sheetUrl override everything', () => {
    expect(spriteStyle(atlas, 'wizard', { frame: 1, basePath: '/x/', sheetUrl: 'cdn.png' }).backgroundImage)
      .toBe('url("cdn.png")');
  });

  it('returns null for an unknown sprite', () => {
    expect(spriteStyle(atlas, 'no such sprite')).toBeNull();
  });
});

describe('drawSprite', () => {
  const makeCtx = () => ({ imageSmoothingEnabled: true, drawImage: vi.fn() });

  it('blits the source rect and disables smoothing', () => {
    const ctx = makeCtx();
    const sprite = getSprite(atlas, 'wizard');
    expect(drawSprite(ctx, {}, atlas, 'wizard', 10, 20, 2)).toBe(true);
    expect(ctx.imageSmoothingEnabled).toBe(false);
    expect(ctx.drawImage).toHaveBeenCalledWith(
      {}, sprite.x, sprite.y, 32, 32, 10, 20, 64, 64,
    );
  });

  it('draws nothing for an unknown sprite', () => {
    const ctx = makeCtx();
    expect(drawSprite(ctx, {}, atlas, 'no such sprite', 0, 0)).toBe(false);
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });
});

describe('pickSprite', () => {
  it('only ever returns a name the atlas contains', () => {
    const picked = pickSprite(atlas, ['no such sprite', 'wizard', 'also missing'], () => 0.9);
    expect(picked).toBe('wizard');
  });

  it('returns null when no candidate exists', () => {
    expect(pickSprite(atlas, ['nope', 'still nope'])).toBeNull();
    expect(pickSprite(atlas, [])).toBeNull();
  });

  it('is deterministic under a seeded RNG', () => {
    const candidates = ['wizard', 'fighting fish', 'skull'].filter((n) => hasSprite(atlas, n));
    const rng = () => 0;
    expect(pickSprite(atlas, candidates, rng)).toBe(pickSprite(atlas, candidates, rng));
  });

  it('never overruns the candidate list when rng returns 1', () => {
    const candidates = ['wizard', 'fighting fish'];
    expect(pickSprite(atlas, candidates, () => 1)).toBe('fighting fish');
  });
});

describe('animationFrames', () => {
  it('returns two frames on both sheets for an animated sprite', () => {
    const frames = animationFrames(atlas, 'fighting fish');
    expect(frames).toHaveLength(2);
    expect(frames[0].sheet).toBe(ATLAS_SHEETS[0]);
    expect(frames[1].sheet).toBe(ATLAS_SHEETS[1]);
    expect(frames[0].x).toBe(frames[1].x);
    expect(frames[0].y).toBe(frames[1].y);
  });

  it('returns a single frame for a static sprite', () => {
    const still = searchSprites(atlas, { animated: false, limit: 1 })[0].name;
    expect(animationFrames(atlas, still)).toHaveLength(1);
  });

  it('returns nothing for an unknown sprite', () => {
    expect(animationFrames(atlas, 'no such sprite')).toEqual([]);
  });

  it('applies basePath to both sheets', () => {
    const frames = animationFrames(atlas, 'fighting fish', { basePath: '/atlas/' });
    expect(frames.every((f) => f.sheet.startsWith('/atlas/'))).toBe(true);
  });
});

describe('loadAtlas', () => {
  beforeEach(() => clearAtlasCache());

  it('fetches and parses the atlas JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => atlas });
    await expect(loadAtlas(ATLAS_JSON, { fetchImpl })).resolves.toBe(atlas);
    expect(fetchImpl).toHaveBeenCalledWith(ATLAS_JSON);
  });

  it('issues one request no matter how many callers ask', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => atlas });
    await Promise.all([
      loadAtlas('/a.json', { fetchImpl }),
      loadAtlas('/a.json', { fetchImpl }),
      loadAtlas('/a.json', { fetchImpl }),
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects on a non-OK response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(loadAtlas('/missing.json', { fetchImpl })).rejects.toThrow(/404/);
  });

  it('does not cache a failure, so a retry can succeed', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, json: async () => atlas });
    await expect(loadAtlas('/flaky.json', { fetchImpl })).rejects.toThrow(/500/);
    await expect(loadAtlas('/flaky.json', { fetchImpl })).resolves.toBe(atlas);
  });
});
