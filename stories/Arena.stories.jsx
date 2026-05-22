import React from 'react';
import ArenaExample from '../src/ArenaExample';

// Theme presets — each just remaps the four sprite knobs (ground,
// obstacleKind, obstacleStyle, hazardSprite). Generator topology is
// identical for every theme so re-rolling the seed gives a fresh layout
// in the same style.
const THEMES = {
  'forest ambush': {
    groundStyle:   'day grass floor',
    obstacleKind:  'tree',
    obstacleStyle: 'light oak',
    hazardSprite:  null,
    hazardDensity: 0,
    interiorDecors: ['white flowers', 'sparse white flowers', 'red flowers', 'pebble', 'rock'],
    ringNoiseScale: 4,
    ringThickness:  3,
    entrySide:      'w',
    trailStyle:     'day dirt floor',
  },
  'desert canyon': {
    groundStyle:   'day dirt floor',
    obstacleKind:  'mountain',
    obstacleStyle: 'brown peak',
    hazardSprite:  null,
    hazardDensity: 0,
    interiorDecors: ['pebble', 'rock', 'bones', 'old bones', 'sparse gold flowers'],
    ringNoiseScale: 5,
    ringThickness:  3,
    entrySide:      'w',
    trailStyle:     'day stone floor',
  },
  'volcanic pit': {
    groundStyle:   'dusk dirt floor',
    obstacleKind:  'mountain',
    obstacleStyle: 'red volcano',
    hazardSprite:  'lava puddle',
    hazardDensity: 0.05,
    interiorDecors: ['bones', 'old bones', 'rock', 'pebble'],
    ringNoiseScale: 5,
    ringThickness:  3,
    entrySide:      'w',
    trailStyle:     'dusk stone floor',
  },
  'swamp clearing': {
    groundStyle:   'night dirt floor',
    obstacleKind:  'tree',
    obstacleStyle: 'dark mangrove',
    hazardSprite:  'green puddle',
    hazardDensity: 0.06,
    interiorDecors: ['pebble', 'rock', 'green liquid drizzle', 'green liquid spatter'],
    ringNoiseScale: 5,
    ringThickness:  3,
    entrySide:      'w',
    trailStyle:     'night stone floor',
  },
  'ruined courtyard': {
    groundStyle:   'dusk tile floor',
    obstacleKind:  'wall',
    obstacleStyle: 'bright brick wall',
    hazardSprite:  null,
    hazardDensity: 0,
    interiorDecors: ['rock', 'pebble', 'bones', 'old bones', 'red flowers'],
    ringNoiseScale: 3,
    ringThickness:  2,
    entrySide:      'w',
    trailStyle:     'dusk brick floor',
  },
  'chaos circle': {
    groundStyle:   'night dirt floor',
    obstacleKind:  'tree',
    obstacleStyle: 'burning oak',
    hazardSprite:  'lava puddle',
    hazardDensity: 0.06,
    interiorDecors: ['bones', 'old bones', 'rock', 'pebble', 'lava drizzle'],
    ringNoiseScale: 4,
    ringThickness:  3,
    entrySide:      'w',
    trailStyle:     'night stone floor',
  },
};
const THEME_NAMES = Object.keys(THEMES);

export default {
  title: 'Dawnlike/Zone Examples/Arena',
  component: ArenaExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Small ambush / combat arena. Every theme uses the same generator: a noisy ' +
          'perimeter ring of obstacles (driven by simplex noise so the ring has ' +
          'organic gaps), a short entry trail through one side, and a scatter of ' +
          'interior cover. Pick a theme below to swap palettes; the Reseed button ' +
          'in-canvas rolls a fresh layout in the same style.',
      },
    },
  },
  argTypes: {
    theme: {
      table: { category: 'Preset' },
      control: { type: 'select' },
      options: THEME_NAMES,
      description: 'Theme preset. Drives the four sprite knobs (ground, obstacle, hazard, trail) and the ring noise scale.',
    },
    seed: {
      table: { category: 'Generator' },
      control: { type: 'number' },
      description: 'Random seed. Same seed + same controls → identical arena.',
    },
    width: {
      table: { category: 'Generator' },
      control: { type: 'range', min: 14, max: 40, step: 1 },
      description: 'Arena width in tiles.',
    },
    height: {
      table: { category: 'Generator' },
      control: { type: 'range', min: 12, max: 30, step: 1 },
      description: 'Arena height in tiles.',
    },
    ringThreshold: {
      table: { category: 'Generator · Ring' },
      control: { type: 'range', min: -0.5, max: 0.5, step: 0.05 },
      description: 'Density of the obstacle ring. Higher value → more gaps in the wall.',
    },
    ringThickness: {
      table: { category: 'Generator · Ring' },
      control: { type: 'range', min: 1, max: 5, step: 1 },
      description: 'How many tiles inward from the edge the ring may extend.',
    },
    entrySide: {
      table: { category: 'Generator · Ring' },
      control: { type: 'select' },
      options: ['n', 's', 'e', 'w'],
      description: 'Which map edge the entry trail cuts in from.',
    },
  },
  args: {
    theme: 'forest ambush',
    seed: Math.floor(Math.random() * 1_000_000),
    width: 24,
    height: 18,
    ringThreshold: 0.0,
    ringThickness: 3,
    entrySide: 'w',
  },
};

// Single-story hoisting: export name == last segment of title. The
// theme preset is the source of truth for the sprite-style fields
// (so flipping the dropdown actually changes the palette); the args
// only carry generator/topology knobs.
export const Arena = {
  name: 'Arena',
  render: ({ theme, ...overrides }) => {
    const preset = THEMES[theme] || {};
    return (
      <ArenaExample
        key={JSON.stringify({ theme, ...overrides })}
        {...preset}
        {...overrides}
      />
    );
  },
};
