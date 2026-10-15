# Free-tier quota protection

Provider: **GroqCloud**. Groq's current documentation lists rate limits per model and account. Actual org allowances are returned in `x-ratelimit-*` response headers; a universal free-tier number should not be assumed.

Sources checked 14 October 2026:

- https://console.groq.com/docs/rate-limits
- https://console.groq.com/docs/structured-outputs
- https://upstash.com/docs/redis/features/restapi
- https://upstash.com/docs/redis/sdks/ts/commands/scripts/eval

## Implemented app defaults

- **10 requests per rolling 60 seconds**, shared across all visitors.
- **100 provider attempts per rolling 24 hours**, shared across all visitors.
- **8,000 estimated input units per rolling 60 seconds**. The o200k tokenizer counts serialized notes, the system prompt, and the response schema. An additional 512-token framing margin and the full 2,048-token completion allowance are reserved. Provider token accounting remains authoritative.
- Existing 15,000-character input bound and 2,048 output-token cap remain.
- Reservations are atomic. A request never reaches Groq if allowance cannot be reserved.
- Failed provider calls consume reservations; there is no refund or automatic retry.
- Requests are spaced as well as counted, to avoid a burst around a time-window boundary.
- Daily provider quota errors trigger a 24-hour cooldown. Unknown 429 errors default to a one-hour cooldown. `retry-after` header (seconds or HTTP date) is respected within a 60-second to 24-hour safety interval.
- Provider overload and invalid/timeout responses trigger a minimum 60-second pause. Existing longer cooldowns are never shortened.
- Retry responses include `Retry-After` and `retryAfter` JSON. The browser disables generation during the advertised wait; clearing notes does not clear this wait. Reloading a tab cannot reset the server limit.
- No request queue, retry loop, automatic model switching, or recurring provider probe.

Real org limits captured from Groq response headers on 14 October 2026 for `openai/gpt-oss-120b`:

- **1,000 requests/day**
- **8,000 tokens/minute**

The app ceilings above sit well inside those values.

## Per-visitor protection (Arcjet)

`@arcjet/node` runs in the API handler before the shared Redis quota:

- Shield: **LIVE** — blocks common attack patterns.
- Bot detection: **DRY_RUN** — monitors bots without blocking legitimate audit traffic (Lighthouse, Playwright, search engines).
- Per-IP rate limit: **LIVE**, fixed window, 3 requests/60s.
- Arcjet failures are **fail-open**; the shared Redis quota remains the hard global gate.

## Durable production storage (required)

1. Create an Upstash Redis database through your Vercel integration or Upstash account.
2. Connect the database to the Vercel project. The native integration creates `KV_REST_API_URL` and `KV_REST_API_TOKEN`, which the app accepts automatically. Manual setup can instead use `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as server-only Vercel environment variables. Never use `VITE_` prefixes or put credentials in source control.
3. All deployments/environments using the same Groq project must use the **same Redis database and `AI_QUOTA_NAMESPACE`**. Use `briefly:quota:v1` unless you need a different project. Do not change namespace to bypass exhausted quota.
4. Optionally set `AI_REQUESTS_PER_MINUTE`, `AI_REQUESTS_PER_DAY`, and `AI_INPUT_BUDGET_PER_MINUTE` to confirmed safe budgets. Invalid settings block generation. Configurable maxima are 10 RPM, 250 rolling-day attempts, and 100,000 estimated input units/minute; higher values fail closed.
5. Redeploy and verify a first provider attempt, a second blocked attempt, and preservation of notes.

Redis uses an atomic Lua script, Redis server time, and a rolling event log. Entries expire after 48 hours. It stores only attempt timestamps, estimated input sizes, and cooldown expiry. No meeting content or client IP addresses are stored.

If Redis is missing, times out, fails, or returns an invalid decision, production **fails closed** with 503 before contacting Groq. Local development may use a single-process in-memory store, which resets on restart and is not production protection. `VERCEL` or production `NODE_ENV` always requires Redis.

## Verification boundaries

Tests cover concurrent reservations in the local policy, boundary expiry, daily budgets, aggregate input, cooldown extension, configuration bounds, failed calls, provider rate-limit responses, storage errors, the Redis HTTP contract, Arcjet allow/deny/fail-open behavior, and Groq request/response parsing.

The real connected database and Lua script were verified with concurrent production requests: one processed through Groq, the other received 429 when quota was exhausted. Evidence is in `docs/groq-live-verification.json` and `docs/groq-production-verification.json`. No automatic retries were used.
