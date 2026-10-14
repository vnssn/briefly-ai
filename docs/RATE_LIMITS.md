# Free-tier quota protection

Google's current documentation lists three independent quota dimensions: requests per minute (RPM), input tokens per minute (TPM), and requests per day (RPD). Limits are shared by a Google project, not isolated per API key. Actual model/project allowances are shown in AI Studio; a universal free-tier number should not be assumed. Google's RPD resets at midnight Pacific time.

Sources checked 14 October 2026:

- https://ai.google.dev/gemini-api/docs/rate-limits
- https://upstash.com/docs/redis/features/restapi
- https://upstash.com/docs/redis/sdks/ts/commands/scripts/eval

## Implemented app defaults

- 1 request per rolling 60 seconds, shared across all visitors.
- 10 provider attempts per rolling 24 hours, shared across all visitors.
- 12,000 estimated input units per rolling 60 seconds. UTF-8 size of serialized notes plus 4,096 units of overhead is reserved before calling the model. This intentionally generous estimate is an application budget, not Google's tokenizer or an exact TPM measurement.
- Existing 15,000-character input bound and 4,096 output-token cap remain.
- Reservations are atomic. A request never reaches Gemini if allowance cannot be reserved.
- Failed provider calls consume reservations; there is no refund or automatic retry.
- Requests are spaced as well as counted, to avoid a burst around a time-window boundary.
- Daily provider quota errors trigger a 24-hour cooldown. Unknown 429 errors default to a one-hour cooldown. Retry-After (seconds or HTTP date) and google.rpc.RetryInfo are respected within a 60-second to 24-hour safety interval.
- Provider overload and invalid/timeout responses trigger a minimum 60-second pause. Existing longer cooldowns are never shortened.
- Retry responses include Retry-After and retryAfter JSON. The browser disables generation during the advertised wait; clearing notes does not clear this wait. Reloading a tab cannot reset the server limit.
- No request queue, retry loop, automatic model switching, or recurring provider probe.

The user-provided AI Studio screenshot (14 October 2026) shows **Gemini 3.1 Flash Lite: 15 RPM, 250,000 input TPM, and 500 RPD** for the selected free-tier project. The displayed 7/15, 1.67K/250K, and 10/500 values are peak usage versus limits over the selected 28 days, not remaining quota. Briefly now selects `gemini-3.1-flash-lite` and retains the conservative defaults above. These limits apply to the screenshot project; the key must belong to that project. Recheck AI Studio if the model or project changes. If another application uses the same Google project, leave enough headroom for it; this app cannot observe that external usage. Account suspension cannot be ruled out by a rate limiter.

## Durable production storage (required)

1. Create an Upstash Redis database through your Vercel integration or Upstash account.
2. Connect the database to the Vercel project. The native integration creates `KV_REST_API_URL` and `KV_REST_API_TOKEN`, which the app accepts automatically. Manual setup can instead use `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as server-only Vercel environment variables. Never use VITE_ prefixes or put credentials in source control.
3. All deployments/environments using the same Gemini project must use the **same Redis database and AI_QUOTA_NAMESPACE**. Use `briefly:quota:v1` unless you need a different project. Do not change namespace to bypass exhausted quota.
4. Optionally set AI_REQUESTS_PER_MINUTE, AI_REQUESTS_PER_DAY, and AI_INPUT_BUDGET_PER_MINUTE to confirmed safe budgets. Invalid settings block generation. Configurable maxima are 10 RPM, 250 rolling-day attempts, and 100,000 estimated input units/minute; higher values fail closed.
5. Redeploy and verify a first provider attempt, a second blocked attempt, and preservation of notes. Configure Vercel Firewall protection separately if exposing the endpoint widely to avoid abusive function/Redis traffic.

Redis uses an atomic Lua script, Redis server time, and a rolling event log. Entries expire after 48 hours. It stores only attempt timestamps, estimated input sizes, and cooldown expiry. No meeting content or client IP addresses are stored.

If Redis is missing, times out, fails, or returns an invalid decision, production **fails closed** with 503 before contacting Gemini. Local development may use a single-process in-memory store, which resets on restart and is not production protection. `VERCEL` or production NODE_ENV always requires Redis.

## Verification boundaries

Tests cover concurrent reservations in the local policy, boundary expiry, daily budgets, aggregate input, cooldown extension, configuration bounds, failed calls, provider RetryInfo, storage errors, and the Redis HTTP contract. The Redis Lua script still needs a real connected-database smoke test before release; mocked HTTP tests do not establish production Redis connectivity. No live provider probes were made to test the limiter, avoiding unnecessary free-tier usage.
