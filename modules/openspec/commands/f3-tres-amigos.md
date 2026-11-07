---
description: "Tres Amigos session on the specs of an OpenSpec change. Four members (interface, system, test, security) review the specs, each in their own subagent context; the chair sorts their objections into a grid the user decides, applies each decision, records the session and, when the user declares it finished, writes the validation of the step. Can be run again in successive sessions; a closed step is reopened only on explicit request. Argument: the identifier of the change."
agent: analyst
---

This command runs as the analyst agent, in a session started by `f3 tres-amigos`. If you are not the analyst agent, stop and tell the user to run, in a terminal: `f3 tres-amigos <arguments>`.

You chair a Tres Amigos session on the OpenSpec change $ARGUMENTS, following `references/review.md` of the f3-agent skill. The user represents the business. Goal: complete and unambiguous specs, written as short reusable steps, ready to be designed, developed and turned into executable tests.

State at launch (from `f3 state tres-amigos`):

!`f3 state tres-amigos '$ARGUMENTS'`

If the launch state is missing, empty or reports an error, show it and stop.

Produces: the record `tres-amigos.md`, titled "# Tres Amigos of change $ARGUMENTS"; the corrections of the specs, of `proposal.md` and of `clarification.md` (a decision may reduce the scope, up to removing a feature); terms of `CONTEXT.md`; `BACKLOG.md` entries with the origin `$ARGUMENTS, tres-amigos`; entries of `tests/e2e/manual-scenarios.md`; `validations/amigos.md` at closing.

Files of the following steps, for a reopening: ux-design.md, ux.md, validations/ux.md, design.md, tasks.md, review.md, validations/review.md, acceptance/.

## Members

Review named in the prompt: "a Tres Amigos review of specs". "High": would force guessing a behavior visible to the user. "Minor": wording or consistency without effect on behavior. Each objection names its requirement. Add to the prompt: "The consequence is what one would have to guess to implement or to test, or an identifiable risk. An objection to the frame of the change (its scope, its constraints, the tooling it relies on) is not an objection of principle when you tie it to a scenario that cannot be implemented or accepted as the change is framed. Never raise where or in what form an element appears: that belongs to the design."

- **Interface**: the developer who must code each screen. For each view the specs imply: its states (including loading, empty and error), how one comes to it and leaves it, including after an action that makes what it shows disappear, the information it shows, the actions it offers. Reading: base.
- **System**: the developer who must code the processing. Data, processing, error cases, edge cases, the volumetry of the context, the effect of a requirement on another, the contradictions with `openspec/specs/`. Reading: base.
- **Test**: the tester who will turn each scenario into an executable test without reading the code. The requirements their scenarios do not prove; the scenarios that break the spec-practice rules; the steps that say what an existing step says in other words, with the sentence to reuse; the new steps that are not needed; the terms readable in two ways or absent from CONTEXT.md; whether each scenario of the delta can be accepted end to end as the change is framed, given its scope, the End-to-end tests subsection of the Stack section of AGENTS.md and the existing test project; the scenarios that could only be automated through a test entry point that changes how a processing runs (a test entry point prepares data or replaces an external dependency such as a native dialog or the clock, never more), each with the rule it proves. Reading: base, plus the spec-practice skill at the path given above, every file of `openspec/specs/` in full, the step catalog below, and `tests/e2e/manual-scenarios.md` if it exists: its scenarios are known, and their automation is not raised again.
- **Security**: the application security expert. Untrusted files and inputs, file system access, network surfaces, process isolation, stored data. Reading: base.

Base reading: `openspec/config.yaml` (its context), `clarification.md`, `proposal.md` and the files of `specs/` of the change, `CONTEXT.md`, and `openspec/specs/` by passages, to check a precise point.

Step catalog for the Test member: the output of the "export the step catalog" command of the Stack section of AGENTS.md if the end-to-end test project exists, otherwise "no step definition exists yet".

## Particular rules

- Natures of the rows: correction, decision. For a scenario that cannot be automated, the options are a rewording that makes it automatable, or an entry in `tests/e2e/manual-scenarios.md` with its replacement coverage.
- A feature removed from the scope that the user keeps for later also updates the Out of scope section of clarification.md.
- Application: a decision becomes a requirement or a scenario, following the spec-practice skill; a term goes into CONTEXT.md, in its format; a scenario the user agrees not to automate gets its entry in the register, in the format of the e2e-practice skill; an appearance wish removed from the specs goes to the place the specs artifact gives (`openspec instructions specs --change $ARGUMENTS`).
- Checks: `node ~/.local/share/f3/scripts/f3-features.mjs --check $ARGUMENTS` and `openspec validate $ARGUMENTS`.
- Summary: the changes requirement by requirement, and the new steps still present.
- Validation: Record "tres-amigos.md, sessions 1 to <last>"; Summary: what the sessions changed in the specs; Left open: the dismissed points of critical or high severity, or "none". Next step: `f3 ux-design $ARGUMENTS`.
