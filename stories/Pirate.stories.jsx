import React from 'react';
import PirateExample from '../src/PirateExample';

export default {
  title: 'Dawnlike/Games and Systems/Pirate',
  component: PirateExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'An archipelago treasure run — sail out, anchor off an island, row ashore, ' +
          'dig up the cache, and get it home to the cove before something takes the ' +
          'ship apart. The rules live in `src/utils/pirate.js` as a pure state machine ' +
          'with no React and no atlas dependency, so the whole game is unit tested in ' +
          '`tests/pirate.test.js`; this story is input handling and drawing on top of it.' +
          '\n\n' +
          '**DawnLike does not draw a ship.** Not one, in 4,157 sprites — no hull, no deck, ' +
          'no sail. So `scripts/generate-ship-deck.mjs` draws one, the same way ' +
          '`generate-shore.mjs` draws the coastline the pack also lacks: 31 tiles of ' +
          'planking, gunwale, prow and mast, in the five DawnBringer 16 entries ' +
          "DawnLike uses for its own wooden doors. The ship is not a sprite — it is a " +
          'six-cell tile map that moves.' +
          '\n\n' +
          'The idea worth stealing is what happens to the hull. Autotile resolvers are ' +
          'normally run once over a static map, but here the gunwale is re-resolved from ' +
          'the footprint every time the ship comes about. Heading north the six cells ' +
          'resolve to `nw ne / w e / sw se`; heading east, to `nw sw / n s / ne se`. ' +
          'Nothing in the example knows that — `resolveDawnLikeFloorName` works it out ' +
          'from the neighbour truth table, exactly the way it works out the outline of a ' +
          'ploughed field. **A rigid body is just a very small map that happens to ' +
          'rotate.**' +
          '\n\n' +
          'The wind is the other half. There is no compass rose and no sail sprite in ' +
          'the pack, so the wind is not drawn at all — it is a rule. Running before it ' +
          'costs one watch, reaching across it two, beating into it three, and the ship ' +
          'only ever moves forwards. That single rule is what turns a grid walk into a ' +
          'routing problem, and it needs no art whatsoever.' +
          '\n\n' +
          'Click the map to give it focus, then **W** to sail, **A**/**D** to put the ' +
          'helm over, **Space** for the obvious action, **R** to row ashore and back, ' +
          'and **E** to end the day.',
      },
    },
  },
  argTypes: {
    seed: {
      table: { category: 'Voyage' },
      control: { type: 'number' },
      description: 'Same seed → the same islands, caches, beasts and opening wind.',
    },
    width: {
      table: { category: 'Voyage' },
      control: { type: 'range', min: 20, max: 44, step: 1 },
    },
    height: {
      table: { category: 'Voyage' },
      control: { type: 'range', min: 14, max: 30, step: 1 },
    },
    islands: {
      table: { category: 'Voyage' },
      control: { type: 'range', min: 2, max: 9, step: 1 },
      description:
        'How many blobs the generator tries to grow. Some are rejected for being '
        + 'too small to hold a cache, so the count on the chart can come out lower.',
    },
    canopyStyle: {
      table: { category: 'Sprites' },
      control: { type: 'select' },
      options: ['palm', 'light oak', 'dark mangrove', 'cactus', 'light pine'],
      description:
        'Island canopy, through the corner-blob forest resolver. `palm` is the only '
        + 'one that looks like it belongs on sand, which is exactly why the pack '
        + 'ships it.',
    },
    captainSprite: {
      table: { category: 'Sprites' },
      control: { type: 'select' },
      options: ['captain', 'watch captain', 'bandit', 'soldier', 'shopkeeper'],
    },
  },
  args: {
    seed: 20260825,
    width: 34,
    height: 22,
    islands: 5,
    canopyStyle: 'palm',
    captainSprite: 'captain',
  },
};

export const Playable = { render: (args) => <PirateExample {...args} /> };

/**
 * A tight cluster. With the islands close together the wind rule barely
 * bites, which is the useful comparison: it shows how much of the
 * difficulty in the default map is distance rather than danger.
 */
export const NarrowStraits = {
  name: 'Narrow straits',
  args: { seed: 771204, width: 24, height: 16, islands: 6 },
  render: (args) => <PirateExample {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          'Six islands in a small sea. Deep water is scarce, so the beasts that only '
          + 'swim it have almost nowhere to hunt — and the lagoons are too tight for a '
          + '3x2 hull to come about in, which is its own kind of trouble.',
      },
    },
  },
};

/**
 * The open crossing: few islands, a lot of deep water between them, and
 * every deep-water beast able to reach you the whole way.
 */
export const OpenOcean = {
  name: 'Open ocean',
  args: { seed: 418823, width: 42, height: 28, islands: 3 },
  render: (args) => <PirateExample {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          'Three islands scattered across a wide sea. Every crossing is long, the '
          + 'lagoons that keep deep-water beasts out are far apart, and a full hold has '
          + 'to survive the whole way home.',
      },
    },
  },
};
