import type { Page } from '@playwright/test';
import type { FlightOffer } from '../../src/lib/domain/types';
import { destination, offer, origin, searchPayload, validSearch } from '../fixtures/flights';
import { searchToParams } from '../../src/lib/domain/search';
export const resultsPath = `/en/flights/results/?${searchToParams(validSearch)}`;
export const localizedResultsPath = (locale: 'en' | 'ar', search = validSearch) =>
  `/${locale}/flights/results/?${searchToParams(search)}`;
export async function gotoApp(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'networkidle' });
}
export async function mockApi(
  page: Page,
  options: { offers?: FlightOffer[]; detailOffer?: FlightOffer } = {},
) {
  const second = offer({
    id: 'test-offer-2',
    airlineName: 'Second Test Carrier',
    price: { amountMinor: 31000, currency: 'USD', decimals: 2 },
    checkedBagIncluded: true,
  });
  const offers = options.offers ?? [offer(), second];
  await page.route('**/__test_api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/airports')) {
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      await route.fulfill({
        json: {
          airports: [origin, destination].filter((a) =>
            `${a.code} ${a.city}`.toLowerCase().includes(q),
          ),
        },
      });
      return;
    }
    if (url.pathname.endsWith('/search')) {
      await route.fulfill({ json: searchPayload(offers) });
      return;
    }
    if (url.pathname.includes('/offers/')) {
      const item = structuredClone(options.detailOffer ?? offer());
      if (!options.detailOffer)
        item.fares.push({
          ...item.fares[0]!,
          id: 'test-flex',
          name: 'Test Flexible',
          price: { amountMinor: 31000, currency: 'USD', decimals: 2 },
          checkedBagIncluded: true,
          checkedBaggage: 'Test checked allowance',
        });
      await route.fulfill({ json: { offer: item } });
      return;
    }
    await route.fulfill({ status: 404, json: { error: 'Unknown test endpoint' } });
  });
}
