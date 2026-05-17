# Objects Atlas — Usage Guide

Generated 2026-05-17 from `source/Objects`.
9 groups, 659 named sprites.
Sheet: 128×1920px · 8 columns · 16×16px tiles.

## Groups Included

- **Decor**: rows 0–21 (y 0–336px)
- **Effect**: rows 22–47 (y 352–752px)
- **Ground**: rows 48–54 (y 768–864px)
- **Pit**: rows 55–86 (y 880–1376px)
- **Trap**: rows 87–91 (y 1392–1456px)
- **Door0**: rows 92–97 (y 1472–1552px)
- **Door1**: rows 98–103 (y 1568–1648px)
- **Fence**: rows 104–115 (y 1664–1840px)
- **Tile**: rows 116–119 (y 1856–1904px)

## Groups Excluded (non-standard column count)

- Hill: 16 cols
- Map: 12 cols
- Ore: 9 cols
- Tree: 12 cols
- Floor: 21 cols
- Wall: 20 cols

## Phaser 3

```javascript
// preload
this.load.atlas('objects',  'ObjectsAtlas0.png', 'ObjectsAtlas.json');
this.load.atlas('objects1', 'ObjectsAtlas1.png', 'ObjectsAtlas.json');

// create — static sprite by name
this.add.sprite(x, y, 'objects', 'window frame center');

// 2-frame walk animation (shared atlas JSON, two texture keys)
this.anims.create({
  key: 'window frame center-walk',
  frames: [
    { key: 'objects',  frame: 'window frame center' },
    { key: 'objects1', frame: 'window frame center' },
  ],
  frameRate: 2,
  repeat: -1,
});
```

## Plain HTML / CSS

```html
<script type="module">
  const atlas = await fetch('ObjectsAtlas.json').then(r => r.json());
  function showSprite(name, el) {
    const { x, y } = atlas.byName[name];
    Object.assign(el.style, {
      backgroundImage:    'url(ObjectsAtlas0.png)',
      backgroundPosition: `-${x}px -${y}px`,
      width:  '16px',
      height: '16px',
      imageRendering: 'pixelated',
      display: 'inline-block',
    });
  }
  showSprite('window frame center', document.querySelector('#sprite'));
</script>
<div id="sprite"></div>
```

## React (existing Sprite / SpriteSheet components)

```jsx
import atlas from './ObjectsAtlas.json';

// Single frame via Sprite component
<Sprite
  src="ObjectsAtlas0.png"
  frame={atlas.byName['window frame center'].globalFrame}
  cols={8}
  tileSize={16}
/>

// Full atlas via SpriteSheet — tooltips load automatically from ObjectsAtlas0.frames.json
<SpriteSheet
  imagePath="/atlas/ObjectsAtlas0.png"
  columns={8}
  tileSize={16}
  animated={true}
  animationPair="/atlas/ObjectsAtlas1.png"
/>
```
