import React from 'react';
import FarmExample from '../src/FarmExample';

export default {
  title: 'Dawnlike/Games and Systems/Farm',
  component: FarmExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A complete farming loop — till, sow, water, harvest, sell — built only from ' +
          'sprites the pack already ships. The rules live in `src/utils/farm.js` as a ' +
          'pure state machine with no React and no atlas dependency, so the whole game ' +
          'is unit tested in `tests/farm.test.js`; this story is input handling and ' +
          'drawing on top of it.\n\n' +
          'The idea worth stealing is the clock. DawnLike draws `morning`, `day`, ' +
          '`dusk` and `night` variants of both `grass floor` and `plowed field`, and ' +
          'they are palette rotations rather than lighting passes. Instead of picking ' +
          'one tint and wasting three, the farmer\'s remaining stamina selects which ' +
          'family name goes to `resolveDawnLikeFloorName` — so the farm re-tints as the ' +
          'working day burns down, and every pixel stays on the DawnBringer 16 palette. ' +
          'No CSS filter could do that without going off-palette.\n\n' +
          'Watered soil is the one thing DawnLike does not draw. ' +
          '`scripts/generate-watered-field.mjs` derives a `<tint> watered field` family ' +
          'from the plowed field by palette remap, so wet and dry soil share ' +
          'pixel-identical furrows and only the colour says which is which.\n\n' +
          'Click the map to give it focus, then **WASD** to walk, **Space** to act on ' +
          'the tile you face, **1**–**5** to pick a seed and **E** to end the day.',
      },
    },
  },
  argTypes: {
    seed: {
      table: { category: 'Farm' },
      control: { type: 'number' },
      description: 'Same seed → the same pond, pen, orchard and livestock.',
    },
    width: {
      table: { category: 'Farm' },
      control: { type: 'range', min: 14, max: 34, step: 1 },
    },
    height: {
      table: { category: 'Farm' },
      control: { type: 'range', min: 12, max: 24, step: 1 },
    },
    startingGold: {
      table: { category: 'Farm' },
      control: { type: 'range', min: 0, max: 300, step: 10 },
      description: 'Start poor to feel the seed prices; start rich to explore.',
    },
    farmerSprite: {
      table: { category: 'Sprites' },
      control: { type: 'select' },
      options: ['farmer man', 'farmer woman', 'peasant man', 'peasant woman', 'shopkeeper'],
    },
    waterStyle: {
      table: { category: 'Sprites' },
      control: { type: 'select' },
      options: [
        'stone clear pool center',
        'brick clear pool center',
        'metal clear pool center',
        'stone toxic pool center',
      ],
      description: 'The flat fill under everything. Shore tiles are transparent where '
        + 'their water goes, so this simply shows through.',
    },
    shoreStyle: {
      table: { category: 'Sprites' },
      control: { type: 'select' },
      options: ['mud shore', 'grass shore', 'sand shore', 'snow shore', 'ash shore'],
      description: 'The pond bank, resolved through the 47-tile blob set. Note the '
        + 'shore families are generated in a single tint, so unlike the floor families '
        + 'they do NOT follow the daylight cycle — `mud shore` is the default because '
        + 'its brown ramp sits quietly at all four phases, where `grass shore` stays '
        + 'vividly green after the meadow around it has gone navy.',
    },
    fenceStyle: {
      table: { category: 'Sprites' },
      control: { type: 'select' },
      options: ['stone fence', 'metal fence', 'ice fence'],
    },
  },
  args: {
    seed: 20260817,
    width: 22,
    height: 16,
    startingGold: 60,
    farmerSprite: 'farmer man',
    waterStyle: 'stone clear pool center',
    shoreStyle: 'mud shore',
    fenceStyle: 'stone fence',
  },
};

export const Playable = { render: (args) => <FarmExample {...args} /> };

/**
 * Start with nothing. Seeds are unaffordable until the orchard fruits
 * and the livestock have been tended, which is the intended opening:
 * the free income sources exist to bootstrap the paid ones.
 */
export const HardStart = {
  name: 'Hard start (broke)',
  args: { startingGold: 0 },
  render: (args) => <FarmExample {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          'No gold, so no seeds. Tend the animals and pick the orchard first — those ' +
          'pay without an up-front cost, which is what makes them the opening move.',
      },
    },
  },
};

/**
 * A big plot: enough tiles that stamina, not space, is the binding
 * constraint — which is when the daylight tint starts doing real work
 * as a progress indicator.
 */
export const LargeHolding = {
  name: 'Large holding',
  args: { width: 32, height: 22, startingGold: 220 },
  render: (args) => <FarmExample {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          'More field than one day of stamina can work. Watch the tiles rotate through ' +
          'the four daylight families as the energy bar drains — the farm is literally ' +
          'redrawn from a different sprite set at each phase.',
      },
    },
  },
};
