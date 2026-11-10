# agentic-toolkit

Agents, commands and skills for Claude Code or OpenCode, an OpenSpec schema, and a small `f3` command, that run the f3 workflow: spec-driven development where an agent analyzes and proposes, and the user decides.

The workflow is the same under both tools. The guide ([GUIDE.md](GUIDE.md)) says, tool by tool, where its controls differ (section 12).

## Principles

- Each piece of information lives in one place: the product in the `context` of `openspec/config.yaml`, the code rules in `AGENTS.md`, the vocabulary in `CONTEXT.md`, the workflow in the schema, the agents and the commands.
- What is specific to a tool is isolated in one place (for example the skill ux-penpot, next to the tool-independent ux-practice; or `tools/<tool>/`, for Claude Code and OpenCode).
- Specs describe behavior; the design decides presentation; technical choices go into the design.md of a change and, when they commit the following changes, into `arch/decisions.md`.
- A validated decision is written at once; an interrupted command resumes from what is written.
- A review is made by independent viewpoints, each in its own subagent context.
- Scenarios are written as short reusable steps and converted literally into Gherkin feature files: the end-to-end tests execute the words of the specs.

## Modules

- `openspec`: the schema `f3`, the agents `analyst`, `architect`, `developer` and `tester`, the commands of the workflow, the skills `f3-agent` (shared working rules, the light and full tracks of a change, and review sessions), `f3-standards`, `spec-practice` and `e2e-practice`, and the script `f3-features.mjs`.
- `ux`: the agent `ux`, the design commands, and the skills `ux-practice` and `ux-penpot`.

A module is a folder of `modules/`. It may contain `agents/`, `commands/`, `skills/` (each skill is a folder containing a `SKILL.md`), `scripts/` and `schemas/`. Everything in it is common to both tools. What differs between them (the frontmatter of the agents and commands, the names of the built-in subagents and tools) is in `tools/claude/` and `tools/opencode/`: the agents and commands are rendered for each tool into `build/<tool>`, a folder ignored by Git; the skills, scripts and schemas are not rendered.

The `f3` command (`cli/f3.mjs`, Node.js only; tests in `cli/test/`, run with `node --test cli/test/*.test.mjs`) launches the steps, renders the agents and commands, checks the state of a command at launch, and, under Claude Code, guards the agents (see the guide, section 4.1).

## Prerequisites

- Claude Code, OpenCode, or both.
- Node.js 20.19.0 or later, for OpenSpec, the render and the `f3` command; and `~/.local/bin` in your `PATH`.
- OpenSpec, with a profile that installs the skills `openspec-continue-change`, `openspec-apply-change` and `openspec-archive-change` (`openspec config profile`, then `openspec update` in the project).
- In each project, an end-to-end test runner that reads Gherkin feature files, chosen during `f3 init` (for example Playwright with playwright-bdd).

`install.sh` stops when Node.js is missing or too old. A tool you install for, or OpenSpec, missing from the `PATH` only gives a warning, as does `~/.local/bin` missing from the `PATH`: they can be installed afterwards.

### Checked versions

Claude Code 2.1.319, OpenCode 2.2.5, OpenSpec 1.16.0. After updating one of them, run `node --test cli/test/*.test.mjs`: it renders both tools and compares the result with the reference of each tool (`tests/ref/<tool>.diff`).

## Installation

```bash
./install.sh                         # asks: 1) Claude Code  2) OpenCode  3) both
./install.sh claude|opencode|all     # the same, without the question
./install.sh --remove                # removes every link created by this repository, for both tools
./install.sh --render <dir>          # renders each tool into <dir>/<tool>/, installs nothing
```

For each tool chosen, `install.sh` renders its agents and commands into `build/<tool>`, then links them, and the skills, to `~/.claude/` (Claude Code) or `~/.config/opencode/` (OpenCode). For both, it links the scripts to `~/.local/share/f3/scripts/`, the schemas to `~/.local/share/openspec/schemas/`, and the `f3` command to `~/.local/bin/f3`. It then removes the dead links it left behind. If a render fails, it touches no link.

A change in the repository is active without reinstalling: `f3` renders the agents and commands again at each launch, and the other links point into the repository. Run `install.sh` again after adding an element (an agent, a command, a skill, a script). `--render` is used to compare the render with the references.

The first time you work in a project with Claude Code, it asks you to trust its folder, then to approve the MCP servers of its `.mcp.json`.

## Choosing the tool of a project

Each user chooses the tool of each project. The choice is kept in `.f3/local` (`tool=claude` or `tool=opencode`), at the root of the project, not versioned: `f3 init` adds it to `.gitignore`. Two developers of the same project can each work with their own tool.

