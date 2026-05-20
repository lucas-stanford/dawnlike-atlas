# Dawnlike Mega-Atlas — Usage Guide

Bin-packed from the original DawnLike sprite source, then upscaled
**2× via strict nearest-neighbour** so every source pixel becomes a
clean 2×2 block. The packed atlas is therefore stored at 32×32 per
tile while preserving the original pixelated DawnLike look exactly.

**4157 named sprites** across 4 categories,
bin-packed into 2048×2080px (64×65 grid, 32px tiles).
Wasted cells: 3 of 4160
(0.07% empty).

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

## React (existing Sprite / SpriteSheet components)

```jsx
import atlas from './DawnlikeAtlas.json';

// Single frame:
<Sprite
  src="DawnlikeAtlas0.png"
  frame={atlas.byName['wizard'].globalFrame}
  cols={64}
  tileSize={32}
/>

// Full atlas browser:
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
atlas.byName.wizard;                         // → { x, y, w, h, tags }
// What frame index does it occupy in the legacy 64-col grid?
const indexToName = atlas.legacyFrames;      // → { '0': 'fighting fish', '1': 'red snapper', … }
```

## JSON shape (slim)

```
{
  meta:    { size, tile, columns, rows, spriteCount, … },
  frames:  { '<name>': { frame: {x,y,w,h} } },   // Phaser-compatible texture atlas
  byName:  { '<name>': { x, y, w, h, tags } },   // flat lookup used by React examples
  legacyFrames: { '<index>': '<name>' }          // index → name reverse map (Mega Atlas tooltip)
}
```
