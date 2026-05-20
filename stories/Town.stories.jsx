import React from 'react';
import TownExample from '../src/TownExample';

const WALL_STYLES = [
  'bright acid wall', 'bright blue wall', 'bright brick wall', 'bright deep wall',
  'bright fort wall', 'bright heat wall', 'bright ice wall', 'bright infernal wall',
  'bright mine wall', 'bright orange wall', 'bright rock wall', 'bright snow wall',
  'dark acid wall', 'dark blue wall', 'dark brick wall', 'dark deep wall',
  'dark fort wall', 'dark heat wall', 'dark ice wall', 'dark infernal wall',
  'dark mine wall', 'dark orange wall', 'dark rock wall', 'dark snow wall',
  'dim acid wall', 'dim blue wall', 'dim brick wall', 'dim deep wall',
  'dim fort wall', 'dim heat wall', 'dim ice wall', 'dim infernal wall',
  'dim mine wall', 'dim orange wall', 'dim rock wall', 'dim snow wall',
  'lit acid wall', 'lit blue wall', 'lit brick wall', 'lit deep wall',
  'lit fort wall', 'lit heat wall', 'lit ice wall', 'lit infernal wall',
  'lit orange wall', 'lit rock wall', 'lit snow wall',
];

const FLOOR_STYLES = [
  'day brick floor', 'day stone floor', 'day tile floor',
  'morning brick floor', 'morning stone floor', 'morning tile floor',
];

const STREET_STYLES = [
  'day stone floor', 'day brick floor', 'day dirt floor', 'day tile floor',
  'morning stone floor', 'morning brick floor',
];

const GRASS_STYLES = [
  'morning grass floor', 'day grass floor', 'noon grass floor',
  'evening grass floor', 'night grass floor',
];

const TREE_STYLES = [
  'bare oak', 'bare pine', 'dark oak', 'dark pine', 'light mangrove', 'light oak',
  'light pine', 'light snowy oak', 'light snowy pine', 'palm',
];

export default {
  title: 'Zone Examples/Town',
  component: TownExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Procedurally generated town with buildings (house / inn / pub / smithy / church / shop), ' +
          'NPCs, furniture, signs, paved streets, trees, flowers, and an optional graveyard. ' +
          'Edit generator settings here in the Controls panel; the in-canvas ⚙️ gear button ' +
          'shows the tile-override log. Click any tile to pin the autotile-debug popup and ' +
          'use the swatch picker to override any sprite.',
      },
    },
  },
  argTypes: {
    seed: {
      table: { category: 'Generator' },
      control: { type: 'number' },
      description:
        'Random seed. Same seed → identical town every time. ' +
        'Default is rolled fresh on every page load; set explicitly to pin a map.',
    },
    buildingCount: {
      table: { category: 'Generator' },
      control: { type: 'range', min: 1, max: 14, step: 1 },
      description: 'Target number of buildings to drop into the town.',
    },
    buildingSpacing: {
      table: { category: 'Generator' },
      control: { type: 'range', min: 2, max: 6, step: 1 },
      description: 'Minimum number of grass tiles between buildings (and between buildings and the plaza). Higher values spread the town out.',
    },
    graveyardChance: {
      table: { category: 'Generator' },
      control: { type: 'range', min: 0, max: 100, step: 5 },
      description: 'Percent chance the town has a graveyard.',
    },
    treeChance: {
      table: { category: 'Generator' },
      control: { type: 'range', min: 0, max: 20, step: 1 },
      description: 'Per-grass-tile percent chance to spawn a tree.',
    },
    flowerChance: {
      table: { category: 'Generator' },
      control: { type: 'range', min: 0, max: 20, step: 1 },
      description: 'Per-grass-tile percent chance to spawn a flower.',
    },
    wallStyle: {
      table: { category: 'Tiles' },
      control: { type: 'select' },
      options: WALL_STYLES,
      description: 'Base name of the wall autotile family used for building exteriors.',
    },
    floorStyle: {
      table: { category: 'Tiles' },
      control: { type: 'select' },
      options: FLOOR_STYLES,
      description: 'Base name of the floor sprite family used inside buildings.',
    },
    streetStyle: {
      table: { category: 'Tiles' },
      control: { type: 'select' },
      options: STREET_STYLES,
      description: 'Base name of the street autotile family.',
    },
    mainStreetStyle: {
      table: { category: 'Tiles' },
      control: { type: 'select' },
      options: STREET_STYLES,
      description: 'Base name of the main street autotile family (central plaza).',
    },
    grassStyle: {
      table: { category: 'Tiles' },
      control: { type: 'select' },
      options: GRASS_STYLES,
      description: 'Base name of the grass sprite family used outside buildings.',
    },
    treeStyle: {
      table: { category: 'Tiles' },
      control: { type: 'select' },
      options: TREE_STYLES,
      description: 'Base name of the tree autotile family scattered on grass.',
    },
    showConfigInitially: {
      table: { category: 'View' },
      control: 'boolean',
      description: 'Open the in-canvas overrides panel on first render.',
    },
  },
  args: {
    seed: Math.floor(Math.random() * 1_000_000),
    buildingCount: 6,
    buildingSpacing: 2,
    graveyardChance: 30,
    treeChance: 8,
    flowerChance: 6,
    wallStyle: 'bright brick wall',
    floorStyle: 'day tile floor',
    streetStyle: 'day stone floor',
    mainStreetStyle: 'day brick floor',
    grassStyle: 'day grass floor',
    treeStyle: 'light oak',
    showConfigInitially: false,
  },
};

// Single-story hoisting + key={JSON.stringify(args)} forces re-mount on
// every args change so Storybook controls always take effect.
export const Town = {
  render: (args) => <TownExample key={JSON.stringify(args)} {...args} />,
};
