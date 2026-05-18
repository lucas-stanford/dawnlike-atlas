# Dawnlike Mega-Atlas — Usage Guide

Generated 2026-05-17 from:
- `source/Characters`
- `source/Items`
- `source/Objects`
- `source/GUI`

**3963 named sprites** across 4 categories,
bin-packed into 1024×992px (64×62 grid, 16px tiles).
Wasted cells: 5 of 3968
(0.1% empty).

## Categories Included

- **Characters**: 16 groups, 707 sprites
- **Items**: 25 groups, 684 sprites
- **Objects**: 15 groups, 2331 sprites
- **GUI**: 1 groups, 241 sprites

## Phaser 3

```javascript
// preload
this.load.atlas('dawnlike',  'DawnlikeAtlas0.png', 'DawnlikeAtlas.json');
this.load.atlas('dawnlike1', 'DawnlikeAtlas1.png', 'DawnlikeAtlas.json');

// create — static sprite by name
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
      width:  '16px',
      height: '16px',
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
  tileSize={16}
/>

// Full atlas browser — tooltips load automatically from sidecar:
<SpriteSheet
  imagePath="/atlas/DawnlikeAtlas0.png"
  columns={64}
  tileSize={16}
  animated={true}
  animationPair="/atlas/DawnlikeAtlas1.png"
/>
```

## Lookup by category / group

```javascript
const atlas = await fetch('DawnlikeAtlas.json').then(r => r.json());
// All Player character names:
atlas.byCategory.Characters.Player;          // → ['ordinary human', 'fighter', ...]
// Where is the wizard sprite?
atlas.byName.wizard;                         // → { x, y, category, group, globalFrame, isAnimated }
```
