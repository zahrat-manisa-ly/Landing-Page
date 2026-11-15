import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultSearch,
  filterStateFromParams,
  isDateOnly,
  localToday,
  searchFromParams,
  searchToParams,
  validateSearch,
  writeFilterParams,
} from '../../src/lib/domain/search.ts';
import { EMPTY_FILTERS } from '../../src/lib/domain/types.ts';
import { validSearch } from '../fixtures/flights.ts';
const today = '2030-01-01';
test('a valid one-way search passes', () =>
  assert.deepEqual(validateSearch(validSearch, today), {}));
test('unconfigured form has no invented airports or dates', () =>
  assert.deepEqual(
    [defaultSearch().from, defaultSearch().to, defaultSearch().departure],
    ['', '', ''],
  ));
test('same airport is rejected', () =>
  assert.equal(validateSearch({ ...validSearch, to: 'AAA' }, today).to, 'differentAirports'));
test('free-form city is not accepted as an airport code', () =>
  assert.equal(validateSearch({ ...validSearch, from: 'Tripoli' }, today).from, 'selectAirport'));
test('past departure is rejected', () =>
  assert.equal(
    validateSearch({ ...validSearch, departure: '2029-12-31' }, today).departure,
    'validDeparture',
  ));
test('invalid date normalization is rejected', () => assert.equal(isDateOnly('2030-02-30'), false));
test('leap day is accepted only in a leap year', () => {
  assert.equal(isDateOnly('2032-02-29'), true);
  assert.equal(isDateOnly('2030-02-29'), false);
});
test('round-trip requires a return', () =>
  assert.equal(
    validateSearch({ ...validSearch, tripType: 'round-trip' }, today).returnDate,
    'validReturn',
  ));
test('return cannot precede departure', () =>
  assert.equal(
    validateSearch({ ...validSearch, tripType: 'round-trip', returnDate: '2030-11-17' }, today)
      .returnDate,
    'validReturn',
  ));
test('same-day round trip is permitted', () =>
  assert.deepEqual(
    validateSearch({ ...validSearch, tripType: 'round-trip', returnDate: '2030-11-18' }, today),
    {},
  ));
test('infants cannot exceed adults', () =>
  assert.equal(
    validateSearch({ ...validSearch, travelers: { adults: 1, children: 0, infants: 2 } }, today)
      .travelers,
    'validTravelers',
  ));
test('fractional, negative and excessive traveler counts are rejected', () => {
  for (const adults of [0, -1, 1.5, 10, NaN])
    assert.ok(
      validateSearch({ ...validSearch, travelers: { adults, children: 0, infants: 0 } }, today)
        .travelers,
    );
});
test('URL round-trip preserves supported search criteria', () =>
  assert.deepEqual(searchFromParams(searchToParams(validSearch)), validSearch));
test('one-way serialization excludes stale return date', () =>
  assert.equal(
    searchToParams({ ...validSearch, returnDate: '2030-11-19' }).has('returnDate'),
    false,
  ));
test('malformed counts remain invalid instead of falling back silently', () =>
  assert.ok(Number.isNaN(searchFromParams(new URLSearchParams('adults=banana')).travelers.adults)));
test('unsupported cabin is rejected', () => {
  const params = searchToParams(validSearch);
  params.set('cabin', 'bogus');
  assert.equal(validateSearch(searchFromParams(params), today).cabin, 'validCabin');
});
test('filters round-trip without deleting search fields', () => {
  const filters = {
    ...EMPTY_FILTERS,
    airlines: ['Test Carrier'],
    departureWindows: [1],
    checkedBag: true,
  };
  const params = writeFilterParams(searchToParams(validSearch), filters, 'fastest');
  assert.deepEqual(filterStateFromParams(params), { filters, sort: 'fastest' });
  assert.equal(params.get('from'), 'AAA');
});
test('invalid filter values do not enable unknown constraints', () =>
  assert.deepEqual(
    filterStateFromParams(new URLSearchParams('stops=banana&departureWindow=44&sort=other')),
    { filters: EMPTY_FILTERS, sort: 'recommended' },
  ));
test('local date helper does not convert through UTC', () => {
  const value = new Date(2030, 4, 3, 23, 59);
  assert.equal(localToday(value), '2030-05-03');
});
test('empty departure filter does not become midnight', () =>
  assert.deepEqual(
    filterStateFromParams(new URLSearchParams('departureWindow=')).filters.departureWindows,
    [],
  ));
