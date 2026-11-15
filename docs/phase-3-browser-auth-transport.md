# Phase 3 browser authentication transport

Date: 2026-11-11

Status: completed in source; live backend verification remains Phase 7

## Outcome

The frontend has a typed direct-backend authentication client. Bearer access tokens remain in JavaScript memory only, while the separate backend owns the refresh token in an `HttpOnly` cookie.

No access token is written to local storage, session storage, a URL, an environment variable, or a TanStack Query cache.

## Token ownership

| Value                        | Owner and location                              | Persistence                                                     |
| ---------------------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| Access token                 | `src/lib/api/auth/token-vault.ts` module memory | Cleared by reload, logout, or definitive authentication failure |
| Refresh token                | Backend-issued `HttpOnly` cookie                | Controlled by backend cookie policy and remember-me behavior    |
| Terms transaction token      | Future authentication screen memory             | Cleared by reload or flow completion                            |
| MFA challenge/settings token | Future authentication screen memory             | Cleared by reload, expiry, or flow completion                   |

The token vault supports subscriptions so independent Astro React islands can observe authentication changes without using browser storage.

## Session bootstrap

When a future consumer executes the session query:

1. Use the current in-memory access token when one exists.
2. Otherwise call `POST /api/v1/auth/refresh` with `credentials: include`.
3. Retain the returned access token in the memory vault.
4. Call `GET /api/v1/auth/me` with `Authorization: Bearer <token>`.
5. Return either an authenticated user or an anonymous session.

A rejected refresh is anonymous only when the backend returns an authentication rejection. Network and server failures remain errors so the UI does not incorrectly present an outage as a logged-out state.

## Refresh concurrency and retry

- Concurrent requests share one in-flight refresh promise.
- A protected `401` clears the rejected token, refreshes once, and retries the protected operation once.
- A delayed `401` cannot clear a newer token installed by another concurrent request.
- A protected `403` remains an authorization error and does not trigger token refresh.
- A second `401` clears the replacement token and stops.
- Login, terms, MFA, registration, and recovery mutations are not automatically retried.
- Logout clears the in-memory token in `finally`, including when the backend logout call fails.

This behavior is implemented in `src/lib/api/auth/client.ts`.

## Request policy

Authentication requests use:

- `credentials: include` for the backend refresh cookie.
- `cache: no-store` for authentication responses.
- `redirect: error` to prevent credentials from following redirects.
- `Accept: application/json`.
- Bearer authorization only for protected operations.

Raw backend error bodies are not surfaced through the shared `ApiError` contract.

## Backend requirements

The backend must:

- Allow the exact frontend origin and never combine credentials with wildcard CORS.
- Send `Access-Control-Allow-Credentials: true`.
- Permit `Authorization`, `Content-Type`, and the required methods during preflight.
- Set, rotate, expire, and clear the refresh cookie correctly.
- Use `HttpOnly` and `Secure` in production.
- Use a `SameSite` policy compatible with the deployed frontend/backend relationship.
- Reject invalid or replayed refresh tokens.

Cross-site deployments require `SameSite=None; Secure`. Same-site subdomains may use a stricter policy after browser validation.

## Verification evidence

Unit coverage verifies:

- Memory-only token set, observation, and clearing.
- Credentialed refresh bootstrap.
- Access-token exclusion from returned session data.
- Concurrent refresh deduplication.
- One refresh and one retry after a protected `401`.
- Reuse of a concurrently refreshed token after a delayed stale `401`.
- No token refresh or clearing after a protected `403`.
- Termination and token clearing after a second `401`.
- Anonymous bootstrap after refresh rejection.
- Logout cleanup when the backend is unavailable.

Live cookie and CORS behavior cannot be proven with the mocked unit suite and remains a Phase 7 gate.
