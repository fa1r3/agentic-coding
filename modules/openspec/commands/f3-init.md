---
description: "Frames a project with the f3 standards, through a short interview conducted one question at a time: product context, stack decision, code rules, vocabulary. Writes AGENTS.md, openspec/config.yaml, CONTEXT.md, arch/decisions.md, BACKLOG.md and the files of each tool of the project (CLAUDE.md, .mcp.json and .claude/settings.json for Claude Code, the workflow keys of opencode.json for OpenCode). Three modes, chosen from the state of the repository: creation, adoption of an existing project, update of a framed project. Runs only on a repository without uncommitted changes."
agent: architect
---

This command runs as the architect agent, in a session started by `f3 init`. If you are not the architect agent, stop and tell the user to run, in a terminal: `f3 init`.

You frame this project with the f3 standards. Load the f3-standards skill, and read each of its references when you write the file it describes.

State at launch (from `f3 state init`):

!`f3 state init`

If the launch state is missing, empty or reports an error, show it and stop.

A note from the user at the end of the launch state refines the request without replacing the workflow: it lifts no precondition and skips no step.

Produces: `AGENTS.md` (its Adopted practices section through `f3 practices apply`), the practice skills `.claude/skills/practice-*` (through `f3 practices apply`), `openspec/config.yaml`, `CONTEXT.md`, `arch/decisions.md`, `BACKLOG.md`; the files of each tool of the project, as the launch state lists them: for Claude Code `CLAUDE.md`, `.mcp.json`, `.claude/settings.json`, for OpenCode the workflow keys of the project `opencode.json`; the line `.f3/local` of `.gitignore`.

## Preconditions

If one fails, stop and say what to do.

- A Git repository without uncommitted changes: every file this command writes must be comparable and revertible. `.f3/local` does not count: it is never committed, and this command adds it to `.gitignore`.
- OpenSpec installed and the schema f3 found; otherwise, run `install.sh` of the toolkit.
- If `openspec/` exists, each skills folder of the project that has OpenSpec skills (`.claude/skills/`, `.opencode/skills/`) has `openspec-continue-change`, `openspec-apply-change` and `openspec-archive-change`. The first belongs to an optional profile: select a profile that includes it with `openspec config profile`, run `openspec update`, then commit. For a tool of the project that has none: in Update mode, the theme Tools adds them; otherwise, run `openspec init --tools <tool>`: on an initialized project, it only adds the files of that tool.

## Mode

State it in one sentence.

- **Creation**: none of AGENTS.md, CONTEXT.md and openspec/config.yaml exists, or only empty files.
- **Adoption**: at least one exists, without the f3 marker. Read what exists first (AGENTS.md, config.yaml, CONTEXT.md, CLAUDE.md, .mcp.json, opencode.json, the README files of the modules, `openspec/specs/` by passages) and draw from it a first answer to each question: the interview covers only what is missing or contradictory.
- **Update**: AGENTS.md and config.yaml carry the f3 marker. Ask which themes to review; without an explicit answer, stop. Handle only those themes, then go to the summary. If the launch state reports a tool of the project that lacks files, `.f3/local` not ignored by Git, MCP servers that differ, or an AGENTS.md marker in its former form, propose the theme Tools first. The theme Tools writes the missing files of the tools of the project, runs `openspec init --tools <tool>` for a tool of the project that has no OpenSpec skills (on an initialized project, it only adds the files of that tool), aligns the MCP servers of their files on the Stack section, adds `.f3/local` to `.gitignore` and rewrites the AGENTS.md marker in its current form; it touches nothing else.

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
10. Project type: the phase below, in creation mode.
11. Stack: the phase below.
12. Practices: the phase below, in creation mode.
13. Adoption only: the existing code rules, below.

### Project type phase

In creation mode, once the themes Product to Security are validated. It decides what kind of system the product is; the Stack phase then decides with which technologies.

