import React from 'react';
import IslandExample from '../src/IslandExample';

// Theme presets remap the five sprite families. The generator knobs
// (sea level, tree line, …) stay independent so a preset can be
// combined with any terrain shape.
const THEMES = {
  'temperate isle': {
    waterStyle: 'stone clear pool center',
    shoreStyle: 'sand shore',
    grassStyle: 'day grass floor',
    treeStyle: 'light oak',
    mountainStyle: 'brown peak',
    decors: ['pebble', 'rock', 'red cap mushroom'],
  },
  'tropical atoll': {
    waterStyle: 'brick clear pool center',
    shoreStyle: 'sand shore',
    grassStyle: 'morning grass floor',
    treeStyle: 'palm',
    mountainStyle: 'yellow peak',
    decors: ['pebble', 'boulder'],
  },
  'arctic shelf': {
    waterStyle: 'metal clear pool center',
    shoreStyle: 'snow shore',
    grassStyle: 'night grass floor',
    treeStyle: 'light snowy pine',
    mountainStyle: 'blue snowcap',
    decors: ['pebble', 'bones', 'skull'],
  },
  'volcanic caldera': {
    waterStyle: 'lava pool center',
    shoreStyle: 'ash shore',
    grassStyle: 'dusk dirt floor',
    treeStyle: 'bare oak',
    mountainStyle: 'red volcano',
    decors: ['skull', 'old bones', 'rock'],
  },
  'blighted marsh': {
    waterStyle: 'stone toxic pool center',
    shoreStyle: 'mud shore',
    grassStyle: 'dusk grass floor',
    treeStyle: 'dark mangrove',
    mountainStyle: 'dark peak',
    decors: ['green slime', 'bones', 'violet fungus'],
  },
  'green lakeshore': {
    waterStyle: 'stone clear pool center',
    shoreStyle: 'grass shore',
    grassStyle: 'day grass floor',
    treeStyle: 'light oak',
    mountainStyle: 'green peak',
    decors: ['pebble', 'red cap mushroom'],
  },
};
const THEME_NAMES = Object.keys(THEMES);

export default {
  title: 'Dawnlike/Zone Examples/Island',
  component: IslandExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A bounded landmass: simplex elevation multiplied by a radial falloff, ' +
          'so the map always resolves to land in the middle and ocean at every edge. ' +
          'Four resolvers cooperate on one map — `resolveDawnLikeShoreName` for the ' +
          'coastline, floor for the meadow, the 8-way forest resolver for woodland, ' +
          'and `resolveDawnLikeMountainName` for the highlands. The shore sprites are ' +
          'drawn by `scripts/generate-shore.mjs`: DawnLike ships no coastline art, and ' +
          'the obvious substitutes fight each other (the pool family draws a dark rocky ' +
          'rim meant for dungeon pools, the floor family a pale rim), so a shore tile ' +
          'carries the whole land→water transition itself and stays transparent where ' +
          'the water goes. Hover any tile to see the layer stack.',
      },
    },
  },
  argTypes: {
    theme: {
      table: { category: 'Preset' },
      control: { type: 'select' },
      options: THEME_NAMES,
      description: 'Remaps the water, shore, meadow, tree and mountain families.',
    },
    seed: {
      table: { category: 'Generator' },
      control: { type: 'number' },
      description: 'Same seed + same controls → identical island.',
    },
    width: {
      table: { category: 'Generator' },
      control: { type: 'range', min: 16, max: 56, step: 1 },
    },
    height: {
      table: { category: 'Generator' },
      control: { type: 'range', min: 12, max: 40, step: 1 },
    },
    seaLevel: {
      table: { category: 'Generator · Terrain' },
      control: { type: 'range', min: 0.15, max: 0.6, step: 0.01 },
      description: 'Elevation below which a tile is ocean. Raise it to drown the island.',
    },
    beachWidth: {
      table: { category: 'Generator · Terrain' },
      control: { type: 'range', min: 0.01, max: 0.2, step: 0.01 },
      description: 'How much elevation the sand band spans above sea level.',
    },
    treeLine: {
      table: { category: 'Generator · Terrain' },
      control: { type: 'range', min: 0.4, max: 1.1, step: 0.02 },
      description: 'Elevation above which meadow becomes bare highland rock.',
    },
    forestDensity: {
      table: { category: 'Generator · Flora' },
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: 'Share of the meadow band covered by woodland stands.',
    },
    decorDensity: {
      table: { category: 'Generator · Flora' },
      control: { type: 'range', min: 0, max: 0.2, step: 0.01 },
      description: 'Chance any open land tile gets a scatter sprite.',
    },
  },
  args: {
    theme: 'temperate isle',
    seed: Math.floor(Math.random() * 1_000_000),
    width: 34,
    height: 24,
    seaLevel: 0.30,
    beachWidth: 0.06,
    treeLine: 0.60,
    forestDensity: 0.55,
    decorDensity: 0.04,
  },
};

const render = ({ theme, ...overrides }) => (
  <IslandExample
    key={JSON.stringify({ theme, ...overrides })}
    {...(THEMES[theme] ?? {})}
    {...overrides}
  />
);

export const Island = { name: 'Island', render };

/** Palms and pale sand — a low, wide atoll. */
export const Atoll = {
  name: 'Tropical atoll',
  args: { theme: 'tropical atoll', seaLevel: 0.4, treeLine: 0.8, forestDensity: 0.4 },
  render,
};

/** Snowcapped highlands: a high tree line pushes rock down to the shore. */
export const Arctic = {
  name: 'Arctic shelf',
  args: { theme: 'arctic shelf', treeLine: 0.52, forestDensity: 0.35 },
  render,
};

/** Lava coastline with a bare, blasted interior. */
export const Volcanic = {
  name: 'Volcanic caldera',
  args: { theme: 'volcanic caldera', treeLine: 0.5, forestDensity: 0.15 },
  render,
};
