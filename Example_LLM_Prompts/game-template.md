# Build a 2D browser game on dawnlike-atlas

Build the game described below in **Your game idea** using the
[lucas-stanford/dawnlike-atlas](https://github.com/lucas-stanford/dawnlike-atlas)
toolkit: a 32×32 sprite atlas (~4,157 sprites — nearest-neighbour 2× of
the original 16×16 DawnLike art), manifest-driven overworld / town /
dungeon generators, autotile resolvers, and a reference Phaser game
wiring it all together.

---

## Your game idea

<<<
INSERT YOUR GAME IDEA HERE.

A sentence or a paragraph — genre, what the player does, anything
distinctive.
>>>

---

## What to fetch

- **Atlas** (required — drop in `atlas/`): [`DawnlikeAtlas.json`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas.json), [`DawnlikeAtlas0.png`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas0.png), [`DawnlikeAtlas1.png`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas1.png) + the [sprite naming guide](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/atlas/DawnlikeAtlas.instructions.md). Atlas 0 holds primary frames; atlas 1 holds the alt frame for every `isAnimated` sprite (rivers, torches, water, lava, …).
- **Generators** (optional, take what you need): [`world.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/generators/world.js) ([docs](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/WorldManifest.mdx)), [`town.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/generators/town.js) ([docs](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/TownManifest.mdx)), [`dungeon.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/generators/dungeon.js) ([docs](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/DungeonManifest.mdx)).
- **Helpers**: [`autotile.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/utils/autotile.js) (corner/edge sprite picker), [`autotileRender.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/autotileRender.js) (map → sprite layers), [`hud.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/ui/hud.js) (9-slice frame, gauges, hearts).
- **Reference examples** — copy or mine the one(s) closest to your idea:
  - **Overworld / wilderness** → [`src/OutdoorExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/OutdoorExample.jsx) (50×40 React map: simplex biomes, autotiled roads/rivers/bridges, forests, mountains)
  - **Town / settlement** → [`src/TownExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/TownExample.jsx) (perimeter wall, building archetypes, bank vault, signs, flowers)
  - **Dungeon / cave / maze** → [`src/DungeonExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/DungeonExample.jsx) (six rot.js map algorithms, atlas-driven style picker)
  - **Combat arena / ambush map** → [`src/ArenaExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/ArenaExample.jsx) (noisy obstacle ring, four obstacle kinds, themed presets, hazards)
  - **HUD / menus / dialog / inventory** → [`src/MenuExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/MenuExample.jsx) (9-slice frame, segmented gauges, hearts, typewriter, inventory grid)
  - **Full Phaser game wiring** → [`src/phaser/`](https://github.com/lucas-stanford/dawnlike-atlas/tree/master/src/phaser) + [`src/PhaserExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/PhaserExample.jsx) (overworld + town + 3-level dungeon, bidirectional exits, localStorage save/resume, HUD)
  - **Mobile / touch controls** → virtual joystick + action button via [nipplejs](https://www.npmjs.com/package/nipplejs) (see the *Mobile / touch support* section below — adds touch input without touching the desktop input layer)

## Rules

### Atlas usage (non-negotiable)

**Every visible pixel of gameplay art must come from `DawnlikeAtlas.json` + `DawnlikeAtlas0.png` / `DawnlikeAtlas1.png`.** No exceptions for terrain, characters, items, HUD icons, doors, props, effects, projectiles, particles, cursors, or decorations.

- Load `DawnlikeAtlas.json` once at boot and resolve every sprite through `atlas.byName[<name>]` (or filter `byName` entries by their `tags`). Never reference frames by numeric index, never hand-author `{x, y, w, h}` rectangles, never assume the atlas grid is uniform.
- Honour `w` / `h` from each lookup; every current frame is 32×32 (`meta.tile`), but treat `sprite.w`/`sprite.h` as the source of truth with `TILE` (32) as the fallback so future oversized sprites still render correctly. Render at integer pixel positions; do not stretch or rotate sprites away from their native size unless the design explicitly calls for it.
- Sprites with `isAnimated: true` have a second frame in atlas 1 — register a 2-frame animation keyed `anim:<name>` at ~3 fps in boot and use it for rivers, torches, water, lava, etc.
- Before adding anything new to the scene, **search the atlas first**: scan `byName` keys and `tags` for something that fits (`grep`-style filter on tags like `weapon`, `potion`, `door`, `tree`, `chest`, `floor`, `wall`, `monster`, `npc`, `gui`, `effect`). The atlas ships ~4,157 sprites across characters, items, objects, and GUI — assume the sprite you want is already there.
- If you genuinely cannot find a fit, pick the closest atlas sprite and reuse it; **do not** substitute placeholder art. Specifically: no `Graphics.fillRect` / `Graphics.fillCircle` for game objects, no inline SVG for sprites/world art, no emoji or unicode glyphs as sprites, no procedurally generated textures, no externally fetched images, no tinted recolours beyond what already exists in the atlas, no AI-generated assets, no "TODO sprite" rectangles.
- The only acceptable non-atlas pixels are: solid background fills behind the camera, the 9-slice HUD frame built from `hud.js`, text rendered through Phaser's bitmap / web fonts for labels, numbers, and dialog copy, and **[lucide](https://lucide.dev/) icons** for non-gameplay UI chrome only (toolbar buttons, menu affordances, settings toggles, close/back/help glyphs, debug overlays). Install via `npm install lucide-react` (React/DOM) or `lucide` (vanilla); render at 16 / 20 / 24 px next to text — never as in-world entities, never on the Phaser canvas in place of an atlas sprite, never for anything an atlas sprite already covers (e.g. don't reach for `lucide-react`'s `Heart` when `health icon` exists).

### Engine + flow

- **Phaser 4 is required** for any canvas-rendered build. Install with `npm install phaser@^4 rot-js` (the `^4` is non-negotiable — do not pin, downgrade to, or import Phaser 3 / 3.x packages, `phaser-ce`, `phaser3-rex-plugins`, or any other v3-era plugin). The reference `src/phaser/` wiring targets the v4 API (scenes, `this.add.sprite`, `this.anims.create`, `this.physics.add`, `Phaser.Scale.NONE`, etc.); use those APIs verbatim. The only acceptable way to skip Phaser entirely is to go pure React/DOM — in which case `phaser` is not installed at all.
- Verify the installed version (`require('phaser').VERSION` should start with `4.`) and import from the `phaser` package directly; never copy-paste Phaser 3 tutorials, CDN snippets, or `Phaser.Game` boilerplate that predates v4.
- Drop `rot-js` only if you don't need its RNG / maps / path-finding.
- Pixel art on: `Phaser.AUTO` + `Phaser.Scale.NONE` + `pixelArt: true`.
- Each generator returns `walkable(x, y)` — use it as-is.
- Exit tiles are tagged via `tile.marker`; on contact, transition and spawn the player **adjacent** to the destination marker (never on it).
- Persist a single root seed in `localStorage` so reloads are deterministic.

Reuse the toolkit aggressively; only build what your idea actually needs.

---

## Component deep-dives

The sections below are optional. Include the one(s) that match the
piece(s) of your game you actually want to build — each describes the
relevant reference example in enough detail to recreate it standalone.

<!-- BEGIN:overworld -->
### Overworld / wilderness map

Mirrors [`src/OutdoorExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/OutdoorExample.jsx)
(see the *Examples › Outdoor Wilderness* story). A 50×40 React tile map
with simplex-noise biomes, a meandering road, a single-line river with
a bridge where it crosses the road, scattered mountain ranges, and
autotiled forests sitting on the ground layer.

**Highlights**

- Simplex-noise biome map with switchable terrain, dirt patch, road,
  river, tree, and mountain sprite styles.
- Autotiled rivers and roads, with a bridge sprite at the crossing.
- Ground-under-forest layering so trees sit on the selected terrain
  rather than a separate dirt patch.
- Hover tooltip showing the resolved sprite name; click-to-pin sprite
  picker for overriding bad autotile picks.

**Files to read**

| File | What it does |
| --- | --- |
| [`src/utils/autotile.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/utils/autotile.js) | All cardinal-neighbour resolvers used by the overworld: `resolveDawnLikeFloorName`, `resolveDawnLikeWallName`, `resolveDawnLikeRiverName`, `resolveDawnLikeForestName`, `resolveDawnLikePoolName`, `resolveDawnLikeMountainName`. Read its docstrings — river / wall naming has gotchas. |
| [`src/Autotile.css`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/Autotile.css) | Shared styles for the hover/pin overlay and gear-panel controls. |
| [`src/OutdoorExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/OutdoorExample.jsx) | The component to recreate. ~750 lines: biome noise, road carving, river path, bridge placement, forest seeding, render loop, sprite-picker UI. |

For reference, the stories that mount it:
[`stories/Outdoor.stories.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/Outdoor.stories.jsx)
and the demon-themed preset
[`stories/ChaosWastes.stories.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/ChaosWastes.stories.jsx).

**Recreation steps**

1. Fetch `DawnlikeAtlas.json` once on mount; keep it in state.
2. Seed the RNG from a `seed` prop (`ROT.RNG.setSeed(seed)` and `new ROT.Noise.Simplex()`).
3. Biomes from simplex noise: thresholds map noise to `grass`, `dirt`, `mountain`, etc.
4. Road: pick two edges, carve a meandering path biased toward noise valleys.
5. River: same idea, one tile wide; lay a `bridge` tile wherever it crosses the road.
6. Mountains: place clumps where the high-noise threshold fires; resolve with `resolveDawnLikeMountainName` (4-way blob).
7. Trees: forest is a set of `tree` cells; pick sprites with `resolveDawnLikeForestName` (8-way).
8. Render layers in order: terrain → dirt patch → road / river → forest. Look up by name in `atlas.byName`, honour `sprite.w` / `sprite.h`.
9. Tooltip on hover, pinned panel on click.

**Verification**

- 50×40 grid of 32×32 tiles; at least three terrain types visible.
- Road snakes between edges with correct corner / T sprites.
- River crosses the road and renders a bridge at the crossing.
- Forest patches have rounded edges (no square boundaries).
- Same `seed` reproduces the same map exactly.
<!-- END:overworld -->

<!-- BEGIN:town -->
### Town / settlement

Mirrors [`src/TownExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/TownExample.jsx)
(see the *Examples › Town* story). A 45×30 town with a stone-brick
perimeter wall, a main brick road plus narrower stone side streets,
archetype buildings (house, inn, pub, smithy, church, shop, plus a
guaranteed bank with vault loot), hanging signs, doorway plants, and
ground flowers / trees on the unpaved grass.

**Highlights**

- Building archetypes drive furniture set, sign sprite, and rug colour.
- Mandatory bank with a vault room behind the counter, randomly populated from `VAULT_LOOT` (chests, safes, gold piles, gems).
- Autotiled walls and floors via `resolveDawnLikeWallName` (perimeter) and `resolveDawnLikeDungeonWallName` (thicker building walls).
- Tree + flower scatter on the grass margins, with autotiled forest edges via `resolveDawnLikeForestName`.
- Storybook controls for grass / wall / street / building counts, flower density, graveyard chance.

**Files to read**

| File | What it does |
| --- | --- |
| [`src/utils/autotile.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/utils/autotile.js) | `resolveDawnLikeWallName`, `resolveDawnLikeDungeonWallName`, `resolveDawnLikeFloorName`, `resolveDawnLikeForestName`. |
| [`src/Autotile.css`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/Autotile.css) | Tooltip / picker styles shared with the other map examples. |
| [`src/TownExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/TownExample.jsx) | The component to recreate. ~1300 lines: layout, building placement, furniture, signs, flora, render loop, sprite-picker. |
| [`stories/Town.stories.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/Town.stories.jsx) | How the story exposes props as controls. |

Phaser port (smaller, exit-aware):
[`src/phaser/generators/town.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/generators/town.js)
([docs](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/TownManifest.mdx)).

**Recreation steps**

1. Fetch the atlas; seed `ROT.RNG` from the `seed` prop.
2. Lay the grass floor first, scattered with optional trees + flowers.
3. Stamp the perimeter wall (1-tile autotiled wall ring); carve a single gap for the main road. Two thinner stone streets cross it perpendicular.
4. Force-place the **bank** first; pick a footprint big enough for a `~3×3` vault room behind the counter. Populate vault tiles by sampling from `VAULT_LOOT`.
5. Randomly place remaining buildings from `BUILDING_TYPES`, spaced apart by `buildingSpacing`. For each pick: sign sprite from `TYPE_SIGN` (residential houses get no sign), rug from `TYPE_RUG`, archetype furniture (counters, kegs, anvils, altars, …), door-side plant from `DOOR_PLANTS`.
6. Optionally place a graveyard cluster (chance = `graveyardChance`).
7. Render layers: grass → flowers → streets → walls → building floors → furniture → roof signs → players/NPCs.

**Verification**

- 45×30 town with a stone perimeter and an obvious main road.
- At least 5 distinct buildings, each with its own furniture set.
- Exactly one bank exists; behind the counter the vault is full of chests, coin piles, and gleaming gems.
- Non-residential buildings have a door-side sign; houses have none.
- Grass margins have scattered flowers + trees with autotiled forest edges.
- Wall corners and T-junctions pick the right sprite.
- Same `seed` reproduces the same town exactly.
<!-- END:town -->

<!-- BEGIN:dungeon -->
### Dungeon / cave / maze

Mirrors [`src/DungeonExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/DungeonExample.jsx)
(see the *Examples › Dungeon* story). A React playground that switches
between six rot.js map algorithms — Digger, Uniform, Cellular,
DividedMaze, IceyMaze, EllerMaze — and any wall / floor sprite family
in the atlas, with a click-to-pin sprite picker for fixing autotile
mispicks.

**Highlights**

- All six rot.js generators behind a dropdown.
- Cellular controls (initial density %, smoothing passes) exposed separately because cellular is the only stochastic one that benefits from them.
- Wall + floor style discovery from the atlas (anything tagged `wall` with `sourceFile: Objects/Wall` becomes a pickable wall family).
- Rot.js-style dungeon-wall autotile via `resolveDawnLikeDungeonWallName` (treats OOB as wall; requires a surface-wall + lateral / vertical open check, not a flood fill).
- Click-to-pin sprite picker with a paste-ready override log for reporting bad autotile picks.

**Files to read**

| File | What it does |
| --- | --- |
| [`src/utils/autotile.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/utils/autotile.js) | `resolveDawnLikeFloorName` and `resolveDawnLikeDungeonWallName`. The dungeon-wall resolver has a long docstring on the "wall = solid tile, treat OOB as wall" convention. |
| [`src/Autotile.css`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/Autotile.css) | Tooltip / picker styles shared with the other map examples. |
| [`src/DungeonExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/DungeonExample.jsx) | The component to recreate. ~500 lines. |
| [`stories/Dungeon.stories.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/Dungeon.stories.jsx) | Story wiring (controls panel). |

Phaser dungeon used in the roguelike example:
[`src/phaser/generators/dungeon.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/generators/dungeon.js)
([docs](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/DungeonManifest.mdx)).

**Recreation steps**

1. Fetch the atlas; keep it in state.
2. Discover available styles from the atlas: `discoveredWalls` = every base name from sprites tagged `wall` with `sourceFile === 'Objects/Wall'` (strip autotile suffix tokens); `discoveredFloors` = every base name from sprites with `sourceFile === 'Objects/Floor'`, excluding `empty`.
3. Build a `MAP_TYPES` table listing the six rot.js classes + a `label`.
4. On every change to `mapType` / `seed` / `width` / `height` / cellular knobs, regenerate. For `Cellular`: `randomize(initialDensity/100)` then run `create()` `smoothPasses` times. For the others: `create((x, y, value) => map[y][x] = value)`.
5. Render two layers per tile: floor (always) + wall (when `map[y][x] === 1`). Walls = `resolveDawnLikeDungeonWallName`; floors = `resolveDawnLikeFloorName`.
6. Hover + click-to-pin overlay; when pinned, show a swatch picker of every sprite sharing the tile's base name.

**Verification**

- Default Digger dungeon, 40×30, walls = bright mine wall, floor = day brick floor.
- Each of Uniform / Cellular / DividedMaze / IceyMaze / EllerMaze produces a recognisably different layout.
- Cellular density + smoothing sliders change the cave shape live.
- All wall corners and T-junctions pick the right sprite.
- Hover shows resolved sprite name; click pins the picker and lists every alternative.
- Same `seed` reproduces the same dungeon exactly for any map type.
<!-- END:dungeon -->

<!-- BEGIN:arena -->
### Combat arena / ambush map

Mirrors [`src/ArenaExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/ArenaExample.jsx)
(see the *Examples › Arena* story). A small outdoor map (24×18 by
default) with a noisy perimeter ring of obstacles, an entry trail from
one side, and a scatter of interior cover so combat has line-of-sight
breaks.

**Highlights**

- Theme presets — forest ambush, desert canyon, volcanic pit, swamp clearing, ruined courtyard, chaos circle — just remap four sprite fields; topology is identical for every preset.
- Switchable obstacle kind: `tree` (8-way forest autotile), `mountain` (4-way blob), `wall` (rot.js dungeon wall), or `sprite` (flat single-frame: bones, rocks, pillars — does not merge with neighbours).
- Noisy ring: simplex noise drives whether a perimeter candidate is solid, so the boundary has organic gaps and bulges.
- Hazard scatter with configurable density (lava, spikes, poison).
- Entry trail from one of the four sides.

**Files to read**

| File | What it does |
| --- | --- |
| [`src/utils/autotile.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/utils/autotile.js) | Every resolver the four obstacle kinds need. |
| [`src/Autotile.css`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/Autotile.css) | Shared tooltip / picker styles. |
| [`src/ArenaExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/ArenaExample.jsx) | The component to recreate. ~400 lines. |
| [`stories/Arena.stories.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/Arena.stories.jsx) | The preset table — read it for the exact sprite names each theme maps to. |

**Recreation steps**

1. Fetch the atlas; seed `ROT.RNG`; create one `ROT.Noise.Simplex()`.
2. Initialise a `W × H` grid of `{ obstacle, decor, trail, hazard }` cells.
3. **Noisy obstacle ring** — for each tile, compute its inward edge distance. Within `ringThickness`: `edgeDist === 0` → always solid (the outermost row/col bounds the arena); otherwise sample simplex noise biased toward "solid" the closer to the edge (`edgeBias = 1 - edgeDist / (ringThickness + 1)`).
4. **Entry trail** — from one of the four `entrySide`s, carve a straight line of `trail = true` tiles to the centre, clearing obstacles in its path.
5. **Interior cover** — scatter a few extra obstacles inside the ring at low density.
6. **Hazards** — for each non-obstacle tile, roll against `hazardDensity`; if it hits, set `hazard = hazardSprite`.
7. Render in layers: ground → trail → hazard → obstacle. Pick obstacle sprite from `OBSTACLE_KIND_INFO[obstacleKind].autotile`.

**Verification**

- 24×18 arena, forest-themed by default.
- Perimeter ring is closed but has organic gaps — not a perfect rectangle.
- Switching `obstacleKind` between the four kinds uses the right resolver and looks correctly autotiled.
- Entry trail enters from the configured side.
- Interior has a small scatter of cover obstacles.
- Raising `hazardDensity` adds visible hazard tiles.
- Switching presets only changes sprite families — topology is identical for the same seed.
- Same `seed` reproduces the same arena exactly.
<!-- END:arena -->

<!-- BEGIN:hud-menu -->
### Chrome HUD + menu toolkit

Mirrors [`src/MenuExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/MenuExample.jsx)
(see the *Examples › Menu* story). A React component (~1000 lines) with
the building blocks every DawnLike game needs for its UI: 9-slice
frames, segmented gauges, heart icons, typewriter dialogs, an
inventory grid, and a simple title-screen layout — all rendered from
atlas sprites.

**Highlights**

- 9-slice `<Frame>` with a swappable family (`gray white`, `red black`, …). The atlas only provides `nw / n / ne / w / c / e / square` — the component flips the top row vertically for the bottom corners/edges to get a clean rectangular border.
- Segmented `<Gauge>` for HP / MP / stamina: colored fill under a chrome frame. Each segment picks between `full`, `most`, `half`, `low` based on the fill fraction.
- Heart sprite helper that renders full / half / empty hearts.
- Typewriter dialog (`useTypewriter`) for NPC speech.
- Inventory grid using the framed cells.
- HUD icons live under names like `health icon`, `stamina icon`, `save icon`, `inventory icon` — honour `sprite.w` / `sprite.h` from the lookup so any future oversized icons render correctly.

**Files to read**

| File | What it does |
| --- | --- |
| [`src/Menu.css`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/Menu.css) | Styles for the menu screens (backgrounds, font sizes, layout). |
| [`src/MenuExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/MenuExample.jsx) | The component to recreate. Read the comments — each primitive is in its own clearly-marked block. |
| [`stories/Menu.stories.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/Menu.stories.jsx) | Story wiring. |
| [`src/phaser/ui/hud.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/ui/hud.js) | Phaser port of the same primitives (`drawFrame`, `drawGauge`, `heartSprite`). |

**Recreation steps**

1. Fetch the atlas; keep it in state.
2. Write a `<Sprite>` primitive that renders any named atlas sprite as a positioned background-image on a `<div>`. Honour the sprite's `w` / `h` (every current frame is 32×32, but read it from the lookup with `TILE` as fallback). Support `flipX` / `flipY` via CSS transform.
3. Write `<Frame w h family>`: for every cell pick the right 9-slice part (`nw`, `n`, `ne`, `w`, `c`, `e`) and `flipY` for the bottom row. Sprite name = `` `${family} ${part}` ``.
4. Write `<Gauge color value segments>`: two passes — colored fill (`gauge <color> full|most|half|low` per segment) under chrome frame (`gauge chrome left|center|right`). For each segment, compute `frac = (value − segStart) / segWidth` and pick the level by quartile.
5. Write a `heartSprite(hp, maxHp)` helper that lays out full / half / empty heart sprites.
6. Write a `useTypewriter(text, speed)` hook that reveals `text` one character at a time via `setInterval`.
7. Compose a small demo screen showing every primitive: title text on a framed background, a row of gauges, a heart row, a typewriter dialog box, and a 4×4 inventory grid of framed cells.

**Verification**

- Title screen with a chrome-framed background.
- `<Frame>` renders cleanly for any `w × h` ≥ 2×2 with no visible seams.
- `<Gauge>` shows full segments at `value = 1`, empty at `value = 0`, partial last segment for in-between values.
- Heart row renders the correct mix of full / half / empty hearts for `hp = maxHp`, `hp = maxHp − 1`, `hp = maxHp / 2`, `hp = 0`.
- Typewriter dialog reveals text one character at a time.
- Inventory grid shows 16 framed cells.
- Switching the frame `family` prop swaps the chrome colour without breaking layout.
- Every sprite (including GUI icons) renders at its declared `sprite.w` × `sprite.h` rather than being squashed or stretched.
<!-- END:hud-menu -->

<!-- BEGIN:phaser-wiring -->
### Full Phaser game wiring (overworld + town + dungeon + HUD + save)

Mirrors [`src/PhaserExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/PhaserExample.jsx)
and `src/phaser/` (see the *Examples › Phaser Roguelike* story). A
small explorable [Phaser 4](https://phaser.io/) game tying every piece
together: an overworld (40×30), a town (32×24), a 3-level dungeon,
working bidirectional exits, asset preloading, `localStorage`
save/resume, sprite animations, a chrome-framed HUD, and hold-to-walk
movement.

**Highlights**

- All maps generated from a single root seed; reload → same world, same room, same tile.
- Sprite animations registered automatically for every sprite tagged `isAnimated: true`.
- Chrome HUD sits in its own band above the play area so it never covers the map.
- Working bidirectional exits between every map (no dead ends, no re-entry crashes).

**Prerequisites**

```bash
npm install phaser@^4 rot-js
```

**Files to read first**

| File | What it does |
| --- | --- |
| [`src/utils/autotile.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/utils/autotile.js) | Cardinal-neighbor resolvers for walls, floors, rivers, forests, dungeon walls. The generators emit `kind: 'wall' \| 'floor' \| 'river' \| 'forest' \| 'dungeonWall'` and the renderer calls these resolvers to pick the right atlas frame. |
| [`src/MenuExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/MenuExample.jsx) | Reference for the HUD chrome (9-slice `<Frame>`, `<Gauge>`, `heartSprite`, typewriter, inventory). The Phaser HUD ports these. |

**Core game files (recreate these in `src/phaser/`, order matters — later files import from earlier ones)**

| File | Purpose |
| --- | --- |
| [`src/phaser/save.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/save.js) | `localStorage` schema `dawnlike:roguelike:v1`. Bootstraps a single random `seed` on first load; exposes `load`, `save`, `reset`, `seedFor(key, root)`. Per-scene seeds: `World=root`, `Town=root+1`, `Dungeon{N}=root+100+N`. |
| [`src/phaser/autotileRender.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/autotileRender.js) | `renderWorldTile / renderTownTile / renderDungeonTile` — return layered sprite-name lists for a single map cell. |
| [`src/phaser/generators/world.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/generators/world.js) | 40×30 overworld: simplex-noise biomes, road, river with bridge, town + dungeon markers. **After** placing the dungeon marker, uses `ROT.Path.Dijkstra` to carve a passable corridor from the dungeon to the nearest road, bridging rivers as needed. |
| [`src/phaser/generators/town.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/generators/town.js) | 32×24 town: stone-brick perimeter wall with a single gap on the road; wider main brick road + narrower stone side streets; shops (full-width counters + chests behind) and houses; a `worldExit` marker on the perimeter gap. |
| [`src/phaser/generators/dungeon.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/generators/dungeon.js) | 36×26 dungeon level via `ROT.Map.Digger`. `stairsUp` near a room; `stairsDown` in a different room. **Level 3 has no `stairsDown`**. |
| [`src/phaser/scenes/BootScene.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/scenes/BootScene.js) | Preloads `DawnlikeAtlas0.png` and `DawnlikeAtlas1.png` as two atlases sharing the JSON; registers a 2-frame anim `anim:<spritename>` at ~3 fps for every `isAnimated` sprite. Launches the UI scene, then routes to the saved scene. |
| [`src/phaser/scenes/MapScene.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/scenes/MapScene.js) | The shared base. Tile grid, player spawn, arrow/WASD input (tap and hold-to-walk via `update()` polling), camera viewport + zoom, marker detection, scene transitions, marker-tile crash fix. |
| [`src/phaser/scenes/WorldScene.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/scenes/WorldScene.js) | Extends `MapScene`. Routes `town` → TownScene, `dungeon` → Dungeon1. |
| [`src/phaser/scenes/TownScene.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/scenes/TownScene.js) | Extends `MapScene`. Routes `worldExit` → WorldScene. Spawns player **adjacent** to the entry marker. |
| [`src/phaser/scenes/DungeonScene.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/scenes/DungeonScene.js) | Extends `MapScene`. One class for all three levels (`Dungeon1/2/3`); `stairsUp` on level 1 returns to World. `adjacentTo()` helper picks a walkable non-marker 4-neighbor so stairs never land you back on a marker. |
| [`src/phaser/scenes/UIScene.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/scenes/UIScene.js) | The HUD scene. Top-band layout (96px strip above the map): HP/MP gauges, heart icon, area label, "New Game" button. Camera viewport locked to the top band. Exports `HUD_HEIGHT = 96`. |
| [`src/phaser/ui/hud.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/ui/hud.js) | Phaser port of `MenuExample.jsx`'s chrome: `drawFrame` (9-slice + `flipY` for the bottom row), `drawGauge`, `heartSprite`. |
| [`src/phaser/index.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/index.js) | `createGame(parent)` — wires Phaser config: `Phaser.AUTO`, `Phaser.Scale.NONE`, pixel art on, the seven scenes (`Boot, UI, World, Town, Dungeon1, Dungeon2, Dungeon3`). Attaches `window.__phaserGame = game` for testing. |
| [`src/PhaserExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/PhaserExample.jsx) | Thin React wrapper: mounts a `<div>` of size 800×696 (96 HUD + 600 map), calls `createGame(parent)`, destroys on unmount. |

**Critical design notes**

- **Camera viewport** is offset down by `HUD_HEIGHT` so the HUD has its own band. Atlas tiles are 32px native; no extra camera zoom is needed.
- **Hold-to-walk:** in `update()`, poll `cursors.X.isDown` / `wasd.X.isDown` and call `tryMove` if not already moving. A `this.moving` flag rate-limits to one step per ~70ms tween.
- **Marker-tile crash fix (critical):** in `tryMove`'s `onComplete`, if the new tile has a marker, save `sourceTile` (the tile the player came from) as the scene's last position — **not** the marker tile. On scene re-entry, `resolveSpawn` rejects any saved position that lands on a marker. **Do not** auto-fire `handleMarker` in `create()` on the spawn tile. Together these stop the "re-entry → marker fires → infinite loop" crash.

**Verification**

- Canvas is 800×696 with a chrome HUD band in the top 96px.
- Player visible on the overworld; HP/MP gauges render; area label shows "Overworld".
- Arrow keys / WASD step the player one tile per press; holding walks continuously (~14 tiles/sec).
- Stepping onto the town-entrance tile loads TownScene; exiting returns the player next to the town entrance.
- Re-entering the town does not crash.
- Dungeon entrance reachable on the overworld (Dijkstra-carve corridor + bridge).
- Dungeon level 1 has both `stairsUp` (→ world) and `stairsDown` (→ level 2). Stairs work in both directions.
- Dungeon level 3 has **no** `stairsDown`.
- Reload: same seed, same world, player on the same tile in the same scene.
- "New Game" button clears `localStorage` and reloads.
- HUD never overlaps the playable map.
<!-- END:phaser-wiring -->

<!-- BEGIN:mobile -->
### Mobile / touch support (nipplejs virtual joystick)

Add a virtual on-screen joystick so the game plays on phones and
tablets without keyboard input. Uses
[nipplejs](https://www.npmjs.com/package/nipplejs) — a small (~12 KB),
zero-dependency vanilla-JS joystick library — and feeds its direction
events into the same `tryMove(dx, dy)` API the keyboard handler in
`MapScene.js` already uses, so no game logic has to change.

**Highlights**

- Virtual joystick (left-hand thumb) drives 4-direction movement at
  the same ~70ms-per-tile cadence as hold-to-walk on desktop.
- Joystick only mounts on touch-capable devices (`'ontouchstart' in window || navigator.maxTouchPoints > 0`), so desktop users never see a stray overlay.
- Optional right-hand action button (tap = "interact / confirm") for
  triggering markers, opening menus, etc. without a keyboard.
- Sits in its own absolutely-positioned overlay `<div>` above the
  Phaser canvas — no Phaser-specific plumbing, works for the pure
  React examples too.
- Joystick dead-zone (~20% of radius) prevents jitter; reading
  `Math.abs(force.x) > Math.abs(force.y)` picks the dominant axis so
  diagonals snap to one cardinal step at a time (matches keyboard
  behavior).

**Prerequisites**

```bash
npm install nipplejs
```

**Files to read first**

| File | What it does |
| --- | --- |
| [`src/phaser/scenes/MapScene.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/scenes/MapScene.js) | The desktop input layer (cursors + WASD + hold-to-walk via `update()` polling) you'll mirror for touch. Note the `this.moving` rate-limit and `tryMove(dx, dy)` signature — feed the joystick into the same method. |
| [`src/PhaserExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/PhaserExample.jsx) | The React mount point. Add the joystick `<div>` siblings to the Phaser canvas container here so they share the same parent and stacking context. |
| [nipplejs README](https://github.com/yoannmoinet/nipplejs#options) | Official options reference — `mode`, `position`, `color`, `size`, `threshold`. |

**Recreation steps**

1. `npm install nipplejs`.
2. Detect touch: `const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);`. Skip the rest on desktop.
3. In `PhaserExample.jsx` (or your equivalent mount point), render two absolutely-positioned overlay `<div>`s above the canvas: `<div id="dawnlike-joystick">` (bottom-left, ~120×120) and `<div id="dawnlike-action">` (bottom-right, ~80×80, a plain `<button>`). Use `pointer-events: auto` on each, `pointer-events: none` on a wrapping container so the rest of the page stays clickable.
4. After `createGame(parent)` resolves, create the joystick:
   ```js
   import nipplejs from 'nipplejs';
   const joystick = nipplejs.create({
     zone: document.getElementById('dawnlike-joystick'),
     mode: 'static',
     position: { left: '60px', bottom: '60px' },
     color: 'white',
     size: 120,
     threshold: 0.2, // dead-zone
   });
   ```
5. Translate joystick events into a `{ dx, dy }` intent that the scenes can poll. Store it on `window.__dawnlikeTouchIntent = { dx: 0, dy: 0 }` (or `game.registry.set('touchIntent', …)`).
   ```js
   joystick.on('move', (_evt, data) => {
     if (!data.direction) return; // inside dead-zone
     const a = data.angle.radian;
     // Snap to cardinals: dominant axis wins.
     const dx = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? Math.sign(Math.cos(a)) : 0;
     const dy = dx === 0 ? -Math.sign(Math.sin(a)) : 0; // screen Y is inverted
     window.__dawnlikeTouchIntent = { dx, dy };
   });
   joystick.on('end', () => { window.__dawnlikeTouchIntent = { dx: 0, dy: 0 }; });
   ```
6. In `MapScene.update()`, after the existing keyboard polling, also poll the touch intent and call `tryMove` exactly like the keyboard does:
   ```js
   const touch = window.__dawnlikeTouchIntent;
   if (touch && (touch.dx || touch.dy) && !this.moving) {
     this.tryMove(touch.dx, touch.dy);
   }
   ```
7. Wire the action button to whatever the keyboard's Enter/Space already triggers (`handleMarker` on the current tile, menu confirm, etc.):
   ```js
   document.getElementById('dawnlike-action').addEventListener('click', () => {
     window.dispatchEvent(new CustomEvent('dawnlike:action'));
   });
   ```
   Then `this.input.keyboard.on('keydown-ENTER', ...)` and a `window.addEventListener('dawnlike:action', ...)` call the same handler in the scene.
8. On scene shutdown / `useEffect` cleanup, `joystick.destroy()` and remove the action-button listener so a React re-mount doesn't stack joysticks.
9. Add a CSS `@media (hover: hover) and (pointer: fine) { #dawnlike-joystick, #dawnlike-action { display: none; } }` as a belt-and-braces hide on desktop browsers.

**Verification**

- On a desktop browser the joystick and action button are not rendered (touch detection skips the mount, and the CSS media query hides them if they slip through).
- On a touch device (or with Chrome devtools "Toggle device toolbar"), a white joystick appears bottom-left and an action button appears bottom-right.
- Dragging the joystick steps the player one tile per ~70ms in the dominant cardinal direction (no diagonal stutter).
- Releasing the joystick stops movement immediately.
- The action button fires the same handler as Enter/Space (opens a sign, triggers a marker, confirms a menu).
- The joystick does not block the rest of the page from receiving clicks/scrolls outside its overlay.
- React re-mount (Storybook story switch, HMR) does not leave a stale joystick on the page.
<!-- END:mobile -->
