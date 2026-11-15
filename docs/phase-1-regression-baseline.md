# Phase 1 regression baseline

Date: 2026-11-04

Status: completed. Test counts below are the Phase 1 evidence captured on that date; current repository totals are recorded in the later phase documents.

## Outcome

The functional presentation contract is implemented and passing. Visual regression cases are implemented for the complete page, locale, and breakpoint matrix, but approved screenshot files have not been created because seven exact design assets remain missing. Placeholder imagery must not become an accepted visual baseline.

## Preserved surface

The automated contract covers:

- Homepage hero, embedded search, destination inspiration, values, booking steps, and support composition.
- Search trip types, airports, dates, traveler categories, cabin choices, currency, validation, and keyboard airport selection.
- Results summary, filters, sorting, multi-journey cards, stops, baggage, pricing, availability, and error states.
- Details journeys, segments, local airport information, terminals, flight numbers, durations, fares, baggage, rules, and disabled pre-booking continuation.
- English LTR and Arabic RTL behavior.
- Horizontal overflow checks at 390px, 768px, and 1440px for all four implemented pages in both locales.

Representative presentation data includes a round trip, a connecting outbound journey, an inbound journey, terminals, a badge, baggage rules, and fare rules so conditional fields cannot disappear without a test failure.

## Automated evidence

| Check                      | Result                                                                     | Evidence                                                                |
| -------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Changed-file formatting    | Pass                                                                       | Prettier check on all Phase 1 files                                     |
| Astro and React typecheck  | Pass with two existing deprecation hints                                   | `npm run check`                                                         |
| Core TypeScript check      | Pass                                                                       | `npm run check:core`                                                    |
| Source-boundary inspection | Pass: 21 modules                                                           | `npm run lint:boundaries`                                               |
| Unit tests                 | Pass: 84                                                                   | `npm test`                                                              |
| Production build           | Pass: 11 pages                                                             | `npm run build`                                                         |
| Functional browser suite   | Pass: 24                                                                   | `npm run test:e2e`                                                      |
| Presentation matrix        | Pass: 24 page/locale/width combinations exercised within the browser suite | `tests/e2e/presentation-contract.spec.ts`                               |
| Visual test definitions    | Complete: 24 cases                                                         | `tests/e2e/visual.spec.ts`                                              |
| Approved screenshot files  | Blocked                                                                    | Seven exact design assets are missing; design approval is also required |

The repository-wide `npm run format:check` remains non-clean because 49 files outside this phase were already not formatted according to the current Prettier configuration. Phase 1 does not rewrite those unrelated files.

## Visual matrix

The visual suite defines full-page screenshots for each combination below:

| Page           | English | Arabic  | Widths         |
| -------------- | ------- | ------- | -------------- |
| Homepage       | Defined | Defined | 390, 768, 1440 |
| Flight search  | Defined | Defined | 390, 768, 1440 |
| Flight results | Defined | Defined | 390, 768, 1440 |
| Flight details | Defined | Defined | 390, 768, 1440 |

Snapshot generation is intentionally gated by an assertion that no `.asset-placeholder` or `.missing-plane` element exists. Running an update command is not design approval.

## Outstanding assets

`npm run assets:check` reports these missing exports:

- `coast.png`
- `coast-mobile.png`
- `istanbul.png`
- `istanbul-mobile.png`
- `cappadocia.png`
- `cappadocia-mobile.png`
- `mediterranean.png`

After the exact exports are imported, run `npm run assets:check`, execute `npm run test:visual -- --update-snapshots` in the pinned Chromium environment, compare every image with its mapped Figma frame, and approve the resulting snapshots in review. Do not update snapshots merely to make a failing test pass.

## Review gate

Future backend integration changes must complete the [API UI preservation checklist](ui-preservation-checklist.md). A missing backend field is a contract gap and must not silently remove existing information from the interface.
