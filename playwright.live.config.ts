import { defineConfig, devices } from '@playwright/test';

const liveApiBaseUrl = process.env.LIVE_API_BASE_URL;

if (!liveApiBaseUrl) {
  throw new Error('LIVE_API_BASE_URL is required for live backend tests.');
}

export default defineConfig({
  testDir: './tests/live',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-live' }]],
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'live-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1100 } },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 4321',
    url: 'http://localhost:4321/en/',
    reuseExistingServer: false,
    env: {
      PUBLIC_API_BASE_URL: liveApiBaseUrl,
      PUBLIC_DEFAULT_CURRENCY: 'USD',
    },
  },
});
