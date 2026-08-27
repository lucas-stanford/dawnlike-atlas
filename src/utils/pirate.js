/**
 * pirate — a complete, pure archipelago-voyage rules engine.
 *
 * Same shape as `utils/farm`: no React, no DOM, no atlas fetch. It is a
 * plain state machine over a grid, so the whole game is unit tested
 * without rendering anything (see tests/pirate.test.js) and
 * `PirateExample.jsx` is only input handling and drawing on top of it.
 *
 * WHY IT LOOKS LIKE THIS
 *
 * Three facts about the pack shaped the design, and each turned into a
 * mechanic rather than a workaround:
 *
 * 1. **DawnLike draws no ship.** Not one, in 4,157 sprites. So the ship
 *    here is not a sprite at all — it is a small tile map that moves. Its
 *    deck is laid from `board a/b/c`, its rail is `stone fence` (tagged
 *    `railing, wood` in the atlas, and drawn as one), and that rail is
 *    resolved through the SAME cardinal autotile resolver a static map
 *    uses for its fences. Turning the ship changes its footprint, which
 *    changes every rail tile's neighbours, which re-resolves the whole
 *    rail. The autotile resolvers were written for terrain; this is the
 *    same code running on a rigid body that rotates.
 *
 * 2. **The generated `sand shore` set is a full 47-tile blob**, and its
 *    tiles are transparent where the water goes. So an island's coast can
 *    be drawn over any water tile and always matches — which is what
 *    makes a sea of `deep water tile` with `shallow water tile` in the
 *    lagoons cost nothing to draw.
 *
 * 3. **There is no compass rose and no sail sprite**, so the wind is not
 *    drawn on the map at all — it is a rule. Sailing with the wind costs
 *    one watch, across it costs two, into it costs three. That single
 *    rule is what makes the archipelago a routing puzzle instead of a
 *    grid walk, and it needs no art whatsoever.
 *
 * THE LOOP
 *
 * Sail out on the wind → anchor off an island → row ashore → dig for the
 * cache → carry the loot back → sail home to the cove and bank it. Loot
 * in the hold is lost if the ship is wrecked; loot in the cove is safe.
 * That is the whole tension, and the wind decides how expensive the trip
 * home is going to be.
 *
 * IMMUTABILITY
 *
 * Every action returns a NEW state rather than mutating. Actions share
 * one result shape:
 *
 *   { ok: boolean, state: SeaState, message: string }
 *
 * `ok: false` always leaves `state` untouched (the SAME reference, which
 * is what lets React skip the re-render) and puts the reason in
 * `message`.
 */

// ---------------------------------------------------------------------
// terrain
// ---------------------------------------------------------------------

/** Cell kinds. Only these three exist; everything else is an overlay. */
export const DEEP = 'deep';
export const SHALLOW = 'shallow';
export const SAND = 'sand';

/** Headings, clockwise from north. Index arithmetic depends on this order. */
export const HEADINGS = ['n', 'e', 's', 'w'];

/** Unit vector per heading. */
export const STEP = {
  n: { dx: 0, dy: -1 },
  e: { dx: 1, dy: 0 },
  s: { dx: 0, dy: 1 },
  w: { dx: -1, dy: 0 },
};

export const COMPASS_LABEL = { n: 'North', e: 'East', s: 'South', w: 'West' };

// ---------------------------------------------------------------------
// costs
// ---------------------------------------------------------------------

/**
 * A day is a fixed budget of watches. Every action spends some; when the
 * budget runs out the day ends, the wind backs round and the beasts move
 * a full turn of their own.
 */
export const WATCHES_PER_DAY = 26;

/**
 * The wind rule, and the reason this is a game.
 *
 * Running before the wind is cheap, reaching across it is twice as dear,
 * and beating into it is three times. A cache two islands upwind is not
 * "six tiles away", it is most of a day — so the question is never
 * "where is the treasure" but "which leg do I sail today".
 */
export const SAIL_WITH = 1;
export const SAIL_ACROSS = 2;
export const SAIL_AGAINST = 3;

export const COST = {
  turn: 1,      // put the helm over one point
  land: 1,      // row ashore, or row back
  walk: 1,      // a step on foot
  dig: 2,       // one spadeful
  strike: 2,    // the crew lays into something with a boat hook
  loot: 1,      // break open a chest
};

/**
 * The vessels.
 *
 * The ship is a six-cell tile map — the right shape for something you
 * stand on, and the reason its hull autotiles. Everything else is a
 * single cell and a single sprite, which is the right shape for anything
 * a map wants to place the way it places a creature; `sprite` names the
 * family, and the heading picks the frame.
 *
 * Hull size is not cosmetic. Anything smaller than the ship draws less,
 * so it can work lagoons and pinches a 3x2 hull cannot come about in, and
 * it carries and survives correspondingly less — the same crossing is a
 * different problem in each.
 *
 * The black sloop IS cosmetic, and deliberately so: it is the same hull
 * under the same rig, in a livery. A pirate is not a different class of
 * boat, only a different flag.
 */
export const VESSELS = {
  ship: {
    id: 'ship', label: 'Ship', along: 3, abeam: 2, hull: 12, hold: 6, sprite: null,
  },
  sloop: {
    id: 'sloop', label: 'Sloop', along: 1, abeam: 1, hull: 8, hold: 4, sprite: 'sloop',
  },
  blackSloop: {
    id: 'blackSloop', label: 'Black sloop', along: 1, abeam: 1, hull: 8, hold: 4,
    sprite: 'black sloop',
  },
  boat: {
    id: 'boat', label: 'Rowboat', along: 1, abeam: 1, hull: 5, hold: 2, sprite: 'boat',
  },
};

