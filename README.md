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

## Install

```bash
npm install dawnlike-atlas
# or: bun add dawnlike-atlas
```

Import the atlas + React sprite components from the package root, and the raw atlas assets from their subpaths:

```js
import { Sprite, AnimatedSprite } from 'dawnlike-atlas';
import atlas from 'dawnlike-atlas/atlas/DawnlikeAtlas.json';
import { resolveDawnLikeWallName } from 'dawnlike-atlas/autotile';

// The two atlas PNGs are also published — point your bundler at them:
//   dawnlike-atlas/atlas/DawnlikeAtlas0.png
//   dawnlike-atlas/atlas/DawnlikeAtlas1.png
```

## Getting Started (local dev)

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

