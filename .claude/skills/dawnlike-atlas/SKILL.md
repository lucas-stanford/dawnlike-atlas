---
name: dawnlike-atlas
description: Use the `dawnlike-atlas` repo — a bin-packed 32×32 mega-atlas of the DawnLike roguelike tileset with semantic name lookup, AI-generated tags, and 16-way autotile resolvers. Invoke when building 2D pixel-art / roguelike games (HTML/Canvas, React, Phaser 3/4) that need DawnLike sprites, animated 2-frame walks, or autotiled walls / floors / rivers / pools / forests / mountains.
---

# dawnlike-atlas

A semantic mega-atlas for the [DawnLike](https://dragondeplatino.itch.io/dawnlike) tileset (CC-BY 4.0). Sprites are stored at **32×32** (a strict 2× nearest-neighbour upscale of the original 16×16 art, so every source pixel becomes a clean 2×2 block).

- **4,157 sprites** packed into a single `2048×2080` PNG (`64×65` grid).
- Companion `DawnlikeAtlas1.png` provides the alt frame for the 2,226 animated sprites.
- `DawnlikeAtlas.json` gives semantic name lookup + tags + a legacy index map.
- Pure JS autotile resolvers for walls, floors, rivers, pools, forests, mountains.

Live demo / browser: <https://lucas-stanford.github.io/dawnlike-atlas/>

## Get the assets

This repo is **not published to npm** — consume it directly from the source tree (clone, git submodule, or copy the needed files into your project):

```bash
git clone https://github.com/lucas-stanford/dawnlike-atlas.git
```

Files you actually need at runtime:

| Path | What it is |
|---|---|
| `atlas/DawnlikeAtlas.json` | Metadata (`meta`, `frames`, `byName`, `legacyFrames`) |
| `atlas/DawnlikeAtlas0.png` | Primary frame sheet (2048×2080, 4,157 sprites) |
| `atlas/DawnlikeAtlas1.png` | Alt frame sheet (animation second frame for 2,226 sprites) |
| `src/utils/autotile.js` | All `resolveDawnLike*` autotile resolvers + `AUTOTILE_MANIFESTS` |
| `react/` | Optional React helpers (`DawnLikeIcon`, `HeartIcon`, `ManaIcon`, `HealthBar`, `ManaBar`, `GUI_FRAMES`) |

Copy/serve the two PNGs + JSON as static assets in your app, and import the JS modules from wherever you placed the source tree.

## Atlas JSON shape

```jsonc
{
  "meta":   { "size": {"w":2048,"h":2080}, "tile": {"w":32,"h":32}, "scale": 2, "columns": 64, "rows": 65, ... },
  "frames": { "<name>": { "frame": {"x":..,"y":..,"w":32,"h":32} } },  // Phaser-min texture atlas
  "byName": { "<name>": { "x":..,"y":..,"w":32,"h":32, "tags":[...] } },// flat lookup
  "legacyFrames": { "<index>": "<name>" }                                // 64-col index → name
}
```

All entries are 32×32. `byName[name].x / .y` are pixel coordinates in `DawnlikeAtlas0.png`. The same coordinates apply to `DawnlikeAtlas1.png` for the animated subset.

## Lookup a sprite by name

```js
import atlas from './atlas/DawnlikeAtlas.json' assert { type: 'json' };

const { x, y, w, h, tags } = atlas.byName['wizard'];
// → { x: …, y: …, w: 32, h: 32, tags: ['creature','humanoid','magic',...] }
```

Sprites are keyed by lowercase human-readable names: `"fighting fish"`, `"red dragon"`, `"bright brick wall left right down"`, `"clear river up down left"`, `"health icon"`. Browse them in Storybook → **DawnLike › Mega Atlas › All Sprites** or scan `byName` keys.

## Rendering

### Phaser 3 / 4

```js
// preload
this.load.atlas('dawnlike',  'DawnlikeAtlas0.png', 'DawnlikeAtlas.json');
this.load.atlas('dawnlike1', 'DawnlikeAtlas1.png', 'DawnlikeAtlas.json');

// static sprite (32×32)
this.add.sprite(x, y, 'dawnlike', 'wizard');

// 2-frame walk animation (only meaningful for animated sprites)
this.anims.create({
  key: 'wizard-walk',
  frames: [
    { key: 'dawnlike',  frame: 'wizard' },
    { key: 'dawnlike1', frame: 'wizard' },
  ],
  frameRate: 2,
  repeat: -1,
});
```

### Plain HTML / CSS

```html
<div id="sprite"></div>
<script type="module">
  const atlas = await fetch('DawnlikeAtlas.json').then(r => r.json());
  const { x, y } = atlas.byName['wizard'];
  Object.assign(document.querySelector('#sprite').style, {
    backgroundImage:    'url(DawnlikeAtlas0.png)',
    backgroundPosition: `-${x}px -${y}px`,
    width: '32px', height: '32px',
    imageRendering: 'pixelated',
    display: 'inline-block',
  });
</script>
```

### React (built-in helpers)

```jsx
// Adjust import path to where you placed the repo's `react/` directory.
import { HealthBar, ManaBar, HeartIcon, ManaIcon, DawnLikeIcon } from './react';

<HealthBar current={7} max={10} />
<ManaBar   current={3} max={10} />
<HeartIcon fill={4} />
<ManaIcon  fill={2} />
<DawnLikeIcon name="heartFull" scale={2} />
```

> Note: `DawnLikeIcon` / `HeartIcon` / `ManaIcon` / `HealthBar` / `ManaBar` render the separate **16×16 GUI spritesheet** (`GUI_FRAMES` keys like `heartFull`, `manaEmpty`, `sword` — not mega-atlas names). They default to `src="/atlas/GUIAtlas0.png"` and `glowSrc="/atlas/GUIAtlas1.png"`, which are **not** included in this repo — pass your own `src` / `glowSrc` props pointing at GUI sheets you host yourself.
>
> For sprites from the mega atlas (`health icon`, `wizard`, `bright brick wall …`, etc.), look them up via `atlas.byName[name]` and render them as a positioned `<div>` using the same recipe as the HTML example above.

## Autotiling

The repo ships **cardinal-neighbour resolvers** that turn an `{ n, s, e, w }` boolean neighbor mask into the correct atlas sprite name. Import from `src/utils/autotile.js`:

```js
import {
  resolveDawnLikeWallName,           // Objects/Map walls (castle / road family naming)
  resolveDawnLikeBuildingWallName,   // Objects/Wall (brick / mine; suffix order: L R U D)
  resolveDawnLikeDungeonWallName,    // rot.js-style dungeon walls (needs x,y,isWall grid)
  resolveDawnLikeFloorName,
  resolveDawnLikeRiverName,
  resolveDawnLikePoolName,
  resolveDawnLikeForestName,         // 8-way (includes diagonals)
  resolveDawnLikeMountainName,       // blob set
  resolveAutotile,                   // generic, manifest-driven
  AUTOTILE_MANIFESTS,
} from './src/utils/autotile.js';

const name = resolveDawnLikeWallName(
  'bright brick wall',
  { n: true, s: true, e: false, w: true },
  atlas.byName,
);
// → "bright brick wall left right down"
```

All `resolveDawnLike*Name` helpers return a **plain string** (the resolved sprite name). Use `resolveAutotile(manifestId, baseName, neighbors, byName)` directly if you want the richer `{ name, suffix, fallback?, missing? }` object.

### Naming-convention gotchas

These conventions are baked into the atlas; trust the resolvers over hand-rolled string building.

- **`Objects/Wall` family** (`bright brick wall …`, `bright mine wall …`) — suffix tokens are ordered **left → right → up → down**. Use `resolveDawnLikeBuildingWallName`.
- **`Objects/Map` open-path family** (rivers, roads, castle walls) — suffix tokens are ordered **up → down → left → right**. Corners and horizontal-bar T's are literal, but vertical-bar T's (`up down X`) are **E/W-inverted**: `"clear river up down left"` actually branches **right** (N+S+E). Use `resolveDawnLikeRiverName` / `resolveDawnLikeWallName`.
- **Dungeon walls** (`resolveDawnLikeDungeonWallName`) need `(baseName, x, y, isWall, byName)` where `isWall(x,y)` returns boolean and OOB is treated as wall.
- **Mountains** use a 10-sprite **blob** set (`n/s/e/w/ne/nw/se/sw/c/alone`), no T-junctions.

## When to use which sprite-lookup strategy

1. **You know the exact sprite name** → `atlas.byName[name]`.
2. **You're tiling terrain / structures with neighbors** → `resolveDawnLike*Name(...)` from `dawnlike-atlas/autotile`.
3. **You want to browse** → run Storybook locally (`bun install && bun run dev`) or open the [hosted demo](https://lucas-stanford.github.io/dawnlike-atlas/) and visit **DawnLike › Mega Atlas › All Sprites**.
4. **You need the GUI icons** (`health icon`, `mana icon`, `fire icon`, …) → use the React `DawnLikeIcon` / `HealthBar` / `ManaBar` helpers, or look them up by name in `byName`.

## Reference examples in the repo

Working integrations live under `src/` and `stories/`:

- `src/AutotileExample.jsx` — rot.js dungeon, autotiled walls.
- `src/OutdoorExample.jsx` — overworld with biome floors, river, road, bridge, forest canopy.
- `src/TownExample.jsx` — town generation with building walls, doors, furniture, NPCs.
- `src/PhaserExample.jsx` + `src/phaser/` — Phaser 4 roguelike (overworld + town + 3-level dungeon, HUD, save/resume).
- `Example_LLM_Prompts/game-template.md` — a self-contained prompt for handing this repo to an LLM to scaffold a new 2D browser game.

## License & credits

Sprite art: **DragonDePlatino** & **DawnBringer** — DawnLike (CC-BY 4.0). Atlas packing, metadata, semantic tooling, and autotile resolvers are layered on top under the same license.