export const VESSEL_IDS = Object.keys(VESSELS);

/** The vessel spec for a ship record, defaulting to the full ship. */
export const vesselOf = (ship) => VESSELS[ship?.vessel] ?? VESSELS.ship;

/** Hull points. Nothing repairs at sea; the cove repairs everything. */
export const HULL_MAX = VESSELS.ship.hull;

/** How much loot the hold takes before the crew refuses to carry more. */
export const HOLD_CAPACITY = VESSELS.ship.hold;

/** The limits for the vessel actually in play. */
export const hullMax = (state) => vesselOf(state.ship).hull;
export const holdCapacity = (state) => vesselOf(state.ship).hold;

/**
 * Sprite for a one-cell vessel, which is drawn rather than assembled.
 * Returns null for the ship, which has no single sprite to name.
 */
export function vesselSprite(ship) {
  const { sprite } = vesselOf(ship);
  return sprite ? `${sprite} ${ship.heading}` : null;
}

// ---------------------------------------------------------------------
// catalogue
// ---------------------------------------------------------------------

/**
 * Sea beasts. Every `sprite` is a literal key in DawnlikeAtlas.json, and
 * every one of them is a two-frame animated sprite, so the sea moves
 * without a single line of animation code here.
 *
 * `water` says where a beast will swim: `DEEP` beasts never come into the
 * lagoons, which is what makes hugging the shore a real tactic and the
 * open crossing a real risk.
 */
export const BEASTS = [
  { id: 'kraken',   sprite: 'kraken',            label: 'Kraken',      hp: 6, bite: 3, water: DEEP,    bounty: 90 },
  { id: 'white',    sprite: 'great white shark', label: 'Great white', hp: 4, bite: 2, water: DEEP,    bounty: 55 },
  { id: 'tiger',    sprite: 'tiger shark',       label: 'Tiger shark', hp: 3, bite: 2, water: DEEP,    bounty: 45 },
  { id: 'searwyrm', sprite: 'searwyrm',          label: 'Sea wyrm',    hp: 5, bite: 3, water: DEEP,    bounty: 75 },
  { id: 'barracuda',sprite: 'barracuda',         label: 'Barracuda',   hp: 2, bite: 1, water: SHALLOW, bounty: 25 },
  { id: 'eel',      sprite: 'electric eel',      label: 'Electric eel',hp: 2, bite: 2, water: SHALLOW, bounty: 35 },
  { id: 'jelly',    sprite: 'man o war',         label: 'Man o\' war', hp: 1, bite: 1, water: SHALLOW, bounty: 15 },
  { id: 'turtle',   sprite: 'giant turtle',      label: 'Giant turtle',hp: 4, bite: 0, water: SHALLOW, bounty: 20 },
];

/**
 * What can be dug up or broken open. `sprite` is again a literal atlas
 * key. `weight` is how much of the hold one takes: a big chest is worth
 * more per unit of hold than coins, so a full hold is a packing problem.
 */
export const LOOT = {
  coins:  { id: 'coins',  sprite: 'pile of gold coins', label: 'Doubloons',  value: 40,  weight: 1 },
  gem:    { id: 'gem',    sprite: 'gleaming red gem',   label: 'Ruby',       value: 85,  weight: 1 },
  sapphire:{ id: 'sapphire',sprite: 'gleaming blue gem',label: 'Sapphire',   value: 70,  weight: 1 },
  chest:  { id: 'chest',  sprite: 'open chest',         label: 'Chest',      value: 130, weight: 2 },
  hoard:  { id: 'hoard',  sprite: 'open big chest',     label: 'Buried hoard', value: 260, weight: 3 },
  keg:    { id: 'keg',    sprite: 'open keg',           label: 'Keg of rum', value: 30,  weight: 1 },
};

export const LOOT_IDS = Object.keys(LOOT);

/** Scenery scattered on the sand. Purely decorative; walkable. */
export const FLOTSAM = [
  'closed barrel', 'broken barrel', 'closed keg', 'woodpile',
  'skull', 'old skull', 'bottle', 'pebble', 'rock', 'bones',
];

/**
 * Deck planking, generated by `scripts/generate-ship-deck.mjs`.
 *
 * The pack's nearest wood, `board a/b/c`, is a set of TRESTLE TABLES —
 * a plank top on visible legs — and six of them side by side read as a
 * bookcase lying on the water. So the deck is drawn instead, in the same
 * five DawnBringer 16 entries DawnLike uses for its own wooden doors.
 *
 * Two orientations, because a ship's planks run fore-and-aft and so have
 * to turn when she does. Three variants of each, because a butt joint in
 * the same place on every tile turns a deck into graph paper.
 */
export const SHIP_DECK_SPRITES = [
  'ship deck ns a', 'ship deck ns b', 'ship deck ns c',
  'ship deck we a', 'ship deck we b', 'ship deck we c',
];

/**
 * The mast, drawn over transparency so it composites onto whichever deck
 * tile it lands on. It is what stops six planked cells reading as a raft.
 */
export const MAST_SPRITE = 'ship mast';

/** The gunwale family, resolved through `resolveDawnLikeFloorName`. */
export const HULL_FAMILY = 'ship rail';

/**
 * The two cells at the leading edge, which carry their own planking.
 *
 * A bow piece is opaque rather than an overlay: the chamfer removes part
 * of the cell, so a transparent rail would leave the deck tile beneath
 * showing through the cut and the prow would read as a rope stretched
 * across a square hull.
 */
export function bowSprite(suffix, heading) {
  const orientation = heading === 'n' || heading === 's' ? 'ns' : 'we';
  return `ship bow ${orientation} ${suffix}`;
}

