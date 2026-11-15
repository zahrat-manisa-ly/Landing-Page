# Backend authentication implementation plan

Updated: 2026-11-11

## Objective

Integrate customer authentication from the separate backend without weakening the implemented MANISA travel presentation contract.

The frontend is a static Astro application. Browser React islands call the backend directly through generated OpenAPI types, `openapi-fetch`, and TanStack Query.

```text
React island -> TanStack Query -> external backend
```

There is no Astro BFF, frontend authentication API, Redis session store, or frontend-owned refresh cookie.

## Approved decisions

- Preserve the homepage, flight search, results, and offer-detail layouts and information.
- Generate wire types from the checked-in `openapi.json`.
- Keep the bearer access token in JavaScript memory only.
- Let the backend own the refresh token in an `HttpOnly` cookie.
- Never put authentication tokens in local storage, session storage, URLs, public environment variables, or TanStack query data.
- Use direct credentialed browser requests and require exact-origin backend CORS.
- Keep terms and MFA workflow tokens in the active authentication React root only.
- Restart incomplete terms/MFA login after a page reload rather than persisting temporary tokens.
- Exclude administration screens from this customer-facing frontend.
- Support English, Arabic, RTL, responsive layouts, keyboard use, and visible focus in all new screens.

## Phase status

| Phase                                            | Scope                                                | Status                       |
| ------------------------------------------------ | ---------------------------------------------------- | ---------------------------- |
| [Phase 1](phase-1-regression-baseline.md)        | Travel UI regression baseline                        | Completed                    |
| [Phase 2](phase-2-openapi-static-foundation.md)  | Static Astro and generated OpenAPI foundation        | Completed                    |
| [Phase 3](phase-3-browser-auth-transport.md)     | Memory-only access token and refresh transport       | Completed in source          |
| [Phase 4](phase-4-tanstack-auth-contracts.md)    | TanStack customer-auth contracts                     | Completed                    |
| [Phase 5](phase-5-customer-auth-screens.md)      | Customer authentication screens                      | Completed in source          |
| [Phase 6](phase-6-header-session-integration.md) | Header and session integration                       | Completed in source          |
| [Phase 7](phase-7-live-backend-verification.md)  | Live backend, CORS, cookie, and release verification | In progress; blocked on CORS |

## Completed contract surface

The frontend currently defines typed contracts for:

- Login and terms acceptance.
- MFA method selection and verification.
- Refresh, current user, and logout.
- Current terms.
- Registration, confirmation, and OTP resend.
- Forgot/reset password.
- Customer invitation acceptance.

Google login, MFA enrollment/settings, trusted-browser management, identifier changes, account deletion, and other account-security operations are outside the current customer-auth contract layer.

## Source boundaries

```text
openapi.json                              Authoritative checked-in backend schema
src/lib/api/generated/openapi.d.ts       Generated TypeScript wire declarations
src/lib/api/auth/client.ts                Direct browser transport and refresh coordination
src/lib/api/auth/token-vault.ts           Memory-only access-token storage
src/lib/api/auth/types.ts                 UI-facing transition types
src/lib/api/auth/queries.ts               TanStack query/mutation option factories
src/lib/api/auth/query-client.ts          Shared browser QueryClient
src/lib/api/auth/runtime.ts               Lazy public-environment binding
tests/unit/auth-api.test.ts                Transport and contract tests
```

The existing flight boundary under `src/lib/api/` remains separate. It preserves current frontend flight view models until authoritative backend flight operations exist.

## Current verification

The completed source passes:

- OpenAPI generated-contract drift checking.
- Astro and React typechecking with no errors and two existing `FormEvent` deprecation hints.
- Strict core TypeScript.
- Source-boundary inspection of 28 TypeScript/TSX modules.
- 102 unit tests.
- Static production generation of 23 pages.
- 36 functional Chromium tests.
- Dependency audit with zero known vulnerabilities.

Seven exact Figma image exports remain missing, so approved visual snapshots are still blocked.

## Backend prerequisites

Before Phase 5 can be accepted end to end, the backend must support:

- Credentialed CORS for the exact frontend origin.
- `Authorization` and JSON mutation preflights.
- A production-safe `HttpOnly`, `Secure` refresh cookie.
- Cookie attributes compatible with the deployed frontend/backend sites.
- Refresh rotation, replay rejection, expiration, and logout clearing.
- Stable runtime error responses for the customer authentication operations.

The frontend cannot infer or fix these deployment policies from OpenAPI alone.

## Known contract gaps

- `TokenResponse` does not declare access-token expiration.
- Refresh-cookie behavior is absent from `openapi.json`.
- The live schema now types several successful mutation responses; remaining unconstrained responses still require review.
- Most runtime authentication errors are undocumented.
- Several identifier schemas allow neither email nor phone.
- WebAuthn options and credentials are opaque objects.

Phase 7 synchronized the live schema on 2026-11-15. It confirmed the remaining gaps above and is blocked on exact-origin CORS before credentialed browser and refresh-cookie verification can proceed.

## Release acceptance

Customer authentication is complete only when:

- Phase 5 screens and Phase 6 header integration are implemented.
- The Phase 7 live CORS and cookie matrix passes.
- Login, terms, MFA, registration, recovery, invitation, refresh, and logout work against the deployed backend.
- No token or authentication proof appears in persistent browser storage, URLs, logs, or TanStack query data.
- English, Arabic, RTL, keyboard, responsive, accessibility, and error-state checks pass.
- Existing homepage and flight presentation tests remain passing.
- Visual approval is completed after the missing exact assets are supplied.
