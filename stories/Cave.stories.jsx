import React from 'react';
import CaveExample from '../src/CaveExample';

const THEMES = {
  'deep mine': {
    wallStyle: 'dark mine wall',
    floorStyle: 'night stone floor',
    waterStyle: 'stone murky pool',
    decors: ['luminous mushroom', 'pebble', 'rock', 'bones'],
  },
  'crystal grotto': {
    wallStyle: 'dim mine wall',
    floorStyle: 'dusk stone floor',
    waterStyle: 'stone clear pool',
    decors: ['luminous mushroom', 'globe fungus', 'pebble'],
  },
  'fungal warren': {
    wallStyle: 'dark brick wall',
    floorStyle: 'dusk dirt floor',
    waterStyle: 'stone toxic pool',
    decors: ['violet fungus', 'globe fungus', 'red cap mushroom', 'green slime'],
  },
  'magma vault': {
    wallStyle: 'dark mine wall',
    floorStyle: 'dusk stone floor',
    waterStyle: 'lava pool',
    decors: ['skull', 'old bones', 'rock'],
  },
  'bone ossuary': {
    wallStyle: 'bright brick wall',
    floorStyle: 'day stone floor',
    waterStyle: 'stone murky pool',
    decors: ['skull', 'bones', 'old bones', 'pebble'],
  },
};
const THEME_NAMES = Object.keys(THEMES);

export default {
  title: 'Dawnlike/Zone Examples/Cave',
  component: CaveExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Cellular-automata caverns — the organic counterpart to the ' +
          'rooms-and-corridors Dungeon example. Cave geometry is where naive ' +
          'autotilers break: ragged spurs, diagonal pinches and isolated pillars. ' +
          '`resolveDawnLikeDungeonWallName` handles them by skipping buried rock ' +
          'and only connecting walls when the perpendicular axis is actually open. ' +
          'A flood-fill keeps the largest region so the cavern is always fully ' +
          'walkable, and a distance transform floods the deepest pockets with water.',
      },
    },
  },
  argTypes: {
    theme: {
      table: { category: 'Preset' },
      control: { type: 'select' },
      options: THEME_NAMES,
      description: 'Remaps the rock, floor and water families.',
    },
    seed: {
      table: { category: 'Generator' },
      control: { type: 'number' },
      description: 'Same seed + same controls → identical cavern.',
    },
    width: {
      table: { category: 'Generator' },
      control: { type: 'range', min: 20, max: 60, step: 1 },
    },
    height: {
      table: { category: 'Generator' },
      control: { type: 'range', min: 14, max: 40, step: 1 },
    },
    fillProbability: {
      table: { category: 'Generator · Cellular' },
      control: { type: 'range', min: 0.35, max: 0.65, step: 0.01 },
      description:
        'Initial share of open cells before smoothing. Below ~0.45 the cave ' +
        'closes up; above ~0.58 it opens into one big room.',
    },
    smoothing: {
      table: { category: 'Generator · Cellular' },
      control: { type: 'range', min: 0, max: 8, step: 1 },
      description:
        'Cellular-automata passes. More passes → rounder, more connected caves; ' +
        'zero leaves raw noise, which is the best way to see the wall resolver ' +
        'handle awkward geometry.',
    },
    waterLevel: {
      table: { category: 'Generator · Water' },
      control: { type: 'range', min: 0, max: 0.6, step: 0.05 },
      description: 'Share of the deepest floor tiles flooded into lakes.',
    },
    decorDensity: {
      table: { category: 'Generator · Decor' },
      control: { type: 'range', min: 0, max: 0.2, step: 0.01 },
      description: 'Chance any dry floor tile gets a cave-life sprite.',
    },
  },
  args: {
    theme: 'deep mine',
    seed: Math.floor(Math.random() * 1_000_000),
    width: 40,
    height: 26,
    fillProbability: 0.55,
    smoothing: 4,
    waterLevel: 0.18,
    decorDensity: 0.05,
  },
};

const render = ({ theme, ...overrides }) => (
  <CaveExample
    key={JSON.stringify({ theme, ...overrides })}
    {...(THEMES[theme] ?? {})}
    {...overrides}
  />
);

export const Cave = { name: 'Cave', render };

/** Flooded: most of the cavern floor is underground lake. */
export const FloodedCavern = {
  name: 'Flooded cavern',
  args: { theme: 'crystal grotto', waterLevel: 0.55, smoothing: 5 },
  render,
};

/** Barely smoothed — ragged geometry that stress-tests the wall resolver. */
export const RawNoise = {
  name: 'Raw noise (resolver stress test)',
  args: { theme: 'deep mine', smoothing: 1, fillProbability: 0.55, waterLevel: 0 },
  render,
};

/** Wide open magma vault. */
export const MagmaVault = {
  name: 'Magma vault',
  args: { theme: 'magma vault', fillProbability: 0.56, smoothing: 5, waterLevel: 0.35 },
  render,
};
