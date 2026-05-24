import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment:  'node',
    include:      ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    setupFiles:   ['tests/setup.ts'],
    globalSetup:  ['tests/integration/global-setup.ts'],
    testTimeout:  30_000,
    hookTimeout:  120_000,
    pool:         'forks',
    poolOptions:  { forks: { singleFork: true } },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
