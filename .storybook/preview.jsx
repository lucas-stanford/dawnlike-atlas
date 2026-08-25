import React from 'react';
import '../src/theme.css';

/* Storybook paints #storybook-root white by default, which flashes around
   every letterboxed map and washes out the docs pages. The class is added
   to <body> rather than styled globally so the theme file stays importable
   from a consuming app without it repainting that app's background. */
if (typeof document !== 'undefined') {
  document.body.classList.add('dl-themed');
}

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
  parameters: {
    backgrounds: {
      default: 'dawnlike',
      values: [
        { name: 'dawnlike', value: '#0a0710' },
        { name: 'db16 black', value: '#140c1c' },
        { name: 'light', value: '#dfefd7' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
};

export default preview;
