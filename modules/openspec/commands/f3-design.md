---
description: "Writes the technical design (design.md) and the tasks (tasks.md) of an OpenSpec change with the architect agent, through the OpenSpec continue workflow. On the light track, checks the traceability itself and closes the design review as not-applicable. Can be run again: it resumes from the first missing artifact. Argument: the identifier of the change."
argument-hint: "<change-id>"
agent: architect
---

This command runs as the architect agent, in a session started by `f3 design`. If you are not the architect agent, stop and tell the user to run, in a terminal: `f3 design <arguments>`.

Write the technical design and the tasks of the OpenSpec change $ARGUMENTS.

State at launch (from `f3 state design`):

!`f3 state design '$ARGUMENTS'`

If the launch state is missing, empty or reports an error, show it and stop.

A note from the user at the end of the launch state refines the request without replacing the workflow: it lifts no precondition and skips no step.

Produces: design.md, tasks.md, entries of `arch/decisions.md`, amendments; on the light track, `validations/review.md` as not-applicable.

1. If `validations/ux.md` does not exist in the change, stop: the interface design step must first be closed with `f3 ux-design $ARGUMENTS`.
2. Load the skill openspec-continue-change and follow it until design.md and tasks.md both exist, applying the instructions of each artifact. If they already exist and the Calibration section of clarification.md says the change was escalated to the full track, they are drafts written before the Tres Amigos and interface design steps: revise them with the user against the current specs and ux.md, following the same instructions, before going on.
3. If writing the design shows that a spec of the change is missing, ambiguous or contradicts another, propose an amendment before writing the part of the design that depends on it.
4. On the light track (the Track line of the launch state), before writing a decision in `arch/decisions.md`, or as soon as the design creates or modifies an attack surface: C2 or C3 of the f3-agent skill is true, apply its escalation. If the user moves the change to the full track, stop there: the next step is `f3 tres-amigos $ARGUMENTS`.
5. Present design.md, then tasks.md, and apply the user's corrections. Run `openspec validate $ARGUMENTS` and fix every error.
6. On the light track, check the traceability yourself, without subagent, and correct the tasks with the user's agreement: each scenario added or modified by the change is cited on the "Delivered scenarios:" line of exactly one group; no task serves no scenario, except those of the first group and of the Verification group; the test entry points of the Test strategy have their tasks; no task writes a file of `tests/e2e/`. Then write `validations/review.md` following `openspec instructions review --change $ARGUMENTS`: Decision "not-applicable: light track, see Calibration in clarification.md"; Record "none"; Summary: the groups of tasks and the scenarios they deliver, in one or two sentences; Left open: "none".
7. End with the entries added to `arch/decisions.md` and the amendments made. Next step: `f3 design-review $ARGUMENTS` on the full track, `f3 dev $ARGUMENTS` on the light track.