1. **Catalog.** The launch state lists the archetypes of the practices catalog. Read the entry of each one that could fit with `f3 practices show <id> <id>…`: when to choose it, when not to, its pitfalls. The catalog is outside the project: read it only through `f3 practices`. An archetype marked draft is not available: never propose it.
2. **Recommendation.** Recommend one archetype, with its reason drawn from the validated answers, and say which ones you set aside and why. One f3 project is one repository, linked to other projects only through versioned packages: if the product described is several systems released on their own (for example three services), say so, and propose to frame this one only. A product that fits no archetype is framed without one ("no archetype"): the following phases then run without the catalog, within the invariant part.
3. **Questions of the archetype.** Ask its `interview` questions, one at a time.
4. **Decision.** The user chooses. Write it at once in `arch/decisions.md` as A-001: the archetype with its version (`web-app@1.0.0`), or "no archetype"; the constraints; the archetypes set aside and why; as consequences, how the archetype applies the invariant part (its `invariant`) and what it changes for the workflow (its `workflow-impact`).

### Stack phase

It decides the structural choices only, within the project type of A-001 (in adoption mode, the form of the applications: desktop, web, API, command line): the language and its runtime, the module tool that can enforce the dependency direction, the interface framework if any, the end-to-end test runner, and how an agent observes the running application. Storage, libraries and the rest are decided change by change, in design.md.

In creation mode:

1. **Constraints.** Draw the technical constraints from the validated themes (platform, offline operation, volumetry and heaviest items, data sensitivity, design tool, users), plus the maintenance profile: who maintains the product, with what help. The user corrects the summary.
2. **Research.** For each choice, check on the web the latest version, maintenance activity, announced end of life and license of the candidates.
3. **Options.** Two or three really different combinations. For each: how it answers each constraint; the architecture of AGENTS.md (a tool that enforces the dependency direction); the workflow (how directly a design screen translates into the interface, end-to-end driving including native dialogs, an agent observing the running application); whether the language or its tooling imposes where unit and integration tests live, instead of the mirror tests folder of rule 13; durability (maturity, licenses, lock-in).
4. **Decision.** The user chooses or combines. Write it at once in `arch/decisions.md` as A-002 (A-001 in adoption mode): decision, constraints, options set aside and why, consequences.
5. **Stack section.** Write the Stack section of AGENTS.md, each subsection as the template defines it, after validation.
6. **First change.** No code exists yet: add to `BACKLOG.md` "Set up the repository according to the Stack section", with the verification command. It goes through the whole workflow. It creates neither the shared kernel nor a technical library: each is created by the change that first needs it (rule 8). The end-to-end test project is not part of it: the tester creates it at the first acceptance.

In adoption mode, the choice is not made again. Describe the stack in place from the code and the existing AGENTS.md, and write one entry of `arch/decisions.md` per structural choice, asking its reason in one question ("reason not documented" if none). Write the Stack section from what exists, for validation. The choice is reopened only on the user's request. If the unit and integration tests sit elsewhere than the mirror tests folder of rule 13 and the language imposes nothing, the Modules subsection states the mirror folder, and `BACKLOG.md` receives "Move the unit and integration tests into the mirror tests folder of each module". The same applies when the theme Stack is reviewed in update mode.

In adoption mode, and when the theme Stack is reviewed in update mode, classify with the user each existing module shared by several bounded contexts, or common to them without rule (rule 8 of the invariant part): shared kernel, technical library, or the bounded context that owns its content, which may split the module. The user decides module by module, with the answer to "who would decide a change of this type?" for a business type. Write the Stack section from this classification, the entries of `arch/decisions.md` for the types kept in the shared kernel, as for an addition, and add to `BACKLOG.md` "Move the shared code according to the classification of the framing", a change that only moves code.

### Practices phase

In creation mode, once the Stack section is validated: the practices depend on the stack.

