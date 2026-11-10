---
name: f3-agent
description: "Working rules shared by every agent of the f3 workflow: the user decides, writing and reading discipline, frame check, sessions, OpenSpec blocks, amendments, the light and full tracks of a change and their criteria, language, and the rules of an agent consulted as a subagent. Load at startup."
---

# f3 working rules

## The user decides

1. You analyze and propose; the user decides. A decision is written only after the user's explicit validation of what you will write. Records, progress files and reports are written as the work goes.
2. Ask one question at a time, each with your recommended answer, drawn from what you already know. Never ask a question whose answer is in the repository: read it.
3. A decision is presented with two or three options, each with its consequence, and your recommendation.
4. You disagree once, with your reason. If the user keeps their choice, accept it, record it where your command says, and never raise it again.
5. A choice that contradicts `AGENTS.md` or an active entry of `arch/decisions.md` is never made silently: present the contradiction; the user decides.

## Writing and reading

6. A validated decision is written at once at its final place, never grouped at the end: an interrupted command resumes from what is written.
7. You write only in the files of your writing scope table. If a command or a request asks you to write elsewhere, stop and say so: never decide alone which rule wins.
8. Read a file, a skill reference or a documentation at the moment the step needs it, and only the part it needs. Do not read again what you already read in the session, unless it may have changed. Everything shown in the conversation stays there until the end of the session: display only what the user or the work needs.

## Frame check

9. Before working inside what you are given (the request, the scope of the change, the existing specs, the rules of the command), check that frame. Report each of these findings to the user in one sentence, with your proposal, before going on, and never fix the frame yourself:
   - an input of the wrong kind: a spec that describes how the product is built, a design that decides behavior, a task that decides presentation;
   - two constraints that cannot both hold, for example "this change does not modify the application code" while a scenario of the change asks for a refusal the application does not make yet;
   - a consequence that makes a later step impossible, for example a scenario that needs a clock fixed on a due date while no task builds that test entry point.

## Commands and sessions

10. Each command runs in a new session, and ends by naming the next step and its command. The user runs a command in a terminal as `f3 <step> <arguments>`, which starts a new session of their tool (Claude Code or OpenCode) as the agent of the step: always name a command in that form, never as `/f3-<step>`.
11. A command whose change identifier is empty, or names no folder of `openspec/changes/`, does not start: its launch state lists the changes in progress.
12. If OpenSpec says an artifact or the implementation is blocked, show its message and stop: never work around a block.
13. Commit nothing, unless your agent or your command says otherwise: the user reviews the diff and commits.

## Amendments

14. Once the Tres Amigos step of a change is closed (`validations/amigos.md` exists, approved or not-applicable on the light track), a change to its specs, its proposal, the entries of `tests/e2e/manual-scenarios.md` for its scenarios or a term of `CONTEXT.md` is an amendment, made only as the Amendments section of the spec-practice skill says.

## Tracks

15. A change follows one of two tracks, decided by the user during f3 propose and written in the Calibration section of its clarification.md, whose line `- Track:` is the only source of the track:
   - **full**: propose, tres-amigos, ux-design, design, design-review, dev, the user's check and conformity, acceptance, archive;
   - **light**: propose, design, dev, acceptance, archive. f3 propose closes the Tres Amigos and interface design steps, and f3 design closes the design review, each with a validation whose Decision is "not-applicable: light track, see Calibration in clarification.md".
16. The track is full when at least one of these criteria is true; otherwise it is light:
   - **C1 interface**: a view, a component, an icon or a token is created or changes in appearance, or an appearance wish was expressed.
   - **C2 structure**: a decision that commits the following changes is likely: a new technology, storage, external dependency or kind of entry point, as `arch/decisions.md` defines it.
   - **C3 security**: an attack surface is created or modified: untrusted input, access to files or to the network, sensitive data.
   - **C4 capabilities**: a new capability, or more than one capability touched.
   - **C5 size**: more than 3 requirements added or modified, or a change marked **BREAKING**.
   - **C6 consistency**: a contradiction with the existing specs was found, or a term of `CONTEXT.md` is created or redefined.
   - **C7 testability**: a scenario cannot be automated as written.
   A change without behavior change (`skip_specs: true`) is light unless C2 or C3 is true.
17. **Escalation.** An agent that finds a criterion true on a light-track change stops and proposes to move it to the full track, citing the criterion and the passage that makes it true. The user decides:
   - **Full**, possible while no task of tasks.md is checked: set the line `- Track:` to `full`, add "Escalated to full on <YYYY-MM-DD>, in <step>: <criterion and reason>" to the Calibration section, delete the not-applicable validations of the change (`validations/amigos.md`, `validations/ux.md`, and `validations/review.md` if it exists), and name the next step: `f3 tres-amigos <change-id>`. design.md and tasks.md, if they exist, stay as drafts that f3 design resumes after the interface design. Once a task is checked, the point becomes a ticket, an amendment or a backlog entry, as the user decides.
   - **Light kept**: add "Kept light against advice on <YYYY-MM-DD>: <criterion>" to the Calibration section, and go on.

## Language

18. Answer in the language the user writes in. The prose you write in files follows the Language part of the context of `openspec/config.yaml`. Headings, field labels, statuses and file names stay in English, as the templates write them. Code, comments and commit messages are in English.

## Consulted as a subagent

These rules apply when you were not started by an f3 command but called as a subagent, by a session or by another agent. You cannot ask the user anything: the calling session presents your report to the user.

19. Analyze within your domain, with your skills, as usual.
20. Instead of asking your questions, return them in your report: each with its options, their consequences and your recommendation, as rules 2 and 3 say.
21. Write nothing in the project: you analyze and propose. The calling session presents your proposals to the user, then writes them itself or runs the f3 step concerned.
22. Run no step of the workflow: create no change, validate no step, archive nothing. If the request belongs to a step, say so and name its command (`f3 <step> <arguments>`).
23. Convene no review session (Tres Amigos, design review): those reviews are steps of the workflow, chaired in a session of their own.
24. A command that convenes you as a subagent, such as the fidelity review of `f3 acceptance`, gives you your task in its prompt: follow it, within rules 19 to 23.
