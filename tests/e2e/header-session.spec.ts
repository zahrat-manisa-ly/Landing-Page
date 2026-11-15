import { expect, test, type Page } from '@playwright/test';
import { gotoApp } from './helpers';

const currentUser = {
  id: '2d61fca8-a1eb-4fe3-9868-02cfac61b5d7',
  username: null,
  occupation: null,
  employee_id: null,
  email: 'traveler@example.test',
  phone_number: null,
  first_name: 'Test',
  last_name: 'Traveler',
  created_at: '2030-01-01T00:00:00Z',
  updated_at: '2030-01-01T00:00:00Z',
  date_of_birth: null,
  image: null,
  account_type: 'customer',
  is_owner: false,
  is_blocked: false,
  roles: [],
  permissions: [],
};

async function mockSession(page: Page, options: { logoutStatus?: number } = {}) {
  let refreshes = 0;
  let logouts = 0;
  await page.route('**/__test_api/api/v1/auth/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/refresh')) {
      refreshes++;
      return route.fulfill({ json: { access_token: 'header-token', token_type: 'bearer' } });
    }
    if (path.endsWith('/me')) return route.fulfill({ json: currentUser });
    if (path.endsWith('/logout')) {
      logouts++;
      const status = options.logoutStatus ?? 204;
      return route.fulfill(status === 204 ? { status } : { status, json: { detail: 'failed' } });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  return { refreshes: () => refreshes, logouts: () => logouts };
}

test('anonymous header links to sign-in with the current local route', async ({ page }) => {
  await page.route('**/__test_api/api/v1/auth/refresh', (route) =>
    route.fulfill({ status: 401, json: { detail: 'anonymous' } }),
  );
  await gotoApp(page, '/en/flights/?trip=one-way');
  const link = page.locator('.desktop-session').getByRole('link', { name: 'Sign in' });
  await expect(link).toBeVisible();
  const href = await link.getAttribute('href');
  expect(href).toContain('/en/auth/sign-in/?');
  expect(new URL(href!, 'http://local').searchParams.get('returnTo')).toBe(
    '/en/flights/?trip=one-way',
  );
});

test('authenticated desktop header bootstraps once and closes its account menu on Escape', async ({
  page,
}) => {
  const calls = await mockSession(page);
  await gotoApp(page, '/en/');
  const trigger = page.locator('.account-menu summary');
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-label', 'Account: Test Traveler');
  expect(calls.refreshes()).toBe(1);
  await trigger.click();
  await expect(page.locator('.account-popover').getByText('traveler@example.test')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.account-menu')).not.toHaveAttribute('open', '');
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
});

test('mobile header provides identity and clears the session after failed logout', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const calls = await mockSession(page, { logoutStatus: 503 });
  await gotoApp(page, '/en/');
  await page.locator('.mobile-navigation summary').click();
  await expect(page.locator('.mobile-account')).toContainText('Test Traveler');
  await expect(page.locator('.mobile-account')).toContainText('traveler@example.test');
  await page.locator('.mobile-account').getByRole('button', { name: 'Sign out' }).click();
  await expect(page.locator('#mobile-session .mobile-sign-in')).toBeAttached();
  expect(calls.logouts()).toBe(1);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
});

test('header distinguishes a service failure and can retry to anonymous', async ({ page }) => {
  let attempts = 0;
  await page.route('**/__test_api/api/v1/auth/refresh', (route) => {
    attempts++;
    return attempts === 1
      ? route.abort('failed')
      : route.fulfill({ status: 401, json: { detail: 'anonymous' } });
  });
  await gotoApp(page, '/en/');
  const retry = page.getByRole('button', { name: 'Retry account' });
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(
    page.locator('.desktop-session').getByRole('link', { name: 'Sign in' }),
  ).toBeVisible();
  expect(attempts).toBe(2);
});
