# LLM Prompts

A small collection of self-contained prompts you can hand to an LLM
(Claude, GPT-4, Copilot, …) to **recreate working examples** from this
repository in your own project.

Each prompt is designed so the model can read it once, fetch a handful
of source files via raw GitHub links, and produce a runnable result —
no back-and-forth required.

## Available prompts

- [`simple-roguelike.md`](./simple-roguelike.md) — Recreate the
  Phaser-based roguelike from `src/PhaserExample.jsx`: overworld + town
  + 3-level dungeon, with working bidirectional exits, sprite
  animations, a chrome-framed HUD, and `localStorage` save/resume.
  Live demo: the **Examples › Phaser Roguelike** story in Storybook.

## Authoring conventions

When adding a new prompt:

1. **One prompt per `.md` file**, named for the artifact it produces.
2. Open with a one-sentence goal so the model knows the target.
3. Link every source file as a `https://github.com/lucas-stanford/dawnlike-atlas/blob/master/<path>` URL.
4. Link binary/atlas assets as `https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/<path>` URLs.
5. End with a short verification checklist of observable behaviours.
6. List the file in this README.
