# Validation evidence

Run date: 14 October 2026 (Asia/Kolkata). Local checks; production checks are still pending.

## Automated tests

- Vitest: **22 tests passed**.
- Statement coverage: **84.34%**; branch coverage: **89.79%**; function coverage: **81.25%**.
- All three React components (`App`, `NotesEditor`, `BriefResult`) have behavior tests. Overall line coverage is **86.11%**.
- Evidence: `coverage-summary.json`; full HTML report is generated in `coverage/` by `npm test`.
- Browser tests: **2 passed**, covering the sample, checkbox progress, download, keyboard entry, mocked live generation, and preserving notes/results after a service failure.
- Browser API responses are mocked. These tests do not verify a real provider response.
- Production build: passed.
- Dependency audit after tooling updates: **0 known vulnerabilities** reported by npm at install time.

## Accessibility

- axe WCAG 2 A/AA and 2.1 A/AA scan: **0 violations detected** in the desktop and 390px mobile sample-result views.
- Evidence: `axe-desktop.json`, `axe-mobile.json`.
- Manual automated interaction checks: skip link receives first Tab focus, labels find the notes field, actions can be checked, mobile layout does not overflow horizontally.
- This is bounded evidence, not a certification of complete WCAG conformance. Other states and assistive technologies still benefit from manual review.

### Concrete improvement from audit

The initial scan found insufficient contrast in secondary labels, footers, action metadata, and the open-questions heading. The original workspace subtitle had a measured ratio of **4.38:1**, below the required **4.5:1** for small text. Secondary text now uses darker ink (`#58664f`); the questions heading was darkened separately. The rerun detected no violations. Before evidence is preserved in `axe-before-fix.json`.

## Mobile Lighthouse

Production bundle served locally in Chrome with Lighthouse mobile defaults:

- Performance: **94**
- Accessibility: **100**
- Best practices: **81** (local HTTP affects this; production HTTPS verification remains pending).
- SEO: **100** after adding a valid robots file.
- Final reports: `lighthouse-final-mobile.report.html` / `.json`; the first-run reports are also retained. Scores vary with environment and are not deployed-site scores.

## Actual Gemini checks

- The original default model (`gemini-2.5-flash`) returned 404 and instructed new users to switch to `gemini-3.8-flash`.
- The default was updated accordingly.
- Direct checks of `gemini-3.8-flash`, `gemini-3.5-flash`, and `gemini-3.1-flash-lite` returned **503 UNAVAILABLE**, reporting high demand.
- Model listing succeeded with the saved key, but no real generation has yet completed. This remains a release blocker; do not claim live AI verification based on the sample or mocked tests.

## Remaining production checks

Live URL, GitHub push, Vercel deployment, production headers, real Gemini generation, and final deployed Lighthouse scores remain pending. See `DEPLOYMENT.md`.


