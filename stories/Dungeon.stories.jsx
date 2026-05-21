import React from 'react';
import DungeonExample, { MAP_TYPE_IDS } from '../src/DungeonExample';

// Atlas-discovered values, hardcoded here so Storybook can offer them as a
// select control. If the atlas adds new base styles later this list won't
// auto-grow, but DungeonExample's in-canvas dropdown always reflects the
// live atlas.
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
  'day boulder', 'day brick floor', 'day dirt floor', 'day grass floor',
  'day plowed field', 'day stone floor', 'day tile floor',
  'dusk boulder', 'dusk brick floor', 'dusk dirt floor', 'dusk grass floor',
  'dusk plowed field', 'dusk stone floor', 'dusk tile floor',
  'morning boulder', 'morning brick floor', 'morning dirt floor', 'morning grass floor',
  'morning plowed field', 'morning stone floor', 'morning tile floor',
  'night boulder', 'night brick floor', 'night dirt floor', 'night grass floor',
  'night plowed field', 'night stone floor', 'night tile floor',
];

export default {
  title: 'Dawnlike/Zone Examples/Dungeon',
  component: DungeonExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'rot.js dungeon generator demo. Edit generator settings here in the ' +
          'Controls panel; the in-canvas ⚙️ gear button shows the tile-override log. ' +
          'Hover any tile to see its coordinates, sprite name and the autotile reason; ' +
          'click a tile to pin the popup and use the swatch picker to override any sprite.',
      },
    },
  },
  argTypes: {
    mapType: {
      table: { category: 'Generator' },
      control: { type: 'select' },
      options: MAP_TYPE_IDS,
      description:
        'Which rot.js Map class to use. `digger` and `uniform` carve rooms+corridors; ' +
        '`cellular` produces cave-like blobs (and unlocks the density/smoothing knobs).',
    },
    seed: {
      table: { category: 'Generator' },
      control: { type: 'number' },
      description:
        'Random seed. Same seed → identical map every time. ' +
        'Default is rolled fresh on every page load; set explicitly to pin a map.',
    },
    width: {
      table: { category: 'Generator' },
      control: { type: 'range', min: 20, max: 80, step: 1 },
      description: 'Map width in tiles.',
    },
    height: {
      table: { category: 'Generator' },
      control: { type: 'range', min: 15, max: 60, step: 1 },
      description: 'Map height in tiles.',
    },
    cellularDensity: {
      table: { category: 'Generator · Cellular only' },
      control: { type: 'range', min: 30, max: 70, step: 1 },
      description: 'Initial alive-cell % for the cellular generator. Higher → larger caves.',
    },
    cellularSmooth: {
      table: { category: 'Generator · Cellular only' },
      control: { type: 'range', min: 0, max: 8, step: 1 },
      description: 'Smoothing passes for the cellular generator. More → smoother cave walls.',
    },
    wallStyle: {
      table: { category: 'Tiles' },
      control: { type: 'select' },
      options: WALL_STYLES,
      description: 'Base name of the DawnLike wall sprite family used for the autotile.',
    },
    floorStyle: {
      table: { category: 'Tiles' },
      control: { type: 'select' },
      options: FLOOR_STYLES,
      description: 'Base name of the DawnLike floor sprite family.',
    },
    showConfigInitially: {
      table: { category: 'View' },
      control: 'boolean',
      description: 'Open the in-canvas overrides panel on first render.',
    },
  },
  args: {
    mapType: 'digger',
    seed: Math.floor(Math.random() * 1_000_000),
    width: 40,
    height: 30,
    cellularDensity: 50,
    cellularSmooth: 4,
    wallStyle: 'bright mine wall',
    floorStyle: 'day brick floor',
    showConfigInitially: false,
  },
};

// Single-story hoisting: export name == last segment of title so the
// sidebar leaf disappears. `key` on the component forces a re-mount on
// every args change, so Storybook controls always take effect (the
// in-canvas gear panel uses internal state that wouldn't otherwise sync
// to prop changes).
export const Dungeon = {
  render: (args) => <DungeonExample key={JSON.stringify(args)} {...args} />,
};
