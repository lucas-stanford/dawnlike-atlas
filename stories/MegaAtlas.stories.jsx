import React from 'react';
import { SpriteSheet } from '../src/components/SpriteSheet';

/**
 * Stories for the Mega Atlas — every named sprite from DawnLike packed into
 * a single 2048×2080 PNG (4,157 sprites, 64×65 grid of 32×32 cells, nearest-
 * neighbour 2× of the original 16×16 art).
 *
 * The underlying SpriteSheet component has three modes (Sprites / Library /
 * JSON Data). Each is exposed here as its own top-level Storybook entry so
 * the sidebar shows them as siblings rather than tabs hidden inside one
 * "All Sprites" story.
 */
export default {
  title: 'Dawnlike/Mega Atlas',
  parameters: {
    layout: 'fullscreen',
  },
};

const baseProps = {
  imagePath: '/DawnlikeAtlas0.png',
  metadataPath: '/DawnlikeAtlas.json',
  title: 'Dawnlike Mega-Atlas — every named sprite in a single 2048×2080 PNG',
  description:
    'All 4,157 named sprites from Characters, Items, Objects, and GUI bin-packed into ' +
    'one tightly-packed 64×65 grid. Each sprite occupies exactly one 32×32 cell (nearest- ' +
    'neighbour 2× upscale of the original 16×16 DawnLike art, so every pixel is preserved ' +
    'as a clean 2×2 block). Toggle animation to see alt frames for the 2,226 animated ' +
    'sprites; non-animated sprites are identical in both atlases. Hover any cell to see ' +
    'its name from the atlas lookup.',
  columns: 64,
  tileSize: 32,
  defaultScale: 1,
  animated: true,
  animationPair: '/DawnlikeAtlas1.png',
};

export const Sprites = {
  name: 'Sprites',
  render: () => <SpriteSheet {...baseProps} initialTab="sprites" />,
};

export const Library = {
  name: 'Library',
  render: () => <SpriteSheet {...baseProps} initialTab="library" />,
};

export const JsonData = {
  name: 'JSON Data',
  render: () => <SpriteSheet {...baseProps} initialTab="json" />,
};
