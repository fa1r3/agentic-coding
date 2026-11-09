---
description: "Archives an OpenSpec change after a green acceptance: checks that nothing in the application changed since the tested commit, merges the cross-cutting design decisions into ux/decisions.md, archives the change through the OpenSpec archive workflow, checks the merged specs by regenerating the feature files, closes the backlog entry and merges the branch. Argument: the identifier of the change."
argument-hint: "<change-id>"
agent: architect
---

This command runs as the architect agent, in a session started by `f3 archive`. If you are not the architect agent, stop and tell the user to run, in a terminal: `f3 archive <arguments>`.

Archive the OpenSpec change $ARGUMENTS. This command commits and merges.

State at launch (from `f3 state archive`):

!`f3 state archive '$ARGUMENTS'`

If the launch state is missing, empty or reports an error, show it and stop.

A note from the user at the end of the launch state refines the request without replacing the workflow: it lifts no precondition and skips no step.

1. **Preconditions.** No uncommitted file; otherwise ask the user to commit or set them aside. The last acceptance report concludes "green". `git diff --name-only <its tested commit> HEAD` lists only files of `tests/e2e/`, of `openspec/`, `BACKLOG.md` and `.gitignore`, which do not change the application; a change of `.gitignore` is named in the summary. Otherwise the application changed since the acceptance: say which files changed and stop, without offering to go on: `f3 acceptance $ARGUMENTS` must run again.
2. **Design decisions.** If the change has a ux.md, load the ux-practice skill and add each decision of its Proposed cross-cutting decisions section to `ux/decisions.md`, in the format of the skill. A decision that contradicts `ux/brief.md` or an active entry of the register is reported, not added.
3. **Archiving.** Load the skill openspec-archive-change and follow it for the change, syncing its delta specs into `openspec/specs/`.
4. **Check of the merged specs.** Run `node ~/.local/share/f3/scripts/f3-features.mjs` without argument, then `git status --porcelain tests/e2e/features/`. The regenerated feature files must be identical to the tested ones: if one differs, stop and show the difference, because the archived specs are not the tested ones.
5. **Backlog.** An entry with the status `in-progress $ARGUMENTS` becomes `done $ARGUMENTS`.
6. **Git.** Commit the archiving as the last commit of the branch, `docs: archive $ARGUMENTS`, then merge the branch into the main branch with `git merge --no-ff`.
7. **End.** Sum up what was archived and merged. Next change: `f3 propose`, which offers the backlog.
