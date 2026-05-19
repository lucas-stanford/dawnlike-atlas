import React from 'react';
import DungeonExample from '../src/DungeonExample';

export default {
  title: 'Zone Examples/Dungeon',
  component: DungeonExample,
};

// Single-story hoisting: export name == last segment of title collapses
// the sidebar leaf so the title doubles as the entry point ("Default"
// no longer shows up as a redundant child).
export const Dungeon = {
  render: () => <DungeonExample />,
};
