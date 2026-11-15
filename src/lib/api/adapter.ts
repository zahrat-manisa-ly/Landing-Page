import type {
  Airport,
  Cabin,
  Fare,
  FlightOffer,
  Journey,
  Money,
  SearchResponse,
  Segment,
  FlightSearch,
} from '../domain/types.ts';
import { ApiError } from './errors.ts';
import { isDateOnly, searchToParams } from '../domain/search.ts';
/** Integration seam: replace these mappings with the real backend contract.
 * The default accepts the documented frontend DTO, rejects invalid data, and
 * never substitutes fixtures. Keep provider-specific fields out of components. */
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ApiError('invalidResponse');
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 2000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new ApiError('invalidResponse');
  return value;
}
function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    throw new ApiError('invalidResponse');
  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new ApiError('invalidResponse');
  return value;
}
function list<T>(value: unknown, parse: (value: unknown) => T, min = 0): T[] {
  if (!Array.isArray(value) || value.length < min || value.length > 5000)
    throw new ApiError('invalidResponse');
  return value.map(parse);
}
function timestamp(value: unknown): string {
  const result = text(value, 64);
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(
      result,
    ) ||
    !isDateOnly(result.slice(0, 10)) ||
    !Number.isFinite(Date.parse(result))
  )
    throw new ApiError('invalidResponse');
  return result;
}
function cabin(value: unknown): Cabin {
  if (
    typeof value !== 'string' ||
    !['economy', 'premium-economy', 'business', 'first'].includes(value)
  )
    throw new ApiError('invalidResponse');
  return value as Cabin;
}
function priceScope(value: unknown): 'total' | 'per-adult' {
  if (value !== 'total' && value !== 'per-adult') throw new ApiError('invalidResponse');
  return value;
}
export function parseAirport(value: unknown): Airport {
  const item = record(value),
    code = text(item.code, 3),
    countryCode = text(item.countryCode, 2),
    timeZone = text(item.timeZone, 100);
  if (!/^[A-Z]{3}$/.test(code) || !/^[A-Z]{2}$/.test(countryCode))
    throw new ApiError('invalidResponse');
  try {
    new Intl.DateTimeFormat('en', { timeZone });
  } catch {
    throw new ApiError('invalidResponse');
  }
  return { code, name: text(item.name), city: text(item.city), countryCode, timeZone };
}
export function parseMoney(value: unknown): Money {
  const item = record(value),
    currency = text(item.currency, 3);
  if (!/^[A-Z]{3}$/.test(currency)) throw new ApiError('invalidResponse');
  return {
    amountMinor: integer(item.amountMinor),
    currency,
    decimals: integer(item.decimals, 0, 4),
  };
}
function parseSegment(value: unknown): Segment {
  const item = record(value),
    departureAt = timestamp(item.departureAt),
    arrivalAt = timestamp(item.arrivalAt);
  if (Date.parse(arrivalAt) < Date.parse(departureAt)) throw new ApiError('invalidResponse');
  return {
    id: text(item.id, 200),
    origin: parseAirport(item.origin),
    destination: parseAirport(item.destination),
    departureAt,
    arrivalAt,
    airlineName: text(item.airlineName),
    flightNumber: text(item.flightNumber, 40),
    durationMinutes: integer(item.durationMinutes, 1, 10000),
    ...(item.departureTerminal == null ? {} : { departureTerminal: text(item.departureTerminal) }),
    ...(item.arrivalTerminal == null ? {} : { arrivalTerminal: text(item.arrivalTerminal) }),
  };
}
function parseJourney(value: unknown): Journey {
  const item = record(value),
    segments = list(item.segments, parseSegment, 1);
  if (new Set(segments.map((segment) => segment.id)).size !== segments.length)
    throw new ApiError('invalidResponse');
  for (let i = 1; i < segments.length; i++) {
    const previous = segments[i - 1]!,
      next = segments[i]!;
    if (Date.parse(next.departureAt) < Date.parse(previous.arrivalAt))
      throw new ApiError('invalidResponse');
  }
  return {
    id: text(item.id, 200),
    durationMinutes: integer(item.durationMinutes, 1, 20000),
    segments,
  };
}
function parseFare(value: unknown): Fare {
  const item = record(value);
  return {
    id: text(item.id, 200),
    name: text(item.name),
    price: parseMoney(item.price),
    priceScope: priceScope(item.priceScope),
    available: boolean(item.available),
    cabinBagIncluded: boolean(item.cabinBagIncluded),
    checkedBagIncluded: boolean(item.checkedBagIncluded),
    cabinBaggage: text(item.cabinBaggage),
    checkedBaggage: text(item.checkedBaggage),
    changeAndRefundRules: text(item.changeAndRefundRules),
  };
}
export function parseOffer(value: unknown): FlightOffer {
  const item = record(value);
  if (item.availability !== 'available' && item.availability !== 'sold-out')
    throw new ApiError('invalidResponse');
  const fares = list(item.fares, parseFare);
  if (new Set(fares.map((f) => f.id)).size !== fares.length) throw new ApiError('invalidResponse');
  const price = parseMoney(item.price);
  const journeys = list(item.journeys, parseJourney, 1);
  if (new Set(journeys.map((journey) => journey.id)).size !== journeys.length)
    throw new ApiError('invalidResponse');
  if (fares.some((f) => f.price.currency !== price.currency || f.priceScope !== item.priceScope))
    throw new ApiError('invalidResponse');
  return {
    id: text(item.id, 200),
    airlineName: text(item.airlineName),
    cabin: cabin(item.cabin),
    journeys,
    price,
    priceScope: priceScope(item.priceScope),
    fares,
    cabinBagIncluded: boolean(item.cabinBagIncluded),
    checkedBagIncluded: boolean(item.checkedBagIncluded),
    availability: item.availability,
    expiresAt: timestamp(item.expiresAt),
    ...(item.badge == null ? {} : { badge: text(item.badge) }),
  };
}
export const backendAdapter = {
  airportQuery(query: string): URLSearchParams {
    return new URLSearchParams({ q: query });
  },
  searchQuery(search: FlightSearch, cursor?: string): URLSearchParams {
    const params = searchToParams(search);
    if (cursor) params.set('cursor', cursor);
    return params;
  },
  searchBody(search: FlightSearch, cursor?: string): unknown {
    return { ...search, ...(cursor ? { cursor } : {}) };
  },
  airports(payload: unknown): Airport[] {
    return [
      ...new Map(list(record(payload).airports, parseAirport).map((a) => [a.code, a])).values(),
    ];
  },
  search(payload: unknown): SearchResponse {
    const item = record(payload),
      offers = list(item.offers, parseOffer),
      total = integer(item.total);
    if (total < offers.length || new Set(offers.map((o) => o.id)).size !== offers.length)
      throw new ApiError('invalidResponse');
    if (item.nextCursor !== null && typeof item.nextCursor !== 'string')
      throw new ApiError('invalidResponse');
    return {
      offers,
      total,
      nextCursor: item.nextCursor === null ? null : text(item.nextCursor, 500),
    };
  },
  offer(payload: unknown): FlightOffer {
    return parseOffer(record(payload).offer);
  },
};
