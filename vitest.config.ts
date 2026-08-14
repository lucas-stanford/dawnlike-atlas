import { defineConfig } from 'vitest/config';

/**
 * Default test project: plain Node unit tests over the atlas metadata,
 * the autotile resolvers, the atlas helper API, and the tactical
 * toolkit. No browser, no Storybook — `bun run test` is fast and works
 * on a bare CI runner.
 *
 * The Storybook browser-test project lives in `vitest.storybook.config.ts`
 * (`bun run test:storybook`); it needs a Storybook major that matches
 * `@storybook/addon-vitest`, so it is deliberately kept out of the
 * default run.
 */
export default defineConfig({
  test: {
    name: 'unit',
    environment: 'node',
    include: ['tests/**/*.test.{js,ts}'],
    coverage: {
      provider: 'v8',
      include: ['src/utils/**/*.js'],
      exclude: ['src/utils/**/*.d.ts', 'src/utils/spriteAnim.js'],
    },
  },
});
