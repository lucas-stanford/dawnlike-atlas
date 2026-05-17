# DawnLike Atlas

This repository contains the bin-packed mega-atlas and category-specific atlases for the [DawnLike](https://dragondeplatino.itch.io/dawnlike) roguelike tileset.

## Contents

- `atlas/`: Generated PNG atlases and JSON metadata (Phaser format).
- `source/`: Raw 16x16 sprite sheets and metadata used to build the atlases.
- `react/`: React components and constants for easy usage in web projects.
- `tools/`: Build scripts for generating the atlases from source.
- `.claude/skills/`: Claude skills for looking up sprite data.

## Mega Atlas

The `DawnlikeAtlas` contains all 3,844 sprites from the Characters, Items, Objects, and GUI categories in a single tightly-packed atlas.

- `atlas/DawnlikeAtlas0.png`: Primary frames.
- `atlas/DawnlikeAtlas1.png`: Alternative animation frames.
- `atlas/DawnlikeAtlas.json`: Full metadata with frame names and coordinates.

## Category Atlases

Individual atlases are also provided for:
- Characters
- Items
- Objects
- ObjectsTerrain
- GUI

## Usage

### Phaser 3

```javascript
this.load.atlas('dawnlike', 'atlas/DawnlikeAtlas0.png', 'atlas/DawnlikeAtlas.json');
```

### React

```jsx
import { DawnLikeIcon } from './react';

function App() {
  return <DawnLikeIcon name="heartFull" scale={3} />;
}
```

## Building

Install dependencies:
```bash
npm install sharp
```

Run build scripts:
```bash
npm run build:mega
npm run build:categories
```

## Credits

Assets by DragonDePlatino and DawnBringer.
Atlas generation tools by Claude.
