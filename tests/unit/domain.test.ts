import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  activeFilterCount,
  filterAndSort,
  isBookable,
  mergeOffers,
} from '../../src/lib/domain/results.ts';
import {
  arrivalDayDifference,
  calendarDate,
  duration,
  flightTime,
  money,
} from '../../src/lib/domain/format.ts';
import { EMPTY_FILTERS } from '../../src/lib/domain/types.ts';
import { en } from '../../src/i18n/en.ts';
import { ar } from '../../src/i18n/ar.ts';
import { route, t } from '../../src/i18n/index.ts';
import { offer } from '../fixtures/flights.ts';
test('money uses explicit minor-unit scale including three decimals', () =>
  assert.match(money({ amountMinor: 12345, currency: 'LYD', decimals: 3 }), /12\.345/));
test('zero-decimal currency is not divided by 100', () =>
  assert.match(money({ amountMinor: 1500, currency: 'JPY', decimals: 0 }), /1,500/));
test('flight time uses airport timezone, not browser timezone', () =>
  assert.equal(flightTime('2030-11-18T09:10:00+02:00', 'Europe/Istanbul'), '10:10'));
test('arrival next-day indicator compares local calendar dates', () =>
  assert.equal(
    arrivalDayDifference(
      '2030-11-18T23:00:00+02:00',
      '2030-11-19T03:00:00+03:00',
      'Africa/Tripoli',
      'Europe/Istanbul',
    ),
    1,
  ));
test('date-only formatting retains the intended day', () =>
  assert.match(calendarDate('2030-11-18'), /18/));
test('duration is based on supplied duration, not displayed clock subtraction', () =>
  assert.equal(duration(160), '2h 40m'));
test('backend ranking is preserved for Recommended', () => {
  const items = [offer({ id: 'z' }), offer({ id: 'a' })];
  assert.deepEqual(
    filterAndSort(items, EMPTY_FILTERS, 'recommended').map((o) => o.id),
    ['z', 'a'],
  );
});
test('cheapest sorting does not mutate source inventory', () => {
  const items = [
    offer({ id: 'high' }),
    offer({ id: 'low', price: { amountMinor: 100, currency: 'USD', decimals: 2 } }),
  ];
  assert.equal(filterAndSort(items, EMPTY_FILTERS, 'cheapest')[0]?.id, 'low');
  assert.equal(items[0]?.id, 'high');
});
test('cross-currency offers are not silently price-ranked', () => {
  const items = [
    offer({ id: 'usd' }),
    offer({ id: 'jpy', price: { amountMinor: 1, currency: 'JPY', decimals: 0 } }),
  ];
  assert.equal(filterAndSort(items, EMPTY_FILTERS, 'cheapest')[0]?.id, 'usd');
});
test('total and per-adult prices are not compared as equivalents', () => {
  const items = [
    offer({ id: 'total' }),
    offer({
      id: 'adult',
      priceScope: 'per-adult',
      price: { amountMinor: 100, currency: 'USD', decimals: 2 },
    }),
  ];
  assert.equal(filterAndSort(items, EMPTY_FILTERS, 'cheapest')[0]?.id, 'total');
});
test('baggage filters exclude offers that do not confirm inclusion', () =>
  assert.equal(
    filterAndSort([offer()], { ...EMPTY_FILTERS, checkedBag: true }, 'recommended').length,
    0,
  ));
test('departure filtering uses origin local time', () =>
  assert.equal(
    filterAndSort([offer()], { ...EMPTY_FILTERS, departureWindows: [1] }, 'recommended').length,
    1,
  ));
test('expired and sold-out offers are not bookable', () => {
  assert.equal(isBookable(offer({ expiresAt: '2020-01-01T00:00:00Z' })), false);
  assert.equal(isBookable(offer({ availability: 'sold-out' })), false);
});
test('expiry boundary is exclusive', () => {
  const date = '2030-01-01T00:00:00Z';
  assert.equal(isBookable(offer({ expiresAt: date }), Date.parse(date)), false);
});
test('pagination deduplicates IDs and uses refreshed offer data', () => {
  const merged = mergeOffers(
    [offer({ id: 'a' }), offer({ id: 'b' })],
    [offer({ id: 'a', availability: 'sold-out' })],
  );
  assert.equal(merged.length, 2);
  assert.equal(merged[0]?.availability, 'sold-out');
});
test('filter count represents active values', () =>
  assert.equal(
    activeFilterCount({ ...EMPTY_FILTERS, stops: 'nonstop', airlines: ['A', 'B'], cabinBag: true }),
    4,
  ));
test('Arabic dictionary has complete English key parity', () =>
  assert.deepEqual(Object.keys(ar).sort(), Object.keys(en).sort()));
test('Arabic translations are non-empty', () => {
  for (const value of Object.values(ar)) assert.ok(value.trim().length > 0);
});
test('localized routes are normalized', () => {
  assert.equal(route('ar', '/flights/results/'), '/ar/flights/results/');
  assert.equal(route('en'), '/en/');
});
test('Arabic is returned without English fallback', () =>
  assert.notEqual(t('ar', 'from'), t('en', 'from')));
