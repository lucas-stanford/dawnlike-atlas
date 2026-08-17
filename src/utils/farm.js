/**
 * farm — a complete, pure farming-sim rules engine.
 *
 * There is no React, no DOM and no atlas fetch in this module: it is a
 * plain state machine over a grid, so the whole game loop can be unit
 * tested without rendering anything (see tests/farm.test.js), reused in
 * a Phaser scene or a server, and reasoned about on its own.
 * `FarmExample.jsx` is only input handling and drawing on top of it.
 *
 * WHY IT LOOKS LIKE THIS
 *
 * Two of DawnLike's quirks shaped the design, and both turned into
 * mechanics rather than workarounds:
 *
 * 1. Crops have exactly TWO drawn stages — `young X` and `ripe X`. So a
 *    crop here has three states, not five: sown (bare soil), growing
 *    (`young`), ready (`ripe`). Inventing intermediate stages would mean
 *    inventing art; instead the growth *time* varies per crop and the
 *    two sprites are used honestly.
 *
 * 2. The floor families ship four daylight tints — `morning`, `day`,
 *    `dusk`, `night` — that are palette rotations, not lighting passes.
 *    Rather than picking one and wasting three, the farmer's stamina
 *    drives the tint: as energy drains the whole farm rotates through
 *    all four and the working day visibly runs out. That turns an art
 *    curiosity into the clock the game is played against.
 *
 * IMMUTABILITY
 *
 * Every action returns a NEW state rather than mutating, so React can
 * diff on identity and a test can hold on to a previous day to compare
 * against. The grid is small (a few hundred tiles) and only the touched
 * tile is copied, so this costs nothing in practice.
 *
 * Actions share one result shape:
 *
 *   { ok: boolean, state: FarmState, message: string }
 *
 * `ok: false` always leaves `state` untouched (same reference) and puts
 * the reason in `message`, so a UI can surface it without a second call.
 */

/** Tile ground states. */
export const WILD = 'wild';     // untouched grass
export const TILLED = 'tilled'; // hoed, ready to sow
export const SOWN = 'sown';     // seed in the ground, nothing showing yet

/** Crop life stages, in order. */
export const STAGE_SOWN = 'sown';
export const STAGE_GROWING = 'growing';
export const STAGE_READY = 'ready';
export const STAGE_WITHERED = 'withered';

/**
 * The crop catalogue.
 *
 * `young` / `ripe` are literal sprite names in DawnlikeAtlas.json — the
 * pack ships exactly five two-stage crop pairs and one fruit tree, and
 * this uses all of them. `days` counts WATERED days, not calendar days,
 * so an unwatered field simply doesn't progress.
 *
 * `regrows` marks a perennial: harvesting drops it back to `growing`
 * instead of clearing the tile, which is why herbs and corn are cheaper
 * per harvest but never need re-sowing.
 */
export const CROPS = {
  turnip: {
    id: 'turnip',
    label: 'Turnip',
    young: 'young root vegetable',
    ripe: 'ripe root vegetable',
    days: 2,
    seedCost: 8,
    sellPrice: 26,
    regrows: false,
  },
  cabbage: {
    id: 'cabbage',
    label: 'Cabbage',
    young: 'young leafy vegetable',
    ripe: 'ripe leafy vegetable',
    days: 3,
    seedCost: 14,
    sellPrice: 46,
    regrows: false,
  },
  gourd: {
    id: 'gourd',
    label: 'Gourd',
    young: 'young vine vegetable',
    ripe: 'ripe vine vegetable',
    days: 4,
    seedCost: 20,
    sellPrice: 72,
    regrows: false,
  },
  herbs: {
    id: 'herbs',
    label: 'Herbs',
    young: 'young herb cluster',
    ripe: 'ripe herb cluster',
    days: 3,
    seedCost: 18,
    sellPrice: 30,
    regrows: true,
  },
  corn: {
    id: 'corn',
    label: 'Corn',
    young: 'young corn stalk',
    ripe: 'ripe corn stalk',
    days: 5,
    seedCost: 26,
    sellPrice: 58,
    regrows: true,
  },
};

/** Crop ids in catalogue order — cheapest and fastest first. */
export const CROP_IDS = Object.keys(CROPS);

/**
 * Orchard trees are not planted in soil: they sit on wild ground, take
 * no watering, and bear fruit on a fixed cycle. They exist to give the
 * map something that ticks along on its own while the fields demand
 * daily attention.
 */
