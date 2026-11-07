# Drift log

Basis of the review planned once the first version of the application is stable: go over the whole setup again from the start, to learn from our mistakes.

For each drift: the finding, the cause identified, and the state of the correction ("fixed", "partial" or "to design").

## Design

1. **A first brief without identity.** Finding: standard theme, close to Angular Material. Cause: an interview in text, with cautious options, and the ban on writing values in the brief. State: fixed (/f3-ux-direction, two drawn directions, an agent with a stance).
2. **Screens drawn with temporary components.** Cause: no component step before the screens. State: fixed (/f3-ux-design draws the components before the screens).
3. **Behaviors slipped into the design documents.** Cause: the examples of our own templates contained some. State: fixed (templates, rule 3 of ux-practice).
4. **The Penpot API rediscovered in each session, saturated context.** Cause: nothing kept the findings from one session to the next. State: fixed (cookbook written as we go, limited in size).
5. **A context loaded from the start (70,000 tokens).** Cause: full dump of the tokens, full reads of specs and documentation, Playwright tools loaded for nothing. State: fixed (reading when needed, targeted reads, Playwright denied to the agents that do not use it).
6. **Internal contradictions in the design.** Finding: 2 px corners in the brief against 4 to 12 px in an intention; "only terracotta signals" against the state colors; fonts of the brief against an intention. Cause: change intentions written without review against the brief. State: partial (reported as conflicts during the impact analysis).
7. **Lists of names submitted for validation instead of images.** Finding: a list of icon names to validate. Cause: the command asked to validate each sub-section. State: fixed (rule 8: preview by default for limited choices).
8. **ux.md turned into a second source of appearance.** Finding: dimensions, colors, shadows and token values written in ux.md; the implementation coded from it without opening Penpot. State: fixed (no appearance value in ux.md; each interface task lists its screens to open).
9. **Mockups that depart from the specs.** Finding: a section added on the home screen, information not specified (number of images), actions required missing from the cards. Cause: no check of the screens against the specs. State: fixed (each screen checked against the specs before being presented; conformity mode after implementation).
10. **A grid with fixed columns in the mockup,** while the intention planned columns adapted to the width. State: decided for this change.

## Specs

11. **Specs without states, without navigation, without information per view.** Finding: 38 points raised at the impact analysis. State: fixed (Tres Amigos, interface viewpoint; clarification interview of /f3-propose).
12. **A review of the specs that did not check the ability to draw.** State: fixed (Tres Amigos, four members as subagents, separate contexts).
13. **An incomplete and confused completeness check.** Finding: it mixed behavior and presentation, and missed renaming, visible information and zoom. State: partial (classification by category; the check by view table remains to design).
14. **An absolute architecture rule, without its reason.** Finding: rule 15 forbade any path received by an endpoint, hence a false contradiction with the import. State: fixed (the invariant principle "domain identity at the boundaries", with its reason; structural decisions recorded in arch/decisions.md).
15. **The design agent deciding behaviors.** Finding: Enter and Escape keys of the renaming decided alone, with an Escape conflict in the detail view. State: partial (rule 3).

## Tooling and process

16. **A painful alternation between agents.** State: fixed (one command per step, each declaring its agent).
17. **A review of the specs allowed to modify the whole ux.md.** State: fixed (writing scope specified).
18. **An implementation instruction not applied.** Finding: the instruction to open the Penpot screens, placed in operations.apply, was ignored. Cause: these instructions are only advisory. State: fixed (screens cited in each interface task, checked at the design review, conformity mode after implementation).
19. **Screens filed as "Non-Goal" in the design,** without taking over the names of ux.md. State: fixed (rules of the design and tasks artifacts of the f3 schema).
20. **A command naming that became inconsistent.** State: fixed (every command starts with `f3-`; the OpenSpec commands are used through them).

## Implementation

21. **Tasks split by layer.** Finding: the import-actions component built, tested, never used; no wiring task. State: fixed (tasks by functional slice, each group citing the scenarios it delivers).
22. **Tests that did not exercise the application.** Finding: the test presented as end to end called the HTTP routes without launching Electron; Playwright was forbidden. State: fixed (feature files generated from the specs, run on the launched application).
23. **Tasks checked on an unusable result.** Finding: import impossible, folders not navigable, mockups ignored. Cause: no acceptance after implementation, and the agent that codes declares the work finished itself. State: fixed (user check, conformity mode, acceptance by the tester in another session; the user decides on each failure).
24. **No review before implementation.** Finding: the contradiction of rule 15 and the missing folder picker were seen by nobody. State: fixed (design review with architect, technical security and product traceability).
25. **A change too big for an agent.** Finding: about thirty requirements, about a hundred tasks. State: partial (size check and split into the backlog during /f3-propose).

