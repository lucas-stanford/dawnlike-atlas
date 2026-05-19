# Prompt: Build any 2D game on top of dawnlike-atlas

You are going to build a small browser game on top of the
**[lucas-stanford/dawnlike-atlas](https://github.com/lucas-stanford/dawnlike-atlas)**
toolkit. Read this whole prompt, fetch the linked files you actually
need, then design and implement the game described under "Your game
idea" below.

---

## Your game idea

<<<
INSERT YOUR GAME IDEA HERE.

Describe the game in your own words — genre, what the player does,
what the world looks like, win/lose conditions, anything else that
matters. Be as short or as long as you like; the model will fill in
the rest.

Example: "A grid-based fishing game. The player wanders a small
island town, talks to NPCs, and casts off the dock to catch fish.
Each fish has a sprite from the atlas. Inventory + day/night cycle."
>>>

---

## What the toolkit gives you

- **A single 16×16 sprite atlas** with ~4,157 sprites covering
  characters, monsters, items, terrain, walls, doors, furniture,
  effects, and HUD chrome. The atlas is split across two PNGs so
  animated sprites can flip-frame between them at runtime.
  - [`atlas/DawnlikeAtlas.json`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas.json) — `byName` lookup + frame metadata
  - [`atlas/DawnlikeAtlas0.png`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas0.png) — primary frames
  - [`atlas/DawnlikeAtlas1.png`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas1.png) — alt frames for animated sprites
  - [`atlas/DawnlikeAtlas.instructions.md`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/atlas/DawnlikeAtlas.instructions.md) — naming conventions

- **Manifest-driven map generators** for the three classic zone types.
  Each takes a small manifest object and returns
  `{ width, height, tiles, markers, walkable, manifest }`:
  - [`src/phaser/generators/world.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/generators/world.js) — overworld (biomes, roads, rivers, bridges, town/dungeon markers). [Docs](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/WorldManifest.mdx)
  - [`src/phaser/generators/town.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/generators/town.js) — towns (plaza, main road, buildings with doors + signs, NPCs, furniture). [Docs](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/TownManifest.mdx)
  - [`src/phaser/generators/dungeon.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/generators/dungeon.js) — rooms + corridors via `ROT.Map.Digger` + stairs. [Docs](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/DungeonManifest.mdx)
  - You can use them as-is, configure them via the manifest, or fork them.

- **Autotile resolvers** that pick the right corner/edge sprite from a
  cell's 4 neighbours (or 8 for forests). One file, every kind:
  - [`src/utils/autotile.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/utils/autotile.js) —
    `resolveDawnLikeFloorName`, `resolveDawnLikeWallName`,
    `resolveDawnLikeRiverName`, `resolveDawnLikeForestName`,
    `resolveDawnLikeMountainName`, `resolveDawnLikeDungeonWallName`.

- **A renderer** that turns a generated map into ordered sprite layers
  per cell, ready to draw with any 2D engine:
  - [`src/phaser/autotileRender.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/autotileRender.js) — `renderWorldTile`, `renderTownTile`, `renderDungeonTile`.

- **HUD chrome primitives** ported to Phaser — 9-slice frame, segmented
  HP/MP gauges, hearts, area label:
  - [`src/phaser/ui/hud.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/ui/hud.js)
  - React reference: [`src/MenuExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/MenuExample.jsx)

- **A complete reference game** wiring all the above together with a
  `localStorage`-backed save, scene transitions, and hold-to-walk
  input — copy whatever you need:
  - [`src/phaser/index.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/index.js), [`src/phaser/save.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/save.js), [`src/phaser/scenes/*`](https://github.com/lucas-stanford/dawnlike-atlas/tree/master/src/phaser/scenes), [`src/PhaserExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/PhaserExample.jsx)
  - Live demo: the **Examples › Phaser Roguelike** story in
    [Storybook](https://github.com/lucas-stanford/dawnlike-atlas).

---

## Build instructions

1. **Install dependencies.** [Phaser 4](https://phaser.io/) for
   rendering + input, [rot-js](https://ondras.github.io/rot.js/) for
   the existing generators' RNG and pathfinding. Skip either if your
   game doesn't need it.

   ```bash
   npm install phaser@^4 rot-js
   ```

2. **Fetch the atlas** (the three `atlas/*` raw URLs above) and drop
   them in your project so the Phaser loader can serve them.

3. **Decide which pieces you actually need** for the game described in
   "Your game idea" above. Treat the existing generators, scenes, HUD
   primitives, and renderer as a **library, not a checklist** — only
   port the ones your game needs.

4. **Implement the game.** Reuse `byName` lookups for sprites (e.g.
   `byName['light oak dense']`, `byName['peasant woman']`) so you
   never hard-code frame coordinates. Lean on the manifest defaults so
   small games stay short.

5. **Persist state.** Use `localStorage` with a versioned key (the
   reference game uses `dawnlike:roguelike:v1`); bootstrap a single
   root seed on first load and derive per-scene/per-level seeds from
   it so reloads are deterministic.

---

## Conventions you should follow

- **Pixel art on.** `Phaser.AUTO` + `Phaser.Scale.NONE` + `pixelArt:
  true`. Never scale individual sprites — scale the whole canvas.
- **Sprite names, not frame coords.** `byName[<sprite name>]` returns
  `{ frame, w, h, isAnimated, … }`. Most sprites are 16×16; some HUD
  icons are 48×48 — honour `w`/`h` on the lookup.
- **Animated sprites.** Sprites with `isAnimated: true` have a second
  frame in `DawnlikeAtlas1.png`. Register a 2-frame anim
  `anim:<name>` at ~3 fps during boot.
- **Walkability lives on the map.** Every generator returns a
  `walkable(x, y)` predicate that already accounts for walls / NPCs /
  furniture / signs — call it, don't reimplement it.
- **Marker tiles drive transitions.** Generators tag exit tiles via
  `tile.marker` (e.g. `'town'`, `'dungeon'`, `'worldExit'`,
  `'stairsUp'`, `'stairsDown'`). When the player steps on one, hand
  off to the next scene and spawn them **adjacent** to the destination
  marker — never on it — so they don't immediately bounce back.

---

## Verification checklist

You're done when:

- [ ] `npm run dev` (or your equivalent) opens the game in a browser.
- [ ] The atlas loads and the player sprite is visible at game start.
- [ ] Every map/zone you described under "Your game idea" renders
      without missing-sprite squares, missing-tile holes, or visible
      autotile seams.
- [ ] Every transition described under "Your game idea" works in both
      directions without crashing on re-entry.
- [ ] Reloading the page restores the same state (same seed, same
      position, same scene, same inventory if any).
- [ ] Holding a direction key walks continuously.
- [ ] The HUD never overlaps the playable map area.
- [ ] At least one feature unique to your game idea (a mechanic, an
      NPC interaction, an inventory item, etc.) is implemented and
      observable in the running game.

Reply with the full file tree you created plus the key source files
(in fenced code blocks), then a one-paragraph summary of the
gameplay.