export const ORCHARD = {
  young: 'young fruit tree',
  ripe: 'ripe fruit tree',
  days: 6,
  sellPrice: 40,
};

/** The four daylight tints, in the order the working day burns through them. */
export const DAY_PHASES = ['morning', 'day', 'dusk', 'night'];

/** Stamina budget for one day, and what each action costs. */
export const ENERGY_PER_DAY = 26;
export const ACTION_COST = {
  till: 3,
  plant: 1,
  water: 1,
  harvest: 1,
  clear: 2,
  tend: 2,
  refill: 1,
};

/**
 * How many tiles one canful waters.
 *
 * The can is what makes the pond's position matter. An earlier version
 * simply required the farmer to be standing beside open water to water a
 * tile, which is unplayable the moment the field is more than one tile
 * from the pond — you cannot be adjacent to the crop and the water at
 * once. Carrying a fixed number of charges turns that into the trip back
 * and forth that a farming game is actually made of.
 */
export const CAN_CAPACITY = 8;

/**
 * Days a planted tile survives without water before it withers, and days
 * bare tilled soil survives before the weeds take it back. Both are what
 * stop the optimal strategy from being "till everything on day one".
 */
export const WITHER_AFTER_DRY_DAYS = 2;
export const SOIL_DECAY_DAYS = 3;

/**
 * Purely decorative scatter for untouched ground, and the props that
 * mark the yard. Tilling a tile clears whatever was scattered on it, so
 * the decor doubles as a "nobody has worked this" signal.
 */
export const SCATTER = [
  'white flowers', 'blue flowers', 'gold flowers', 'red flowers',
  'sparse white flowers', 'sparse blue flowers',
  'pebble', 'rock', 'sparse gray rocks', 'red cap mushroom', 'sparse green grass',
];

/** Livestock: sprite name → what tending one pays per day. */
export const LIVESTOCK = [
  { name: 'dairy cow', label: 'Dairy cow', yield: 18 },
  { name: 'white sheep', label: 'Sheep', yield: 14 },
  { name: 'pig', label: 'Pig', yield: 12 },
  { name: 'white goat', label: 'Goat', yield: 12 },
  { name: 'hen', label: 'Hen', yield: 8 },
  { name: 'duck', label: 'Duck', yield: 8 },
];

const key = (x, y) => `${x},${y}`;

/**
 * Build the starting farm.
 *
 * The layout is deliberately fixed rather than noise-generated: a farm
 * is a designed space, and a readable one (field block, orchard row,
 * fenced pen, pond) demonstrates the autotilers far better than a random
 * scatter would. Only the livestock placement and the pond edge use the
 * RNG.
 *
 * @param {object} [opts]
 * @param {number} [opts.width=22]
 * @param {number} [opts.height=16]
 * @param {number} [opts.gold=60]
 * @param {() => number} [opts.rng=Math.random] - inject a seeded RNG
 *   (e.g. `ROT.RNG.getUniform`) for a reproducible farm.
 * @returns {object} farm state
 */
