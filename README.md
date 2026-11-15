# MANISA Travel Web

Astro + Tailwind CSS + React islands, implemented from the selected MANISA Figma screens.

**Milestone 1: source implementation of P-001 through P-004 plus a typed direct-backend authentication contract. This is not a complete 26-page platform, flight operations are not connected to the backend yet, and the site is not approved for production.**

## Included

| Page                 | English route               | Arabic route                |
| -------------------- | --------------------------- | --------------------------- |
| P-001 Homepage       | `/en/`                      | `/ar/`                      |
| P-002 Flight Search  | `/en/flights/`              | `/ar/flights/`              |
| P-003 Flight Results | `/en/flights/results/?...`  | `/ar/flights/results/?...`  |
| P-004 Flight Details | `/en/flights/offer/?id=...` | `/ar/flights/offer/?id=...` |

Shared navigation, footer, editorial composition, design-token theme, responsive layouts, airport autocomplete, one-way/round-trip validation, travelers/cabin controls, URL-backed search/filter state, sorting, pagination, mobile filter dialog, itinerary timelines, fare selection, and explicit empty/error/expired states are in source. A utility 404 and `/implementation/` handoff screen are also included. Arabic text is a draft requiring native-language review.

Astro owns the static pages and composition. React is confined to the search, results, flight-detail, authentication, and header-session islands. There is no client-side SPA router, frontend BFF, or booking backend.

## Current verification

- Offline unit tests, strict core TypeScript, full Astro/React checks, source-boundary checks, the static build, and the functional Chromium suite pass.
- The presentation-contract suite covers all four pages in English and Arabic at 390px, 768px, and 1440px.
- **Seven approved design image exports are missing.** Neutral, explicitly labelled asset slots remain until import; unrelated stock images are not substituted.
- Approved visual baselines, accessibility conformance, performance auditing, and live API integration remain outstanding.
- `npm audit` reports zero known vulnerabilities.

See the [authentication phase index](docs/backend-auth-implementation-plan.md), [Phase 1 regression baseline](docs/phase-1-regression-baseline.md), [Phase 2 static/OpenAPI foundation](docs/phase-2-openapi-static-foundation.md), [Phase 3 browser auth transport](docs/phase-3-browser-auth-transport.md), [Phase 4 TanStack contracts](docs/phase-4-tanstack-auth-contracts.md), [Phase 5 auth screens](docs/phase-5-customer-auth-screens.md), [Phase 6 header integration](docs/phase-6-header-session-integration.md), [Phase 7 live verification](docs/phase-7-live-backend-verification.md), [Phase 8 traveler details](docs/phase-8-traveler-details.md), [design gaps](docs/design-gaps.md), and [implementation map](docs/implementation-map.csv).

## Start locally

Use Node 22.16 or newer within a supported Node LTS line and npm.

```sh
npm ci
cp .env.example .env
npm run assets:import
npm run dev
```

Dependency installation requires network access. The committed lockfile is authoritative; use `npm ci` for repeatable local and CI installation.

If Figma download URLs have expired, refresh the entries in `docs/asset-manifest.json` from the same Figma nodes, or export the exact assets into `public/design/` with the listed filenames. Then run:

```sh
npm run assets:check
```

No font binaries are included. Inter and Alexandria are declared as font-package dependencies; install them locally with the other dependencies. Do not replace the homepage's Inter heading with a different typeface just because another display font exists in the foundations catalogue.

Open `/en/` or `/ar/` on the local development server. With blank API settings, search shows an explicit connection notice and cannot submit. There is no fallback flight inventory.

## Connect the actual backend

The backend foundation specification is available in `openapi.json`. Flight operations, staging access, and their pagination semantics are still pending. Current flight response contracts are **frontend view models**, not a claim about future backend wire formats.

Configure the browser-visible backend and flight settings:

