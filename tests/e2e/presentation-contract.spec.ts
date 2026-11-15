import { test, expect, type Page } from '@playwright/test';
import { presentationOffer, validRoundTrip } from '../fixtures/flights';
import { gotoApp, localizedResultsPath, mockApi } from './helpers';

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

test('homepage retains every approved editorial section and embedded search', async ({ page }) => {
  await mockApi(page);
  await gotoApp(page, '/en/');
  await expect(page.locator('[data-section="P-001-S02"]')).toBeVisible();
  await expect(page.locator('[data-section="P-001-S03"]')).toBeVisible();
  await expect(page.locator('[data-section="P-001-S04"]')).toBeVisible();
  await expect(page.locator('[data-section="P-001-S05"]')).toBeVisible();
  await expect(page.locator('[data-section="P-001-S06"]')).toBeVisible();
  await expect(page.locator('.editorial-hero h1')).toBeVisible();
  await expect(page.locator('.destination-main')).toContainText(/Istanbul/i);
  await expect(page.locator('.destination-secondary')).toContainText(/Cappadocia/i);
  await expect(page.locator('.values-grid > *')).toHaveCount(3);
  await expect(page.locator('.home-steps li')).toHaveCount(4);
  await expect(page.locator('.home-search .flight-search')).toBeVisible();
});

test('flight search retains route, dates, traveler types, cabins, and currency', async ({
  page,
}) => {
  await mockApi(page);
  await gotoApp(page, '/en/flights/');
  await expect(page.locator('[data-section="P-002-S02"]')).toBeVisible();
  await expect(page.locator('[data-section="P-002-S03"]')).toBeVisible();
  await expect(page.locator('[data-section="P-002-S04"]')).toBeVisible();
  await expect(page.locator('[data-section="P-002-S05"]')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'One-way' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Round-trip' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'From', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'To', exact: true })).toBeVisible();
  await expect(page.locator('input[name="departure"]')).toBeVisible();
  await expect(page.locator('input[name="returnDate"]')).toBeVisible();
  await page.locator('.travelers-field summary').click();
  for (const name of ['adults', 'children', 'infants'])
    await expect(page.locator(`input[name="${name}"]`)).toBeVisible();
  await expect(page.locator('select[name="cabin"] option')).toHaveCount(4);
  await expect(page.locator('select[name="cabin"]')).toHaveValue('economy');
  expect(
    await page
      .locator('select[name="cabin"] option')
      .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value)),
  ).toEqual(['economy', 'premium-economy', 'business', 'first']);
  await expect(page.locator('.search-cabin-caption')).toContainText('USD');
});

test('results retain summary, controls, journey information, baggage, and price', async ({
  page,
}) => {
  const item = presentationOffer();
  await mockApi(page, { offers: [item] });
  await gotoApp(page, localizedResultsPath('en', validRoundTrip));
  await expect(page.locator('.trip-summary')).toContainText('AAA');
  await expect(page.locator('.trip-summary')).toContainText('BBB');
  await expect(page.locator('.trip-summary')).toContainText('Round-trip');
  await expect(page.locator('.trip-summary')).toContainText(/4 travelers/i);
  await expect(page.locator('.desktop-filters fieldset')).toHaveCount(4);
  for (const label of ['Nonstop', '1 stop', 'Includes cabin bag', 'Includes checked bag'])
    await expect(
      page.locator('.desktop-filters').getByLabel(label, { exact: true }),
    ).toBeAttached();
  expect(
    await page
      .locator('#desktop-sort option')
      .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value)),
  ).toEqual(['recommended', 'cheapest', 'fastest']);
  const card = page.locator('.flight-card');
  await expect(card).toContainText('Test choice');
  await expect(card).toContainText('Test Carrier');
  await expect(card).toContainText('Economy');
  await expect(card).toContainText('Outbound');
  await expect(card).toContainText('Return journey');
  await expect(card).toContainText('AAA');
  await expect(card).toContainText('BBB');
  await expect(card).toContainText('1 stop');
  await expect(card).toContainText('Nonstop');
  await expect(card).toContainText('Cabin bag included');
  await expect(card).toContainText('$248.00');
  await expect(card).toContainText('total');
  await expect(card.getByRole('link', { name: /View details/ })).toBeVisible();
  await expect(page.locator('.fare-notice')).toBeVisible();
});

test('details retain every journey, segment, terminal, fare, baggage, and rule', async ({
  page,
}) => {
  const item = presentationOffer();
  await mockApi(page, { detailOffer: item });
  await gotoApp(page, '/en/flights/offer/?id=test-offer-1');
  await expect(page.locator('.itinerary-overview')).toHaveCount(2);
  await expect(page.locator('.journey-timeline')).toHaveCount(2);
  await expect(page.locator('.timeline-segments > li')).toHaveCount(3);
  const details = page.locator('.flight-details');
  for (const text of [
    'Test Origin Airport',
    'Test Connection Airport',
    'Test Destination Airport',
    'TC123',
    'TC456',
    'TC789',
    'Terminal: 1',
    'Terminal: A',
    'Terminal: B',
    'Terminal: 2',
  ])
    await expect(details).toContainText(text);
  await expect(page.locator('.fare-option')).toHaveCount(1);
  await expect(page.locator('.fare-option')).toContainText('Test Standard');
  await expect(page.locator('.fare-option')).toContainText('$248.00');
  await expect(page.locator('.fare-rules')).toContainText('Test cabin allowance');
  await expect(page.locator('.fare-rules')).toContainText('Not included in this test fare');
  await expect(page.locator('.fare-rules')).toContainText('Test restrictions apply');
  await expect(page.getByRole('button', { name: /Continue to travelers/ })).toBeDisabled();
});

for (const locale of ['en', 'ar'] as const) {
  for (const width of [390, 768, 1440]) {
    test(`${locale} presentation remains directional and overflow-free at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await mockApi(page);
      const paths = [
        `/${locale}/`,
        `/${locale}/flights/`,
        localizedResultsPath(locale),
        `/${locale}/flights/offer/?id=test-offer-1`,
      ];
      for (const path of paths) {
        await gotoApp(page, path);
        if (path.includes('/results/')) await expect(page.locator('.flight-card')).toHaveCount(2);
        if (path.includes('/offer/')) await expect(page.locator('.fare-option')).toHaveCount(2);
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
        await expectNoHorizontalOverflow(page);
      }
    });
  }
}
