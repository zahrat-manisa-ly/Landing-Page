# Implementation decisions - 2026-11-01

## User-confirmed requirements

The user requested conversion of the high-fidelity MANISA designs into an actual Astro repository using Tailwind CSS and React islands. The user confirmed that actual data comes from a backend API, then authorized implementation with "ok implement".

That authorizes code work, not automatic approval of visual fidelity, backend integration, all remaining pages, or release. The homepage remains the first visual review checkpoint. Additional flight-discovery screens are draft implementations awaiting review.

## Recorded technical choices

- Single local repository, `manisa-travel-web`. No remote owner/repository was specified; no GitHub remote is created or changed.
- Astro owns routes/layouts/editorial content. React roots are limited to search, results and offer detail. Tailwind v4 theme variables are paired with named CSS composition classes for Figma-specific geometry.
- Static route shells with live browser API requests are used for this initial milestone. This revises the earlier server-rendering-by-default proposal because no runtime host, private-credential requirement or auth contract is available. Add an approved server adapter if required; do not create a second business backend.
- Runtime offers use `/[lang]/flights/offer/?id=...`, rather than pretending an unbounded offer-ID path can be enumerated at static build time. Search context stays in non-sensitive query parameters. No passenger data is introduced.
- API configuration defaults to blank. The API client and adapter normalize data but do not supply inventory. Synthetic records are confined to tests.
- API view models are proposed internal contracts. Actual wire-format mapping, authentication, capabilities, and staging integration remain unresolved.
- Local filtering/sorting applies to loaded offers and is labelled accordingly. Backend-provided rank is preserved for Recommended.
- Price units, currencies, total/per-adult basis, airport time zones, and expiry are explicit. No frontend currency conversion or inferred totals are introduced.
- P-001 through P-004 are this source milestone; 22 page conversions remain pending. A basic 404 is a utility fallback, not an approved P-029 conversion.
- Missing image exports are labelled neutral slots in development. Release asset validation fails until all exact files are present. No stock substitutions or fake screenshots.
- Font packages are declared as dependencies; no font binaries are included in the handoff.
- English and draft Arabic routes exist. Arabic copy/RTL parity needs review. Dark mode and advanced motion are deferred until their designs are confirmed.
- No package lockfile is invented. The first successful dependency installation must generate a reviewed lockfile; the release workflow requires it.

## Still needed

Backend OpenAPI or equivalent documentation, staging base URL, browser/server authentication arrangement, endpoint methods, error envelopes, currency and pagination rules, API capabilities, approved asset exports, dependency installation/build evidence, visual/keyboard/accessibility review, remaining page implementation, final content, hosting and explicit release approval.
