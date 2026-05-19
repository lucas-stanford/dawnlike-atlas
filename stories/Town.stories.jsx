import React from 'react';
import TownExample from '../src/TownExample';

export default {
  title: 'Zone Examples/Town',
  component: TownExample,
};

// Single-story hoisting: export name == last segment of title makes
// the sidebar leaf disappear so the title doubles as the entry point.
export const Town = {
  render: () => <TownExample />,
};
