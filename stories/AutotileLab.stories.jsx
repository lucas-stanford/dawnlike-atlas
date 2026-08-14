import React from 'react';
import AutotileLabExample from '../src/AutotileLabExample';

export default {
  title: 'Dawnlike/Autotile Lab',
  component: AutotileLabExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Interactive playground for every resolver in `src/utils/autotile.js`. ' +
          'Toggle a tile\'s neighbours and watch the sprite change, browse the ' +
          'whole variant sheet for a family, or paint a shape and see it autotile ' +
          'live. The family dropdown is discovered from the atlas at runtime via ' +
          '`autotileFamilies()`, so it always matches what the pack actually ships.',
      },
    },
  },
  argTypes: {
    resolver: {
      control: { type: 'select' },
      options: ['wall', 'openPath', 'floor', 'pool', 'forest', 'mountain'],
      description:
        'Which resolver to explore. `wall` = Objects/Wall building walls, ' +
        '`openPath` = rivers/roads, `forest` = the 8-way canopy set, ' +
        '`mountain` = the 10-sprite blob set.',
    },
    family: {
      control: { type: 'text' },
      description:
        'Sprite family base name, e.g. "bright brick wall". Leave empty to use ' +
        'the first family the atlas offers for the selected resolver.',
    },
    scale: {
      control: { type: 'range', min: 2, max: 5, step: 1 },
      description: 'Render scale for the neighbour pad.',
    },
  },
  args: {
    resolver: 'wall',
    family: '',
    scale: 3,
  },
};

const render = ({ family, ...rest }) => (
  <AutotileLabExample key={`${rest.resolver}-${family}`} family={family || undefined} {...rest} />
);

export const Lab = { name: 'Autotile Lab', render };

/** Rivers and roads — the family whose T-junctions are E/W-inverted. */
export const Rivers = {
  name: 'Rivers & roads',
  args: { resolver: 'openPath', family: 'clear river' },
  render,
};

/** The only 8-way resolver: diagonals decide whether a corner curves. */
export const Forest = {
  name: 'Forest canopy',
  args: { resolver: 'forest', family: 'light oak' },
  render,
};

/** A blob set with no T-junctions — suffixes name the edge, not the connections. */
export const Mountains = {
  name: 'Mountain blob',
  args: { resolver: 'mountain', family: 'blue peak' },
  render,
};
