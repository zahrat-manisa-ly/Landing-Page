# Phase 5 customer authentication screens

Status: completed in source; live backend verification remains Phase 7

## Objective

Build the customer-facing authentication experience over the Phase 4 TanStack contracts without changing the established homepage and flight-discovery presentation contract.

## Planned routes

```text
/{lang}/auth/sign-in/
/{lang}/auth/register/
/{lang}/auth/register/verify/
/{lang}/auth/forgot-password/
/{lang}/auth/reset-password/
/{lang}/auth/invitation/
```

Terms acceptance and MFA should remain steps inside the active sign-in React root rather than separate Astro navigations. This preserves temporary transaction and challenge tokens in memory.

## Sign-in flow

The sign-in application must support:

- Email or phone plus password.
- Remember-me and device-name fields only when approved for the design.
- Terms-required interruption and continuation.
- MFA method selection.
- Email, SMS, and WhatsApp one-time codes.
- Recovery codes.
- WebAuthn when backend and browser behavior is confirmed.
- Explicit expired, invalid, throttled, unavailable, and retry states.

Reloading during terms or MFA intentionally restarts login because temporary tokens are not persisted. The UI must communicate this outcome without exposing tokens in URLs.

## Registration and recovery

The planned screens cover:

- Customer registration.
- Registration OTP confirmation and resend.
- Neutral forgot-password responses that do not reveal account existence.
- Password reset from the backend-issued reset token.
- Customer invitation acceptance.

The frontend must add stricter user-facing validation where the current OpenAPI schema permits ambiguous identifier input, while preserving backend errors as the final authority.

## Presentation requirements

- Reuse existing typography, spacing, colors, controls, notices, and responsive conventions.
- Support English and Arabic through the typed dictionaries.
- Set correct LTR/RTL behavior without mirroring semantic values such as email addresses and codes.
- Support 390px, 768px, and 1440px layouts.
- Provide visible focus, keyboard completion, labelled controls, error summaries, and focus movement to invalid input.
- Do not replace or weaken current travel-page sections.

## State ownership

- TanStack Query owns backend state and mutations.
- A small reducer inside the authentication React root owns the active login step and temporary terms/MFA values.
- The shared session query owns anonymous/authenticated status.
- Passwords, OTPs, recovery codes, WebAuthn proofs, and temporary tokens must never enter URLs or browser storage.

## Acceptance criteria

- Every supported authentication union has a visible, tested UI path.
- Login completion updates the shared session query without exposing the access token.
- English, Arabic, RTL, keyboard, mobile, and desktop behavior pass browser tests.
- Password recovery remains enumeration-resistant.
- Reload behavior during incomplete flows is deliberate and tested.
- Existing presentation-contract tests remain unchanged and passing.

## Implemented surface

- Added all six localized static routes for English and Arabic.
- Added a shared React authentication root using the Phase 4 QueryClient and option factories.
- Kept terms transaction and MFA challenge values in the active sign-in reducer only.
- Implemented terms continuation, MFA method selection, email/SMS/WhatsApp code entry, recovery codes, and both MFA verification response branches.
- Added an explicit WebAuthn-unavailable state until browser/backend credential conversion is verified.
- Implemented registration, confirmation, resend, neutral forgot-password, password reset, and invitation acceptance.
- Kept passwords, OTPs, recovery codes, and reset/invitation tokens out of URLs and browser storage.
- Added stricter email-or-phone, password, matching-password, and OTP validation with invalid-field focus.
- Added localized error, retry, reload, responsive, keyboard, LTR, and RTL states.

The Phase 6 header remains intentionally unchanged. Authentication routes are available directly and from links inside the authentication experience.

## Verification evidence

- `npm run openapi:check` passed.
- `npm run check` passed with the two existing flight-search `FormEvent` deprecation hints and no errors.
- `npm run check:core` and `npm run lint:boundaries` passed.
- `npm test` passed 102 unit tests.
- `npm run build` generated 23 static pages, including 12 localized authentication pages.
- `npm run test:e2e` passed 36 Chromium tests, including 12 authentication workflows and responsive checks.

Live backend CORS, refresh-cookie, runtime error-shape, WebAuthn, and delivery-channel behavior remain Phase 7 gates.
