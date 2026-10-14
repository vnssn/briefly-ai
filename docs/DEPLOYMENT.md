# Deployment checklist and operations

## Local verification

- [x] Clean npm ci from the committed lockfile succeeds on Node 24.19; 47 tests and build pass after reinstall.
- [x] Tests pass and coverage is recorded.
- [x] Production build succeeds.
- [x] Browser critical path passes with mocked provider; sample/export/task flow tested.
- [x] Mobile Lighthouse evidence saved.
- [x] axe audit passes; actual improvements documented.

## Release verification

- [x] GitHub repository created and source pushed without secrets: https://github.com/vnssn/briefly-ai
- [x] Vercel project connected to vnssn/briefly-ai, main branch.
- [x] Groq API key configured as Vercel Production Secret.
- [x] Arcjet key configured as Vercel Production Secret.
- [x] Application quota variables configured (`AI_REQUESTS_PER_MINUTE=10`, `AI_REQUESTS_PER_DAY=100`, `AI_INPUT_BUDGET_PER_MINUTE=8000`).
- [x] Old Gemini environment variables removed from Vercel.
- [x] Initial deployment succeeds: https://briefly-ai-pink.vercel.app
- [x] Real Groq generation tested locally through Arcjet + shared Redis quota.
- [x] Real Groq generation tested on deployed URL.
- [x] UI displays **READY TO GO / AI GENERATED** after a successful live generation.
- [x] Sample, task toggling, Markdown download, and keyboard skip-link navigation verified in production.
- [x] Shared quota 429 verified; UI preserves notes and previous output.
- [x] Free shared Redis connected; concurrent production requests verified atomic reservation and rejection.
- [x] Vercel Firewall reviewed: system mitigations active; no custom WAF rules or bot protection enabled.

## Monitoring

Use Vercel deployment/build logs and function error/response metrics. Review Groq quota usage in the Groq console. Investigate elevated 429/502 rates. Do not log request bodies or note contents. Health monitoring is not configured automatically; choose an uptime service for the deployed homepage and inspect API failure rates separately.

## Rollback

In Vercel Deployments, select the previous verified production deployment and promote it. Verify the homepage and one generation afterward. Environment-variable changes may require their own correction and redeployment; rollback does not necessarily restore external secrets, quota, or provider configuration. For a code fix, revert the offending Git commit and redeploy through the connected branch.

Release owner: Vansh Singh  
Sign-off date: 14 October 2026

Groq API key, Arcjet key, and the Free Upstash store are connected. Real Groq generation verified live.
