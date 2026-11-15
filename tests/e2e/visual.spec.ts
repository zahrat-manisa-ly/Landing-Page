import { test, expect } from '@playwright/test';
import { gotoApp, mockApi, localizedResultsPath } from './helpers';
// Baselines must be created in a pinned browser environment and approved against
// the corresponding Figma screenshots. Updating snapshots is NOT approval.
const pages = [
  ['home', (locale: string) => `/${locale}/`],
  ['search', (locale: string) => `/${locale}/flights/`],
  ['results', (locale: 'en' | 'ar') => localizedResultsPath(locale)],
  ['details', (locale: string) => `/${locale}/flights/offer/?id=test-offer-1`],
] as const;
for (const width of [390, 768, 1440]) {
  for (const locale of ['en', 'ar'] as const) {
    for (const [name, path] of pages) {
      test(`visual review ${name} ${locale} at ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await mockApi(page);
        await gotoApp(page, path(locale));
        if (name === 'results') await expect(page.locator('.flight-card')).toHaveCount(2);
        if (name === 'details') await expect(page.locator('.fare-option')).toHaveCount(2);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('.asset-placeholder,.missing-plane')).toHaveCount(0);
        await page.evaluate(async () => {
          await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
        });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
          ),
        ).toBe(true);
        await expect(page).toHaveScreenshot(`${name}-${locale}-${width}.png`, {
          fullPage: true,
          animations: 'disabled',
          maxDiffPixelRatio: 0.005,
        });
      });
    }
  }
}
