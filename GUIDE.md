# agentic-toolkit: the f3 workflow guide

This guide explains what the agentic-toolkit does, why it is built the way it is, and how to use it, step by step. It assumes you know how to write software. It does not assume you know Claude Code, OpenCode, OpenSpec or agentic programming.

The toolkit runs under **Claude Code** or **OpenCode**, as you choose for each project. The workflow is the same under both; where a tool behaves differently, a note marked **Claude Code.** or **OpenCode.** says how.

All the examples use a fictional invoicing product: accountants who issue invoices to customers. It is unrelated to any real project, and its names only illustrate a form.

## Contents

1. [What the toolkit is](#1-what-the-toolkit-is)
2. [The ideas behind it](#2-the-ideas-behind-it)
3. [The building blocks: Claude Code or OpenCode, and OpenSpec](#3-the-building-blocks-claude-code-or-opencode-and-openspec)
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

The agentic-toolkit is a set of files that you install once on your machine. It teaches an AI coding agent, running in Claude Code or OpenCode, to build software with you in a disciplined way:

- you describe a need;
- an agent asks you functional questions until the need is clear, then writes it down as a specification;
- independent reviewers challenge that specification;
- a designer agent draws the screens;
- an architect agent designs the code and splits the work into tasks;
- independent reviewers challenge that design;
- a developer agent writes the code;
- you check the result, a tester agent proves it against the specification, and the change is archived.

At every step, an agent analyzes and proposes; **you decide**. Nothing is written in a project file without your validation.

The workflow is called **f3**. Each step is launched from a terminal with `f3 <step>`, which runs the command `/f3-<step>` of the toolkit.

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

## 3. The building blocks: Claude Code or OpenCode, and OpenSpec

The toolkit adds nothing to these tools: it configures them, and adds one small command, `f3`, to tie them together.

### 3.1 Claude Code or OpenCode

[Claude Code](https://code.claude.com/docs/) and [OpenCode](https://opencode.ai/docs/) are terminal applications where an AI model works on your repository. The toolkit uses the same notions in both:

- **Agents**: a role for the model, defined in a Markdown file: a description, a system prompt, and what it may not do (which files it may not read or edit, which tools it may not use).
- **Commands**: a reusable prompt, defined in a Markdown file, launched by typing `/name`. A command receives its arguments as `$ARGUMENTS` (all of them) or one by one. It can also insert the output of a shell command into its prompt, with the syntax `` !`command` ``, so the agent starts with the current state of the repository.
- **Skills**: folders of instructions (`SKILL.md` and references) that an agent loads when it needs them, instead of carrying them in every prompt.
- **MCP servers**: external tools the agent can call, such as a browser driver or a design tool. Their tools carry the name of their server, which lets an agent refuse a whole server.
- **Subagents**: an agent can launch another agent, in its own context. Each tool ships a built-in **exploration** subagent (reading and searching) and a built-in **general** subagent (any task).
- **Project files**: the settings a project needs, versioned with it; your own preferences (providers, models, permission modes) stay in your settings.

The toolkit writes the permissions of each agent once, as a table of path rules evaluated in order, where **the last rule that matches wins**. That is why a table can say `"*": deny` first, then allow a few paths after it.

> **Claude Code.** Agents (called subagents in its documentation) list the tools they may not use (`disallowedTools`) and **hooks**, commands that Claude Code runs before each tool call and that can refuse it: the hook of each f3 agent, `f3 guard`, applies its permission table. A command does not choose the agent that runs it: the session does, when it starts (`claude --agent <name>`). Arguments one by one are `$0`, `$1` (counted from zero). If the shell command of a command fails, the command does not start. MCP tools are named `mcp__<server>__<tool>`. Subagents are called through the Agent tool; the built-in ones are `Explore` (read-only, on the model of the session) and `general-purpose`, and a subagent cannot ask you questions: it reports to the agent that called it. Project files: `CLAUDE.md` (instructions loaded in every session, which can import other files with `@file`), `.mcp.json` (MCP servers), `.claude/settings.json` (settings and hooks); your preferences are in `~/.claude/settings.json`.

> **OpenCode.** Agents carry **permissions**, which OpenCode applies itself: the permission table of each f3 agent is written into its file. You switch the active agent with Tab, and a command declares the agent that runs it, so launching the command switches the agent. Arguments one by one are `$1`, `$2`. A shell command that fails does not stop the command. MCP tools are named `<server>_<tool>`. Subagents are called through the subagent tool; the built-in ones are `explore` and `general`. Configuration: `opencode.json`, at two levels, global (`~/.config/opencode/opencode.json`, your preferences) and per project (only what the project needs), merged by OpenCode.

### 3.2 OpenSpec

[OpenSpec](https://openspec.dev/docs) is a command line tool that organizes specification work in a repository:

- `openspec/specs/<capability>/spec.md`: the current specs of the product, one folder per **capability** (a durable behavior, such as `invoicing`).
- `openspec/changes/<change-id>/`: one folder per **change** in progress. A change contains **artifacts** (proposal, delta specs, design, tasks) and, when it is finished, is **archived**: its delta specs are merged into `openspec/specs/` and the folder moves to `openspec/changes/archive/`.
- A **delta spec** describes what the change does to a capability, in sections `ADDED`, `MODIFIED`, `REMOVED` and `RENAMED Requirements`. A `MODIFIED` requirement replaces the whole requirement at archiving, so OpenSpec refuses one that omits an existing scenario.
- A **schema** defines which artifacts a change has, in which order, from which templates, with which instructions for the agent. An artifact is "done" when its file exists; an artifact becomes available only when the artifacts it requires are done. Implementation ("apply") becomes available only when the artifacts the schema lists are done.
- `openspec/config.yaml`: the project's configuration: the schema to use, a `context` (a product description injected into every artifact's instructions), and optional rules.
- OpenSpec installs **skills** in the project, for each tool of the project (`.claude/skills/openspec-*`, `.opencode/skills/openspec-*`), which the f3 commands use: `openspec-continue-change` (write the next artifact), `openspec-apply-change` (implement tasks), `openspec-archive-change` (archive).

The toolkit provides its own schema, **f3**, which adds the steps of the f3 workflow to the default OpenSpec flow.

---

## 4. What the toolkit contains

```
agentic-toolkit/
├── README.md                       short overview
├── GUIDE.md                        this guide
├── install.sh                      renders and links the toolkit for Claude Code, OpenCode or both
├── cli/                            the f3 command (Node.js) and its tests
├── tools/                          what differs between the tools
│   ├── claude/                     frontmatter templates, names of the built-in subagents and tools
│   └── opencode/
├── build/                          the agents and commands rendered for each tool (ignored by Git)
├── tests/ref/                      the expected differences with the reference of each tool
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

The separation between `ux-practice` and `ux-penpot` illustrates a rule of the toolkit: what is specific to a tool lives in one place. Replacing Penpot with another design tool means writing another adapter skill, not rewriting the design workflow. The same rule separates `modules/`, common to Claude Code and OpenCode, from `tools/<tool>/`.

### 4.1 How it plugs in

`install.sh` installs the toolkit for Claude Code, OpenCode or both (section 15.2), with symbolic links:

| From the toolkit | Claude Code | OpenCode |
|---|---|---|
| `build/<tool>/*/agents/*.md`, rendered from `modules/*/agents/` | `~/.claude/agents/` | `~/.config/opencode/agents/` |
| `build/<tool>/*/commands/*.md`, rendered from `modules/*/commands/` | `~/.claude/commands/` | `~/.config/opencode/commands/` |
| `modules/*/skills/*/` | `~/.claude/skills/` | `~/.config/opencode/skills/` |
| `modules/*/scripts/*` | `~/.local/share/f3/scripts/` | the same |
| `modules/*/schemas/*/` | `~/.local/share/openspec/schemas/` | the same |
| `cli/f3.mjs` | `~/.local/bin/f3` | the same |

Both installations can live on one machine. Because they are links, a change in the toolkit is active in every project at once: the skills, scripts and schemas are the files of the toolkit, and `f3` renders the agents and commands again at each launch (4.3). A project refers to the schema by name: `schema: f3` in its `openspec/config.yaml`. OpenSpec looks for a schema of that name in the project (`openspec/schemas/f3/`), then on the machine (the link above), then in its own package.

The `f3` command has these uses:

- `f3 <step> [<arguments>] [-- <prompt>]` launches a step: a new session of the tool of the project, as the agent of the step, running `/f3-<step>` (4.2);
- `f3 tool [claude|opencode]` shows or sets the tool of the project (4.4);
- `f3 state <command>` is the single shell line each command runs at launch: it checks the arguments and the project, and prints the state of the repository the command needs (section 15.4);
- `f3 render [claude|opencode]` renders the agents and commands into `build/` (4.3); `f3` and `install.sh` call it, so you rarely need to;
- under Claude Code only, `f3 guard <agent>` is the hook each agent runs before its tool calls, which applies its permission table, and `f3 guard-prompt` is the hook of the project that refuses an f3 command typed in a session started as another agent.

`f3` alone lists the steps.

> **Claude Code.** The agents are always installed in `~/.claude/agents/`: Claude Code runs the hooks of an agent placed in a project folder only when that folder is trusted.

### 4.2 Launching a step

```
f3 <step> [<arguments>] [-- <prompt>]
```

From a terminal, in the project, `f3 <step>` starts a new session of the tool of the project (4.4), as the agent the command of the step declares, and runs `/f3-<step>` with the arguments.

- **The arguments are identifiers**: lowercase letters, digits and `-`, not starting with `-` (`add-invoice-issuing`, `conformity`). Anything else is refused before the launch, with a reminder to give free text after `--`. One exception: under `f3 propose`, words that are not a single identifier are your idea, for example `f3 propose credit notes for issued invoices`. `f3 <step>` takes no option: a word starting with `-` before `--`, such as `--help`, is refused under every step.
- **A step starts from a terminal, never from a session that f3 started**: the launcher refuses it there, so that an agent running `f3 <step>` in its shell does not open a second session inside its own.
- **The prompt always comes last.** Everything after the first `--` is a prompt for the agent, taken as is and never parsed: a `--`, an option or an identifier written in it is only text, and changes neither the step, nor its arguments, nor the tool. A `--` with nothing after it is refused, to catch a typing error rather than launch the step without the prompt you meant.
- **The prompt never goes through a shell line.** The launcher writes the prompt and the idea into a private file (mode 600, in a private folder of the temporary directory), and starts the tool with the variable `F3_LAUNCH` naming it. `f3 state` reads the file, shows the idea under "Idea from the user:" and the prompt under "Note from the user:", at the end of the launch state, then removes it. The launcher removes its folder when the tool ends.
- **The note refines the request; it does not replace the workflow.** Each command says so: a note lifts no precondition and skips no step.

Examples:

```
f3 dev add-invoice-issuing -- resume at task 2.3, task 2.2 was done by hand
f3 init -- the product is in French, Penpot is the design tool
```

Your shell reads the line before `f3` does: put the prompt between quotes when it contains characters the shell interprets, such as `;`, `'`, `&` or `*` (`f3 init -- "the product's language is French"`).

> **Claude Code.** The launcher runs `claude --agent <agent> "/f3-<step> <arguments>"`.

> **OpenCode.** The launcher runs `opencode --standalone --prompt "/f3-<step> <arguments> "`, with a final space, without which a command with no argument is not sent. `--standalone` makes the OpenCode server a child of the launcher, which is how `F3_LAUNCH` reaches the command; the OpenCode service managed in the background (`opencode serve --service`) does not inherit it (deduced, not tested). You can still type `/f3-<step>` in an OpenCode session: the command switches to its agent and runs, but it receives no prompt, and its argument goes through the shell (section 15.4).

### 4.3 The render, at each launch

The agents and commands are written once, in `modules/`, with a frontmatter common to both tools. They are **rendered** for each tool: the frontmatter of the tool is built from the templates of `tools/<tool>/`, a few names are substituted (the built-in subagents, the subagent tool, the positional arguments), and the tools each agent refuses are translated into the form of the tool. The skills, scripts and schemas are not rendered: they are the same files for both tools.

- The render goes into `build/<tool>`, a link to the last complete render (`build/<tool>.<fingerprint>.<pid>/`). The installation links go through `build/<tool>`, so they never change after the installation. `build/` is ignored by Git.
- **`f3 <step>` and `f3 state` render again at every call**, without comparing dates: a change of the toolkit is active at the next launch, without reinstalling. When nothing changed, nothing is written.
- The link switches in one step to a render written in full beforehand: a session open in another terminal never reads a half-written render. Old renders are removed once the process that wrote them has ended, and never the one the link points to.
- **A failed render launches nothing.** A source with an unknown `{{` marker, an unreadable frontmatter, a read-only toolkit or a full disk make the render fail. The link keeps the last complete render; the launcher shows the error and does not start the tool; `f3 state` reports it, which stops the command. A read-only toolkit works as long as its current render already exists; otherwise, run `install.sh` with the rights to write in the toolkit.
- If `build/` disappears (`git clean -fdX`, a new clone), the next `f3` rebuilds it. Until then, the installation links are dead (section 15.3).
- When `f3 state` finds that the toolkit changed since the last render, the launch state warns that the agent and the command the session loaded may be out of date: start a new session with `f3 <step>`.
- Limit: every `f3` that writes in one `build/` must run on the same machine; a toolkit shared for writing between machines or containers is not supported.

`install.sh --render <dir>` writes the full render of each tool into `<dir>/<tool>/`, laid out like `modules/`, without installing anything. The tests of `cli/` use it to compare each render with the reference version of its tool: every intended difference is listed in `tests/ref/<tool>.diff`, and any other difference fails the tests.

> **OpenCode.** `f3 <step>` renders before starting OpenCode, so the session loads the current agent and command. In a session opened by hand, the agent and the command were loaded when the session started: the warning of the launch state then tells you they may be out of date.

### 4.4 The tool of a project

Each user chooses the tool of each project. The choice is kept in `.f3/local`, at the root of the project, as one line `tool=claude` or `tool=opencode`. It is not versioned: `f3 init` adds `.f3/local` to `.gitignore`, so two developers of the same project can each work with their own tool.

- When `.f3/local` is absent, the first `f3 <step>` writes it: with the only tool f3 is installed for, or, when both are installed, with the tool you choose:

  ```
  f3: Claude Code and OpenCode are both installed.
  Tool for this project (saved in .f3/local; change it with f3 tool <tool>):
    1) Claude Code
    2) OpenCode
  Choice [1-2]:
  ```

  Without a terminal to ask in, `f3` refuses and tells you to run `f3 tool <tool>`.
- `f3 tool` shows the tool of the project; `f3 tool claude` or `f3 tool opencode` changes it. Setting a tool f3 is not installed for is accepted, with a warning; launching a step with it is refused, with the `install.sh` command to run.
- `.f3/local` is read in the current folder: launch `f3` from the root of the project.

The tool you choose has no effect on the versioned files of the project: `f3 init` writes the files of each tool of the project (5.1).

---

## 5. The files of a project

The workflow is a chain of files. Each step reads the files the previous steps wrote and writes its own; no step relies on what an agent remembers. This section describes every file: who writes it, who reads it, and what would break without it.

There are three families:

- the **framing files**, written once by `f3 init` and changed rarely, with the files of each tool of the project (5.1);
- the **files of a change**, which live in the folder of the change and are archived with it (5.3);
- the **registers**, which grow change after change and outlive every change (5.4).

### 5.1 The framing files

| File | Role | Written by | Read by | Without it |
|---|---|---|---|---|
| `openspec/config.yaml` | the **product**: what it does, for whom, its volumes, its constraints, its design tool, its language; and `schema: f3` | the architect, during `f3 init` | every OpenSpec artifact (its `context` is injected into their instructions) | agents design for an imagined product: wrong volumes, wrong platform |
| `AGENTS.md` | the **code rules**: an invariant part (architecture style, naming, tests, Git) and a Stack section (this project's technologies and commands) | the architect, during `f3 init` and the design steps | every agent, in every session | each agent applies its own habits; commands do not know how to verify or test |
| `CONTEXT.md` | the **vocabulary**: each business term, with the English term used in code | the analyst (and `f3 init`) | every agent, in every session | the same concept gets three names in code, specs and screens |
| `CLAUDE.md` (Claude Code) | `@AGENTS.md` and `@CONTEXT.md`, so that every session loads the code rules and the vocabulary | the architect, during `f3 init` | Claude Code | agents miss the code rules (Claude Code reads `AGENTS.md` alone only when there is no `CLAUDE.md`) or the vocabulary |
| `.mcp.json` (Claude Code) | the MCP servers the project needs: the observer of the running application, the design tool | the architect, during `f3 init`, when the Stack section decides a server | Claude Code | agents miss their tools |
| `.claude/settings.json` (Claude Code) | the hook that makes each f3 command run as its agent (`f3 guard-prompt`) | the architect, during `f3 init` | Claude Code | a step typed in the wrong session runs under the wrong agent |
| `opencode.json` (OpenCode, project) | only the workflow keys: `instructions` (to load `CONTEXT.md`) and the MCP servers the project needs | the architect, during `f3 init` | OpenCode | agents miss the vocabulary or the tools; personal settings leak into the repository |
| `.gitignore` | the line `.f3/local`: the tool of each user is not versioned (4.4) | the architect, during `f3 init` | Git | one user's tool is imposed on the others |

#### The files of each tool

`f3 init` writes the files of **each tool of the project**, whatever tool you launch it with. A tool is a tool of the project when f3 is installed for it on your machine, or when the project already has one of its files: `CLAUDE.md`, `.mcp.json` or `.claude/settings.json` for Claude Code, `opencode.json` for OpenCode, or the OpenSpec skills of the tool (`.claude/skills/openspec-*`, `.opencode/skills/openspec-*`). A project shared by a team that uses both tools versions both sets, and `f3 init` runs `openspec init --tools claude,opencode` for it.

The MCP servers are decided once, in the Stack section of AGENTS.md. `.mcp.json` and `opencode.json` are two translations of that decision, not two sources: they name the same servers (`playwright` for Playwright, `penpot` for Penpot), names on which the tools each agent refuses depend.

In a framed project, the launch state of **every** command adds a warning line, which does not block, when:

- a tool of the project lacks a file `f3 init` always writes (`CLAUDE.md` and `.claude/settings.json`; `opencode.json`), or, once `openspec/` exists, its OpenSpec skills (`.mcp.json` is written only when a server is decided);
- `.f3/local` is not ignored by Git;
- the MCP servers of `opencode.json` and `.mcp.json` have different names, or one of the files cannot be read.

Each warning tells you to run `f3 init`, theme Tools (step 0).

### 5.2 The two parts of AGENTS.md

The **invariant part** is identical in every project. It states the architecture style (bounded contexts, a core module per bounded context that knows no technology, adapters behind ports, entry points that call exactly one use case, a composition root) and the standards (naming, single verification command, test responsibilities, Git). For example, its rule 11:

> **Domain identity at the boundaries.** Outside the adapters that store or read it, a business object is always designated by its domain identity. A technical identifier never crosses a port, an entry point or an output contract. [...] Example: an invoice attachment is read through `GET /invoices/{invoiceId}/attachment`, never through `?path=...`.

The **Stack section** is written for the project during `f3 init`, from the stack decision. It answers fixed questions in fixed subsections, and the commands of the workflow refer to them by name:

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
| `.openspec.yaml` | OpenSpec, when `f3 propose` creates the change | the metadata of the change, including its schema | OpenSpec | OpenSpec knows which steps the change follows |
| `clarification.md` | the analyst (`f3 propose`) | the clarified need, section by section: Need, Scope (in, out, decisions against advice), Vocabulary, Behavior, Rules and edge cases, Examples, Security, Open points | the analyst (proposal, specs), Tres Amigos, the architect | the specs are derived from validated answers, not from the analyst's guesses; an interrupted interview resumes at the first empty section |
| `proposal.md` | the analyst (`f3 propose`) | why and what: the capabilities added or modified, what is out of scope | every following step | the scope is written once; later steps can detect what exceeds it |
| `specs/<capability>/spec.md` | the analyst (`f3 propose`), corrected in Tres Amigos | the **delta specs**: requirements and scenarios added, modified, removed or renamed | everyone; `f3-features` turns them into feature files | the contract of the change: what will be built, designed and proven |
| `tres-amigos.md` | the analyst, chairing `f3 tres-amigos` | the record of each session: the raw reports of the four members, the grid of decisions, the dismissed points; then the amendments of the specs made by the following steps (section 13) | you, later sessions | each decision has its reason; a later session does not argue it again |
| `validations/amigos.md` | `f3 tres-amigos`, when you declare the specs ready | the validation of the step | OpenSpec (unblocks the next step) | without it, the schema refuses the interface design |
| `ux.md` | the ux agent (`f3 ux-design`); the analyst may write appearance wishes in it | the design delta: intentions, views, components, icons, tokens, conflicts, proposed cross-cutting decisions. It names and decides; it holds no appearance value | the architect (Interface section of the design), the developer, `f3 archive` | the names the code, the screens and the tests will share are decided once |
| `ux-design.md` | the ux agent (`f3 ux-design`) | the progress tracking of the design: each step of the impact analysis, each icon, component and screen with its status, and the conformity results | the ux agent, at each run | the design is done one unit per run; each run resumes where the previous one stopped |
| `validations/ux.md` | `f3 ux-design`, when you declare the design finished, or close it as not-applicable | the validation of the step | OpenSpec | without it, the schema refuses the technical design |
| `design.md` | the architect (`f3 design`) | how the change is built: decisions, Interface (views, components and tokens of `ux.md`), Volumetry, **Test strategy** (unit and integration tests, test entry points, replacement coverage of manual scenarios) | the design review, the developer, the tester | technical choices are written and reviewable before any code |
| `tasks.md` | the architect (`f3 design`); fix groups added by the tester and the ux agent | the work, split into functional slices, each citing the scenarios it delivers; the checkboxes the developer ticks | the developer, the design review | the developer works from an explicit, reviewed list; OpenSpec tracks progress |
| `review.md` | the architect, chairing `f3 design-review` | the record of the design review: reports, grid, decisions | you, later sessions | same as `tres-amigos.md`, for the design |
| `validations/review.md` | `f3 design-review`, when you declare the design ready | the validation of the step | OpenSpec | without it, implementation (apply) is refused |
| `conformity/<view>--<state>.png` | the built-in general subagent, for `f3 ux-design <change-id> conformity` | captures of the running application, one per approved screen | the ux agent, you | the comparison with the design screens is made on images, not on descriptions |
| `acceptance/pass-NN.md` | the tester (`f3 acceptance`), one per pass | the report of an acceptance pass: delta, tests written, fidelity review, failures and decisions, tickets, backlog entries, tested commit, conclusion | you, `f3 archive` | the proof that the change does what its specs say, at a given commit; `f3 archive` refuses a change whose last pass is not green |

Three of these files are **validations**. They contain a date, the decision and a summary, and they are what OpenSpec looks at: an artifact is done when its file exists. A command writes its validation only when you declare the step finished, so a step can take several sessions.

### 5.4 The registers

These files outlive every change. They are read at the start of a step and enriched as the project goes.

| File | Role | Written by, and when | Read by | Why it is needed |
|---|---|---|---|---|
| `openspec/specs/` | the current behavior of the product | OpenSpec, when `f3 archive` merges the delta specs | everyone | the reference every new change is compared with |
| `CONTEXT.md` | the vocabulary (see 5.1) | the analyst, during `f3 propose` and Tres Amigos | every agent | one concept, one name |
| `BACKLOG.md` | the ideas not planned yet, in priority order (section 11) | the agent that finds an idea, with your agreement; `f3 propose` sorts it | `f3 propose` | staying focused never loses an idea |
| `arch/decisions.md` | the structural decisions, with their reasons and the options set aside | the architect, during `f3 init` and `f3 design` | the architect, the design review | a choice is not reopened by accident, and its reason survives |
| `ux/brief.md` | the art direction | the ux agent, during `f3 ux-direction` | the ux agent | every screen follows one direction |
| `ux/decisions.md` | the design decisions that hold for the whole product | the architect, when `f3 archive` takes them from `ux.md` | the ux agent | a choice made in one change applies to the next ones |
| `ux/cookbook.md` | the verified recipes for the design tool | the ux agent, during `f3 ux-calibrate` and any work in the tool | the ux agent | the agent does not rediscover the tool's API in every session |
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

Why separate agents: a role shapes behavior. An agent called "architect" that leads a functional interview drifts towards technical solutions; an agent that writes both the code and its acceptance tests declares its own work finished. Each command declares its agent, and `f3 <step>` starts the session as that agent, so you never choose an agent by hand.

The tester's isolation is deliberate: it reads the specs, the feature files, the Stack section, the Test strategy of the design, the impact of `ux.md`, the views register, and the running application. What it does not know, it cannot use to make a test pass.

Each agent also only sees the MCP tools it needs: the analyst has no browser and no design tool; the tester has the browser but not the design tool. A tool denied to an agent (the `deny-tools` list of its file) is removed from its tool list, which also saves context. Each agent also has a **permission table** (`<agent>.permission`, next to its file): the paths it may edit, and for the tester the paths it may read. What each tool enforces of it is in section 12.

---

## 7. The workflow at a glance

```
once per project      f3 init ── f3 ux-calibrate ── f3 ux-direction ── f3 ux-tokens

per change            f3 propose          clarification, proposal, specs      analyst
                           │
                      f3 tres-amigos      specs reviewed by 4 viewpoints      analyst + 4 exploration
                           │
                      f3 ux-design        impact, components, screens         ux
                           │
                      f3 design           design.md, tasks.md                 architect
                           │
                      f3 design-review    design reviewed by 3 viewpoints     architect + 3 exploration
                           │
                      f3 dev              code, unit and integration tests,   developer
                           │               views register
                      your check of the journeys, then
                      f3 ux-design <change> conformity                        ux + general
                           │
                      f3 acceptance       feature files, steps, page objects  tester + itself
                           │   failures: adapt the test │ ticket → f3 dev │ amend │ backlog │ manual
                           │
                      f3 archive          merge specs, check, merge branch    architect
```

"exploration" and "general" are the built-in subagents of the tool: `Explore` and `general-purpose` under Claude Code, `explore` and `general` under OpenCode. The tester calls itself as a subagent for the fidelity review of its tests.

The OpenSpec schema enforces the order of the planning steps: an artifact cannot be written before the artifacts it requires exist, and implementation cannot start before the design review is validated.

| Artifact of the schema | File | Written by | Requires |
|---|---|---|---|
| clarification | `clarification.md` | `f3 propose` | nothing |
| proposal | `proposal.md` | `f3 propose` | clarification |
| specs | `specs/<capability>/spec.md` | `f3 propose` | proposal |
| amigos | `validations/amigos.md` | `f3 tres-amigos` | specs |
| ux | `validations/ux.md` | `f3 ux-design` | amigos |
| design | `design.md` | `f3 design` | specs, ux |
| tasks | `tasks.md` | `f3 design` | specs, design |
| review | `validations/review.md` | `f3 design-review` | tasks |
| (apply) | code | `f3 dev` | review |

A step conducted by a command is done when its **validation file** exists. The command writes it only when you declare the step finished, so that you can run the step in several sessions.

---

## 8. The steps, one by one

Each step below gives: its purpose, the command, what you do, what it produces, and what to watch. Launch each command from a terminal with `f3 <step> <arguments>`: it starts a **new session** as the agent of the step (section 4.2). A fresh context per step keeps the agent focused, and the files carry the state.

### Step 0: framing the project, once (`f3 init`)

**Purpose.** Describe the product, decide the stack, and write the framing files.

**Agent.** architect.

**Modes.** The command reads the repository and picks a mode:
- **creation**: no framing file exists;
- **adoption**: files exist, but not in the f3 format (see section 14);
- **update**: the project is already framed; you say which themes to review. The theme **Tools** writes the missing files of the tools of the project (5.1), aligns the MCP servers of their files on the Stack section, adds `.f3/local` to `.gitignore`, and rewrites the marker of AGENTS.md in its current form; it touches nothing else. The command proposes it first when the launch state reports a tool that lacks files, `.f3/local` not ignored by Git, MCP servers that differ, or the marker of AGENTS.md in its former form ("written by /f3-init").

**What you do.** Answer an interview, one question at a time, each with a recommended answer: product, users, expected behavior, volumetry, platform and constraints, security and data, design tool, language, vocabulary. Then the **stack phase**:

1. the agent derives the technical constraints from your answers, and you correct them;
2. it checks on the web the current state of each candidate technology (version, maintenance, license) and cites its sources;
3. it presents two or three really different combinations, with how each answers the constraints, the architecture, the workflow (design tool, end-to-end driving, observation of the running app) and durability, and recommends one;
4. you decide; the decision becomes entry A-001 of `arch/decisions.md`;
5. it writes the Stack section of AGENTS.md, and you validate it;
6. it adds a first backlog entry: set up the repository according to the Stack section.

**Produces.** `AGENTS.md`, `openspec/config.yaml`, `CONTEXT.md`, `arch/decisions.md`, `BACKLOG.md`, the files of each tool of the project (5.1), and the line `.f3/local` of `.gitignore`. If `openspec/` does not exist, it first runs `openspec init --tools <tools of the project>`. If it exists and a tool of the project has no OpenSpec skills, the theme Tools runs `openspec init --tools <tool>`, which adds only the files of that tool. Nothing is committed: you review `git diff` and commit.

> **Claude Code.** At the first f3 session in the project, each developer trusts the folder and approves the servers of `.mcp.json`.

> **OpenCode.** The command proposes to move the user preferences found in the project `opencode.json` (providers, models, agent settings) to `~/.config/opencode/opencode.json`, and moves them only with your agreement. OpenCode reads its configuration at startup: a session opened by hand must be restarted after a change of `opencode.json`. The first web search of the agent asks you, in the session, to allow it: answer within a minute, or OpenCode cancels the search.

**Example of a context part** (fictional invoicing product):

```yaml
  Volumetry
  - Up to 50,000 invoices per company per year; lists must stay usable without loading every invoice.
  - An invoice has at most 200 lines.
```

A good context line lets someone decide a concrete case. "Fast" is not a context line; "a list of 50,000 invoices opens in under a second" is.

### Step 0': the design setup, once (`f3 ux-calibrate`, `f3 ux-direction`, `f3 ux-tokens`)

Only if the project uses a design tool.

- **`f3 ux-calibrate`** verifies, on a dedicated empty file of the design tool, how to perform each basic operation (create a page, a board, a component with variants, tokens, export an image), and writes each working recipe in `ux/cookbook.md`. Run it again after an update of the design tool: it checks each recipe again and fixes those that no longer work. Why: an agent that rediscovers a tool's API in every session wastes its context and repeats the same mistakes.
- **`f3 ux-direction`** analyzes the product, draws **two clearly contrasting art directions** in the tool, lets you choose or combine, then writes `ux/brief.md` section by section with you (principles, reference colors, typography, icons, anti-references, accessibility, platform, component library). Why: a direction chosen from text produces a default theme; a direction chosen from drawings has an identity.
- **`f3 ux-tokens`** creates the design tokens in the tool (global values, semantic roles per theme, component tokens later), checks the contrasts by computation, shows them on a preview, and lets you adjust.

The design tool is the only source of appearance. The code takes it over by opening the components and screens in the tool, and by using the tokens by their name.

### Step 1: proposing a change (`f3 propose`)

**Purpose.** Turn an idea into a clear, small, specified change.

**Agent.** analyst.

**How to start it.**
- `f3 propose` alone: it offers to resume a clarification in progress, or shows the backlog, proposes a sorting, and recommends the next change.
- `f3 propose credit notes for issued invoices`: it clarifies this idea.
- `f3 propose add-credit-notes`: it resumes that change.

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

### Step 2: the Tres Amigos session (`f3 tres-amigos <change-id>`)

**Purpose.** Make the specs complete and unambiguous before anyone designs or codes.

**Agent.** analyst, as chair, with four members convened one after the other as built-in exploration subagents (`Explore` under Claude Code, `explore` under OpenCode):

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

### Step 3: the interface design (`f3 ux-design <change-id>`)

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

### Step 4: the technical design and the tasks (`f3 design <change-id>`)

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

### Step 5: the design review (`f3 design-review <change-id>`)

**Purpose.** Challenge the design and the tasks before a line of code is written.

**Agent.** architect, as chair, with three members, built-in exploration subagents (`Explore` under Claude Code, `explore` under OpenCode):

| Member | Viewpoint |
|---|---|
| Architect | compliance with AGENTS.md and `arch/decisions.md`, consistency with existing code, volumetry, unjustified choices |
| Technical security | attack surfaces, input validation, isolation, secrets, test entry points active outside test mode |
| Product | traceability: each scenario delivered by exactly one group, tasks that serve no scenario, view names, `Screens:` lines, test entry points present |

Same mechanism as Tres Amigos: grid, your decisions, application to design.md and tasks.md, record in `review.md`. A point that requires changing the specs is proposed as an amendment (section 13); you may prefer to bring it to a Tres Amigos session instead. When you declare the design ready, `validations/review.md` unlocks implementation.

**What to watch.** The chair is the author of the design. Read the raw reports of the members in `review.md`, not only the grid.

### Step 6: development (`f3 dev <change-id>`)

**Purpose.** Write the code.

**Agent.** developer, through the OpenSpec apply workflow.

The developer creates the branch of the change, implements each task with its unit and integration tests, runs the verification command, checks the task, and commits, one commit per task. Groups titled "Acceptance fixes" or "Conformity fixes" (added later by the tester or the ux agent) come first. The command can be run again: it resumes the unchecked tasks.

For a task on a view or a component:
- it opens the screens listed after `Screens:` in the design tool and takes appearance from there, never from the text of `ux.md`;
- appearance values come only from the design tokens, used by name where the Stack section says they live, never as raw values;
- each component instance of a screen is the code component of the same name, created on its own if it does not exist yet, never inside the view;
- it updates the entry of the view in `ux/views.md` in the same commit.

It stops and reports when the design contradicts the specs, when a state of the specs has no screen, when a name differs between code and design, or when the design uses a value that has no token. At the end, it lists what it reported, the displays of `ux/views.md` without screen, and what the manual scenarios of the change ask you to check by hand.

### Step 7: your check, then conformity (`f3 ux-design <change-id> conformity`)

**Your check.** Launch the application and try the journeys of the change yourself, including the checks by hand that the developer listed for the manual scenarios. Nothing replaces it, and it is cheap at this point.

**Conformity.** Only when the interface design step was approved (not when it was closed as not-applicable). The ux agent delegates to the built-in general subagent (`general-purpose` under Claude Code, `general` under OpenCode) the capture of each approved screen in the running application, through the display under which `ux/views.md` lists it, then compares each capture with the design screen and lists the deviations. Each display of `ux/views.md` without screen is also a deviation. For each one, you decide:
- **ticket**: a task in a "Conformity fixes" group of tasks.md, for `f3 dev`;
- **design update**: the implementation is better, the screen is updated in the tool; for a display coded without design, its screens are drawn;
- **backlog**.

### Step 8: acceptance (`f3 acceptance <change-id>`)

**Purpose.** Prove each scenario on the launched application, and catch regressions.

**Agent.** tester, who never reads the application code.

What happens:
1. the feature files are regenerated from the specs with the delta of the change; the manual scenarios are tagged `@manual` and excluded;
2. the test runner lists the steps without definition; the tester writes them, adapts the steps of modified requirements, and writes or adapts the **page objects** of the views involved, named after `ux/views.md`;
3. the tester, called as a subagent in a fresh context and under the same reading rules, reviews the new and changed step definitions and page objects: does each definition do exactly what its sentence says?
4. the whole suite runs;
5. each failure is presented with its facts and a proposal (adapt the test, ticket for the developer, amendment of the spec, backlog, or manual under the conditions of section 10.4), following the classification in section 10.6; you decide;
6. the pass report is written in `acceptance/pass-NN.md`, and the tests and the report are committed.

Green means every scenario passes (except, during a migration, the scenarios outside the delta that are skipped for a missing step) and no ticket was added. Red with tickets means `f3 dev`, then `f3 acceptance` again: each run is a new pass, and a pass never modifies the report of a previous one.

### Step 9: archiving (`f3 archive <change-id>`)

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

You run `f3 propose let the accountant issue an invoice`.

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

`f3 dev add-invoice-issuing`: the developer creates `feat/add-invoice-issuing`, implements group 1, then group 2 (opening the four screens before task 2.3), then group 3, one commit per task. With task 2.3, it adds the entry of `invoice-editor` to `ux/views.md`, with its display `/invoices/:number (page)` and its four screens.

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

The tester writes the page object `InvoiceEditor`, named after `ux/views.md`, and the step definitions (see section 10.5). The fidelity reviewer notices that the definition of "the invoice ... has the status ..." read the status of whatever invoice was displayed, without opening the one named in the sentence; the tester fixes it. One scenario fails: the refusal message is "Line amount missing" instead of "A line has no amount". The requirement is in the delta, the application does not do what the spec says: you choose **ticket**. A group "Acceptance fixes, pass 01" is added to tasks.md; `f3 dev` fixes it; `f3 acceptance` passes green.

### 9.10 Archiving

`f3 archive add-invoice-issuing` merges the specs, checks that the regenerated feature file is identical to the tested one, sets backlog entry B-002 to `done add-invoice-issuing`, and merges the branch.

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
node ~/.local/share/f3/scripts/f3-features.mjs                 main specs only
node ~/.local/share/f3/scripts/f3-features.mjs <change-id>     main specs with the delta of that change
node ~/.local/share/f3/scripts/f3-features.mjs --check [<id>]  same conversion, nothing written
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
- Open entries are kept in priority order, which you decide when `f3 propose` offers a sorting.
- Entries come from the framing, the clarification (out of scope, split), the reviews (points set aside), conformity and acceptance (defects outside the change).
- An entry is never deleted and nothing is added without your agreement. A number is never reused.

When you run `f3 propose` without argument and nothing is in progress, it shows the backlog and recommends the next change. The backlog is how the workflow stays focused without losing anything.

---

## 12. What is enforced, and what is only asked

Be clear about which controls are mechanisms and which are instructions given to an agent. An instruction is usually followed, but nothing physically prevents an agent from ignoring it.

The workflow is the same under Claude Code and OpenCode; some of its controls are not. These hold under both tools:

| Control | Kind |
|---|---|
| Order of the planning artifacts, and apply only after the design review | **mechanism**: the OpenSpec schema blocks |
| A step without definition fails the test generation | **mechanism**: the test runner (except the scenarios skipped during a migration, counted in the reports) |
| Scenario lines that are not steps, or steps in the wrong order | **mechanism**: `f3-features` refuses them |
| An entry of the manual scenarios register that is malformed or matches no scenario | **mechanism**: `f3-features` refuses it |
| Feature files identical after archiving | **mechanism**: checked by `f3 archive` by regeneration |
| Appearance values only from design tokens | **mechanism** if the Stack section names a lint rule run by the verification command; **instruction** otherwise |
| A step launched with `f3 <step>` receives only identifiers as arguments, and its prompt never goes through a shell line | **mechanism**: the launcher refuses any other argument, and passes the prompt through a file (4.2) |
| An agent does not see the MCP tools it does not need | **mechanism**: denied tools are removed from its list |
| A note from the user does not lift a precondition nor skip a step | **instruction** of each command |
| Archiving only after a green acceptance | **instruction**: OpenSpec cannot block archiving |
| An amendment of the specs only after your validation, recorded in `tres-amigos.md` | **instruction**; the regeneration at archiving still proves that the archived specs are the tested ones |
| One fact per step, reuse of existing steps | **instruction**, checked by the Test member of Tres Amigos |
| Opening the design screens before coding a view | **instruction**, carried by each task and checked by the design review and by conformity |
| The views register kept in line with the code | **instruction** to the developer, checked by conformity and by the tester, who cannot name a page object without it |
| Every agent checks its frame | **instruction** |

These depend on the tool:

| Control | Claude Code | OpenCode |
|---|---|---|
| A step runs under its agent | **mechanism**: `f3 <step>` starts the session as the agent of the step, and the hook of `.claude/settings.json` (`f3 guard-prompt`) refuses an f3 command typed in a session started as another agent | **mechanism**: the command switches the session to its agent |
| The argument of a command names a change in progress; the project is framed; the render succeeded; `f3` is found | **mechanism**: `f3 state` fails, and Claude Code does not start the command | **instruction**: a failing injection does not stop the command; the line that follows it tells the agent to show the error and stop |
| A step of the workflow is never launched by the model itself | **mechanism**: the commands have `disable-model-invocation` | the OpenCode commands of the toolkit have no such key |
| An agent cannot edit a file outside its writing scope | **mechanism** for the edit tools, through its guard hook; **not** for files written through the shell | **mechanism** for the edit tool, through its permissions; **not** for files written through the shell |
| The tester does not read the application code | **mechanism** for the Read tool (by path), for the reading programs of the shell (`cat`, `sed`, `git diff`, `node -e`…), for the search programs (`grep`, `rg`, `find`, permitted only in the paths it may read) and for subagents, through its guard hook; **instruction** for the rest, such as a script that reads a file | **mechanism** for the read tool only; **instruction** for glob, grep and the shell, which can still read the code |
| The tester calls no subagent but itself | its guard hook | the `subagent` permission of OpenCode |
| The developer does not modify end-to-end tests | **mechanism** for the edit tools; instruction for the shell | **mechanism** for the edit tool; instruction for the shell |
| The guard itself fails (error, `f3` not found) | **mechanism**: the call is refused | no guard: OpenCode applies the permissions itself |
| An f3 agent called as a subagent stays within its scope | **mechanism**: its guard hook applies in subagent mode too; that it writes nothing at all is an **instruction** of the f3-agent skill | its own permissions apply (section 16); that it writes nothing at all is an **instruction** of the f3-agent skill |

Why the difference: OpenCode applies the permissions of an agent itself, and Claude Code does not, so under Claude Code the guard hook of each agent applies its permission table. The same table is written once for both tools. Under OpenCode, closing the tester's gap through the shell would take a plugin: it is not part of the toolkit, and the gap is documented here and in section 16.

The `operations` guidance of `openspec/config.yaml` is advisory in OpenSpec: the toolkit never relies on it. Rules that must hold live in the schema, the agents and the commands.

---

## 13. Resuming, re-running, reopening

- **Every command can be run again.** It reads the state of the repository at launch (the `f3 state` line of its prompt) and resumes: a clarification at its first empty section, a review at its pending grid rows, a design at its first `todo` element, an implementation at its unchecked tasks, an acceptance at a new pass.
- **A spec is amended, not reopened.** Once the Tres Amigos step is validated, a later step that finds a spec missing, ambiguous or impossible to test (the ux design, the technical design, the design review, the acceptance) proposes an **amendment**: the current text, the proposed text, the reason, and the files of the following steps it affects. You validate the exact text; nothing is written before. The agent then applies it, runs the checks, records it at the end of `tres-amigos.md` (step, reason, before, after) and updates or reports the following files. No step is reopened, and the validations stay valid. Two safeguards: an amendment stays within the proposal of the change (anything else goes to the backlog or to a new change), and an amendment that changes an expected result, removes a scenario or reduces what it proves says so explicitly. When an amendment is only a pragmatic way around a problem, the agent also proposes a backlog entry to rework the requirement in a Tres Amigos session. The developer never amends: it reports. An amendment can also touch what surrounds the specs: bring `proposal.md` in line with the specs (never add a need to it), change the entry of a manual scenario in `tests/e2e/manual-scenarios.md`, or refine a term of `CONTEXT.md`. A point of a design review left "to bring to Tres Amigos" is presented again as an amendment the next time `f3 design-review` runs.
- **A closed step is reopened only on request.** If you run `f3 tres-amigos` on a change whose specs are validated, the command says the step is closed, lists the files produced since by the following steps, and asks whether you want to reopen it, knowing that those files will have to be reviewed; for a change of a few requirements, it proposes an amendment instead.
- **One step per session.** `f3 <step>` starts a new session of the tool for each command. The files carry the state; a fresh context keeps the agent sharp.
- **Commit between steps.** Several commands stop when files are uncommitted (development resuming on unknown files, acceptance, archiving). Review `git diff` after each step and commit; the commands never commit planning files for you.

---

## 14. Adopting an existing project

`f3 init` in **adoption** mode brings an existing project to the f3 format without redoing its choices:

- it reads the existing framing files, and only asks about what is missing or contradictory;
- it describes the stack in place and records each structural choice in `arch/decisions.md`, asking you the reason of each one; without a reason, it writes "reason not documented";
- it classifies each existing code rule by the principle it expresses: covered by the invariant part (dropped), technology (Stack section), product (project-specific rule), obsolete (dropped); you decide rule by rule;
- it checks the form of the existing scenarios, reads a sample against the spec-practice rules, and proposes a backlog entry to rewrite them if needed;
- it lists the gaps between the existing code and the invariant rules, each as a proposed backlog entry.

Practical sequence:

1. on a clean Git tree, create a branch for the adoption;
2. check that the OpenSpec skills `openspec-continue-change`, `openspec-apply-change` and `openspec-archive-change` are in the skills folder of each tool of the project (`.claude/skills/`, `.opencode/skills/`); if `openspec/` exists without them for a tool, `openspec init --tools <tool>` adds them, without touching the files of the other tool;
3. under OpenCode, keep in the project `opencode.json` only `instructions` and the MCP servers the project needs: `f3 init` proposes to move your providers, models and agent settings to `~/.config/opencode/opencode.json`, and moves them only with your agreement;
4. run `f3 init`, with a prompt after `--` that gives the facts the repository cannot tell (language, design tool, which choices were validated and which were not), for example `f3 init -- the product is in French, Penpot is the design tool, the choice of PostgreSQL was validated, the message queue was not` (section 4.2);
5. check that the User interface subsection of the Stack covers the design tokens and components (where they live, how a token is named, how the use of tokens is enforced); if no lint rule enforces it yet, add a backlog entry;
6. if the project has design files, have the ux agent bring them to the current templates: headings and labels, then the content the templates require, without changing any choice of direction;
7. the views register `ux/views.md` is built once, from the code and the design tool, by the developer: the first group of tasks of the next change contains this task whenever the register is missing or incomplete. The ux agent only reads it. The register then shows the displays without screen and the screens under another name, which the conformity check submits to you;
8. review `git diff`, commit, merge;
9. run `f3 propose`: the backlog contains the work of bringing the rest to the standard, which goes through the normal workflow, in small changes.

Rewriting existing scenarios and end-to-end tests is a change **without behavior change** in the specs: the scenarios are reworded into steps, the tests are rebuilt as feature files, step definitions and page objects. Do it in slices of a few requirements (thirty to forty scenarios is a size a review can absorb). While a capability is only partly rewritten, its other scenarios are skipped rather than failing the generation (section 10.3). A slice also brings the code back in line with the requirements it rewrites: the backlog entries for defects on those requirements join its scope. The old test files are not migrated: each one is deleted by the slice that rewrites the requirements it covered.

### 14.1 A project framed for one tool

A project framed before the toolkit ran under both tools has the files of one tool only (`opencode.json`, or `CLAUDE.md` and `.mcp.json`), and its AGENTS.md marker says "written by /f3-init". There is no migration command: the launch state of each command warns about what is missing (section 5.1), and `f3 init` in update mode proposes the theme Tools first. The theme writes the files of the tools of the project that are missing, aligns their MCP servers on the Stack section, adds `.f3/local` to `.gitignore` and rewrites the marker; it touches nothing else. Review `git diff`, then commit.

---

## 15. Installation and troubleshooting

### 15.1 Prerequisites

- Claude Code, OpenCode, or both.
- Node.js 20.19.0 or later, for OpenSpec, the render and the `f3` command; and `~/.local/bin` in your `PATH`.
- OpenSpec, with a profile that installs `openspec-continue-change` (`openspec config profile`, then `openspec update` in each project).
- In each project, an end-to-end test runner that reads Gherkin feature files, decided during `f3 init` (for example Playwright with playwright-bdd).
- Optionally, a design tool with an MCP server (the toolkit provides the Penpot adapter).

`install.sh` stops when Node.js is missing or older than 20.19.0. A tool you install for, OpenSpec, or `~/.local/bin` missing from the `PATH` only gives a warning: they can be installed afterwards.

Checked versions: Claude Code 2.1.319, OpenCode 2.2.5, OpenSpec 1.16.0. After updating one of them, run `node --test cli/test/*.test.mjs` in the toolkit: it renders both tools and compares each render with the reference of its tool.

### 15.2 Installing

```bash
git clone <your copy of agentic-toolkit> ~/projects/agentic-toolkit
cd ~/projects/agentic-toolkit
./install.sh
```

Without argument, `install.sh` asks which tool to install for: 1) Claude Code, 2) OpenCode, 3) both. In a script, give the answer as an argument: `./install.sh claude`, `./install.sh opencode` or `./install.sh all`. For each tool, it renders the agents and commands into `build/<tool>`, then links them (section 4.1), and removes the dead links it left behind; if a render fails, it touches no link. Run it again after adding an agent, a command, a skill or a script; a change of an existing file needs no reinstallation (section 4.3).

`./install.sh --remove` removes every link the toolkit created, for both tools. `./install.sh --render <dir>` renders each tool into `<dir>/<tool>/` and installs nothing.

Then, in a project, launch each step from a terminal with `f3 <step> <arguments>`; `f3` alone lists the steps. The first `f3 <step>` of a project sets its tool (section 4.4).

> **Claude Code.** New Claude Code sessions load the agents, commands and skills. The first time you work in a project, Claude Code asks you to trust its folder, then to approve the MCP servers of its `.mcp.json`.

> **OpenCode.** `f3 <step>` starts a new OpenCode process each time; a session you opened by hand must be restarted to load the agents, commands and skills.

### 15.3 Common problems

| Symptom | Tool | Cause | Fix |
|---|---|---|---|
| A command is refused with "runs as the <agent> agent" | Claude Code | it was typed in a session started otherwise | quit, and launch it from a terminal with `f3 <step> <arguments>` |
| A command stops with "Shell command failed" | Claude Code | `f3 state` refused the argument or the state of the project; its message says why | pass the identifier of a change in progress; frame the project with `f3 init` |
| The agent shows an error of the launch state and stops | OpenCode | the same: `f3 state` refused the argument or the state of the project | the same |
| `f3: command not found`; under Claude Code, every call of an agent refused with "f3 guard failed"; under OpenCode, the launch state answers "command not found" | both | `~/.local/bin` is not in the `PATH`, or the toolkit folder moved | add `~/.local/bin` to the `PATH`; run `./install.sh` again |
| In a session opened by hand, an f3 agent or command is unknown | both, mostly OpenCode | `build/` disappeared (`git clean -fdX`, a new clone): the installation links are dead | launch the step with `f3 <step>`, which renders before starting the tool, or run `f3 render`; then open a new session |
| `f3` refuses: "the render of <tool> failed", or the launch state reports it | both | a source of the toolkit has an unknown `{{` marker or an unreadable frontmatter, the toolkit is read-only, or the disk is full | fix the source and launch again; for a read-only toolkit, run `./install.sh <tool>` with the rights to write in it |
| The launch state warns that the toolkit changed since the last render | both | the toolkit changed after the session loaded its agent and command | start a new session with `f3 <step>` |
| The launch state warns that the project lacks files of a tool, that `.f3/local` is not ignored by Git, or that the MCP servers differ | both | the project was framed for one tool, by an earlier version, or a file was edited by hand | `f3 init`, theme Tools (section 14.1) |
| `f3` refuses: ".f3/local names <tool>, for which f3 is not installed" | both | the tool of the project is not installed on this machine | `./install.sh <tool>`, or `f3 tool <other tool>` |
| `f3` refuses: "no tool chosen" | both | both tools are installed, `.f3/local` is absent, and there is no terminal to ask in | `f3 tool claude` or `f3 tool opencode` |
| `f3` refuses: "… is not an identifier" | both | free text was given as an argument | write it after `--` (section 4.2) |
| `f3` refuses: "… is an option, and f3 <step> takes none" | both | a word starting with `-` was given before `--` | leave it out, or write it after `--` (section 4.2) |
| `f3` refuses: "f3 <step> is not started from a session that f3 started" | both | the step was launched from the shell of an f3 session, by you or by an agent | quit the session, and launch the step from a terminal |
| The agent says its web search was cancelled | OpenCode | OpenCode asks, at the first web search, whether to allow it, and cancels the search when nobody answers within a minute | answer the question in the session; the agent can search again |
| The note after `--` does not reach the agent | OpenCode | the command was typed in a session, or the session runs on the managed service | launch the step with `f3 <step> … -- <prompt>` |
| "schema f3 not found" | both | the toolkit is not installed, or the link is broken | run `./install.sh`; `openspec schema which f3` shows where the schema resolves |
| `f3 design` stops on a missing skill | both | the OpenSpec profile does not install `openspec-continue-change` | `openspec config profile`, then `openspec update` |
| The next step refuses to start although the previous one is finished | both | its validation file was not written: the step was not declared finished | relaunch the command of the previous step and declare it finished, or ask its agent to write the validation in the format of its command |
| An agent writes nothing and says it is not allowed | both | the file is outside its writing scope | run the command meant for that file (see section 6) |
| An agent writes a file in the wrong folder | OpenCode | its session started before a permission change; it wrote where it could | start a new session with `f3 <step>` after any toolkit update, then move the file |
| An agent's context fills up quickly | both | it loads MCP tools it does not need | add the server to the `deny-tools` list of the agent in the toolkit; under OpenCode, deny it for built-in agents such as `explore` in `~/.config/opencode/opencode.json` (`"<server>_*": "deny"`) |
| The verification command never passes | both | it includes the end-to-end tests | keep the end-to-end suite out of the verification command; it is run by `f3 acceptance` |
| A setting seems ignored | OpenCode | a `.opencode` folder or `opencode.json` higher in the directory tree (even in your home folder) overrides it | remove the stray file; keep only the global and the project configuration |
| The MCP servers of the project are missing | Claude Code | they were not approved at the first session | approve them with `/mcp` in a session; `claude mcp list` shows their state |
| Claude Code asks for a confirmation at each edit | Claude Code | the guard never answers "allow": your own permission mode applies | choose `acceptEdits` in your settings if you want fewer confirmations; edits outside a scope stay refused |

### 15.4 Commands that run on your machine

Each command inserts into its prompt, when you launch it, the output of a single shell command run in the project root: `f3 state <command>`. It only reads the project: `git status`, `git branch`, `git rev-parse`, `git check-ignore`, the framing files and the folders of the change, `openspec --version`, `openspec schema which`, `openspec status`, and `f3-features --check`. It writes only in the toolkit and the temporary directory: it renders the agents and commands again into `build/` (section 4.3), and removes the private launch file that `f3 <step>` wrote for the session. The argument of the command is passed to it between single quotes, and checked before it builds any path: pass only a change identifier.

Launched with `f3 <step>`, a command only ever receives identifiers as arguments, and the prompt after `--` never goes through a shell line (section 4.2).

> **Claude Code.** `f3 state` is the only shell command a command may run without asking. An argument that breaks the quotes of the line is refused by the permission check of Claude Code, and the command does not start.

> **OpenCode.** A command typed in a session (`/f3-<step> <arguments>`) still works, but its argument is inserted into the shell line of its injection, which OpenCode runs without any permission check: an argument containing an apostrophe can end the quotes and run another command. `f3 state` refuses an argument that is not an identifier, but only once the shell has run the line. Type only a change identifier, or better, launch the step with `f3 <step>`: when `f3` did not start the session, the launch state says so and gives the `f3` command to use.

---

## 16. Known limits

- **Archiving cannot be blocked mechanically.** OpenSpec has no field to require an artifact before archiving. `f3 archive` checks the last acceptance report, but an agent archiving by other means would not.
- **Permissions do not cover writes through the shell.** An agent can write a file with a shell command even where its permission table denies it. The toolkit relies on instructions there, and on Git: every step ends with a diff you review.
- **Subagent tools and permissions.** The conformity mode relies on the built-in general subagent having the browser tools while the ux agent does not.
  > **Claude Code.** A subagent does not inherit the tools its caller refuses (checked with 2.1.318). For the same reason, the tester may call no subagent but itself.

  > **OpenCode.** A subagent applies its own permissions; check it on your version.
- **The tester's reading rules differ by tool** (section 12).
  > **Claude Code.** The tester searches through the shell: Claude Code 2.1.318 gives its sessions no Grep or Glob tool. It may run `grep`, `rg` and `find` only when every path they search is one it may read; the guard reads their arguments, so an unusual option can make it refuse a legitimate search. The guard stops habits, not intent: it refuses the reading tools and programs, not a script written to read a file. A step definition that would read the code is caught by the fidelity review of the acceptance.

  > **OpenCode.** Only the read tool is restricted: glob, grep and the shell can still read the application code. Closing this gap would take a plugin, which the toolkit does not have. The fidelity review of the acceptance is the remaining check.
- **A failing launch state does not stop an OpenCode command.** Under OpenCode, the command goes on after a failed injection; the line that follows it tells the agent to show the error and stop. Under Claude Code, the command does not start.
- **A command typed in a session.** Under OpenCode, `/f3-<step>` typed in a session receives no prompt, and its argument goes through the shell (section 15.4). The OpenCode service managed in the background (`opencode serve --service`) does not receive the prompt either, since it does not inherit the environment of `f3` (deduced, not tested).
- **One machine per toolkit.** The render relies on the process numbers of the machine: every `f3` that writes in the `build/` of a toolkit must run on the same machine, in the same process namespace (section 4.3).
- **Positional arguments.** `f3 ux-design <change-id> conformity` reads its two arguments one by one (`$0` and `$1` under Claude Code, `$1` and `$2` under OpenCode). With a single argument, it falls back to the design mode.
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
