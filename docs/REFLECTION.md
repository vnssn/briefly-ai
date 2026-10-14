# Reflection — Briefly

## Hardest part

The hardest part was getting a reliable live AI response. Gemini kept returning 503 and permission errors, so I switched to Groq and added Arcjet protection on top of the existing shared Redis quota. Even after the provider change, I had to test the real endpoint, verify the structured output validated correctly, and confirm the production deployment used the right secrets. Making the app fail safely when quota or the provider is unavailable took more work than the initial API call.

## What I'd do differently

Next time, I'd test the API and deployment setup earlier, before spending as much time on the interface. This would help me find model compatibility, environment-variable, and quota issues sooner.

## What I learned

I learned that building an AI app is more than calling an API and showing the response. Validation, error handling, rate limiting, and testing are just as important. The project has 47 passing tests, but that doesn't replace checking whether the live AI feature actually works. I also learned that provider limits and per-visitor protection are part of shipping a real app, not optional extras.
