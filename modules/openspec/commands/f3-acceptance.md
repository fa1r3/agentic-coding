---
description: "Acceptance of an OpenSpec change by the tester, in a new session, after the developer and the user's check: regenerates the feature files from the specs with the delta of the change, writes or adapts the step definitions and page objects, has them reviewed by an independent subagent, runs the whole suite, and submits each failure with its facts and a proposal (adapt the test, ticket for the developer, amendment of the spec, backlog). The user decides. Each run is a new pass. Argument: the identifier of the change."
argument-hint: "<change-id>"
agent: tester
---

This command runs as the tester agent, in a session started by `f3 acceptance`. If you are not the tester agent, stop and tell the user to run, in a terminal: `f3 acceptance <arguments>`.

Acceptance of the change "$ARGUMENTS", following the e2e-practice skill. This command commits.

State at launch (from `f3 state acceptance`):

!`f3 state acceptance '$ARGUMENTS'`

If the launch state is missing, empty or reports an error, show it and stop.

A note from the user at the end of the launch state refines the request without replacing the workflow: it lifts no precondition and skips no step.

Produces: the files of `tests/e2e/`, the report `acceptance/pass-<NN>.md`, "Acceptance fixes" groups in tasks.md, `BACKLOG.md` entries with the origin `$ARGUMENTS, acceptance`, entries of `tests/e2e/manual-scenarios.md`, amendments.

1. **Preconditions.** `validations/review.md` exists (approved, or not-applicable on the light track) and no task is unchecked; otherwise `f3 dev $ARGUMENTS` comes first. No file outside `tests/e2e/` is uncommitted: the application under test must match a commit.
2. **Feature files.** Run `node ~/.local/share/f3/scripts/f3-features.mjs $ARGUMENTS`. An error in the specs is corrected by an amendment, or in a Tres Amigos session if the user prefers (on the light track, always an amendment: tasks are checked, so the change can no longer escalate); an error in `tests/e2e/manual-scenarios.md` is corrected there with the user's agreement; then run it again. Keep its list of the delta, and look at `git diff --stat tests/e2e/features/` to see which scenarios changed.
3. **Tests of the delta.** Read the Test strategy section of design.md and the Impact section of ux.md, if any. Run the "generate the tests" command of the Stack section: it lists the steps without definition. During a migration where such scenarios are skipped, list the steps of the delta without definition yourself, against the output of "export the step catalog". Then write the missing step definitions, adapt those of the requirements the delta modifies, write or adapt the page objects of the views the scenarios go through (impacted views first), discovering the interface on the running application, and delete the step definitions no scenario uses any more. Write none for a manual scenario.
4. **Fidelity review.** Convene the `tester` agent as a subagent through {{SUBAGENT_TOOL}} (subagent type `tester`, the only subagent you may call): it reviews in a fresh context, under the same reading rules as you. Prompt, `<files>` being the step definitions and page objects created or changed in this pass: "You are consulted as a subagent: you review end-to-end test code. Apply the e2e-practice skill, and read the feature files of tests/e2e/features/, the views register ux/views.md, and these files: <files>. Modify no file. Check each step definition against the rules of Writing step definitions, and each page object against the rules of Writing page objects. Answer with one line per finding: the file, the step sentence or the method, the finding in one sentence, and the correction. If there is no finding, answer 'No finding.'." Correct each finding and note it for the report. If the `tester` subagent is not available or the call fails, stop and report it.
5. **Run.** Run the whole suite. Correct each automation defect (locator, wait, test data badly prepared) without ever changing the expectation, three attempts at most per scenario, then run the scenarios concerned again.
6. **Failures and decisions.** For each scenario that still fails, establish the facts and propose an outcome following the classification of the skill. Present all the failures in one grid; the user decides row by row. Apply each decision at once:
   - **adapt the test**, as the classification allows, then run the scenario again;
   - **ticket**: at the end of tasks.md, a group "## <next number>. Acceptance fixes, pass <NN>", one task per ticket: `- [ ] <group>.<n> Fix <capability> › <requirement> › <scenario>: <facts observed>. Verify with this end-to-end scenario.` A missing test entry point is a ticket;
   - **amendment of the spec**, when the scenario cannot be automated as written, its data are inconsistent, or a rewording that keeps what it proves is more pragmatic; then run f3-features and the scenario again. If the amended scenario asks of the application what it does not do yet, it is also a ticket;
   - **backlog** entry;
   - **manual**, only under the condition of the skill: the register entry with the replacement coverage the user validated, the step definitions no other scenario uses deleted, f3-features run again. Replacement tests that do not exist are also a ticket.
7. **Report.** Write the report of the pass in the format of the skill.
8. **Commits.** Following the Git section of AGENTS.md: the files of `tests/e2e/` with the type `test`, then the report, tasks.md, BACKLOG.md and the other files changed by an amendment with the type `docs`.
9. **End.** Sum up the conclusion. Green: `f3 archive $ARGUMENTS`. Red with tickets: `f3 dev $ARGUMENTS`, then `f3 acceptance $ARGUMENTS` again; if a ticket touches a journey the user already checked, say they should check it again after the fix. On the light track, there is no conformity step: never name `f3 ux-design`.
