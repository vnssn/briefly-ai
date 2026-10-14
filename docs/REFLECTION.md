# Reflection — Briefly

## Hardest part

The hardest part was making the Gemini integration reliable. Calling the API was only one part of it. I also had to account for unexpected responses, API errors, and rate limits. The app uses validation and clear error messages, and it keeps the notes when a request fails. Shared rate limiting helps protect the API allowance across deployments. These protections were tested, but successful live Gemini generation has not been verified because the provider returned 503 errors.

## What I'd do differently

Next time, I'd test the API and deployment setup earlier, before spending as much time on the interface. This would help me find model compatibility, environment-variable, and quota issues sooner.

## What I learned

I learned that building an AI app is more than calling an API and showing the response. Validation, error handling, rate limiting, and testing are just as important. The project has 39 passing tests, but that doesn't replace checking whether the live AI feature actually works.