/**
 * Which cell of the hull carries the mast — midships, one in from the
 * stern. `shipCells` returns stern-first, so index 2 is the same cell
 * whichever way she is pointing.
 */
export const MAST_INDEX = 2;
export const CAPTAIN_SPRITE = 'captain';
export const RAIL_FAMILY = 'stone fence';
export const SHORE_FAMILY = 'sand shore';
export const CANOPY_FAMILY = 'palm';
/**
 * The sea.
 *
 * NOT `deep water tile` / `shallow water tile`, despite the names. Those
 * two are drawn as blue and grey COBBLE — they are map-key markers, not
 * terrain, and tiled across a whole sea they read as graph paper. The
 * pool families are the pack's actual water: `murky` is a deep blue and
 * `clear` a shallow turquoise, which is exactly the depth cue the lagoon
 * rule needs, from art that already existed.
 */
export const DEEP_SPRITE = 'stone murky pool center';
export const SHALLOW_SPRITE = 'stone clear pool center';
export const COVE_SPRITE = 'closed big chest';
export const DIG_SPRITE = 'pick axe';

// ---------------------------------------------------------------------
// rng
// ---------------------------------------------------------------------

/**
 * A tiny LCG. Taking the generator as a parameter — rather than reaching
 * for Math.random inside the rules — is what makes a seed reproduce a
 * whole archipelago, and what lets a test assert on an exact voyage.
 */
export function makeRng(seed = 1) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const key = (x, y) => `${x},${y}`;

// ---------------------------------------------------------------------
// geometry
// ---------------------------------------------------------------------

/**
 * The ship's footprint: three cells fore-and-aft by two abeam, anchored
 * on the helm cell and laid out along the heading.
 *
 * Cells come back bow-first. The caller depends on that order — the first
 * cell is where a boarding party steps off and where the ship's own
 * collision check bites first — so do not sort this.
 */
export function shipCells(ship) {
  const { x, y, heading } = ship;
  const { along: LONG, abeam: WIDE } = vesselOf(ship);
  const { dx, dy } = STEP[heading];
  // Abeam is the heading turned 90° clockwise.
  const beam = STEP[HEADINGS[(HEADINGS.indexOf(heading) + 1) % 4]];
  const cells = [];
  for (let along = 0; along < LONG; along += 1) {
    for (let across = 0; across < WIDE; across += 1) {
      cells.push({
        x: x + dx * along + beam.dx * across,
        y: y + dy * along + beam.dy * across,
      });
    }
  }
  return cells;
}

/** The two cells at the bow — where the ship touches whatever is ahead. */
export function bowCells(ship) {
  const { abeam } = vesselOf(ship);
  const cells = shipCells(ship);
  // Cells come back stern-first in rows `abeam` wide, so the bow is
  // always the last row — one cell for a boat, two for the ship.
  return cells.slice(cells.length - abeam);
}

/**
 * The hull, as a neighbour truth table per deck cell — ready to hand
 * straight to `resolveDawnLikeFloorName`.
 *
 * `true` means "the cell that way is also deck", which is the floor
 * resolver's own convention: it names the sides that are MISSING, so a
 * cell with open water to the north and west resolves to the `nw`
 * corner piece. That is exactly the shape of a gunwale.
 *
 * Using the FLOOR resolver rather than the fence one is a deliberate
 * correction. A fence draws its rail down the CENTRE of a tile, because
 * a fence occupies a whole cell of a map; a ship's rail is on the EDGE
 * of the deck. Laying fence sprites along the hull put a bar a quarter
 * of a tile inboard on every side and the ship came out looking like a
 * portcullis. A floor family draws its transition at the tile boundary,
 * which is where a gunwale actually is.
 *
 * Because the outline is recomputed from the footprint, the whole hull
 * re-resolves when the ship turns — corners become straights and back
 * again — using the same resolver a ploughed field uses.
 */
export function hullNeighbours(ship) {
  const cells = shipCells(ship);
  const deck = new Set(cells.map((c) => key(c.x, c.y)));
  const bow = new Set(bowCells(ship).map((c) => key(c.x, c.y)));
  return cells.map(({ x, y }) => ({
    x,
    y,
    n: deck.has(key(x, y - 1)),
    s: deck.has(key(x, y + 1)),
    e: deck.has(key(x + 1, y)),
    w: deck.has(key(x - 1, y)),
    bow: bow.has(key(x, y)),
  }));
}

/**
 * The floor-family suffix for one neighbour truth table: the open sides
 * in the pack's n-s-w-e order, or `c` when there are none.
 *
 * `resolveDawnLikeFloorName` computes the same string internally but
 * only hands back a finished sprite name, and the bow pieces are named
 * `ship bow <orientation> <suffix>` rather than `<family> <suffix>` —
 * so the suffix itself has to be available on its own.
 */
export function hullSuffix({ n, s, e, w }) {
  const missing = [];
  if (!n) missing.push('n');
  if (!s) missing.push('s');
  if (!w) missing.push('w');
  if (!e) missing.push('e');
  return missing.join('') || 'c';
}

/**
 * The cost in watches of moving one cell on `heading` while the wind
 * blows FROM `wind`.
 *
 * Sailing south with a north wind is running before it (cheap); sailing
 * north into a north wind is beating (dear). The angle is the number of
 * compass points between the heading and the wind's downwind direction.
 */
export function sailCost(heading, wind) {
  const downwind = HEADINGS[(HEADINGS.indexOf(wind) + 2) % 4];
  const points = Math.abs(HEADINGS.indexOf(heading) - HEADINGS.indexOf(downwind));
  const angle = Math.min(points, 4 - points);
  if (angle === 0) return SAIL_WITH;
  if (angle === 1) return SAIL_ACROSS;
  return SAIL_AGAINST;
}

