# GUI Atlas — Usage Guide

Generated 2026-05-17 from `source/GUI`.
1 groups, 232 named sprites.
Sheet: 256×304px · 16 columns · 16×16px tiles.

## Groups Included

- **GUI**: rows 0–18 (y 0–288px)

## Phaser 3

```javascript
// preload
this.load.atlas('gui',  'GUIAtlas0.png', 'GUIAtlas.json');
this.load.atlas('gui1', 'GUIAtlas1.png', 'GUIAtlas.json');

// create — static sprite by name
this.add.sprite(x, y, 'gui', 'question a_0');

// 2-frame walk animation (shared atlas JSON, two texture keys)
this.anims.create({
  key: 'question a_0-walk',
  frames: [
    { key: 'gui',  frame: 'question a_0' },
    { key: 'gui1', frame: 'question a_0' },
  ],
  frameRate: 2,
  repeat: -1,
});
```

## Plain HTML / CSS

```html
<script type="module">
  const atlas = await fetch('GUIAtlas.json').then(r => r.json());
  function showSprite(name, el) {
    const { x, y } = atlas.byName[name];
    Object.assign(el.style, {
      backgroundImage:    'url(GUIAtlas0.png)',
      backgroundPosition: `-${x}px -${y}px`,
      width:  '16px',
      height: '16px',
      imageRendering: 'pixelated',
      display: 'inline-block',
    });
  }
  showSprite('question a_0', document.querySelector('#sprite'));
</script>
<div id="sprite"></div>
```

## React (existing Sprite / SpriteSheet components)

```jsx
import atlas from './GUIAtlas.json';

// Single frame via Sprite component
<Sprite
  src="GUIAtlas0.png"
  frame={atlas.byName['question a_0'].globalFrame}
  cols={16}
  tileSize={16}
/>

// Full atlas via SpriteSheet — tooltips load automatically from GUIAtlas0.frames.json
<SpriteSheet
  imagePath="/atlas/GUIAtlas0.png"
  columns={16}
  tileSize={16}
  animated={true}
  animationPair="/atlas/GUIAtlas1.png"
/>
```
