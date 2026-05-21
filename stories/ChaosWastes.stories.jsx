import React from 'react';
import OutdoorExample from '../src/OutdoorExample';

// Same option lists as the Wilderness story — kept inline so the two
// stories stay independent.
const TREE_STYLES = [
  'bare oak', 'bare pine', 'brown fungus', 'burning oak', 'burning pine', 'cactus',
  'dark mangrove', 'dark oak', 'dark pine', 'dark snowy bare oak', 'dark snowy bare pine',
  'dark snowy oak', 'dark snowy pine', 'light mangrove', 'light oak', 'light pine',
  'light snowy bare oak', 'light snowy bare pine', 'light snowy oak', 'light snowy pine',
  'palm', 'white fungus',
];

const FLOOR_STYLES = [
  'day boulder', 'day brick floor', 'day dirt floor', 'day grass floor',
  'day plowed field', 'day stone floor', 'day tile floor',
  'dusk boulder', 'dusk brick floor', 'dusk dirt floor', 'dusk grass floor',
  'dusk plowed field', 'dusk stone floor', 'dusk tile floor',
  'morning boulder', 'morning brick floor', 'morning dirt floor', 'morning grass floor',
  'morning plowed field', 'morning stone floor', 'morning tile floor',
  'night boulder', 'night brick floor', 'night dirt floor', 'night grass floor',
  'night plowed field', 'night stone floor', 'night tile floor',
];

const ROAD_STYLES = ['arduous trail', 'dirt trail', 'rocky trail', 'sand trail'];

const RIVER_STYLES = ['clear river', 'cloudy river', 'lava flow', 'noxious river'];

const MOUNTAIN_STYLES = [
  'blue peak', 'blue snowcap', 'blue volcano',
  'brown peak', 'brown snowcap', 'brown volcano',
  'dark peak', 'dark snowcap', 'dark volcano',
  'green mound', 'green peak', 'green snowcap', 'green volcano',
  'red peak', 'red snowcap', 'red volcano',
  'yellow mound', 'yellow peak', 'yellow snowcap', 'yellow volcano',
];

export default {
  title: 'Dawnlike/Zone Examples/Chaos Wastes',
  component: OutdoorExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Burnt-out variant of the overworld generator: charred dusk dirt for ground, ' +
          'a lava flow instead of a river, blackened "burning oak" forests, and red ' +
          'volcanoes for the mountain biome. Same generator, same controls — only the ' +
          'tile defaults differ. Switch any control to mix-and-match palettes.',
      },
    },
  },
  argTypes: {
    seed: {
      table: { category: 'Generator' },
      control: { type: 'number' },
      description:
        'Random seed. Same seed → identical wastes every time. ' +
        'Default is rolled fresh on every page load; set explicitly to pin a map.',
    },
    terrainStyle: {
      table: { category: 'Tiles' },
      control: { type: 'select' },
      options: FLOOR_STYLES,
      description: 'Base name of the DawnLike sprite family used for ground tiles.',
    },
    dirtStyle: {
      table: { category: 'Tiles' },
      control: { type: 'select' },
      options: FLOOR_STYLES,
      description: 'Base name of the DawnLike sprite family used for dirt patches.',
    },
    roadStyle: {
      table: { category: 'Tiles' },
      control: { type: 'select' },
      options: ROAD_STYLES,
      description: 'Base name of the road autotile family.',
    },
    riverStyle: {
      table: { category: 'Tiles' },
      control: { type: 'select' },
      options: RIVER_STYLES,
      description: 'Base name of the river autotile family (defaults to lava flow here).',
    },
    treeStyle: {
      table: { category: 'Tiles' },
      control: { type: 'select' },
      options: TREE_STYLES,
      description: 'Base name of the forest autotile family used inside forest biomes.',
    },
    mountainStyle: {
      table: { category: 'Tiles' },
      control: { type: 'select' },
      options: MOUNTAIN_STYLES,
      description: 'Base name of the mountain blob autotile family used inside mountain biomes.',
    },
    showConfigInitially: {
      table: { category: 'View' },
      control: 'boolean',
      description: 'Open the in-canvas overrides panel on first render.',
    },
  },
  args: {
    seed: Math.floor(Math.random() * 1_000_000),
    // Chaos-wastes palette: charred dusk ground, dark dirt patches, a
    // rocky cracked trail, lava instead of water, burning oak forests,
    // and red volcanoes.
    terrainStyle: 'dusk dirt floor',
    dirtStyle: 'night dirt floor',
    roadStyle: 'rocky trail',
    riverStyle: 'lava flow',
    treeStyle: 'burning oak',
    mountainStyle: 'red volcano',
    showConfigInitially: false,
  },
};

// Single-story hoisting: export name == last segment of title.
export const ChaosWastes = {
  name: 'Chaos Wastes',
  render: (args) => <OutdoorExample key={JSON.stringify(args)} {...args} />,
};
