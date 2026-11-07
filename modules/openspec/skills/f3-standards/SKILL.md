---
name: f3-standards
description: "f3 standards for a project: the framing files (AGENTS.md, openspec/config.yaml, CONTEXT.md, BACKLOG.md, arch/decisions.md, the files of each tool of the project: CLAUDE.md, .mcp.json and .claude/settings.json for Claude Code, opencode.json for OpenCode) and the views register (ux/views.md), their role and their templates. Load before creating or modifying one of these files, in particular during f3 init."
---

# f3 standards

## Three layers, each piece of information in one place

- **The product**: the `context` of `openspec/config.yaml`. What the product does, for whom, its volumes, its constraints. OpenSpec injects it into every artifact. Template: `references/config-yaml.md`.
- **The code rules**: `AGENTS.md`, loaded by every agent in every session. Its invariant part (architecture style and standards) is identical in every project; its Stack section is written for the project during f3 init. Template: `references/agents-md.md`.
- **The business vocabulary**: `CONTEXT.md`, loaded with AGENTS.md. Template: `references/context-md.md`.

The workflow is in none of these files: it is carried by the OpenSpec schema `f3` (order of the steps and rules of the artifacts), the f3 commands (`f3 <step>`), the agents `analyst`, `architect`, `developer`, `tester` and `ux`, and their skills.

## Auxiliary files

- `arch/decisions.md`: the register of structural decisions and their reasons (stack, storage, decisions that commit the following changes). AGENTS.md says what the code must do; this register says why, and which options were set aside. It is read when writing a design.md and during the design review. Template: `references/arch-decisions.md`.
- `BACKLOG.md`: the only place for ideas that are not planned yet. Template: `references/backlog-md.md`.
- `ux/views.md`: the register of the views present in the code, with their unit of code, their displays (route and kind) and the screens of the design tool seen through each. It gives each view its name for the agents that read neither the code nor the design tool. Written by the developer, in the commit that creates, renames or removes a view. Template: `references/views-md.md`.
- The files of each tool of the project: `CLAUDE.md`, `.mcp.json` and `.claude/settings.json` for Claude Code, `opencode.json` for OpenCode. Only what the workflow needs: models, permission modes, providers and other user preferences belong to the user's settings. Rules below.

## Files of each tool of the project

f3 init writes the files of each tool of the project: each tool f3 is installed for, and each tool the project already has files of; the launch state of f3 init lists them. They are versioned with the project, so that each member of a team works with the tool of their choice. The tool of each user is in `.f3/local`, which is not versioned: f3 init adds `.f3/local` to `.gitignore`. When a file exists, f3 init adds or updates its own content and touches nothing else.

The MCP servers are decided once, in the Stack section of AGENTS.md: the server that lets an agent observe the running application (subsection Observing the running application), and the server of the design tool, if the context names one. `.mcp.json` and `opencode.json` are two translations of this decision and name the same servers: `playwright` when it is Playwright, `penpot` for Penpot. The agents refuse the tools of a server by these names. An access token is never written in clear.

### Claude Code

- `CLAUDE.md`: the lines `@AGENTS.md` and `@CONTEXT.md`, so that every session loads the code rules and the vocabulary.
- `.mcp.json`: under `mcpServers`, the servers of the Stack section, by the names above. An environment variable is written `${VAR}`.
- `.claude/settings.json`: the hook that makes each f3 command run as its agent, under `hooks`:

  ~~~json
  "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "f3 guard-prompt" }] }]
  ~~~

Models, permission modes and other user preferences belong to the user's settings (`~/.claude/settings.json`) or to `.claude/settings.local.json`. Claude Code asks each developer, at the first session in the project, to trust the folder and to approve the servers of `.mcp.json`.

### OpenCode

The project `opencode.json` contains only:
- `instructions`: `["CONTEXT.md"]`, so that every agent loads the vocabulary;
- under `mcp`, the servers of the Stack section, by the names above.

f3 init adds or updates these keys without touching any other key. Providers, models and other user preferences belong to the global configuration (`~/.config/opencode/opencode.json`): OpenCode merges both files, and the project file only wins on conflicting keys. Keys that are user preferences (`provider`, `model`, `small_model`, agent settings such as `reasoningEffort`) are proposed for a move to the global configuration; they are moved only with the user's agreement. OpenCode reads its configuration at startup: after a change, OpenCode must be restarted.

## Languages

- The toolkit, its templates and every stable keyword are in English: headings, field labels, statuses and file names. Commands read these keywords to resume work: they never change from one project to another.
- The prose of the artifacts (specs, clarification, design, ux files, backlog, decisions, reports) is written in the language set in the Language part of the context.
- Agents answer in the language the user writes in.

## Markers

- `AGENTS.md` written by these standards contains, on its third line, the comment `<!-- f3 standards: written by f3 init. To change it, run f3 init again. -->`. Its former form, `<!-- f3 standards: written by /f3-init. To change it, run /f3-init again. -->`, is also an f3 marker; f3 init rewrites it in the current form.
- `openspec/config.yaml` written by these standards starts with `schema: f3`.