/** Human-readable trim, for the HUD. */
export function pointOfSail(heading, wind) {
  const cost = sailCost(heading, wind);
  if (cost === SAIL_WITH) return 'running';
  if (cost === SAIL_ACROSS) return 'reaching';
  return 'beating';
}

// ---------------------------------------------------------------------
// world
// ---------------------------------------------------------------------

/**
 * Build an archipelago.
 *
 * Islands are grown as overlapping ellipses rather than sampled from
 * noise: an ellipse is guaranteed to be one connected blob, and a blob is
 * what the 47-tile shore set is designed to wrap. Noise gives prettier
 * coastlines and also gives single-cell islets and one-cell straits,
 * neither of which a 3x2 ship can do anything with.
 */
export function createSea({
  width = 34,
  height = 24,
  islands = 5,
  vessel = 'ship',
  seed = 1,
  rng = makeRng(seed),
} = {}) {
  const cells = new Map();
  const at = (x, y) => cells.get(key(x, y)) ?? DEEP;
  const inBounds = (x, y) => x >= 0 && y >= 0 && x < width && y < height;

  const isles = [];
  // The home cove is placed first and always in the south-west quadrant,
  // so a new player starts somewhere findable instead of wherever the
  // generator happened to drop the first blob.
  const wanted = [
    { cx: Math.floor(width * 0.16), cy: Math.floor(height * 0.72), home: true },
  ];
  for (let i = 1; i < islands; i += 1) {
    wanted.push({
      cx: 4 + Math.floor(rng() * (width - 8)),
      cy: 3 + Math.floor(rng() * (height - 6)),
      home: false,
    });
  }

  for (const spec of wanted) {
    const rx = 3 + Math.floor(rng() * 3);
    const ry = 2 + Math.floor(rng() * 3);
    const own = [];
    for (let y = spec.cy - ry - 1; y <= spec.cy + ry + 1; y += 1) {
      for (let x = spec.cx - rx - 1; x <= spec.cx + rx + 1; x += 1) {
        if (!inBounds(x, y)) continue;
        // A margin of open water at the map edge keeps a ship from being
        // pinned against the frame by an island growing into it.
        if (x < 2 || y < 2 || x > width - 3 || y > height - 3) continue;
        const nx = (x - spec.cx) / rx;
        const ny = (y - spec.cy) / ry;
        const d = nx * nx + ny * ny;
        if (d <= 1 - rng() * 0.22) {
          cells.set(key(x, y), SAND);
          own.push({ x, y });
        }
      }
    }
    if (own.length >= 6) isles.push({ ...spec, cells: own });
  }

  // A lagoon ring: every deep cell touching sand becomes shallow. Beasts
  // that only swim deep water cannot follow a ship in here.
  for (const [k, kind] of [...cells]) {
    if (kind !== SAND) continue;
    const [sx, sy] = k.split(',').map(Number);
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const x = sx + dx;
        const y = sy + dy;
        if (!inBounds(x, y) || at(x, y) !== DEEP) continue;
        cells.set(key(x, y), SHALLOW);
      }
    }
  }

  // One buried cache per island, never on the outermost ring, so digging
  // always means walking inland rather than poking the beach from the deck.
  const caches = [];
  const props = [];
  /**
   * Which inland cells carry palms.
   *
   * Sampled rather than blanket-applied: canopy on every inland cell
   * buries the island under leaves, hides the flotsam and the chests,
   * and leaves nothing for the shore set's work to be seen against. A
   * little under half, clumped by the resolver's own corner rules, reads
   * as an island with trees on it rather than a green rectangle.
   */
  const canopy = new Set();
  for (const isle of isles) {
    const inner = isle.cells.filter(({ x, y }) =>
      at(x - 1, y) === SAND && at(x + 1, y) === SAND
      && at(x, y - 1) === SAND && at(x, y + 1) === SAND);
    const pool = inner.length ? inner : isle.cells;
    const spot = pool[Math.floor(rng() * pool.length)];
    if (!isle.home) caches.push({ x: spot.x, y: spot.y, dug: false, isle: isles.indexOf(isle) });

    for (const c of isle.cells) {
      if (c.x === spot.x && c.y === spot.y) continue;
      // Only truly inland cells get trees, so the canopy never overhangs
      // the waterline the shore tiles just drew.
      const inland = at(c.x - 1, c.y) === SAND && at(c.x + 1, c.y) === SAND
        && at(c.x, c.y - 1) === SAND && at(c.x, c.y + 1) === SAND;
      if (inland && rng() < 0.55) canopy.add(key(c.x, c.y));
      const roll = rng();
      if (roll < 0.06) {
        props.push({ x: c.x, y: c.y, sprite: FLOTSAM[Math.floor(rng() * FLOTSAM.length)], kind: 'flotsam' });
      } else if (roll < 0.10 && !isle.home) {
        props.push({ x: c.x, y: c.y, sprite: LOOT.chest.sprite, kind: 'chest', loot: 'chest', taken: false });
      }
    }
  }

  const home = isles.find((i) => i.home) ?? isles[0];
  const cove = home
    ? home.cells.reduce((best, c) => (c.y > best.y ? c : best), home.cells[0])
    : { x: 2, y: height - 3 };

  // The vessel has to be decided BEFORE the mooring is looked for: the
  // footprint is what `findMooring` measures, and a boat fits in water a
  // ship cannot reach.
  const hullKind = VESSELS[vessel] ? vessel : 'ship';
  const ship = findMooring(cells, width, height, cove, hullKind) ?? {
    x: Math.floor(width / 2), y: Math.floor(height / 2), heading: 'n', vessel: hullKind,
  };

  const beasts = [];
  const beastCount = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < beastCount; i += 1) {
    const spec = BEASTS[Math.floor(rng() * BEASTS.length)];
    const spot = findWater(cells, width, height, spec.water, rng, shipCells(ship));
    if (spot) beasts.push({ ...spec, uid: `b${i}`, x: spot.x, y: spot.y, hp: spec.hp });
  }

  return {
    width,
    height,
    cells,
    isles: isles.map((i) => ({ home: i.home, cells: i.cells })),
    canopy,
    cove,
    ship: { ...ship },
    /** null while aboard; a position while the captain is ashore. */
    ashore: null,
    caches,
    props,
    beasts,
    wind: HEADINGS[Math.floor(rng() * 4)],
    watches: WATCHES_PER_DAY,
    day: 1,
    hull: VESSELS[hullKind].hull,
    hold: [],
    banked: 0,
    wrecked: false,
    log: ['Day 1 — the cove is astern and the glass is steady.'],
    message: '',
  };
}

