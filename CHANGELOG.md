# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
- **Sprite Browser** example and story — search all 4,157 sprites by name and
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
