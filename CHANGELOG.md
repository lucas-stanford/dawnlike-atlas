# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Four more buildings, and a module that knows about them** — `cabin`,
  `cottage`, `townhouse` and `outhouse` join the barn in `atlas/buildings/`, and
  `dawnlike-atlas/utils/buildings` carries the manifest plus `buildingRect(name,
  { x0, y1 })` to place any of them. The rectangle comes back in TILES so the
  caller keeps its own zoom, bottom-anchored and centred so the roof oversails
  the walls on three sides.
  `cols` — how many tiles a building BLOCKS — is measured from the part that
  meets the ground rather than from the width of the picture, and is narrower
  than the art on every one of the five. A barn whose 6-tile roof also blocked
  6 tiles of floor would have the player bouncing off thin air a tile short of
  the wall. Footprint DEPTH is deliberately not recorded: these are drawn
  front-on, so the art says nothing about it and it is the game's decision.
  A **Buildings** story shows all five over grass at 1×–4× with their footprints
  drawn, and `tests/buildings.test.js` checks every measurement in the manifest
  against the PNG on disk, so a re-trace at another size fails the build instead
  of silently leaving a building hovering.
- **`--split` for `scripts/trace_building.py`** — several buildings on one sheet,
  cut apart by connectivity and named in left-to-right order. Two things had to
  be fixed to make it work on a real screenshot. The halo threshold is now read
  off the sheet instead of hardcoded, because how well hue separates bleed from
  art depends entirely on the key's saturation: against a vivid magenta neutral
  grey scores 0.87, but against the muted `(171, 56, 125)` of the second sheet
  grey scores 0.93 and a dark maroon OUTLINE scores 0.99 — so the fixed 0.93
  ate four buildings down to their studs. And chrome is peeled off first: a HUD
  strip and a one-pixel border are connected to each other, so a building
  touching the frame came back fused to the HUD at the opposite corner as one
  component spanning the entire image.
- **A barn, as a building rather than as sprites** — `atlas/buildings/barn.png`,
  96×110 logical px on its own 64-colour palette, placed by `barnArtRect` in
  `dawnlike-atlas/utils/farm`. DawnLike draws a lot of the countryside but no
  farm BUILDINGS, and a barn is the case that does not fit the pack's shape:
  everything else is one cell because everything else is a thing you pick up,
  stand on or fight, whereas a barn is a thing you walk around, and at sixteen
  logical pixels a whole barn is a brown smudge.
  It is NOT in the mega-atlas and is not sliced into 16px cells. Slicing it
  would make it look like the rest of the pack, but those cells are only ever
  drawn together in one fixed arrangement, so the grid buys nothing a single
  image does not — and it costs the art, because fitting into the sheet means
  fitting the sheet's palette. `barnArtRect` returns a rectangle in TILES so the
  caller picks its own zoom, deliberately larger than the 5×5 the barn blocks:
  bottom-anchored and centred, the roof oversails by half a tile each side and
  stands nearly two above. A roof stopping dead at its own footprint reads flat.
- **`scripts/trace_building.py`** — lifts a building out of a magenta-keyed
  screenshot, keeping the source's colours rather than snapping them to a ramp.
  Two parts of that are easy to get wrong and were wrong before: keying on fixed
  thresholds misses a field a lossy encoder has moved off `#FF00FF` (the barn
  keys on `(191, 22, 179)`, which every `> 195` test calls opaque), and
  measuring the upscale factor as the GCD of runs of identical colour returns 1
  on any compressed image, because almost no two neighbouring pixels survive as
  exact equals. The grid is fitted to edge energy instead, taking the smallest
  divisor of the best fit that is still a local maximum — every multiple of the
  true period also lands on edges and scores higher for it, so the best fit is a
  ceiling rather than an answer.
