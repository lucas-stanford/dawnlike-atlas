import React from 'react';
import { SpriteSheet } from '../src/components/SpriteSheet';

export default {
  title: 'DawnLike/Mega Atlas',
  parameters: {
    layout: 'fullscreen',
  },
};

export const AllSprites = {
  name: 'All 4,157 Sprites (2048×2080px, 32×32 tiles)',
  render: () => (
    <SpriteSheet
      imagePath="/DawnlikeAtlas0.png"
      metadataPath="/DawnlikeAtlas.json"
      title="Dawnlike Mega-Atlas — every named sprite in a single 2048×2080 PNG"
      description="All 4,157 named sprites from Characters, Items, Objects, and GUI bin-packed into one tightly-packed 64×65 grid. Each sprite occupies exactly one 32×32 cell (nearest-neighbour 2× upscale of the original 16×16 DawnLike art, so every pixel is preserved as a clean 2×2 block). Toggle animation to see alt frames for the 2,226 animated sprites; non-animated sprites are identical in both atlases. Hover any cell to see its name from the atlas lookup."
      columns={64}
      tileSize={32}
      defaultScale={1}
      animated={true}
      animationPair="/DawnlikeAtlas1.png"
    />
  ),
};
