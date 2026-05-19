# Build a 2D browser game on dawnlike-atlas

Build the game described below in **Your game idea** using the
[lucas-stanford/dawnlike-atlas](https://github.com/lucas-stanford/dawnlike-atlas)
toolkit: a 32×32 sprite atlas (~4,157 sprites — nearest-neighbour 2× of the original 16×16 DawnLike art), manifest-driven
overworld/town/dungeon generators, autotile resolvers, and a reference
Phaser game wiring it all together.

---

## Your game idea

<<<
INSERT YOUR GAME IDEA HERE.

A sentence or a paragraph — genre, what the player does, anything
distinctive.
>>>

---

## What to fetch

- Atlas (drop in `atlas/`): [`DawnlikeAtlas.json`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas.json), [`DawnlikeAtlas0.png`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas0.png), [`DawnlikeAtlas1.png`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas1.png) + [sprite naming guide](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/atlas/DawnlikeAtlas.instructions.md)
- Generators (optional, take what you need): [`world.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/generators/world.js) ([docs](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/WorldManifest.mdx)), [`town.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/generators/town.js) ([docs](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/TownManifest.mdx)), [`dungeon.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/generators/dungeon.js) ([docs](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/DungeonManifest.mdx))
- Helpers: [`autotile.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/utils/autotile.js) (corner/edge sprite picker), [`autotileRender.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/autotileRender.js) (map → sprite layers), [`hud.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/ui/hud.js) (9-slice frame, gauges, hearts)
- Reference game (copy what you need): [`src/phaser/`](https://github.com/lucas-stanford/dawnlike-atlas/tree/master/src/phaser) + [`src/PhaserExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/PhaserExample.jsx)

## Rules

- `npm install phaser@^4 rot-js`
- Pixel art on: `Phaser.AUTO` + `Phaser.Scale.NONE` + `pixelArt: true`
- Look up sprites by name (`byName['light oak dense']`), never by frame index. Honour `w`/`h` from the lookup (most are 32×32; some HUD icons are 96×96 — i.e., 2× the original DawnLike sizes).
- Sprites with `isAnimated: true` have a second frame in atlas 1 — register a 2-frame anim `anim:<name>` at ~3 fps in boot.
- Each generator returns `walkable(x,y)` — use it as-is.
- Exit tiles are tagged via `tile.marker`; on contact, transition and spawn the player **adjacent** to the destination marker (never on it).
- Persist a single root seed in `localStorage` so reloads are deterministic.

Reuse the toolkit aggressively; only build what your idea actually needs.
