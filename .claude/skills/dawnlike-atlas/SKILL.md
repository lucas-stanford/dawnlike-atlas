---
name: dawnlike-atlas
description: Use the `dawnlike-atlas` repo — a bin-packed 32×32 mega-atlas of the DawnLike roguelike tileset with semantic name lookup, AI-generated tags, and 16-way autotile resolvers. Invoke when building 2D pixel-art / roguelike games (HTML/Canvas, React, Phaser 3/4) that need DawnLike sprites, animated 2-frame walks, or autotiled walls / floors / rivers / pools / forests / mountains.
---

# dawnlike-atlas

A semantic mega-atlas for the [DawnLike](https://dragondeplatino.itch.io/dawnlike) tileset (CC-BY 4.0). Sprites are stored at **32×32** (a strict 2× nearest-neighbour upscale of the original 16×16 art, so every source pixel becomes a clean 2×2 block).

- **4,456 sprites** packed into a single `2048×2240` PNG (`64×70` grid). 4,157 are original DawnLike art; the remaining 299 are generated — 235 `* shore` coastline tiles and 64 `* watered field` soil tiles.
- Companion `DawnlikeAtlas1.png` provides the alt frame for the 1,258 animated sprites.
- `DawnlikeAtlas.json` gives semantic name lookup + tags + a legacy index map.
- Pure JS autotile resolvers for walls, floors, rivers, pools, forests, mountains.

Live demo / browser: <https://lucas-stanford.github.io/dawnlike-atlas/>

## Get the assets

Published to npm — install it, or consume the source tree directly (clone, git
submodule, or copy the needed files into your project):

```bash
npm install dawnlike-atlas    # or: bun add dawnlike-atlas
# or:
git clone https://github.com/lucas-stanford/dawnlike-atlas.git
```

From the package:

```js
import { AtlasSprite, useAtlas, searchSprites } from 'dawnlike-atlas';
import { resolveDawnLikeBuildingWallName } from 'dawnlike-atlas/autotile';
import { loadAtlas, spriteStyle } from 'dawnlike-atlas/atlas-api';
import atlas from 'dawnlike-atlas/atlas/DawnlikeAtlas.json';
```

Files you actually need at runtime (raw URLs are from the `master` branch — pin to a commit SHA for reproducibility):

| File | URL | Description |
|---|---|---|
| `atlas/DawnlikeAtlas.json` | <https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas.json> | Atlas metadata. Top-level keys: `meta` (size `2048×2080`, `tile {w:32,h:32}`, `scale:2`, `columns:64`, `rows:65`), `frames` (Phaser-min texture atlas, `{ "<name>": { frame: {x,y,w,h} } }`), `byName` (flat lookup keyed by lowercase human-readable sprite name → `{x,y,w,h,tags[]}`), and `legacyFrames` (legacy numeric index → name, useful when iterating the sheet as a grid). |
| `atlas/DawnlikeAtlas0.png` | <https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas0.png> | Primary mega-atlas spritesheet. `2048×2240` PNG packing all **4,456 sprites** at 32×32 each (a strict 2× nearest-neighbour upscale of the original 16×16 DawnLike art — every source pixel is a clean 2×2 block). This is the sheet you draw from for static sprites. |
| `atlas/DawnlikeAtlas1.png` | <https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas1.png> | Alt-frame spritesheet for the **1,258 animated sprites** (creatures, torches, etc.). Same dimensions and per-sprite coordinates as `DawnlikeAtlas0.png`, so a 2-frame walk animation is just `[atlas0.frame(name), atlas1.frame(name)]` at ~2 fps. Sprites that aren't animated leave their cell blank here. |
| `src/utils/autotile.js` | <https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/src/utils/autotile.js> | Pure-JS autotile resolvers. Exports `resolveDawnLikeWallName`, `resolveDawnLikeBuildingWallName`, `resolveDawnLikeDungeonWallName`, `resolveDawnLikeFloorName`, `resolveDawnLikeRiverName`, `resolveDawnLikePoolName`, `resolveDawnLikeForestName` (8-way), `resolveDawnLikeMountainName` (blob), the generic manifest-driven `resolveAutotile`, and the `AUTOTILE_MANIFESTS` registry. Maps a `{n,s,e,w}` neighbour mask to the correct atlas sprite name. No runtime deps. |
| `src/utils/atlasApi.js` | <https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/src/utils/atlasApi.js> | Framework-agnostic helpers over the atlas JSON. Exports `loadAtlas` (fetch + dedupe + cache), `getSprite`, `hasSprite`, `isAnimated`, `spriteNames`, `spriteTags`, `tagIndex`, `searchSprites`, `spritesByTag`, `autotileFamilies`, `spriteCell`, `nameAtIndex`, `spriteStyle` (CSS bag), `drawSprite` (canvas blit), `pickSprite` (random pick filtered to names that exist), `animationFrames`. No runtime deps. |
| `react/index.js` | <https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/react/index.js> | React-helper barrel. Re-exports `DawnLikeIcon`, `HeartIcon`, `ManaIcon`, `HealthBar`, `ManaBar`, and the `GUI_FRAMES` map. Pure React 19+ components (no other runtime deps). Render the **separate 16×16 GUI spritesheet**, not the mega atlas. |
| `react/icons.jsx` | <https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/react/icons.jsx> | Source of the GUI React helpers. `DawnLikeIcon` is a positioned `<div>` backed by a `GUI_FRAMES[name]` lookup (`scale` prop for integer pixel zoom); `HeartIcon`/`ManaIcon` accept a `fill` count; `HealthBar`/`ManaBar` accept `current`/`max`. Defaults to `src="/atlas/GUIAtlas0.png"` + `glowSrc="/atlas/GUIAtlas1.png"` — **GUI sheets are not in this repo**, so you must pass your own `src`/`glowSrc` props. |
| `react/frames.js` | <https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/react/frames.js> | The `GUI_FRAMES` lookup table. Maps GUI sprite keys (`heartFull`, `heartEmpty`, `manaFull`, `manaEmpty`, `sword`, …) to their `{x,y,w,h}` rect on the 16×16 GUI sheet. Use it directly if you want to render GUI sprites without React. |
| `react/index.d.ts` | <https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/react/index.d.ts> | TypeScript declarations for the React barrel (component prop types + `GUI_FRAMES` keys). |

Copy/serve the two mega-atlas PNGs + JSON as static assets in your app, and import the JS modules from wherever you placed the source tree.

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

const name = resolveDawnLikeBuildingWallName(
  'bright brick wall',
  { n: true, s: true, e: false, w: true },
  atlas.byName,
);
// → "bright brick wall left up down"
```

**Pick the resolver that matches the family.** `bright brick wall` is on the
Objects/Wall sheet, so it needs `resolveDawnLikeBuildingWallName`; calling
`resolveDawnLikeWallName` (which drives the Objects/Map open-path family) on it
returns `"bright brick wall up down"` — a real sprite, but the wrong piece.

Return shapes differ, so destructure accordingly:

| Resolver | Returns |
|---|---|
| `resolveDawnLikeWallName`, `resolveDawnLikeBuildingWallName`, `resolveDawnLikeMountainName` | a plain `string` |
| `resolveDawnLikeDungeonWallName` | a `string`, or `null` for buried interior wall |
| `resolveDawnLikeRiverName` | `{ name }` |
| `resolveDawnLikeFloorName`, `resolveDawnLikeForestName` | `{ name, reason }` |
| `resolveDawnLikePoolName` | `{ name, flipY? }` — honour `flipY` with `transform: scaleY(-1)` |
| `resolveAutotile` | `{ name, suffix, fallback?, missing? }` |

### Naming-convention gotchas

These conventions are baked into the atlas; trust the resolvers over hand-rolled string building.

- **`Objects/Wall` family** (`bright brick wall …`, `bright mine wall …`) — suffix tokens are ordered **left → right → up → down**. Use `resolveDawnLikeBuildingWallName`.
- **`Objects/Map` open-path family** (rivers, roads, castle walls) — suffix tokens are ordered **up → down → left → right**. Corners and horizontal-bar T's are literal, but vertical-bar T's (`up down X`) are **E/W-inverted**: `"clear river up down left"` actually branches **right** (N+S+E). Use `resolveDawnLikeRiverName` / `resolveDawnLikeWallName`.
- **Dungeon walls** (`resolveDawnLikeDungeonWallName`) need `(baseName, x, y, isWall, byName)` where `isWall(x,y)` returns boolean and OOB is treated as wall.
- **Mountains** use a 10-sprite **blob** set (`n/s/e/w/ne/nw/se/sw/c/alone`), no T-junctions.

## When to use which sprite-lookup strategy

1. **You know the exact sprite name** → `atlas.byName[name]`, or `getSprite(atlas, name)` for a null-safe read.
2. **You know roughly what you want** → `searchSprites(atlas, { query, tags })` from `dawnlike-atlas/atlas-api`. Every query word must appear in the name **or** the AI-generated tags, in any order, so `"glowing sword"` and `"brick wall"` both work. `tagIndex(atlas)` lists every tag with its count.
3. **You're picking randomly from a candidate list** → `pickSprite(atlas, candidates, rng)`. It filters to names the atlas actually has and returns `null` rather than a blank tile; pass `ROT.RNG.getUniform` for seeded generation.
4. **You're tiling terrain / structures with neighbors** → `resolveDawnLike*Name(...)` from `dawnlike-atlas/autotile`. Discover the available families with `autotileFamilies(atlas, suffixes, min)` instead of hard-coding a list that can drift from the pack.
5. **You want to browse** → run Storybook locally (`bun install && bun run dev`) or open the [hosted demo](https://lucas-stanford.github.io/dawnlike-atlas/): **Sprite Browser** to search, **Autotile Lab** to understand the resolvers, **Mega Atlas** for the raw packed sheet.
6. **You need the GUI icons** (`health icon`, `mana icon`, `fire icon`, …) → use the React `DawnLikeIcon` / `HealthBar` / `ManaBar` helpers, or look them up by name in `byName`.

## Reference examples in the repo

Working integrations live under `src/` and `stories/`:

- `src/AutotileLabExample.jsx` — interactive playground for every resolver: neighbour pad, full variant sheet, live paint canvas. **Read this first** to understand the resolvers.
- `src/SpriteBrowserExample.jsx` — search all 4,456 sprites by name and tag; also the reference usage of `src/utils/atlasApi.js`.
- `src/DungeonExample.jsx` — rot.js rooms-and-corridors, autotiled walls.
- `src/CaveExample.jsx` — cellular-automata caverns, largest-region flood fill, distance-transform lakes.
- `src/OutdoorExample.jsx` — overworld with biome floors, river, road, bridge, forest canopy.
- `src/IslandExample.jsx` — radial-falloff landmass; pool + floor + forest + mountain resolvers on one map.
- `src/TownExample.jsx` — town generation with building walls, doors, furniture, NPCs.
- `src/SewerExample.jsx` — sludge channel with brick walkways and crossing bridges.
- `src/TacticalCombatExample.jsx` + `src/utils/tactical/` — XCOM-style squad tactics (AP, LOS, cover, flanking).
- `src/PhaserExample.jsx` + `src/phaser/` — Phaser 4 roguelike (overworld + town + 3-level dungeon, HUD, save/resume).
- `Example_LLM_Prompts/game-template.md` — a self-contained prompt for handing this repo to an LLM to scaffold a new 2D browser game.

## License & credits

Sprite art: **DragonDePlatino** & **DawnBringer** — DawnLike (CC-BY 4.0). Atlas packing, metadata, semantic tooling, and autotile resolvers are layered on top under the same license.
