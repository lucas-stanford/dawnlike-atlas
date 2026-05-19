# Prompt: Recreate the Phaser Roguelike

## Goal

Recreate the small exploration roguelike from
**[`lucas-stanford/dawnlike-atlas`](https://github.com/lucas-stanford/dawnlike-atlas)**
(see the *Examples › Phaser Roguelike* story in its Storybook). It is a
[Phaser 4](https://phaser.io/) game built on top of the DawnLike 32×32
tileset (nearest-neighbour 2× upscale of the original 16×16 art — the
pixelated look is preserved exactly) that demonstrates:

- An **overworld** (40×30) with biomes, a meandering road, a river with
  bridge, a town entrance, and a dungeon entrance.
- A **town** (32×24) with shops, houses, and an exit back to the world.
- A **3-level dungeon** generated with `ROT.Map.Digger`; level 3 has no
  stairs down.
- **Working bidirectional exits** between every map (no dead ends, no
  re-entry crashes).
- **Asset preloading** in a boot scene, including both atlas frames so
  the ~2,200 animated sprites flip-frame correctly.
- **`localStorage` save/resume** keyed off a single seed: reload → same
  world, same room, same tile.
- **Sprite animations** registered automatically for every sprite
  tagged `isAnimated: true` in the atlas.
- **A chrome-framed HUD** (9-slice frame + segmented HP/MP gauges +
  heart icons + "New Game" button) sitting in its own band above the
  map so it never covers the play area.
- **Hold-to-walk** continuous movement.

## Prerequisites

Install the dependencies your model already knows about:

```bash
npm install phaser@^4 rot-js
```

Download the atlas files from this repo (raw URLs — fetch and save to
disk under `atlas/`):

- [`atlas/DawnlikeAtlas.json`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas.json)
- [`atlas/DawnlikeAtlas0.png`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas0.png) (primary frames)
- [`atlas/DawnlikeAtlas1.png`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas1.png) (alt frames for animated sprites)

Atlas reference (read once to understand the sprite-name conventions):
- [`atlas/DawnlikeAtlas.instructions.md`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/atlas/DawnlikeAtlas.instructions.md)

## Files to read (in this order)

Read each file in full before reproducing it. Every link points at
master and resolves to the exact source you should mirror.

### Supporting utilities (read first)

| File | What it does |
| --- | --- |
| [`src/utils/autotile.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/utils/autotile.js) | Cardinal-neighbor resolvers for walls, floors, rivers, forests, dungeon walls. The generators emit `kind: 'wall' \| 'floor' \| 'river' \| 'forest' \| 'dungeonWall'` tiles and the renderer calls these resolvers to pick the right atlas frame. |
| [`src/MenuExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/MenuExample.jsx) | Reference for the HUD chrome (9-slice `<Frame>`, `<Gauge>`, `heartSprite` helper). The Phaser HUD ports these to a Phaser scene. |

### Core game files (recreate these)

Create a new directory `src/phaser/` and reproduce each of these files
exactly. Order matters — later files import from earlier ones.

| File | Purpose |
| --- | --- |
| [`src/phaser/save.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/save.js) | `localStorage` schema `dawnlike:roguelike:v1`. Bootstraps a single random `seed` on first load; exposes `load`, `save`, `reset`, `seedFor(key, root)`. Per-scene seeds: `World=root`, `Town=root+1`, `Dungeon{N}=root+100+N`. |
| [`src/phaser/autotileRender.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/autotileRender.js) | `renderWorldTile / renderTownTile / renderDungeonTile` — return layered sprite-name lists for a single map cell, using the resolvers from `src/utils/autotile.js`. |
| [`src/phaser/generators/world.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/generators/world.js) | 40×30 overworld: simplex-noise biomes, road, river with bridge, town + dungeon markers. **Important:** after placing the dungeon marker, uses `ROT.Path.Dijkstra` to carve a passable corridor from the dungeon to the nearest road, bridging rivers as needed — guarantees the dungeon entrance is reachable. |
| [`src/phaser/generators/town.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/generators/town.js) | 32×24 town: stone-brick perimeter wall with a single gap on the road; wider main brick road + narrower stone side streets; shops (with full-width counters + chests behind) and houses; a `worldExit` marker on the perimeter gap. |
| [`src/phaser/generators/dungeon.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/generators/dungeon.js) | 36×26 dungeon level via `ROT.Map.Digger`. `stairsUp` placed near a room; `stairsDown` placed in a different room. **Level 3 has no `stairsDown`** (it's the bottom). |
| [`src/phaser/scenes/BootScene.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/scenes/BootScene.js) | Preloads `DawnlikeAtlas0.png` and `DawnlikeAtlas1.png` as two Phaser atlases sharing the same JSON, then registers a 2-frame anim `anim:<spritename>` at ~3 fps for every sprite with `isAnimated: true`. Launches the UI scene, then routes to the saved scene. |
| [`src/phaser/scenes/MapScene.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/scenes/MapScene.js) | **The shared base.** Renders the tile grid, spawns the player, handles arrow/WASD input (tap and hold-to-walk via `update()` polling), camera viewport + zoom, marker detection, scene transitions, and the marker-tile crash fix described below. |
| [`src/phaser/scenes/WorldScene.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/scenes/WorldScene.js) | Extends `MapScene`. Marker handler routes `town` → TownScene and `dungeon` → Dungeon1. |
| [`src/phaser/scenes/TownScene.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/scenes/TownScene.js) | Extends `MapScene`. Marker handler routes `worldExit` → WorldScene. Spawns the player **adjacent** to the entry marker, never on it. |
| [`src/phaser/scenes/DungeonScene.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/scenes/DungeonScene.js) | Extends `MapScene`. One class for all three levels (`Dungeon1/2/3`); `stairsUp` on level 1 returns to World. Has an `adjacentTo()` helper that picks a walkable non-marker 4-neighbor so stairs transitions never land the player back on a marker. |
| [`src/phaser/scenes/UIScene.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/scenes/UIScene.js) | The HUD scene. **Top-band layout** (96px strip above the map), with HP/MP gauges, heart icon, area label, and "New Game" button. Camera viewport locked to the top band so the map scene's viewport is clean below it. Exports `HUD_HEIGHT = 96` so the map scenes can subtract it. |
| [`src/phaser/ui/hud.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/ui/hud.js) | Phaser primitives port of `MenuExample.jsx`'s chrome: `drawFrame` (9-slice from `<color> nw/n/ne/w/c/e` + `flipY` for the bottom row), `drawGauge` (segmented `gauge chrome left/center/right` + `gauge <color> full/most/half/low`), `heartSprite` helper. |
| [`src/phaser/index.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/index.js) | `createGame(parent)` — wires the Phaser config: `Phaser.AUTO`, `Phaser.Scale.NONE`, pixel art on, the six scenes (`Boot, UI, World, Town, Dungeon1, Dungeon2, Dungeon3`). Attaches `window.__phaserGame = game` for testing. |
| [`src/PhaserExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/PhaserExample.jsx) | Thin React wrapper: mounts a `<div>` of size 800×696 (96 HUD + 600 map), calls `createGame(parent)`, destroys on unmount. |

The Storybook story that mounts the component:
[`stories/PhaserExample.stories.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/PhaserExample.stories.jsx).

## Recreation instructions

1. **Install** `phaser@^4` and `rot-js`.
2. **Download the three atlas files** from the prerequisites section
   and put them where your bundler can serve them (e.g. `public/atlas/`).
3. **Create `src/phaser/save.js`** — match the linked source. Use one
   `localStorage` key with a version tag (`dawnlike:roguelike:v1`).
4. **Create `src/phaser/autotileRender.js`** — port the
   [`src/utils/autotile.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/utils/autotile.js)
   resolvers into a `render<X>Tile` API that returns layered sprite
   names.
5. **Create the three generators** in `src/phaser/generators/`. They
   should each return `{ width, height, tiles, markers }` where
   `tiles[y][x]` is a `{ kind, baseName, marker? }` object and `markers`
   is a `{ name: {x, y} }` lookup.
6. **Create `src/phaser/scenes/BootScene.js`** — load Atlas0 and Atlas1
   as two atlases that share the JSON; register an animation
   `anim:<spritename>` for every `isAnimated` sprite that alternates
   between the two textures at ~3 fps.
7. **Create `src/phaser/scenes/MapScene.js`** — this is the most
   important file. Note these design decisions:
   - **Camera viewport** is offset down by `HUD_HEIGHT` so the HUD has
     its own band above the map. Atlas tiles are 32px native, so no
     extra camera zoom is needed to fill the viewport.
   - **Hold-to-walk:** in `update()`, poll `cursors.X.isDown` /
     `wasd.X.isDown` and call `tryMove` if not already moving. A
     `this.moving` flag rate-limits to one step per ~70ms tween.
   - **Marker-tile crash fix (critical):** in `tryMove`'s onComplete,
     if the new tile has a marker, save `sourceTile` (the tile the
     player came from) as the scene's last position — **not** the
     marker tile. On scene re-entry, `resolveSpawn` rejects any saved
     position that lands on a marker. **Do not** auto-fire
     `handleMarker` in `create()` on the spawn tile (players legitimately
     spawn on stairs when arriving). Together these stop the
     "re-entry → marker fires immediately → infinite loop" crash.
8. **Create `WorldScene.js`, `TownScene.js`, `DungeonScene.js`,
   `UIScene.js`** matching the linked sources. TownScene and
   DungeonScene spawn the player **adjacent** to the destination
   marker (use an `adjacentTo(marker, map)` helper that picks the
   first walkable non-marker 4-neighbor).
9. **Create `src/phaser/ui/hud.js`** porting the `<Frame>` and
   `<Gauge>` components from `MenuExample.jsx`. The bottom row of the
   9-slice frame uses the top-row sprites with `flipY: true`.
10. **Create `src/phaser/index.js`** as the entry point.
11. **Wire it into your app** — for a React app, mirror
    `src/PhaserExample.jsx`; for a vanilla page, just call
    `createGame(document.getElementById('game'))`.
12. **Run it.** Refresh — same map, same spot. Walk into the town —
    `TownScene`. Walk out — back where you left. Walk into the
    dungeon, descend to level 3, climb back out — no crash.

## Verification checklist

A correct recreation should pass all of these:

- [ ] Page loads; canvas is 800×696 with a chrome HUD band in the top 96px.
- [ ] Player visible on the overworld at game start; HP and MP gauges
      render in the HUD; area label shows "Overworld".
- [ ] Arrow keys / WASD step the player one tile per press.
- [ ] **Holding** an arrow key walks continuously (about 14 tiles/sec).
- [ ] Player steps onto the town-entrance tile → loads TownScene.
- [ ] Player steps onto the town's exit-to-world tile → returns to
      overworld, spawned right next to the town entrance.
- [ ] Re-entering the town **does not crash** and works the same way
      (this was the bug the marker-tile fix addresses).
- [ ] Player can reach the dungeon entrance on the overworld
      (Dijkstra-carve corridor + bridge).
- [ ] Dungeon level 1 has both `stairsUp` (→ world) and `stairsDown`
      (→ level 2). Stairs work in both directions, re-entry doesn't
      crash.
- [ ] Dungeon level 3 has **no** `stairsDown` — it's the bottom floor.
- [ ] Reload the page: same seed, same world, player on the same tile
      in the same scene.
- [ ] "New Game" button in the HUD clears `localStorage` and reloads
      to a fresh seed.
- [ ] HUD never overlaps the playable map.

If all twelve check, you have a working clone of the example.
