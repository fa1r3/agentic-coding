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

## 2026-10-13: redesign of the f3 workflow

- **Language:** the toolkit is in English, including every stable keyword (headings, field labels, statuses, file names). The prose of the artifacts follows the Language part of the context; the agents answer in the language of the user.
- **Agents:** `analyst` (clarification, proposal, specs, Tres Amigos), `architect` (framing, technical design, tasks, design review, archiving), `developer`, `tester`, `ux`. Each command declares its agent; the user never switches agents by hand.
- **Commands:** `/f3-init`, `/f3-propose`, `/f3-tres-amigos`, `/f3-ux-design` (with a conformity mode), `/f3-design`, `/f3-design-review`, `/f3-dev`, `/f3-acceptance`, `/f3-archive`, and `/f3-ux-calibrate`, `/f3-ux-direction`, `/f3-ux-tokens` once per project. Removed: three-amigos, ux-calibrate, ux-direction, ux-tokens, ux-design, and check-context.sh.
- **Schema f3:** clarification, proposal, specs, amigos, ux, design, tasks, review; implementation requires the review. A step conducted by a command is done when its validation file exists.
- **Backlog:** `BACKLOG.md` keeps every idea left out of a change; `/f3-propose` sorts it with the user and proposes the next change.
- **Framing:** AGENTS.md is split into an invariant part, a Stack section decided at framing after a web check of the candidates, and project-specific rules; `arch/decisions.md` records the structural decisions; the project `opencode.json` keeps only the workflow keys.
- **Tests:** scenarios are short reusable steps; `f3-features.mjs` converts the specs literally into Gherkin feature files; the tester writes step definitions and strict page objects named after the views of ux.md; an independent subagent reviews them; the user decides on each failure (adapt the test, ticket for the developer, backlog).
