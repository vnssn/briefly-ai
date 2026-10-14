# Reflection — review and personalize before submission

These are project discussion prompts and factual implementation notes, not claims about Vansh's personal experience.

## Hardest part and why

The main engineering challenge is making AI output dependable enough for a structured interface. Valid JSON can still contain missing fields or unsupported facts. The implementation combines a constrained prompt, a response schema, runtime validation, and an explicit review reminder. Add your own account of which part you found hardest and how you understood or changed it.

## What to do differently next time

Consider designing failure states and the response contract before styling the interface. For a public product, plan quota protection and rate limiting early. Explain which trade-off you would personally change after reviewing the code and running the app.

## Something surprising you learned

Try a note with missing owners or ambiguous deadlines. Observe how the app distinguishes missing information from explicit assignments. Describe one actual result that surprised you; do not submit an invented learning claim.
