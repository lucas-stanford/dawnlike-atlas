# Prompt: Recreate the Dungeon Generator Demo

## Goal

Recreate the rot.js dungeon-generator playground from
**[`lucas-stanford/dawnlike-atlas`](https://github.com/lucas-stanford/dawnlike-atlas)**
(see the *Examples › Dungeon* story in its Storybook). It is a React
component that lets you switch between **six rot.js map algorithms** —
Digger, Uniform, Cellular, DividedMaze, IceyMaze, EllerMaze — and any
wall/floor sprite family in the atlas, with a click-to-pin sprite
picker for fixing autotile mispicks. Tiles are 32×32 (a nearest-neighbour
2× upscale of the original 16×16 DawnLike art).

Highlights:

- **All six rot.js generators** behind a dropdown.
- **Cellular controls** (initial density %, smoothing passes) exposed
  separately because cellular is the only stochastic one that benefits
  from them.
- **Wall + floor style discovery** from the atlas (anything tagged
  `wall` + `sourceFile: Objects/Wall` becomes a pickable wall family).
- **Rot.js-style dungeon-wall autotile** via
  `resolveDawnLikeDungeonWallName` (treats out-of-bounds as wall;
  requires a surface-wall + lateral/vertical open check, not a flood
  fill).
- **Click-to-pin sprite picker** with a paste-ready override log so you
  can report bad autotile picks back to the resolver authors.

## Prerequisites

Install:

```bash
npm install react rot-js
```

Download the atlas files (raw URLs — fetch and save to `atlas/`):

- [`atlas/DawnlikeAtlas.json`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas.json)
- [`atlas/DawnlikeAtlas0.png`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas0.png)
- [`atlas/DawnlikeAtlas1.png`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas1.png) (alt frames for animated dungeon sprites — torches, water, lava)

Atlas naming guide:
- [`atlas/DawnlikeAtlas.instructions.md`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/atlas/DawnlikeAtlas.instructions.md)

## Files to read (in this order)

| File | What it does |
| --- | --- |
| [`src/utils/autotile.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/utils/autotile.js) | Source of `resolveDawnLikeFloorName` and `resolveDawnLikeDungeonWallName`. The dungeon wall resolver has a long docstring on the "wall = solid tile, treat OOB as wall" convention. |
| [`src/Autotile.css`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/Autotile.css) | Tooltip / picker styles shared with the other map examples. |
| [`src/DungeonExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/DungeonExample.jsx) | The component to recreate. ~500 lines: map-type switcher, atlas-driven style picker, render loop, sprite picker. |
| [`stories/Dungeon.stories.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/Dungeon.stories.jsx) | Story wiring (controls panel). |

For comparison, the Phaser dungeon used in the roguelike example:
[`src/phaser/generators/dungeon.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/generators/dungeon.js)
([docs](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/DungeonManifest.mdx)).

## Recreation instructions

1. Fetch `DawnlikeAtlas.json`; keep it in state.
2. Discover available styles from the atlas:
   - `discoveredWalls`: every base name from sprites tagged `wall` with
     `sourceFile === 'Objects/Wall'`, after stripping autotile suffix
     tokens.
   - `discoveredFloors`: every base name from sprites with
     `sourceFile === 'Objects/Floor'`, excluding `empty`.
3. Build a `MAP_TYPES` table listing the six rot.js classes (Digger,
   Uniform, Cellular, DividedMaze, IceyMaze, EllerMaze) plus a `label`.
4. On every change to `mapType` / `seed` / `width` / `height` /
   cellular knobs, regenerate:
   - For `Cellular`: call `randomize(initialDensity/100)`, then run
     `create()` `smoothPasses` times.
   - For the others: just `create((x, y, value) => map[y][x] = value)`.
5. Render two layers per tile: floor (always) + wall (when
   `map[y][x] === 1`). Walls use `resolveDawnLikeDungeonWallName`;
   floors use `resolveDawnLikeFloorName`.
6. Add hover + click-to-pin overlay; when pinned, show a swatch picker
   of every sprite that shares the tile's base name so the user can
   override the resolver's pick.

## Verification checklist

- [ ] Page loads with a default Digger dungeon, 40×30, walls = bright
      mine wall, floor = day brick floor.
- [ ] Switching map type to each of Uniform, Cellular, DividedMaze,
      IceyMaze, EllerMaze produces a recognisably different layout.
- [ ] Cellular density + smoothing sliders change the cave shape in
      real time.
- [ ] All wall corners and T-junctions pick the right sprite (no
      flat-end walls jutting into open tiles).
- [ ] Hovering a tile shows the resolved sprite name; clicking pins
      the picker and lists every alternative in that base family.
- [ ] Reusing the same `seed` reproduces the same dungeon exactly for
      any map type.
