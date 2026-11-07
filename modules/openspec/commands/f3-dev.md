---
description: "Implements an OpenSpec change with the developer agent, through the OpenSpec apply workflow. Can be run again: each run resumes the unchecked tasks, acceptance and conformity fixes first. Argument: the identifier of the change."
argument-hint: "<change-id>"
agent: developer
---

This command runs as the developer agent, in a session started by `f3 dev`. If you are not the developer agent, stop and tell the user to run, in a terminal: `f3 dev <arguments>`.

Implement the OpenSpec change $ARGUMENTS.

State at launch (from `f3 state dev`):

!`f3 state dev '$ARGUMENTS'`

If the launch state is missing, empty or reports an error, show it and stop.

1. If files are uncommitted while you resume work, check whether they belong to a task in progress of this change; otherwise, stop and ask the user what to do with them before writing anything.
2. Load the skill openspec-apply-change and follow it for the change $ARGUMENTS, with the method of your agent.
3. End following your end-of-session instruction.