- **The barn is something you buy** — `buildBarn`, `canBuildBarn`, `isBarn` and
  `isBarnSite` in `dawnlike-atlas/utils/farm`, with a
  **Raise barn** control and <kbd>B</kbd> in the Farm example. 400g and six
  stamina, on a yard reserved at map generation in the bottom-right corner,
  one tile in from each edge so the farmer can always walk right around it.
  It earns its price in RULES rather than in pixels. A building you buy purely
  because it looks like a farm is a screenshot, so this one does the job a real
  barn does: produce waiting to be sold sits in the open until the barn is up,
  and a third of every heap spoils overnight. Before the barn the right move is
  to sell every evening because holding costs you; after it you can stockpile a
  season of corn and cash it in one go — the purchase turns selling from a
  formality into a decision. The share is applied with `Math.floor` by design,
  so a pile of one or two survives the night and a day's ordinary picking is
  never punished; only a hoard rots. A rule that bit every crop would be a tax.
  The site is fixed rather than player-placed because dragging a 5×5 ghost
  around needs a placement mode — legality under the cursor, rotation, a
  preview — which is a second game's worth of UI hanging off one purchase. It
  comes back null on a map too small to hold a barn, and every caller reads that
  as "this farm has nowhere to put one" rather than as an error.

### Changed

- The Farm HUD's **Barn** figure is now **Store**, and *Sell barn* is *Sell
  store*. One word cannot mean both the building and what is inside it, and the
  building is the one you can now walk into the side of.

- **One-cell sailing boats** — `sloop n|e|s|w` and `black sloop n|e|s|w`, a
  fore-and-aft rigged sloop of the 1790s–1850s in working white and in a
  pirate's livery: a black mainsail with a bone-white crossbones on it. Both
  are one sprite on one cell, generated in four headings. Mechanically the
  sloop sits between the ship and the rowboat — eight hull points and four units
  of hold — and the black canvas is a livery only: same hull, same rig, and
  `tests/pirate.test.js` asserts it stays that way.
  She is drawn in the proportion a sailing boat actually reads in from above —
  a long SHALLOW hull, four pixels deep, under one big billowing sail that
  takes most of the tile, with a visible mast and a dotted forestay running
  down to the stemhead. Canvas is what you recognise a sailing boat by at
  sixteen logical pixels; the hull is only what it stands on. A deep planked
  hull under a small hard-edged triangle reads as a shed with a flag on it.
  Hull and rig are one pixel map per heading rather than a shape derived from
  per-row widths: a hull tapering equally at both ends is an almond, and an
  almond reads as a bean. A profile is bounded on top by the sheerline, at the
  bow by the curve of the stem and aft by the transom, so the bow rakes forward
  and sweeps up to the deck and the stern is a flat ninety-degree face. The
  sail was procedural for one revision — an outline, a lit rim, a shadowed rim
  and a body, which is exactly what a rule gives well — but a rule gives a
  straight leech, and canvas bellies. Only the tones are chosen at generation
  time now, per livery and per heading.
  All four headings of every one-cell vessel are drawn, not rotated. Rotating a
  finished tile carries its baked-in lighting round with it, so the sun appears
  to orbit the boat as she comes about; the shape is now built in boat space,
  turned, and only then lit in SCREEN space, so every heading shares one fixed
  north-west light. And a mast is vertical: under the tilted camera a top-down
  tile game uses, anything vertical projects up the screen whichever way its
  base points, so the sail always sits above the hull and changes shape rather
  than orbiting it — broadside and trailing aft for east and west, foreshortened
  for north and south. The sun sits behind the viewer, so sailing at the camera
  shows the sail's lit face and sailing away shows its shaded back.
- **One-cell rowboat** — `boat n|e|s|w`, generated by
  `scripts/generate-ship-deck.mjs` alongside the ship. The six-cell ship is a
  tile map, which is the right shape for something you stand on; a boat wants
  the opposite, one sprite dropped on one cell the way a creature is placed.
  The Pirate example takes a `vessel` prop and can sail either — the boat has
  five hull points and two units of hold against the ship's twelve and six, and
  fits water the ship cannot come about in.
