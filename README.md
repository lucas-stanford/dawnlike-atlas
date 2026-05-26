# DawnLike Semantic Atlas

A bin-packed **mega-atlas** and rich metadata for the [DawnLike](https://dragondeplatino.itch.io/dawnlike) roguelike tileset (32×32 cells — a strict nearest-neighbour 2× upscale of the original 16×16 art, so every source pixel is preserved as a clean 2×2 block), plus a small React/Storybook playground that demonstrates semantic lookup, 16-way autotiling, and integration with rendering libraries.

**🔗 Live demo:** https://lucas-stanford.github.io/dawnlike-atlas/

## Contents

- `atlas/`
  - `DawnlikeAtlas0.png` — primary frames (4,157 sprites, 2048×2080)
  - `DawnlikeAtlas1.png` — alt frames for the 1,258 animated sprites
  - `DawnlikeAtlas.json` — `byName` lookup (with `meta.tile = {w:32,h:32}`) + AI-generated tags + semantic connections
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

A small explorable roguelike built on [Phaser 4](https://phaser.io/): an overworld + a town (with NPCs, furniture, signs and scattered flowers populating each building) + a 3-level dungeon, wired up with working bidirectional exits, a chrome-framed HUD that sits in its own band above the play area, hold-to-walk movement, sprite animations driven off `DawnlikeAtlas0.png` ↔ `DawnlikeAtlas1.png`, and `localStorage` save/resume keyed off a single seed (reload → same world, same spot). The Storybook **Controls** panel exposes the generator manifests live — tweak the world seed, biome thresholds, town building mix / NPC density / flower density, or dungeon depth and the game rebuilds in-place. All game code lives under `src/phaser/`. Use this as a starting point for integrating the atlas into a Phaser game.

## LLM Prompts

A single self-contained prompt — [`Example_LLM_Prompts/game-template.md`](./Example_LLM_Prompts/game-template.md) — that you can hand to an LLM (Claude, GPT-4, Copilot, …) to **build any 2D browser game** on top of this repo. Drop your game idea into the `<<<…>>>` slot and the model has everything it needs (atlas, generators, autotile helpers, reference examples) linked by raw/blob GitHub URL.

The prompt is also available inside Storybook under **Dawnlike › Prompts** with a starter-pitch dropdown, an "Include sections" toggle row (overworld / town / dungeon / arena / HUD / full Phaser wiring), and a one-click copy button.

See [`Example_LLM_Prompts/README.md`](./Example_LLM_Prompts/README.md) for the section layout and authoring conventions.

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

