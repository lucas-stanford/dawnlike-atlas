import React from 'react';
import { SpriteSheet } from '../src/components/SpriteSheet';

export default {
  title: 'DawnLike/Mega Atlas',
  parameters: {
    layout: 'fullscreen',
  },
};

export const AllSprites = {
  name: 'All 3,853 Sprites (1024×976px)',
  render: () => (
    <SpriteSheet
      imagePath="/DawnlikeAtlas0.png"
      metadataPath="/DawnlikeAtlas.json"
      title="Dawnlike Mega-Atlas — every named sprite in a single 1024×976 PNG"
      description="All 3,853 named sprites from Characters, Items, Objects, and GUI bin-packed into one tightly-packed 64×61 grid. Each sprite occupies exactly one 16×16 cell. Toggle animation to see alt frames for the 1,970 animated sprites; non-animated sprites are identical in both atlases. Hover any cell to see its name from the atlas lookup."
      columns={64}
      tileSize={16}
      defaultScale={1}
      animated={true}
      animationPair="/DawnlikeAtlas1.png"
    />
  ),
};