export function createFarm({ width = 22, height = 16, gold = 60, rng = Math.random } = {}) {
  const tiles = {};
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      tiles[key(x, y)] = {
        x, y,
        ground: WILD,
        crop: null,
        stage: null,
        wateredDays: 0,
        dryDays: 0,
        idleDays: 0,
        watered: false,
      };
    }
  }

  // A pond in the bottom-left corner. Tiles are marked, not carved out
  // of the grid, so the shore resolver has real neighbours to read.
  const pond = new Set();
  const pondCx = 3;
  const pondCy = height - 4;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - pondCx) / 3.2;
      const dy = (y - pondCy) / 2.1;
      // A little noise on the radius keeps the pond from reading as a
      // perfect ellipse, which is what makes the 47-tile shore set worth
      // having at all.
      if (dx * dx + dy * dy < 1 + (rng() - 0.5) * 0.35) pond.add(key(x, y));
    }
  }

  // The livestock pen: a fenced rectangle in the top-right.
  const pen = { x0: width - 7, y0: 1, x1: width - 2, y1: 5 };
  const animals = [];
  for (let i = 0; i < 5; i++) {
    const spec = LIVESTOCK[Math.floor(rng() * LIVESTOCK.length)] ?? LIVESTOCK[0];
    animals.push({
      id: `animal-${i}`,
      name: spec.name,
      label: spec.label,
      yield: spec.yield,
      x: pen.x0 + 1 + Math.floor(rng() * (pen.x1 - pen.x0 - 1)),
      y: pen.y0 + 1 + Math.floor(rng() * (pen.y1 - pen.y0 - 1)),
      tended: false,
    });
  }

  // The orchard: a short row of trees along the top of the field block.
  const orchard = {};
  for (let i = 0; i < 4; i++) {
    orchard[key(2 + i * 2, 2)] = { age: Math.floor(rng() * ORCHARD.days), ripe: false };
  }

  // A starter plot, already hoed. Without it the map opens as an
  // unbroken lawn and the tilled-soil autotiling — the thing this
  // example exists to show — is invisible until the player has spent
  // most of a day's stamina.
  const plot = { x0: 4, y0: 5, x1: 8, y1: 7 };
  for (let y = plot.y0; y <= plot.y1; y++) {
    for (let x = plot.x0; x <= plot.x1; x++) {
      const tile = tiles[key(x, y)];
      if (tile && !pond.has(key(x, y)) && !orchard[key(x, y)]) {
        // idleDays starts partway through so the opening plot still goes
        // to weed if it is ignored — the decay rule has to bite from
        // day one or it reads as decoration.
        tiles[key(x, y)] = { ...tile, ground: TILLED, idleDays: 1 };
      }
    }
  }

  // Scatter, on wild ground only, well clear of the yard.
  const decor = {};
  for (const tile of Object.values(tiles)) {
    if (tile.ground !== WILD) continue;
    const k = key(tile.x, tile.y);
    if (pond.has(k) || orchard[k]) continue;
    if (rng() > 0.09) continue;
    decor[k] = SCATTER[Math.floor(rng() * SCATTER.length)] ?? SCATTER[0];
  }

  return {
    decor,
    plot,
    width,
    height,
    tiles,
    pond,
    pen,
    animals,
    orchard,
    day: 1,
    gold,
    energy: ENERGY_PER_DAY,
    // Start with a full can so the opening move is "water the starter
    // plot", not "walk to the pond".
    can: CAN_CAPACITY,
    // Harvested produce waiting to be sold, keyed by crop id.
    stock: {},
    log: ['Day 1 — a fresh farm. Till some ground and sow a crop.'],
  };
}

/** The tile at a coordinate, or null when off the map. */
export function tileAt(state, x, y) {
  return state.tiles[key(x, y)] ?? null;
}

/** True when this coordinate is open water. */
export function isPond(state, x, y) {
  return state.pond.has(key(x, y));
}

/** True when a coordinate is inside the livestock pen's fence line. */
export function isPenWall(state, x, y) {
  const { x0, y0, x1, y1 } = state.pen;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const onEdge = x === x0 || x === x1 || y === y0 || y === y1;
  // The south-west corner is left open as a gateway, otherwise the
  // farmer can never reach the animals.
  return onEdge && !(x === x0 && y === y1);
}

/** True when the farmer can stand here. */
export function isWalkable(state, x, y) {
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) return false;
  if (isPond(state, x, y)) return false;
  if (isPenWall(state, x, y)) return false;
  if (state.orchard[key(x, y)]) return false;
  return true;
}

/**
 * True when the farmer standing at (fx, fy) can reach into (x, y).
 *
 * Watering is the exception: standing in the pond is impossible, so the
 * farmer draws water by being *next to* it, which is what makes the
 * pond's position a real constraint on the field layout.
 */
export function isAdjacent(fx, fy, x, y) {
  return Math.abs(fx - x) + Math.abs(fy - y) === 1;
}

/** True when the farmer at (x, y) is standing beside open water. */
export function hasWaterAccess(state, x, y) {
  return [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => isPond(state, x + dx, y + dy));
}

// ---------------------------------------------------------------------
// internals
// ---------------------------------------------------------------------

const fail = (state, message) => ({ ok: false, state, message });

/** Copy the state with one tile replaced and energy spent. */
function withTile(state, tile, patch, cost, message) {
  const tiles = { ...state.tiles, [key(tile.x, tile.y)]: { ...tile, ...patch } };
  return {
    ok: true,
    message,
    state: {
      ...state,
      tiles,
      energy: state.energy - cost,
      log: [...state.log.slice(-40), message],
    },
  };
}

function requireEnergy(state, action) {
  const cost = ACTION_COST[action];
  if (state.energy < cost) {
    return `Too tired to ${action} — end the day to rest.`;
  }
  return null;
}

