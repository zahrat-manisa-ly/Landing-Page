# Phase 2 OpenAPI and static frontend foundation

Date: 2026-11-11

Status: completed

## Outcome

The frontend is a static Astro application that calls the separate backend directly from browser React islands. The abandoned Astro BFF, frontend session store, Redis dependency, and frontend-owned authentication routes have been removed.

The backend contract remains authoritative in `openapi.json`. TypeScript declarations are generated from that document rather than copied by hand.

## Architecture

```text
Static Astro page
  -> React island
  -> typed browser API client
  -> separate backend
```

Astro produces static files in `dist/`. It does not run an authentication server, proxy backend requests, issue a frontend session cookie, or retain backend credentials.

## Implemented surface

- Removed `@astrojs/node`, `redis`, `src/lib/server/`, `src/pages/api/auth/`, and the server security middleware.
- Returned `astro.config.mjs` to Astro's default static output.
- Added `openapi-typescript` generation from the checked-in `openapi.json`.
- Added `openapi-fetch` as the typed request boundary.
- Generated `src/lib/api/generated/openapi.d.ts`.
- Added `npm run openapi:generate` and `npm run openapi:check`.
- Added the OpenAPI drift check to CI and the release gate.
- Preserved the existing flight view-model adapter and every implemented travel page.

Generated files must not be edited manually. `src/lib/api/generated/openapi.d.ts` is excluded from Prettier so formatting does not create false drift from the generator's canonical output.

## Environment contract

`PUBLIC_API_BASE_URL` identifies the browser-visible backend origin. Authentication paths generated from OpenAPI already include `/api/v1`.

Because this value is public, it must never contain credentials, private keys, access tokens, or refresh tokens. Production must use HTTPS. Local HTTP is acceptable only for loopback development hosts.

## Contract update workflow

1. Replace `openapi.json` with the reviewed backend specification.
2. Run `npm run openapi:generate`.
3. Review generated operation and schema changes.
4. Update handwritten adapters or TanStack option factories when behavior changed.
5. Run `npm run openapi:check`, typechecks, tests, and the production build.

CI fails when `openapi.json` and the generated declarations disagree.

## Verification evidence

At completion:

- `npm run openapi:check` passed.
- `npm run check` passed with two existing React `FormEvent` deprecation hints and no errors.
- `npm run check:core` passed.
- `npm run lint:boundaries` inspected 28 TypeScript/TSX modules successfully.
- `npm test` passed 94 unit tests.
- `npm run build` generated 11 static pages.
- `npm run test:e2e` passed 24 Chromium tests.
- `npm audit --audit-level=low` reported zero vulnerabilities.

## Boundaries

This phase establishes compile-time wire contracts and static deployment. It does not prove that the live backend permits browser CORS, sets a usable refresh cookie, or conforms to every generated response schema. Those are Phase 7 requirements.
