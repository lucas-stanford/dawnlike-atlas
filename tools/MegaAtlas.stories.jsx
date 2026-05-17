import React from 'react';
import { SpriteSheet } from '../components/SpriteSheet';

export default {
  title: 'DawnLike/Mega Atlas',
  parameters: {
    layout: 'fullscreen',
  },
};

export const AllSprites = {
  name: 'All 3,844 Sprites (1024×976px)',
  render: () => (
    <SpriteSheet
      imagePath="/atlas/DawnlikeAtlas0.png"
      title="Dawnlike Mega-Atlas — every named sprite in a single 1024×976 PNG"
      description="All 3,844 named sprites from Characters, Items, Objects, and GUI bin-packed into one tightly-packed 64×61 grid (98.5% utilization). Each sprite occupies exactly one 16×16 cell. Toggle animation to see alt frames for the 1,970 animated sprites; non-animated sprites are identical in both atlases. Hover any cell to see its name from the atlas lookup."
      columns={64}
      tileSize={16}
      defaultScale={1}
      animated={true}
      animationPair="/atlas/DawnlikeAtlas1.png"
      instructionsPath="/atlas/DawnlikeAtlas.instructions.md"
    />
  ),
};
