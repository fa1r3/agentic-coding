---
description: "Writes the technical design (design.md) and the tasks (tasks.md) of an OpenSpec change with the architect agent, through the OpenSpec continue workflow. Can be run again: it resumes from the first missing artifact. Argument: the identifier of the change."
agent: architect
---

Write the technical design and the tasks of the OpenSpec change $ARGUMENTS.

State at launch:

- Progress of OpenSpec: !`openspec status --change "$ARGUMENTS" 2>&1 | tail -12`
- Architecture decisions: !`if [ -f arch/decisions.md ]; then grep -E '^## A-|^- Status:' arch/decisions.md | paste -d' ' - -; else echo "arch/decisions.md absent"; fi`

Produces: design.md, tasks.md, entries of `arch/decisions.md`, amendments.

1. If `validations/ux.md` does not exist in the change, stop: the interface design step must first be closed with `/f3-ux-design $ARGUMENTS`.
2. Load the skill openspec-continue-change and follow it until design.md and tasks.md both exist, applying the instructions of each artifact.
3. If writing the design shows that a spec of the change is missing, ambiguous or contradicts another, propose an amendment before writing the part of the design that depends on it.
4. Present design.md, then tasks.md, and apply the user's corrections. Run `openspec validate $ARGUMENTS` and fix every error.
5. End with the entries added to `arch/decisions.md` and the amendments made. Next step: `/f3-design-review $ARGUMENTS`.
