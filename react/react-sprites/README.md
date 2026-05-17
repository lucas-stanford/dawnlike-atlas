# React Sprite Components

Reusable React components for displaying sprites from pixel art spritesheets.

## Structure

```
react-sprites/              # Common base components (copy to any project)
├── Sprite.jsx              # Base sprite display
├── AnimatedSprite.jsx      # Animated sprites
├── SpriteIcon.jsx          # Generic icon with frame lookup
├── ui/                     # 9-Slice UI components (shadcn-style)
│   ├── NineSlicePanel.jsx  # Resizable panels with 9-slice
│   ├── PixelButton.jsx     # Sprite-based buttons
│   ├── ProgressBar.jsx     # Health/mana/XP bars
│   └── index.js
└── index.js

asset-packs/
├── dawnlike/react/         # DawnLike-specific components
│   ├── frames.js           # GUI frame constants
│   ├── icons.jsx           # HealthBar, ManaBar, DawnLikeIcon
│   └── index.js
│
└── pixel-dungeon/react/    # Pixel Dungeon-specific components
    ├── assets.js           # Button paths
    ├── buttons.jsx         # LeftButton, RightButton, DPad
    └── index.js
```

## Installation

**Common components only:**
```bash
cp -r react-sprites/ your-project/src/components/sprites/
```

**With DawnLike assets:**
```bash
cp -r react-sprites/ your-project/src/components/sprites/
cp -r asset-packs/dawnlike/react/ your-project/src/components/dawnlike/
```

**With Pixel Dungeon assets:**
```bash
cp -r react-sprites/ your-project/src/components/sprites/
cp -r asset-packs/pixel-dungeon/react/ your-project/src/components/pixel-dungeon/
```

## Base Components

### `<Sprite>`

Display a single frame from a spritesheet.

```jsx
import { Sprite } from './sprites';

<Sprite
  src="/assets/GUI/GUI0.png"
  frame={0}      // Frame index
  cols={8}       // Columns in spritesheet
  size={16}      // Frame size in pixels
  scale={2}      // Display scale
/>
```

### `<HoverSprite>`

Sprite that changes texture on hover.

```jsx
<HoverSprite
  src="/assets/GUI0.png"
  hoverSrc="/assets/GUI1.png"
  frame={0}
/>
```

### `<AnimatedSprite>`

Cycles through multiple frames.

```jsx
<AnimatedSprite
  src="/assets/player.png"
  frames={[0, 1, 2, 3]}
  fps={8}
  loop={true}
/>
```

### `<PulsingSprite>`

Smoothly pulses between normal and glow textures.

```jsx
<PulsingSprite
  src="/assets/GUI0.png"
  glowSrc="/assets/GUI1.png"
  frame={0}
  pulseDuration={800}
/>
```

### `<SpriteIcon>`

Generic icon with semantic name lookup.

```jsx
<SpriteIcon
  name="sword"
  frames={{ sword: 24, shield: 25 }}
  src="/assets/icons.png"
/>
```

### `<StatBar>`

Generic stat bar using fill icons.

```jsx
<StatBar
  current={75}
  max={100}
  count={5}
  fillFrameNames={['empty', 'quarter', 'half', 'threeQuarter', 'full']}
  frames={myFrames}
  src="/assets/icons.png"
/>
```

## 9-Slice UI Components (shadcn-style)

Pre-built UI components using 9-slice scaling for pixel art games.

### `<NineSlicePanel>`

Resizable panel with 9-slice borders.

```jsx
import { NineSlicePanel } from './sprites';

<NineSlicePanel
  src="/assets/GUI/GUI0.png"
  frames={{ tl: 32, t: 33, tr: 34, l: 40, c: 41, r: 42, bl: 48, b: 49, br: 50 }}
  width={200}
  height={150}
  scale={2}
>
  <p>Panel content here</p>
</NineSlicePanel>
```

### `<PixelButton>`

Sprite-based button with hover/pressed states.

```jsx
import { PixelButton } from './sprites';

<PixelButton
  src="/assets/GUI/GUI0.png"
  frame={72}
  hoverFrame={73}
  onClick={handleClick}
/>
```

### `<IconButton>`

Button with a React icon component (Lucide, React Icons, Phosphor, Heroicons, etc.)

```jsx
import { IconButton } from './sprites';
import { Heart, Settings, X } from 'lucide-react';

<IconButton icon={Heart} onClick={handleLike} title="Like" />
<IconButton icon={Settings} size={24} onClick={openSettings} />
<IconButton icon={X} color="#ff0000" onClick={handleClose} />
```

Works with any icon library:
```jsx
// react-icons
import { FaHeart } from 'react-icons/fa';
<IconButton icon={FaHeart} onClick={handleLike} />

// phosphor-react
import { Heart } from 'phosphor-react';
<IconButton icon={Heart} onClick={handleLike} />
```

## Styling

All components render with `imageRendering: pixelated` for crisp pixel art.

Add custom styles via `className` or `style` props:

```jsx
<Sprite
  src={src}
  frame={0}
  className="my-sprite"
  style={{ filter: 'drop-shadow(2px 2px 0 black)' }}
/>
```

## No Dependencies

These components only require React. No additional packages needed.
