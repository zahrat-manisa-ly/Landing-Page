/** Synthetic records for tests ONLY. Never import this module from src/. */
import type { Airport, FlightOffer, FlightSearch } from '../../src/lib/domain/types.ts';
export const origin: Airport = {
  code: 'AAA',
  name: 'Test Origin Airport',
  city: 'Test Origin',
  countryCode: 'LY',
  timeZone: 'Africa/Tripoli',
};
export const destination: Airport = {
  code: 'BBB',
  name: 'Test Destination Airport',
  city: 'Test Destination',
  countryCode: 'TR',
  timeZone: 'Europe/Istanbul',
};
export const connection: Airport = {
  code: 'CCC',
  name: 'Test Connection Airport',
  city: 'Test Connection',
  countryCode: 'GR',
  timeZone: 'Europe/Athens',
};
export function offer(overrides: Partial<FlightOffer> = {}): FlightOffer {
  const price = { amountMinor: 24800, currency: 'USD', decimals: 2 };
  return {
    id: 'test-offer-1',
    airlineName: 'Test Carrier',
    cabin: 'economy',
    price,
    priceScope: 'total',
    availability: 'available',
    expiresAt: '2099-01-01T00:00:00Z',
    cabinBagIncluded: true,
    checkedBagIncluded: false,
    journeys: [
      {
        id: 'test-outbound',
        durationMinutes: 160,
        segments: [
          {
            id: 'test-segment',
            origin,
            destination,
            departureAt: '2030-11-18T09:10:00+02:00',
            arrivalAt: '2030-11-18T12:50:00+03:00',
            airlineName: 'Test Carrier',
            flightNumber: 'TC123',
            durationMinutes: 160,
          },
        ],
      },
    ],
    fares: [
      {
        id: 'test-fare',
        name: 'Test Standard',
        price,
        priceScope: 'total',
        available: true,
        cabinBagIncluded: true,
        checkedBagIncluded: false,
        cabinBaggage: 'Test cabin allowance',
        checkedBaggage: 'Not included in this test fare',
        changeAndRefundRules: 'Test restrictions apply',
      },
    ],
    ...overrides,
  };
}
export const validSearch: FlightSearch = {
  from: 'AAA',
  to: 'BBB',
  departure: '2030-11-18',
  tripType: 'one-way',
  travelers: { adults: 1, children: 0, infants: 0 },
  cabin: 'economy',
  currency: 'USD',
};
export const validRoundTrip: FlightSearch = {
  ...validSearch,
  tripType: 'round-trip',
  returnDate: '2030-11-25',
  travelers: { adults: 2, children: 1, infants: 1 },
};
export function presentationOffer(): FlightOffer {
  return offer({
    badge: 'Test choice',
    journeys: [
      {
        id: 'test-outbound',
        durationMinutes: 280,
        segments: [
          {
            id: 'test-outbound-first',
            origin,
            destination: connection,
            departureAt: '2030-11-18T09:10:00+02:00',
            arrivalAt: '2030-11-18T10:10:00+02:00',
            airlineName: 'Test Carrier',
            flightNumber: 'TC123',
            durationMinutes: 60,
            departureTerminal: '1',
            arrivalTerminal: 'A',
          },
          {
            id: 'test-outbound-second',
            origin: connection,
            destination,
            departureAt: '2030-11-18T11:00:00+02:00',
            arrivalAt: '2030-11-18T12:50:00+03:00',
            airlineName: 'Test Carrier',
            flightNumber: 'TC456',
            durationMinutes: 110,
            departureTerminal: 'B',
            arrivalTerminal: '2',
          },
        ],
      },
      {
        id: 'test-inbound',
        durationMinutes: 220,
        segments: [
          {
            id: 'test-inbound-segment',
            origin: destination,
            destination: origin,
            departureAt: '2030-11-25T15:00:00+03:00',
            arrivalAt: '2030-11-25T17:40:00+02:00',
            airlineName: 'Test Carrier',
            flightNumber: 'TC789',
            durationMinutes: 220,
            departureTerminal: 'I',
            arrivalTerminal: '1',
          },
        ],
      },
    ],
  });
}
export function searchPayload(items: FlightOffer[] = [offer()]) {
  return { offers: items, total: items.length, nextCursor: null };
}
