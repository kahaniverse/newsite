import { defineConfig, devices } from '@playwright/test';

// Playwright auto-starts `npm run dev` so the tests work against a real server.
// The docker stack must be up: `docker compose up -d` from the repo root.
// .env.local must point at the local stack (see .env.local.example).

export default defineConfig({
  testDir:        './tests/e2e',
  fullyParallel:  false,         // shared DB; keep tests sequential
  workers:        1,
  retries:        0,
  reporter:       [['list']],
  // Timeouts are generous because `next dev` compiles routes on first hit; the
  // globalSetup warms them, but leave headroom for cold runs / slow machines.
  timeout:        120_000,
  expect:         { timeout: 15_000 },
  globalSetup:    './tests/e2e/global-setup.ts',

  use: {
    baseURL:           'http://localhost:3000',
    trace:             'on-first-retry',
    screenshot:        'only-on-failure',
    actionTimeout:     30_000,
    navigationTimeout: 60_000,
  },

  webServer: {
    command:              'npm run dev',
    url:                  'http://localhost:3000',
    reuseExistingServer:  !process.env.CI,
    timeout:              180_000,
    env: {
      NODE_ENV: 'development',
    },
  },

  projects: [
    {
      name: 'chromium',
      use:  { ...devices['Desktop Chrome'] },
    },
  ],
});