- **Atlas helper API** (`dawnlike-atlas/atlas-api`, also re-exported from the
  package root): `loadAtlas`, `getSprite`, `hasSprite`, `isAnimated`,
  `spriteNames`, `spriteTags`, `tagIndex`, `searchSprites`, `spritesByTag`,
  `autotileFamilies`, `spriteCell`, `nameAtIndex`, `spriteStyle`, `drawSprite`,
  `pickSprite`, `animationFrames`. Framework-agnostic — no React, DOM or
  bundler assumptions.
- **Name-addressed React components**: `<AtlasSprite>`, `<AtlasTileMap>` and the
  `useAtlas` hook, the counterpart to the existing frame-indexed `<Sprite>`.
- **Autotile Lab** example and story — an interactive playground for all six
  resolvers: a neighbour pad with the exact call printed underneath, the full
  variant sheet for any family, and a paint canvas that autotiles live.
- **Sprite Browser** example and story — search all 4,499 sprites by name and
  tag, inspect any atlas record, and copy React / CSS / Phaser snippets.
- **Components** gallery example and story — every component the package
  exports, rendered live with its props, including a HUD assembled from the GUI
  sprites inside the mega-atlas.
- **Shore tiles** — 235 new sprites (`sand shore`, `grass shore`, `snow shore`,
  `mud shore`, `ash shore`, each a full **47-tile blob set**), drawn by
  `scripts/generate-shore.mjs`
  because DawnLike ships no coastline art and the substitutes fight each other:
  the pool families draw a dark rocky rim meant for dungeon pools, the floor
  families a pale rim, so land beside water produced two competing borders. Each
  shore tile carries the whole land→water transition and is transparent where
  the water goes, so one set composites over any water. The blob set collapses
  all 256 neighbourhoods to 47 tiles (a diagonal only matters when both flanking
  cardinals are land), so coastlines are correct at every angle — including the
  diagonal spits and inlets that no floor family can draw.
  Authored at 16×16 and upscaled 2× in the DawnBringer 16 palette, 2-frame
  animated so the surf tracks DawnLike's water. The atlas grew from 65 to 69
  rows (2048×2208); existing sprites did not move.
- **`resolveDawnLikeShoreName`** — 8-way coastline resolver for the above.
- **Watered-soil tiles** — 64 new sprites (`morning|day|dusk|night watered field`,
  all 16 floor suffixes), derived by `scripts/generate-watered-field.mjs`.
  DawnLike ships `* plowed field` in all four daylight tints but no wet variant,
  and watering is the mechanic a farming game is built around. Each watered tile
  is the corresponding plowed tile with its palette remapped, so wet and dry soil
  share pixel-identical furrows. The remap is an explicit per-tint table, not a
  formula: darkening produces `day plowed field` when applied to morning and
  produces nothing at all at night, where the tile has already bottomed out at
  navy and black. What reads as wet across all four tints is a hue move —
  replace the warm highlight with a cool sheen and deepen the shadow — and at
  night, with no room to darken, the sheen brightens to blue instead. The atlas
  grew from 69 to 70 rows (2048×2240); existing sprites did not move.
- **Pirate** example, story and rules engine (`dawnlike-atlas/utils/pirate`) — an
  archipelago treasure run: sail out on the wind, anchor off an island, row
  ashore, dig up the cache and get the hold home to the cove before something
  takes the ship apart. Islands are grown as overlapping ellipses so every one is
  a single connected blob the 47-tile shore set can wrap; a shallow lagoon rings
  each of them, which is what keeps the deep-water beasts out and makes hugging
  the coast a real tactic. Rules are a pure state machine with no React and no
  atlas dependency; every action returns the same state reference on failure.
  Two gaps in the pack became the two mechanics: there is no compass rose and no
  sail sprite, so the wind is a rule rather than a drawing (running before it
  costs one watch, reaching two, beating three, and the ship only moves
  forwards); and there is no ship at all, so one was drawn — see below.
