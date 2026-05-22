# LLM Prompts

A small collection of self-contained prompts you can hand to an LLM
(Claude, GPT-4, Copilot, …) to **recreate working examples** from this
repository in your own project.

Each prompt is designed so the model can read it once, fetch a handful
of source files via raw GitHub links, and produce a runnable result —
no back-and-forth required.

## Available prompts

**Whole-game template**

- [`game-template.md`](./game-template.md) — **Paste-and-go template.**
  Drop your game idea into the `<<<INSERT YOUR GAME IDEA HERE>>>`
  slot and hand the result to an LLM to build any 2D browser game on
  top of this toolkit. Lists every example component as a reusable
  building block so the model picks the right one. Best starting point
  for a new game.

**Recreate a specific example** (one prompt per `src/*Example.jsx`)

- [`simple-roguelike.md`](./simple-roguelike.md) — Recreate the
  Phaser-based roguelike from `src/PhaserExample.jsx`: overworld + town
  + 3-level dungeon, with working bidirectional exits, sprite
  animations, a chrome-framed HUD, and `localStorage` save/resume.
  Live demo: the **Examples › Phaser Roguelike** story in Storybook.
- [`outdoor-overworld.md`](./outdoor-overworld.md) — Recreate the React
  wilderness overworld from `src/OutdoorExample.jsx` (50×40, simplex
  biomes, autotiled roads / rivers / bridges, forests, mountains).
- [`town.md`](./town.md) — Recreate the React town from
  `src/TownExample.jsx` (45×30, perimeter wall, building archetypes,
  guaranteed bank with vault loot, signs, flowers).
- [`dungeon.md`](./dungeon.md) — Recreate the rot.js dungeon-generator
  playground from `src/DungeonExample.jsx` (six map algorithms, atlas-
  driven style picker, click-to-pin sprite picker).
- [`arena.md`](./arena.md) — Recreate the combat arena from
  `src/ArenaExample.jsx` (noisy obstacle ring, four obstacle kinds,
  themed presets, hazard scatter).
- [`hud-menu.md`](./hud-menu.md) — Recreate the chrome HUD + menu
  toolkit from `src/MenuExample.jsx` (9-slice frame, segmented gauges,
  heart icons, typewriter dialog, inventory grid).

## Authoring conventions

When adding a new prompt:

1. **One prompt per `.md` file**, named for the artifact it produces.
2. Open with a one-sentence goal so the model knows the target.
3. Link every source file as a `https://github.com/lucas-stanford/dawnlike-atlas/blob/master/<path>` URL.
4. Link binary/atlas assets as `https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/<path>` URLs.
5. End with a short verification checklist of observable behaviours.
6. List the file in this README.
