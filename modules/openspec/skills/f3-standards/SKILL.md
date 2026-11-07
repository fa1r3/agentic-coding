---
name: f3-standards
description: "f3 standards for a project: the framing files (AGENTS.md, openspec/config.yaml, CONTEXT.md, BACKLOG.md, arch/decisions.md, the project opencode.json) and the views register (ux/views.md), their role and their templates. Load before creating or modifying one of these files, in particular during f3 init."
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
- The project `opencode.json`: only the keys the workflow needs. Providers, models and other user preferences belong to the global configuration (`~/.config/opencode/opencode.json`): OpenCode merges both files, and the project file only wins on conflicting keys. Rules below.

## Project opencode.json

The project file contains only:
- `instructions`: `["CONTEXT.md"]`, so that every agent loads the vocabulary;
- under `mcp`, the server that lets an agent observe the running application, as decided in the Stack section of AGENTS.md (subsection Observing the running application);
- under `mcp`, the server of the design tool, if the context names one.

f3 init adds or updates these keys without touching any other key. Keys that are user preferences (`provider`, `model`, `small_model`, agent settings such as `reasoningEffort`) are proposed for a move to the global configuration; they are moved only with the user's agreement. OpenCode reads its configuration at startup: after a change, OpenCode must be restarted.

## Languages

- The toolkit, its templates and every stable keyword are in English: headings, field labels, statuses and file names. Commands read these keywords to resume work: they never change from one project to another.
- The prose of the artifacts (specs, clarification, design, ux files, backlog, decisions, reports) is written in the language set in the Language part of the context.
- Agents answer in the language the user writes in.

## Markers

- `AGENTS.md` written by these standards contains, on its third line, the comment `<!-- f3 standards: written by f3 init. To change it, run f3 init again. -->`.
- `openspec/config.yaml` written by these standards starts with `schema: f3`.
