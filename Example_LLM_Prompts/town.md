# Prompt: Recreate the Town Generator

## Goal

Recreate the procedurally-generated medieval town from
**[`lucas-stanford/dawnlike-atlas`](https://github.com/lucas-stanford/dawnlike-atlas)**
(see the *Examples › Town* story in its Storybook). It is a React
component that renders a 45×30 town (32×32 tiles — a nearest-neighbour
2× upscale of the original 16×16 DawnLike art) with a stone-brick
perimeter wall, a main brick road plus narrower stone side streets,
several archetype buildings (house, inn, pub, smithy, church, shop, plus
a guaranteed bank with vault loot), hanging signs, doorway plants, and
ground flowers / trees on the unpaved grass.

Highlights:

- **Building archetypes** — each archetype drives its furniture set,
  sign sprite, and rug colour.
- **Mandatory bank** with a vault room behind the counter, randomly
  populated from `VAULT_LOOT` (chests, safes, gold piles, gleaming
  gems).
- **Autotiled walls and floors** using `resolveDawnLikeWallName` for
  perimeter walls and `resolveDawnLikeDungeonWallName` for thicker
  building walls.
- **Tree + flower scatter** on the grass margins, with autotiled forest
  edges via `resolveDawnLikeForestName`.
- **Storybook controls** for grass / wall / street / building counts,
  flower density, and graveyard chance.

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
| [`src/utils/autotile.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/utils/autotile.js) | All cardinal-neighbour resolvers used by the town: `resolveDawnLikeWallName`, `resolveDawnLikeDungeonWallName`, `resolveDawnLikeFloorName`, `resolveDawnLikeForestName`. |
| [`src/Autotile.css`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/Autotile.css) | Tooltip / picker styles shared by all map examples. |
| [`src/TownExample.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/TownExample.jsx) | The component to recreate. ~1300 lines: layout, building placement, furniture, signs, flora, render loop, sprite-picker. |
| [`stories/Town.stories.jsx`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/Town.stories.jsx) | How the story exposes the props as controls. |

For comparison, the Phaser port of the same layout (smaller, exit-aware):
[`src/phaser/generators/town.js`](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/src/phaser/generators/town.js)
([docs](https://github.com/lucas-stanford/dawnlike-atlas/blob/master/stories/TownManifest.mdx)).

## Recreation instructions

1. Fetch `DawnlikeAtlas.json`; keep it in state.
2. Seed `ROT.RNG` from the `seed` prop.
3. Lay the grass floor first, scattered with optional trees + flowers.
4. Stamp the perimeter wall (1-tile-thick autotiled wall ring) and
   carve a single gap for the main road. Two thinner stone streets cross
   it perpendicular.
5. Force-place the **bank** first; pick a footprint big enough for a
   vault room of `~3×3` behind the counter. Populate vault tiles by
   sampling from `VAULT_LOOT`.
6. Randomly place the remaining buildings from `BUILDING_TYPES`,
   spacing them apart by `buildingSpacing`. For each, pick:
   - a sign sprite from `TYPE_SIGN` (residential houses get no sign);
   - a rug from `TYPE_RUG`;
   - archetype-specific furniture (counters, kegs, anvils, altars, …);
   - a door-side plant from `DOOR_PLANTS`.
7. Optionally place a graveyard cluster (chance = `graveyardChance`).
8. Render layers in order: grass → flowers → streets → walls →
   building floors → furniture → roof signs → players/NPCs.

## Verification checklist

- [ ] Page loads and shows a 45×30 town with a stone perimeter and an
      obvious main road through it.
- [ ] At least 5 distinct buildings are visible, each with its own
      furniture set.
- [ ] Exactly one bank exists; behind the counter the vault is full of
      chests, coin piles, and gleaming gems.
- [ ] Non-residential buildings have a sign by the door (inn, pub,
      smithy, church, shop, bank). Houses have none.
- [ ] Grass margins have scattered flowers + trees; tree clusters use
      autotiled forest edges.
- [ ] Wall corners and T-junctions are the correct sprite (no flat-end
      walls jutting into open tiles).
- [ ] Reusing the same `seed` reproduces the same town exactly.
