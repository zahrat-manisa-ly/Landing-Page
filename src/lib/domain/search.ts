import type { FlightSearch, Cabin, Filters, SortOrder } from './types.ts';
const CABINS: Cabin[] = ['economy', 'premium-economy', 'business', 'first'];
export type SearchErrors = Partial<
  Record<
    'from' | 'to' | 'departure' | 'returnDate' | 'travelers' | 'cabin' | 'currency' | 'tripType',
    string
  >
>;
export function localToday(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validateSearch(search: FlightSearch, today = localToday()): SearchErrors {
  const errors: SearchErrors = {};
  if (!/^[A-Z]{3}$/.test(search.from)) errors.from = 'selectAirport';
  if (!/^[A-Z]{3}$/.test(search.to)) errors.to = 'selectAirport';
  if (search.from && search.from === search.to) errors.to = 'differentAirports';
  if (!isDateOnly(search.departure) || search.departure < today)
    errors.departure = 'validDeparture';
  if (search.tripType !== 'one-way' && search.tripType !== 'round-trip')
    errors.tripType = 'validTrip';
  if (
    search.tripType === 'round-trip' &&
    (!search.returnDate || !isDateOnly(search.returnDate) || search.returnDate < search.departure)
  )
    errors.returnDate = 'validReturn';
  const { adults, children, infants } = search.travelers;
  if (
    ![adults, children, infants].every(Number.isSafeInteger) ||
    adults < 1 ||
    children < 0 ||
    infants < 0 ||
    infants > adults ||
    adults + children + infants > 9
  )
    errors.travelers = 'validTravelers';
  if (!CABINS.includes(search.cabin)) errors.cabin = 'validCabin';
  if (!/^[A-Z]{3}$/.test(search.currency)) errors.currency = 'validCurrency';
  return errors;
}
export function defaultSearch(currency = 'USD'): FlightSearch {
  return {
    from: '',
    to: '',
    departure: '',
    tripType: 'one-way',
    travelers: { adults: 1, children: 0, infants: 0 },
    cabin: 'economy',
    currency,
  };
}
/** Empty values stay invalid; never turn malformed input into a plausible search. */
export function searchFromParams(params: URLSearchParams, currency = 'USD'): FlightSearch {
  const count = (key: string, fallback: number) => {
    const value = params.get(key);
    return value === null ? fallback : /^\d+$/.test(value) ? Number(value) : NaN;
  };
  return {
    from: (params.get('from') ?? '').toUpperCase(),
    to: (params.get('to') ?? '').toUpperCase(),
    departure: params.get('departure') ?? '',
    ...(params.has('returnDate') ? { returnDate: params.get('returnDate') ?? '' } : {}),
    tripType: (params.get('tripType') ?? 'one-way') as FlightSearch['tripType'],
    travelers: {
      adults: count('adults', 1),
      children: count('children', 0),
      infants: count('infants', 0),
    },
    cabin: (params.get('cabin') ?? 'economy') as Cabin,
    currency: (params.get('currency') ?? currency).toUpperCase(),
  };
}
export function searchToParams(search: FlightSearch): URLSearchParams {
  const params = new URLSearchParams({
    from: search.from,
    to: search.to,
    departure: search.departure,
    tripType: search.tripType,
    adults: String(search.travelers.adults),
    children: String(search.travelers.children),
    infants: String(search.travelers.infants),
    cabin: search.cabin,
    currency: search.currency,
  });
  if (search.tripType === 'round-trip' && search.returnDate)
    params.set('returnDate', search.returnDate);
  return params;
}
export function filterStateFromParams(params: URLSearchParams): {
  filters: Filters;
  sort: SortOrder;
} {
  const stops = params.get('stops');
  const sort = params.get('sort');
  return {
    filters: {
      stops: stops === 'nonstop' || stops === 'one-stop' ? stops : 'any',
      departureWindows: [
        ...new Set(
          params
            .getAll('departureWindow')
            .filter((value) => /^[0-3]$/.test(value))
            .map(Number)
            .filter((n) => [0, 1, 2, 3].includes(n)),
        ),
      ],
      airlines: [
        ...new Set(params.getAll('airline').filter((s) => s.length > 0 && s.length <= 120)),
      ],
      cabinBag: params.get('cabinBag') === '1',
      checkedBag: params.get('checkedBag') === '1',
    },
    sort: sort === 'cheapest' || sort === 'fastest' ? sort : 'recommended',
  };
}
export function writeFilterParams(
  params: URLSearchParams,
  filters: Filters,
  sort: SortOrder,
): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of ['stops', 'departureWindow', 'airline', 'cabinBag', 'checkedBag', 'sort'])
    next.delete(key);
  if (filters.stops !== 'any') next.set('stops', filters.stops);
  filters.departureWindows.forEach((n) => next.append('departureWindow', String(n)));
  filters.airlines.forEach((name) => next.append('airline', name));
  if (filters.cabinBag) next.set('cabinBag', '1');
  if (filters.checkedBag) next.set('checkedBag', '1');
  if (sort !== 'recommended') next.set('sort', sort);
  return next;
}
