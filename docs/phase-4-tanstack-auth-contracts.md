# Phase 4 TanStack authentication contracts

Date: 2026-11-11

Status: completed

## Outcome

Customer authentication operations are exposed through typed TanStack Query option factories. This phase provides reusable contracts only; it does not mount providers, change the header, or add authentication screens.

## Modules

```text
src/lib/api/auth/client.ts        Direct typed backend operations
src/lib/api/auth/types.ts         Generated aliases and UI-facing transitions
src/lib/api/auth/queries.ts       Query keys and option factories
src/lib/api/auth/query-client.ts  Shared browser QueryClient factory
src/lib/api/auth/runtime.ts       Lazy environment-bound contract construction
src/lib/api/auth/index.ts         Public contract exports
```

## Query contracts

| Query         | Key                   | Behavior                                                                   |
| ------------- | --------------------- | -------------------------------------------------------------------------- |
| Session       | `['auth', 'session']` | Refreshes when necessary and returns anonymous or authenticated user state |
| Current terms | `['auth', 'terms']`   | Loads the current published terms with a five-minute stale interval        |

The session query uses infinite stale time. Authentication mutations update or clear it explicitly rather than repeatedly refreshing on window focus.

## Mutation contracts

The contract layer includes:

- Login.
- Terms acceptance during login.
- MFA method selection.
- MFA verification by code, recovery code, or WebAuthn credential object.
- Current-session or all-session logout selection.
- Registration.
- Registration confirmation.
- Registration OTP resend.
- Forgot-password request.
- Password reset.
- Customer invitation acceptance.

Successful login, MFA verification, or registration confirmation writes only the authenticated user into the session query. The access token is moved directly to the memory vault and is never returned as mutation data.

## Authentication transitions

Login is represented as an explicit union:

```text
authenticated
termsRequired
mfaRequired
```

Terms acceptance produces either `authenticated` or `mfaRequired`. MFA verification produces either `authenticated` or `settingsGranted` because both outcomes exist in the backend schema.

Temporary transaction, challenge, and settings values are returned only to the active in-memory workflow. Sensitive mutations use `gcTime: 0` so completed mutation results are not retained after observers detach.

## Astro island integration

Astro hydrates each React island as a separate React root. React context mounted in the header cannot reach an authentication-page or flight-page island.

Future consumers must:

- Call `getQueryClient()` so browser islands use the same module-level `QueryClient`.
- Call the public `getAuthContracts()` runtime factory for environment-bound contracts.
- Mount a `QueryClientProvider` inside each React root that needs queries.
- Use the shared token vault and refresh coordinator rather than creating per-island authentication clients.
- Avoid creating a second independent authentication state store.

Server/build calls to `getQueryClient()` receive a fresh client to prevent request data from being shared during rendering. Browser calls receive the singleton.

## Generated contract boundary

Request and response types are aliases of schemas generated from `openapi.json`. Handwritten transition types adapt backend unions into stable frontend states without duplicating every wire interface.

OpenAPI generation is compile-time typing, not complete runtime validation. Security-sensitive token and transition signatures receive defensive runtime checks in the authentication client. Remaining live response behavior must be validated during Phase 7.

## Verification evidence

Unit tests verify stable query keys, zero mutation retention for every sensitive operation, public authenticated session updates, logout cache clearing, server query-client isolation, disabled automatic retries, terms/MFA branches, and token exclusion. Core TypeScript confirms every request body and endpoint against generated OpenAPI paths.