## Infrastructure

26. **Network from WSL to Windows.** State: fixed ("mirrored" mode).
27. **Images refused by OpenCode for a custom provider.** State: fixed (modalities in opencode.json).
28. **Tool calls returned as text by ninfer.** State: worked around (switch to Strata).

## Coaching (my own mistakes)

29. **Dependent files delivered in separate batches,** and manual edits requested. State: fixed (complete files, checked before sending).
30. **Solutions built on unverified assumptions,** in particular the call of subagents. State: fixed (check in the documentation before any proposal).
31. **A proposal inconsistent with the request:** member commands launched by hand instead of an orchestration. State: fixed.
32. **Unrequested additions slipped into the files.** Finding: a coverage script added to the toolkit without having been designed with the user. State: fixed (only what was decided is added; a script is accepted only when determinism justifies it, after discussion).
33. **A reflex of blaming failures on the local model,** before examining the process and the tools. State: fixed (diagnosis first).
34. **Off-topic examples,** such as amounts in cents given for architecture. State: to watch.
35. **Lists of information I already had, requested by copy-paste.** State: fixed (prompts provided filled in).

## Framing

36. **An architecture template that mixed the style, the stack and the product.** Finding: rules about Electron, Angular and file paths of this product were in the template meant for every project. State: fixed (AGENTS.md has an invariant part, a Stack section written at framing, and project-specific rules).
37. **A test coverage judged on titles.** Finding: comparing test titles with scenario names proves that a test exists, not what it checks. State: fixed (scenarios written as reusable steps and executed through generated feature files; an independent review of the step definitions).

## Security

38. **Command arguments substituted into the shell of the injections.** Finding: the OpenCode commands inserted `$ARGUMENTS` without quotes into their shell injections (`ls -1 openspec/changes/$ARGUMENTS/`), which OpenCode runs without any permission check: an argument such as `x; <command>`, typed or pasted, ran the command at launch. Between quotes, an apostrophe still ends them (checked on OpenCode 2.2.5); under Claude Code, its permission check refuses the line and the command fails. Cause: the argument of a command, meant to be a change identifier, was used in a shell line before being checked, and free text went the same way. State: partial (launched with `f3 <step>`, the arguments are identifiers checked by the launcher, and the free text goes through a private file named by `F3_LAUNCH`, never through a shell line; a command typed in an OpenCode session stays exposed, as the guide says in 15.4; still open on `main` until the multi-tool branch is merged).

## 2026-10-13: redesign of the f3 workflow

- **Language:** the toolkit is in English, including every stable keyword (headings, field labels, statuses, file names). The prose of the artifacts follows the Language part of the context; the agents answer in the language of the user.
- **Agents:** `analyst` (clarification, proposal, specs, Tres Amigos), `architect` (framing, technical design, tasks, design review, archiving), `developer`, `tester`, `ux`. Each command declares its agent; the user never switches agents by hand.
- **Commands:** `/f3-init`, `/f3-propose`, `/f3-tres-amigos`, `/f3-ux-design` (with a conformity mode), `/f3-design`, `/f3-design-review`, `/f3-dev`, `/f3-acceptance`, `/f3-archive`, and `/f3-ux-calibrate`, `/f3-ux-direction`, `/f3-ux-tokens` once per project. Removed: three-amigos, ux-calibrate, ux-direction, ux-tokens, ux-design, and check-context.sh.
- **Schema f3:** clarification, proposal, specs, amigos, ux, design, tasks, review; implementation requires the review. A step conducted by a command is done when its validation file exists.
- **Backlog:** `BACKLOG.md` keeps every idea left out of a change; `/f3-propose` sorts it with the user and proposes the next change.
- **Framing:** AGENTS.md is split into an invariant part, a Stack section decided at framing after a web check of the candidates, and project-specific rules; `arch/decisions.md` records the structural decisions; the project `opencode.json` keeps only the workflow keys.
- **Tests:** scenarios are short reusable steps; `f3-features.mjs` converts the specs literally into Gherkin feature files; the tester writes step definitions and strict page objects named after the views of ux.md; an independent subagent reviews them; the user decides on each failure (adapt the test, ticket for the developer, backlog).

## 2026-11-05: Claude Code version of the toolkit

Branch `feat/claude-code` (tag `ref/claude-code`), taken from `main`. It is now a reference only: since 2026-11-07, one toolkit renders both versions from common sources (next section).

