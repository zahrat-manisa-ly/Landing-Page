# Design fidelity and unresolved gaps

## Verified source frames

| Page  | Desktop frame | Mobile frame |
| ----- | ------------- | ------------ |
| P-001 | 198:3371      | 198:3479     |
| P-002 | 200:1640      | 200:1727     |
| P-003 | 200:2254      | 200:2374     |
| P-004 | 202:1578      | 202:1691     |

Source file key: `LeXUR0uk6wa0AQl30UGOm5`. The detailed design contexts and screenshots, not only low-fidelity page names, were inspected. Source-to-file mapping is in `implementation-map.csv`. These are implementation references; their presence is not evidence of final design approval. Where a section-specific desktop identifier was not retained, the CSV records the verified whole-page frame rather than inventing a child ID.

## Release blockers

1. Seven local design image exports are missing: desktop and mobile coast, Istanbul, and Cappadocia images, plus the Mediterranean search image. The manifest contains the exact node, filename, source URL and slot dimensions. Desktop/mobile image crops have separate entries. Empty files, substituted images, and whole-screen screenshots are not used as implementation assets.
2. Dependency installation, Astro/React typecheck, production build, and functional browser rendering now pass. Approved screenshot comparison remains blocked by the missing exact assets. No visual parity, accessibility conformance, or performance score is claimed.
3. No approved screenshot baselines exist. Compare 1440px desktop and 390px mobile first, then 768px and narrower widths. Check Arabic independently.
4. The backend foundation contract is available, but flight operations are not yet present. Flight screens cannot be accepted with real inventory until the future flight contract is integrated and verified.

## Deliberate implementation translations

Figma's illustrative flight prices, airline names and itinerary strings are not shipped as live inventory. Data slots are populated only after a valid backend response.

The results frame's empty-state sample is conditional. Its filter-sheet sample is an actual native modal dialog with draft/apply/cancel behavior. Neither sample is permanently appended to successful results.

Normal document structure uses flow/grid/flex. Absolute positioning is limited to the intentional homepage editorial collage. Page heights may grow for real content, form errors, longer translations and connection notices; they are not clipped to a Figma artboard.

Native date inputs replace visually inert rectangles. Popovers, focus rings, form errors and keyboard interactions extend the static reference. A custom calendar is not invented without an approved interaction specification.

The current result sorting UI uses an accessible select instead of rendering nonfunctional dot-labelled text. The mobile drawer's detailed filtering content is shared with the desktop sidebar.

Read-only currency display and unavailable navigation reflect missing backend capabilities and the bounded milestone. They are not simulated working account, payment or support controls.

The selected fare uses the first available API fare initially; a backend-specified default can replace that policy when documented. No particular fare tier or price is hardcoded.

## Tokens, typography and themes

The selected screens use Inter, including the homepage display heading. Warm cream surfaces, orange actions, yellow detail and sea-blue footer are mapped to semantic CSS variables and Tailwind theme tokens. Alexandria is used for draft Arabic based on the newer foundation preview.

Some older foundation notes conflict with newer previews. They were not used to overwrite the inspected screen typography. A full dark-mode UI and theme switch are not included; dark foundation swatches alone are insufficient to approve all page states. English and Arabic copy need content review. Translation expansion and mixed-direction codes require browser inspection.

No complex GSAP motion is introduced without an approved motion specification. CSS hover/focus/loading behavior respects reduced-motion preferences.
