import React from 'react';
import SewerExample from '../src/SewerExample';

// Theme presets — each remaps the three sprite knobs (floor walkway,
// channel sludge, perimeter wall). The layout (central channel + brick
// walkways + crossing bridges) is identical for every theme.
const THEMES = {
  'murky sewer': {
    floorStyle: 'dusk brick floor',
    poolStyle:  'stone murky pool',
    wallStyle:  'dark brick wall',
    decors: ['sewer rat', 'green slime', 'bones', 'old bones', 'pebble'],
  },
  'toxic drain': {
    floorStyle: 'night brick floor',
    poolStyle:  'metal toxic pool',
    wallStyle:  'dim mine wall',
    decors: ['green slime', 'slime mold', 'skull', 'bones', 'pebble'],
  },
  'flooded cistern': {
    floorStyle: 'day brick floor',
    poolStyle:  'brick clear pool',
    wallStyle:  'bright brick wall',
    decors: ['sewer rat', 'frog', 'bones', 'pebble'],
  },
  'acid works': {
    floorStyle: 'dusk brick floor',
    poolStyle:  'acid pool',
    wallStyle:  'dark mine wall',
    decors: ['green slime', 'slime mold', 'skull', 'old bones'],
  },
  'lava conduit': {
    floorStyle: 'night brick floor',
    poolStyle:  'lava pool',
    wallStyle:  'dark brick wall',
    decors: ['skull', 'old bones', 'bones', 'pebble'],
  },
};
const THEME_NAMES = Object.keys(THEMES);

export default {
  title: 'Dawnlike/Zone Examples/Sewer',
  component: SewerExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Underground sewer tunnel. A single sludge channel (autotiled with ' +
          'the DawnLike pool family) runs straight down the middle, with brick ' +
          'floor walkways on either side and a brick wall ringing the chamber. ' +
          'A few brick bridges cross the channel to keep the walkways connected. ' +
          'Pick a theme to swap palettes; the Reseed button in-canvas rolls a ' +
          'fresh decor scatter.',
      },
    },
  },
  argTypes: {
    theme: {
      table: { category: 'Preset' },
      control: { type: 'select' },
      options: THEME_NAMES,
      description: 'Theme preset. Drives the floor, channel, and wall sprite styles.',
    },
    seed: {
      table: { category: 'Generator' },
      control: { type: 'number' },
      description: 'Random seed for the decor scatter. Same seed + same controls → identical layout.',
    },
    width: {
      table: { category: 'Generator' },
      control: { type: 'range', min: 12, max: 40, step: 1 },
      description: 'Chamber width in tiles.',
    },
    height: {
      table: { category: 'Generator' },
      control: { type: 'range', min: 10, max: 30, step: 1 },
      description: 'Chamber height in tiles.',
    },
    channelWidth: {
      table: { category: 'Generator · Channel' },
      control: { type: 'range', min: 1, max: 6, step: 1 },
      description: 'Width of the central sludge channel in tiles.',
    },
    bridgeCount: {
      table: { category: 'Generator · Channel' },
      control: { type: 'range', min: 0, max: 6, step: 1 },
      description: 'Number of brick crossing bridges over the channel.',
    },
    decorDensity: {
      table: { category: 'Generator · Decor' },
      control: { type: 'range', min: 0, max: 0.25, step: 0.01 },
      description: 'Chance any walkway tile gets a decor sprite.',
    },
  },
  args: {
    theme: 'murky sewer',
    seed: Math.floor(Math.random() * 1_000_000),
    width: 26,
    height: 18,
    channelWidth: 2,
    bridgeCount: 3,
    decorDensity: 0.06,
  },
};

// Single-story hoisting: export name == last segment of title. The theme
// preset is the source of truth for the sprite-style fields; the args
// only carry generator/topology knobs.
export const Sewer = {
  name: 'Sewer',
  render: ({ theme, ...overrides }) => {
    const preset = THEMES[theme] || {};
    return (
      <SewerExample
        key={JSON.stringify({ theme, ...overrides })}
        {...preset}
        {...overrides}
      />
    );
  },
};
