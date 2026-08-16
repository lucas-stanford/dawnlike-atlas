# Contributing

Thanks for taking a look. This repo is two things at once — a **published npm
package** (the atlas, the resolvers, the helper API) and a **Storybook of
worked examples**. Changes to the first need tests; changes to the second need
to render.

## Getting set up

```bash
bun install
bun run dev      # Storybook on http://localhost:6006
bun run test     # unit tests — fast, no browser
```

`bun run test` is the one to keep green. It covers atlas integrity, all six
autotile resolvers, the atlas API, and the tactical toolkit, and it runs in
about a second.

## The shape of the repo

```
atlas/          the packed sheets + DawnlikeAtlas.json (the product)
src/utils/      atlasApi.js, autotile.js, tactical/  — the library
src/*Example.jsx  one self-contained component per example
src/phaser/     the Phaser 4 game
stories/        a Storybook story per example, plus MDX docs
tests/          vitest unit tests
scripts/        packing/tagging/packaging helper scripts
```

## Adding an example

Examples are deliberately single-file and self-contained — someone should be
able to read one component top to bottom and understand the whole technique.

1. Write `src/YourExample.jsx`. Open with a block comment explaining **what
   technique it demonstrates and why it is different from the existing
   examples** — that framing is the point of the example, not the pixels.
2. Take every knob as a prop with a sensible default. Zone generators must be
   deterministic in a `seed` prop so a screenshot is reproducible.
3. Load the atlas with `fetch(resolveAssetPath('/DawnlikeAtlas.json'))`;
   Storybook serves `atlas/` as its static dir.
4. Add `stories/YourExample.stories.jsx` with:
   - a `title` under `Dawnlike/Zone Examples/…` (a map generator) or
     `Dawnlike/Examples/…` (a game or system),
   - a `docs.description.component` paragraph — this is what people read first,
   - `argTypes` with a `description` on every control and a `table.category`
     grouping them, and
   - named exports for two or three interesting presets, not just the default.
5. Add a row to the examples table in `README.md`.

Sprite names are checked at render time, not at build time, so **verify every
name you hard-code exists** before committing:

```js
node -e "const a=require('./atlas/DawnlikeAtlas.json').byName;
  ['your sprite','another one'].forEach(n=>console.log(a[n]?'OK':'MISS',n))"
```

Better still, discover names at runtime with `autotileFamilies()` or
`searchSprites()` so the example can't drift from a repack.

## Adding or changing an autotile resolver

Resolvers live in `src/utils/autotile.js` and must never return a name the
atlas doesn't have without saying so. Every resolver takes `byName` for exactly
this reason — check, then fall back.

Any new resolver needs a **totality test** in `tests/autotile.test.js`: for each
family the examples offer, all 16 cardinal patterns (256 for an 8-way resolver)
must resolve to a sprite present in the atlas. That is the test that catches the
real bug in this domain — a plausible-looking name that renders as a hole.

Add the resolver to the `RESOLVERS` registry in `src/AutotileLabExample.jsx`
too; the family dropdown, variant sheet and paint canvas all derive from that
one entry, so it costs a few lines and the resolver becomes explorable.

Update the resolver table in `README.md` and the `.d.ts` in
`src/utils/autotile.d.ts`.

## Changing the published API

The package entry is `react/index.js`. If you add an export:

- add it to `react/index.d.ts` (and the relevant `.d.ts` beside the source),
- if it needs a new subpath, add it to both `exports` **and** `files` in
  `package.json`, then run `bun run check-package` — it verifies every export
  target exists on disk and is covered by `files`, which is the failure mode
  that only shows up in a consumer's build after publishing.

## The shore tiles

`scripts/generate-shore.mjs` draws the `* shore` coastline families. They are
the only sprites in the atlas that are **not** original DawnLike art — the pack
ships no land↔water transitions.

```bash
node scripts/generate-shore.mjs            # preview sheet only, no writes
node scripts/generate-shore.mjs --apply    # write into the atlas
node scripts/preview-shore-context.mjs "sand shore" "stone clear pool center" out.png
```

The context preview is the one that matters — a sheet of 20 tiles tells you
very little, whereas rendering an actual island shows immediately whether the
coast reads. Judge changes on that.

Things to preserve if you touch the art:

- **Author at 16×16 and upscale 2×.** The whole atlas is a strict 2× upscale of
  DawnLike's 16×16 originals; drawing at 32×32 puts pixels off that grid and
  reads as a different art style.
- **Stay inside the DawnBringer 16 palette** in `PALETTE`.
- **Keep the water region transparent.** That is what lets one shore set
  composite over clear water, toxic water or lava.
- **Keep the band-depth wobble a function of the along-edge coordinate only**,
  or adjacent tiles stop meeting cleanly at the seam.
- `--apply` is additive and idempotent: existing sprites never move, and
  re-running rewrites the shore tiles in the cells they already own.
- The PNG write options in `apply()` are deliberate — pngjs's defaults
  quadruple the file size for pixel art.

## Repacking the atlas

If `DawnlikeAtlas.json` is regenerated, `tests/atlas.test.js` is the guard: it
checks the declared counts, tile alignment, cell collisions, and that `frames`,
`byName` and `legacyFrames` all agree. It also asserts a handful of names the
docs and examples reference by hand. If one of those fails, either the pack
changed a name (update the references) or the pack is wrong.

## Commit and PR conventions

- One logical change per commit; explain **why** in the body, not just what.
- Run `bun run test` and `bun run build-storybook` before opening a PR.
- Screenshots are very welcome for anything visual — that is the whole point of
  most changes here.

## Licence

By contributing you agree your work is released under CC-BY 4.0, matching the
rest of the repository. See [LICENSE](./LICENSE).
