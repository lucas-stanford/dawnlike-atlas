import React from 'react';
import BuildingsExample from '../src/BuildingsExample';

/**
 * The buildings — the only art in this pack that is NOT in the mega-atlas.
 *
 * Everything else is one 16px cell, because everything else is a thing you
 * pick up, stand on or fight. A building is a thing you walk around, and
 * cutting one into cells to make it match the pack costs the art and buys
 * nothing: the cells are only ever drawn together, in one arrangement.
 */
export default {
  title: 'Dawnlike/Buildings',
  component: BuildingsExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Five buildings, each a standalone PNG in `atlas/buildings/` on its own '
          + 'palette, placed with `buildingRect` from `dawnlike-atlas/utils/buildings`.\n\n'
          + 'Turn on **Footprint** and note that every roof hangs past the box. That '
          + 'overhang is the reason these are not tiles: a building rasterised into '
          + 'the grid cannot oversail its own walls, and a roof that stops dead at '
          + 'them reads as flat. `buildingRect` returns tiles rather than pixels, so '
          + 'the zoom control is the caller changing its mind, not a second asset.\n\n'
          + 'They are traced from art rather than drawn in code — '
          + '`python3 scripts/trace_building.py shot.png atlas/buildings/`.',
      },
    },
  },
  argTypes: {
    scale: { control: { type: 'inline-radio' }, options: [1, 2, 3, 4] },
    showFootprint: { control: 'boolean' },
  },
};

export const Gallery = {
  args: { scale: 3, showFootprint: true },
};

/**
 * At 1× these are the size they will be in a 16px tile game — which is the
 * only honest test of whether a building reads at all.
 */
export const ActualSize = {
  args: { scale: 1, showFootprint: false },
  parameters: {
    docs: {
      description: {
        story:
          'One logical pixel per screen pixel. The outhouse is under two tiles '
          + 'wide here, and still reads as an outhouse; that is the bar a building '
          + 'has to clear before any of the rest matters.',
      },
    },
  },
};
