/**
 * Tests for the farming-sim rules engine.
 *
 * Two jobs here. The first is the usual one: the state machine does what
 * it claims. The second matters more for a *tileset* package — every
 * sprite name the engine can ever ask for is checked against the real
 * atlas, so a repack that renames or drops a crop sprite fails here
 * rather than rendering an invisible tile in someone's game.
 */

import { describe, it, expect } from 'vitest';
import atlas from '../atlas/DawnlikeAtlas.json' with { type: 'json' };
import {
  CROPS, CROP_IDS, ORCHARD, LIVESTOCK, SCATTER, DAY_PHASES,
  ENERGY_PER_DAY, ACTION_COST, WITHER_AFTER_DRY_DAYS, SOIL_DECAY_DAYS, CAN_CAPACITY,
  WILD, TILLED, SOWN,
  STAGE_SOWN, STAGE_GROWING, STAGE_READY, STAGE_WITHERED,
  createFarm, tileAt, till, plant, water, refill, harvest, clear, tend, sellStock,
  advanceDay, pickFruit, dayPhase, soilFamily, cropSprite, orchardSprite,
  actionFor, act, stockValue, isWalkable, isPond, hasWaterAccess,
} from '../src/utils/farm.js';

/** A deterministic RNG, so every farm in these tests is the same farm. */
function seededRng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const farm = () => createFarm({ rng: seededRng(7) });

/** Find a tile that is plain workable ground, away from pond and pen. */
function plainTile(state) {
  for (let y = 6; y < state.height; y++) {
    for (let x = 8; x < state.width - 8; x++) {
      const tile = tileAt(state, x, y);
      if (tile && tile.ground === WILD && !isPond(state, x, y) && !state.orchard[`${x},${y}`]) {
        return tile;
      }
    }
  }
  throw new Error('no plain tile found');
}

/** Till + sow in one step, bypassing the energy budget for setup. */
function sow(state, x, y, cropId) {
  const tilled = till(state, x, y);
  expect(tilled.ok).toBe(true);
  const sown = plant(tilled.state, x, y, cropId);
  expect(sown.ok).toBe(true);
  return sown.state;
}

// ---------------------------------------------------------------------

