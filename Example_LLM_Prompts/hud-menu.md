# Prompt: Recreate the Chrome HUD + Menu Toolkit

## Goal

Recreate the chrome-framed HUD and menu primitives from
**[`lucas-stanford/dawnlike-atlas`](https://github.com/lucas-stanford/dawnlike-atlas)**
(see the *Examples › Menu* story in its Storybook). It is a React
component (~1000 lines) that ships the building blocks any DawnLike
game needs for its UI: 9-slice frames, segmented gauges, heart icons,
typewriter dialogs, an inventory grid, and a simple title-screen
layout — all rendered from atlas sprites. Tiles are 32×32 (a
nearest-neighbour 2× upscale of the original 16×16 DawnLike art); some
HUD icons (health/stamina/save/inventory/etc.) are 96×96 — honour
`sprite.w` / `sprite.h` from the lookup.

Highlights:

- **9-slice `<Frame>`** with a swappable family (`gray white`,
  `red black`, …). The atlas only provides nw/n/ne/w/c/e/square — the
  component flips the top row vertically for the bottom corners/edges
  to get a clean rectangular border.
- **Segmented `<Gauge>`** for HP / MP / stamina: colored fill under a
  chrome frame. Each segment picks between `full`, `most`, `half`,
  `low` based on the fill fraction.
- **Heart sprite helper** that renders full / half / empty hearts to
  represent HP at a glance.
- **Typewriter dialog** (`useTypewriter`) for NPC speech.
- **Inventory grid** using the framed cells.

## Prerequisites

Install:

```bash
npm install react
```

Download the atlas files (raw URLs — fetch and save to `atlas/`):

- [`atlas/DawnlikeAtlas.json`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas.json)
- [`atlas/DawnlikeAtlas0.png`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas0.png)

Atlas naming guide (note the section on the oversized 96×96 GUI icons):
- [`atlas/DawnlikeAtlas.instructions.md`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/atlas/DawnlikeAtlas.instructions.md)

## Files to read (in this order)

| File | What it does |
| --- | --- |
| [`src/Menu.css`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/Menu.css) | Styles for the menu screens (backgrounds, font sizes, layout). |
| [`src/MenuExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/MenuExample.jsx) | The component to recreate. Read the comments — each primitive is in its own clearly-marked block. |
| [`stories/Menu.stories.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/Menu.stories.jsx) | Story wiring. |
| [`src/phaser/ui/hud.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/ui/hud.js) | A Phaser port of the same primitives (`drawFrame`, `drawGauge`, `heartSprite`). Useful as a sanity check if you want to use the HUD in a Phaser game. |

## Recreation instructions

1. Fetch `DawnlikeAtlas.json` once; keep it in state.
2. Write a `<Sprite>` primitive that renders any named atlas sprite as
   a positioned background-image on a `<div>`. Honour the sprite's
   `w` / `h` (most are 32×32; HUD icons are 96×96). Support `flipX` /
   `flipY` via CSS transform.
3. Write `<Frame w h family>`:
   - For every cell in the `w × h` grid, pick the right 9-slice part
     (`nw`, `n`, `ne`, `w`, `c`, `e`) and `flipY` for the bottom row.
   - Sprite name = `` `${family} ${part}` ``.
4. Write `<Gauge color value segments>`:
   - Two passes: colored fill (`gauge <color> full|most|half|low` per
     segment) under chrome frame (`gauge chrome left|center|right`).
   - For each segment, compute `frac = (value − segStart) / segWidth`
     and pick the level by quartile.
5. Write a `heartSprite(hp, maxHp)` helper that lays out full / half /
   empty heart sprites.
6. Write a `useTypewriter(text, speed)` hook that reveals `text` one
   character at a time via `setInterval`.
7. Compose a small demo screen showing every primitive: title text on
   a framed background, a row of gauges, a heart row, a typewriter
   dialog box, and a 4×4 inventory grid of framed cells.

## Verification checklist

- [ ] Page loads and shows the title screen with a chrome-framed
      background.
- [ ] `<Frame>` renders cleanly for any `w × h` ≥ 2×2 with no visible
      seams between the 9-slice parts.
- [ ] `<Gauge>` shows full segments at `value = 1`, an empty bar at
      `value = 0`, and a partial last segment (`most` / `half` / `low`)
      for in-between values.
- [ ] Heart row renders the correct mix of full / half / empty hearts
      for `hp = maxHp`, `hp = maxHp − 1`, `hp = maxHp / 2`, `hp = 0`.
- [ ] Typewriter dialog reveals text one character at a time.
- [ ] Inventory grid shows 16 framed cells, each able to hold a sprite.
- [ ] Switching the frame `family` prop swaps the chrome colour without
      breaking the 9-slice layout.
- [ ] The 96×96 GUI icons (health/stamina/save/inventory) render at
      their native size rather than being squashed to 32×32.
