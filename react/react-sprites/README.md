# React sprite components

Reusable React components for rendering pixel-art spritesheets, plus the
atlas-aware components that address DawnLike sprites **by name**.

They ship with the `dawnlike-atlas` package, so the normal way in is:

```jsx
import { AtlasSprite, useAtlas, Sprite, NineSlicePanel } from 'dawnlike-atlas';
```

Everything here depends only on React — no other runtime packages.

## Two families of component

| | Addressing | Use when |
| --- | --- | --- |
| `AtlasSprite`, `AtlasTileMap` | by **name**, via `DawnlikeAtlas.json` | You're using the DawnLike mega-atlas |
| `Sprite`, `AnimatedSprite`, `SpriteIcon`, … | by **frame index** on a uniform grid | Any other spritesheet, including the 16×16 GUI sheet |

## Structure

```
react-sprites/
├── AtlasSprite.jsx      # name-addressed sprite + tile map + useAtlas hook
├── Sprite.jsx           # frame-indexed sprite, hover variant
├── AnimatedSprite.jsx   # frame cycling, cross-fade pulse
├── SpriteIcon.jsx       # named-frame icon + generic stat bar
├── ui/
│   ├── NineSlicePanel.jsx
│   ├── PixelButton.jsx  # PixelButton + IconButton
│   └── index.js
└── index.js
```

To lift these into a project that isn't using the npm package, copy the folder:

```bash
cp -r react/react-sprites/ your-project/src/components/sprites/
```

`AtlasSprite.jsx` imports `src/utils/atlasApi.js`; copy that too, or drop the
file if you only want the frame-indexed components.

---

## Atlas components

### `useAtlas(url?)`

Loads `DawnlikeAtlas.json` and shares it across every caller — the underlying
`loadAtlas` dedupes concurrent requests, so fifty sprites cost one fetch.

```jsx
const { atlas, loading, error } = useAtlas('/atlas/DawnlikeAtlas.json');
```

### `<AtlasSprite>`

One DawnLike sprite, addressed by name.

```jsx
<AtlasSprite atlas={atlas} name="wizard" scale={3} animated />
```

| Prop | Default | Meaning |
| --- | --- | --- |
| `atlas` | — | Parsed atlas JSON |
| `name` | — | Key into `atlas.byName` |
| `scale` | `1` | Integer render scale; 32px cells × scale |
| `animated` | `false` | Flip to sheet 1 for sprites flagged `isAnimated` |
| `fps` | `4` | Flip rate while animating |
| `basePath` | `''` | Prefix for the sheet PNG URLs |
| `title` | the name | Tooltip / accessible label |
| `onClick` | — | Makes the sprite a keyboard-accessible button |

Only sprites flagged `isAnimated` in the atlas actually animate, so setting
`animated` across a whole scene is safe. An unknown `name` renders nothing, so a
typo shows up as a hole rather than a mystery blank box.

### `<AtlasTileMap>`

A row-major grid of names. Each cell may be a name, an array of names drawn
bottom-to-top as layers, or `null`.

```jsx
<AtlasTileMap
  atlas={atlas}
  scale={2}
  onTileClick={({ x, y, names }) => console.log(x, y, names)}
  tiles={[
    ['dark brick wall left right', 'dark brick wall left right'],
    ['dusk brick floor c',         ['dusk brick floor c', 'wizard']],
  ]}
/>
```

---

## Frame-indexed components

### `<Sprite>`

One frame from any uniform-grid spritesheet.

```jsx
<Sprite src="/assets/GUI0.png" frame={0} cols={16} size={16} scale={2} />
```

### `<HoverSprite>`

Swaps frame and/or sheet on hover — the usual way to use DawnLike's glow sheet.

```jsx
<HoverSprite src="/assets/GUI0.png" hoverSrc="/assets/GUI1.png" frame={0} />
```

### `<AnimatedSprite>`

Cycles arbitrary frame indices.

```jsx
<AnimatedSprite src="/assets/player.png" frames={[0, 1, 2, 3]} fps={8} loop />
```

Supports `pingPong`, `playing`, and `onComplete` for one-shot animations.

### `<PulsingSprite>`

Cross-fades a glow sheet over the base sheet on a sine curve.

```jsx
<PulsingSprite src="/assets/GUI0.png" glowSrc="/assets/GUI1.png" frame={0} pulseDuration={800} />
```

### `<SpriteIcon>` and `<StatBar>`

Semantic lookup over a caller-supplied `name → frame` map.

```jsx
<SpriteIcon name="sword" frames={{ sword: 24, shield: 25 }} src="/assets/icons.png" />

<StatBar
  current={75}
  max={100}
  count={5}
  fillFrameNames={['empty', 'quarter', 'half', 'threeQuarter', 'full']}
  frames={myFrames}
  src="/assets/icons.png"
/>
```

For DawnLike's GUI sheet specifically, the pre-wired `HealthBar`, `ManaBar`,
`HeartIcon`, `ManaIcon` and `DawnLikeIcon` in `react/icons.jsx` already carry
the frame map.

---

## 9-slice UI

### `<NineSlicePanel>`

A panel that scales without stretching its border.

```jsx
<NineSlicePanel
  src="/assets/GUI0.png"
  frames={{ tl: 32, t: 33, tr: 34, l: 40, c: 41, r: 42, bl: 48, b: 49, br: 50 }}
  width={200}
  height={150}
  scale={2}
>
  <p>Panel content</p>
</NineSlicePanel>
```

### `<PixelButton>`

A sprite-backed button with hover and pressed frames.

```jsx
<PixelButton src="/assets/GUI0.png" frame={72} hoverFrame={73} onClick={handleClick} />
```

### `<IconButton>`

Takes any React icon component — lucide-react, react-icons, phosphor, heroicons.

```jsx
import { Heart, Settings } from 'lucide-react';

<IconButton icon={Heart} onClick={handleLike} title="Like" />
<IconButton icon={Settings} size={24} onClick={openSettings} />
```

---

## Styling

Everything renders with `imageRendering: pixelated`, so integer scales stay
crisp. Pass `className` or `style` to add your own:

```jsx
<Sprite src={src} frame={0} style={{ filter: 'drop-shadow(2px 2px 0 black)' }} />
```

Types for every component are in `index.d.ts`.
