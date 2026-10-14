# Portfolio submission — Briefly

Status: app, repository, Groq + Arcjet configuration, shared quota protection, and live AI generation verified.

## Project brief

Briefly helps students and small teams turn scattered meeting notes into clear summaries, decisions, action items, and unresolved questions. Groq extracts structured information through strict schema-constrained JSON; users review the brief, track actions, and export Markdown. The idea addresses the gap between a meeting and knowing what to do next.

- Live application: https://briefly-ai-pink.vercel.app
- GitHub repository: https://github.com/vnssn/briefly-ai
- README: repository root
- Testing and audit evidence: `docs/VALIDATION.md`
- Deployment and rollback checklist: `docs/DEPLOYMENT.md`
- Reflection: `docs/REFLECTION.md`
- Rate-limit architecture: `docs/RATE_LIMITS.md`

## What was implemented

- React 19 + Vite 7 frontend with accessible, responsive UI.
- GroqCloud `openai/gpt-oss-120b` backend via OpenAI-compatible `chat/completions`.
- Strict structured outputs (`response_format: json_schema`, `strict: true`) plus runtime validation.
- Arcjet per-visitor protection (Shield, bot detection in DRY_RUN, per-IP rate limit).
- Shared Upstash Redis quota with atomic Lua reservation.
- 47 Vitest tests, 2 Playwright browser tests, axe accessibility scan, Lighthouse reports.
- Production deployment on Vercel with server-only secrets.

## Verified live behavior

- Local dev server: successful Groq generation through Arcjet + Redis limiter.
- Production URL: successful Groq generation returning HTTP 200.
- Production UI: displays **READY TO GO / AI GENERATED** badge after generation.
- Rate limiting: confirmed 429 responses with retry countdown, notes preserved.
- Structured output validated: title, summary, decisions, actions (owner + due), questions.

## Submission links

- Live app: https://briefly-ai-pink.vercel.app
- GitHub: https://github.com/vnssn/briefly-ai