- **Ship tiles** — 31 new sprites, drawn by `scripts/generate-ship-deck.mjs`,
  because DawnLike has no boat anywhere in it: no hull, no deck, no sail. The
  nearest wood in the pack is `board a/b/c`, which are trestle tables, and six
  of those side by side read as a bookcase floating on the sea. The set is
  `ship deck ns|we a|b|c` planking in two orientations (planks run fore-and-aft,
  so they turn when the ship does), a 16-tile `ship rail *` gunwale family,
  four `ship bow *` chamfered prows per orientation, and a `ship mast`. Colours
  are the five DawnBringer 16 entries DawnLike uses for its own wood, counted
  off `closed wooden door front` rather than guessed.
  The gunwale is a **floor** family, not a fence family, and that is the whole
  trick: a fence sprite draws its rail down the centre of a tile, because a
  fence occupies a whole cell of a map, so fence sprites laid along a hull put a
  bar a quarter of a tile inboard on every side and the ship came out looking
  like a portcullis. A floor family draws its transition at the tile boundary,
  which is where a gunwale is — so the ship's hull autotiles through
  `resolveDawnLikeFloorName`, the same call that outlines a ploughed field, and
  re-resolves every time she comes about. The atlas grew from 70 to 71 rows
  (2048×2272); existing sprites did not move.
- **Shared UI theme** (`src/theme.css`) — every example now draws its chrome
  from one set of DawnBringer 16 design tokens. The interface around the sprites
  had drifted to Material Design green (`#4CAF50`), Material blue and a spread
  of neutral greys — 98 distinct hex values across eight stylesheets, plus two
  examples still on a light theme inside a dark Storybook — so the chrome and
  the art no longer looked like one project. Anything that carries meaning is
  now an exact palette entry; only the dead surfaces underneath interpolate, and
  they interpolate between DB16 `black` and `maroon`, the same warm violet cast
  DawnLike's own shadows are painted in. Ships primitives for panels, buttons,
  toolbars, meters, key caps, modals and the framed map stage, and routes the
  two pixel faces the repo already loaded (Press Start 2P for titles, Silkscreen
  for labels) to the roles each is actually readable at.
- **Farm** example, story and rules engine (`dawnlike-atlas/utils/farm`) — a
  complete farming loop: till, sow, water, harvest, sell, plus livestock, an
  orchard, a watering can that only refills at the pond, crops that wither after
  two dry days and tilled soil that goes back to weed after three. The rules are
  a pure state machine with no React, DOM or atlas dependency, unit tested in
  `tests/farm.test.js` — including a check that every sprite name the engine can
  ever ask for exists in the packed atlas.
  The farmer's remaining stamina selects the daylight tint, so the whole map is
  redrawn from a different sprite family as the working day burns down. Because
  the tints are palette rotations rather than lighting passes, that stays exactly
  on the DawnBringer 16 palette — which no CSS filter could do.
- **Island** zone example — radial-falloff landmass exercising the pool, floor,
  forest and mountain resolvers together. The first example to use
  `resolveDawnLikeMountainName`.
- **Cave** zone example — cellular-automata caverns with a largest-region flood
  fill and distance-transform lakes, aimed at the ragged geometry that breaks
  naive autotilers.
- **Unit test suite** (158 tests): atlas integrity, autotile resolver totality,
  the atlas API, and the tactical toolkit.
- **CI workflow** running the tests, a Storybook build, and a package check.
- `scripts/check-package-exports.mjs` — verifies every `exports` target exists
  on disk and is covered by `files`.
- TypeScript definitions for the atlas API, the autotile resolvers, and the
  sprite components.
- `LICENSE`, `CONTRIBUTING.md` and this changelog.

### Fixed

- Sailing into a beach now lands you. It used to be refused — "Land ahead, she
  will not float over sand" — which made the shoreline a wall you bounced off
  and left `R` as the only way ashore even when the bow was already touching
  sand. Driving at the beach and stepping off is what anyone tries first, so it
  is what it does: she stays afloat where she is, the captain goes over the bow
  onto the sand ahead, and walking back into her puts him aboard again. Priced
  as a landing rather than a passage, because the boat does not move — so
  beaching into a headwind costs one watch, not three. A beast in the way still
  blocks it.