1. **Facts.** Take from the validated answers the facts of the criteria: the archetype of A-001 (`none` without one), whether the product has a user interface, the languages and frameworks of the stack decision, the network exposure of the Security theme (`none`, `private`: a private network or the local machine, `public`: the internet). Run `f3 practices select --archetype <id|none> --ui yes|no --language <language> --framework <framework> --exposure <exposure>`, an option repeated for several values, lower case. Leave out a fact you do not know: the output says which criteria it could not check.
2. **Proposal.** Read the entry of each candidate with `f3 practices show <id> <id>…`. Propose a selection, with for each entry one line "why for this project", then the candidates you set aside and why. The entries proposed by the archetype come first; a criterion not checked is a point to weigh with the user, not a reason to keep.
3. **Validation.** The user keeps, removes, adds. Run `f3 practices select` again with the same facts and `--check <id>,<id>`: it refuses a conflict, a missing requirement, a draft or a section over the global budget. Show a refusal and settle it with the user.
4. **Decision.** Write at once in `arch/decisions.md` as A-003 "Adopted practices": each entry adopted with its version, each entry set aside with its reason. No practice adopted is also a decision.

The rules of a practice are copied as they are and never rewritten: an adaptation to the product is a project-specific rule.

### Existing code rules, in adoption mode

Take each rule of the existing AGENTS.md and find the principle it expresses: already stated by the invariant part (dropped, citing the invariant rule); following from a technology (Stack section); only meaningful for this product (project-specific rule, with its reason); no longer holding (dropped, with your reason). The user decides rule by rule.

## Summary and writing

1. Present the full summary: the `context` as written, the terms of CONTEXT.md, the project type, the Stack section, the adopted practices, the entries of arch/decisions.md and, in adoption, the project-specific rules. Wait for the validation.
2. Write each file following its reference:
   - `AGENTS.md`: the invariant part unchanged, the Stack section, the project-specific rules if any; then, in creation mode, run `f3 practices apply --archetype <id|none> <id> <id>…` with the selection of A-003 (with no entry when none is adopted). It writes the Adopted practices section just before the Stack section, with its marker, and copies the practice skills into `.claude/skills/practice-*`. Never write that section or those skills yourself; if `apply` refuses, show its message and stop;
   - `openspec/config.yaml`: the template with the validated `context`. If `openspec/` does not exist, first run `openspec init --tools <tools>`, with the tools of the project of the launch state separated by commas (`--tools claude,opencode`), then replace the config.yaml it created. Then check that each skills folder it wrote has `openspec-continue-change`, `openspec-apply-change` and `openspec-archive-change`; if one is missing, say so in the summary, with what to do before `f3 design`: select a profile that includes it with `openspec config profile`, run `openspec update`, then commit;
   - `CONTEXT.md`: the validated terms; in adoption, the existing terms kept and completed, in the format of the template;
   - `arch/decisions.md` and `BACKLOG.md`: created with their content at creation, then the entries of this framing;
   - `.gitignore`: the line `.f3/local`, unless the launch state says Git already ignores it;
   - for Claude Code, `CLAUDE.md`, `.mcp.json` and `.claude/settings.json`: what the f3-standards skill gives for them, without touching any other content;
   - for OpenCode, the project `opencode.json`: the workflow keys, without touching any other key.
3. For OpenCode, propose to move the user preferences of the project `opencode.json` to `~/.config/opencode/opencode.json`, merged with what it contains; move them only with the user's agreement.
4. Run `openspec schema which f3` and `openspec validate --all`, and fix the errors in the files you wrote. In adoption, also run `node ~/.local/share/f3/scripts/f3-features.mjs --check` and fix nothing it reports; read a sample of the existing scenarios against the spec-practice rules. If the check fails or the scenarios break the rules, propose a backlog entry for a change that rewrites them without changing behavior.
5. Show `git diff --stat`, then state: the points To be clarified; that OpenCode must be restarted if `opencode.json` changed; that under Claude Code each developer, at the first f3 session in the project, trusts the folder and approves the servers of `.mcp.json`; if a design tool is kept and `ux/brief.md` does not exist, the commands to run once, each in a new session: `f3 ux-calibrate`, `f3 ux-direction`, `f3 ux-tokens`; in adoption, the gaps between the code and the invariant part, each proposed as a backlog entry, without fixing them; and that the next change starts with `f3 propose`.
