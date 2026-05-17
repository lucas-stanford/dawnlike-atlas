import React from 'react';
import { SpriteSheet } from '../components/SpriteSheet';

export default {
  title: 'DawnLike/GUI',
  parameters: {
    layout: 'fullscreen',
  },
};

// ============================================================================
// MAIN GUI SPRITESHEET - Full overview with instructions
// ============================================================================
export const Complete_Spritesheet = {
  name: 'Complete Spritesheet',
  render: () => (
    <SpriteSheet
      imagePath="/GUI/GUI0.png"
      title="GUI Elements (Full Spritesheet)"
      description="Complete GUI spritesheet: 16 columns x 20 rows. Click any tile to see its name and frame number from the JSON data."
      columns={16}
      tileSize={16}
      defaultScale={3}
      animated={true}
      animationPair="/GUI/GUI1.png"
    />
  ),
};

// ── Combined Atlas ────────────────────────────────────────────────────────────

export const CombinedAtlas = {
  name: 'Combined Atlas',
  render: () => (
    <SpriteSheet
      imagePath="/atlas/GUIAtlas0.png"
      title="GUI — Combined Atlas"
      description="All 232 named GUI elements in a single 256×304px atlas. Hover any tile to see its name. Toggle animation for idle/alt frames."
      columns={16}
      tileSize={16}
      defaultScale={3}
      animated={true}
      animationPair="/atlas/GUIAtlas1.png"
      instructionsPath="/atlas/GUIAtlas.instructions.md"
    />
  ),
};
