export const SAMPLE_NOTES = `Website launch sync — October 14
Attendees: Maya, Alex, Sam
We agreed to launch the new website on October 28, as long as accessibility testing passes.
Maya will finish the homepage copy by October 18.
Alex will run the accessibility audit by October 21 and share the findings.
Sam will prepare the launch email by October 23.
Decision: use the existing email platform instead of migrating before launch.
We still need to confirm who will monitor support on launch day.
The analytics dashboard is out of scope for this release.`;
export const SAMPLE_BRIEF = {
  title: "Website launch sync",
  summary:
    "The team aligned on an October 28 website launch, conditional on passing accessibility testing. Copy, an accessibility audit, and launch communications have assigned owners. The analytics dashboard will follow in a later release.",
  decisions: [
    "Target October 28 for launch, provided accessibility testing passes.",
    "Keep the existing email platform for launch.",
    "Exclude the analytics dashboard from this release.",
  ],
  actions: [
    { task: "Finish the homepage copy", owner: "Maya", due: "October 18" },
    {
      task: "Run the accessibility audit and share findings",
      owner: "Alex",
      due: "October 21",
    },
    { task: "Prepare the launch email", owner: "Sam", due: "October 23" },
  ],
  questions: ["Who will monitor support on launch day?"],
};
export function validateBrief(value) {
  const text = (s, max = 3000) =>
    typeof s === "string" && s.trim().length > 0 && s.length <= max;
  if (
    !value ||
    !text(value.title, 160) ||
    !text(value.summary) ||
    !["decisions", "questions"].every(
      (k) =>
        Array.isArray(value[k]) &&
        value[k].length <= 30 &&
        value[k].every((s) => text(s, 1000)),
    ) ||
    !Array.isArray(value.actions) ||
    value.actions.length > 30 ||
    !value.actions.every(
      (a) => a && text(a.task, 1000) && text(a.owner, 120) && text(a.due, 120),
    )
  )
    throw new Error(
      "The AI returned an incomplete brief. Your notes are safe; please try again.",
    );
  return {
    title: value.title,
    summary: value.summary,
    decisions: value.decisions,
    actions: value.actions.map(({ task, owner, due }) => ({
      task,
      owner,
      due,
    })),
    questions: value.questions,
  };
}
export function toMarkdown(brief, completed = []) {
  return `# ${brief.title}\n\n## Summary\n${brief.summary}\n\n## Decisions\n${brief.decisions.map((x) => `- ${x}`).join("\n") || "- None recorded"}\n\n## Action items\n${brief.actions.map((a, i) => `- [${completed.includes(i) ? "x" : " "}] ${a.task} — ${a.owner}; due: ${a.due}`).join("\n") || "- None recorded"}\n\n## Open questions\n${brief.questions.map((x) => `- ${x}`).join("\n") || "- None recorded"}\n`;
}
