---
description: "Implements an OpenSpec change with the developer agent, through the OpenSpec apply workflow. Can be run again: each run resumes the unchecked tasks, acceptance and conformity fixes first. Argument: the identifier of the change."
agent: developer
---

Implement the OpenSpec change $ARGUMENTS.

State at launch (from `f3 state dev`):

!`f3 state dev '$ARGUMENTS'`

If the launch state is missing, empty or reports an error, show it and stop.

1. If files are uncommitted while you resume work, check whether they belong to a task in progress of this change; otherwise, stop and ask the user what to do with them before writing anything.
2. Load the skill openspec-apply-change and follow it for the change $ARGUMENTS, with the method of your agent.
3. End following your end-of-session instruction.
