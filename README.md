# Briefly

Turn messy meeting notes into a summary, confirmed decisions, action items, and open questions. Built as a FlyRank frontend AI capstone with React, Vite, Groq, Arcjet, and a Vercel server function.

[Live app](https://briefly-ai-pink.vercel.app) · [Repository](https://github.com/vnssn/briefly-ai). Release status: app, Groq + Arcjet configuration, shared Redis quota protection, and live AI generation verified on the deployed URL.

## Project brief

Briefly helps students and small teams who leave meetings with scattered notes and unclear responsibilities. It extracts a structured brief from those notes, separates decisions from unresolved questions, and makes follow-through easier with task checkboxes and Markdown export. This idea keeps AI focused on a practical extraction problem with output that users can verify against their original notes.

## Run locally

Requirements: Node.js 22.19 or later (Node.js 24 recommended), npm, a Groq API key, and an Arcjet site key for live generation and request protection.

```sh
npm install
```

Copy `.env.example` to `.env.local`, set `GROQ_API_KEY` and `ARCJET_KEY`, then:

```sh
npm run dev
```

Open the URL printed by Vite. The dev server includes `/api/brief`; running a static file server alone cannot generate briefs. Without a key, the clearly labeled sample works and live generation shows a setup message. Sample mode is a prepared example, not a simulated live AI response.

```sh
npm test
npm run build
```

## Architecture

- `src/App.jsx`: notes editor, brief view, task progress, clipboard, export, and request states.
- `src/brief.js`: sample fixture, runtime response validation, Markdown serialization.
- `api/brief.js`: POST boundary, Arcjet protection, input limits, Groq call, timeout, structured output schema, safe error mapping.
- `vite.config.js`: development API adapter and test configuration.
- `vercel.json`: security headers and server-function timeout.
- `tests/`: component, contract, API, and user-flow tests.

The browser sends notes to the same-origin server endpoint. The server holds the API key and sends the notes to Groq. Generated output is validated at both boundaries and rendered as text by React. No meeting-note database, history, or browser storage is used. Production quota protection stores only attempt timestamps, input-size estimates, and cooldowns in Redis. Notes and generated briefs disappear on refresh; export anything you want to retain. Groq processes notes under its applicable service terms. Do not use confidential meeting notes without appropriate consent.

## AI integration

Default model: `openai/gpt-oss-120b`; override with `GROQ_MODEL` if needed for your account. Groq receives a JSON schema requiring a title, summary, decisions, actions with task/owner/due, and questions. `strict: true` enables constrained decoding, so the response is guaranteed to match the schema. The system instruction treats notes as data, prohibits invented commitments, and specifies `Unassigned` / `Not specified` for missing fields. Low temperature reduces variation. Structured generation is followed by length/type/shape validation because JSON syntax alone does not establish correctness. Users must review extracted facts; grounding is instructed, not guaranteed.

References:

- [Groq structured outputs documentation](https://console.groq.com/docs/structured-outputs)
- [Groq rate limits](https://console.groq.com/docs/rate-limits)

## Request protection

`@arcjet/node` runs in the API handler before the shared Redis quota:

- Shield: blocks common attack patterns.
- Bot detection: monitored in DRY_RUN so Lighthouse and Playwright audits are never blocked.
- Per-IP rate limit: 3 requests per 60-second window.
- Arcjet failures are fail-open; the shared Redis quota remains the hard global gate.

## Safe failure behavior

- Short or oversized notes are rejected before a paid provider request.
- Missing configuration returns an honest setup message.
- Quota errors, provider failure, invalid responses, and timeouts show recoverable errors.
- Failed requests preserve notes and the previous brief. Previous output is never presented as a newly generated result.
- Concurrent submissions from the same tab are blocked while a request is running.
- The sample is opt-in and visibly labeled; failures never silently substitute sample data.
- API responses use `Cache-Control: no-store`; provider details and secrets are not returned.

## Deployment to Vercel

1. Push this project to a GitHub repository. Never commit `.env.local`.
2. Import the repository in Vercel. Select Vite; build command `npm run build`, output `dist`.
3. Add these server environment variables. Do not prefix keys with `VITE_`.
   - `GROQ_API_KEY`
   - `ARCJET_KEY`
   - `AI_REQUESTS_PER_MINUTE=10`
   - `AI_REQUESTS_PER_DAY=100`
   - `AI_INPUT_BUDGET_PER_MINUTE=8000`
4. Configure the required shared Redis quota store using `docs/RATE_LIMITS.md`. All deployments using this Groq project must share the same store and namespace.
5. Deploy, then verify `/api/brief` with real generation, keyboard use, a mobile viewport, export, and provider failure handling.
6. Record the URL and deployment ID in `docs/SUBMISSION.md` and finish `docs/DEPLOYMENT.md`.

## Testing and audits

`npm test` runs Vitest with a real coverage report in `coverage/`. `npm run build` builds production assets. `npm run test:e2e` runs browser tests and axe scans using an installed Chrome at the Windows path in `playwright.config.js`; change that path on other systems. Actual audit evidence is in `docs/VALIDATION.md`. Do not interpret sample-mode checks or mocked API tests as proof of live AI connectivity.

## Known limitations and future work

- Shared atomic quota protection is deployed and verified; a Redis outage blocks AI calls safely. See `docs/RATE_LIMITS.md`. There is no user authentication; configure Vercel Firewall controls before broad sharing to protect function/Redis traffic.
- No durable note storage, collaboration, uploads, diarization, or calendar integrations.
- Due dates retain the language of the notes; relative dates are not converted to calendar dates.
- AI can omit, misattribute, or invent facts. Review before sharing.
- Input limited to 15,000 characters; large transcripts need a future chunking strategy.
- Tests mock Groq for determinism; live smoke testing is a separate release requirement.

## Submission materials

See `docs/SUBMISSION.md`, `docs/DEPLOYMENT.md`, and `docs/REFLECTION.md`. Verification status and remaining work must be reported honestly.
