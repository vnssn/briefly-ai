# Reflection — Briefly

Draft for Vansh Singh to review and personalize before submission. This describes the engineering work and observed results; it should reflect your own understanding when submitted.

## Hardest part and why

The hardest engineering problem was making the AI boundary dependable. A successful HTTP request or valid JSON is not enough: a meeting brief also needs the expected fields, clear treatment of missing information, and a usable failure state. Briefly combines a constrained extraction prompt, structured generation, runtime validation, and review reminders. Deployment added another challenge: an in-memory counter cannot protect a shared Gemini quota across separate Vercel instances. An atomic Redis reservation now limits provider attempts before they happen. A production concurrency check confirmed that one request could proceed while the other received a 429 response.

## What to do differently next time

I would verify model availability and account limits with a small end-to-end request before investing in interface polish. The original model was unavailable to new users, and the replacement later returned 503 high-demand errors. I would also define the response contract, failure states, and deployment environment names earlier. The native Vercel integration supplied KV_REST_API variables, which required an explicit compatibility change. For a larger product, authenticated per-user allowances would improve fairness over this capstone's deliberately strict shared budget.

## A lesson from the project

Rate limiting involves more than disabling a button. Google quotas are shared at project level, browser state can be reset, and serverless processes do not share ordinary memory. The shared store and fail-closed behavior address those gaps. Another lesson is that passing automated tests does not establish live provider availability: 39 tests, a production build, and real Redis enforcement passed, while successful Gemini generation still remains unverified because the provider returned 503. Keeping that distinction visible in the evidence is part of shipping responsibly.