/**
 * A clear 3x2 mooring near the cove.
 *
 * The margin is not cosmetic and neither is testing all four headings: a
 * hull flush against the edge of the chart cannot come about, because the
 * rotated footprint would leave the map. A ship moored there starts the
 * game able to do nothing but sail straight ahead.
 */
function findMooring(cells, width, height, cove, vessel = 'ship') {
  const at = (x, y) => cells.get(key(x, y)) ?? DEEP;
  const MARGIN = 1;
  for (let radius = 2; radius <= 10; radius += 1) {
    for (const heading of HEADINGS) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const probe = { x: cove.x + dx, y: cove.y + dy, heading, vessel };
          const fits = HEADINGS.every((h) => shipCells({ ...probe, heading: h }).every(({ x, y }) =>
            x >= MARGIN && y >= MARGIN && x < width - MARGIN && y < height - MARGIN
            && at(x, y) !== SAND));
          if (fits) return probe;
        }
      }
    }
  }
  return null;
}

/** A random water cell of the requested kind, clear of the ship. */
function findWater(cells, width, height, kind, rng, avoid = []) {
  const at = (x, y) => cells.get(key(x, y)) ?? DEEP;
  const blocked = new Set(avoid.map((c) => key(c.x, c.y)));
  for (let tries = 0; tries < 400; tries += 1) {
    const x = Math.floor(rng() * width);
    const y = Math.floor(rng() * height);
    if (at(x, y) !== kind || blocked.has(key(x, y))) continue;
    return { x, y };
  }
  return null;
}

// ---------------------------------------------------------------------
// queries
// ---------------------------------------------------------------------

export function cellAt(state, x, y) {
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) return null;
  return state.cells.get(key(x, y)) ?? DEEP;
}

export const isWater = (state, x, y) => {
  const c = cellAt(state, x, y);
  return c === DEEP || c === SHALLOW;
};

export const isSand = (state, x, y) => cellAt(state, x, y) === SAND;

/** True when the ship's own hull covers this cell. */
export function isShipCell(state, x, y) {
  return shipCells(state.ship).some((c) => c.x === x && c.y === y);
}

export function beastAt(state, x, y) {
  return state.beasts.find((b) => b.x === x && b.y === y) ?? null;
}

/** True when this cell carries palm canopy. */
export function hasCanopy(state, x, y) {
  return state.canopy.has(key(x, y));
}

export function cacheAt(state, x, y) {
  return state.caches.find((c) => c.x === x && c.y === y) ?? null;
}

export function propAt(state, x, y) {
  return state.props.find((p) => p.x === x && p.y === y && !p.taken) ?? null;
}

/** How full the hold is, in weight rather than item count. */
export function holdWeight(state) {
  return state.hold.reduce((sum, id) => sum + LOOT[id].weight, 0);
}

/** What the hold is worth if it survives the trip home. */
export function holdValue(state) {
  return state.hold.reduce((sum, id) => sum + LOOT[id].value, 0);
}

/** True when the ship is moored close enough to send a boat ashore. */
export function canLand(state) {
  return shipCells(state.ship).some(({ x, y }) =>
    isSand(state, x, y - 1) || isSand(state, x, y + 1)
    || isSand(state, x - 1, y) || isSand(state, x + 1, y));
}

/** The sand cell a boat would land on, or null. */
export function landingSpot(state) {
  for (const { x, y } of shipCells(state.ship)) {
    for (const { dx, dy } of Object.values(STEP)) {
      if (isSand(state, x + dx, y + dy)) return { x: x + dx, y: y + dy };
    }
  }
  return null;
}

/**
 * True when the ship is close enough to the home cove to land the hold.
 *
 * Measured from any part of the hull, not from the helm cell: a 3x2 ship
 * lying alongside the cove can easily have its helm four cells further
 * out than its bow, and refusing to bank because the wrong end of the
 * ship was measured is the kind of rule players correctly call a bug.
 */
export function atCove(state) {
  return shipCells(state.ship).some(({ x, y }) =>
    Math.abs(x - state.cove.x) <= 3 && Math.abs(y - state.cove.y) <= 3);
}

// ---------------------------------------------------------------------
// result plumbing
// ---------------------------------------------------------------------

function fail(state, message) {
  return { ok: false, state, message };
}

function ok(state, message) {
  return { ok: true, state, message };
}

function spend(state, watches) {
  return { ...state, watches: state.watches - watches };
}

function note(state, line) {
  return { ...state, log: [line, ...state.log].slice(0, 40) };
}

