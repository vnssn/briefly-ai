import { writeFile } from "node:fs/promises";
import { SAMPLE_NOTES, validateBrief } from "./src/brief.js";
const results = await Promise.all(
  [0, 1].map(async (i) => {
    const start = Date.now();
    const response = await fetch(
      "https://briefly-ai-pink.vercel.app/api/brief",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: SAMPLE_NOTES }),
        signal: AbortSignal.timeout(35000),
      },
    );
    const body = await response.json();
    if (response.ok) validateBrief(body.brief);
    return {
      request: i + 1,
      status: response.status,
      retryAfter: response.headers.get("retry-after"),
      elapsedMs: Date.now() - start,
      body,
    };
  }),
);
await writeFile(
  "docs/production-api-verification.json",
  JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      url: "https://briefly-ai-pink.vercel.app/api/brief",
      model: "gemini-3.1-flash-lite",
      results,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    results.map(({ body, ...rest }) => ({
      ...rest,
      error: body.error,
      title: body.brief?.title,
      actions: body.brief?.actions.length,
    })),
  ),
);

if (
  !results.some((result) => result.status === 200) ||
  !results.some((result) => result.status === 429)
) {
  process.exitCode = 1;
}
