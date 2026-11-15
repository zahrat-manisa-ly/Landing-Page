import { expect, test } from '@playwright/test';

const apiOrigin = process.env.LIVE_API_BASE_URL;

if (!apiOrigin) {
  throw new Error('LIVE_API_BASE_URL is required for live backend tests.');
}

test('anonymous session bootstrap uses the live backend without persistence', async ({
  context,
  page,
}) => {
  const refreshResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url() === `${apiOrigin.replace(/\/$/, '')}/api/v1/auth/refresh`,
  );

  await page.goto('/en/', { waitUntil: 'networkidle' });

  const response = await refreshResponse;
  expect(response.status()).toBe(401);
  expect(response.headers()['access-control-allow-origin']).toBe('http://localhost:4321');
  await expect(
    page.locator('.desktop-session').getByRole('link', { name: 'Sign in' }),
  ).toBeVisible();

  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(await context.cookies(apiOrigin)).toEqual([]);
});
