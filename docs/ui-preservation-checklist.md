# API UI preservation checklist

Use this checklist for every change that maps backend data into the current homepage or flight experience. It is a review gate, not a suggestion. Mark each applicable item as pass, fail, or not applicable in the pull request. A failed item requires explicit product and design approval before merge.

## Review evidence

- [ ] Identify the OpenAPI operations and schemas being integrated.
- [ ] Map backend fields to frontend view-model fields at the API boundary.
- [ ] List every view-model field that the backend cannot supply.
- [ ] Confirm that no visual component imports provider-specific field names.
- [ ] Attach English and Arabic evidence at 390px, 768px, and 1440px.
- [ ] Run the functional presentation-contract suite.
- [ ] Run approved visual regression snapshots without updating them.
- [ ] Record any intentionally changed screenshot and its design approval.

## Homepage

- [ ] Editorial hero and primary flight call to action remain present.
- [ ] Embedded flight search remains available.
- [ ] Destination inspiration, imagery, labels, and captions remain present.
- [ ] Value cards, booking steps, and support call to action remain present.
- [ ] Posts or reviews do not replace an existing section without an approved design.

## Flight search

- [ ] One-way and round-trip choices remain available.
- [ ] Origin and destination airport lookup remain available.
- [ ] Departure and conditional return dates remain available.
- [ ] Adult, child, and infant counts remain distinct.
- [ ] Economy, premium economy, business, and first class remain available.
- [ ] Currency remains represented.
- [ ] Existing validation and keyboard behavior remain intact.

## Flight results

- [ ] Search summary retains route, trip type, dates, traveler total, and cabin.
- [ ] Result count, recommended/cheapest/fastest sorting, and pagination remain available.
- [ ] Stop, departure-time, airline, cabin-bag, and checked-bag filters remain available.
- [ ] Cards retain badge when supplied, airline, cabin, and every journey.
- [ ] Cards retain departure/arrival times and airport codes, duration, stop count, and arrival-day offset.
- [ ] Cards retain baggage guidance, price, currency, price scope, availability, and details action.
- [ ] Loading, empty inventory, no filter matches, expired, unavailable, malformed response, and retry states remain distinct.

## Flight details

- [ ] Every journey and segment remains represented.
- [ ] Airport names, cities, codes, dates, local times, and available terminals remain visible.
- [ ] Airline, flight number, segment duration, journey duration, and stop count remain visible.
- [ ] Fare choices retain names, prices, currency, price scope, and availability.
- [ ] Cabin baggage, checked baggage, and change/refund rules remain visible.
- [ ] Offer expiry and unavailability remain enforced.
- [ ] The current non-booking caveat remains until a real booking contract is approved.

## Localization and layout

- [ ] English remains LTR and Arabic remains RTL.
- [ ] Codes, flight numbers, prices, and mixed-direction content remain legible.
- [ ] No horizontal document overflow occurs at 390px, 768px, or 1440px.
- [ ] Desktop and mobile navigation remain usable.
- [ ] Longer content and validation messages are not clipped.
- [ ] Keyboard focus, labels, dialogs, and disabled states remain accessible.

## Removal approval

Do not treat an absent, nullable, or undocumented backend field as permission to hide an existing field globally. Record the gap in the API integration work and resolve it with the backend. Any approved removal must identify the affected page and field, explain why normalization or fallback is not valid, include product and design approval, update the presentation contract tests, and update approved visual baselines in a separate reviewed change.
