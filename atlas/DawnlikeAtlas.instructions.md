# Dawnlike Mega-Atlas — Usage Guide

Bin-packed from the original DawnLike sprite source, then upscaled
**2× via strict nearest-neighbour** so every source pixel becomes a
clean 2×2 block. The packed atlas is therefore stored at 32×32 per
tile while preserving the original pixelated DawnLike look exactly.

**4257 named sprites** across 4 categories plus generated shore tiles,
bin-packed into 2048×2144px (64×67 grid, 32px tiles).

The last 100 sprites are the `* shore` coastline families — see
`scripts/generate-shore.mjs`. They are NOT original DawnLike art: the pack has
no shore transitions, so they are drawn in the same 16×16-upscaled style and
DawnBringer 16 palette. Unlike everything else, their water region is
**transparent**, so you render them over a flat water tile.

## Categories Included

- **Characters**: 16 groups, 779 sprites
- **Items**: 25 groups, 684 sprites
- **Objects**: 15 groups, 2453 sprites
- **GUI**: 1 groups, 241 sprites

## Phaser 3 / 4

```javascript
// preload
this.load.atlas('dawnlike',  'DawnlikeAtlas0.png', 'DawnlikeAtlas.json');
this.load.atlas('dawnlike1', 'DawnlikeAtlas1.png', 'DawnlikeAtlas.json');

// create — static sprite by name (native 32px)
this.add.sprite(x, y, 'dawnlike', 'wizard');

// 2-frame walk animation (only meaningful when isAnimated: true)
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

## Plain HTML / CSS

```html
<script type="module">
  const atlas = await fetch('DawnlikeAtlas.json').then(r => r.json());
  function showSprite(name, el) {
    const { x, y } = atlas.byName[name];
    Object.assign(el.style, {
      backgroundImage:    'url(DawnlikeAtlas0.png)',
      backgroundPosition: `-${x}px -${y}px`,
      width:  '32px',
      height: '32px',
      imageRendering: 'pixelated',
      display: 'inline-block',
    });
  }
  showSprite('wizard', document.querySelector('#sprite'));
</script>
<div id="sprite"></div>
```

## React

Address sprites by name — `<AtlasSprite>` does the packing math:

```jsx
import { useAtlas, AtlasSprite } from 'dawnlike-atlas';

const { atlas, loading } = useAtlas('/atlas/DawnlikeAtlas.json');
if (loading) return null;

<AtlasSprite atlas={atlas} name="wizard" scale={2} animated />
```

`<AtlasTileMap>` renders a row-major grid of names (or layer stacks):

```jsx
<AtlasTileMap atlas={atlas} scale={2} tiles={[
  ['dark brick wall left right', 'dark brick wall left right'],
  ['dusk brick floor c',         ['dusk brick floor c', 'wizard']],
]} />
```

The full packed sheet browser used by the Mega Atlas story:

```jsx
<SpriteSheet
  imagePath="/atlas/DawnlikeAtlas0.png"
  metadataPath="/atlas/DawnlikeAtlas.json"
  columns={64}
  tileSize={32}
  animated={true}
  animationPair="/atlas/DawnlikeAtlas1.png"
/>
```

## Lookup by name

```javascript
const atlas = await fetch('DawnlikeAtlas.json').then(r => r.json());

// Where is the wizard sprite?
atlas.byName.wizard;
// → { x: 2016, y: 192, w: 32, h: 32, tags: [...], isAnimated: true }

// What cell does it occupy in the 64-column grid?
const indexToName = atlas.legacyFrames;   // → { '0': 'fighting fish', … }
const index = (atlas.byName.wizard.y / 32) * 64 + atlas.byName.wizard.x / 32;
indexToName[index];                       // → 'wizard'
```

Or use the helpers in `dawnlike-atlas/atlas-api`, which cover all of the above
plus tag search and autotile-family discovery:

```javascript
import { loadAtlas, getSprite, spriteCell, searchSprites, spriteStyle }
  from 'dawnlike-atlas/atlas-api';

const atlas = await loadAtlas('DawnlikeAtlas.json');
getSprite(atlas, 'wizard');                   // null-safe lookup
spriteCell(atlas, 'wizard');                  // → { col: 63, row: 6, index: 447 }
searchSprites(atlas, { query: 'rat' });       // name + tag search
spriteStyle(atlas, 'wizard', { scale: 2 });   // ready-to-apply CSS bag
```

## JSON shape (slim)

```
{
  meta:    { size, tile, columns, rows, spriteCount, … },
  frames:  { '<name>': { frame: {x,y,w,h} } },   // Phaser-compatible texture atlas
  byName:  { '<name>': { x, y, w, h, tags, isAnimated? } },  // flat lookup
  legacyFrames: { '<index>': '<name>' }          // index → name reverse map (Mega Atlas tooltip)
}
```
