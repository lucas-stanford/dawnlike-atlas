# Prompt: Recreate the Outdoor Overworld

## Goal

Recreate the procedurally-generated wilderness overworld from
**[`lucas-stanford/dawnlike-atlas`](https://github.com/lucas-stanford/dawnlike-atlas)**
(see the *Examples › Outdoor Wilderness* story in its Storybook). It is a
React component that renders a 50×40 tile map (each tile is 32×32 — a
nearest-neighbour 2× upscale of the original 16×16 DawnLike art) using
simplex-noise biomes, a meandering road, a single-line river with a
bridge where it crosses the road, scattered mountain ranges, and forests
that grow on the ground layer. Every layer is autotiled by its cardinal
neighbours so corners and T-junctions pick the right atlas frame.

Highlights:

- **Simplex-noise biome map** with switchable terrain, dirt patch,
  road, river, tree, and mountain styles.
- **Autotiled rivers and roads** including a bridge sprite at the
  crossing.
- **Ground-under-forest layering** so trees sit on the selected terrain
  rather than a separate dirt patch.
- **Hover tooltip** showing the resolved sprite name at every tile.
- **Click-to-pin sprite picker** that lets you override a bad autotile
  pick and prints a paste-ready report for the resolver authors.

## Prerequisites

Install:

```bash
npm install react rot-js
```

Download the atlas files (raw URLs — fetch and save to `atlas/` or
wherever your bundler serves static assets from):

- [`atlas/DawnlikeAtlas.json`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas.json)
- [`atlas/DawnlikeAtlas0.png`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas0.png)
- [`atlas/DawnlikeAtlas1.png`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas1.png) (alt frames for the animated sprites — rivers and torches)

Atlas naming guide (read once):
- [`atlas/DawnlikeAtlas.instructions.md`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/atlas/DawnlikeAtlas.instructions.md)

## Files to read (in this order)

| File | What it does |
| --- | --- |
| [`src/utils/autotile.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/utils/autotile.js) | All cardinal-neighbour resolvers used by the overworld: `resolveDawnLikeFloorName`, `resolveDawnLikeWallName`, `resolveDawnLikeRiverName`, `resolveDawnLikeForestName`, `resolveDawnLikePoolName`, `resolveDawnLikeMountainName`. Read its docstrings — river/wall naming has gotchas. |
| [`src/Autotile.css`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/Autotile.css) | Shared styles for the hover/pin overlay and the gear-panel controls. |
| [`src/OutdoorExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/OutdoorExample.jsx) | The component to recreate. ~750 lines: biome noise, road carving, river path, bridge placement, forest seeding, render loop, sprite-picker UI. |

For reference, the Storybook stories that mount it:

- [`stories/Outdoor.stories.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/Outdoor.stories.jsx)
- [`stories/ChaosWastes.stories.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/ChaosWastes.stories.jsx) (same component, demon-themed sprite preset)

## Recreation instructions

1. Fetch `DawnlikeAtlas.json` once on mount; keep it in component state.
2. Generate the map deterministically from a `seed` prop (use
   `ROT.RNG.setSeed(seed)` and `new ROT.Noise.Simplex()`):
   - **Biomes** from simplex noise: thresholds map noise to `grass`,
     `dirt`, `mountain`, etc.
   - **Road**: pick two edges, carve a meandering path with a bias
     toward the noise valleys.
   - **River**: same idea, but one tile wide; lay a `bridge` tile at any
     cell where it crosses the road.
   - **Mountains**: place clumps where the high-noise threshold fires;
     `resolveDawnLikeMountainName` is a 4-way blob resolver.
   - **Trees**: a forest is a set of `tree` cells; the resolver picks
     the right corner/T sprite using `resolveDawnLikeForestName` (8-way).
3. Render every tile by stacking layers (in order): terrain → dirt
   patch → road/river → forest. Look every sprite up by name in
   `atlas.byName` and honour `sprite.w` / `sprite.h` (default to 32).
4. Add a tooltip that shows the resolved sprite name on hover; a
   pinned panel on click for the autotile picker.

## Verification checklist

- [ ] Page loads and renders a 50×40 grid of 32×32 tiles.
- [ ] Biomes look organic — at least three terrain types visible.
- [ ] A road snakes from one edge to another with correctly-oriented
      corner/T sprites.
- [ ] A river crosses the road and renders a bridge sprite at the
      crossing.
- [ ] Forest patches have rounded edges (no square boundaries) thanks
      to `resolveDawnLikeForestName`.
- [ ] Hovering a tile shows its sprite name; clicking pins the picker.
- [ ] Changing the terrain / road / river / tree style prop rebuilds the
      map with the new sprite family without breaking autotiling.
- [ ] Reusing the same `seed` reproduces the same map exactly.
