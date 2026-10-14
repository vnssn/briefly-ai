# Validation evidence

Run date: 14 October 2026 (Asia/Kolkata).

## Automated tests

- Vitest: **47 tests passed**.
- Statement coverage: **89.76%**; branch coverage: **93.3%**; function coverage: **86.27%**.
- All three React components (`App`, `NotesEditor`, `BriefResult`) have behavior tests. Overall line coverage is **91%**.
- Evidence: `coverage-summary.json`; full HTML report is generated in `coverage/` by `npm test`.
- Browser tests: **2 passed**, covering the sample, checkbox progress, download, keyboard entry, mocked live generation, and preserving notes/results after a service failure.
- Browser API responses are mocked. These tests do not verify a real provider response.
- Production build: passed.
- Dependency audit: **0 known vulnerabilities** reported by npm.

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
- Best practices: **81** (local HTTP affects this; production HTTPS verification was completed separately).
- SEO: **100** after adding a valid robots file.
- Final reports: `lighthouse-final-mobile.report.html` / `.json`; the first-run reports are also retained. Scores vary with environment and are not deployed-site scores.

Actual production mobile Lighthouse:

- Performance: **87**
- Accessibility: **100**
- Best practices: **100**
- SEO: **100**
- Reports: `lighthouse-production.report.html` / `.json`.

## Live AI generation checks

The original Gemini integration was replaced with GroqCloud.

- Provider: **GroqCloud** via OpenAI-compatible `chat/completions`.
- Model: **`openai/gpt-oss-120b`**.
- Structured output: `response_format` with `json_schema` and **`strict: true`** (constrained decoding).
- Local test: HTTP 200, structured brief returned in ~1.8s.
- Production test: HTTP 200 from `https://briefly-ai-pink.vercel.app/api/brief`, structured brief returned.
- Live UI verification: the public app displays **READY TO GO** / **AI GENERATED** after a successful generation.
- Evidence:
  - `docs/groq-live-verification.json` — first live result and provider rate-limit headers.
  - `docs/groq-production-verification.json` — production API smoke result.
  - Production screenshot in submission assets.

Provider org limits captured from real response headers:

- Requests per day: **1,000**
- Tokens per minute: **8,000**

Application ceilings sit safely inside those limits:

- `AI_REQUESTS_PER_MINUTE=10`
- `AI_REQUESTS_PER_DAY=100`
- `AI_INPUT_BUDGET_PER_MINUTE=8000`

## Request protection (Arcjet)

- `@arcjet/node` integrated in the API handler.
- Rules: Shield (LIVE), bot detection (DRY_RUN, so Lighthouse/Playwright never get blocked), per-IP fixed window of 3 requests/60s (LIVE).
- Arcjet runs **before** the shared Redis quota and **fails open** on Arcjet outages, so availability is preserved.
- Evidence: unit tests cover allowed, rate-limit denied, shield denied, and fail-open paths.

## Quota verification

- Shared Upstash Redis (`upstash-kv-yellow-engine`) connected via Vercel integration variables `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
- Atomic Lua reservation verified locally and in production.
- Concurrent production requests: one processed, the other received **429** when quota was exhausted.
- Cooldown preserves notes and previous result in the UI.
- No quota counters were reset to bypass limits.

## Connected Redis release verification

The user-created Free Upstash database `upstash-kv-yellow-engine` is connected to briefly-ai. The integration supplies `KV_REST_API_URL` and `KV_REST_API_TOKEN`, now supported by the app.

Two simultaneous POST requests to the public production API verified atomic reservation and rejection. The request that reached the provider had first completed the Redis Lua reservation. Evidence: `production-api-verification.json`.

Clean-install verification: `npm ci` from the committed lockfile succeeded using Node 24.19. The full 47-test suite and production build passed after reinstall.

Vercel Firewall review showed active system mitigations, zero custom rules, and inactive optional bot protection; no additional service was enabled.

## What changed since the last validation draft

- Replaced Gemini with Groq.
- Added Arcjet per-visitor protection.
- Updated provider error handling and tests for Groq response shapes.
- Verified a real live AI generation locally and on the deployed app.
- Updated application rate limits to match Groq free-tier limits.

## Remaining caveats

- Lighthouse and axe scores are snapshots; real-world scores vary by device, network, and Vercel edge caching.
- The free Groq tier is subject to your org's rate-limit headers and account status. The app fails closed if limits are exhausted.
- Browser tests mock the provider; live verification was performed separately as documented above.
