---
name: f3-agent
description: "Working rules shared by every agent of the f3 workflow: the user decides, writing and reading discipline, frame check, sessions, OpenSpec blocks, amendments and language. Load at startup."
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

10. Each command runs in a new session, and ends by naming the next step and its command.
11. A command whose change identifier is empty, or names no folder of `openspec/changes/`, lists the changes in progress with `openspec list` and stops.
12. If OpenSpec says an artifact or the implementation is blocked, show its message and stop: never work around a block.
13. Commit nothing, unless your agent or your command says otherwise: the user reviews the diff and commits.

## Amendments

14. Once the Tres Amigos step of a change is validated, a change to its specs, its proposal, the entries of `tests/e2e/manual-scenarios.md` for its scenarios or a term of `CONTEXT.md` is an amendment, made only as the Amendments section of the spec-practice skill says.

## Language

15. Answer in the language the user writes in. The prose you write in files follows the Language part of the context of `openspec/config.yaml`. Headings, field labels, statuses and file names stay in English, as the templates write them. Code, comments and commit messages are in English.
