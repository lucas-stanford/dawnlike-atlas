# Characters Atlas — Usage Guide

Generated 2026-05-17 from `source/Characters`.
16 groups, 707 named sprites.
Sheet: 128×2664px · 8 columns · 16×16px tiles.

## Groups Included

- **Aquatic**: rows 0–5 (y 0–80px)
- **Avian**: rows 6–18 (y 96–288px)
- **Cat**: rows 19–23 (y 304–368px)
- **Demon**: rows 24–32 (y 384–512px)
- **Dog**: rows 33–39 (y 528–624px)
- **Elemental**: rows 40–50 (y 640–800px)
- **Humanoid**: rows 51–77 (y 816–1232px)
- **Misc**: rows 78–85 (y 1248–1360px)
- **Pest**: rows 86–96 (y 1376–1536px)
- **Plant**: rows 97–104 (y 1552–1664px)
- **Player**: rows 105–119 (y 1680–1904px)
- **Quadraped**: rows 120–131 (y 1920–2096px)
- **Reptile**: rows 132–146.5 (y 2112–2344px)
- **Rodent**: rows 147.5–150.5 (y 2360–2408px)
- **Slime**: rows 151.5–155.5 (y 2424–2488px)
- **Undead**: rows 156.5–165.5 (y 2504–2648px)

## Phaser 3

```javascript
// preload
this.load.atlas('characters',  'CharactersAtlas0.png', 'CharactersAtlas.json');
this.load.atlas('characters1', 'CharactersAtlas1.png', 'CharactersAtlas.json');

// create — static sprite by name
this.add.sprite(x, y, 'characters', 'fighting fish');

// 2-frame walk animation (shared atlas JSON, two texture keys)
this.anims.create({
  key: 'fighting fish-walk',
  frames: [
    { key: 'characters',  frame: 'fighting fish' },
    { key: 'characters1', frame: 'fighting fish' },
  ],
  frameRate: 2,
  repeat: -1,
});
```

## Plain HTML / CSS

```html
<script type="module">
  const atlas = await fetch('CharactersAtlas.json').then(r => r.json());
  function showSprite(name, el) {
    const { x, y } = atlas.byName[name];
    Object.assign(el.style, {
      backgroundImage:    'url(CharactersAtlas0.png)',
      backgroundPosition: `-${x}px -${y}px`,
      width:  '16px',
      height: '16px',
      imageRendering: 'pixelated',
      display: 'inline-block',
    });
  }
  showSprite('fighting fish', document.querySelector('#sprite'));
</script>
<div id="sprite"></div>
```

## React (existing Sprite / SpriteSheet components)

```jsx
import atlas from './CharactersAtlas.json';

// Single frame via Sprite component
<Sprite
  src="CharactersAtlas0.png"
  frame={atlas.byName['fighting fish'].globalFrame}
  cols={8}
  tileSize={16}
/>

// Full atlas via SpriteSheet — tooltips load automatically from CharactersAtlas0.frames.json
<SpriteSheet
  imagePath="/atlas/CharactersAtlas0.png"
  columns={8}
  tileSize={16}
  animated={true}
  animationPair="/atlas/CharactersAtlas1.png"
/>
```
