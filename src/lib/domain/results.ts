import type { Filters, FlightOffer, SortOrder } from './types.ts';
import { localDepartureHour } from './format.ts';
export function isBookable(offer: FlightOffer, now = Date.now()): boolean {
  return offer.availability === 'available' && Date.parse(offer.expiresAt) > now;
}
export function filterAndSort(
  offers: FlightOffer[],
  filters: Filters,
  sort: SortOrder,
): FlightOffer[] {
  const filtered = offers.filter((offer) => {
    const first = offer.journeys[0]?.segments[0];
    if (!first) return false;
    const maxStops = Math.max(...offer.journeys.map((j) => j.segments.length - 1));
    if (filters.stops === 'nonstop' && maxStops !== 0) return false;
    if (filters.stops === 'one-stop' && maxStops !== 1) return false;
    if (filters.airlines.length && !filters.airlines.includes(offer.airlineName)) return false;
    if (filters.cabinBag && !offer.cabinBagIncluded) return false;
    if (filters.checkedBag && !offer.checkedBagIncluded) return false;
    const window = Math.floor(localDepartureHour(first.departureAt, first.origin.timeZone) / 6);
    return !filters.departureWindows.length || filters.departureWindows.includes(window);
  });
  if (sort === 'cheapest') {
    // Cross-currency ranking is not a conversion. Never silently compare currencies.
    const units = new Set(
      filtered.map((o) => `${o.price.currency}:${o.price.decimals}:${o.priceScope}`),
    );
    if (units.size > 1) return filtered;
    return filtered.sort((a, b) => a.price.amountMinor - b.price.amountMinor);
  }
  if (sort === 'fastest')
    return filtered.sort(
      (a, b) =>
        a.journeys.reduce((n, j) => n + j.durationMinutes, 0) -
        b.journeys.reduce((n, j) => n + j.durationMinutes, 0),
    );
  return filtered; // Preserve the backend's ranking for Recommended.
}
export function activeFilterCount(filters: Filters): number {
  return (
    Number(filters.stops !== 'any') +
    filters.departureWindows.length +
    filters.airlines.length +
    Number(filters.cabinBag) +
    Number(filters.checkedBag)
  );
}
export function mergeOffers(current: FlightOffer[], incoming: FlightOffer[]): FlightOffer[] {
  return [...new Map([...current, ...incoming].map((o) => [o.id, o])).values()];
}
