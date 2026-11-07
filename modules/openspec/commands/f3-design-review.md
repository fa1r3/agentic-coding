---
description: "Design review of an OpenSpec change, before implementation. Three members (architect, technical security, product) review the technical design and the tasks, each in their own subagent context; the chair sorts their objections into a grid the user decides, corrects design.md and the tasks, amends the specs when the user validates it, records the session and, when the user declares it finished, writes the validation that unlocks implementation. Can be run again in successive sessions; a closed step is reopened only on explicit request. Argument: the identifier of the change."
agent: architect
---

This command runs as the architect agent, in a session started by `f3 design-review`. If you are not the architect agent, stop and tell the user to run, in a terminal: `f3 design-review <arguments>`.

You chair the design review of the OpenSpec change $ARGUMENTS, following `references/review.md` of the f3-agent skill. Goal: a design and tasks that deliver each scenario of the specs, comply with AGENTS.md and arch/decisions.md, and carry no identifiable security risk, before a line of code is written.

State at launch (from `f3 state design-review`):

!`f3 state design-review '$ARGUMENTS'`

If the launch state is missing, empty or reports an error, show it and stop.

If design.md or tasks.md is missing, stop: they are written with `f3 design $ARGUMENTS`.

Produces: the record `review.md`, titled "# Design review of change $ARGUMENTS"; the corrections of design.md and tasks.md; entries of `arch/decisions.md`; amendments; `BACKLOG.md` entries with the origin `$ARGUMENTS, design-review`; `validations/review.md` at closing.

Files of the following steps, for a reopening: checked tasks of tasks.md, the folder acceptance/.

## Members

Review named in the prompt: "a design review before implementation". "High": would force guessing or redoing a part of the work. Reading, for every member: AGENTS.md, arch/decisions.md, openspec/config.yaml (its context), and in openspec/changes/$ARGUMENTS/: proposal.md, the files of specs/, design.md, tasks.md, and ux.md if it exists; the existing code only by passages, to check a precise point. Add to the prompt: "The passage is one of design.md or of the tasks; the consequence is what one would have to guess or redo during implementation, a scenario that would not be delivered, or an identifiable risk. If the correction requires changing the specs, say so."

- **Architect**: compliance of the design and of the task split with AGENTS.md (invariant part and Stack section: structure, dependencies, naming, place of each element) and with the active entries of arch/decisions.md; a decision that commits the following changes and is not recorded; consistency with the existing code, by targeted reads; consequences of the volumetry of the context (pagination, background processing, concurrent access, memory); technical choices without justification.
- **Technical security**: the attack surfaces the design creates or modifies (local servers, file paths, external inputs, processes, new dependencies), input validation, isolation, secrets and logs, and the test entry points that must not be active outside test mode.
- **Product**: traceability. For each scenario added or modified, the group that delivers it end to end, cited on its "Delivered scenarios:" line, without omission or duplicate; tasks that serve no scenario; the views and components of the Impact section of ux.md with their exact names; each view or component task ending with "Screens:"; the test entry points of the Test strategy present in the tasks; no task that writes an end-to-end test, a feature file, a step definition or a page object.

## Particular rules

- Natures of the rows: correction, decision, specs. For a row of nature "specs", your recommendation is an amendment, with its proposed text; the user may prefer to bring it to a Tres Amigos session.
- A row "to bring to Tres Amigos" counts as pending when the session is resumed: present it again with its amendment, unless the user confirms that it goes to a Tres Amigos session.
- Application: in design.md, the tasks or arch/decisions.md, following `openspec instructions design --change $ARGUMENTS` and `openspec instructions tasks --change $ARGUMENTS`; a row of nature "specs" validated as an amendment follows the Amendments section of the spec-practice skill, then design.md and the tasks are updated with it; a row the user brings to Tres Amigos receives "to bring to Tres Amigos".
- Checks: `openspec validate $ARGUMENTS`, and `node ~/.local/share/f3/scripts/f3-features.mjs --check $ARGUMENTS` if an amendment was applied.
- Closing: if rows "to bring to Tres Amigos" remain, write no validation; say that `f3 tres-amigos $ARGUMENTS` must reopen the specs, then `f3 design $ARGUMENTS` redo the affected design.
- Validation: Record "review.md, sessions 1 to <last>"; Summary: what the review changed in the design and the tasks; Left open: the dismissed points of critical or high severity, and the rows brought to Tres Amigos, or "none". Next step: `f3 dev $ARGUMENTS`.
