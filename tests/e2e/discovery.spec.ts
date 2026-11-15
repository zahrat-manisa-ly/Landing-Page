import { test, expect } from '@playwright/test';
import { gotoApp, mockApi, resultsPath } from './helpers';
import { offer, searchPayload } from '../fixtures/flights';

test('keyboard airport selection and search navigate to results', async ({ page }) => {
  await mockApi(page);
  await gotoApp(page, '/en/flights/');
  const from = page.getByRole('combobox', { name: 'From', exact: true });
  await from.fill('Origin');
  await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(1);
  await from.press('ArrowDown');
  await from.press('Enter');
  const to = page.getByRole('combobox', { name: 'To', exact: true });
  await to.fill('Destination');
  await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(1);
  await to.press('ArrowDown');
  await to.press('Enter');
  await page.getByLabel('Depart', { exact: true }).fill('2030-11-18');
  await page.getByRole('button', { name: /^Search/ }).click();
  await expect(page).toHaveURL(/\/en\/flights\/results\/\?.*from=AAA/);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.flight-card')).toHaveCount(2);
});

test('round-trip toggles the return field', async ({ page }) => {
  await mockApi(page);
  await gotoApp(page, '/en/flights/');
  await expect(page.locator('input[name=returnDate]')).toBeDisabled();
  await page.getByRole('radio', { name: 'Round-trip' }).check();
  await expect(page.locator('input[name=returnDate]')).toBeEnabled();
});

test('invalid submission focuses the first field with an error', async ({ page }) => {
  await mockApi(page);
  await gotoApp(page, '/en/flights/');
  await page.getByRole('button', { name: /^Search/ }).click();
  await expect(page.getByRole('combobox', { name: 'From', exact: true })).toBeFocused();
  await expect(page.getByRole('alert')).toContainText('Check the highlighted fields');
});

test('results filter and reset with persistent query parameters', async ({ page }) => {
  await mockApi(page);
  await gotoApp(page, resultsPath);
  await expect(page.locator('.flight-card')).toHaveCount(2);
  await page.locator('.desktop-filters').getByLabel('Includes checked bag').check();
  await expect(page.locator('.flight-card')).toHaveCount(1);
  await expect(page).toHaveURL(/checkedBag=1/);
  await page.locator('.desktop-filters').getByRole('button', { name: 'Reset all' }).click();
  await expect(page.locator('.flight-card')).toHaveCount(2);
});

test('browser back restores filters rather than rerunning a different search', async ({ page }) => {
  await mockApi(page);
  await gotoApp(page, resultsPath);
  await expect(page.locator('.flight-card')).toHaveCount(2);
  await page.locator('.desktop-filters').getByLabel('Includes checked bag').check();
  await expect(page.locator('.flight-card')).toHaveCount(1);
  await page.goBack();
  await expect(page.locator('.flight-card')).toHaveCount(2);
});

test('mobile filter sheet applies only after confirmation and restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page);
  await gotoApp(page, resultsPath);
  await expect(page.locator('.flight-card')).toHaveCount(2);
  const trigger = page.getByRole('button', { name: /Filters \(0\)/ });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Includes checked bag').check();
  await dialog.getByRole('button', { name: 'Apply filters' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.flight-card')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Filters \(1\)/ })).toBeFocused();
});

test('Escape cancels draft filter changes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page);
  await gotoApp(page, resultsPath);
  await expect(page.locator('.flight-card')).toHaveCount(2);
  await page.getByRole('button', { name: /Filters \(0\)/ }).click();
  await page.getByRole('dialog').getByLabel('Includes checked bag').check();
  await page.keyboard.press('Escape');
  await expect(page.locator('.flight-card')).toHaveCount(2);
});

test('empty inventory is an actual state, not appended below successful results', async ({
  page,
}) => {
  await page.route('**/__test_api/search?**', (route) =>
    route.fulfill({ json: searchPayload([]) }),
  );
  await gotoApp(page, resultsPath);
  await expect(page.getByRole('heading', { name: 'No matching flights' })).toBeVisible();
  await expect(page.locator('.flight-card')).toHaveCount(0);
});

test('backend failure has an explicit user-initiated retry', async ({ page }) => {
  let count = 0;
  await page.route('**/__test_api/search?**', (route) => {
    count++;
    return count === 1
      ? route.fulfill({ status: 503, json: { error: 'Test failure' } })
      : route.fulfill({ json: searchPayload() });
  });
  await gotoApp(page, resultsPath);
  await expect(
    page.getByRole('heading', { name: 'We could not load this information' }),
  ).toBeVisible();
  expect(count).toBe(1);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.flight-card')).toHaveCount(1);
});

test('expired offers do not expose a selectable details link', async ({ page }) => {
  await page.route('**/__test_api/search?**', (route) =>
    route.fulfill({
      json: searchPayload([offer({ expiresAt: '2020-01-01T00:00:00Z' })]),
    }),
  );
  await gotoApp(page, resultsPath);
  await expect(page.locator('.flight-card')).toContainText('Unavailable');
  await expect(page.getByRole('link', { name: /View details/ })).toHaveCount(0);
});

test('fare selection changes summary and rules but cannot create a booking', async ({ page }) => {
  await mockApi(page);
  await gotoApp(page, '/en/flights/offer/?id=test-offer-1');
  await expect(page.locator('.selection-summary')).toContainText('$248.00');
  await page.getByRole('radio', { name: /Test Flexible/ }).check();
  await expect(page.locator('.selection-summary')).toContainText('$310.00');
  await expect(page.locator('.fare-rules')).toContainText('Test checked allowance');
  await expect(page.getByRole('button', { name: /Continue to travelers/ })).toBeDisabled();
});

test('Arabic route has RTL direction and translated search labels', async ({ page }) => {
  await mockApi(page);
  await gotoApp(page, '/ar/flights/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('input[name=from]')).toBeVisible();
  await expect(page.locator('.search-top h2')).not.toContainText('SEARCH FLIGHTS');
});

test('homepage editorial content works without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await gotoApp(page, '/en/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('THE WORLD');
  await expect(page.getByRole('form', { name: 'SEARCH FLIGHTS' })).toBeVisible();
  await context.close();
});

test('unknown route returns a real 404, not the app shell', async ({ page }) => {
  const response = await page.goto('/does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'This page is not here.' })).toBeVisible();
});
