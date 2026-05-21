import React from 'react';
import MenuExample, { FRAME_FAMILIES } from '../src/MenuExample';

export default {
  title: 'Dawnlike/Examples/Menu HUD',
  component: MenuExample,
  parameters: { layout: 'centered' },
  argTypes: {
    frameFamily: {
      name: 'Frame color',
      description: 'Color scheme for menu/dialogue frames',
      control: { type: 'select' },
      options: FRAME_FAMILIES,
    },
  },
  args: {
    frameFamily: 'gray white',
  },
};

// Single-story hoisting: export name == last segment of title makes
// the sidebar leaf disappear so the title doubles as the entry point.
export const MenuHUD = {
  render: (args) => <MenuExample {...args} />,
};