- Island coastlines: the meadow was painted over the shore tile wherever a grass
  tile sat on the waterline, which on the default seed was 47 of the 93 land
  tiles on the coast. The beach band is an elevation slice, so it is zero tiles
  wide wherever the coast is steep; the meadow now recedes from the sea rather
  than merely autotiling against its own band, guaranteeing a one-tile sand ring
  whatever the band widths work out to. The waterline scan moved into the
  generator memo, and the toolbar's "beach" figure now counts the beach you can
  see rather than the elevation band, because those are no longer the same
  number.
- The tropical atoll paired `morning grass floor` with `sand shore`. A floor
  family's edge variants are a transition to one specific neighbouring tone, not
  a generic border — `morning`'s is pale pink, which landed next to the shore's
  pink wet-sand band and buried the actual waterline between two nearly identical
  colours. It now uses `day grass floor`, whose edge is orange and disappears
  into the sand. The pairing rule is written down above the theme table.
- Cave lakes had no bank at all. They were resolved through a pool family —
  eleven tiles keyed on four cardinals, drawn for a rectangular built basin, with
  no piece for a corner cut by a diagonal — so on a cellular-automata blob most
  of the waterline fell back to `center` and the water stopped dead against the
  floor. Cave lakes now use the 47-tile `mud shore` blob, which is what an
  organic waterline needs. The Sewer keeps the pool family: its channels really
  are rectangular masonry basins, which is the case that family was drawn for.
- Zone-example toolbars no longer float over the map they belong to. Cave,
  Island, Sewer and Arena each positioned a strip at `top: 8; left: 8` on top of
  their own canvas, where it covered whatever the generator happened to place in
  the corner, and each rendered an unstyled native `<button>` — light OS chrome
  on a black page. The shared layout is now a flex column with a real header bar.
- Story seeds are fixed instead of rolled at module load. Eight stories called
  `Math.random()` in their `args`, so every reload produced a different map:
  no screenshot could be compared to the last one and no reader could be pointed
  at what they were looking at. The Reseed button still rolls a fresh one.
- Corrected sprite figures throughout the docs. Six places still said "4,157
  sprites in a 2048×2080 PNG" and four still said "1,258 animated", both of them
  superseded two atlas growths ago. `tests/docs-and-theme.test.js` now fails
  when a documented figure and the atlas disagree.
- The Autotile Lab's paint canvas spanned both columns on a row of its own,
  leaving a ~300px hole in the right column above it; it now stacks under the
  variant sheet it paints from.
- The `wall` autotile manifest listed `center` in its fallback chains, but
  fallback entries are pattern keys, not suffixes — the isolated pattern key is
  `''`. Every `center` fallback was dead code, so a wall family lacking straight
  pieces resolved to a missing sprite instead of degrading onto its centre tile.
- The package root did not export the sprite components, so the documented
  `import { Sprite, AnimatedSprite } from 'dawnlike-atlas'` failed.
- `paths.js` resolved GitHub Pages assets against `/GameGenFiles/`, a leftover
  from an unrelated project.
- `vitest.config.ts` could not load at all: `@storybook/addon-vitest@10` is
  incompatible with the pinned Storybook 8.6. The browser project moved to
  `vitest.storybook.config.ts` so the default `vitest` run works.

### Changed

- README rewritten: it documented example files that no longer exist
  (`Autotile.stories.jsx`, `AutotileExample.jsx`) and omitted the Town, Sewer,
  Arena, Tactical Combat, Menu and Character Gallery examples entirely. It now
  covers the full example set, the atlas API, and the resolver table.

## [0.1.0]

- Initial release: bin-packed 32×32 mega-atlas of the DawnLike tileset with
  `byName` semantic lookup, AI-generated tags, 16-way autotile resolvers, and a
  React/Storybook playground.
