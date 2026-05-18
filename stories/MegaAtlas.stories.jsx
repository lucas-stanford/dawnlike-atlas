import React from 'react';
import { SpriteSheet } from '../src/components/SpriteSheet';

export default {
  title: 'DawnLike/Mega Atlas',
  parameters: {
    layout: 'fullscreen',
  },
};

export const AllSprites = {
  name: 'All 3,853 Sprites (1024×1024px)',
  render: () => (
    <SpriteSheet
      imagePath="/DawnlikeAtlas0.png"
      metadataPath="/DawnlikeAtlas.json"
      title="Dawnlike Mega-Atlas — every named sprite in a single 1024×1024 PNG"
      description="3,853 named sprites from Characters, Items, Objects, and GUI bin-packed into a 64×64 grid. The first 3,844 sprites each occupy one 16×16 cell; 9 GUI icons (health/stamina/fire/ice/lightning/save/enter/inventory/surrounded) live in a 48×48 strip at the bottom. Toggle animation to see alt frames for the 1,970 animated sprites; non-animated sprites are identical in both atlases. Hover any cell to see its name from the atlas lookup."
      columns={64}
      tileSize={16}
      defaultScale={1}
      animated={true}
      animationPair="/DawnlikeAtlas1.png"
    />
  ),
};
