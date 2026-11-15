# Phase 6 header and session integration

Status: completed in source; live backend verification remains Phase 7

## Objective

Replace the disabled sign-in placeholder with a small authentication-aware React island while preserving the approved header structure, dimensions, language control, currency control, and mobile navigation.

## Provider boundary

The header island will mount its own `QueryClientProvider` using `getQueryClient()`. It will consume the Phase 4 session query and therefore share cache and token state with authentication-page islands loaded in the same document.

React context does not cross Astro island roots. Sharing comes from the module-level query client, token vault, and refresh coordinator, not from placing a React provider around an Astro slot.

## Anonymous behavior

- Bootstrap the session through the backend refresh cookie.
- Keep the existing Sign In action's visual priority and dimensions.
- Link to the localized sign-in route.
- Treat a refresh rejection as anonymous.
- Distinguish backend/network failure from a confirmed anonymous session.

## Authenticated behavior

- Replace Sign In with a compact account trigger.
- Display approved identity information from `/api/v1/auth/me`.
- Provide logout without exposing token details.
- Clear the shared session query after logout even when backend logout reports an error.
- Provide equivalent account and logout actions in mobile navigation.

No administration screens are implemented in this frontend. Any future external dashboard action requires a separately approved public URL configuration and an agreed backend permission; role names alone are not sufficient authorization.

## Navigation behavior

- Successful authentication returns to an allowlisted local route or a safe default.
- Return destinations must never permit open redirects.
- Language switching preserves the equivalent localized route where one exists.
- The account menu closes on Escape, outside click, navigation, and logout, and returns focus appropriately.

## Acceptance criteria

- Anonymous, loading, authenticated, error, and logout states are explicit.
- Header layout remains stable at supported widths and in both text directions.
- Desktop and mobile controls expose equivalent actions.
- Refresh bootstrap is not duplicated by separate islands on the same page.
- Session identity is never persisted outside TanStack memory.
- Existing header and travel-page presentation regressions remain passing.

## Implemented surface

- Replaced the disabled desktop sign-in placeholder with a localized session island backed by the shared Phase 4 QueryClient.
- Added explicit loading, anonymous, authenticated, service-error, retry, logout-pending, and post-logout states.
- Bootstraps the browser session through the refresh cookie and displays only approved `/api/v1/auth/me` identity fields.
- Added an accessible desktop account menu with Escape and outside-click dismissal and focus restoration.
- Portals equivalent identity, sign-in, and logout actions into the existing mobile navigation without creating a second session query.
- Clears the memory token and shared auth cache after logout even when the backend request fails.
- Links anonymous users to the localized sign-in route with the current local travel route as a return destination.
- Applies a strict same-locale allowlist to return destinations; external, protocol-relative, auth, cross-locale, and unknown routes fall back to the localized flights page.
- Preserves the existing language switch, currency display, mobile navigation, header dimensions, and LTR/RTL behavior.
- Keeps identity and access-token state in memory only.

## Verification evidence

- `npm run check`, `npm run check:core`, and `npm run lint:boundaries` passed.
- `npm test` passed 103 unit tests, including return-path allowlist coverage.
- `npm run build` generated all 23 static pages with and without backend configuration.
- `npm run test:e2e` passed 40 Chromium tests.
- Header browser coverage verifies anonymous return links, one refresh bootstrap, authenticated identity, Escape focus restoration, network retry, mobile parity, failed-backend logout cleanup, and shared session updates after sign-in.
- Existing English/Arabic presentation checks remain overflow-free at 390px, 768px, and 1440px.

Live CORS, refresh-cookie rotation, deployed identity payloads, and backend logout behavior remain Phase 7 gates.
