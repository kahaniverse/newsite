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
  timeout:        45_000,
  expect:         { timeout: 10_000 },

  use: {
    baseURL:           'http://localhost:3000',
    trace:             'on-first-retry',
    screenshot:        'only-on-failure',
    actionTimeout:     10_000,
    navigationTimeout: 30_000,
  },

  webServer: {
    command:              'npm run dev',
    url:                  'http://localhost:3000',
    reuseExistingServer:  !process.env.CI,
    timeout:              120_000,
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
