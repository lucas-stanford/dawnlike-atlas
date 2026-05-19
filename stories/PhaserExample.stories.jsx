import React from 'react';
import PhaserExample from '../src/PhaserExample';

export default {
  title: 'Examples/Phaser Roguelike',
  component: PhaserExample,
  parameters: { layout: 'centered' },
};

export const Default = {
  render: () => <PhaserExample />,
};
