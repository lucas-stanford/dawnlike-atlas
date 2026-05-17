# DawnLike Semantic Atlas

This repository contains a bin-packed **Mega-Atlas** and rich metadata for the [DawnLike](https://dragondeplatino.itch.io/dawnlike) roguelike tileset.

## Contents

- `atlas/`: The production-ready Mega-Atlas.
  - `DawnlikeAtlas0.png`: Primary frames (3,844 sprites).
  - `DawnlikeAtlas1.png`: Animation pair frames.
  - `DawnlikeAtlas.json`: Rich metadata including **AI-generated tags** and semantic connection data.
- `react/`: React components and constants for easy usage in web projects.
- `src/`: Core logic for semantic autotiling and example components.
- `stories/`: Interactive Storybook examples.

## Key Features

- **Semantic Lookup**: Assets are keyed by human-readable names (e.g., `"fighting fish"`, `"bright brick wall left right down"`).
- **AI-Generated Tags**: Over 3,700 sprites have been analyzed and tagged with descriptive keywords (e.g., `creature`, `metallic`, `glowing`).
- **16-Way Autotiling**: Built-in support for standard cardinal autotiling for walls, paths, and forest canopies.
- **Phaser 4 Ready**: Built specifically for high-performance usage in modern web game engines.

## Usage

### Storybook (Examples & Browser)

Start the interactive asset browser and see the autotile generators in action:
```bash
bun install
bun run dev
```

### Semantic Autotiling

```javascript
import { resolveDawnLikeWallName } from './src/utils/autotile';

// Automatically construct the correct sprite name based on neighbors
const name = resolveDawnLikeWallName("bright brick wall", { n, s, e, w }, atlas.byName);
// Result: "bright brick wall left right down"
```

## Credits

Assets by DragonDePlatino and DawnBringer.
Metadata and semantic tools by Gemini CLI.