```dotenv
PUBLIC_API_BASE_URL=
PUBLIC_API_AIRPORTS_PATH=
PUBLIC_API_SEARCH_PATH=
PUBLIC_API_OFFER_PATH=
PUBLIC_API_SEARCH_METHOD=GET
PUBLIC_API_CREDENTIALS=same-origin
PUBLIC_DEFAULT_CURRENCY=USD
SITE_URL=
```

For authentication, `PUBLIC_API_BASE_URL` is the backend origin; generated paths already contain `/api/v1`. `PUBLIC_API_OFFER_PATH` must contain `{id}`. Flight endpoint paths start with `/` and are appended to the configured base URL.

Map requests and responses in `src/lib/api/adapter.ts` and adjust `src/lib/api/flights.ts` where your actual contract requires additional search/session context. Do not put provider-specific field names inside visual components. See the [API integration guide](docs/api-integration.md) and the approved [authentication phase index](docs/backend-auth-implementation-plan.md).

These settings are visible to the browser. **Never put secrets, private API keys, or bearer tokens in `PUBLIC_` variables.** Authentication uses a memory-only access token and the backend's `HttpOnly` refresh cookie. Direct access requires credentialed CORS for the exact frontend origin.

After changing environment values, restart the development server. Rebuild when build-time public values or `SITE_URL` change.

## Commands

```sh
npm test                  # Offline tests; no backend requests
npm run openapi:generate  # Regenerate TypeScript contracts from openapi.json
npm run openapi:check     # Verify generated contracts are current
npm run check:core        # Strict API/domain/localization typecheck
npm run lint:boundaries   # TS/TSX syntax and source-boundary inspection
npm run check             # Full Astro/React typecheck, after installation
npm run build
npm run preview
npm run format            # Prettier, including Astro plugin

npx playwright install chromium
npm run test:e2e           # Browser suite with intercepted test-only API responses
npm run test:visual        # Requires assets and reviewed screenshot baselines
npm run release:check
```

Browser tests start a separate development server and intercept synthetic endpoints. These endpoints are test harness configuration, not shipped server endpoints. Synthetic flight records exist only under `tests/fixtures/`; production code does not import them.

Visual baselines are intentionally absent. Create them in a fixed browser environment, compare each page to the mapped Figma frames, and obtain approval before committing the baselines. Running `--update-snapshots` is not design approval.

## Project layout

```text
src/
  pages/[lang]/           Localized Astro route shells
  layouts/                Metadata, language/direction, shared page shell
  components/             Static content, layout and shared UI
  features/search/        Airport lookup, dates, travelers, form validation
  features/results/       Filters, sort, pagination, result cards, drawer
  features/details/       Itinerary, fare selection and rules
  lib/api/                Generated contracts, auth/flight clients and TanStack options
  lib/domain/             Flight models, date/money helpers, search logic
  i18n/                   Typed English and draft Arabic dictionaries
  styles/                 Figma-derived tokens and responsive compositions
public/design/            Exact Figma exports, once imported
scripts/                  Asset importer and release/source checks
tests/                    Unit, browser, visual-test source and fixtures
docs/                     Mapping, integration contract, decisions and evidence
```

## Boundaries of this milestone

Checkout, payment, confirmation, manage-booking, accounts, support and policy pages are pending. Their navigation is explicitly unavailable, rather than linked to fake working pages. The fare selection CTA is disabled and explains that no booking or charge can be created.

The 404 page is a utility fallback, not an approved conversion of P-029. The remaining Figma page conversions have not been marked complete. See `docs/remaining-pages.md`.

All page designs are **review candidates**. The homepage is the first visual acceptance checkpoint; the additional flight-discovery screens remain draft until reviewed. No Figma designs were modified during implementation.

## Deployment

This milestone builds as a static Astro site. There is no static snapshot of flight inventory. Offer IDs remain query parameters because unknown runtime offer IDs cannot be enumerated at build time.

Deploy the generated `dist/` directory to a static host with real 404 handling; do not rewrite every unknown route to the homepage. `robots.txt` intentionally disallows indexing while the site is incomplete. Set `SITE_URL` for canonical/language metadata and change the indexing policy only at release approval. No host, GitHub remote, or deployment has been created.
