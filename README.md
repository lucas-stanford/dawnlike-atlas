# DawnLike Semantic Atlas

A bin-packed **mega-atlas** and rich metadata for the [DawnLike](https://dragondeplatino.itch.io/dawnlike) roguelike tileset, plus a React/Storybook playground of working examples: semantic name lookup, 16-way autotiling, procedural zone generators, a tactical-combat toolkit, and Phaser integration.

Tiles are 32×32 — a strict nearest-neighbour 2× upscale of the original 16×16 art, so every source pixel is preserved as a clean 2×2 block.

**🔗 Live demo:** https://lucas-stanford.github.io/dawnlike-atlas/

```bash
npm install dawnlike-atlas    # or: bun add dawnlike-atlas
```

```jsx
import { useAtlas, AtlasSprite } from 'dawnlike-atlas';

function Wizard() {
  const { atlas, loading } = useAtlas('/atlas/DawnlikeAtlas.json');
  if (loading) return null;
  return <AtlasSprite atlas={atlas} name="wizard" scale={3} animated />;
}
```

---

## Contents

| Path | What's in it |
| --- | --- |
| `atlas/DawnlikeAtlas0.png` | Primary frames — 4,456 sprites, 2048×2240 |
| `atlas/DawnlikeAtlas1.png` | Alternate frames for the 1,258 animated sprites |
| `atlas/DawnlikeAtlas.json` | `byName` lookup, Phaser `frames`, AI-generated tags |
| `src/utils/atlasApi.js` | Framework-agnostic helpers over the atlas JSON |
| `src/utils/autotile.js` | The six autotile resolvers + their manifests |
| `src/utils/tactical/` | XCOM-style AP / LOS / cover / combat toolkit |
| `src/utils/farm.js` | Farming-sim rules engine — crops, watering, day cycle, economy |
| `src/*Example.jsx` | The example components |
| `src/phaser/` | A complete Phaser 4 roguelike |
| `stories/` | Storybook stories wrapping each example |
| `tests/` | Unit tests — atlas integrity, resolvers, API, tactical |

## Key features

- **Semantic lookup.** Sprites are keyed by human-readable names: `"fighting fish"`, `"bright brick wall left right down"`, `"luminous mushroom"`.
- **AI-generated tags.** 3,700+ sprites tagged with descriptive keywords (`creature`, `metallic`, `glowing`, `aquatic`, …) so you can search the pack by intent rather than by filename.
- **Six autotile resolvers.** Cardinal- and 8-way neighbour resolvers for walls, floors, rivers, pools, forest canopies and mountains, each with a fallback chain so a family missing a variant degrades instead of rendering a hole.
- **Two-frame animation.** Every animated sprite occupies the same coordinates on both sheets; flip between them for DawnLike's signature idle.

---

## The atlas API

`dawnlike-atlas/atlas-api` (also re-exported from the package root) is plain
JavaScript over the parsed JSON — no React, no DOM, no bundler assumptions. It
works in a Node script, a Web Worker, or a `<script type="module">` tag.

```js
import {
  loadAtlas, getSprite, searchSprites, tagIndex,
  spriteStyle, drawSprite, pickSprite, autotileFamilies,
} from 'dawnlike-atlas/atlas-api';

const atlas = await loadAtlas('/atlas/DawnlikeAtlas.json');
```

| Function | Purpose |
| --- | --- |
| `loadAtlas(url)` | Fetch + cache the JSON. Concurrent callers share one request. |
| `getSprite(atlas, name)` | `{ x, y, w, h, tags, isAnimated }` or `null`. |
| `hasSprite` / `isAnimated` | Existence and animation predicates. |
| `searchSprites(atlas, opts)` | Search by name words, tags, prefix, animation state. |
| `tagIndex(atlas)` | Every tag with its sprite count, most common first. |
| `spritesByTag(atlas, tag)` | Names carrying a tag. |
| `autotileFamilies(atlas, suffixes, min)` | Discover autotile base names present in the pack. |
| `spriteCell` / `nameAtIndex` | Convert between a sprite and its packed-grid index. |
| `spriteStyle(atlas, name, opts)` | A CSS-in-JS bag that renders the sprite. |
| `drawSprite(ctx, sheet, atlas, name, x, y, scale)` | Blit to a 2D canvas. |
| `pickSprite(atlas, candidates, rng)` | Random pick, filtered to names that exist. |
| `animationFrames(atlas, name)` | The 1- or 2-frame sequence with its sheets. |

Full TypeScript definitions ship alongside (`src/utils/atlasApi.d.ts`).

### Searching

Every word in `query` must appear somewhere in the name *or* the tags, in any
order — so `"brick wall"` finds `"bright brick wall left right"`, and
`"glowing sword"` finds a sword tagged `glowing`.

```js
searchSprites(atlas, { query: 'rat' });                     // by name or tag
searchSprites(atlas, { tags: ['creature', 'aquatic'] });    // must have both
searchSprites(atlas, { tags: ['undead'], tagMode: 'any' }); // any of them
searchSprites(atlas, { animated: true, limit: 20 });        // 2-frame sprites
searchSprites(atlas, { prefix: 'bright brick wall' });      // one family
```

### React components

```jsx
import {
  useAtlas,       // load the atlas once, share it everywhere
  AtlasSprite,    // one sprite, addressed by name
  AtlasTileMap,   // a 2D grid of names (or layer stacks)
  Sprite,         // generic frame-indexed sprite, any spritesheet
  AnimatedSprite, // cycle arbitrary frame indices
  NineSlicePanel, // resizable pixel-art panel
  PixelButton,
  HealthBar, ManaBar, DawnLikeIcon,
} from 'dawnlike-atlas';
```

`<AtlasTileMap>` takes a row-major grid where each cell is a name, an array of
names drawn as layers, or `null`:

```jsx
<AtlasTileMap atlas={atlas} scale={2} tiles={[
  ['dark brick wall left right', 'dark brick wall left right'],
  ['dusk brick floor c',         ['dusk brick floor c', 'wizard']],
]} />
```

### Raw usage, no framework

```js
const { x, y } = atlas.byName['wizard'];
el.style.backgroundImage = 'url(DawnlikeAtlas0.png)';
el.style.backgroundPosition = `-${x}px -${y}px`;
el.style.imageRendering = 'pixelated';
```

### Phaser 3 / 4

The JSON doubles as a Phaser texture atlas, so sprites are addressable by name
straight out of the loader:

```js
// preload
this.load.atlas('dawnlike',  'DawnlikeAtlas0.png', 'DawnlikeAtlas.json');
this.load.atlas('dawnlike1', 'DawnlikeAtlas1.png', 'DawnlikeAtlas.json');

// create
this.add.sprite(x, y, 'dawnlike', 'wizard');

this.anims.create({
  key: 'wizard-walk',
  frames: [
    { key: 'dawnlike',  frame: 'wizard' },
    { key: 'dawnlike1', frame: 'wizard' },
  ],
  frameRate: 2,
  repeat: -1,
});
```

---

## Semantic autotiling

DawnLike names autotile variants as `"<family> <suffix>"`. Each resolver takes
the family, a neighbour truth table, and `atlas.byName` (so it can check which
variants the pack actually has and fall back when one is missing).

```js
import { resolveDawnLikeBuildingWallName } from 'dawnlike-atlas/autotile';

resolveDawnLikeBuildingWallName(
  'bright brick wall',
  { n: true, s: true, e: false, w: true },
  atlas.byName,
);
// → 'bright brick wall left up down'
```

| Resolver | Family | Neighbours | Notes |
| --- | --- | --- | --- |
| `resolveDawnLikeBuildingWallName` | Objects/Wall walls | 4-way | Suffix order `left right up down`; isolated → `center` |
| `resolveDawnLikeDungeonWallName` | Objects/Wall walls | via `isWall(x,y)` | Returns `null` for buried rock; handles cave/corridor geometry |
| `resolveDawnLikeWallName` / `…RiverName` | Rivers, roads, castle walls | 4-way | Suffix order `up down left right`; vertical T's are E/W-inverted |
| `resolveDawnLikeFloorName` | Floors | 4-way | Variants named by the neighbours that are **missing** |
| `resolveDawnLikePoolName` | Pools, water | 4-way | May return `flipY` — apply `transform: scaleY(-1)` |
| `resolveDawnLikeForestName` | Tree canopies | 8-way | A corner curves away unless its diagonal *and* both cardinals are trees |
| `resolveDawnLikeMountainName` | Peaks, snowcaps, volcanoes | 4-way | Blob set: the suffix names the **edge** the tile sits on |
| `resolveDawnLikeShoreName` | Coastlines (`* shore`) | 8-way | **Generated, not original DawnLike.** Transparent where the water goes; the only family with inner-corner pieces |

The gotcha worth internalising: these families do not agree on suffix ordering.
A north-east corner is `right up` on the wall sheet but `up right` on the map
sheet. Use the matching resolver rather than string-building names yourself.

**The [Autotile Lab](https://lucas-stanford.github.io/dawnlike-atlas/?path=/story/dawnlike-autotile-lab--lab)
is the fastest way to understand any of this** — toggle neighbours, browse a
family's whole variant sheet, or paint a shape and watch it tile live.

### Coastlines

DawnLike ships **no shore art**, and the two obvious substitutes fight each
other: the pool families draw a dark blue rocky rim (they are meant for a pool
set into a dungeon floor) and the floor families draw their own pale rim, so a
sand tile beside a water tile gives you two competing borders.

`scripts/generate-shore.mjs` draws a proper set. Each tile carries the whole
land → water transition inside one cell and is **transparent where the water
goes**, so you paint a flat water tile underneath and it shows through — one
shore set therefore works over clear water, toxic water, or lava.

```js
import { resolveDawnLikeShoreName } from 'dawnlike-atlas/autotile';

// Flags mean "this neighbour is more LAND" — the same predicate you would
// hand resolveDawnLikeFloorName.
resolveDawnLikeShoreName('sand shore', {
  n: isLand(x, y - 1),      s:  isLand(x, y + 1),
  w: isLand(x - 1, y),      e:  isLand(x + 1, y),
  nw: isLand(x - 1, y - 1), ne: isLand(x + 1, y - 1),
  sw: isLand(x - 1, y + 1), se: isLand(x + 1, y + 1),
}, atlas.byName);
// → { name: 'sand shore n dse', reason: 'Shore: water n · cut se' }
```

Five families — `sand shore`, `grass shore`, `snow shore`, `mud shore`,
`ash shore` — each a full **47-tile blob set**.

A tile's look depends on all 8 neighbours, which is 2⁸ = 256 configurations, but
most collapse: a diagonal only matters when both of its flanking cardinals are
land, because otherwise that cardinal's water band has already cut the corner
away. Collapsing on that rule leaves exactly 47 distinct tiles — so a coastline
is correct at every angle, including diagonal spits and inlets.

The suffix is the water cardinals (n-s-w-e order), then one `d<corner>` token per
corner cut by a water diagonal:

| Suffix | Meaning |
| --- | --- |
| `c` | no water at all |
| `n` | water to the north |
| `nw` | water north **and** west (cardinals, not a corner) |
| `dnw` | all cardinals land, NW diagonal is water |
| `n dse` | water north, and the SE diagonal too |
| `dnw dne dsw dse` | all cardinals land, every diagonal water |

The art is authored at 16×16 and upscaled 2× like the rest of the pack, using
only the DawnBringer 16 palette, and is 2-frame animated so the surf tracks
DawnLike's animated water. Regenerate or restyle it with:

```bash
node scripts/generate-shore.mjs           # preview PNG only
node scripts/generate-shore.mjs --apply   # write into the atlas
```

See [Island](https://lucas-stanford.github.io/dawnlike-atlas/?path=/story/dawnlike-zone-examples-island--island)
for them in use.

### Watered soil, and the daylight tint as a mechanic

DawnLike draws each floor family in **four daylight tints** — `morning`, `day`,
`dusk`, `night` — and they are palette rotations, not lighting passes. That
makes the time of day a *sprite family swap* rather than a CSS filter, so you can
re-tint a whole map and every pixel stays on the DawnBringer 16 palette:

```js
// The only thing that changes is the family name.
const phase = 'dusk';                         // morning | day | dusk | night
resolveDawnLikeFloorName(`${phase} grass floor`, neighbours, atlas.byName);
```

`plowed field` ships in all four tints too, which covers tilled earth — but there
is no **wet** variant, and watering is the mechanic a farming game is built
around. `scripts/generate-watered-field.mjs` derives a `<tint> watered field`
family from the plowed field by remapping its palette, so wet and dry soil share
pixel-identical furrows and only the colour distinguishes them.

The remap is a small explicit table rather than a formula, and that is the
interesting part. "Just darken it" produces `day plowed field` when applied to
morning, and produces *nothing at all* at night, where the tile has already
bottomed out at navy and black — an automatic blend-toward-navy pass was tried
first and collapsed exactly there. What reads as wet across all four tints is a
hue move: **replace the warm highlight with a cool sheen and deepen the shadow**.
At night, with no room left to darken, the rule inverts and the sheen brightens
to blue — moonlight on standing water.

```bash
node scripts/generate-watered-field.mjs           # preview PNG only
node scripts/generate-watered-field.mjs --apply   # write into the atlas
```

Both generators are additive and idempotent: existing sprites never move, and
re-running rewrites the generated tiles in the cells they already occupy.

See [Farm](https://lucas-stanford.github.io/dawnlike-atlas/?path=/story/dawnlike-games-and-systems-farm--playable)
for the whole thing driving a game loop.

---

## Examples

Every example is browsable from the Storybook sidebar, and each one is a single
self-contained component under `src/`.

### Tools

| Story | Source | What it shows |
| --- | --- | --- |
| **Autotile Lab** | `src/AutotileLabExample.jsx` | Interactive playground for all six resolvers: neighbour pad, full variant sheet, and a live paint canvas. |
| **Sprite Browser** | `src/SpriteBrowserExample.jsx` | Search all 4,456 sprites by name and tag, inspect any record, copy React/CSS/Phaser snippets. |
| **Mega Atlas** | `src/components/SpriteSheet.jsx` | The packed sheet itself, in its 64×70 grid, with hover names and animation toggle. |
| **Components** | `src/ComponentsExample.jsx` | Live gallery of every component the npm package exports, each with the props beside it — plus a HUD built only from GUI sprites inside the mega-atlas. |

### Zone generators

| Story | Source | What it shows |
| --- | --- | --- |
| **Dungeon** | `src/DungeonExample.jsx` | Six rot.js map algorithms, autotiled with the dungeon wall resolver. |
| **Cave** | `src/CaveExample.jsx` | Cellular-automata caverns, largest-region flood fill, distance-transform lakes. |
| **Wilderness** | `src/OutdoorExample.jsx` | Simplex biomes, a meandering road and river, with a bridge where they cross. |
| **Island** | `src/IslandExample.jsx` | Radial-falloff landmass — pool, floor, forest and mountain resolvers on one map. |
| **Town** | `src/TownExample.jsx` | Buildings, NPCs, furniture, signs and scattered flowers. |
| **Sewer** | `src/SewerExample.jsx` | A central sludge channel with brick walkways and crossing bridges. |
| **Arena** | `src/ArenaExample.jsx` | A combat arena layout. |

Each zone example is deterministic in its `seed` and exposes its generator knobs
through the Storybook **Controls** panel, so you can dial in a look before
lifting the generator into your own project.

### Games and systems

| Story | Source | What it shows |
| --- | --- | --- |
| **Phaser Roguelike** | `src/phaser/` | An explorable overworld + town + 3-level dungeon on [Phaser 4](https://phaser.io/), with working exits, a chrome HUD, hold-to-walk movement, sprite animation, and `localStorage` save/resume keyed off one seed. |
| **Farm** | `src/FarmExample.jsx` + `src/utils/farm.js` | A complete farming loop — till, sow, water, harvest, sell — with livestock, an orchard and a stamina-driven day cycle that re-tints the whole map through the four daylight sprite families. Rules are a pure state machine with no React or atlas dependency. |
| **Tactical Combat** | `src/TacticalCombatExample.jsx` | XCOM-style squad tactics on `src/utils/tactical/` — action points, fog of war, cover, flanking, overwatch. |
| **Arena Combat** | `src/ArenaCombatExample.jsx` | Real-time arena fighting with movable, collapsible HUD panels. |
| **Menu HUD** | `src/MenuExample.jsx` | Inventory, equipment and dialogue built from the GUI sprites. |
| **Character Gallery** | `src/CharacterGallery.jsx` | AI-generated portrait and JRPG-style sprite variants. |

### The farming toolkit

`src/utils/farm.js` is the rules engine behind the Farm example — a pure state
machine with no React, no DOM and no atlas dependency, published as
`dawnlike-atlas/utils/farm`:

```js
import {
  createFarm, act, actionFor,   // build a farm, decide and apply the next action
  advanceDay,                   // crops drink, grow, ripen, wither; soil goes to weed
  soilFamily, cropSprite,       // sprite names for the current tile state
  dayPhase,                     // 'morning' | 'day' | 'dusk' | 'night', from stamina
  CROPS, sellStock, stockValue, // the catalogue and the economy
} from 'dawnlike-atlas/utils/farm';

let farm = createFarm({ width: 22, height: 16, rng: ROT.RNG.getUniform });
farm = act(farm, x, y, { farmerX, farmerY, selectedCrop: 'turnip' }).state;
farm = advanceDay(farm).state;
```

Every action returns `{ ok, state, message }` and a failed action returns the
**same state reference**, so React can skip the re-render. Two of DawnLike's
quirks shaped the design and both became mechanics: crops have exactly two drawn
stages, so growth *time* varies per crop instead of inventing intermediate art;
and the four daylight tints are driven by the farmer's remaining stamina, so the
working day visibly runs out.

### The tactical toolkit

`src/utils/tactical/` is framework-agnostic and published separately at
`dawnlike-atlas/utils/tactical`:

```js
import {
  resetAP, spendAP,          // action points
  reachableTiles, previewPath, // movement
  visibleSet, losBetween,      // line of sight (rot.js shadowcasting)
  coverBetween, isFlanking,    // per-axis cover + flanking
  hitChance, resolveAttack,    // combat math
  planTurn,                    // enemy AI
} from 'dawnlike-atlas/utils/tactical';
```

All RNG runs through `rot-js`, so seeding `ROT.RNG` makes a whole mission
deterministic.

---

## LLM prompts

[`Example_LLM_Prompts/game-template.md`](./Example_LLM_Prompts/game-template.md)
is a single self-contained prompt you can hand to an LLM to **build any 2D
browser game** on top of this repo. Drop your game idea into the `<<<…>>>` slot;
the model gets the atlas, generators, autotile helpers and reference examples,
all linked by raw GitHub URL.

It is also available inside Storybook under **Dawnlike › Prompts**, with a
starter-pitch dropdown, per-section toggles, and a one-click copy button. See
[`Example_LLM_Prompts/README.md`](./Example_LLM_Prompts/README.md) for the
section layout and authoring conventions.

---

## Local development

```bash
bun install
bun run dev              # Storybook on http://localhost:6006
bun run test             # unit tests (fast, no browser)
bun run test:watch
bun run test:coverage
bun run check-package    # verify every export path is packed
bun run build-storybook
```

The test suite covers atlas integrity (placement, collisions, lookup-table
agreement), all six autotile resolvers, the atlas API, and the tactical toolkit.
The resolver tests assert **totality**: every neighbour pattern for every family
the examples offer must resolve to a sprite the atlas actually contains, so a
repack that drops a variant fails CI instead of shipping a hole in someone's map.

> **Note:** `bun run test:storybook` runs each story as a headless browser smoke
> test, but `@storybook/addon-vitest` needs a Storybook major matching the
> installed one. This repo pins Storybook 8.6, so that project lives in its own
> `vitest.storybook.config.ts` and is not part of the default run.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to add an example, a resolver,
or a zone generator.

## Credits and licence

Sprite assets by **DragonDePlatino** and **DawnBringer** —
[DawnLike on itch.io](https://dragondeplatino.itch.io/dawnlike), released under
[CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/). Atlas packing,
metadata, tooling and examples are layered on top and released under the same
licence. See [LICENSE](./LICENSE) for the attribution you need to carry.
