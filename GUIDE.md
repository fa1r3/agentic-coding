# agentic-toolkit: the f3 workflow guide

This guide explains what the agentic-toolkit does, why it is built the way it is, and how to use it, step by step. It assumes you know how to write software. It does not assume you know OpenCode, OpenSpec or agentic programming.

All the examples use a fictional invoicing product: accountants who issue invoices to customers. It is unrelated to any real project, and its names only illustrate a form.

## Contents

1. [What the toolkit is](#1-what-the-toolkit-is)
2. [The ideas behind it](#2-the-ideas-behind-it)
3. [The building blocks: OpenCode and OpenSpec](#3-the-building-blocks-opencode-and-openspec)
4. [What the toolkit contains](#4-what-the-toolkit-contains)
5. [The files of a project](#5-the-files-of-a-project)
6. [The agents and their boundaries](#6-the-agents-and-their-boundaries)
7. [The workflow at a glance](#7-the-workflow-at-a-glance)
8. [The steps, one by one](#8-the-steps-one-by-one)
9. [A complete example: issuing an invoice](#9-a-complete-example-issuing-an-invoice)
10. [Executable specs: how the tests work](#10-executable-specs-how-the-tests-work)
11. [The backlog](#11-the-backlog)
12. [What is enforced, and what is only asked](#12-what-is-enforced-and-what-is-only-asked)
13. [Resuming, re-running, reopening](#13-resuming-re-running-reopening)
14. [Adopting an existing project](#14-adopting-an-existing-project)
15. [Installation and troubleshooting](#15-installation-and-troubleshooting)
16. [Known limits](#16-known-limits)
17. [Questions and answers](#17-questions-and-answers)

---

## 1. What the toolkit is

The agentic-toolkit is a set of files that you install once on your machine. It teaches an AI coding agent, running in OpenCode, to build software with you in a disciplined way:

- you describe a need;
- an agent asks you functional questions until the need is clear, then writes it down as a specification;
- independent reviewers challenge that specification;
- a designer agent draws the screens;
- an architect agent designs the code and splits the work into tasks;
- independent reviewers challenge that design;
- a developer agent writes the code;
- you check the result, a tester agent proves it against the specification, and the change is archived.

At every step, an agent analyzes and proposes; **you decide**. Nothing is written in a project file without your validation.

The workflow is called **f3**. Every command of the toolkit starts with `f3-`.

### Who it is for

A developer, or a small team, who wants to use an AI agent for real product work, including with a local model, and who has noticed that letting an agent "just code" produces code that compiles, passes its own tests, and does not do what was asked. The toolkit was built to fix that, one failure at a time.

---

## 2. The ideas behind it

Each rule of the toolkit comes from one of these ideas. When a situation is not covered by a rule, these ideas decide.

### 2.1 The specification comes first, and it describes behavior

Before any code, the change is described as **requirements** and **scenarios**: what the user can know or do, and when. A spec never says where a button is or what color it has. A spec is a contract that can be checked: each scenario becomes a test.

Why: an agent that codes from a vague request fills the gaps with guesses. A spec written and reviewed first removes the guesses before they become code.

### 2.2 Three kinds of decisions, three places

| Kind of decision | Example | Where it lives |
|---|---|---|
| Behavior | "Issuing is refused when a line has no amount" | the specs |
| Presentation | "The refusal is shown as an alert under the form" | the design tool and the ux files |
| Technique | "Invoices are stored in PostgreSQL" | the design.md of the change, and `arch/decisions.md` when it commits the future |

Why: when a spec also decides presentation, the designer cannot design; when a design decides behavior, nobody reviews it. Keeping each kind of decision in its own place makes each one reviewable by the right viewpoint.

### 2.3 Each piece of information lives in one place

The product description is in one file, the code rules in another, the vocabulary in a third. A rule is never copied into two files.

Why: two copies of a rule diverge, and an agent then follows whichever it reads first.

### 2.4 The agent analyzes and proposes; you decide

Agents ask one question at a time, always with a recommended answer. When they disagree with you, they say it once, with their reason, and then accept your decision and record it.

Why: you stay in control of the product without having to do the analysis yourself.

### 2.5 Reviews are made by independent viewpoints

A review is never made by the agent that wrote the reviewed work. Reviewers run as **subagents**, each in its own context, each with a single viewpoint (interface, system, test, security, architecture, product). The chair of the review sorts their objections; you decide.

Why: an agent reviewing its own work confirms it. Separate contexts produce separate opinions.

### 2.6 Specs are executable

Scenarios are written as short, reusable steps. A script converts them, word for word, into Gherkin feature files, which a test runner executes against the launched application. The words of the spec are the test.

Why: comparing a test's title with a scenario's name proves that a test exists, not what it checks. Executing the scenario's own sentences removes that gap.

### 2.7 Small changes, nothing forgotten

A change delivers one coherent behavior the user can try. Everything left out goes to a **backlog**, so that staying focused never means losing an idea.

Why: an agent loses quality on a change with thirty requirements and a hundred tasks. A small change is designed, built and checked properly.

### 2.8 Files are the memory

Every decision is written as soon as it is validated. Every long step keeps a progress file. A command that is interrupted, or run again in a new session, resumes from what is written. Agents never pass information to each other through a conversation: each step reads the files the previous steps wrote, and writes its own. Section 5 describes these files.

Why: an agent's conversation is lost at the end of a session; files are not.

### 2.9 What is judged by eye is shown as an image

Colors, icons, layouts are shown to you as images in the design tool, never as lists of names or values.

Why: you cannot judge a hexadecimal code or a list of icon names. You can judge a picture.

### 2.10 Every agent checks its frame before working inside it

Before working inside what it is given (the request, the scope of the change, the existing specs, the rules of the command), every agent checks that frame and reports, with a proposal:

- an input of the wrong kind: a spec that describes how the product is built, a design that decides behavior, a task that decides presentation;
- two constraints that cannot both hold: a change that may not touch the code, but whose scenarios must pass while the code does not do what they say;
- a consequence that makes a later step impossible: a scenario that needs a test entry point no task builds.

It never fixes the frame itself: you decide. In Tres Amigos, an objection to the frame is accepted when it is tied to a scenario that cannot be implemented or accepted.

Why: an agent optimizes inside the frame it receives, and applies it to the letter. A wrong frame produces careful work that cannot be delivered.

---

## 3. The building blocks: OpenCode and OpenSpec

The toolkit adds nothing to these two tools: it configures them.

### 3.1 OpenCode

[OpenCode](https://opencode.ai/docs/) is a terminal application where an AI model works on your repository. It provides:

- **Agents**: a role for the model, defined in a Markdown file: a description, a system prompt, and **permissions** (which files it may read or edit, which tools it may use). You switch the active agent with Tab.
- **Commands**: a reusable prompt, defined in a Markdown file, launched by typing `/name`. A command can declare the agent that runs it, so launching the command switches the agent. A command receives its arguments as `$ARGUMENTS` (all of them) or `$1`, `$2` (one by one). It can also insert the output of shell commands into its prompt, with the syntax `` !`command` ``, so the agent starts with the current state of the repository.
- **Skills**: folders of instructions (`SKILL.md` and references) that an agent loads when it needs them, instead of carrying them in every prompt.
- **MCP servers**: external tools the agent can call, such as a browser driver or a design tool. Their tools are named `<server>_<tool>`, which lets a permission deny a whole server with `<server>_*`.
- **Subagents**: an agent can launch another agent, in its own context, through the task tool. OpenCode ships two built-in subagents: `explore` (reading and searching) and `general` (any task).
- **Configuration**: `opencode.json`, at two levels: global (`~/.config/opencode/opencode.json`, your preferences, such as providers and models) and per project (only what the project needs). OpenCode merges both.

Permission rules are evaluated in order, and **the last rule that matches wins**. That is why an agent file can say `"*": deny` first, then allow a few paths after it.

### 3.2 OpenSpec

[OpenSpec](https://openspec.dev/docs) is a command line tool that organizes specification work in a repository:

- `openspec/specs/<capability>/spec.md`: the current specs of the product, one folder per **capability** (a durable behavior, such as `invoicing`).
- `openspec/changes/<change-id>/`: one folder per **change** in progress. A change contains **artifacts** (proposal, delta specs, design, tasks) and, when it is finished, is **archived**: its delta specs are merged into `openspec/specs/` and the folder moves to `openspec/changes/archive/`.
- A **delta spec** describes what the change does to a capability, in sections `ADDED`, `MODIFIED`, `REMOVED` and `RENAMED Requirements`. A `MODIFIED` requirement replaces the whole requirement at archiving, so OpenSpec refuses one that omits an existing scenario.
- A **schema** defines which artifacts a change has, in which order, from which templates, with which instructions for the agent. An artifact is "done" when its file exists; an artifact becomes available only when the artifacts it requires are done. Implementation ("apply") becomes available only when the artifacts the schema lists are done.
- `openspec/config.yaml`: the project's configuration: the schema to use, a `context` (a product description injected into every artifact's instructions), and optional rules.
- OpenSpec installs **skills** in the project (`.opencode/skills/openspec-*`), which the f3 commands use: `openspec-continue-change` (write the next artifact), `openspec-apply-change` (implement tasks), `openspec-archive-change` (archive).

The toolkit provides its own schema, **f3**, which adds the steps of the f3 workflow to the default OpenSpec flow.

---

## 4. What the toolkit contains

```
agentic-toolkit/
├── README.md                       short overview
├── GUIDE.md                        this guide
├── install.sh                      links the modules into OpenCode and OpenSpec
├── retro/drift-log.md              the failures that shaped the toolkit, and their fixes
└── modules/
    ├── openspec/                   the workflow
    │   ├── agents/                 analyst, architect, developer, tester
    │   ├── commands/               f3-init, f3-propose, f3-tres-amigos, f3-design,
    │   │                           f3-design-review, f3-dev, f3-acceptance, f3-archive
    │   ├── schemas/f3/             the OpenSpec schema and its templates
    │   ├── scripts/f3-features.mjs converts specs into Gherkin feature files
    │   └── skills/
    │       ├── f3-agent/           working rules shared by every agent, and the review session mechanism
    │       ├── f3-standards/       templates of the framing files and of the views register
    │       ├── spec-practice/      how to write requirements and scenarios
    │       └── e2e-practice/       how to write end-to-end tests, and the manual scenarios register
    └── ux/                         the design
        ├── agents/ux.md            art director and product designer
        ├── commands/               f3-ux-calibrate, f3-ux-direction, f3-ux-tokens, f3-ux-design
        └── skills/
            ├── ux-practice/        design conventions, independent of the tool
            └── ux-penpot/          their translation into Penpot
```

The separation between `ux-practice` and `ux-penpot` illustrates a rule of the toolkit: what is specific to a tool lives in one place. Replacing Penpot with another design tool means writing another adapter skill, not rewriting the design workflow.

### 4.1 How it plugs in

`install.sh` creates symbolic links:

| From the toolkit | To |
|---|---|
| `modules/*/agents/*.md` | `~/.config/opencode/agents/` |
| `modules/*/commands/*.md` | `~/.config/opencode/commands/` |
| `modules/*/skills/*/` | `~/.config/opencode/skills/` |
| `modules/*/scripts/*` | `~/.config/opencode/scripts/` |
| `modules/*/schemas/*/` | `~/.local/share/openspec/schemas/` |

Because they are links, a change in the toolkit is active in every project at once, after an OpenCode restart. A project refers to the schema by name: `schema: f3` in its `openspec/config.yaml`. OpenSpec looks for a schema of that name in the project (`openspec/schemas/f3/`), then on the machine (the link above), then in its own package.

---

## 5. The files of a project

The workflow is a chain of files. Each step reads the files the previous steps wrote and writes its own; no step relies on what an agent remembers. This section describes every file: who writes it, who reads it, and what would break without it.

There are three families:

- the **framing files**, written once by `/f3-init` and changed rarely (5.1);
- the **files of a change**, which live in the folder of the change and are archived with it (5.3);
- the **registers**, which grow change after change and outlive every change (5.4).

### 5.1 The framing files

| File | Role | Written by | Read by | Without it |
|---|---|---|---|---|
| `openspec/config.yaml` | the **product**: what it does, for whom, its volumes, its constraints, its design tool, its language; and `schema: f3` | the architect, during `/f3-init` | every OpenSpec artifact (its `context` is injected into their instructions) | agents design for an imagined product: wrong volumes, wrong platform |
| `AGENTS.md` | the **code rules**: an invariant part (architecture style, naming, tests, Git) and a Stack section (this project's technologies and commands) | the architect, during `/f3-init` and the design steps | every agent, in every session | each agent applies its own habits; commands do not know how to verify or test |
| `CONTEXT.md` | the **vocabulary**: each business term, with the English term used in code | the analyst (and `/f3-init`) | every agent, in every session | the same concept gets three names in code, specs and screens |
| `opencode.json` (project) | only the workflow keys: `instructions` (to load `CONTEXT.md`) and the MCP servers the project needs | the architect, during `/f3-init` | OpenCode | agents miss the vocabulary or the tools; personal settings leak into the repository |

### 5.2 The two parts of AGENTS.md

The **invariant part** is identical in every project. It states the architecture style (bounded contexts, a core module per bounded context that knows no technology, adapters behind ports, entry points that call exactly one use case, a composition root) and the standards (naming, single verification command, test responsibilities, Git). For example, its rule 11:

> **Domain identity at the boundaries.** Outside the adapters that store or read it, a business object is always designated by its domain identity. A technical identifier never crosses a port, an entry point or an output contract. [...] Example: an invoice attachment is read through `GET /invoices/{invoiceId}/attachment`, never through `?path=...`.

The **Stack section** is written for the project during `/f3-init`, from the stack decision. It answers fixed questions in fixed subsections, and the commands of the workflow refer to them by name:

| Subsection | Answers | Used by |
|---|---|---|
| Modules | the concrete form of a module, as a directory tree | the architect, the developer |
| Dependency enforcement | the tool that enforces the dependency rules | the verification command |
| Entry points | the kinds of entry points and where they live | the architect, the developer |
| User interface | how the interface is split; where the design tokens live in the code and how a token is named there; where the design system components live; how "appearance values come only from tokens" is enforced (for example a lint rule) | the developer, the ux agent |
| Transport security | the security rules that follow from the transports | the design review |
| Verification command | the one command that verifies the repository | the developer, every task |
| End-to-end tests | the runner, the test mode, and four commands: *generate the tests*, *export the step catalog*, *run the whole suite*, *run one capability*; how `@manual` scenarios are excluded; during a migration, how scenarios without step definitions are skipped | the analyst, the tester |
| Observing the running application | how an agent sees and drives the running application outside the tests | the ux agent (conformity), the tester |

How to classify a rule: ask which principle it expresses. If the principle belongs to the style, the invariant part already says it. If it follows from a technology, it goes into the Stack section. If it only makes sense for this product, it is a project-specific rule, with its reason.

### 5.3 The files of a change

Everything a change produces lives in `openspec/changes/<change-id>/`, in the order the steps write it. When the change is archived, the folder moves to `openspec/changes/archive/` and keeps the whole history: what was asked, what was decided, and how it was proven.

| File | Written by (step) | Role | Read next by | Why it is needed |
|---|---|---|---|---|
| `.openspec.yaml` | OpenSpec, when `/f3-propose` creates the change | the metadata of the change, including its schema | OpenSpec | OpenSpec knows which steps the change follows |
| `clarification.md` | the analyst (`/f3-propose`) | the clarified need, section by section: Need, Scope (in, out, decisions against advice), Vocabulary, Behavior, Rules and edge cases, Examples, Security, Open points | the analyst (proposal, specs), Tres Amigos, the architect | the specs are derived from validated answers, not from the analyst's guesses; an interrupted interview resumes at the first empty section |
| `proposal.md` | the analyst (`/f3-propose`) | why and what: the capabilities added or modified, what is out of scope | every following step | the scope is written once; later steps can detect what exceeds it |
| `specs/<capability>/spec.md` | the analyst (`/f3-propose`), corrected in Tres Amigos | the **delta specs**: requirements and scenarios added, modified, removed or renamed | everyone; `f3-features` turns them into feature files | the contract of the change: what will be built, designed and proven |
| `tres-amigos.md` | the analyst, chairing `/f3-tres-amigos` | the record of each session: the raw reports of the four members, the grid of decisions, the dismissed points; then the amendments of the specs made by the following steps (section 13) | you, later sessions | each decision has its reason; a later session does not argue it again |
| `validations/amigos.md` | `/f3-tres-amigos`, when you declare the specs ready | the validation of the step | OpenSpec (unblocks the next step) | without it, the schema refuses the interface design |
| `ux.md` | the ux agent (`/f3-ux-design`); the analyst may write appearance wishes in it | the design delta: intentions, views, components, icons, tokens, conflicts, proposed cross-cutting decisions. It names and decides; it holds no appearance value | the architect (Interface section of the design), the developer, `/f3-archive` | the names the code, the screens and the tests will share are decided once |
| `ux-design.md` | the ux agent (`/f3-ux-design`) | the progress tracking of the design: each step of the impact analysis, each icon, component and screen with its status, and the conformity results | the ux agent, at each run | the design is done one unit per run; each run resumes where the previous one stopped |
| `validations/ux.md` | `/f3-ux-design`, when you declare the design finished, or close it as not-applicable | the validation of the step | OpenSpec | without it, the schema refuses the technical design |
| `design.md` | the architect (`/f3-design`) | how the change is built: decisions, Interface (views, components and tokens of `ux.md`), Volumetry, **Test strategy** (unit and integration tests, test entry points, replacement coverage of manual scenarios) | the design review, the developer, the tester | technical choices are written and reviewable before any code |
| `tasks.md` | the architect (`/f3-design`); fix groups added by the tester and the ux agent | the work, split into functional slices, each citing the scenarios it delivers; the checkboxes the developer ticks | the developer, the design review | the developer works from an explicit, reviewed list; OpenSpec tracks progress |
| `review.md` | the architect, chairing `/f3-design-review` | the record of the design review: reports, grid, decisions | you, later sessions | same as `tres-amigos.md`, for the design |
| `validations/review.md` | `/f3-design-review`, when you declare the design ready | the validation of the step | OpenSpec | without it, implementation (apply) is refused |
| `conformity/<view>--<state>.png` | the `general` subagent, for `/f3-ux-design <change-id> conformity` | captures of the running application, one per approved screen | the ux agent, you | the comparison with the design screens is made on images, not on descriptions |
| `acceptance/pass-NN.md` | the tester (`/f3-acceptance`), one per pass | the report of an acceptance pass: delta, tests written, fidelity review, failures and decisions, tickets, backlog entries, tested commit, conclusion | you, `/f3-archive` | the proof that the change does what its specs say, at a given commit; `/f3-archive` refuses a change whose last pass is not green |

Three of these files are **validations**. They contain a date, the decision and a summary, and they are what OpenSpec looks at: an artifact is done when its file exists. A command writes its validation only when you declare the step finished, so a step can take several sessions.

### 5.4 The registers

These files outlive every change. They are read at the start of a step and enriched as the project goes.

| File | Role | Written by, and when | Read by | Why it is needed |
|---|---|---|---|---|
| `openspec/specs/` | the current behavior of the product | OpenSpec, when `/f3-archive` merges the delta specs | everyone | the reference every new change is compared with |
| `CONTEXT.md` | the vocabulary (see 5.1) | the analyst, during `/f3-propose` and Tres Amigos | every agent | one concept, one name |
| `BACKLOG.md` | the ideas not planned yet, in priority order (section 11) | the agent that finds an idea, with your agreement; `/f3-propose` sorts it | `/f3-propose` | staying focused never loses an idea |
| `arch/decisions.md` | the structural decisions, with their reasons and the options set aside | the architect, during `/f3-init` and `/f3-design` | the architect, the design review | a choice is not reopened by accident, and its reason survives |
| `ux/brief.md` | the art direction | the ux agent, during `/f3-ux-direction` | the ux agent | every screen follows one direction |
| `ux/decisions.md` | the design decisions that hold for the whole product | the architect, when `/f3-archive` takes them from `ux.md` | the ux agent | a choice made in one change applies to the next ones |
| `ux/cookbook.md` | the verified recipes for the design tool | the ux agent, during `/f3-ux-calibrate` and any work in the tool | the ux agent | the agent does not rediscover the tool's API in every session |
| `ux/views.md` | the **views register**: each view of the code, its unit of code, its displays (route and kind) and the screens seen through each | the developer, in the commit that creates, renames or removes a view or one of its routes | the tester, the ux agent, the architect | the tester names its page objects without reading code or mockups; a route coded without design shows up as a display without screen |
| `tests/e2e/features/` | the feature files, one per capability | `f3-features`, regenerated at each acceptance and at archiving | the test runner, you | the specs, executable word for word |
| `tests/e2e/manual-scenarios.md` | the scenarios not automated end to end, each with its reason, its replacement coverage and its origin | the analyst (Tres Amigos) or the tester (acceptance), with your agreement | `f3-features`, the tester, Tres Amigos | an exception is decided once and is not raised again; `f3-features` rejects an entry that no longer matches a scenario |

### 5.5 How the files connect

Follow one scenario through the chain:

```
clarification.md  ─ validated example ─▶  specs/<capability>/spec.md  ─ reviewed in ─▶  tres-amigos.md
       │                                          │
       │                                          ├─ names a view ─▶ ux.md ─ drawn as ─▶ screens <view>/<state> in the design tool
       │                                          │                    │
       │                                          │                    └─ repeated in ─▶ design.md (Interface) ─▶ tasks.md (Screens:)
       │                                          │                                                                 │
       │                                          │                                    developer: code + ux/views.md ◀┘
       │                                          │
       │                                          └─ f3-features ─▶ tests/e2e/features/<capability>.feature
       │                                                                  │
       │                                                 step definitions ─▶ page objects named after ux/views.md
       │                                                                  │
       └──────────────────────────────── proven in ─▶ acceptance/pass-NN.md ─▶ archived with the change
```

The thread is the name. A scenario names an action; a view of `ux.md` gets a name; that name becomes the screens `<view>/<state>` in the design tool, the unit of code, the entry of `ux/views.md` and the page object. A broken link anywhere in the chain is visible: a feature file without step definition, a display without screen, a page object without a view in the register.

### 5.6 Languages

The toolkit, its templates and every **stable keyword** are in English: headings, field labels, statuses, file names. Commands read these keywords to resume work, so they never change. The **prose** of the artifacts is written in the language chosen in the `context` (for example French). Agents answer in the language you write in.

---

## 6. The agents and their boundaries

| Agent | Works on | Writes | Never writes |
|---|---|---|---|
| **analyst** | what the product does: needs, scope, vocabulary, behavior, examples | the clarification, the proposal, the specs and the Tres Amigos record of a change, `CONTEXT.md`, `BACKLOG.md`, and, for your decisions in Tres Amigos, `tests/e2e/manual-scenarios.md` | code, design, tasks, other test files |
| **architect** | how the product is built: framing, stack, technical design, tasks, archiving | `AGENTS.md`, `openspec/config.yaml`, `arch/`, design.md, tasks.md, the design review, `ux/decisions.md` when archiving, amendments of the specs you validate | code, tests |
| **ux** | how the product looks: art direction, tokens, components, screens, conformity | `ux/` (except `ux/views.md`), the ux files of a change, the design tool, amendments of the specs you validate | code, configuration |
| **developer** | the application code and its unit and integration tests | code, tests next to the code, `ux/views.md`, checkboxes of tasks.md | end-to-end tests, specs, design, framing files |
| **tester** | proving each scenario on the launched application | `tests/e2e/`, acceptance reports, fix tickets, backlog entries, amendments of the specs you validate | application code; it does not even read it, nor the mockups |

Every agent loads the f3-agent skill at startup: the rules they all share (the user decides, one question at a time, a validated decision written at once, the frame check, the language). An agent's file only holds its role and its **writing scope table**; a command says what its step produces, never what may be written. An agent asked to write outside its table stops and says so.

Why separate agents: a role shapes behavior. An agent called "architect" that leads a functional interview drifts towards technical solutions; an agent that writes both the code and its acceptance tests declares its own work finished. Each command declares its agent, so you never switch agents by hand.

The tester's isolation is deliberate: it reads the specs, the feature files, the Stack section, the Test strategy of the design, the impact of `ux.md`, the views register, and the running application. What it does not know, it cannot use to make a test pass.

Each agent also only sees the MCP tools it needs: the analyst has no browser and no design tool; the tester has the browser but not the design tool. A tool denied to an agent is removed from its tool list, which also saves context.

---

## 7. The workflow at a glance

```
once per project      /f3-init ── /f3-ux-calibrate ── /f3-ux-direction ── /f3-ux-tokens

per change            /f3-propose          clarification, proposal, specs      analyst
                           │
                      /f3-tres-amigos      specs reviewed by 4 viewpoints      analyst + 4 explore
                           │
                      /f3-ux-design        impact, components, screens         ux
                           │
                      /f3-design           design.md, tasks.md                 architect
                           │
                      /f3-design-review    design reviewed by 3 viewpoints     architect + 3 explore
                           │
                      /f3-dev              code, unit and integration tests,   developer
                           │               views register
                      your check of the journeys, then
                      /f3-ux-design <change> conformity                        ux + general
                           │
                      /f3-acceptance       feature files, steps, page objects  tester + explore
                           │   failures: adapt the test │ ticket → /f3-dev │ amend │ backlog │ manual
                           │
                      /f3-archive          merge specs, check, merge branch    architect
```

The OpenSpec schema enforces the order of the planning steps: an artifact cannot be written before the artifacts it requires exist, and implementation cannot start before the design review is validated.

| Artifact of the schema | File | Written by | Requires |
|---|---|---|---|
| clarification | `clarification.md` | `/f3-propose` | nothing |
| proposal | `proposal.md` | `/f3-propose` | clarification |
| specs | `specs/<capability>/spec.md` | `/f3-propose` | proposal |
| amigos | `validations/amigos.md` | `/f3-tres-amigos` | specs |
| ux | `validations/ux.md` | `/f3-ux-design` | amigos |
| design | `design.md` | `/f3-design` | specs, ux |
| tasks | `tasks.md` | `/f3-design` | specs, design |
| review | `validations/review.md` | `/f3-design-review` | tasks |
| (apply) | code | `/f3-dev` | review |

A step conducted by a command is done when its **validation file** exists. The command writes it only when you declare the step finished, so that you can run the step in several sessions.

---

## 8. The steps, one by one

Each step below gives: its purpose, the command, what you do, what it produces, and what to watch. Run each command in a **new session**: a fresh context per step keeps the agent focused, and the files carry the state.

### Step 0: framing the project, once (`/f3-init`)

**Purpose.** Describe the product, decide the stack, and write the framing files.

**Agent.** architect.

**Modes.** The command reads the repository and picks a mode:
- **creation**: no framing file exists;
- **adoption**: files exist, but not in the f3 format (see section 14);
- **update**: the project is already framed; you say which themes to review.

**What you do.** Answer an interview, one question at a time, each with a recommended answer: product, users, expected behavior, volumetry, platform and constraints, security and data, design tool, language, vocabulary. Then the **stack phase**:

1. the agent derives the technical constraints from your answers, and you correct them;
2. it checks on the web the current state of each candidate technology (version, maintenance, license) and cites its sources;
3. it presents two or three really different combinations, with how each answers the constraints, the architecture, the workflow (design tool, end-to-end driving, observation of the running app) and durability, and recommends one;
4. you decide; the decision becomes entry A-001 of `arch/decisions.md`;
5. it writes the Stack section of AGENTS.md, and you validate it;
6. it adds a first backlog entry: set up the repository according to the Stack section.

**Produces.** `AGENTS.md`, `openspec/config.yaml`, `CONTEXT.md`, `arch/decisions.md`, `BACKLOG.md`, the workflow keys of `opencode.json`. Nothing is committed: you review `git diff` and commit.

**Example of a context part** (fictional invoicing product):

```yaml
  Volumetry
  - Up to 50,000 invoices per company per year; lists must stay usable without loading every invoice.
  - An invoice has at most 200 lines.
```

A good context line lets someone decide a concrete case. "Fast" is not a context line; "a list of 50,000 invoices opens in under a second" is.

### Step 0': the design setup, once (`/f3-ux-calibrate`, `/f3-ux-direction`, `/f3-ux-tokens`)

Only if the project uses a design tool.

- **`/f3-ux-calibrate`** verifies, on a dedicated empty file of the design tool, how to perform each basic operation (create a page, a board, a component with variants, tokens, export an image), and writes each working recipe in `ux/cookbook.md`. Run it again after an update of the design tool: it checks each recipe again and fixes those that no longer work. Why: an agent that rediscovers a tool's API in every session wastes its context and repeats the same mistakes.
- **`/f3-ux-direction`** analyzes the product, draws **two clearly contrasting art directions** in the tool, lets you choose or combine, then writes `ux/brief.md` section by section with you (principles, reference colors, typography, icons, anti-references, accessibility, platform, component library). Why: a direction chosen from text produces a default theme; a direction chosen from drawings has an identity.
- **`/f3-ux-tokens`** creates the design tokens in the tool (global values, semantic roles per theme, component tokens later), checks the contrasts by computation, shows them on a preview, and lets you adjust.

The design tool is the only source of appearance. The code takes it over by opening the components and screens in the tool, and by using the tokens by their name.

### Step 1: proposing a change (`/f3-propose`)

**Purpose.** Turn an idea into a clear, small, specified change.

**Agent.** analyst.

**How to start it.**
- `/f3-propose` alone: it offers to resume a clarification in progress, or shows the backlog, proposes a sorting, and recommends the next change.
- `/f3-propose credit notes for issued invoices`: it clarifies this idea.
- `/f3-propose add-credit-notes`: it resumes that change.

**The interview.** One question at a time, each with a recommended answer, in this order:
1. **need and scope**, including a size check: if the need covers several independent journeys, the agent proposes a split; the rest goes to the backlog. If you keep something it advised against, it records your decision under "Decisions against advice" and never raises it again;
2. **vocabulary**: terms missing from `CONTEXT.md`;
3. **behavior**: for each view or entry point, its states (empty, loading, error included), how one comes to it and leaves it, what it shows, what it offers;
4. **rules and edge cases**, including the volumes of the context;
5. **examples**: the agent writes concrete examples with data and expected results; you validate them. You never write a scenario;
6. **security**: untrusted inputs, sensitive data.

Each validated answer is written at once in `clarification.md`. Then the agent writes `proposal.md` (why and what, with an "Out of scope" list) and the specs, following the spec-practice skill. Before writing the first scenario, it builds the **step catalog**: the steps already in the specs and the output of the *export the step catalog* command, so that new scenarios reuse existing sentences. It runs two checks: `f3-features --check` (form of the steps) and `openspec validate`.

**Produces.** `clarification.md`, `proposal.md`, `specs/`, backlog entries, terms in `CONTEXT.md`.

**What to watch.** At the end, the agent lists the **new steps**: step sentences that did not exist before. Each one will need code in the tests; prefer reusing existing sentences.

### Step 2: the Tres Amigos session (`/f3-tres-amigos <change-id>`)

**Purpose.** Make the specs complete and unambiguous before anyone designs or codes.

**Agent.** analyst, as chair, with four members convened one after the other as `explore` subagents:

| Member | Viewpoint |
|---|---|
| Interface | the developer who must code each screen: states, navigation, information, actions |
| System | the developer who must code the processing: data, errors, edge cases, volumetry, contradictions with existing specs |
| Test | the tester: scenarios that break spec-practice, steps that duplicate an existing step in other words, new steps that are not needed, ambiguous terms, scenarios that cannot be accepted end to end as the change is framed, scenarios that cannot be automated without changing how the application runs |
| Security | untrusted inputs, file system, network, isolation, stored data |

Each member reads alone and returns objections with a severity:
- **critical**: prevents implementing, or a security or data loss risk;
- **high**: forces guessing a behavior visible to the user;
- **minor**: wording without effect on behavior;
- **information**: no action.

The chair merges and orders them into a **grid**; for each point that needs a product choice, it proposes two or three options and a recommendation. You validate the grid as a whole or change rows. Each decision is applied at once to the specs. A scenario that you agree not to automate end to end gets its entry in `tests/e2e/manual-scenarios.md` (section 10.4). The session is recorded in `tres-amigos.md`. You may run another session on the modified specs; when you declare the specs ready, the command writes `validations/amigos.md`.

**Example grid row:**

| No. | Severity | Members | Subject | Nature | Decision |
|---|---|---|---|---|---|
| 3 | high | Interface, Test | What happens to an invoice being edited when another user issues it? | decision | The editor shows "This invoice was issued by someone else" and becomes read-only |

**What to watch.** A grid can grow long, especially on a project you adopt: reviewers find defects that existed before the change. Keep in the change what makes its scenarios right, observable and acceptable; send the rest to the backlog, with a priority.

### Step 3: the interface design (`/f3-ux-design <change-id>`)

**Purpose.** Design the views and components the change needs, in the design tool.

**Agent.** ux.

**Applicability.** If the project has no design tool, or the change creates or modifies no view and no component, the agent proposes to close the step as `not-applicable`.

**Units of work.** Each run does one unit, then stops; `ux-design.md` records where it is. The units, in order:
1. **impact analysis**: what is missing in the specs to draw each view (missing behaviors are decided with you and written in the specs as amendments, section 13), then the views, components, icons, tokens and conflicts, written in `ux.md`. Existing views keep the names of `ux/views.md`;
2. **icons** to import, shown together in a preview;
3. **components**, grouped by the view that assembles them;
4. **screens**, one view at a time, all its states. Each screen is checked against the specs before being shown to you: nothing the specs require is missing, nothing absent from the specs is added.

`ux.md` names and decides; it **never contains appearance values** (no size, color, font, token value). The design tool is the only source of appearance.

**Naming.** A view has one name everywhere: in `ux.md`, in the design tool (screens named `<view>/<state>`), in the code (the page or the containing component, the **unit of code**), in `ux/views.md`, and in the tests (the page object). A view carries the name of its unit of code. This name is the thread that links a scenario to a screen.

**The views register.** `ux.md` only names the views a change creates or modifies. The views that exist are listed in `ux/views.md`, one section per view: its unit of code, then each of its **displays** (a route with its kind, page or overlay, or `none` for an overlay opened by an action or a frame element), and under each display the screens seen through it. Example:

```markdown
## invoice-editor

- Code unit: apps/web/src/invoicing/invoice-editor.page.ts
- Displays:
  - /invoices/:number (page)
    - invoice-editor/default
    - invoice-editor/issue-error
  - /invoices/:number/preview (page)
    - invoice-editor/preview
```

The developer writes it, in the commit that creates, renames or removes a view or one of its routes, so that at any commit it matches the code. A display without any screen gets the line `none`: that is how a route built without design shows up, precisely, and the conformity check submits it to you.

### Step 4: the technical design and the tasks (`/f3-design <change-id>`)

**Purpose.** Decide how to build the change, and split the work.

**Agent.** architect, through the OpenSpec continue workflow.

**design.md** always exists, and contains, besides the usual Context, Goals, Decisions and Risks:
- **Interface**: the views, components and tokens of `ux.md`, with their exact names;
- **Volumetry**: the volumes of the context that concern the change, and their consequences (pagination, background processing, indexes);
- **Test strategy**: the unit and integration tests per part of the code; the capabilities whose scenarios change; the **test entry points** the application must provide to be driven end to end (test mode, test data, replacement of native dialogs, simulated clock or external services), knowing that a test entry point never changes how a processing of the application runs; and, for each manual scenario of the change, the unit or integration tests of its replacement coverage.

A decision that commits the following changes (new technology, new storage) is proposed to you and recorded in `arch/decisions.md`. If writing the design shows that a spec is missing, ambiguous or contradictory, the architect proposes an amendment (section 13).

**tasks.md** follows strict rules:
- tasks are split by **functional slice**, never by technical layer: each group delivers scenarios end to end, from storage to screen, with its own unit and integration tests;
- under each group, a line `Delivered scenarios:` cites the scenarios it delivers; each scenario of the change is delivered by exactly one group;
- the first group builds what the tests need before any scenario: the views register if it is missing or incomplete, then the test entry points;
- if the Interface section lists tokens, one task carries them over into the code before the views that use them;
- a task on a view or a component ends with `Screens:` and the screens to open;
- no task writes an end-to-end test;
- the last group, **Verification**, runs the verification command.

Why functional slices: a component built and unit-tested in one group and never wired into a page in another is a classic agent failure. A slice is only done when the scenario works from end to end.

### Step 5: the design review (`/f3-design-review <change-id>`)

**Purpose.** Challenge the design and the tasks before a line of code is written.

**Agent.** architect, as chair, with three `explore` members:

| Member | Viewpoint |
|---|---|
| Architect | compliance with AGENTS.md and `arch/decisions.md`, consistency with existing code, volumetry, unjustified choices |
| Technical security | attack surfaces, input validation, isolation, secrets, test entry points active outside test mode |
| Product | traceability: each scenario delivered by exactly one group, tasks that serve no scenario, view names, `Screens:` lines, test entry points present |

Same mechanism as Tres Amigos: grid, your decisions, application to design.md and tasks.md, record in `review.md`. A point that requires changing the specs is proposed as an amendment (section 13); you may prefer to bring it to a Tres Amigos session instead. When you declare the design ready, `validations/review.md` unlocks implementation.

**What to watch.** The chair is the author of the design. Read the raw reports of the members in `review.md`, not only the grid.

### Step 6: development (`/f3-dev <change-id>`)

**Purpose.** Write the code.

**Agent.** developer, through the OpenSpec apply workflow.

The developer creates the branch of the change, implements each task with its unit and integration tests, runs the verification command, checks the task, and commits, one commit per task. Groups titled "Acceptance fixes" or "Conformity fixes" (added later by the tester or the ux agent) come first. The command can be run again: it resumes the unchecked tasks.

For a task on a view or a component:
- it opens the screens listed after `Screens:` in the design tool and takes appearance from there, never from the text of `ux.md`;
- appearance values come only from the design tokens, used by name where the Stack section says they live, never as raw values;
- each component instance of a screen is the code component of the same name, created on its own if it does not exist yet, never inside the view;
- it updates the entry of the view in `ux/views.md` in the same commit.

It stops and reports when the design contradicts the specs, when a state of the specs has no screen, when a name differs between code and design, or when the design uses a value that has no token. At the end, it lists what it reported, the displays of `ux/views.md` without screen, and what the manual scenarios of the change ask you to check by hand.

### Step 7: your check, then conformity (`/f3-ux-design <change-id> conformity`)

**Your check.** Launch the application and try the journeys of the change yourself, including the checks by hand that the developer listed for the manual scenarios. Nothing replaces it, and it is cheap at this point.

**Conformity.** Only when the interface design step was approved (not when it was closed as not-applicable). The ux agent delegates to the `general` subagent the capture of each approved screen in the running application, through the display under which `ux/views.md` lists it, then compares each capture with the design screen and lists the deviations. Each display of `ux/views.md` without screen is also a deviation. For each one, you decide:
- **ticket**: a task in a "Conformity fixes" group of tasks.md, for `/f3-dev`;
- **design update**: the implementation is better, the screen is updated in the tool; for a display coded without design, its screens are drawn;
- **backlog**.

### Step 8: acceptance (`/f3-acceptance <change-id>`)

**Purpose.** Prove each scenario on the launched application, and catch regressions.

**Agent.** tester, who never reads the application code.

What happens:
1. the feature files are regenerated from the specs with the delta of the change; the manual scenarios are tagged `@manual` and excluded;
2. the test runner lists the steps without definition; the tester writes them, adapts the steps of modified requirements, and writes or adapts the **page objects** of the views involved, named after `ux/views.md`;
3. an independent `explore` subagent reviews the new and changed step definitions and page objects: does each definition do exactly what its sentence says?
4. the whole suite runs;
5. each failure is presented with its facts and a proposal (adapt the test, ticket for the developer, amendment of the spec, backlog, or manual under the conditions of section 10.4), following the classification in section 10.6; you decide;
6. the pass report is written in `acceptance/pass-NN.md`, and the tests and the report are committed.

Green means every scenario passes (except, during a migration, the scenarios outside the delta that are skipped for a missing step) and no ticket was added. Red with tickets means `/f3-dev`, then `/f3-acceptance` again: each run is a new pass, and a pass never modifies the report of a previous one.

### Step 9: archiving (`/f3-archive <change-id>`)

**Agent.** architect.

1. It checks that the last acceptance is green and that no application file changed since the tested commit.
2. It adds the cross-cutting design decisions of `ux.md` to `ux/decisions.md`.
3. It archives the change with OpenSpec: the delta specs are merged into `openspec/specs/`.
4. It regenerates the feature files from the merged specs: they must be **identical** to the tested ones, which proves the archived specs are the tested specs.
5. It closes the backlog entry, commits `docs: archive <change-id>`, and merges the branch.

---

## 9. A complete example: issuing an invoice

This section follows one small change through the whole workflow, with excerpts of what each step writes. The product is a fictional invoicing application.

### 9.1 The idea

You run `/f3-propose let the accountant issue an invoice`.

### 9.2 Clarification (excerpt of `clarification.md`)

The analyst asks, for example: "When an invoice is issued, can it still be edited? I recommend no: an issued invoice is a legal document." You answer "no". It asks about credit notes; you say "later": they go to the backlog. The file grows:

```markdown
## Scope

### In scope

- The accountant issues a draft invoice whose lines all have an amount.
- Issuing is refused when a line has no amount.

### Out of scope

- Credit notes: requested later; backlog entry B-003.

## Examples

- Issuing a complete draft: invoice "F-2024-001", lines of 100 and 20 euros; after issuing, its status is "issued" and its total is 120 euros.
- Issuing refused: invoice "F-2024-002" with a line without amount; issuing is refused with the reason "A line has no amount".
```

### 9.3 Specs (excerpt of `specs/invoicing/spec.md`)

```markdown
## ADDED Requirements

### Requirement: Issue an invoice
The system SHALL let the accountant issue a draft invoice whose lines all have an amount.

#### Scenario: Issuing refused for a line without amount
- **GIVEN** a draft invoice "F-2024-002" for the customer "Dupont"
- **AND** the invoice "F-2024-002" has a line "Consulting" without amount
- **WHEN** the accountant opens the invoice "F-2024-002"
- **AND** the accountant issues the invoice
- **THEN** the issuing is refused with the reason "A line has no amount"
- **AND** the invoice "F-2024-002" has the status "draft"
```

Notice: one fact or one action per step; explicit data in quotes; no button, no screen position. The sentence "the accountant issues the invoice" will be reused by every scenario that issues an invoice.

### 9.4 Tres Amigos (excerpt of the grid)

The Test member objects: "Step 'the invoice is issued' in another scenario says the same thing as 'the invoice ... has the status issued'; reuse the existing sentence." The Interface member asks what the editor shows while issuing is in progress. You decide: an `issuing` state, during which actions are disabled. The specs get a new scenario.

The Test member also notices a scenario "Issuing refused while the yearly closing is running": its starting state needs a closing held halfway, which only a test entry point that pauses the closing could produce. You decide not to automate it: its entry goes into `tests/e2e/manual-scenarios.md`, with unit tests of `IssueInvoice` as replacement coverage and the refusal message to check by hand.

### 9.5 Interface design (excerpt of `ux.md`)

```markdown
### Views

- invoice-editor: page, group invoices. New. States: default, issuing, issued, issue-error. Components: invoice-form, issue-summary, status-badge, button. Requirements: Issue an invoice.
```

The design tool now has four screens: `invoice-editor/default`, `invoice-editor/issuing`, `invoice-editor/issued`, `invoice-editor/issue-error`.

### 9.6 Technical design and tasks (excerpts)

`design.md`, Test strategy:

```markdown
## Test strategy

- Unit tests: Invoice.issue() refuses a line without amount; IssueInvoice stores the issued invoice.
- Capability invoicing: three scenarios added, one of them manual.
- Test entry point: an endpoint, active only in test mode, that creates draft invoices with given lines.
- Replacement coverage of the manual scenario: unit tests of IssueInvoice with a double of the ClosingStatus port reporting a closing in progress.
```

`tasks.md`:

```markdown
## 1. Test data entry point

Delivered scenarios: none

- [ ] 1.1 Add the test-mode endpoint that creates a draft invoice with lines, and check it is absent outside test mode

## 2. Issue an invoice

Delivered scenarios: invoicing › Issue an invoice › Issuing a complete draft; invoicing › Issue an invoice › Issuing refused for a line without amount; invoicing › Issue an invoice › Issuing refused while the yearly closing is running (manual)

- [ ] 2.1 Add Invoice.issue() with its refusal rule, and its unit tests
- [ ] 2.2 Add the IssueInvoice use case, its refusal during a yearly closing and its endpoint, with their tests
- [ ] 2.3 Add the issue action and its states to the page invoice-editor. Screens: invoice-editor/default, invoice-editor/issuing, invoice-editor/issued, invoice-editor/issue-error

## 3. Verification

- [ ] 3.1 Run the verification command and check it passes
```

### 9.7 Design review (excerpt)

The Technical security member objects: "Task 1.1: nothing says how the test-data endpoint is disabled in production." You decide: the endpoint is only registered when the application starts in test mode, and a unit test checks it. Task 1.1 is corrected.

### 9.8 Development

`/f3-dev add-invoice-issuing`: the developer creates `feat/add-invoice-issuing`, implements group 1, then group 2 (opening the four screens before task 2.3), then group 3, one commit per task. With task 2.3, it adds the entry of `invoice-editor` to `ux/views.md`, with its display `/invoices/:number (page)` and its four screens.

### 9.9 Acceptance

The feature file is regenerated (excerpt):

```gherkin
# Generated by f3-features from the OpenSpec specs. Do not edit: regenerate.

Feature: invoicing

  Rule: Issue an invoice

    Scenario: Issuing refused for a line without amount
      Given a draft invoice "F-2024-002" for the customer "Dupont"
      And the invoice "F-2024-002" has a line "Consulting" without amount
      When the accountant opens the invoice "F-2024-002"
      And the accountant issues the invoice
      Then the issuing is refused with the reason "A line has no amount"
      And the invoice "F-2024-002" has the status "draft"

    @manual
    Scenario: Issuing refused while the yearly closing is running
      ...
```

The tester writes the page object `InvoiceEditor`, named after `ux/views.md`, and the step definitions (see section 10.5). The fidelity reviewer notices that the definition of "the invoice ... has the status ..." read the status of whatever invoice was displayed, without opening the one named in the sentence; the tester fixes it. One scenario fails: the refusal message is "Line amount missing" instead of "A line has no amount". The requirement is in the delta, the application does not do what the spec says: you choose **ticket**. A group "Acceptance fixes, pass 01" is added to tasks.md; `/f3-dev` fixes it; `/f3-acceptance` passes green.

### 9.10 Archiving

`/f3-archive add-invoice-issuing` merges the specs, checks that the regenerated feature file is identical to the tested one, sets backlog entry B-002 to `done add-invoice-issuing`, and merges the branch.

---

## 10. Executable specs: how the tests work

### 10.1 The problem it solves

A test written by hand from a scenario can drift from it: it may check something else, check less, or check the API instead of the screen. Its title may match the scenario's name while its content proves nothing. The f3 approach removes that freedom: the test **is** the scenario's text.

### 10.2 From spec to feature file

`f3-features.mjs` converts the specs literally, without rewording anything:

| OpenSpec | Gherkin |
|---|---|
| a capability (`openspec/specs/invoicing/spec.md`) | `Feature: invoicing` |
| its Purpose | comment lines |
| `### Requirement: Issue an invoice` | `Rule: Issue an invoice` |
| the requirement text | comment lines |
| `#### Scenario: ...` | `Scenario: ...`, preceded by `@manual` if the scenario is in the manual scenarios register |
| `- **GIVEN** ...`, `- **WHEN** ...`, `- **THEN** ...`, `- **AND** ...`, `- **BUT** ...` | `Given ...`, `When ...`, `Then ...`, `And ...`, `But ...` |

```
node ~/.config/opencode/scripts/f3-features.mjs                 main specs only
node ~/.config/opencode/scripts/f3-features.mjs <change-id>     main specs with the delta of that change
node ~/.config/opencode/scripts/f3-features.mjs --check [<id>]  same conversion, nothing written
```

The script applies the delta of the change (added, modified, removed and renamed requirements) before converting, so the tests check the new behavior. It refuses a scenario line that is not a step, a scenario that does not start with GIVEN or WHEN, a step order other than GIVEN, WHEN, THEN, a scenario without THEN, and an entry of the manual scenarios register that is malformed or matches no scenario.

**Important.** `--check` only checks the **form** of the steps. It does not judge the spec-practice rules (one fact per step, explicit data, reuse of existing sentences): a scenario made of two long sentences passes the check and still proves little. Those rules are checked by people: the analyst while writing, the Test member of Tres Amigos while reviewing.

The script only uses the built-in modules of Node.js, reads the specs and the register, and writes `tests/e2e/features/`. It runs no other command.

Two generations follow each other: `f3-features` writes the feature files, which are **versioned** (they prove what was accepted); then the test runner (for example bddgen for playwright-bdd) turns them into test code in a folder of its own, which is **not versioned**, because it is rebuilt at each run.

### 10.3 Step definitions and the step catalog

Each step sentence is bound to code once, in a **step definition**. Data in quotes or numbers become parameters, so one definition serves every scenario that uses the sentence with other data. The **step catalog** is the list of existing sentences; the analyst reads it before writing specs, so that new scenarios reuse existing steps.

When the test runner finds a step without definition, it fails and lists it: no scenario can be skipped silently. One exception, during the **migration** of an adopted project: a capability can hold scenarios already rewritten and others not yet automated. The Stack section may then set the runner so that a scenario with a missing step is skipped instead of failing the generation. In that case:
- a skipped scenario of the delta of the change is still a failure;
- the scenarios outside the delta that are skipped are counted by capability in every acceptance report;
- the change that automates the last of them sets the runner back to failing the generation.

### 10.4 Manual scenarios

A **test entry point** may prepare data or replace an external dependency (a native dialog, the clock, an external service); it never changes how a processing of the application runs. A scenario that could only be automated by crossing that line (for example by holding an import halfway) is **manual**: with your agreement, it is listed in `tests/e2e/manual-scenarios.md`.

```markdown
## invoicing › Issue an invoice › Issuing refused while the yearly closing is running

- Reason: the starting state needs a yearly closing held halfway; holding it would pause the closing process in test mode.
- Replacement coverage: unit tests of IssueInvoice with a double of the ClosingStatus port that reports a closing in progress; the user checks by hand that the refusal message is displayed.
- Origin: add-yearly-closing, tres-amigos, 2026-03-10
```

- The scenario stays in the specs and in its feature file, tagged `@manual`: the feature files remain the complete translation of the specs. The runner excludes the tag, as the Stack section says.
- Its rule is proven otherwise: the developer writes the unit or integration tests of its replacement coverage (they appear in the Test strategy of the design), and you check by hand what remains visible.
- An entry is proposed by the Test member of Tres Amigos or by the tester at acceptance, and written only with your agreement.
- An entry that no longer matches a scenario (renamed, removed) makes `f3-features` fail: the register cannot drift silently.
- The register lives beside the specs, so a later review does not raise the same scenarios again.

### 10.5 Page objects

A **page object** represents one view, with the name of the view in the views register `ux/views.md`. Its methods are the actions the view offers; its accessors are what it shows and its states (named after its screens `<view>/<state>`, or described by the specs). Step definitions never touch the page directly: they call page objects. Elements are found by **accessible role and name**, never by CSS class or by position.

```ts
// tests/e2e/pages/invoice-editor.ts: page object of the view invoice-editor
export class InvoiceEditor {
  constructor(private readonly page: Page) {}

  async open(invoiceNumber: string): Promise<void> {
    await this.page.goto(`/invoices/${invoiceNumber}`);
    await this.page.getByRole('heading', { name: `Invoice ${invoiceNumber}` }).waitFor();
  }

  async issue(): Promise<void> {
    await this.page.getByRole('button', { name: 'Issue' }).click();
  }

  status(): Locator {
    return this.page.getByRole('status');
  }

  issueError(): Locator {
    return this.page.getByRole('alert');
  }
}
```

```ts
// tests/e2e/steps/invoice.ts: step definitions of the concept Invoice
When('the accountant issues the invoice', async ({ invoiceEditor }) => {
  await invoiceEditor.issue();
});

Then('the invoice {string} has the status {string}', async ({ invoiceEditor }, invoiceNumber: string, status: string) => {
  await invoiceEditor.open(invoiceNumber);
  await expect(invoiceEditor.status()).toHaveText(status);
});
```

Why this matters: when a view is redesigned, only its page object changes; the scenarios and the step definitions stay. And the chain is complete: scenario, step, page object, view of `ux/views.md`, screens in the design tool.

Side effect: an element without an accessible name cannot be found, so the test fails; two actions with the same accessible name on one screen force a test to pick one by position. Both are accessibility defects revealed for free, and they are reported, not worked around.

### 10.6 Classifying a failure

When a scenario fails, the tester establishes facts, proposes, and you decide:

| Facts | Usual proposal |
|---|---|
| Its requirement is in the delta of the change | adapt the test; or a ticket if the application does not do what the scenario says |
| Requirement unchanged, but it goes through a view the change redesigned | adapt the page object of that view only, never the step or the scenario |
| Requirement unchanged, no redesigned view | **regression**: a ticket. A test is never changed to make it pass |
| A defect that existed before the change | backlog |
| The scenario cannot be automated as written, or its data are inconsistent | amendment of the spec, saying explicitly whether it changes what the scenario proves |
| The scenario can only be automated by changing how the application runs | manual, with your agreement (section 10.4) |

Any change to a shared step definition outside the delta appears in the report, with its reason. That is what prevents a regression from being hidden by "adapting" a test.

### 10.7 Layout of the test project

```
tests/e2e/
├── features/              generated feature files, one per capability, versioned, never edited
├── steps/                 step definitions, one file per business concept
├── pages/                 page objects, one per view of ux/views.md; pages/components/ for shared components
├── support/               launch in test mode, test data builders, fixtures
└── manual-scenarios.md    the manual scenarios register
```

The runner and the exact commands are in the End-to-end tests subsection of the Stack section of AGENTS.md.

---

## 11. The backlog

`BACKLOG.md` keeps every idea that is not planned yet:

```markdown
## B-003: Credit notes

- Status: open
- Origin: add-invoice-issuing, propose, 2026-03-02
- Description: cancel an issued invoice by issuing a credit note. Left out of add-invoice-issuing to keep the change small.
```

- Statuses: `open`, `in-progress <change-id>`, `done <change-id>`, `dropped` with its reason.
- Origin: `initial framing`, or the change and the step that produced it (`propose`, `tres-amigos`, `ux-design`, `design`, `design-review`, `conformity`, `acceptance`), with the date.
- Open entries are kept in priority order, which you decide when `/f3-propose` offers a sorting.
- Entries come from the framing, the clarification (out of scope, split), the reviews (points set aside), conformity and acceptance (defects outside the change).
- An entry is never deleted and nothing is added without your agreement. A number is never reused.

When you run `/f3-propose` without argument and nothing is in progress, it shows the backlog and recommends the next change. The backlog is how the workflow stays focused without losing anything.

---

## 12. What is enforced, and what is only asked

Be clear about which controls are mechanisms and which are instructions given to an agent. An instruction is usually followed, but nothing physically prevents an agent from ignoring it.

| Control | Kind |
|---|---|
| Order of the planning artifacts, and apply only after the design review | **mechanism**: the OpenSpec schema blocks |
| A step without definition fails the test generation | **mechanism**: the test runner (except the scenarios skipped during a migration, counted in the reports) |
| Scenario lines that are not steps, or steps in the wrong order | **mechanism**: `f3-features` refuses them |
| An entry of the manual scenarios register that is malformed or matches no scenario | **mechanism**: `f3-features` refuses it |
| Feature files identical after archiving | **mechanism**: checked by `/f3-archive` by regeneration |
| Appearance values only from design tokens | **mechanism** if the Stack section names a lint rule run by the verification command; **instruction** otherwise |
| An agent cannot edit a file outside its writing scope | **mechanism** for the edit tool; **not** for files written through the shell |
| An agent does not see the MCP tools it does not need | **mechanism**: denied tools are removed from its list |
| The tester does not read the application code | **mechanism** for the read tool; instruction for the shell |
| The developer does not modify end-to-end tests | **mechanism** for the edit tool; instruction for the shell |
| Archiving only after a green acceptance | **instruction**: OpenSpec cannot block archiving |
| An amendment of the specs only after your validation, recorded in `tres-amigos.md` | **instruction**; the regeneration at archiving still proves that the archived specs are the tested ones |
| One fact per step, reuse of existing steps | **instruction**, checked by the Test member of Tres Amigos |
| Opening the design screens before coding a view | **instruction**, carried by each task and checked by the design review and by conformity |
| The views register kept in line with the code | **instruction** to the developer, checked by conformity and by the tester, who cannot name a page object without it |
| Every agent checks its frame | **instruction** |

The `operations` guidance of `openspec/config.yaml` is advisory in OpenSpec: the toolkit never relies on it. Rules that must hold live in the schema, the agents and the commands.

---

## 13. Resuming, re-running, reopening

- **Every command can be run again.** It reads the state of the repository at launch (the `` !`...` `` lines of its prompt) and resumes: a clarification at its first empty section, a review at its pending grid rows, a design at its first `todo` element, an implementation at its unchecked tasks, an acceptance at a new pass.
- **A spec is amended, not reopened.** Once the Tres Amigos step is validated, a later step that finds a spec missing, ambiguous or impossible to test (the ux design, the technical design, the design review, the acceptance) proposes an **amendment**: the current text, the proposed text, the reason, and the files of the following steps it affects. You validate the exact text; nothing is written before. The agent then applies it, runs the checks, records it at the end of `tres-amigos.md` (step, reason, before, after) and updates or reports the following files. No step is reopened, and the validations stay valid. Two safeguards: an amendment stays within the proposal of the change (anything else goes to the backlog or to a new change), and an amendment that changes an expected result, removes a scenario or reduces what it proves says so explicitly. When an amendment is only a pragmatic way around a problem, the agent also proposes a backlog entry to rework the requirement in a Tres Amigos session. The developer never amends: it reports. An amendment can also touch what surrounds the specs: bring `proposal.md` in line with the specs (never add a need to it), change the entry of a manual scenario in `tests/e2e/manual-scenarios.md`, or refine a term of `CONTEXT.md`. A point of a design review left "to bring to Tres Amigos" is presented again as an amendment the next time `/f3-design-review` runs.
- **A closed step is reopened only on request.** If you run `/f3-tres-amigos` on a change whose specs are validated, the command says the step is closed, lists the files produced since by the following steps, and asks whether you want to reopen it, knowing that those files will have to be reviewed; for a change of a few requirements, it proposes an amendment instead.
- **One step per session.** Start a new OpenCode session for each command. The files carry the state; a fresh context keeps the agent sharp.
- **Commit between steps.** Several commands stop when files are uncommitted (development resuming on unknown files, acceptance, archiving). Review `git diff` after each step and commit; the commands never commit planning files for you.

---

## 14. Adopting an existing project

`/f3-init` in **adoption** mode brings an existing project to the f3 format without redoing its choices:

- it reads the existing framing files, and only asks about what is missing or contradictory;
- it describes the stack in place and records each structural choice in `arch/decisions.md`, asking you the reason of each one; without a reason, it writes "reason not documented";
- it classifies each existing code rule by the principle it expresses: covered by the invariant part (dropped), technology (Stack section), product (project-specific rule), obsolete (dropped); you decide rule by rule;
- it checks the form of the existing scenarios, reads a sample against the spec-practice rules, and proposes a backlog entry to rewrite them if needed;
- it lists the gaps between the existing code and the invariant rules, each as a proposed backlog entry.

Practical sequence:

1. on a clean Git tree, create a branch for the adoption;
2. check that the OpenSpec skills `openspec-continue-change`, `openspec-apply-change` and `openspec-archive-change` are in `.opencode/skills/`;
3. move your providers, models and agent settings from the project `opencode.json` to `~/.config/opencode/opencode.json`; keep only `instructions` and the MCP servers the project needs;
4. run `/f3-init`, with a prompt that gives the facts the repository cannot tell (language, design tool, which choices were validated and which were not);
5. check that the User interface subsection of the Stack covers the design tokens and components (where they live, how a token is named, how the use of tokens is enforced); if no lint rule enforces it yet, add a backlog entry;
6. if the project has design files, have the ux agent bring them to the current templates: headings and labels, then the content the templates require, without changing any choice of direction;
7. the views register `ux/views.md` is built once, from the code and the design tool, by the developer: the first group of tasks of the next change contains this task whenever the register is missing or incomplete. The ux agent only reads it. The register then shows the displays without screen and the screens under another name, which the conformity check submits to you;
8. review `git diff`, commit, merge;
9. run `/f3-propose`: the backlog contains the work of bringing the rest to the standard, which goes through the normal workflow, in small changes.

Rewriting existing scenarios and end-to-end tests is a change **without behavior change** in the specs: the scenarios are reworded into steps, the tests are rebuilt as feature files, step definitions and page objects. Do it in slices of a few requirements (thirty to forty scenarios is a size a review can absorb). While a capability is only partly rewritten, its other scenarios are skipped rather than failing the generation (section 10.3). A slice also brings the code back in line with the requirements it rewrites: the backlog entries for defects on those requirements join its scope. The old test files are not migrated: each one is deleted by the slice that rewrites the requirements it covered.

---

## 15. Installation and troubleshooting

### 15.1 Prerequisites

- OpenCode.
- OpenSpec, which requires Node.js 20.19.0 or later, with a profile that installs `openspec-continue-change` (`openspec config profile`, then `openspec update` in each project).
- In each project, an end-to-end test runner that reads Gherkin feature files, decided during `/f3-init` (for example Playwright with playwright-bdd).
- Optionally, a design tool with an MCP server (the toolkit provides the Penpot adapter).

### 15.2 Installing

```bash
git clone <your copy of agentic-toolkit> ~/projects/agentic-toolkit
cd ~/projects/agentic-toolkit
./install.sh
```

Restart OpenCode. `./install.sh --remove` removes every link the toolkit created.

### 15.3 Common problems

| Symptom | Cause | Fix |
|---|---|---|
| A command answers under the wrong agent | the command was not launched with `/`, or the agent name is unknown | launch the command with `/f3-...` in a new session; check `~/.config/opencode/agents/` contains the agent |
| "schema f3 not found" | the toolkit is not installed, or the link is broken | run `./install.sh`; `openspec schema which f3` shows where the schema resolves |
| `/f3-design` stops on a missing skill | the OpenSpec profile does not install `openspec-continue-change` | `openspec config profile`, then `openspec update` |
| The next step refuses to start although the previous one is finished | its validation file was not written: the step was not declared finished | relaunch the command of the previous step and declare it finished, or ask its agent to write the validation in the format of its command |
| An agent writes nothing and says it is not allowed | the file is outside its writing scope | run the command meant for that file (see section 6) |
| An agent writes a file in the wrong folder | its session started before a permission change; it wrote where it could | restart OpenCode after any toolkit update, then move the file |
| An agent's context fills up quickly | it loads MCP tools it does not need | deny them in its permissions (`"<server>_*": "deny"`), globally in `~/.config/opencode/opencode.json` for built-in agents such as `explore` |
| The verification command never passes | it includes the end-to-end tests | keep the end-to-end suite out of the verification command; it is run by `/f3-acceptance` |
| A setting seems ignored | a `.opencode` folder or `opencode.json` higher in the directory tree (even in your home folder) overrides it | remove the stray file; keep only the global and the project configuration |

### 15.4 Commands that run on your machine

Some commands insert the output of shell commands into their prompt when you launch them. All of them only read: `git status`, `git branch`, `git rev-parse`, `ls`, `grep`, `head`, `openspec --version`, `openspec schema which`, `openspec status`, and `f3-features --check`. The argument of a command is inserted into these shell commands: pass only a change identifier.

---

## 16. Known limits

- **Archiving cannot be blocked mechanically.** OpenSpec has no field to require an artifact before archiving. `/f3-archive` checks the last acceptance report, but an agent archiving by other means would not.
- **Edit permissions do not cover the shell.** An agent can write a file with a shell command even where its edit permission denies it. The toolkit relies on instructions there, and on Git: every step ends with a diff you review.
- **Subagent permissions.** The conformity mode relies on the built-in `general` subagent having the browser tools while the ux agent does not. In current OpenCode, a subagent applies its own permissions; check it on your version.
- **Positional arguments.** `/f3-ux-design <change-id> conformity` reads its two arguments as `$1` and `$2`. With a single argument, it falls back to the design mode.
- **Feature files check form, not quality.** The conversion guarantees that the scenarios are executed word for word, not that they are well written. Quality comes from spec-practice and the Test member of Tres Amigos; fidelity of the step definitions comes from the independent review during acceptance.
- **Conformity needs an approved design step.** When the interface design of a change is closed as not-applicable, conformity does not run: a display coded without design in that change is only reported by the developer.
- **Tokens are not synchronized automatically.** The design tool is the source; the code takes tokens over through a task of the change that creates or modifies them. A divergence between the two is caught by conformity, not by a mechanism.
- **A scenario cannot be removed alone from a modified requirement.** OpenSpec requires a `MODIFIED` requirement to keep all its existing scenarios. Renaming or dropping a scenario means removing and re-adding the requirement, or keeping its name.

---

## 17. Questions and answers

**Why so many steps for a small change?**
Each step exists because its absence caused a real failure (see `retro/drift-log.md`). For a small change, most steps are short: a Tres Amigos session with no objection takes minutes, a change without interface closes its design step as not-applicable.

**Can I skip a step?**
The schema will not let you write an artifact before the ones it requires, and implementation needs the design review. The design step can be closed as not-applicable when there is no interface. Other steps can be quick, not skipped.

**Why do I never write scenarios myself?**
Because you are the best judge of the behavior, not of the step format. The analyst asks functional questions, writes the examples and the scenarios, and shows them to you.

**Why a separate tester that cannot read the code?**
An agent that knows the code tests what the code does. A tester that only knows the specs tests what the product must do.

**Why a views register, when the code already contains the views?**
Because the tester must not read the code, and still needs the name of each view to name its page objects. The register also links each route to its screens, so a page coded without design is visible at once.

**Why keep manual scenarios in the specs instead of deleting them?**
Because the behavior is still required. Only its proof changes: unit tests for the rule, your check by hand for what is visible. Deleting the scenario would delete the requirement.

**Why English for the toolkit and another language for the content?**
Commands find their way in files through stable keywords; those never change. The content is for you and your team; it is in your language.

**A spec turns out wrong after Tres Amigos. Do I start over?**
No. The agent of the current step proposes an amendment, you validate its exact text, and the work goes on (section 13). A new Tres Amigos session is only for what you want reviewed again by the four viewpoints.

**Where do I put a technical decision?**
In the design.md of the change. If it commits the following changes (a new technology, a new storage), it also goes into `arch/decisions.md`, with its reasons and the options set aside.

**What if the agent and I disagree?**
It says it once, with its reason. You decide. It records your decision and does not come back to it.
