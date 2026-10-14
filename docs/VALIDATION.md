# Validation evidence

Run date: 14 October 2026 (Asia/Kolkata). Local checks; production checks are still pending.

## Automated tests

- Vitest: **39 tests passed**.
- Statement coverage: **90.19%**; branch coverage: **92.85%**; function coverage: **86.27%**.
- All three React components (`App`, `NotesEditor`, `BriefResult`) have behavior tests. Overall line coverage is **91%**.
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

## Free-tier quota verification

The suite now includes rolling shared budgets, concurrent local reservations, input-budget rejection, provider cooldowns, RetryInfo, Redis failure handling, production fail-closed behavior, and the browser retry countdown. Both browser tests and axe scans passed again after these changes. Shared Redis connectivity and execution of its Lua script remain pending configuration; see RATE_LIMITS.md. No additional live Gemini requests were used to test rate limiting. Lighthouse reports predate the quota UI change.

## Screenshot-based model selection

The user supplied an AI Studio free-tier rate-limit screenshot showing Gemini 3.1 Flash Lite at 15 RPM, 250K input TPM, and 500 RPD. The app model and local server configuration were switched to gemini-3.1-flash-lite. One quota-protected smoke test returned 503 with a 60-second cooldown; live generation remains unverified. The app budgets remain 1 RPM, 10 rolling-day attempts, and 12,000 estimated input units/minute. See RATE_LIMITS.md.

## Initial production deployment

URL: https://briefly-ai-pink.vercel.app. GitHub: https://github.com/vnssn/briefly-ai. Deployment succeeded and the prepared sample was verified in the public HTTPS app. HTTP 200, Content-Security-Policy, nosniff, and DENY frame headers verified. Actual production mobile Lighthouse: performance **87**, accessibility **100**, best practices **100**, SEO **100**. Reports: lighthouse-production.report.html and .json. Gemini key is configured as a Vercel Production Secret for the next deployment; quota store activation and real production AI generation remain pending.

## Connected Redis release verification

The user-created Free Upstash database upstash-kv-yellow-engine is connected to briefly-ai. The integration supplies KV_REST_API_URL and KV_REST_API_TOKEN, now supported by the app. Commit e38133b deployed successfully as 2DvWNnTTP2Xp7iyWnmFTn5rKkeBg.
Two simultaneous POST requests to the public production API produced one 429 with Retry-After: 60 and one provider-unavailable response. The request that reached the provider had first completed the Redis Lua reservation. This verifies real Redis connectivity, Lua execution, and the concurrent shared limiter. Evidence: production-api-verification.json. The live UI displayed its countdown and preserved input and the previous sample output; production-cooldown.jpg records that state. Task completion and Markdown download were verified in the deployed app.
A subsequent local diagnostic using the same Redis allowance confirmed Gemini itself returned HTTP 503, status UNAVAILABLE, with the message that the model is experiencing high demand. There was no automatic retry or model switching. A successful real Gemini result remains the release blocker.

Clean-install verification: npm ci from the committed lockfile succeeded using the cache and Node 24.19. The full 39-test suite and production build passed again after reinstall. In production, activating the keyboard skip link and pressing Tab focused New brief as expected. Vercel Firewall review showed active system mitigations, zero custom rules, and inactive optional bot protection; no additional service was enabled.