- The first `f3 <step>` in a project writes `.f3/local`: with the only tool f3 is installed for, or, when both are installed, with the tool you choose at a question in the terminal.
- `f3 tool` shows the tool of the project; `f3 tool claude` or `f3 tool opencode` changes it.

The tool you choose has no effect on the versioned files of the project: `f3 init` writes the files of each tool of the project (see the guide, section 5.1).

## Workflow

Each step is launched from a terminal, in the project, with `f3 <step> [<arguments>] [-- <prompt>]`: it starts a new session of the tool of the project as the agent of the step, running the command `/f3-<step>`. The arguments are identifiers (a change, a mode); everything after the first `--` is a prompt for the agent, taken as is (see the guide, section 4.2). `f3` alone lists the steps.

| # | Step | Command | Agent | Produces | Control |
|---|---|---|---|---|---|
| 0 | Framing, once per project | `f3 init` | architect | AGENTS.md, config.yaml, CONTEXT.md, arch/decisions.md, BACKLOG.md, the files of each tool of the project (CLAUDE.md, .mcp.json, .claude/settings.json; opencode.json), the `.f3/local` line of .gitignore | Marker in AGENTS.md |
| 0' | Design, once per project | `f3 ux-calibrate`, `f3 ux-direction`, `f3 ux-tokens` | ux | cookbook, brief, tokens | Permissions of the ux agent |
| 1 | Clarification, calibration, proposal and specs | `f3 propose` | analyst | clarification.md with the track of the change, proposal.md, specs, backlog entries; on the light track, the amigos and ux validations as not-applicable | Schema; step form checked by f3-features; calibration: instruction |
| 2 | Tres Amigos | `f3 tres-amigos <change>` | analyst + 4 exploration subagents | tres-amigos.md, amended specs | Schema: needs the specs |
| 3 | Interface design | `f3 ux-design <change>` | ux | ux.md, ux-design.md, design screens | Schema: needs the Tres Amigos validation |
| 4 | Technical design and tasks | `f3 design <change>` | architect | design.md, tasks.md, arch/decisions.md entries; on the light track, the traceability check and the review validation as not-applicable | Schema: needs the ux validation |
| 5 | Design review | `f3 design-review <change>` | architect + 3 exploration subagents | review.md, amended design and tasks, amendments of the specs | Schema: needs the tasks |
| 6 | Development | `f3 dev <change>` | developer | code, unit and integration tests | Apply needs the review; permissions: the developer does not edit end-to-end tests or specs |
| 7 | User check, then conformity | `f3 ux-design <change> conformity` | ux + general subagent | conformity deviations, decided by the user | Instruction |
| 8 | Acceptance | `f3 acceptance <change>` | tester (+ itself as fidelity reviewer) | the end-to-end test project at the first acceptance, feature files, step definitions, page objects, pass report, tickets | Permissions: the tester does not read the code, and calls no subagent but itself (what they cover differs by tool: guide, section 12); missing steps detected by the test runner |
| | Loop 6 to 8 until green | | | | |
| 9 | Archiving | `f3 archive <change>` | architect | archive, ux/decisions.md, merge | Instruction: last acceptance green and no application change since its commit |

This table is the **full track**. `f3 propose` calibrates each change with seven criteria (interface, structural decision, security, capabilities, size, consistency, testability; guide, section 7), and you decide its track. A change with no true criterion can take the **light track**: steps 1, 4, 6, 8 and 9, the user's check only when a scenario goes through a view, and no conformity. The steps it skips are closed by not-applicable validations, so the schema keeps its order. An agent that finds a criterion true later proposes to move the change to the full track, while no task is checked.

"Permissions" means the control is a mechanism: Claude Code applies them through the guard hook of each agent (`f3 guard`), OpenCode natively. "Instruction" means the control is a rule given to the agent: OpenSpec cannot block archiving, and no permission covers files written through the shell.

## Commands run on your machine

Each command inserts into its prompt, when you launch it, the output of a single shell command run in the project root: `f3 state <command>`. It reads the project: `git status`, `git branch`, `git rev-parse`, `git check-ignore`, the framing files and the folders of the change, `openspec --version`, `openspec schema which`, `openspec status`, and `f3-features --check`, which reads the specs and writes nothing. It writes only in the toolkit and the temporary directory: it renders the agents and commands again into `build/`, and removes the private launch file that `f3 <step>` wrote for the session. The argument of the command is passed to it between single quotes, and checked before it builds any path: pass only a change identifier.

Under Claude Code, it is the only shell command a command may run without asking. Under OpenCode, a command typed in a session runs its injection without any permission check, and an apostrophe in the argument can run another command: launch the steps with `f3 <step>`, which only passes identifiers (see the guide, section 15.4).

The script `f3-features.mjs` uses only the built-in modules of Node.js. It reads `openspec/specs/` and the delta specs of one change, and writes the feature files of `tests/e2e/features/`. It runs no other command.