function afford(state, watches) {
  if (state.wrecked) return 'The ship is on the bottom. Start a new voyage.';
  if (state.watches < watches) return 'No daylight left — turn in and start a new day.';
  return null;
}

// ---------------------------------------------------------------------
// sailing
// ---------------------------------------------------------------------

/**
 * Put the helm over one point, port or starboard.
 *
 * A turn is refused when the rotated footprint would sit on land, which
 * is why a 3x2 ship cannot pirouette inside a lagoon — being caught in
 * irons in a tight anchorage is a real and intended predicament.
 */
export function turn(state, direction) {
  if (state.ashore) return fail(state, 'The captain is ashore. Row back first.');
  const blocked = afford(state, COST.turn);
  if (blocked) return fail(state, blocked);

  const i = HEADINGS.indexOf(state.ship.heading);
  const heading = HEADINGS[(i + (direction === 'port' ? 3 : 1)) % 4];
  const next = { ...state.ship, heading };
  for (const { x, y } of shipCells(next)) {
    if (!isWater(state, x, y)) return fail(state, 'No sea room to swing — she would ground.');
  }
  const after = spend({ ...state, ship: next }, COST.turn);
  return ok(after, `Helm over — heading ${COMPASS_LABEL[heading].toLowerCase()}, ${pointOfSail(heading, state.wind)}.`);
}

/**
 * Sail one cell ahead. The only direction a ship moves is forwards; to go
 * anywhere else, turn first — which is what gives the wind rule teeth.
 */
export function sail(state) {
  if (state.ashore) return fail(state, 'The captain is ashore. Walk back to her first.');

  const { dx, dy } = STEP[state.ship.heading];
  const next = { ...state.ship, x: state.ship.x + dx, y: state.ship.y + dy };

  // Look at where she would go before deciding what it costs, because
  // running her ashore is a different act from sailing and is priced as
  // one: the boat does not move, so you are paying to step off, not to
  // make a cable.
  let beach = null;
  for (const { x, y } of shipCells(next)) {
    if (cellAt(state, x, y) === null) return fail(state, 'That is the edge of the chart.');
    const beast = beastAt(state, x, y);
    if (beast) return fail(state, `${beast.label} is in the way. Drive it off first.`);
    if (!isWater(state, x, y) && !beach) beach = { x, y };
  }

  /**
   * Sailing into the beach lands you.
   *
   * Refusing the move — which is what this did — made the shoreline a
   * wall you bounced off, and left `R` as the only way ashore even when
   * the bow was already touching sand. Driving at the beach and stepping
   * off is what anyone tries first, so it is what it does: she stays in
   * the water where she is, and the captain goes over the bow onto the
   * sand ahead. Walking back into her re-boards (see `walk`).
   */
  if (beach) {
    const blocked = afford(state, COST.land);
    if (blocked) return fail(state, blocked);
    return ok(
      spend({ ...state, ashore: beach }, COST.land),
      `Ran her nose up the beach and stepped off at ${beach.x},${beach.y}.`,
    );
  }

  const cost = sailCost(state.ship.heading, state.wind);
  const blocked = afford(state, cost);
  if (blocked) return fail(state, blocked);

  const after = spend({ ...state, ship: next }, cost);
  const trim = pointOfSail(state.ship.heading, state.wind);
  return ok(after, `Made a cable ${COMPASS_LABEL[state.ship.heading].toLowerCase()}, ${trim} — ${cost} ${cost === 1 ? 'watch' : 'watches'}.`);
}

/**
 * Lay into an adjacent beast with whatever the crew has to hand.
 *
 * Always one hit per strike: a random damage roll would make the same
 * voyage play differently on the same seed, and reproducibility is worth
 * more here than variance.
 */
export function strike(state) {
  if (state.ashore) return fail(state, 'The captain is ashore.');
  const blocked = afford(state, COST.strike);
  if (blocked) return fail(state, blocked);

  const reach = new Set();
  for (const { x, y } of shipCells(state.ship)) {
    for (const { dx, dy } of Object.values(STEP)) reach.add(key(x + dx, y + dy));
  }
  const target = state.beasts.find((b) => reach.has(key(b.x, b.y)));
  if (!target) return fail(state, 'Nothing alongside to strike at.');

  const hp = target.hp - 1;
  let next = spend(state, COST.strike);
  if (hp <= 0) {
    next = {
      ...next,
      beasts: next.beasts.filter((b) => b.uid !== target.uid),
      banked: next.banked + target.bounty,
    };
    next = note(next, `Killed the ${target.label.toLowerCase()} — ${target.bounty} on the bounty.`);
    return ok(next, `${target.label} killed. Bounty ${target.bounty}.`);
  }
  next = { ...next, beasts: next.beasts.map((b) => (b.uid === target.uid ? { ...b, hp } : b)) };
  return ok(next, `Struck the ${target.label.toLowerCase()} — ${hp} left in it.`);
}

// ---------------------------------------------------------------------
// ashore
// ---------------------------------------------------------------------

/** Row a boat to the beach, or row it back. */
export function toggleShore(state) {
  const blocked = afford(state, COST.land);
  if (blocked) return fail(state, blocked);

  if (state.ashore) {
    const back = shipCells(state.ship).some(({ x, y }) =>
      Math.abs(x - state.ashore.x) + Math.abs(y - state.ashore.y) === 1);
    if (!back) return fail(state, 'Too far from the ship — walk back to the water first.');
    return ok(spend({ ...state, ashore: null }, COST.land), 'Back aboard.');
  }

  const spot = landingSpot(state);
  if (!spot) return fail(state, 'No beach within reach — bring her closer in.');
  return ok(spend({ ...state, ashore: spot }, COST.land), 'Ashore. Mind the sand.');
}

