/**
 * Tests for the roof that lifts when you walk in.
 *
 * Three things here are worth defending, because each of them is a bug
 * that is invisible in a diff and obvious on screen:
 *
 *   - the roof is INSET by one tile and drawn half a tile down-right. Get
 *     the inset without the offset (or the other way round) and the roof
 *     sits off its own walls.
 *   - `roofBuildingId` covers the WHOLE footprint, `roofName` only the
 *     inset block. Tag only the roofed tiles and the roof stops lifting
 *     on the doorway, so you walk into a house you cannot see.
 *   - every name `stampRoofs` produces is a frame that actually exists in
 *     the atlas. A missing variant is a silently absent roof tile — a
 *     hole in the roof, in the shape of one cell.
 */

import { describe, it, expect } from 'vitest';
import atlas from '../atlas/DawnlikeAtlas.json' with { type: 'json' };
import {
  ROOF_THEMES, ROOF_TINT_BY_THEME, DEFAULT_ROOF_TINT, DEFAULT_ROOF_BASE,
  ROOF_INSET, ROOF_OFFSET_RATIO,
  roofThemeFor, roofTintForTheme, roofBaseForTheme, roofTintChannels, roofTintCss,
  roofOffsetPx, stampRoofs, roofBuildingIdAt, isRoofVisible,
} from '../src/utils/roofs.js';
import { generateTown, normalizeTownManifest } from '../src/phaser/generators/town.js';

const byName = atlas.byName;
const THEMES = Object.keys(ROOF_THEMES);

/** A blank grid of plain tile objects, big enough for the fixtures below. */
const grid = (w, h) => Array.from({ length: h }, () =>
  Array.from({ length: w }, () => ({})));

describe('the roof themes', () => {
  it('names the three that ship', () => {
    expect(THEMES).toEqual(expect.arrayContaining(['town', 'dwarf_hold', 'elf_glade']));
  });

  it.each(THEMES)('%s: autotiles from a floor family the atlas actually has', (theme) => {
    // All 16 neighbour cases must resolve, or a roof gets a hole in it.
    const base = ROOF_THEMES[theme].base;
    const suffixes = ['c', 'n', 's', 'e', 'w', 'ns', 'we', 'nw', 'ne', 'sw', 'se',
      'nsw', 'nse', 'nwe', 'swe', 'nswe'];
    for (const s of suffixes) {
      expect(byName[`${base} ${s}`], `${base} ${s}`).toBeTruthy();
    }
  });

  it.each(THEMES)('%s: is a 24-bit colour', (theme) => {
    const tint = ROOF_THEMES[theme].tint;
    expect(tint).toBeGreaterThanOrEqual(0);
    expect(tint).toBeLessThanOrEqual(0xffffff);
  });

  it('falls back to the dawn realm rather than throwing', () => {
    expect(roofThemeFor('no such theme')).toBe(ROOF_THEMES.town);
    expect(roofTintForTheme(undefined)).toBe(DEFAULT_ROOF_TINT);
    expect(roofBaseForTheme(null)).toBe(DEFAULT_ROOF_BASE);
  });

  it('exposes the tints as a plain table too', () => {
    expect(ROOF_TINT_BY_THEME.town).toBe(ROOF_THEMES.town.tint);
    expect(Object.keys(ROOF_TINT_BY_THEME)).toEqual(THEMES);
  });
});

