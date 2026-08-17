import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

import { playwright } from '@vitest/browser-playwright';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

/**
 * Storybook browser tests — runs every story as a smoke test in headless
 * Chromium.
 *
 * NOTE: `@storybook/addon-vitest` must match the installed Storybook
 * major version. This repo currently pins Storybook 8.6, so this config
 * only loads once Storybook is upgraded to a matching major. It is kept
 * out of the default `vitest.config.ts` so the unit suite always runs.
 *
 * More info: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
 */
export default defineConfig({
  test: {
    name: 'storybook',
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({}),
      instances: [{ browser: 'chromium' }],
    },
  },
  plugins: [storybookTest({ configDir: path.join(dirname, '.storybook') })],
});