/** The stage a tile should be showing, derived from its counters. */
export function cropStage(tile) {
  if (!tile?.crop) return null;
  return tile.stage;
}

// ---------------------------------------------------------------------
// actions
// ---------------------------------------------------------------------

/** Hoe wild ground into tilled soil. */
export function till(state, x, y) {
  const tile = tileAt(state, x, y);
  if (!tile) return fail(state, 'Nothing there.');
  if (isPond(state, x, y)) return fail(state, "Can't till open water.");
  if (state.orchard[key(x, y)]) return fail(state, 'A fruit tree is growing there.');
  if (tile.ground !== WILD) return fail(state, 'Already tilled.');
  const tired = requireEnergy(state, 'till');
  if (tired) return fail(state, tired);

  const result = withTile(
    state, tile,
    { ground: TILLED, idleDays: 0 },
    ACTION_COST.till,
    `Tilled the soil at ${x},${y}.`,
  );
  // The hoe goes through whatever was growing wild here.
  if (state.decor[key(x, y)]) {
    const decor = { ...state.decor };
    delete decor[key(x, y)];
    result.state = { ...result.state, decor };
  }
  return result;
}

/** Sow a seed into tilled soil, paying for it out of gold. */
export function plant(state, x, y, cropId) {
  const crop = CROPS[cropId];
  if (!crop) return fail(state, `No such seed: ${cropId}.`);
  const tile = tileAt(state, x, y);
  if (!tile) return fail(state, 'Nothing there.');
  if (tile.ground !== TILLED) return fail(state, 'Till the ground first.');
  if (state.gold < crop.seedCost) {
    return fail(state, `${crop.label} seed costs ${crop.seedCost}g — you have ${state.gold}g.`);
  }
  const tired = requireEnergy(state, 'plant');
  if (tired) return fail(state, tired);

  const result = withTile(
    state, tile,
    { ground: SOWN, crop: cropId, stage: STAGE_SOWN, wateredDays: 0, dryDays: 0, idleDays: 0 },
    ACTION_COST.plant,
    `Sowed ${crop.label.toLowerCase()} at ${x},${y} for ${crop.seedCost}g.`,
  );
  result.state = { ...result.state, gold: result.state.gold - crop.seedCost };
  return result;
}

/** Refill the can. Only works standing beside open water. */
export function refill(state, x, y) {
  if (!hasWaterAccess(state, x, y)) {
    return fail(state, 'No water in reach — stand beside the pond.');
  }
  if (state.can >= CAN_CAPACITY) return fail(state, 'The can is already full.');
  const tired = requireEnergy(state, 'refill');
  if (tired) return fail(state, tired);

  const message = `Filled the can — ${CAN_CAPACITY} tiles' worth.`;
  return {
    ok: true,
    message,
    state: {
      ...state,
      can: CAN_CAPACITY,
      energy: state.energy - ACTION_COST.refill,
      log: [...state.log.slice(-40), message],
    },
  };
}

/**
 * Water a tile, spending one charge from the can.
 *
 * `fromX`/`fromY` are no longer a water-access check — the can carries
 * the water — but they are still accepted so callers can pass the
 * farmer's position uniformly with the other actions.
 */
export function water(state, x, y) {
  const tile = tileAt(state, x, y);
  if (!tile) return fail(state, 'Nothing there.');
  if (tile.ground === WILD) return fail(state, 'Nothing planted to water.');
  if (tile.watered) return fail(state, 'Already watered today.');
  if (state.can <= 0) return fail(state, 'The can is empty — refill it at the pond.');
  const tired = requireEnergy(state, 'water');
  if (tired) return fail(state, tired);

  const result = withTile(
    state, tile,
    { watered: true },
    ACTION_COST.water,
    `Watered ${x},${y} — ${state.can - 1} left in the can.`,
  );
  result.state = { ...result.state, can: result.state.can - 1 };
  return result;
}

/**
 * Harvest a ready crop.
 *
 * Perennials drop back to `growing` with their watered-day counter
 * rewound far enough to need re-growing, rather than clearing the tile.
 */
