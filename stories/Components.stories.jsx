import React from 'react';
import ComponentsExample from '../src/ComponentsExample';

export default {
  title: 'Dawnlike/Components',
  component: ComponentsExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Live gallery of the components exported from the `dawnlike-atlas` ' +
          'package, each rendered with the props shown beside it. Covers the two ' +
          'addressing styles — `<AtlasSprite>` / `<AtlasTileMap>` address sprites ' +
          'by name via the atlas JSON, while `<Sprite>` / `<AnimatedSprite>` ' +
          'address frames by index on any uniform grid — plus a HUD assembled ' +
          'entirely from GUI sprites that live inside the mega-atlas.',
      },
    },
  },
  argTypes: {
    sprite: {
      control: { type: 'text' },
      description: 'Sprite name to feature. Falls back to "wizard" if unknown.',
    },
    scale: {
      control: { type: 'range', min: 1, max: 6, step: 1 },
      description: 'Render scale for the featured sprite.',
    },
    animated: {
      control: { type: 'boolean' },
      description: 'Flip animated sprites to their second frame on DawnlikeAtlas1.png.',
    },
  },
  args: {
    sprite: 'wizard',
    scale: 3,
    animated: true,
  },
};

const render = (args) => <ComponentsExample {...args} />;

export const Components = { name: 'Components', render };

/** An animated sprite, to show the two-frame flip clearly. */
export const AnimatedSprite = {
  name: 'Animated sprite',
  args: { sprite: 'fighting fish', scale: 4 },
  render,
};

/** Animation off — useful for comparing frame 0 against the flip. */
export const StaticOnly = {
  name: 'Animation off',
  args: { animated: false },
  render,
};