/** One step on foot. Sand only; the captain does not swim. */
export function walk(state, heading) {
  if (!state.ashore) return fail(state, 'The captain is aboard.');
  const blocked = afford(state, COST.walk);
  if (blocked) return fail(state, blocked);

  const { dx, dy } = STEP[heading];
  const x = state.ashore.x + dx;
  const y = state.ashore.y + dy;
  if (!isSand(state, x, y)) {
    // Walking into the boat is how you get back aboard — the other half
    // of running her ashore under `sail`. It is deliberately the same
    // gesture as walking anywhere else: she is a thing on the map, and
    // you get in by stepping into her.
    if (shipCells(state.ship).some((c) => c.x === x && c.y === y)) {
      return ok(spend({ ...state, ashore: null }, COST.land), 'Back aboard.');
    }
    return fail(state, 'Only sand underfoot — the captain does not swim.');
  }
  return ok(spend({ ...state, ashore: { x, y } }, COST.walk), '');
}

/**
 * Dig where the captain is standing.
 *
 * A miss is not silent: the spadeful reports how close the cache is, in
 * Chebyshev distance, so digging is a search with feedback rather than a
 * lottery over every sand cell on the island.
 */
export function dig(state) {
  if (!state.ashore) return fail(state, 'Nothing to dig at sea.');
  const blocked = afford(state, COST.dig);
  if (blocked) return fail(state, blocked);

  const { x, y } = state.ashore;
  const here = cacheAt(state, x, y);
  if (here && !here.dug) {
    if (holdWeight(state) + LOOT.hoard.weight > holdCapacity(state)) {
      return fail(state, 'The hold is full — bank what you have before you dig this up.');
    }
    let next = spend(state, COST.dig);
    next = {
      ...next,
      caches: next.caches.map((c) => (c === here ? { ...c, dug: true } : c)),
      hold: [...next.hold, 'hoard'],
    };
    next = note(next, `Dug up the hoard at ${x},${y} — worth ${LOOT.hoard.value}.`);
    return ok(next, `The spade rings on iron. A buried hoard, ${LOOT.hoard.value} in it.`);
  }

  const remaining = state.caches.filter((c) => !c.dug);
  if (!remaining.length) return fail(state, 'Every cache on the chart is already up.');

  const nearest = remaining.reduce((best, c) => {
    const d = Math.max(Math.abs(c.x - x), Math.abs(c.y - y));
    return d < best.d ? { c, d } : best;
  }, { c: null, d: Infinity });

  const next = spend(state, COST.dig);
  const d = nearest.d;
  const reading = d <= 1 ? 'The sand is loose here — it is within a pace.'
    : d <= 3 ? 'Warm. Something is buried close by.'
    : d <= 6 ? 'Cool. A cache lies somewhere on this stretch.'
    : 'Nothing but sand for a long way.';
  return ok(next, reading);
}

/** Break open whatever is on this beach cell. */
export function loot(state) {
  if (!state.ashore) return fail(state, 'Nothing to open at sea.');
  const blocked = afford(state, COST.loot);
  if (blocked) return fail(state, blocked);

  const prop = propAt(state, state.ashore.x, state.ashore.y);
  if (!prop || prop.kind !== 'chest') return fail(state, 'Nothing here worth prising open.');
  const item = LOOT[prop.loot];
  if (holdWeight(state) + item.weight > holdCapacity(state)) {
    return fail(state, 'The hold will not take it — sail home and bank first.');
  }

  let next = spend(state, COST.loot);
  next = {
    ...next,
    props: next.props.map((p) => (p === prop ? { ...p, taken: true, sprite: LOOT.chest.sprite } : p)),
    hold: [...next.hold, prop.loot],
  };
  return ok(next, `${item.label} — ${item.value} aboard.`);
}

// ---------------------------------------------------------------------
// the cove
// ---------------------------------------------------------------------

/**
 * Bank the hold and refit.
 *
 * This is the only place loot becomes score and the only place the hull
 * comes back, which is what makes the run home matter: a full hold and a
 * holed ship is exactly when the crossing is most dangerous.
 */
export function bank(state) {
  if (state.ashore) return fail(state, 'Get back aboard and bring her into the cove.');
  if (!atCove(state)) return fail(state, 'Not in the cove — the hoard goes ashore at home.');
  const full = hullMax(state);
  if (!state.hold.length && state.hull === full) {
    return fail(state, 'Nothing to land and nothing to mend.');
  }

  const value = holdValue(state);
  const mended = full - state.hull;
  let next = { ...state, hold: [], banked: state.banked + value, hull: full };
  const parts = [];
  if (value) parts.push(`Landed ${value} in the cove`);
  if (mended) parts.push(`${mended} hull mended`);
  next = note(next, parts.join(' · ') + '.');
  return ok(next, parts.join(' · ') + '.');
}

// ---------------------------------------------------------------------
// the turn of the day
// ---------------------------------------------------------------------

/**
 * Move every beast one step and let anything alongside the ship bite.
 *
 * Beasts home in on the ship rather than wandering: a wandering beast is
 * scenery, and the point of the deep water is that crossing it should
 * feel like being hunted.
 */
