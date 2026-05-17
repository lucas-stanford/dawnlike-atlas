# DawnLike Semantic Atlas

A bin-packed **mega-atlas** and rich metadata for the [DawnLike](https://dragondeplatino.itch.io/dawnlike) 16×16 roguelike tileset, plus a small React/Storybook playground that demonstrates semantic lookup, 16-way autotiling, and integration with rendering libraries.

## Contents

- `atlas/`
  - `DawnlikeAtlas0.png` — primary frames (3,844 sprites)
  - `DawnlikeAtlas1.png` — alt frames for the 1,970 animated sprites
  - `DawnlikeAtlas.json` — `byName` lookup + AI-generated tags + semantic connections
- `src/` — autotile resolvers (`src/utils/autotile.js`) and the example components
- `react/` — re-exports for consuming the atlas from a React project
- `stories/` — Storybook stories that render the examples

## Key Features

- **Semantic lookup**: assets keyed by human-readable names (`"fighting fish"`, `"bright brick wall left right down"`).
- **AI-generated tags**: 3,700+ sprites tagged with descriptive keywords (`creature`, `metallic`, `glowing`, …).
- **16-way autotiling**: cardinal-neighbor resolvers for walls, floors, rivers, pools, and forest canopies.

## Getting Started

```bash
bun install
bun run dev          # launches Storybook on http://localhost:6006
```

## Examples

All examples live in `stories/` and are browsable from the Storybook sidebar.

### DawnLike › Mega Atlas › All Sprites
`stories/MegaAtlas.stories.jsx` → `src/components/SpriteSheet`

Renders every named sprite from `DawnlikeAtlas0.png` in its bin-packed 64×61 grid (98.5% utilization). Toggle animation to flip in `DawnlikeAtlas1.png` for the animated sprites; hover any cell to read its name from the atlas lookup. Use this to browse what's available before reaching for it by name.

### Examples › Autotile (rot.js)
`stories/Autotile.stories.jsx` → `src/AutotileExample.jsx`

A dungeon generator built on [rot.js](https://github.com/ondras/rot.js). Pick from six map algorithms (Digger, Uniform, Cellular, Divided / Icey / Eller mazes) and a wall style; walls are autotiled via `resolveDawnLikeWallName`. Demonstrates how to feed `{ n, s, e, w }` neighbor flags into the resolver to get the correct sprite name back.

### Examples › Outdoor Wilderness
`stories/Outdoor.stories.jsx` → `src/OutdoorExample.jsx`

A procedurally-generated overworld using simplex noise for biomes, a meandering road, and a single-line meandering river that drops a bridge where it crosses the road. The floating gear panel lets you swap terrain, dirt patch, path, river, and tree styles independently; the selected ground terrain renders under forests, roads, and rivers. Shows off `resolveDawnLikeFloorName`, `resolveDawnLikeRiverName`, and `resolveDawnLikeForestName` working together.

### Examples › PhaserExample
`stories/PhaserExample.stories.jsx` → `src/PhaserExample.jsx`

A minimal [Phaser 4](https://phaser.io/) scene that loads `DawnlikeAtlas0.png` directly as a texture atlas and draws sprites by name. Use this as a starting point for integrating the atlas into a Phaser game.

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

