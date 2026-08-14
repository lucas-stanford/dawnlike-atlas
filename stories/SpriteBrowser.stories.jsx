import React from 'react';
import SpriteBrowserExample from '../src/SpriteBrowserExample';

export default {
  title: 'Dawnlike/Sprite Browser',
  component: SpriteBrowserExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Searchable catalogue of all 4,157 named sprites. Type to match on ' +
          'names *and* AI-generated tags, stack tag filters, then click a result ' +
          'for its atlas record plus ready-to-paste React / CSS / Phaser snippets. ' +
          'Double-click any cell to copy its name. This is also the reference ' +
          'usage of `dawnlike-atlas/atlas-api` — everything on screen comes from ' +
          '`searchSprites`, `tagIndex`, `spriteCell` and `animationFrames`.',
      },
    },
  },
  argTypes: {
    query: {
      control: { type: 'text' },
      description: 'Initial search. Every word must appear in the name or tags.',
    },
    tag: {
      control: { type: 'text' },
      description: 'Initial tag filter, e.g. "creature" or "metallic".',
    },
    animatedOnly: {
      control: { type: 'boolean' },
      description: 'Restrict to the 1,258 sprites with a second frame.',
    },
    scale: {
      control: { type: 'range', min: 1, max: 4, step: 1 },
      description: 'Thumbnail render scale.',
    },
  },
  args: {
    query: '',
    tag: '',
    animatedOnly: false,
    scale: 2,
  },
};

const render = (args) => <SpriteBrowserExample {...args} />;

export const Browser = { name: 'Sprite Browser', render };

/** Every sprite that flips to a second frame on DawnlikeAtlas1.png. */
export const Animated = {
  name: 'Animated sprites',
  args: { animatedOnly: true },
  render,
};

/** The monster roster, filtered down by tag. */
export const Creatures = {
  name: 'Creatures',
  args: { tag: 'creature' },
  render,
};

/** Wall families — the raw material for the autotile resolvers. */
export const Walls = {
  name: 'Wall families',
  args: { query: 'wall' },
  render,
};
