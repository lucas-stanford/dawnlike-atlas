import React from 'react';
import MenuExample from '../src/MenuExample';

export default {
  title: 'Examples/Menu HUD',
  component: MenuExample,
  parameters: { layout: 'centered' },
};

export const Default = {
  render: () => <MenuExample />,
};
