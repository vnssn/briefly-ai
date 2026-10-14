# Briefly

Turn messy meeting notes into a summary, confirmed decisions, action items, and open questions. Built as a FlyRank frontend AI capstone with React, Vite, Gemini, and a Vercel server function.

[Live app](https://briefly-ai-pink.vercel.app) · [Repository](https://github.com/vnssn/briefly-ai). Release status: app, Gemini configuration, and shared Redis quota protection are deployed. Production quota enforcement, task tracking, and export are verified. Gemini is currently returning HTTP 503 high demand; successful live generation remains unverified.

## Project brief

Briefly helps students and small teams who leave meetings with scattered notes and unclear responsibilities. It extracts a structured brief from those notes, separates decisions from unresolved questions, and makes follow-through easier with task checkboxes and Markdown export. This idea keeps AI focused on a practical extraction problem with output that users can verify against their original notes.

## Run locally

Requirements: Node.js 22.19 or later (Node.js 24 recommended), npm, and a Gemini API key for live generation.

```sh
npm install
```

Copy `.env.example` to `.env.local`, set `GEMINI_API_KEY`, then:

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
- `api/brief.js`: POST boundary, input limits, Gemini call, timeout, structured output schema, safe error mapping.
- `vite.config.js`: development API adapter and test configuration.
- `vercel.json`: security headers and server-function timeout.
- `tests/`: component, contract, API, and user-flow tests.

The browser sends notes to the same-origin server endpoint. The server holds the API key and sends the notes to Gemini. Generated output is validated at both boundaries and rendered as text by React. No meeting-note database, history, or browser storage is used. Production quota protection stores only attempt timestamps, input-size estimates, and cooldowns in Redis. Notes and generated briefs disappear on refresh; export anything you want to retain. Google processes notes under its applicable Gemini service terms. Do not use confidential meeting notes without appropriate consent.

## AI integration

Default model: `gemini-3.1-flash-lite`; override with `GEMINI_MODEL` if needed for your account. Gemini receives a schema requiring a title, summary, decisions, actions with task/owner/due, and questions. The system instruction treats notes as data, prohibits invented commitments, and specifies `Unassigned` / `Not specified` for missing fields. Low temperature reduces variation. Structured generation is followed by length/type/shape validation because JSON syntax alone does not establish correctness. Users must review extracted facts; grounding is instructed, not guaranteed.

Reference: [Google Gemini structured output documentation](https://ai.google.dev/gemini-api/docs/structured-output).

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
3. Add `GEMINI_API_KEY` and optionally `GEMINI_MODEL` as server environment variables. Do not prefix the key with `VITE_`.
4. Configure the required shared Redis quota store using `docs/RATE_LIMITS.md`. Defaults are 1 provider attempt/minute, 10/rolling day, and a conservative input budget. All deployments using this Gemini project must share the same store and namespace.
5. Deploy, then verify `/api/brief` with real generation, keyboard use, a mobile viewport, export, and provider failure handling.
6. Record the URL and deployment ID in `docs/SUBMISSION.md` and finish `docs/DEPLOYMENT.md`.

## Testing and audits

`npm test` runs Vitest with a real coverage report in `coverage/`. `npm run build` builds production assets. `npm run test:e2e` runs browser tests and axe scans using an installed Chrome at the Windows path in `playwright.config.js`; change that path on other systems. Actual audit evidence is in `docs/VALIDATION.md`. Do not interpret sample-mode checks or mocked API tests as proof of live Gemini connectivity.

## Known limitations and future work

- Shared atomic quota protection is deployed and verified; a Redis outage blocks AI calls safely. See `docs/RATE_LIMITS.md`. There is no user authentication; configure Vercel Firewall controls before broad sharing to protect function/Redis traffic.
- No durable note storage, collaboration, uploads, diarization, or calendar integrations.
- Due dates retain the language of the notes; relative dates are not converted to calendar dates.
- AI can omit, misattribute, or invent facts. Review before sharing.
- Input limited to 15,000 characters; large transcripts need a future chunking strategy.
- Tests mock Gemini for determinism; live smoke testing is a separate release requirement.

## Submission materials

See `docs/SUBMISSION.md`, `docs/DEPLOYMENT.md`, and `docs/REFLECTION.md`. Verification status and remaining work must be reported honestly.