describe('a roof tint, for renderers that are not Phaser', () => {
  it('splits into 0..1 channels', () => {
    // 0xff9e7a
    const [r, g, b] = roofTintChannels('town');
    expect(r).toBeCloseTo(1, 5);
    expect(g).toBeCloseTo(0x9e / 255, 5);
    expect(b).toBeCloseTo(0x7a / 255, 5);
  });

  it.each(THEMES)('%s: is six hex digits as CSS, never five', (theme) => {
    expect(roofTintCss(theme)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('where a roof is drawn', () => {
  it('shifts half a tile, whatever the tile size', () => {
    expect(ROOF_OFFSET_RATIO).toBe(0.5);
    expect(roofOffsetPx(32)).toBe(16);
    expect(roofOffsetPx(16)).toBe(8);
  });

  it('insets by exactly the tile the offset covers', () => {
    // The pairing is the whole trick: a 1-tile inset shifted half a tile
    // leaves half a wall showing on all four sides. Any other pairing
    // and the roof is off-centre.
    expect(ROOF_INSET).toBe(1);
    expect(ROOF_INSET * ROOF_OFFSET_RATIO).toBe(0.5);
  });
});

describe('stamping roofs onto a map', () => {
  const building = { x: 2, y: 2, w: 5, h: 4 };
  const stamped = () => stampRoofs(grid(12, 10), [building], { byName });

  it('tags the WHOLE footprint, walls and doorway included', () => {
    const tiles = stamped();
    for (let y = 2; y < 6; y++) {
      for (let x = 2; x < 7; x++) {
        expect(tiles[y][x].roofBuildingId, `${x},${y}`).toBe(0);
      }
    }
  });

  it('leaves everything outside the footprint alone', () => {
    const tiles = stamped();
    expect(tiles[1][2].roofBuildingId).toBeUndefined();
    expect(tiles[6][2].roofBuildingId).toBeUndefined();
    expect(tiles[2][1].roofBuildingId).toBeUndefined();
    expect(tiles[2][7].roofBuildingId).toBeUndefined();
  });

  it('draws a roof over a (w-1)x(h-1) block, not the whole footprint', () => {
    const tiles = stamped();
    const roofed = [];
    tiles.forEach((row, y) => row.forEach((t, x) => { if (t.roofName) roofed.push(`${x},${y}`); }));
    expect(roofed).toHaveLength((building.w - 1) * (building.h - 1));
    // Anchored top-left: the far column and far row carry no roof sprite,
    // which is what leaves the south and east walls visible.
    expect(tiles[2][2].roofName).toBeTruthy();
    expect(tiles[5][6].roofName).toBeUndefined();
    expect(tiles[5][2].roofName).toBeUndefined();
    expect(tiles[2][6].roofName).toBeUndefined();
  });

  it('autotiles the block: corners, edges and middle all differ', () => {
    const tiles = stamped();
    // Top-left of the roof block is missing its n and w neighbours.
    expect(tiles[2][2].roofName).toBe('morning brick floor nw');
    expect(tiles[3][3].roofName).toBe('morning brick floor c');
    expect(tiles[2][3].roofName).toBe('morning brick floor n');
    expect(tiles[3][2].roofName).toBe('morning brick floor w');
  });

  it.each(THEMES)('%s: every name it produces is a real atlas frame', (theme) => {
    // Sweep a range of footprints so every neighbour case gets exercised.
    for (let w = 2; w <= 7; w++) {
      for (let h = 2; h <= 6; h++) {
        const tiles = stampRoofs(grid(12, 10), [{ x: 1, y: 1, w, h }], { theme, byName });
        for (const row of tiles) {
          for (const t of row) {
            if (t.roofName) expect(byName[t.roofName], t.roofName).toBeTruthy();
          }
        }
      }
    }
  });

  it('numbers buildings by position, and honours an explicit id', () => {
    const tiles = stampRoofs(grid(20, 10), [
      { x: 1, y: 1, w: 3, h: 3 },
      { x: 6, y: 1, w: 3, h: 3 },
      { x: 11, y: 1, w: 3, h: 3, id: 'inn' },
    ], { byName });
    expect(tiles[1][1].roofBuildingId).toBe(0);
    expect(tiles[1][6].roofBuildingId).toBe(1);
    expect(tiles[1][11].roofBuildingId).toBe('inn');
  });

  it('survives a building that is too small to roof', () => {
    const tiles = stampRoofs(grid(6, 6), [{ x: 1, y: 1, w: 1, h: 1 }], { byName });
    // Still tagged as a building — you can stand in it — just not roofed.
    expect(tiles[1][1].roofBuildingId).toBe(0);
    expect(tiles[1][1].roofName).toBeUndefined();
  });

  it('clips a building that hangs off the edge of the map', () => {
    expect(() => stampRoofs(grid(4, 4), [{ x: 2, y: 2, w: 6, h: 6 }], { byName })).not.toThrow();
  });

  it('shrugs off junk instead of throwing', () => {
    expect(stampRoofs(null, [])).toBeNull();
    expect(() => stampRoofs(grid(4, 4), null)).not.toThrow();
    expect(() => stampRoofs(grid(4, 4), [null, undefined])).not.toThrow();
  });
});

describe('lifting the roof you are standing under', () => {
  const tiles = stampRoofs(grid(20, 10), [
    { x: 1, y: 1, w: 5, h: 4 },
    { x: 8, y: 1, w: 5, h: 4 },
  ], { byName });

  const roofsOf = (id) => {
    const out = [];
    tiles.forEach((row) => row.forEach((t) => { if (t.roofName && t.roofBuildingId === id) out.push(t); }));
    return out;
  };

  it('knows which building a tile belongs to', () => {
    expect(roofBuildingIdAt(tiles, 2, 2)).toBe(0);
    expect(roofBuildingIdAt(tiles, 9, 2)).toBe(1);
    expect(roofBuildingIdAt(tiles, 7, 2)).toBeUndefined(); // the street between them
    expect(roofBuildingIdAt(tiles, 99, 99)).toBeUndefined();
    expect(roofBuildingIdAt(null, 0, 0)).toBeUndefined();
  });

  it('keeps every roof on while the player is outdoors', () => {
    const outside = roofBuildingIdAt(tiles, 7, 2);
    for (const t of [...roofsOf(0), ...roofsOf(1)]) {
      expect(isRoofVisible(t, outside)).toBe(true);
    }
  });

  it('hides only the roof of the building the player is in', () => {
    const inside = roofBuildingIdAt(tiles, 2, 2);
    expect(roofsOf(0).every((t) => isRoofVisible(t, inside) === false)).toBe(true);
    expect(roofsOf(1).every((t) => isRoofVisible(t, inside) === true)).toBe(true);
  });

  it('lifts the roof from the DOORWAY, not one tile later', () => {
    // The south wall of building 0 is row 4; a door cut into it is still
    // tagged, so the roof is already off as the player stands in it.
    const doorway = { x: 3, y: 4 };
    const id = roofBuildingIdAt(tiles, doorway.x, doorway.y);
    expect(id).toBe(0);
    expect(roofsOf(0).some((t) => isRoofVisible(t, id))).toBe(false);
  });

  it('does not hide building 0 for a player standing nowhere', () => {
    // `undefined` must not match id 0 — the classic falsy-zero bug, which
    // would strip the first building's roof from anywhere on the map.
    expect(isRoofVisible({ roofBuildingId: 0 }, undefined)).toBe(true);
    expect(isRoofVisible({ roofBuildingId: 0 }, null)).toBe(true);
    expect(isRoofVisible({ roofBuildingId: 0 }, 0)).toBe(false);
  });

  it('has no opinion about a tile that is not there', () => {
    expect(isRoofVisible(null, 0)).toBe(false);
  });
});

describe('roofing an actual generated town', () => {
  // The unit tests above work on hand-built grids. This one runs the real
  // generator, because the wiring between them is where the feature is
  // most likely to rot: the generator has to keep exposing its footprints,
  // and those footprints have to still line up with the walls it drew.
  const town = generateTown({ seed: 20260901, width: 60, height: 40 });
  const tiles = stampRoofs(town.tiles, town.buildings, {
    theme: town.manifest.roofs.theme,
    byName,
  });

  it('exposes the footprints a renderer needs', () => {
    expect(town.buildings.length).toBeGreaterThan(0);
    for (const b of town.buildings) {
      expect(b).toMatchObject({
        id: expect.any(Number),
        x: expect.any(Number), y: expect.any(Number),
        w: expect.any(Number), h: expect.any(Number),
      });
    }
  });

  it('is roofed on by default', () => {
    expect(town.manifest.roofs).toEqual({ enabled: true, theme: 'town' });
    expect(normalizeTownManifest({ roofs: { enabled: false } }).roofs)
      .toEqual({ enabled: false, theme: 'town' });
  });

  it('roofs every building, and nothing that is not one', () => {
    const roofed = new Set();
    tiles.forEach((row, y) => row.forEach((t, x) => { if (t.roofName) roofed.add(`${x},${y}`); }));
    expect(roofed.size).toBe(
      town.buildings.reduce((n, b) => n + (b.w - 1) * (b.h - 1), 0));
    for (const key of roofed) {
      const [x, y] = key.split(',').map(Number);
      const inSome = town.buildings.some((b) =>
        x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
      expect(inSome, `roof at ${key} belongs to no building`).toBe(true);
    }
  });

  it('leaves the doorway walkable, and still under the roof tag', () => {
    // If a door were left untagged the roof would only lift once the
    // player was a tile deep inside a house they could not see into.
    let doors = 0;
    tiles.forEach((row, y) => row.forEach((t, x) => {
      if (!t.door) return;
      doors += 1;
      expect(t.roofBuildingId, `door at ${x},${y}`).toEqual(expect.any(Number));
      expect(town.walkable(x, y), `door at ${x},${y}`).toBe(true);
    }));
    expect(doors).toBeGreaterThan(0);
  });

  it('never puts a roof on a tile the player walks past outdoors', () => {
    tiles.forEach((row, y) => row.forEach((t, x) => {
      if (t.street || t.type === 'grass') {
        expect(t.roofName, `${x},${y}`).toBeUndefined();
      }
    }));
  });
});