export function harvest(state, x, y) {
  const tile = tileAt(state, x, y);
  if (!tile) return fail(state, 'Nothing there.');
  if (!tile.crop) return fail(state, 'Nothing growing there.');
  if (tile.stage !== STAGE_READY) {
    return fail(state, `Not ready — ${CROPS[tile.crop].label.toLowerCase()} is still ${tile.stage}.`);
  }
  const tired = requireEnergy(state, 'harvest');
  if (tired) return fail(state, tired);

  const crop = CROPS[tile.crop];
  const patch = crop.regrows
    // Regrown fruit takes the same number of watered days again, but the
    // plant itself stays in the ground, so no seed cost and no tilling.
    ? { stage: STAGE_GROWING, wateredDays: 1, dryDays: 0 }
    : { ground: TILLED, crop: null, stage: null, wateredDays: 0, dryDays: 0, idleDays: 0 };

  const result = withTile(
    state, tile, patch, ACTION_COST.harvest,
    `Harvested ${crop.label.toLowerCase()}${crop.regrows ? ' (the plant regrows)' : ''}.`,
  );
  result.state = {
    ...result.state,
    stock: { ...result.state.stock, [crop.id]: (result.state.stock[crop.id] ?? 0) + 1 },
  };
  return result;
}

/** Clear a withered crop or reclaim tilled soil back to wild grass. */
export function clear(state, x, y) {
  const tile = tileAt(state, x, y);
  if (!tile) return fail(state, 'Nothing there.');
  if (tile.ground === WILD) return fail(state, 'Nothing to clear.');
  const tired = requireEnergy(state, 'clear');
  if (tired) return fail(state, tired);

  return withTile(
    state, tile,
    { ground: WILD, crop: null, stage: null, wateredDays: 0, dryDays: 0, idleDays: 0, watered: false },
    ACTION_COST.clear,
    tile.stage === STAGE_WITHERED ? 'Pulled up the withered crop.' : 'Let the soil go back to grass.',
  );
}

/** Tend an animal — once per animal per day, paid immediately. */
export function tend(state, animalId) {
  const animal = state.animals.find((a) => a.id === animalId);
  if (!animal) return fail(state, 'No animal there.');
  if (animal.tended) return fail(state, `The ${animal.label.toLowerCase()} has already been tended today.`);
  const tired = requireEnergy(state, 'tend');
  if (tired) return fail(state, tired);

  const message = `Tended the ${animal.label.toLowerCase()} — ${animal.yield}g.`;
  return {
    ok: true,
    message,
    state: {
      ...state,
      energy: state.energy - ACTION_COST.tend,
      gold: state.gold + animal.yield,
      animals: state.animals.map((a) => (a.id === animalId ? { ...a, tended: true } : a)),
      log: [...state.log.slice(-40), message],
    },
  };
}

/** Sell everything in the barn. */
export function sellStock(state) {
  const entries = Object.entries(state.stock).filter(([, n]) => n > 0);
  if (!entries.length) return fail(state, 'Nothing in the barn to sell.');

  let total = 0;
  const parts = [];
  for (const [cropId, count] of entries) {
    const crop = CROPS[cropId];
    total += crop.sellPrice * count;
    parts.push(`${count}× ${crop.label.toLowerCase()}`);
  }
  const message = `Sold ${parts.join(', ')} for ${total}g.`;
  return {
    ok: true,
    message,
    state: { ...state, gold: state.gold + total, stock: {}, log: [...state.log.slice(-40), message] },
  };
}

// ---------------------------------------------------------------------
// the day cycle
// ---------------------------------------------------------------------

/**
 * End the day: crops drink, grow, wither or rot; soil goes to weed;
 * orchards tick; animals reset and wander.
 *
 * @param {object} state
 * @param {() => number} [rng=Math.random] - drives livestock wandering
 * @returns {{state: object, report: {grown:number, ready:number, withered:number, reclaimed:number, fruited:number}}}
 */
