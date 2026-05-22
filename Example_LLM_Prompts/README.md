# LLM Prompts

A single self-contained prompt you can hand to an LLM (Claude, GPT-4,
Copilot, …) to **build any 2D browser game** on top of this repository.

[`game-template.md`](./game-template.md) is the prompt. Drop your game
idea into the `<<<INSERT YOUR GAME IDEA HERE>>>` slot, optionally trim
the component deep-dive sections you don't need, and hand the whole
file to the model. Every link inside resolves to raw GitHub content so
the model can fetch the source itself — no back-and-forth required.

## Using it from Storybook

The same prompt is also available inside Storybook under
**Dawnlike › Prompts** with:

1. A **starter pitch** dropdown (20 example game ideas) that drops a
   concrete idea into the `<<<…>>>` slot for you, and
2. An **Include sections** row of toggles that strips the optional
   component deep-dives you don't want from the output before you copy
   it.

A "Copy prompt" button gives you the final, paste-ready text.

## Sections in `game-template.md`

The prompt is organised as:

1. **Game idea** slot — your one-sentence pitch.
2. **What to fetch** — the atlas, generators, helpers, and reference
   examples available in this repo, each linked by GitHub raw / blob
   URL.
3. **Rules** — the small handful of conventions any game on this
   toolkit needs to follow (atlas lookups, animation registration,
   marker handling, save/resume).
4. **Component deep-dives** (optional, delimited by
   `<!-- BEGIN:id -->` / `<!-- END:id -->`):
   - `overworld` — recreate the wilderness overworld
     (`OutdoorExample`).
   - `town` — recreate the town with shops, bank vault, signs, flora
     (`TownExample`).
   - `dungeon` — recreate the rot.js dungeon playground across all
     six map algorithms (`DungeonExample`).
   - `arena` — recreate the combat arena with themed presets
     (`ArenaExample`).
   - `hud-menu` — recreate the chrome HUD + menu toolkit
     (`MenuExample`).
   - `phaser-wiring` — recreate the full Phaser game (overworld + town
     + 3-level dungeon + HUD + save) from `src/phaser/` and
     `src/PhaserExample.jsx`.

The Storybook story uses the same `BEGIN:` / `END:` markers to
include/exclude each section from the copied output.

## Authoring conventions

When extending the prompt:

1. **Keep it a single file.** New examples become a new
   `<!-- BEGIN:id -->…<!-- END:id -->` section inside `game-template.md`
   and a new entry in the Storybook story's `SECTIONS` array — not a
   new `.md` file.
2. Link every source file as a
   `https://github.com/lucas-stanford/dawnlike-atlas/blob/master/<path>`
   URL.
3. Link binary / atlas assets as
   `https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/<path>`
   URLs.
4. End each section with a short verification checklist of observable
   behaviours.
