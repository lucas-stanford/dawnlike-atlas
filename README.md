# DawnLike Semantic Atlas

A bin-packed **mega-atlas** and rich metadata for the [DawnLike](https://dragondeplatino.itch.io/dawnlike) 16×16 roguelike tileset, plus a small React/Storybook playground that demonstrates semantic lookup, 16-way autotiling, and integration with rendering libraries.

**🔗 Live demo:** https://lucas-stanford.github.io/dawnlike-atlas/

## Contents

- `atlas/`
  - `DawnlikeAtlas0.png` — primary frames (4,157 sprites)
  - `DawnlikeAtlas1.png` — alt frames for the 2,226 animated sprites
  - `DawnlikeAtlas.json` — `byName` lookup + AI-generated tags + semantic connections
- `src/` — autotile resolvers (`src/utils/autotile.js`) and the example components
- `react/` — re-exports for consuming the atlas from a React project
- `stories/` — Storybook stories that render the examples

## Key Features

- **Semantic lookup**: assets keyed by human-readable names (`"fighting fish"`, `"bright brick wall left right down"`).
- **AI-generated tags**: 3,700+ sprites tagged with descriptive keywords (`creature`, `metallic`, `glowing`, …).
- **16-way autotiling**: cardinal-neighbor resolvers for walls, floors, rivers, pools, and forest canopies.

## Getting Started

The hosted Storybook is available at https://lucas-stanford.github.io/dawnlike-atlas/.
To run it locally:

```bash
bun install
bun run dev          # launches Storybook on http://localhost:6006
```

## Examples

All examples live in `stories/` and are browsable from the Storybook sidebar.

### DawnLike › Mega Atlas › All Sprites
`stories/MegaAtlas.stories.jsx` → `src/components/SpriteSheet`

Renders every named sprite from `DawnlikeAtlas0.png` in its bin-packed 64×65 grid. Toggle animation to flip in `DawnlikeAtlas1.png` for the animated sprites; hover any cell to read its name from the atlas lookup. Use this to browse what's available before reaching for it by name.

### Examples › Autotile (rot.js)
`stories/Autotile.stories.jsx` → `src/AutotileExample.jsx`

A dungeon generator built on [rot.js](https://github.com/ondras/rot.js). Pick from six map algorithms (Digger, Uniform, Cellular, Divided / Icey / Eller mazes) and a wall style; walls are autotiled via `resolveDawnLikeWallName`. Demonstrates how to feed `{ n, s, e, w }` neighbor flags into the resolver to get the correct sprite name back.

### Examples › Outdoor Wilderness
`stories/Outdoor.stories.jsx` → `src/OutdoorExample.jsx`

A procedurally-generated overworld using simplex noise for biomes, a meandering road, and a single-line meandering river that drops a bridge where it crosses the road. The floating gear panel lets you swap terrain, dirt patch, path, river, and tree styles independently; the selected ground terrain renders under forests, roads, and rivers. Shows off `resolveDawnLikeFloorName`, `resolveDawnLikeRiverName`, and `resolveDawnLikeForestName` working together.

### Examples › Phaser Roguelike
`stories/PhaserExample.stories.jsx` → `src/PhaserExample.jsx` → `src/phaser/`

A small explorable roguelike built on [Phaser 4](https://phaser.io/): an overworld + a town + a 3-level dungeon, wired up with working bidirectional exits, a chrome-framed HUD that sits in its own band above the play area, hold-to-walk movement, sprite animations driven off `DawnlikeAtlas0.png` ↔ `DawnlikeAtlas1.png`, and `localStorage` save/resume keyed off a single seed (reload → same world, same spot). All game code lives under `src/phaser/`. Use this as a starting point for integrating the atlas into a Phaser game.

## LLM Prompts

The [`Example_LLM_Prompts/`](./Example_LLM_Prompts/) directory contains self-contained prompts you can hand to an LLM (Claude, GPT-4, Copilot, …) to **recreate working examples** from this repo in your own project. Each prompt links every file it needs by raw/blob GitHub URL so the model can pull the source itself.

Currently available:

- [`simple-roguelike.md`](./Example_LLM_Prompts/simple-roguelike.md) — recreate the Phaser Roguelike described above.

## Roguelike Toolkit (npm package subpaths)

The repo also ships a **manifest-driven roguelike toolkit** as importable
subpaths of the same `dawnlike-atlas` package, so you can drop the
overworld / town / dungeon generators into your own game without copying
files. Every builder takes a single `manifest` object that controls
density, sizes, biome thresholds, dungeon dig percentage, etc.

### Subpaths

| Import                                       | What you get                                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `dawnlike-atlas/roguelike/generators`        | `generateWorld`, `generateTown`, `generateDungeon` + `DEFAULT_*_MANIFEST` constants (no Phaser dep) |
| `dawnlike-atlas/roguelike/autotile`          | `renderWorldTile`, `renderTownTile`, `renderDungeonTile` + the underlying `resolveDawnLike*` resolvers |
| `dawnlike-atlas/roguelike/phaser`            | `createGame(parent, opts)` + all scene classes (`MapScene`, `WorldScene`, …) for Phaser 3/4   |
| `dawnlike-atlas/roguelike/save`              | localStorage helpers: `load`, `save`, `reset`, `seedFor`, `SAVE_KEY`, `SCENE_KEYS`            |
| `dawnlike-atlas/atlas/DawnlikeAtlas.json`    | The atlas JSON (frames, tags, semantic connections)                                           |
| `dawnlike-atlas/atlas/DawnlikeAtlas{0,1}.png`| The two atlas sheets                                                                          |

Repo files: [`roguelike/`](./roguelike), [`src/phaser/`](./src/phaser),
[`src/utils/autotile.js`](./src/utils/autotile.js).

### Pure-data generators with manifests

```js
import {
  generateWorld,
  generateTown,
  generateDungeon,
  DEFAULT_WORLD_MANIFEST,
} from 'dawnlike-atlas/roguelike/generators';

// All manifest fields are optional — omit the manifest entirely to use
// every default.
const world = generateWorld({
  seed: 12345,
  width: 60, height: 40,
  elevationThreshold: 0.3,   // lower → more forest/mountain
  decorChance: 0.06,
});

const town = generateTown({
  seed: 12346,
  plazaSize: 8,
  buildingCount: { min: 6, max: 9 },
  treeDensity: 0.12,
});

const dungeon = generateDungeon({
  seed: 12347,
  level: 1,
  bottomLevel: 5,            // 5-level dungeon
  roomWidth: [4, 8],
  dugPercentage: 0.4,
});

// Each returns: { width, height, tiles, markers, walkable(x,y), manifest }.
```

Direct repo links to the generator sources (each documents every
manifest field via JSDoc at the top of the file):

- [`src/phaser/generators/world.js`](./src/phaser/generators/world.js)
- [`src/phaser/generators/town.js`](./src/phaser/generators/town.js)
- [`src/phaser/generators/dungeon.js`](./src/phaser/generators/dungeon.js)

### Render with the autotile resolvers

```js
import { renderWorldTile } from 'dawnlike-atlas/roguelike/autotile';
import atlas from 'dawnlike-atlas/atlas/DawnlikeAtlas.json';

const styles = {
  grass: 'day grass floor',
  dirt:  'day dirt floor',
  road:  'dirt trail',
  river: 'clear river',
  tree:  'light oak',
  mountain: 'brown peak',
};

for (let y = 0; y < world.height; y++) {
  for (let x = 0; x < world.width; x++) {
    const layers = renderWorldTile(world.tiles, x, y, styles, atlas.byName);
    // layers: [{ name: 'day grass floor c', z: -1 }, ...]
    for (const layer of layers) {
      myEngine.drawSprite(x, y, layer.name, layer.z);
    }
  }
}
```

### Drop-in Phaser game

```js
import { createGame } from 'dawnlike-atlas/roguelike/phaser';

const game = createGame(document.getElementById('host'), {
  width: 800,
  height: 696,
  manifests: {
    world:   { decorChance: 0.06 },
    town:    { buildingCount: { min: 6, max: 8 } },
    dungeon: { dugPercentage: 0.4 },
  },
  // Optional: tell the BootScene where to load the atlas from. Defaults
  // assume the storybook layout; if you bundle the atlas as static
  // assets, point these at the right URLs.
  atlasPaths: {
    json:   '/static/DawnlikeAtlas.json',
    atlas0: '/static/DawnlikeAtlas0.png',
    atlas1: '/static/DawnlikeAtlas1.png',
  },
});
```

The same Phaser package exports every scene class so you can subclass
and customize: `BootScene`, `MapScene`, `WorldScene`, `TownScene`,
`DungeonScene`, `UIScene`, plus `HUD_HEIGHT`.

## Semantic Autotiling

```javascript
import { resolveDawnLikeWallName } from './src/utils/autotile';

// Build the correct sprite name from cardinal neighbors
const { name } = resolveDawnLikeWallName(
  "bright brick wall",
  { n: true, s: true, e: false, w: true },
  atlas.byName,
);
// → "bright brick wall left right down"
```

Other resolvers in the same module: `resolveDawnLikeFloorName`, `resolveDawnLikeRiverName`, `resolveDawnLikePoolName`, `resolveDawnLikeForestName`.

## Credits

Sprite assets by **DragonDePlatino** and **DawnBringer** — [DawnLike on itch.io](https://dragondeplatino.itch.io/dawnlike) (CC-BY 4.0). Atlas packing, metadata, and semantic tooling layered on top.

