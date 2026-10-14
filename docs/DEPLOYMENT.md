# Deployment checklist and operations

## Local verification

- [ ] Clean install succeeds with committed lockfile.
- [x] Tests pass and coverage is recorded.
- [x] Production build succeeds.
- [x] Browser critical path passes with mocked provider; sample/export/task flow tested.
- [x] Mobile Lighthouse evidence saved.
- [x] axe audit passes; actual improvements documented.

## Release verification

- [x] GitHub repository created and source pushed without secrets: https://github.com/vnssn/briefly-ai
- [x] Vercel project connected to vnssn/briefly-ai, main branch.
- [ ] Server environment key configured, with provider quota/spending controls.
- [x] Initial deployment succeeds: https://briefly-ai-pink.vercel.app
- [ ] Real Gemini generation tested on deployed URL.
- [ ] Sample, task toggling, export, and keyboard interactions tested in production.
- [ ] Failure states checked without disclosing provider secrets.
- [ ] Shared Redis configured; atomic quota reservation tested across deployments.
- [x] Screenshot confirms Flash Lite 15 RPM / 250K input TPM / 500 RPD; app uses 1 RPM / 12K estimated input / 10 rolling-day attempts.
- [ ] Public endpoint Firewall controls reviewed/configured before broad sharing.

Unchecked items are not signed off.

## Monitoring

Use Vercel deployment/build logs and function error/response metrics. Review Gemini quota usage in Google AI Studio. Investigate elevated 429/502 rates. Do not log request bodies or note contents. Health monitoring is not configured automatically; choose an uptime service for the deployed homepage and inspect API failure rates separately.

## Rollback

In Vercel Deployments, select the previous verified production deployment and promote it. Verify the homepage and one generation afterward. Environment-variable changes may require their own correction and redeployment; rollback does not necessarily restore external secrets, quota, or provider configuration. For a code fix, revert the offending Git commit and redeploy through the connected branch.

Release owner: Vansh Singh
Sign-off date: pending production checks

Gemini key has been saved as a Production Secret in Vercel; deployment must be refreshed after shared storage is configured. Upstash agreement/resource creation remains pending user action after automatic approval review blocked those actions. No paid service was created. Initial deployment ID: V1fM8RLebEBHNV83cT8PUDPDSJK5. Initial commit: 761c52f.
