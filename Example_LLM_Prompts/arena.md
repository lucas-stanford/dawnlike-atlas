# Prompt: Recreate the Combat Arena

## Goal

Recreate the small ambush / combat arena from
**[`lucas-stanford/dawnlike-atlas`](https://github.com/lucas-stanford/dawnlike-atlas)**
(see the *Examples › Arena* story in its Storybook). It is a React
component that renders a tiny outdoor map (24×18 by default; tiles are
32×32 — a nearest-neighbour 2× upscale of the original 16×16 DawnLike
art) with a **noisy perimeter ring of obstacles**, a short ambush
trail entering from one side, and a scatter of interior cover so
combat has line-of-sight breaks.

Highlights:

- **Theme presets** — forest ambush, desert canyon, volcanic pit, swamp
  clearing, ruined courtyard, chaos circle — just remap four sprite
  fields; topology is identical for every preset.
- **Switchable obstacle kind**: `tree` (8-way forest autotile),
  `mountain` (4-way blob), `wall` (rot.js-style dungeon wall), or
  `sprite` (flat single-frame: bones, rocks, pillars — does not merge
  with neighbours).
- **Noisy ring**: simplex noise drives whether a perimeter candidate
  tile is solid, so the boundary has organic gaps and bulges.
- **Hazard scatter** with configurable density (lava, spikes, poison).
- **Entry trail** from one of the four sides.

## Prerequisites

Install:

```bash
npm install react rot-js
```

Download the atlas files (raw URLs — fetch and save to `atlas/`):

- [`atlas/DawnlikeAtlas.json`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas.json)
- [`atlas/DawnlikeAtlas0.png`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas0.png)
- [`atlas/DawnlikeAtlas1.png`](https://raw.githubusercontent.com/lucas-stanford/dawnlike-atlas/master/atlas/DawnlikeAtlas1.png)

Atlas naming guide:
- [`atlas/DawnlikeAtlas.instructions.md`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/atlas/DawnlikeAtlas.instructions.md)

## Files to read (in this order)

| File | What it does |
| --- | --- |
| [`src/utils/autotile.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/utils/autotile.js) | `resolveDawnLikeFloorName`, `resolveDawnLikeForestName`, `resolveDawnLikeMountainName`, `resolveDawnLikeDungeonWallName` — every resolver the four obstacle kinds need. |
| [`src/Autotile.css`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/Autotile.css) | Shared tooltip/picker styles. |
| [`src/ArenaExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/ArenaExample.jsx) | The component to recreate. ~400 lines: noise ring, trail carve, interior cover, render loop, hover tooltip. |
| [`stories/Arena.stories.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/Arena.stories.jsx) | The preset table — read it to see exactly which sprite names each theme maps to. |

## Recreation instructions

1. Fetch `DawnlikeAtlas.json`; keep it in state.
2. Seed `ROT.RNG` from the `seed` prop; create one `ROT.Noise.Simplex()`.
3. Initialise a `W × H` grid of `{ obstacle, decor, trail, hazard }`
   cells.
4. **Noisy obstacle ring** — for each tile, compute its inward edge
   distance. If it is within `ringThickness`:
   - `edgeDist === 0` → always solid (the outermost row/col is always
     a wall so the perimeter actually bounds the arena);
   - Otherwise sample simplex noise; bias toward "solid" the closer
     the tile is to the edge (`edgeBias = 1 - edgeDist / (ringThickness + 1)`).
5. **Entry trail** — from one of the four `entrySide`s, carve a
   straight line of `trail = true` tiles to the centre, clearing
   any obstacles in its path.
6. **Interior cover** — scatter a few extra obstacles inside the ring
   at low density so combat has line-of-sight breaks.
7. **Hazards** — for each non-obstacle tile, roll against
   `hazardDensity`; if it hits, set `hazard = hazardSprite`.
8. Render in layers: ground → trail → hazard → obstacle. Pick the
   obstacle sprite from `OBSTACLE_KIND_INFO[obstacleKind].autotile`:
   `tree` → 8-way forest, `mountain` → 4-way blob, `wall` → rot.js
   dungeon wall, `sprite` → flat (no autotile).

## Verification checklist

- [ ] Page loads with a 24×18 arena, forest-themed by default.
- [ ] Perimeter ring is closed (player can't trivially walk off the
      map) but has organic gaps — not a perfect rectangle.
- [ ] Switching `obstacleKind` between `tree`, `mountain`, `wall`,
      `sprite` changes which resolver is used and the sprites look
      correctly autotiled (or correctly flat for `sprite`).
- [ ] An entry trail enters from the configured side and reaches the
      interior.
- [ ] Interior has a small scatter of cover obstacles.
- [ ] Raising `hazardDensity` adds visible hazard tiles to the floor.
- [ ] Switching to a non-default preset (desert canyon, volcanic pit,
      etc.) only changes sprite families — topology is identical for
      the same seed.
- [ ] Reusing the same `seed` reproduces the same arena exactly.
