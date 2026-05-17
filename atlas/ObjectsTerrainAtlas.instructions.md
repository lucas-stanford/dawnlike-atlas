# ObjectsTerrain Atlas — Usage Guide

Generated 2026-05-04 from `asset-packs/dawnlike/Objects`.
15 groups, 2221 named sprites.
Sheet: 336×4576px · 21 columns · 16×16px tiles.

## Groups Included

- **Decor**: rows 0–21 (y 0–336px)
- **Effect**: rows 22–47 (y 352–752px)
- **Ground**: rows 48–54 (y 768–864px)
- **Hill**: rows 55–72 (y 880–1152px)
- **Map**: rows 73–87 (y 1168–1392px)
- **Ore**: rows 88–94 (y 1408–1504px)
- **Pit**: rows 95–126 (y 1520–2016px)
- **Trap**: rows 127–131 (y 2032–2096px)
- **Tree**: rows 132–167 (y 2112–2672px)
- **Door0**: rows 168–173 (y 2688–2768px)
- **Door1**: rows 174–179 (y 2784–2864px)
- **Fence**: rows 180–191 (y 2880–3056px)
- **Floor**: rows 192–230 (y 3072–3680px)
- **Tile**: rows 231–234 (y 3696–3744px)
- **Wall**: rows 235–285 (y 3760–4560px)

## Phaser 3

```javascript
// preload
this.load.atlas('objectsterrain',  'ObjectsTerrainAtlas0.png', 'ObjectsTerrainAtlas.json');
this.load.atlas('objectsterrain1', 'ObjectsTerrainAtlas1.png', 'ObjectsTerrainAtlas.json');

// create — static sprite by name
this.add.sprite(x, y, 'objectsterrain', 'window frame center');

// 2-frame walk animation (shared atlas JSON, two texture keys)
this.anims.create({
  key: 'window frame center-walk',
  frames: [
    { key: 'objectsterrain',  frame: 'window frame center' },
    { key: 'objectsterrain1', frame: 'window frame center' },
  ],
  frameRate: 2,
  repeat: -1,
});
```

## Plain HTML / CSS

```html
<script type="module">
  const atlas = await fetch('ObjectsTerrainAtlas.json').then(r => r.json());
  function showSprite(name, el) {
    const { x, y } = atlas.byName[name];
    Object.assign(el.style, {
      backgroundImage:    'url(ObjectsTerrainAtlas0.png)',
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
import atlas from './ObjectsTerrainAtlas.json';

// Single frame via Sprite component
<Sprite
  src="ObjectsTerrainAtlas0.png"
  frame={atlas.byName['window frame center'].globalFrame}
  cols={21}
  tileSize={16}
/>

// Full atlas via SpriteSheet — tooltips load automatically from ObjectsTerrainAtlas0.frames.json
<SpriteSheet
  imagePath="/atlas/ObjectsTerrainAtlas0.png"
  columns={21}
  tileSize={16}
  animated={true}
  animationPair="/atlas/ObjectsTerrainAtlas1.png"
/>
```