function moveBeasts(state, rng) {
  const hull = shipCells(state.ship);
  const occupied = new Set(hull.map((c) => key(c.x, c.y)));
  let hull_damage = 0;
  const bites = [];

  const beasts = state.beasts.map((beast) => {
    const adjacent = hull.some((c) =>
      Math.abs(c.x - beast.x) + Math.abs(c.y - beast.y) === 1);
    if (adjacent) {
      if (beast.bite > 0) {
        hull_damage += beast.bite;
        bites.push(`${beast.label} takes a strake off her — ${beast.bite} hull.`);
      }
      return beast;
    }

    // Step toward the nearest hull cell along whichever axis is further.
    const target = hull.reduce((best, c) => {
      const d = Math.abs(c.x - beast.x) + Math.abs(c.y - beast.y);
      return d < best.d ? { c, d } : best;
    }, { c: hull[0], d: Infinity }).c;

    const dx = Math.sign(target.x - beast.x);
    const dy = Math.sign(target.y - beast.y);
    const tries = Math.abs(target.x - beast.x) > Math.abs(target.y - beast.y)
      ? [{ dx, dy: 0 }, { dx: 0, dy }]
      : [{ dx: 0, dy }, { dx, dy: 0 }];
    // A random third option keeps a beast from stalling forever against a
    // headland when both preferred steps are blocked.
    tries.push({ dx: Math.sign(rng() - 0.5), dy: 0 });

    for (const t of tries) {
      const nx = beast.x + t.dx;
      const ny = beast.y + t.dy;
      if (nx === beast.x && ny === beast.y) continue;
      if (occupied.has(key(nx, ny))) continue;
      if (cellAt(state, nx, ny) !== beast.water) continue;
      if (state.beasts.some((o) => o !== beast && o.x === nx && o.y === ny)) continue;
      return { ...beast, x: nx, y: ny };
    }
    return beast;
  });

  return { beasts, hull_damage, bites };
}

/**
 * End the day: the beasts get their turn, the wind backs or veers, and
 * the watch glass is turned.
 *
 * Returns `{ state, report }` rather than a plain state, because the UI
 * wants to narrate what happened overnight and reconstructing it from a
 * state diff would be worse than being told.
 */
export function endDay(state, rng = makeRng(state.day * 7919)) {
  if (state.wrecked) return { state, report: { wrecked: true } };

  const { beasts, hull_damage, bites } = moveBeasts(state, rng);
  const hull = Math.max(0, state.hull - hull_damage);
  const wrecked = hull === 0;

  // The wind backs one point either way, or holds. It never jumps 180°:
  // a route planned yesterday should still be roughly sailable today.
  const shift = rng();
  const i = HEADINGS.indexOf(state.wind);
  const wind = shift < 0.3 ? HEADINGS[(i + 3) % 4]
    : shift < 0.6 ? HEADINGS[(i + 1) % 4]
    : state.wind;

  const lines = [...bites];
  if (wrecked) lines.push('She is holed and going down. The hold goes with her.');
  else if (wind !== state.wind) lines.push(`The wind has gone round to the ${COMPASS_LABEL[wind].toLowerCase()}.`);

  let next = {
    ...state,
    beasts,
    hull,
    wrecked,
    wind,
    day: state.day + 1,
    watches: WATCHES_PER_DAY,
    // A wreck takes the hold down with it. Banked loot is banked.
    hold: wrecked ? [] : state.hold,
    ashore: wrecked ? null : state.ashore,
  };
  next = {
    ...next,
    log: [`Day ${next.day} — ${lines.length ? lines.join(' ') : 'a quiet night.'}`, ...next.log].slice(0, 40),
  };

  return { state: next, report: { hullLost: hull_damage, wind, wrecked, bites } };
}

// ---------------------------------------------------------------------
// presentation helpers
// ---------------------------------------------------------------------

/**
 * A stable deck plank for a cell.
 *
 * Two things matter here. The planks run fore-and-aft, so the
 * orientation follows the heading — turning the ship re-planks the deck,
 * the same way it re-resolves the rail. And the variant is keyed on the
 * cell's position WITHIN the ship rather than its position in the world,
 * so the planking does not reshuffle every time she moves; a deck that
 * flickers as you sail is worse than a plain one.
 */
export function deckSprite(index, heading = 'n') {
  const orientation = heading === 'n' || heading === 's' ? 'ns' : 'we';
  return `ship deck ${orientation} ${'abc'[index % 3]}`;
}

/** The water sprite for a cell. */
export function waterSprite(state, x, y) {
  return cellAt(state, x, y) === SHALLOW ? SHALLOW_SPRITE : DEEP_SPRITE;
}

/** What Space would do right now, and what to call it in the HUD. */
export function primaryAction(state) {
  if (state.wrecked) return { action: 'none', label: 'Wrecked' };
  if (state.ashore) {
    const prop = propAt(state, state.ashore.x, state.ashore.y);
    if (prop && prop.kind === 'chest') return { action: 'loot', label: 'Prise open the chest' };
    return { action: 'dig', label: 'Dig here' };
  }
  const reach = new Set();
  for (const { x, y } of shipCells(state.ship)) {
    for (const { dx, dy } of Object.values(STEP)) reach.add(key(x + dx, y + dy));
  }
  if (state.beasts.some((b) => reach.has(key(b.x, b.y)))) {
    return { action: 'strike', label: 'Strike at it' };
  }
  if (atCove(state) && (state.hold.length || state.hull < hullMax(state))) {
    return { action: 'bank', label: 'Land the hoard' };
  }
  if (canLand(state)) return { action: 'land', label: 'Row ashore' };
  return { action: 'none', label: 'Nothing alongside' };
}

/** Dispatch whatever `primaryAction` named. */
export function act(state) {
  const { action } = primaryAction(state);
  switch (action) {
    case 'loot': return loot(state);
    case 'dig': return dig(state);
    case 'strike': return strike(state);
    case 'bank': return bank(state);
    case 'land': return toggleShore(state);
    default: return fail(state, 'Nothing to do from here.');
  }
}
