/** Frontend view contracts, NOT a claim about the existing backend's wire format.
 * Map your OpenAPI responses in api/adapter.ts. No inventory is bundled in src/. */
export type Locale = 'en' | 'ar';
export type Cabin = 'economy' | 'premium-economy' | 'business' | 'first';
export type TripType = 'one-way' | 'round-trip';
export interface Airport {
  code: string;
  name: string;
  city: string;
  countryCode: string;
  timeZone: string;
}
export interface AirportSelection {
  code: string;
  label: string;
}
export interface Travelers {
  adults: number;
  children: number;
  infants: number;
}
export interface FlightSearch {
  from: string;
  to: string;
  departure: string;
  returnDate?: string;
  tripType: TripType;
  travelers: Travelers;
  cabin: Cabin;
  currency: string;
}
export interface Money {
  /** Safe integer in the backend's explicitly declared minor unit. */
  amountMinor: number;
  currency: string;
  decimals: number;
}
export interface Segment {
  id: string;
  origin: Airport;
  destination: Airport;
  /** RFC3339 timestamps with timezone offset or Z. */
  departureAt: string;
  arrivalAt: string;
  airlineName: string;
  flightNumber: string;
  durationMinutes: number;
  departureTerminal?: string;
  arrivalTerminal?: string;
}
export interface Journey {
  id: string;
  durationMinutes: number;
  segments: Segment[];
}
export interface Fare {
  id: string;
  name: string;
  price: Money;
  priceScope: 'total' | 'per-adult';
  available: boolean;
  cabinBagIncluded: boolean;
  checkedBagIncluded: boolean;
  cabinBaggage: string;
  checkedBaggage: string;
  changeAndRefundRules: string;
}
export interface FlightOffer {
  id: string;
  airlineName: string;
  cabin: Cabin;
  journeys: Journey[];
  price: Money;
  priceScope: 'total' | 'per-adult';
  fares: Fare[];
  cabinBagIncluded: boolean;
  checkedBagIncluded: boolean;
  availability: 'available' | 'sold-out';
  expiresAt: string;
  badge?: string;
}
export interface SearchResponse {
  offers: FlightOffer[];
  total: number;
  nextCursor: string | null;
}
export interface Filters {
  stops: 'any' | 'nonstop' | 'one-stop';
  departureWindows: number[];
  airlines: string[];
  cabinBag: boolean;
  checkedBag: boolean;
}
export type SortOrder = 'recommended' | 'cheapest' | 'fastest';
export const EMPTY_FILTERS: Filters = {
  stops: 'any',
  departureWindows: [],
  airlines: [],
  cabinBag: false,
  checkedBag: false,
};