export function advanceDay(state, rng = Math.random) {
  const tiles = {};
  const report = { grown: 0, ready: 0, withered: 0, reclaimed: 0, fruited: 0 };

  for (const [k, tile] of Object.entries(state.tiles)) {
    let next = { ...tile, watered: false };

    if (tile.crop && tile.stage !== STAGE_WITHERED) {
      if (tile.watered) {
        const crop = CROPS[tile.crop];
        const wateredDays = tile.wateredDays + 1;
        const stage = wateredDays >= crop.days ? STAGE_READY : STAGE_GROWING;
        if (stage === STAGE_READY && tile.stage !== STAGE_READY) report.ready += 1;
        else report.grown += 1;
        next = { ...next, wateredDays, dryDays: 0, stage };
      } else {
        const dryDays = tile.dryDays + 1;
        if (dryDays >= WITHER_AFTER_DRY_DAYS && tile.stage !== STAGE_READY) {
          // A ready crop survives drought — it has already finished
          // growing, it is just waiting to be picked.
          report.withered += 1;
          next = { ...next, dryDays, stage: STAGE_WITHERED };
        } else {
          next = { ...next, dryDays };
        }
      }
    } else if (tile.ground === TILLED) {
      const idleDays = tile.idleDays + 1;
      if (idleDays >= SOIL_DECAY_DAYS) {
        report.reclaimed += 1;
        next = { ...next, ground: WILD, idleDays: 0 };
      } else {
        next = { ...next, idleDays };
      }
    }

    tiles[k] = next;
  }

  // Orchard trees ripen on their own schedule and hold their fruit until
  // it is picked, which is what makes them the low-maintenance income.
  const orchard = {};
  for (const [k, tree] of Object.entries(state.orchard)) {
    if (tree.ripe) { orchard[k] = tree; continue; }
    const age = tree.age + 1;
    const ripe = age >= ORCHARD.days;
    if (ripe) report.fruited += 1;
    orchard[k] = { age: ripe ? 0 : age, ripe };
  }

  // Animals shuffle one step inside the pen so the scene is never static.
  const animals = state.animals.map((a) => {
    const dirs = [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]];
    const [dx, dy] = dirs[Math.floor(rng() * dirs.length)] ?? [0, 0];
    const nx = a.x + dx;
    const ny = a.y + dy;
    const inside = nx > state.pen.x0 && nx < state.pen.x1 && ny > state.pen.y0 && ny < state.pen.y1;
    return { ...a, tended: false, x: inside ? nx : a.x, y: inside ? ny : a.y };
  });

  const day = state.day + 1;
  const summary = [
    report.ready ? `${report.ready} ready to harvest` : null,
    report.withered ? `${report.withered} withered` : null,
    report.reclaimed ? `${report.reclaimed} plot${report.reclaimed > 1 ? 's' : ''} gone to weed` : null,
    report.fruited ? `${report.fruited} tree${report.fruited > 1 ? 's' : ''} bearing fruit` : null,
  ].filter(Boolean);

  return {
    report,
    state: {
      ...state,
      tiles,
      orchard,
      animals,
      day,
      energy: ENERGY_PER_DAY,
      log: [
        ...state.log.slice(-40),
        `Day ${day} — ${summary.length ? summary.join(', ') + '.' : 'a quiet night.'}`,
      ],
    },
  };
}

/** Pick fruit from a ripe orchard tree. */
export function pickFruit(state, x, y) {
  const tree = state.orchard[key(x, y)];
  if (!tree) return fail(state, 'No tree there.');
  if (!tree.ripe) return fail(state, 'The fruit is not ripe yet.');
  const tired = requireEnergy(state, 'harvest');
  if (tired) return fail(state, tired);

  const message = `Picked fruit — ${ORCHARD.sellPrice}g.`;
  return {
    ok: true,
    message,
    state: {
      ...state,
      energy: state.energy - ACTION_COST.harvest,
      gold: state.gold + ORCHARD.sellPrice,
      orchard: { ...state.orchard, [key(x, y)]: { age: 0, ripe: false } },
      log: [...state.log.slice(-40), message],
    },
  };
}

// ---------------------------------------------------------------------
// presentation helpers
// ---------------------------------------------------------------------

/**
 * Which daylight tint the farm should be drawn in right now.
 *
 * Energy, not a clock: the tint is how much of the working day is left,
 * so the farm visibly darkens as the farmer tires. Returns one of
 * `DAY_PHASES`, ready to prefix a floor family name.
 */
export function dayPhase(state) {
  // Clamp BOTH ends. Energy above the daily budget (a caller topping the
  // farmer up) makes `spent` negative and would index off the front of
  // the array; energy below zero would index off the back.
  const spent = 1 - Math.min(1, Math.max(0, state.energy / ENERGY_PER_DAY));
  const index = Math.min(DAY_PHASES.length - 1, Math.max(0, Math.floor(spent * DAY_PHASES.length)));
  return DAY_PHASES[index];
}

