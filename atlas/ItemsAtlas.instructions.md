# Items Atlas — Usage Guide

Generated 2026-05-17 from `source/Items`.
25 groups, 684 named sprites.
Sheet: 128×1840px · 8 columns · 16×16px tiles.

## Groups Included

- **Ammo**: rows 0–5 (y 0–80px)
- **Amulet**: rows 6–8 (y 96–128px)
- **Armor**: rows 9–17 (y 144–272px)
- **Book**: rows 18–26 (y 288–416px)
- **Boot**: rows 27–28 (y 432–448px)
- **Chest0**: rows 29–31 (y 464–496px)
- **Chest1**: rows 32–34 (y 512–544px)
- **Flesh**: rows 35–43 (y 560–688px)
- **Food**: rows 44–49 (y 704–784px)
- **Glove**: rows 50–50 (y 800–800px)
- **Hat**: rows 51–54 (y 816–864px)
- **Key**: rows 55–55 (y 880–880px)
- **Light**: rows 56–56 (y 896–896px)
- **LongWep**: rows 57–63 (y 912–1008px)
- **MedWep**: rows 64–65 (y 1024–1040px)
- **Money**: rows 66–73 (y 1056–1168px)
- **Music**: rows 74–79 (y 1184–1264px)
- **Potion**: rows 80–84 (y 1280–1344px)
- **Ring**: rows 85–90 (y 1360–1440px)
- **Rock**: rows 91–92 (y 1456–1472px)
- **Scroll**: rows 93–98 (y 1488–1568px)
- **Shield**: rows 99–99 (y 1584–1584px)
- **ShortWep**: rows 100–104 (y 1600–1664px)
- **Tool**: rows 105–107 (y 1680–1712px)
- **Wand**: rows 108–114 (y 1728–1824px)

## Phaser 3

```javascript
// preload
this.load.atlas('items',  'ItemsAtlas0.png', 'ItemsAtlas.json');
this.load.atlas('items1', 'ItemsAtlas1.png', 'ItemsAtlas.json');

// create — static sprite by name
this.add.sprite(x, y, 'items', 'silver bullets');

// 2-frame walk animation (shared atlas JSON, two texture keys)
this.anims.create({
  key: 'silver bullets-walk',
  frames: [
    { key: 'items',  frame: 'silver bullets' },
    { key: 'items1', frame: 'silver bullets' },
  ],
  frameRate: 2,
  repeat: -1,
});
```

## Plain HTML / CSS

```html
<script type="module">
  const atlas = await fetch('ItemsAtlas.json').then(r => r.json());
  function showSprite(name, el) {
    const { x, y } = atlas.byName[name];
    Object.assign(el.style, {
      backgroundImage:    'url(ItemsAtlas0.png)',
      backgroundPosition: `-${x}px -${y}px`,
      width:  '16px',
      height: '16px',
      imageRendering: 'pixelated',
      display: 'inline-block',
    });
  }
  showSprite('silver bullets', document.querySelector('#sprite'));
</script>
<div id="sprite"></div>
```

## React (existing Sprite / SpriteSheet components)

```jsx
import atlas from './ItemsAtlas.json';

// Single frame via Sprite component
<Sprite
  src="ItemsAtlas0.png"
  frame={atlas.byName['silver bullets'].globalFrame}
  cols={8}
  tileSize={16}
/>

// Full atlas via SpriteSheet — tooltips load automatically from ItemsAtlas0.frames.json
<SpriteSheet
  imagePath="/atlas/ItemsAtlas0.png"
  columns={8}
  tileSize={16}
  animated={true}
  animationPair="/atlas/ItemsAtlas1.png"
/>
```
