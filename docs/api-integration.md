# Backend API integration boundary

The current backend foundation and customer-authentication roadmap are documented in the [authentication phase index](backend-auth-implementation-plan.md). The implemented direct transport and TanStack boundaries are detailed in [Phase 3](phase-3-browser-auth-transport.md) and [Phase 4](phase-4-tanstack-auth-contracts.md). This guide remains focused on the flight API boundary that the backend will provide later.

## What exists versus what is unknown

The frontend has a working request/normalization boundary, tested with synthetic responses. The actual backend's base URL, endpoint paths, wire format, authentication, rate limits, capabilities, and integration credentials were not supplied. Therefore **live integration is not complete**.

The three current service operations are `airports(query)`, `search(criteria, cursor?)`, and `offer(id)`. All endpoint paths begin blank. No backend endpoints are invented in production configuration.

Adapt `src/lib/api/adapter.ts` to the API's authoritative schema. The default mapping is deliberately strict and accepts only the view-model envelopes below. An incompatible payload produces `invalidResponse`, not a misleading empty state or a zero price. If the backend needs a search token, revision, request ID, additional headers or extra context when loading an offer, add that to the service/contract and URL-safe flow after reviewing its sensitivity.

## Current view-model envelopes

The definitive TypeScript models are in `src/lib/domain/types.ts`.

```ts
// Airport lookup response after backend normalization
{ airports: Airport[] }

// Search response after backend normalization
{ offers: FlightOffer[], total: number, nextCursor: string | null }

// Offer detail response after backend normalization
{ offer: FlightOffer }
```

The default lookup request uses a `q` query parameter. GET search uses normalized form parameters from `searchToParams`; POST search uses a JSON object. These are replaceable adapter mappings, not asserted backend requirements. Search method and cookie credential mode are configurable.

### Money

```ts
interface Money {
  amountMinor: number; // Safe, nonnegative integer
  currency: string; // Three-letter uppercase code
  decimals: number; // Explicit scale; never assume two decimals
}
```

`priceScope` explicitly distinguishes `total` from `per-adult`. The frontend does not multiply per-adult prices into an invented booking total. Cheapest ranking is disabled for mixed currency/scale/scope groups. Search rejects offers in a currency different from the requested currency. Currency exchange and authoritative taxes/fees belong to the backend.

### Itineraries

Each offer contains one or more journeys. A journey contains ordered segments with named origin/destination airports, their IANA time zones, offset-aware timestamps, airline identity, flight number and provider-supplied duration. Date-only search values are not converted through UTC. Displayed itinerary times use each airport's time zone; local-day arrival offsets are separate from durations.

The adapter rejects invalid dates, missing time zones, arrival-before-departure, duplicate IDs, invalid enum values and unsafe amounts. It does not invent missing terminals, baggage limits, airline names, availability or expiry.

### Fares and expiry

A fare has its own authoritative price, availability, baggage descriptions and change/refund rules. Selection changes the displayed fare and rules but does not purchase, reserve or revalidate it. `expiresAt` and availability determine whether a result can be selected; the detail page re-fetches from the API. Final backend revalidation and booking-draft creation are gated by [Phase 8](phase-8-traveler-details.md); payment remains later scope.

### Pagination and filter scope

The current UI filters and sorts **loaded offers only**. This is explicitly disclosed whenever the API returns another cursor. Load-more merges by offer ID and replaces refreshed entries; it does not append duplicates. Repeated cursors and inconsistent totals are treated as contract errors. A server-side filtering implementation needs the actual backend's filter/facet/pagination contract and must replace this behavior before large-inventory acceptance.

## Transport behavior

Requests use JSON accept headers, locale negotiation, a timeout, cancellation, an explicit credential policy, `cache: no-store`, and no automatic retries. A later search cannot overwrite the current UI after cancellation. Loading, empty inventory, no filter matches, HTTP errors, malformed responses, network failures and timeouts are distinct states.

HTTP 401/403 map to an authentication error, 404 to missing data, 409/410 to changed/expired availability, 429 to throttling, and other failures to service unavailable. Raw backend bodies, stack traces and passenger information are not displayed. Adapt status mapping if the real contract differs. A request ID can be retained in the typed error for diagnostic correlation, but no external telemetry service is configured.

## Authentication and production security

Customer authentication uses generated OpenAPI types and direct browser requests. The bearer access token is held only in module memory; the backend owns the `HttpOnly` refresh cookie. Authentication requests use `credentials: include`. Cross-origin access requires backend CORS and cookie configuration; it does not work merely by setting the frontend flag. No private key belongs in a public environment variable. No local/session storage is used.

See the [browser authentication transport](phase-3-browser-auth-transport.md), [TanStack authentication contracts](phase-4-tanstack-auth-contracts.md), and [live verification phase](phase-7-live-backend-verification.md) for refresh, retry, query, CORS, and cookie behavior. Passenger data handling, payment idempotency, and signed events still require authoritative backend contracts before checkout implementation.

## Integration acceptance checklist

Confirm endpoint definitions and sandbox access; normalize actual success/error responses; confirm currency scope and airport time zones; test empty/malformed/expired responses; verify auth and CORS; exercise pagination and filter semantics; run browser tests against staging without interceptions; verify browser reload/back behavior; review redacted diagnostics; record evidence before marking integration complete.
