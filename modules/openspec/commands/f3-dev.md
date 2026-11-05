---
description: "Implements an OpenSpec change with the developer agent, through the OpenSpec apply workflow. Can be run again: each run resumes the unchecked tasks, acceptance and conformity fixes first. Argument: the identifier of the change."
agent: developer
---

Implement the OpenSpec change $ARGUMENTS.

State at launch:

- Current branch: !`git branch --show-current`
- Uncommitted files: !`git status --porcelain | head -30`
- Unchecked tasks: !`grep -c '^\s*- \[ \]' openspec/changes/$ARGUMENTS/tasks.md 2>/dev/null`
- Fix groups: !`grep -E '^## .*(Acceptance fixes|Conformity fixes)' openspec/changes/$ARGUMENTS/tasks.md 2>/dev/null`

1. If files are uncommitted while you resume work, check whether they belong to a task in progress of this change; otherwise, stop and ask the user what to do with them before writing anything.
2. Load the skill openspec-apply-change and follow it for the change $ARGUMENTS, with the method of your agent.
3. End following your end-of-session instruction.