/**
 * The autotile family base name for a tile's ground, already prefixed
 * with the current daylight tint. Feed straight to
 * `resolveDawnLikeFloorName`.
 *
 * Watered soil uses the `* watered field` family generated by
 * scripts/generate-watered-field.mjs — DawnLike itself only draws the dry
 * `* plowed field`.
 */
export function soilFamily(state, tile) {
  const phase = dayPhase(state);
  if (tile.ground === WILD) return `${phase} grass floor`;
  return tile.watered ? `${phase} watered field` : `${phase} plowed field`;
}

/**
 * The sprite to draw on top of a tile's soil, or null for bare ground.
 *
 * Withered crops reuse `dry scrub`, which is DawnLike's own dead-growth
 * tile — closer to right than any of the crop art recoloured.
 */
export function cropSprite(tile) {
  if (!tile?.crop) return null;
  if (tile.stage === STAGE_WITHERED) return 'dry scrub';
  if (tile.stage === STAGE_SOWN) return null;
  const crop = CROPS[tile.crop];
  return tile.stage === STAGE_READY ? crop.ripe : crop.young;
}

/** The sprite for an orchard tree at a coordinate, or null. */
export function orchardSprite(state, x, y) {
  const tree = state.orchard[key(x, y)];
  if (!tree) return null;
  return tree.ripe ? ORCHARD.ripe : ORCHARD.young;
}

/**
 * What pressing "act" on a tile should do, given where the farmer is.
 *
 * Centralising this keeps the UI honest: the button label, the hover
 * hint and the keypress all resolve through one function, so they can
 * never disagree about what is about to happen.
 *
 * @returns {{action: string, label: string}} — `action` is 'none' when
 *   there is nothing to do here.
 */
export function actionFor(state, x, y, selectedCrop = CROP_IDS[0]) {
  if (state.orchard[key(x, y)]) {
    const tree = state.orchard[key(x, y)];
    return tree.ripe
      ? { action: 'pick', label: 'Pick fruit' }
      : { action: 'none', label: 'Fruit still ripening' };
  }
  const animal = state.animals.find((a) => a.x === x && a.y === y);
  if (animal) {
    return animal.tended
      ? { action: 'none', label: `${animal.label} already tended` }
      : { action: 'tend', label: `Tend the ${animal.label.toLowerCase()}` };
  }
  // Acting on a pond tile means the farmer is standing next to it, which
  // is exactly the condition `refill` checks — so no position is needed
  // here to know the fill is legal.
  if (isPond(state, x, y)) {
    return state.can >= CAN_CAPACITY
      ? { action: 'none', label: 'The can is full' }
      : { action: 'refill', label: 'Fill the watering can' };
  }

  const tile = tileAt(state, x, y);
  if (!tile) return { action: 'none', label: '' };
  if (tile.stage === STAGE_WITHERED) return { action: 'clear', label: 'Clear the withered crop' };
  if (tile.stage === STAGE_READY) return { action: 'harvest', label: 'Harvest' };
  if (tile.crop) {
    return tile.watered
      ? { action: 'none', label: 'Already watered today' }
      : { action: 'water', label: 'Water' };
  }
  if (tile.ground === TILLED) {
    return { action: 'plant', label: `Sow ${CROPS[selectedCrop].label.toLowerCase()}` };
  }
  return { action: 'till', label: 'Till' };
}

/**
 * Apply whatever `actionFor` decided, from the farmer's position.
 *
 * The single entry point the UI calls, so a keypress and a click take
 * exactly the same path.
 */
export function act(state, x, y, { farmerX, farmerY, selectedCrop = CROP_IDS[0] } = {}) {
  const { action } = actionFor(state, x, y, selectedCrop);
  switch (action) {
    case 'till': return till(state, x, y);
    case 'plant': return plant(state, x, y, selectedCrop);
    case 'water': return water(state, x, y);
    case 'refill': return refill(state, farmerX, farmerY);
    case 'harvest': return harvest(state, x, y);
    case 'clear': return clear(state, x, y);
    case 'pick': return pickFruit(state, x, y);
    case 'tend': {
      const animal = state.animals.find((a) => a.x === x && a.y === y);
      return animal ? tend(state, animal.id) : fail(state, 'No animal there.');
    }
    default: return fail(state, 'Nothing to do here.');
  }
}

/** Total sale value of everything sitting in the barn. */
export function stockValue(state) {
  return Object.entries(state.stock)
    .reduce((sum, [id, n]) => sum + (CROPS[id]?.sellPrice ?? 0) * n, 0);
}
