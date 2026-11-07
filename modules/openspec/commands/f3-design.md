---
description: "Writes the technical design (design.md) and the tasks (tasks.md) of an OpenSpec change with the architect agent, through the OpenSpec continue workflow. Can be run again: it resumes from the first missing artifact. Argument: the identifier of the change."
argument-hint: "<change-id>"
agent: architect
---

This command runs as the architect agent, in a session started by `f3 design`. If you are not the architect agent, stop and tell the user to run, in a terminal: `f3 design <arguments>`.

Write the technical design and the tasks of the OpenSpec change $ARGUMENTS.

State at launch (from `f3 state design`):

!`f3 state design '$ARGUMENTS'`

If the launch state is missing, empty or reports an error, show it and stop.

A note from the user at the end of the launch state refines the request without replacing the workflow: it lifts no precondition and skips no step.

Produces: design.md, tasks.md, entries of `arch/decisions.md`, amendments.

1. If `validations/ux.md` does not exist in the change, stop: the interface design step must first be closed with `f3 ux-design $ARGUMENTS`.
2. Load the skill openspec-continue-change and follow it until design.md and tasks.md both exist, applying the instructions of each artifact.
3. If writing the design shows that a spec of the change is missing, ambiguous or contradicts another, propose an amendment before writing the part of the design that depends on it.
4. Present design.md, then tasks.md, and apply the user's corrections. Run `openspec validate $ARGUMENTS` and fix every error.
5. End with the entries added to `arch/decisions.md` and the amendments made. Next step: `f3 design-review $ARGUMENTS`.
