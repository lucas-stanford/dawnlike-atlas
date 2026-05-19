import React from 'react';
import OutdoorExample from '../src/OutdoorExample';

export default {
  title: 'Zone Examples/Wilderness',
  component: OutdoorExample,
};

// Single-story hoisting: export name == last segment of title makes
// the sidebar leaf disappear so the title doubles as the entry point.
export const Wilderness = {
  render: () => <OutdoorExample />,
};