- **Launching a step:** in Claude Code, a command cannot choose its agent; the session does, when it starts. Each step is launched from a terminal with `f3 <step>`, which starts `claude --agent <agent> "/f3-<step> <arguments>"`. A hook of the project (`f3 guard-prompt`, in `.claude/settings.json`) refuses an f3 command typed in a session started as another agent. Commands name the next step as `f3 <step>`, and are never launched by the model itself (`disable-model-invocation`).
- **Launch state:** the shell injections of the commands (29 in 9 commands, some failing in normal cases, some compound) are replaced by a single `f3 state <command>` per command, the only shell command it may run. It checks the arguments and that the project is framed: a failure stops the command, which was only an instruction before.
- **Permissions:** the path rules of each agent keep the OpenCode semantics (globs, the last matching rule wins), and are applied by the guard hook of the agent (`f3 guard`). The guard refuses the call on any error of its own, and never answers "allow": the user's permission mode applies to what the table permits. MCP servers are refused with `disallowedTools`.
- **Tester gap.** Under OpenCode, the read rules of the tester covered only the read tool: glob, grep and the shell could still read the application code. Finding: checked on OpenCode 2.2.5 (V13 of the multi-tool proposal). State: partial. Closed under Claude Code: the guard checks the Read tool by path, refuses the reading programs of the shell (`cat`, `sed`, `git diff`, `node -e`…), permits the search programs (`grep`, `rg`, `find`) only in the paths the tester may read, since Claude Code has no search tool, and lets the tester call no subagent but itself, which becomes the fidelity reviewer of `/f3-acceptance`. Under OpenCode, since 2026-11-07, the subagent restriction is native and the tester is its own fidelity reviewer, but glob, grep and the shell can still read the code: closing it would take a plugin, not built.
- **Project files:** `opencode.json` is replaced by `CLAUDE.md` (imports of `AGENTS.md` and `CONTEXT.md`), `.mcp.json` and `.claude/settings.json`, versioned and written by `/f3-init`.
- **Built-in subagents:** `explore` becomes `Explore` (it runs on the model of the session), `general` becomes `general-purpose`, the task tool the Agent tool. A section of f3-agent says how an agent behaves when called as a subagent: it analyzes, returns its questions and proposals, and writes nothing.

## 2026-11-07: one toolkit for Claude Code and OpenCode

Branch `feat/multi-harness`: the user chooses the tool; the workflow and OpenSpec are the same under both.

- **Common sources, rendered by tool:** everything in `modules/` is common. What differs (the frontmatter of the agents and commands, the names of the built-in subagents, of the subagent tool and of the positional arguments, the form of the refused tools) is in `tools/<tool>/`. Only the agents and commands are rendered, into `build/<tool>`; the skills, scripts and schemas are linked as they are, and every skill is written for both tools.
- **Render at each launch:** `f3 <step>` and `f3 state` render again at every call, without comparing dates: a source removed or renamed, or a `git checkout` to an older version, would have left a stale render in place without any newer source. The link `build/<tool>` switches in one step to a complete render; a failed render launches nothing.
- **One name for the steps:** `f3 <step>` under both tools, so the references to the commands in the agents, commands, skills and guide stay common. Under OpenCode, the launcher runs `opencode --standalone --prompt "/f3-<step> <arguments> "`; typing `/f3-<step>` in a session still works.
- **Prompt at launch:** `f3 <step> [<arguments>] [-- <prompt>]`. The prompt always comes last and is never parsed; it reaches the agent through a private file named by `F3_LAUNCH`, never through the launch message, whose arguments are only identifiers (drift 38).
- **Launch state under both tools:** `f3 state` replaces the 29 shell injections under OpenCode too. A failed injection does not stop an OpenCode command: the line that follows it tells the agent to stop, an instruction there and a mechanism under Claude Code.
- **Tool of a project:** chosen by each user, kept in `.f3/local`, not versioned, changed with `f3 tool`.
- **Project files:** `f3 init` writes the files of each tool of the project, so a team can use both tools. The MCP servers are decided once in the Stack section, and the two files name them the same way. Every launch state warns about missing tool files, `.f3/local` not ignored by Git, and MCP servers that differ; no migration command: `f3 init` proposes its theme Tools.
- **Guarantees by tool:** one permission table per agent, the union of the files of both tools, applied by the guard under Claude Code and natively under OpenCode. The guide says, control by control, what each tool enforces (section 12).
- **Non-regression:** the render of each tool is compared with its reference (tags `ref/opencode`, `ref/claude-code`); every intended difference is written first in `tests/ref/<tool>.diff`, and any other one fails the tests.
