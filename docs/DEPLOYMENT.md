# Deployment checklist and operations

## Local verification

- [ ] Clean install succeeds with committed lockfile.
- [x] Tests pass and coverage is recorded.
- [x] Production build succeeds.
- [x] Browser critical path passes with mocked provider; sample/export/task flow tested.
- [x] Mobile Lighthouse evidence saved.
- [x] axe audit passes; actual improvements documented.

## Release verification

- [ ] GitHub repository created and source pushed without secrets.
- [ ] Vercel project connected to the correct repository.
- [ ] Server environment key configured, with provider quota/spending controls.
- [ ] Deploy succeeds; URL recorded.
- [ ] Real Gemini generation tested on deployed URL.
- [ ] Sample, task toggling, export, and keyboard interactions tested in production.
- [ ] Failure states checked without disclosing provider secrets.
- [ ] Public endpoint abuse controls reviewed/configured before broad sharing.

Unchecked items are not signed off.

## Monitoring

Use Vercel deployment/build logs and function error/response metrics. Review Gemini quota usage in Google AI Studio. Investigate elevated 429/502 rates. Do not log request bodies or note contents. Health monitoring is not configured automatically; choose an uptime service for the deployed homepage and inspect API failure rates separately.

## Rollback

In Vercel Deployments, select the previous verified production deployment and promote it. Verify the homepage and one generation afterward. Environment-variable changes may require their own correction and redeployment; rollback does not necessarily restore external secrets, quota, or provider configuration. For a code fix, revert the offending Git commit and redeploy through the connected branch.

Release owner: Vansh Singh
Sign-off date: pending production checks

