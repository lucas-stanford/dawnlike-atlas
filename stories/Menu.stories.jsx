import React from 'react';
import MenuExample, { FRAME_FAMILIES } from '../src/MenuExample';

export default {
  title: 'Examples/Menu HUD',
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

export const Default = {
  render: (args) => <MenuExample {...args} />,
};
