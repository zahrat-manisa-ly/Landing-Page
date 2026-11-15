# Phase 7 live backend verification

Status: in progress; blocked on test-backend CORS configuration

Tested: 2026-11-15 against `https://test.zahrat-manisa.ly`

## Objective

Verify the generated contracts and direct browser authentication architecture against the separate backend in an environment that matches production CORS, HTTPS, domains, and cookie behavior.

Mocked frontend tests are necessary but cannot prove browser cookie acceptance, preflight behavior, rotation semantics, or deployment-domain policy.

## Backend contract gates

Resolve and document:

- Access-token lifetime or expiry metadata.
- Refresh-cookie name, path, host/domain, lifetime, `Secure`, `HttpOnly`, and `SameSite` attributes.
- Refresh-token rotation and replay behavior.
- Cookie clearing on current-session and all-session logout.
- Runtime error responses omitted from `openapi.json`.
- Remaining success payloads typed as unconstrained `unknown`.
- Required email/phone identifier rules where schemas currently allow neither.
- WebAuthn request/response shapes and supported browsers.

Update `openapi.json` and regenerate frontend types when the authoritative contract changes.

## CORS and cookie matrix

Test at minimum:

- Local frontend to local backend.
- Deployed frontend and backend on same-site subdomains, if applicable.
- The actual production-like cross-site arrangement, if applicable.
- Allowed exact origin with credentials.
- Rejected unknown origin.
- Preflight for JSON mutations and `Authorization`.
- Refresh cookie set, sent, rotated, expired, and deleted in browser developer tools.

Wildcard origins are invalid when credentials are enabled.

## End-to-end authentication matrix

- Anonymous bootstrap.
- Normal login and reload restoration.
- Terms-required login.
- Each enabled MFA method.
- Invalid and expired OTPs.
- Recovery-code verification.
- WebAuthn where enabled.
- Registration, confirmation, and resend.
- Forgot/reset password with neutral responses.
- Invitation acceptance.
- Current-session and all-session logout.
- Concurrent expired-token requests and single refresh behavior.
- Refresh rejection, backend outage, throttling, and malformed response handling.

No staging secrets, passwords, OTPs, or tokens may be committed to tests or logs.

## Quality gates

- `npm run openapi:check`.
- Astro and core TypeScript checks.
- Unit and browser suites.
- Static production build.
- Dependency audit.
- English/Arabic and LTR/RTL review.
- Keyboard and screen-reader review of authentication screens.
- Performance review for authentication bundles and startup requests.
- Existing homepage and flight presentation contracts.

Visual approval remains separately blocked until the seven exact Figma assets are supplied and reviewed.

## Verification run

The test backend is reachable over HTTPS and exposes its OpenAPI document. The live document was synchronized to `openapi.json`, and frontend declarations were regenerated. The newer contract adds concrete success payloads to several authentication mutations, including registration, logout, password reset, password change, and identifier operations.

The live contract still does not define:

- Access-token expiry metadata.
- Refresh-cookie security attributes or lifetime.
- Common runtime authentication errors such as `400`, `401`, `403`, `409`, and `429`.
- A schema rule requiring an email or phone identifier.
- Concrete WebAuthn option and credential shapes.

### CORS result

Credentialed preflights to `/api/v1/auth/login` were attempted with JSON and `Authorization` headers from:

- `http://localhost:4321`
- `http://127.0.0.1:4321`
- `http://localhost:4322`
- `http://127.0.0.1:4322`

Each request returned `400` without `Access-Control-Allow-Origin`. An unknown origin was also rejected. The backend returned `Access-Control-Allow-Credentials: true`, but that does not permit browser access without an exact allowed origin. An anonymous refresh request returned `401` as expected but likewise omitted `Access-Control-Allow-Origin`.

The backend must allow the exact local frontend origin before browser authentication can be tested. For the normal Astro development server, configure `http://localhost:4321`; add another origin only if that exact origin is intentionally used. Wildcard origin configuration must not be used with credentials.

### Local quality gates

- Generated OpenAPI contract drift check passed.
- Astro and core TypeScript checks passed with two existing `FormEvent` deprecation hints and no errors.
- Source-boundary inspection passed for 33 TypeScript/TSX modules.
- All 103 unit tests passed.
- Static production build generated 23 pages.
- All 40 mocked Chromium functional tests passed.
- Dependency audit reports zero known vulnerabilities after updating Astro to `7.4.12`.
- The no-JavaScript browser test now uses Playwright's configured base URL instead of a stale hardcoded port.

### Blocked live checks

The following checks were not attempted with credentials because the browser cannot pass CORS yet:

- Login, reload restoration, terms acceptance, MFA, and recovery codes.
- Registration, confirmation, resend, password recovery, and invitation acceptance.
- Refresh-cookie acceptance, attributes, sending, rotation, expiry, and deletion.
- Current-session and all-session logout.
- Concurrent expired-token requests, refresh rejection, throttling, and outage handling against the live backend.

Credentials, OTPs, tokens, and recovery codes remain excluded from source, logs, and this report. Sensitive steps will be entered manually after CORS is enabled.

## Exit criteria

Authentication is production-ready only when:

- The deployed browser accepts and sends the refresh cookie as designed.
- CORS permits only approved frontend origins.
- Access-token refresh, retry, rotation, and logout behavior pass against the live backend.
- Every customer authentication screen passes the supported browser and locale matrix.
- Known OpenAPI gaps are resolved or explicitly accepted with documented behavior.
- No authentication secret appears in persistent browser storage, URLs, application logs, or TanStack query data.