describe('sprite names the engine references', () => {
  const has = (name) => Boolean(atlas.byName[name]);

  it('every crop stage exists in the atlas', () => {
    const missing = [];
    for (const crop of Object.values(CROPS)) {
      if (!has(crop.young)) missing.push(crop.young);
      if (!has(crop.ripe)) missing.push(crop.ripe);
    }
    expect(missing).toEqual([]);
  });

  it('the orchard and withered sprites exist', () => {
    expect(has(ORCHARD.young)).toBe(true);
    expect(has(ORCHARD.ripe)).toBe(true);
    // `cropSprite` falls back to this for a dead crop.
    expect(has('dry scrub')).toBe(true);
  });

  it('every livestock sprite exists', () => {
    expect(LIVESTOCK.filter((a) => !has(a.name))).toEqual([]);
  });

  /**
   * The engine builds floor family names by string concatenation, so the
   * only way to know they resolve is to enumerate them. All three
   * families must exist in all four tints and all sixteen suffixes —
   * `* watered field` included, which is why
   * scripts/generate-watered-field.mjs had to run.
   */
  it('every soil family resolves in all four tints and all 16 suffixes', () => {
    const suffixes = [
      'nw', 'n', 'ne', 'nwe', 'nswe', 'w', 'c', 'e',
      'sw', 's', 'se', 'swe', 'ns', 'nsw', 'nse', 'we',
    ];
    const families = ['grass floor', 'plowed field', 'watered field'];
    const missing = [];
    for (const phase of DAY_PHASES) {
      for (const family of families) {
        for (const suffix of suffixes) {
          const name = `${phase} ${family} ${suffix}`;
          if (!has(name)) missing.push(name);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('soilFamily only ever names a family that exists', () => {
    let state = farm();
    const tile = plainTile(state);
    // Wild, tilled-dry and tilled-wet, at every energy level.
    const grounds = [
      tile,
      { ...tile, ground: TILLED, watered: false },
      { ...tile, ground: TILLED, watered: true },
    ];
    for (let energy = ENERGY_PER_DAY; energy >= 0; energy--) {
      state = { ...state, energy };
      for (const g of grounds) {
        expect(has(`${soilFamily(state, g)} c`)).toBe(true);
      }
    }
  });
});

describe('createFarm', () => {
  it('lays out a full grid, wild apart from the starter plot', () => {
    const state = farm();
    expect(Object.keys(state.tiles)).toHaveLength(state.width * state.height);
    const worked = Object.values(state.tiles).filter((t) => t.ground !== WILD);
    expect(worked.length).toBeGreaterThan(0);
    expect(worked.every((t) => t.ground === TILLED)).toBe(true);
    expect(Object.values(state.tiles).every((t) => t.crop === null)).toBe(true);
    expect(state.day).toBe(1);
    expect(state.energy).toBe(ENERGY_PER_DAY);
  });

  it('lets the starter plot go to weed if it is ignored', () => {
    let state = farm();
    const before = Object.values(state.tiles).filter((t) => t.ground === TILLED).length;
    expect(before).toBeGreaterThan(0);
    for (let i = 0; i < SOIL_DECAY_DAYS; i++) state = advanceDay(state, seededRng(3)).state;
    expect(Object.values(state.tiles).filter((t) => t.ground === TILLED)).toHaveLength(0);
  });

  it('scatters decor only on wild ground, never on the plot or the pond', () => {
    const state = farm();
    expect(Object.keys(state.decor).length).toBeGreaterThan(0);
    for (const k of Object.keys(state.decor)) {
      const [x, y] = k.split(',').map(Number);
      expect(state.tiles[k].ground).toBe(WILD);
      expect(isPond(state, x, y)).toBe(false);
      expect(state.orchard[k]).toBeUndefined();
    }
  });

  it('only scatters sprites the atlas actually has', () => {
    const state = farm();
    const missing = Object.values(state.decor).filter((name) => !atlas.byName[name]);
    expect(missing).toEqual([]);
    expect(SCATTER.filter((name) => !atlas.byName[name])).toEqual([]);
  });

  it('clears the scatter when a tile is tilled', () => {
    const state = farm();
    const [k] = Object.keys(state.decor);
    const [x, y] = k.split(',').map(Number);
    const tilled = till(state, x, y);
    expect(tilled.ok).toBe(true);
    expect(tilled.state.decor[k]).toBeUndefined();
    // …and leaves the rest of the scatter alone.
    expect(Object.keys(tilled.state.decor)).toHaveLength(Object.keys(state.decor).length - 1);
  });

  it('is reproducible under a seeded RNG', () => {
    const a = createFarm({ rng: seededRng(42) });
    const b = createFarm({ rng: seededRng(42) });
    expect([...a.pond]).toEqual([...b.pond]);
    expect(a.animals).toEqual(b.animals);
    expect(a.orchard).toEqual(b.orchard);
  });

  it('leaves the pen reachable through its open corner', () => {
    const state = farm();
    expect(isWalkable(state, state.pen.x0, state.pen.y1)).toBe(true);
    // …and the rest of the fence is solid.
    expect(isWalkable(state, state.pen.x0, state.pen.y0)).toBe(false);
  });

  it('puts every animal inside the pen', () => {
    const state = farm();
    for (const a of state.animals) {
      expect(a.x).toBeGreaterThan(state.pen.x0);
      expect(a.x).toBeLessThan(state.pen.x1);
      expect(a.y).toBeGreaterThan(state.pen.y0);
      expect(a.y).toBeLessThan(state.pen.y1);
    }
  });

  it('digs a pond with land beside it to draw from', () => {
    const state = farm();
    expect(state.pond.size).toBeGreaterThan(4);
    const shoreTiles = Object.values(state.tiles)
      .filter((t) => !isPond(state, t.x, t.y) && hasWaterAccess(state, t.x, t.y));
    expect(shoreTiles.length).toBeGreaterThan(0);
  });
});

describe('actions', () => {
  it('tills wild ground and charges energy', () => {
    const state = farm();
    const { x, y } = plainTile(state);
    const result = till(state, x, y);
    expect(result.ok).toBe(true);
    expect(tileAt(result.state, x, y).ground).toBe(TILLED);
    expect(result.state.energy).toBe(ENERGY_PER_DAY - ACTION_COST.till);
  });

  it('refuses to till twice, without spending anything', () => {
    const state = farm();
    const { x, y } = plainTile(state);
    const once = till(state, x, y);
    const twice = till(once.state, x, y);
    expect(twice.ok).toBe(false);
    // A failed action must return the SAME state object, not a copy —
    // that is what lets React skip the re-render.
    expect(twice.state).toBe(once.state);
  });

  it('refuses to sow on untilled ground', () => {
    const state = farm();
    const { x, y } = plainTile(state);
    expect(plant(state, x, y, 'turnip').ok).toBe(false);
  });

  it('charges gold for seed and refuses when short', () => {
    const state = farm();
    const { x, y } = plainTile(state);
    const tilled = till(state, x, y).state;

    const sown = plant(tilled, x, y, 'turnip');
    expect(sown.ok).toBe(true);
    expect(sown.state.gold).toBe(state.gold - CROPS.turnip.seedCost);
    expect(tileAt(sown.state, x, y).ground).toBe(SOWN);
    expect(tileAt(sown.state, x, y).stage).toBe(STAGE_SOWN);

    const broke = plant({ ...tilled, gold: 0 }, x, y, 'turnip');
    expect(broke.ok).toBe(false);
    expect(broke.message).toMatch(/costs/);
  });

  it('waters from the can, anywhere on the map', () => {
    let state = farm();
    const { x, y } = plainTile(state);
    state = sow(state, x, y, 'turnip');

    const wet = water(state, x, y);
    expect(wet.ok).toBe(true);
    expect(tileAt(wet.state, x, y).watered).toBe(true);
    expect(wet.state.can).toBe(state.can - 1);
  });

  it('runs the can dry and refuses to water until it is refilled', () => {
    let state = { ...farm(), can: 1 };
    const first = plainTile(state);
    state = sow(state, first.x, first.y, 'turnip');
    state = water(state, first.x, first.y).state;
    expect(state.can).toBe(0);

    // A second tile, with an empty can.
    const second = Object.values(state.tiles)
      .find((t) => t.ground === WILD && t.x !== first.x && t.y > 8 && !isPond(state, t.x, t.y));
    const sown = sow({ ...state, energy: ENERGY_PER_DAY }, second.x, second.y, 'turnip');
    const dry = water(sown, second.x, second.y);
    expect(dry.ok).toBe(false);
    expect(dry.message).toMatch(/empty/);
  });

  it('only refills the can beside open water', () => {
    const state = { ...farm(), can: 0 };
    const inland = Object.values(state.tiles)
      .find((t) => !isPond(state, t.x, t.y) && !hasWaterAccess(state, t.x, t.y));
    const nope = refill(state, inland.x, inland.y);
    expect(nope.ok).toBe(false);
    expect(nope.message).toMatch(/stand beside the pond/);

    const shore = Object.values(state.tiles)
      .find((t) => !isPond(state, t.x, t.y) && hasWaterAccess(state, t.x, t.y));
    const filled = refill(state, shore.x, shore.y);
    expect(filled.ok).toBe(true);
    expect(filled.state.can).toBe(CAN_CAPACITY);
    // …and refuses when there is nothing to top up.
    expect(refill(filled.state, shore.x, shore.y).ok).toBe(false);
  });

  it('offers a refill when facing the pond', () => {
    const state = { ...farm(), can: 0 };
    const [k] = [...state.pond];
    const [x, y] = k.split(',').map(Number);
    expect(actionFor(state, x, y).action).toBe('refill');
    expect(actionFor({ ...state, can: CAN_CAPACITY }, x, y).action).toBe('none');
  });

  it('refuses to water the same tile twice in a day', () => {
    let state = farm();
    const { x, y } = plainTile(state);
    state = water(sow(state, x, y, 'turnip'), x, y).state;
    expect(water(state, x, y).ok).toBe(false);
  });

  it('stops every action once energy runs out', () => {
    const state = { ...farm(), energy: 0 };
    const { x, y } = plainTile(state);
    const result = till(state, x, y);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/tired/i);
  });
});

describe('growth', () => {
  /** Water and end the day, `n` times. */
  function tendFor(state, x, y, n) {
    for (let i = 0; i < n; i++) {
      const wet = water({ ...state, energy: ENERGY_PER_DAY, can: CAN_CAPACITY }, x, y);
      state = advanceDay(wet.state, seededRng(3)).state;
    }
    return state;
  }

  it('needs exactly `days` watered days to ripen', () => {
    let state = farm();
    const { x, y } = plainTile(state);
    state = sow(state, x, y, 'turnip');

    state = tendFor(state, x, y, CROPS.turnip.days - 1);
    expect(tileAt(state, x, y).stage).toBe(STAGE_GROWING);

    state = tendFor(state, x, y, 1);
    expect(tileAt(state, x, y).stage).toBe(STAGE_READY);
  });

  it('does not grow at all on an unwatered day', () => {
    let state = farm();
    const { x, y } = plainTile(state);
    state = sow(state, x, y, 'turnip');
    const before = tileAt(state, x, y).wateredDays;
    state = advanceDay(state, seededRng(3)).state;
    expect(tileAt(state, x, y).wateredDays).toBe(before);
  });

  it('withers after too many dry days', () => {
    let state = farm();
    const { x, y } = plainTile(state);
    state = sow(state, x, y, 'turnip');
    for (let i = 0; i < WITHER_AFTER_DRY_DAYS; i++) {
      state = advanceDay(state, seededRng(3)).state;
    }
    expect(tileAt(state, x, y).stage).toBe(STAGE_WITHERED);
    expect(cropSprite(tileAt(state, x, y))).toBe('dry scrub');
  });

  it('spares a ready crop from drought — it is only waiting to be picked', () => {
    let state = farm();
    const { x, y } = plainTile(state);
    state = tendFor(sow(state, x, y, 'turnip'), x, y, CROPS.turnip.days);
    expect(tileAt(state, x, y).stage).toBe(STAGE_READY);

    for (let i = 0; i < WITHER_AFTER_DRY_DAYS + 2; i++) {
      state = advanceDay(state, seededRng(3)).state;
    }
    expect(tileAt(state, x, y).stage).toBe(STAGE_READY);
  });

  it('lets bare tilled soil go back to weed', () => {
    let state = farm();
    const { x, y } = plainTile(state);
    state = till(state, x, y).state;
    for (let i = 0; i < SOIL_DECAY_DAYS; i++) {
      state = advanceDay(state, seededRng(3)).state;
    }
    expect(tileAt(state, x, y).ground).toBe(WILD);
  });

  it('harvest clears an annual but keeps a perennial in the ground', () => {
    let state = farm();
    const annual = plainTile(state);
    state = tendFor(sow(state, annual.x, annual.y, 'turnip'), annual.x, annual.y, CROPS.turnip.days);
    const picked = harvest(state, annual.x, annual.y);
    expect(picked.ok).toBe(true);
    expect(tileAt(picked.state, annual.x, annual.y).ground).toBe(TILLED);
    expect(tileAt(picked.state, annual.x, annual.y).crop).toBeNull();
    expect(picked.state.stock.turnip).toBe(1);

    let perennial = farm();
    const p = plainTile(perennial);
    perennial = tendFor(sow(perennial, p.x, p.y, 'corn'), p.x, p.y, CROPS.corn.days);
    const cut = harvest(perennial, p.x, p.y);
    expect(cut.ok).toBe(true);
    expect(tileAt(cut.state, p.x, p.y).crop).toBe('corn');
    expect(tileAt(cut.state, p.x, p.y).stage).toBe(STAGE_GROWING);
  });

  it('refuses to harvest before ripening', () => {
    let state = farm();
    const { x, y } = plainTile(state);
    state = sow(state, x, y, 'turnip');
    expect(harvest(state, x, y).ok).toBe(false);
  });
});

describe('orchard, livestock and the barn', () => {
  it('ripens fruit on a fixed cycle and pays out on picking', () => {
    let state = farm();
    const [k] = Object.keys(state.orchard);
    const [x, y] = k.split(',').map(Number);
    for (let i = 0; i < ORCHARD.days; i++) state = advanceDay(state, seededRng(3)).state;
    expect(state.orchard[k].ripe).toBe(true);
    expect(orchardSprite(state, x, y)).toBe(ORCHARD.ripe);

    const picked = pickFruit(state, x, y);
    expect(picked.ok).toBe(true);
    expect(picked.state.gold).toBe(state.gold + ORCHARD.sellPrice);
    expect(picked.state.orchard[k].ripe).toBe(false);
  });

  it('pays for tending an animal once a day', () => {
    const state = farm();
    const animal = state.animals[0];
    const first = tend(state, animal.id);
    expect(first.ok).toBe(true);
    expect(first.state.gold).toBe(state.gold + animal.yield);

    expect(tend(first.state, animal.id).ok).toBe(false);

    const tomorrow = advanceDay(first.state, seededRng(3)).state;
    expect(tomorrow.animals.every((a) => !a.tended)).toBe(true);
  });

  it('keeps wandering animals inside the fence', () => {
    let state = farm();
    for (let i = 0; i < 40; i++) {
      state = advanceDay(state, seededRng(i + 1)).state;
      for (const a of state.animals) {
        expect(a.x).toBeGreaterThan(state.pen.x0);
        expect(a.x).toBeLessThan(state.pen.x1);
        expect(a.y).toBeGreaterThan(state.pen.y0);
        expect(a.y).toBeLessThan(state.pen.y1);
      }
    }
  });

  it('sells the whole barn at catalogue prices', () => {
    const state = { ...farm(), stock: { turnip: 2, corn: 1 } };
    const expected = CROPS.turnip.sellPrice * 2 + CROPS.corn.sellPrice;
    expect(stockValue(state)).toBe(expected);

    const sold = sellStock(state);
    expect(sold.ok).toBe(true);
    expect(sold.state.gold).toBe(state.gold + expected);
    expect(sold.state.stock).toEqual({});
    expect(sellStock(sold.state).ok).toBe(false);
  });
});

describe('the day cycle', () => {
  it('restores energy and advances the date', () => {
    const state = { ...farm(), energy: 2 };
    const { state: next } = advanceDay(state, seededRng(3));
    expect(next.energy).toBe(ENERGY_PER_DAY);
    expect(next.day).toBe(state.day + 1);
  });

  it('clears every watered flag overnight', () => {
    let state = farm();
    const { x, y } = plainTile(state);
    state = water(sow(state, x, y, 'turnip'), x, y).state;
    expect(tileAt(state, x, y).watered).toBe(true);
    state = advanceDay(state, seededRng(3)).state;
    expect(Object.values(state.tiles).every((t) => !t.watered)).toBe(true);
  });

  it('walks the daylight tint from morning to night as energy drains', () => {
    const state = farm();
    const seen = [];
    for (let energy = ENERGY_PER_DAY; energy >= 0; energy--) {
      const phase = dayPhase({ ...state, energy });
      if (seen[seen.length - 1] !== phase) seen.push(phase);
    }
    expect(seen).toEqual(DAY_PHASES);
  });

  it('never reports a phase outside the four the atlas draws', () => {
    const state = farm();
    // Includes the over-spend case: energy can be checked before a cost
    // is applied, so guard against a negative slipping through.
    for (let energy = ENERGY_PER_DAY + 5; energy >= -5; energy--) {
      expect(DAY_PHASES).toContain(dayPhase({ ...state, energy }));
    }
  });
});

describe('actionFor / act', () => {
  it('walks a tile through the whole crop lifecycle', () => {
    let state = farm();
    const { x, y } = plainTile(state);
    const shore = Object.values(state.tiles)
      .find((t) => !isPond(state, t.x, t.y) && hasWaterAccess(state, t.x, t.y));
    const from = { farmerX: shore.x, farmerY: shore.y, selectedCrop: 'turnip' };

    expect(actionFor(state, x, y).action).toBe('till');
    state = act(state, x, y, from).state;

    expect(actionFor(state, x, y, 'turnip').action).toBe('plant');
    state = act(state, x, y, from).state;

    expect(actionFor(state, x, y).action).toBe('water');
    state = act(state, x, y, from).state;

    // Already watered → nothing more to do here today.
    expect(actionFor(state, x, y).action).toBe('none');

    for (let i = 0; i < CROPS.turnip.days; i++) {
      const wet = water({ ...state, energy: ENERGY_PER_DAY, can: CAN_CAPACITY }, x, y);
      state = advanceDay(wet.ok ? wet.state : state, seededRng(3)).state;
    }
    expect(actionFor(state, x, y).action).toBe('harvest');
    const done = act(state, x, y, from);
    expect(done.ok).toBe(true);
    expect(done.state.stock.turnip).toBe(1);
  });

  it('offers to pick only ripe fruit', () => {
    let state = farm();
    const [k] = Object.keys(state.orchard);
    const [x, y] = k.split(',').map(Number);
    state = { ...state, orchard: { ...state.orchard, [k]: { age: 0, ripe: false } } };
    expect(actionFor(state, x, y).action).toBe('none');
    state = { ...state, orchard: { ...state.orchard, [k]: { age: 0, ripe: true } } };
    expect(actionFor(state, x, y).action).toBe('pick');
  });

  it('offers to tend an untended animal and nothing more', () => {
    const state = farm();
    const animal = state.animals[0];
    expect(actionFor(state, animal.x, animal.y).action).toBe('tend');
    const tended = tend(state, animal.id).state;
    expect(actionFor(tended, animal.x, animal.y).action).toBe('none');
  });

  it('never throws for any tile on the map, at any energy level', () => {
    const base = farm();
    for (const energy of [ENERGY_PER_DAY, 3, 0]) {
      const state = { ...base, energy };
      for (let y = 0; y < state.height; y++) {
        for (let x = 0; x < state.width; x++) {
          for (const cropId of CROP_IDS) {
            expect(() => actionFor(state, x, y, cropId)).not.toThrow();
            expect(() => act(state, x, y, { farmerX: x, farmerY: y, selectedCrop: cropId }))
              .not.toThrow();
          }
        }
      }
    }
  });
});

describe('catalogue sanity', () => {
  it('prices every crop above its seed', () => {
    for (const crop of Object.values(CROPS)) {
      expect(crop.sellPrice).toBeGreaterThan(crop.seedCost);
    }
  });

  it('makes slower crops worth more per sowing', () => {
    // Annuals only: perennials trade a lower unit price for repeat
    // harvests, so they are not comparable on this axis.
    const annuals = Object.values(CROPS).filter((c) => !c.regrows)
      .sort((a, b) => a.days - b.days);
    for (let i = 1; i < annuals.length; i++) {
      expect(annuals[i].sellPrice).toBeGreaterThan(annuals[i - 1].sellPrice);
    }
  });

  it('keeps every action affordable within one day', () => {
    for (const cost of Object.values(ACTION_COST)) {
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThanOrEqual(ENERGY_PER_DAY);
    }
  });
});
