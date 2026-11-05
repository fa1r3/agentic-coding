# agentic-toolkit

OpenCode agents, commands and skills, and an OpenSpec schema, that run the f3 workflow: spec-driven development where an agent analyzes and proposes, and the user decides.

## Principles

- Each piece of information lives in one place: the product in the `context` of `openspec/config.yaml`, the code rules in `AGENTS.md`, the vocabulary in `CONTEXT.md`, the workflow in the schema, the agents and the commands.
- What is specific to a tool is isolated in one place (for example the skill ux-penpot, next to the tool-independent ux-practice).
- Specs describe behavior; the design decides presentation; technical choices go into the design.md of a change and, when they commit the following changes, into `arch/decisions.md`.
- A validated decision is written at once; an interrupted command resumes from what is written.
- A review is made by independent viewpoints, each in its own subagent context.
- Scenarios are written as short reusable steps and converted literally into Gherkin feature files: the end-to-end tests execute the words of the specs.

## Modules

- `openspec`: the schema `f3`, the agents `analyst`, `architect`, `developer` and `tester`, the commands of the workflow, the skills `f3-agent` (shared working rules and review sessions), `f3-standards`, `spec-practice` and `e2e-practice`, and the script `f3-features.mjs`.
- `ux`: the agent `ux`, the design commands, and the skills `ux-practice` and `ux-penpot`.

A module is a folder of `modules/`. It may contain `agents/`, `commands/`, `skills/` (each skill is a folder containing a `SKILL.md`), `scripts/` and `schemas/`.

## Prerequisites

- OpenCode.
- OpenSpec, which requires Node.js 20.19.0 or later, with a profile that installs the skills `openspec-continue-change`, `openspec-apply-change` and `openspec-archive-change` (`openspec config profile`, then `openspec update` in the project).
- In each project, an end-to-end test runner that reads Gherkin feature files, chosen during `/f3-init` (for example Playwright with playwright-bdd).

## Installation

`./install.sh` links each element of the modules: agents, commands, skills and scripts to `~/.config/opencode/`, schemas to `~/.local/share/openspec/schemas/`. A change in the repository is active without reinstalling; run the script again after adding an element, then restart OpenCode. It also removes the dead links it left behind.

`./install.sh --remove` removes every link created by this repository.

## Workflow

| # | Step | Command | Agent | Produces | Control |
|---|---|---|---|---|---|
| 0 | Framing, once per project | `/f3-init` | architect | AGENTS.md, config.yaml, CONTEXT.md, arch/decisions.md, BACKLOG.md, project opencode.json | Marker in AGENTS.md |
| 0' | Design, once per project | `/f3-ux-calibrate`, `/f3-ux-direction`, `/f3-ux-tokens` | ux | cookbook, brief, tokens | Permissions of the ux agent |
| 1 | Clarification, proposal and specs | `/f3-propose` | analyst | clarification.md, proposal.md, specs, backlog entries | Schema; step form checked by f3-features |
| 2 | Tres Amigos | `/f3-tres-amigos` | analyst + 4 explore | tres-amigos.md, amended specs | Schema: needs the specs |
| 3 | Interface design | `/f3-ux-design` | ux | ux.md, ux-design.md, design screens | Schema: needs the Tres Amigos validation |
| 4 | Technical design and tasks | `/f3-design` | architect | design.md, tasks.md, arch/decisions.md entries | Schema: needs the ux validation |
| 5 | Design review | `/f3-design-review` | architect + 3 explore | review.md, amended design and tasks, amendments of the specs | Schema: needs the tasks |
| 6 | Development | `/f3-dev` | developer | code, unit and integration tests | Apply needs the review; instruction: the developer does not touch end-to-end tests or specs |
| 7 | User check, then conformity | `/f3-ux-design <change> conformity` | ux + general | conformity deviations, decided by the user | Instruction |
| 8 | Acceptance | `/f3-acceptance` | tester + explore | feature files, step definitions, page objects, pass report, tickets | Instruction: the tester does not read the code; missing steps detected by the test runner |
| | Loop 6 to 8 until green | | | | |
| 9 | Archiving | `/f3-archive` | architect | archive, ux/decisions.md, merge | Instruction: last acceptance green and no application change since its commit |

"Instruction" means the control is a rule given to the agent, not a mechanism: OpenSpec cannot block archiving, and OpenCode edit permissions do not cover files written through the shell.

## Commands run on your machine

Some commands insert, into their prompt, the output of shell commands run in the project root when you launch them. All of them only read: `git status`, `git branch`, `git rev-parse`, `ls`, `grep`, `head`, `openspec --version`, `openspec schema which`, `openspec status`, and `node ~/.config/opencode/scripts/f3-features.mjs --check`, which reads the specs and writes nothing. The argument of a command is inserted into these shell commands: pass only a change identifier.

The script `f3-features.mjs` uses only the built-in modules of Node.js. It reads `openspec/specs/` and the delta specs of one change, and writes the feature files of `tests/e2e/features/`. It runs no other command.
