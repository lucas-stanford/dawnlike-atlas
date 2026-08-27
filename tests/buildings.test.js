/**
 * Tests for the buildings that are too big to be sprites.
 *
 * The job here is keeping the manifest honest. Every number in
 * `BUILDINGS` is a measurement of a PNG, and the placement arithmetic is
 * derived from those numbers — so if a building is ever re-traced at
 * another size and the manifest is not updated with it, the building
 * silently starts hovering, or sinks, or sits off-centre. That is exactly
 * the sort of bug nobody notices in a diff, so it is checked against the
 * files on disk instead.
 */

import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { PNG } from 'pngjs';
import atlas from '../atlas/DawnlikeAtlas.json' with { type: 'json' };
import {
  BUILDINGS, BUILDING_NAMES, TILE_PX, buildingRect,
} from '../src/utils/buildings.js';

const read = (url) => PNG.sync.read(
  fs.readFileSync(new URL(`../atlas${url}`, import.meta.url)));

describe('the buildings manifest', () => {
  it('names at least the five that ship', () => {
    expect(BUILDING_NAMES).toEqual(
      expect.arrayContaining(['barn', 'cabin', 'cottage', 'townhouse', 'outhouse']));
  });

  it.each(BUILDING_NAMES)('%s: the PNG is the size the manifest claims', (name) => {
    const art = BUILDINGS[name];
    const png = read(art.url);
    expect(png.width, `${name} width`).toBe(art.w);
    expect(png.height, `${name} height`).toBe(art.h);
  });

  it.each(BUILDING_NAMES)('%s: has transparency, and is not one solid block', (name) => {
    const png = read(BUILDINGS[name].url);
    let clear = 0;
    for (let i = 3; i < png.data.length; i += 4) if (!png.data[i]) clear += 1;
    // A building that keyed correctly has corners of sky around its roof.
    // All-opaque means the magenta was never removed.
    expect(clear, `${name} has no transparent pixels`).toBeGreaterThan(0);
    expect(clear).toBeLessThan(png.width * png.height);
  });

  it.each(BUILDING_NAMES)('%s: blocks fewer tiles than the art is wide', (name) => {
    const art = BUILDINGS[name];
    // The roof oversails the walls on every one of these. A footprint as
    // wide as the picture would have you bouncing off thin air.
    expect(art.cols).toBeGreaterThan(0);
    expect(art.cols).toBeLessThan(art.w / TILE_PX + 1);
  });
});

describe('placing a building', () => {
  const at = { x0: 10, y1: 20 };

  it('returns nothing for a building that is not there', () => {
    expect(buildingRect('barn', null)).toBeNull();
    expect(buildingRect('no such building', at)).toBeNull();
  });

  it.each(BUILDING_NAMES)('%s: stands on the bottom row of its footprint', (name) => {
    const rect = buildingRect(name, at);
    expect(rect.y + rect.h).toBeCloseTo(at.y1 + 1, 10);
  });

  it.each(BUILDING_NAMES)('%s: is centred on its footprint', (name) => {
    const art = BUILDINGS[name];
    const rect = buildingRect(name, at);
    expect(rect.x + rect.w / 2).toBeCloseTo(at.x0 + art.cols / 2, 10);
  });

  it('measures in tiles, not pixels, so the caller keeps its own zoom', () => {
    const rect = buildingRect('barn', at);
    expect(rect.w).toBeCloseTo(BUILDINGS.barn.w / TILE_PX, 10);
    expect(rect.h).toBeCloseTo(BUILDINGS.barn.h / TILE_PX, 10);
  });
});

describe('buildings stay out of the mega-atlas', () => {
  it('has no sliced building left in the sheet', () => {
    // The barn was 25 cells named `barn r0c0` … `barn r4c4` before it
    // became one image. Nothing should have crept back.
    const sliced = Object.keys(atlas.byName).filter((n) => /\br\dc\d$/.test(n));
    expect(sliced).toEqual([]);
  });
});
