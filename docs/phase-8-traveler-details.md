# Phase 8 traveler details and booking draft

Status: planned and blocked on design and backend contracts

## Objective

Implement P-005 Traveler Details as the first booking-flow page after an authoritative flight offer has been selected and revalidated.

The page will collect only the traveler and booking-contact information required by the backend, validate it without changing its meaning, and create or update an expiring server-owned booking draft. It will not calculate an authoritative total, reserve inventory, take payment, or imply that a booking is confirmed.

## Current blockers

The synchronized contract from `https://test.zahrat-manisa.ly/openapi.json` does not expose flight search, offer revalidation, traveler/passenger, or booking-draft operations.

`POST /api/v1/orders/me/test` is not a booking operation. It accepts only a client-supplied amount and description and creates a development test purchase. Production frontend code must not use it for P-005 or treat it as evidence of flight inventory, pricing, traveler validation, or reservation.

The repository also has no verified P-005 desktop/mobile Figma frame identifiers, detailed design context, or approved content. P-001 through P-004 are the only mapped travel frames in `docs/implementation-map.csv`.

## Required backend contract

Before source implementation, the authoritative OpenAPI document must define:

- The operation that revalidates a selected offer and establishes its current price, currency, availability, and expiry.
- Creation, retrieval, and update semantics for a customer-owned booking draft.
- Stable offer and draft identifiers and their safe URL representation.
- Required traveler count and traveler categories derived from the selected offer.
- Exact traveler, contact, and document fields, including formats, enums, required/optional rules, and conditional requirements.
- Server validation errors that can be mapped to a form field versus a page-level state.
- Draft expiry, inventory-change, price-change, duplicate-submission, authorization, throttling, and outage behavior.
- Idempotency and retry rules for draft mutations.
- The authoritative booking summary returned after traveler data is accepted.

The contract must not require the browser to submit a trusted total or infer provider-specific traveler rules.

## Required design input

- Verified P-005 desktop and mobile Figma frame identifiers.
- Detailed responsive states for one and multiple travelers.
- Loading, validation, changed-offer, expired-offer, unavailable, and service-error states.
- English and approved Arabic labels, help text, and error content.
- Navigation behavior for returning to the offer and continuing to P-006.

## Architecture and security

- Keep Astro route composition and use a React island only for interactive traveler state and mutations.
- Generate wire types from `openapi.json`; do not duplicate backend request or response schemas by hand.
- Keep provider wire fields behind an adapter instead of exposing them in visual components.
- Require an authenticated customer if the backend operation requires one and reuse the existing memory-only session transport.
- Do not place names, birth dates, contact details, document data, draft secrets, or access tokens in URLs, browser storage, analytics, or logs.
- Keep incomplete form values in the active page memory only unless a separately approved persistence policy is provided.
- Do not retain sensitive mutation variables in TanStack Query data.
- Treat server totals, currency, availability, and expiry as authoritative.
- Prevent duplicate submissions and preserve field focus and entered non-secret values after recoverable validation failures.

## User experience requirements

- Render the exact number and categories of travelers required by the selected offer.
- Give every traveler section an accessible name and stable error summary relationship.
- Use backend-defined field requirements and enums; do not assume nationality, gender, title, document, or date rules.
- Support English, Arabic, LTR, RTL, keyboard navigation, visible focus, screen readers, mobile layouts, and reduced motion.
- Focus the first invalid field after submission and provide a page-level error summary.
- Distinguish validation errors from changed price, expired inventory, unauthenticated session, throttling, and backend outage.
- Require explicit user confirmation before accepting a changed offer or price if the backend permits continuation.

## Out of scope

- P-006 flight extras.
- P-007 booking review.
- P-008 payment initiation.
- P-009 booking confirmation and ticketing.
- Guest booking unless the backend explicitly supports it.
- Local calculation of taxes, fees, exchange rates, or final totals.
- Any call to development-only order endpoints.

## Verification plan

- Generated-contract drift and strict TypeScript checks.
- Unit tests for adapter validation, field-error mapping, expiry, changed offers, and sanitized failures.
- Mocked browser tests for all traveler counts and categories represented by the authoritative contract.
- Live browser tests for draft creation, update, expiry, duplicate submission, session refresh, and backend validation.
- English/Arabic checks at 390px, 768px, and 1440px.
- Keyboard and screen-reader review, including error summary and repeated traveler sections.
- Inspection proving that personal data is absent from URLs, browser storage, logs, and persistent query data.
- Regression coverage for P-001 through P-004 and authentication.

## Exit criteria

Phase 8 can move from blocked to implementation only after the design and backend gates above are supplied. It is complete only when:

- A revalidated offer produces the backend-required traveler form.
- Valid traveler data creates or updates an authoritative booking draft exactly once.
- Invalid, expired, changed, unauthorized, throttled, and unavailable states are explicit and recoverable where permitted.
- Personal data and authentication secrets are not persisted or leaked.
- Locale, direction, responsive, accessibility, contract, unit, browser, and live-backend checks pass.
- Existing travel and authentication presentation contracts remain passing.
