import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4322',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1100 } },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4322',
    url: 'http://127.0.0.1:4322/en/',
    reuseExistingServer: false,
    env: {
      PUBLIC_API_BASE_URL: '/__test_api',
      PUBLIC_API_AIRPORTS_PATH: '/airports',
      PUBLIC_API_SEARCH_PATH: '/search',
      PUBLIC_API_OFFER_PATH: '/offers/{id}',
      PUBLIC_API_SEARCH_METHOD: 'GET',
      PUBLIC_API_CREDENTIALS: 'same-origin',
      PUBLIC_DEFAULT_CURRENCY: 'USD',
    },
  },
});
