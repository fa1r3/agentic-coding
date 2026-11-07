---
description: "Frames a project with the f3 standards, through a short interview conducted one question at a time: product context, stack decision, code rules, vocabulary. Writes AGENTS.md, openspec/config.yaml, CONTEXT.md, arch/decisions.md, BACKLOG.md and the Claude Code files of the project (CLAUDE.md, .mcp.json, .claude/settings.json). Three modes, chosen from the state of the repository: creation, adoption of an existing project, update of a framed project. Runs only on a repository without uncommitted changes."
agent: architect
---

This command runs as the architect agent, in a session started by `f3 init`. If you are not the architect agent, stop and tell the user to run, in a terminal: `f3 init`.

You frame this project with the f3 standards. Load the f3-standards skill, and read each of its references when you write the file it describes.

State at launch (from `f3 state init`):

!`f3 state init`

Produces: `AGENTS.md`, `openspec/config.yaml`, `CONTEXT.md`, `arch/decisions.md`, `BACKLOG.md`, the Claude Code files of the project: `CLAUDE.md`, `.mcp.json`, `.claude/settings.json`.

## Preconditions

If one fails, stop and say what to do.

- A Git repository without uncommitted changes: every file this command writes must be comparable and revertible.
- OpenSpec installed and the schema f3 found; otherwise, run `install.sh` of the toolkit.
- If `openspec/` exists, the project has the OpenSpec skills `openspec-continue-change`, `openspec-apply-change` and `openspec-archive-change` in `.claude/skills/`. If it has none, run `openspec init --tools claude`: on an initialized project, it only adds the files of Claude Code. The first belongs to an optional profile: select a profile that includes it with `openspec config profile`, then run `openspec update`.

## Mode

State it in one sentence.

- **Creation**: none of AGENTS.md, CONTEXT.md and openspec/config.yaml exists, or only empty files.
- **Adoption**: at least one exists, without the f3 marker. Read what exists first (AGENTS.md, config.yaml, CONTEXT.md, CLAUDE.md, .mcp.json, the README files of the modules, `openspec/specs/` by passages) and draw from it a first answer to each question: the interview covers only what is missing or contradictory.
- **Update**: AGENTS.md and config.yaml carry the f3 marker. Ask which themes to review; without an explicit answer, stop. Handle only those themes, then go to the summary.

## Interview

"I don't know" keeps your recommendation and notes the point in the To be clarified part of the context. Stay at the framing level: a detail of features, screens or data is noted for the backlog, and you come back to the theme. Themes, in this order, with at most this number of questions:

1. Product, 3: what it does and for whom, the problem it solves, what it will never do.
2. Users, 2: profiles, technical level, situation of use.
3. Expected behavior, 2: the main functions, as behavior.
4. Volumetry, 2: the order of magnitude of the main data (tens, thousands, millions), the size of the heaviest items.
5. Platform and constraints, 2: operating systems, offline operation, interface language, legal constraints.
6. Security and data, 2: sensitivity of the data, network exposure.
7. Design, 1: the design tool and its skill, or none.
8. Language, 1: the language of the prose of the artifacts.
9. Vocabulary, 1: five to ten business terms and actions, which you propose from the previous answers.
10. Stack: the phase below.
11. Adoption only: the existing code rules, below.

### Stack phase

It decides the structural choices only: the form of the applications (desktop, web, API, command line), the language and its runtime, the module tool that can enforce the dependency direction, the interface framework if any, the end-to-end test runner, and how an agent observes the running application. Storage, libraries and the rest are decided change by change, in design.md.

In creation mode:

1. **Constraints.** Draw the technical constraints from the validated themes (platform, offline operation, volumetry and heaviest items, data sensitivity, design tool, users), plus the maintenance profile: who maintains the product, with what help. The user corrects the summary.
2. **Research.** For each choice, check on the web the latest version, maintenance activity, announced end of life and license of the candidates.
3. **Options.** Two or three really different combinations. For each: how it answers each constraint; the architecture of AGENTS.md (a tool that enforces the dependency direction); the workflow (how directly a design screen translates into the interface, end-to-end driving including native dialogs, an agent observing the running application); durability (maturity, licenses, lock-in).
4. **Decision.** The user chooses or combines. Write it at once in `arch/decisions.md` as A-001: decision, constraints, options set aside and why, consequences.
5. **Stack section.** Write the Stack section of AGENTS.md, each subsection as the template defines it, after validation.
6. **First change.** No code exists yet: add to `BACKLOG.md` "Set up the repository according to the Stack section", with the verification command and the end-to-end test project. It goes through the whole workflow.

In adoption mode, the choice is not made again. Describe the stack in place from the code and the existing AGENTS.md, and write one entry of `arch/decisions.md` per structural choice, asking its reason in one question ("reason not documented" if none). Write the Stack section from what exists, for validation. The choice is reopened only on the user's request.

### Existing code rules, in adoption mode

Take each rule of the existing AGENTS.md and find the principle it expresses: already stated by the invariant part (dropped, citing the invariant rule); following from a technology (Stack section); only meaningful for this product (project-specific rule, with its reason); no longer holding (dropped, with your reason). The user decides rule by rule.

## Summary and writing

1. Present the full summary: the `context` as written, the terms of CONTEXT.md, the Stack section, the entries of arch/decisions.md and, in adoption, the project-specific rules. Wait for the validation.
2. Write each file following its reference:
   - `AGENTS.md`: the invariant part unchanged, the Stack section, the project-specific rules if any;
   - `openspec/config.yaml`: the template with the validated `context`. If `openspec/` does not exist, first run `openspec init --tools claude`, then replace the config.yaml it created;
   - `CONTEXT.md`: the validated terms; in adoption, the existing terms kept and completed, in the format of the template;
   - `arch/decisions.md` and `BACKLOG.md`: created with their content at creation, then the entries of this framing;
   - `CLAUDE.md`, `.mcp.json` and `.claude/settings.json`: what the f3-standards skill gives for them, without touching any other content.
3. Run `openspec schema which f3` and `openspec validate --all`, and fix the errors in the files you wrote. In adoption, also run `node ~/.local/share/f3/scripts/f3-features.mjs --check` and fix nothing it reports; read a sample of the existing scenarios against the spec-practice rules. If the check fails or the scenarios break the rules, propose a backlog entry for a change that rewrites them without changing behavior.
4. Show `git diff --stat`, then state: the points To be clarified; that each developer, at the first f3 session in the project, trusts the folder and approves the servers of `.mcp.json`; if a design tool is kept and `ux/brief.md` does not exist, the commands to run once, each in a new session: `f3 ux-calibrate`, `f3 ux-direction`, `f3 ux-tokens`; in adoption, the gaps between the code and the invariant part, each proposed as a backlog entry, without fixing them; and that the next change starts with `f3 propose`.
