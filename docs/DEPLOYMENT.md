# Deployment checklist and operations

## Local verification

- [x] Clean npm ci from the committed lockfile succeeds on Node 24.19; 39 tests and build pass after reinstall.
- [x] Tests pass and coverage is recorded.
- [x] Production build succeeds.
- [x] Browser critical path passes with mocked provider; sample/export/task flow tested.
- [x] Mobile Lighthouse evidence saved.
- [x] axe audit passes; actual improvements documented.

## Release verification

- [x] GitHub repository created and source pushed without secrets: https://github.com/vnssn/briefly-ai
- [x] Vercel project connected to vnssn/briefly-ai, main branch.
- [x] Gemini Production Secret configured; shared application quotas active.
- [x] Initial deployment succeeds: https://briefly-ai-pink.vercel.app
- [ ] Real Gemini generation tested on deployed URL.
- [x] Sample, task toggling, Markdown download, and keyboard skip-link navigation verified in production.
- [x] Real provider 503 and shared quota 429 verified; UI preserves notes and previous output.
- [x] Free shared Redis connected; two concurrent production requests verified atomic reservation and rejection.
- [x] Screenshot confirms Flash Lite 15 RPM / 250K input TPM / 500 RPD; app uses 1 RPM / 12K estimated input / 10 rolling-day attempts.
- [x] Existing Vercel Firewall reviewed: system mitigations active; no custom WAF rules or bot protection enabled. Shared application limits protect Gemini; evaluate stronger edge controls before broad promotion.

Unchecked items are not signed off.

## Monitoring

Use Vercel deployment/build logs and function error/response metrics. Review Gemini quota usage in Google AI Studio. Investigate elevated 429/502 rates. Do not log request bodies or note contents. Health monitoring is not configured automatically; choose an uptime service for the deployed homepage and inspect API failure rates separately.

## Rollback

In Vercel Deployments, select the previous verified production deployment and promote it. Verify the homepage and one generation afterward. Environment-variable changes may require their own correction and redeployment; rollback does not necessarily restore external secrets, quota, or provider configuration. For a code fix, revert the offending Git commit and redeploy through the connected branch.

Release owner: Vansh Singh
Sign-off date: pending production checks

Gemini Production Secret and the Free Upstash store are connected. Release e38133b is deployed (ID 2DvWNnTTP2Xp7iyWnmFTn5rKkeBg). Shared quota reservations, provider cooldown, task completion, and export were verified live. Real Gemini generation remains blocked by provider HTTP 503 UNAVAILABLE (high demand); do not sign off the release until it succeeds. No paid service was created.
