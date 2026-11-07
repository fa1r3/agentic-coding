# AGENTS.md template

`AGENTS.md` of an f3 project has three parts, in this order:

1. **The invariant part**: the exact copy of the block below. It is identical in every project and is never adapted to the stack or to the product.
2. **The Stack section**: `## Stack`, written for the project during f3 init from the stack decision recorded in `arch/decisions.md`. Its subsections and what each one answers are defined below.
3. **The project-specific rules**, only if the user validated some during f3 init: a section `## Project-specific rules`, numbered after the invariant rules (14, 15, and so on), in the same style: a rule, its reason, and an example when two readings are possible. Without such a rule, this section does not exist.

A rule belongs to the invariant part when it follows from the architecture style or the standards, whatever the product and the stack. It belongs to the Stack section when it follows from a technology choice. It is project-specific when it only makes sense for this product. To classify a rule, ask which principle it expresses: if the principle belongs to the style, the invariant part already states it, and the particular case is not written.

## Invariant part

~~~~markdown
# AGENTS.md

<!-- f3 standards: written by f3 init. To change it, run f3 init again. -->

Rules for all the code of this repository. They take precedence over your general habits. If a request conflicts with them, report the conflict instead of deciding alone.

Examples in this file use a fictional invoicing domain, unrelated to the product. Their names illustrate a form and are never to be reused.

## Vocabulary

This section defines the architecture vocabulary. The business vocabulary is defined in a single file, `CONTEXT.md`, at the repository root: each term in the project language, followed by the English term used in code. Structural decisions and their reasons are recorded in `arch/decisions.md`; decisions that concern a single change stay in that change's design.md.

- **Bounded context**: a coherent part of the business with its own model. Always written in full, never abbreviated.
- **Module**: a unit of code that declares its own dependencies. Its concrete form (project, package, library) is defined in the Stack section.
- **Core module**: the module that holds the domain and the use cases of one bounded context.
- **Adapter module**: a module that implements the ports of one bounded context with one technology.
- **Orchestration module**: the module that holds the orchestration use cases.
- **Application**: a deployable unit. It hosts the entry points and the composition root.
- **Technology**: what an adapter depends on: database, framework, SDK, file system, runtime.
- **External dependency**: a package installed from a package registry.
- **Platform API**: an API provided by a runtime rather than by the language (for example the built-in modules of a runtime, or the APIs of a browser or a desktop shell).
- **Entity**: a business object with an identity and a lifecycle, which protects its own invariants.
- **Value object**: an immutable business object defined by its values, which guarantees its own validity.
- **Use case**: a class that performs one action of the system. The use cases of a bounded context are its only public surface.
- **Orchestration use case**: a use case that chains use cases of several bounded contexts and passes each one the results of the previous ones.
- **Port**: an interface that declares what a use case needs from the outside: store, read a file, call a model.
- **Adapter**: a class that implements a port with a technology.
- **Entry point**: code of an application that receives a request from the outside (HTTP endpoint, IPC handler, CLI command, message consumer) and calls a use case.
- **Input and output contracts**: the shape of the data an entry point accepts and returns.
- **Composition root**: the only code that instantiates use cases and adapters and plugs each adapter into its port.
- **Domain identity**: the identifier the domain assigns to a business object.
- **Technical identifier**: the way a technology locates something: file path, storage URL, database key, table name.

The word "domain" alone means the domain layer, never a bounded context.

## Dependencies

| Module | May depend on |
|---|---|
| Core module | nothing: no other module, no external dependency, no platform API |
| Adapter module | the core module of its bounded context, and the external dependencies and platform APIs of its technology |
| Orchestration module | core modules |
| Application | every module |

Inside a core module, the domain imports only the domain; the application layer imports the domain and the application layer.
A module never depends on a module of another bounded context.
These rules are enforced by the tool named in the Stack section: a violation makes the verification command fail.

## Rules

### Domain and use cases

1. **The core knows no technology.** A core module uses only the language itself: no framework, no annotation or decorator from a framework, no external dependency, no platform API. Reason: the domain must be readable, testable and movable without any technology.
2. **Business decisions live in the domain.** Every condition that depends on business state is a method of an entity or a value object. A use case loads objects through its ports, calls their methods, then stores them through its ports; it contains no condition on business data. Example: `invoice.issue()` refuses to issue a draft with an empty line; `IssueInvoice` never checks the lines itself.
3. **Entities have behavior.** State changes only through named business methods, never through setters. An entity reduced to data that use cases manipulate is forbidden.
4. **A concept with a rule is a value object.** A business concept that carries a rule (validation, format, calculation, comparison) is a value object, not a primitive type. Example: `Amount`, not `number`.
5. **Use cases receive their ports.** A use case receives its ports through its constructor and never instantiates an adapter.
6. **Bounded contexts are independent.** A bounded context never depends on another one. An action that concerns several bounded contexts is performed by an orchestration use case.

### Orchestration

7. **An orchestration use case exists only for an action that concerns at least two bounded contexts.** It receives through its constructor the use cases it chains, and contains no business condition: decisions are taken by the use cases it calls, and it only passes their results along. Example: `PlaceOrder` calls `ReserveStock`, which returns the items actually reserved, then calls `IssueInvoice` with those items.

### Entry points and applications

8. **An application contains no business rule.**
9. **An entry point does three things, in this order:** it translates its input contract into domain types, calls exactly one use case (a core use case if the action concerns one bounded context, otherwise an orchestration use case) received from the composition root, and translates the result or the error into its output contract. A domain object is never returned as is.
10. **Only the composition root instantiates adapters and use cases.** Anywhere else, an adapter or a use case is received, never created.
11. **Domain identity at the boundaries.** Outside the adapters that store or read it, a business object is always designated by its domain identity. A technical identifier never crosses a port, an entry point or an output contract. It enters the system only when the outside introduces a new resource, through a dedicated entry point that converts it at once into a domain identity; the adapter that needs it then finds it from that identity. Reason: a technical identifier in a contract couples the callers to an adapter, and lets a caller designate a resource the system does not manage. Example: an invoice attachment is read through `GET /invoices/{invoiceId}/attachment`, never through `?path=...`; only the upload entry point receives the file, and it returns the identity of the attachment.

### Tests

12. **The domain is tested without any adapter; a use case is tested with doubles of its ports; an orchestration use case is tested with doubles of the use cases it chains.** These unit and integration tests sit next to the code they test and are written by the developer.
13. **End-to-end tests drive the launched application and import no code of the application.** They live in the end-to-end test project, `tests/e2e/`, and are written only by the tester, following the e2e-practice skill. The developer may run them, never modify them.

## Naming

- A business concept has one name in all the code: its English term in `CONTEXT.md`. If a concept is missing from `CONTEXT.md`, report it instead of inventing a name.
- A port is named after the need of the domain, never after a technology. An adapter is named after its technology and the port it implements. Example: the port `InvoiceRepository` is implemented by `SqliteInvoiceRepository`.
- A use case is named after a business intention, verb and object. Example: `IssueInvoice`.
- Forbidden in names: Manager, Helper, Util, Data, Info, and Service without a business qualifier. Reason: these words name no responsibility.
- No abbreviations, except universal ones (id, url).

## Verification

- A single command verifies the whole repository: lint, type checking where the language has it, unit and integration tests, and the dependency rules. Its exact form is in the Stack section. It fails as soon as one check fails.
- A task is finished only when this command passes.

## Git

### Branches

- One OpenSpec change = one branch `<type>/<change-id>` = one pull request. `<type>` is the main commit type of the change (list below). Example: `feat/add-invoice-issuing`.
- Never commit on the main branch.

### Commits

Angular format:

```
<type>(<scope>): <summary>

<body>

<footer>
```

- `<type>` is mandatory, among:
  - `feat`: new feature;
  - `fix`: bug fix;
  - `perf`: performance improvement;
  - `refactor`: code change that is neither a fix nor a feature;
  - `test`: adding or correcting tests;
  - `build`: build system or external dependencies;
  - `ci`: CI configuration;
  - `docs`: documentation only, including OpenSpec files.
- `<scope>` is the name of the modified module. If the commit modifies several modules, or none, the scope is omitted. A `docs` commit never has a scope.
- `<summary>` is in the imperative present, without an initial capital, without a final period.
- `<body>` explains why the change is made. It is mandatory, except for `docs`, and is at least 20 characters long.
- `<footer>` contains `BREAKING CHANGE: <description>` if the change breaks an existing contract.
- No line exceeds 100 characters.

Example:

```
feat(billing-core): add invoice issuing use case

Issue an invoice for the items reserved by an order, so that the
customer receives it as soon as the order is confirmed.
```
~~~~

Angle brackets in the Git section (`<type>`, `<scope>`, `<summary>`, `<body>`, `<footer>`, `<change-id>`) are part of the format description and stay as they are.

## Stack section

The Stack section is written by the architect during f3 init, from the stack decision of `arch/decisions.md`. It contains exactly the subsections below, in this order, each answering its question for this project. A subsection that does not apply contains the single line "None." and the reason. It contains no placeholder: commands are complete and runnable as written. A pattern such as `<bounded-context>` in a directory tree or a module name is allowed: it names a variable part, defined in the Vocabulary.

1. `### Modules`: the concrete form of a module; how each kind of module (core, adapter, orchestration, application, end-to-end test project) is named and where it lives, as a directory tree.
2. `### Dependency enforcement`: the tool that enforces the Dependencies table and the independence of bounded contexts, and how (tags, constraints, configuration file).
3. `### Entry points`: the kinds of entry points the applications expose, the transport of each one, and where they live.
4. `### User interface`: if the product has an interface: how it is split (pages, view state, components shared or not), how it calls the entry points, and where each part lives. The name of a view in the design tool and in `ux.md` is the name of its unit of code. It also says where the design tokens live in the code and how a token of the design tool is named there, where the components of the design system live, and how the rule "appearance values come only from tokens" is enforced (for example a lint rule on the styles that forbids raw colors).
5. `### Transport security`: the security rules that follow from the chosen transports (listening address, authentication between the interface and the entry points, isolation of processes).
6. `### Verification command`: the exact command, and what it runs.
7. `### End-to-end tests`: the runner; how the application is launched in test mode; one exact command for each of these four labels, which the commands of the workflow use: "generate the tests" (from the feature files, failing and listing the steps that have no definition), "export the step catalog", "run the whole suite", "run one capability"; and how the rule "step definitions go through page objects only" is enforced (for example a lint rule on the steps folder). During the migration of the existing scenarios of an adopted project only, the runner may skip the scenarios that have a step without definition instead of failing the generation: the subsection then says so, following the e2e-practice skill. The scenarios tagged `@manual` (Manual scenarios section of the e2e-practice skill) are excluded from generation and from every run, for example by a tag filter of the runner: the subsection says how.
8. `### Observing the running application`: how an agent sees and drives the running application outside the tests (for example a browser automation server attached to the application), and how the application is started for it.

## Example of a Stack section

Fictional invoicing product: not to be reused.

~~~~markdown
## Stack

### Modules

TypeScript monorepo in an Nx workspace. A module is an Nx project.

```
apps/
├── api/                          application: HTTP server, entry points, composition root
│   └── src/
│       ├── endpoints/<bounded-context>/
│       └── composition-root/<bounded-context>.ts
└── web/                          application: Angular interface served by api
libs/
├── orchestration/                orchestration module
└── <bounded-context>/
    ├── core/                     core module <bounded-context>-core
    └── adapters-<technology>/    adapter module <bounded-context>-adapters-<technology>
tests/
└── e2e/                          end-to-end test project e2e
```

### Dependency enforcement

Each project carries tags in its `project.json`: `type:core`, `type:adapters`, `type:orchestration`, `type:app`, `type:e2e`, and `bc:<bounded-context>` for libraries. The `@nx/enforce-module-boundaries` lint rule reproduces the Dependencies table between `type:*` tags and forbids a `bc:*` tag from depending on another `bc:*` tag.

### Entry points

HTTP endpoints of `api`, in `apps/api/src/endpoints/<bounded-context>/`, one file per endpoint with its request and response objects. `web` calls them through one typed client per bounded context.

### User interface

`web` is split into features. A page is a component displayed by a route; its controller holds the screen state as read-only signals of view models and exposes one method per user action. Feature components and design-system components receive data through inputs and report actions through outputs. A view of the design tool is named after its page. The design tokens live in `libs/design-system/tokens/tokens.css`, one CSS custom property per token, named after the token with its dots replaced by hyphens: `color.text.primary` becomes `--color-text-primary`. The components of the design system live in `libs/design-system/components/`, one folder per component, named after the component. A stylelint rule forbids raw colors, lengths and font sizes in the styles of `apps/` and `libs/`, except in `tokens.css`.

### Transport security

`api` requires an authenticated session on every endpoint except login. Cookies are `HttpOnly` and `SameSite=Strict`.

### Verification command

`npm run verify`: `nx run-many -t lint typecheck test` on every project.

### End-to-end tests

- Runner: Playwright with playwright-bdd. The application is started by the Playwright `webServer` option with `npm run start:test`, which loads the test data of `tests/e2e/support/data/`.
- Generate the tests: `npx bddgen -c tests/e2e/playwright.config.ts`. It fails and lists the missing step definitions when a step has none.
- Export the step catalog: `npx bddgen export -c tests/e2e/playwright.config.ts`.
- Run the whole suite: `npx bddgen -c tests/e2e/playwright.config.ts && npx playwright test -c tests/e2e/playwright.config.ts`.
- Run one capability: same command, followed by the capability path, which Playwright matches against the generated test file names.
- The lint rule `no-restricted-syntax` on `tests/e2e/steps/` forbids any use of `page.locator` and `page.getBy*`: steps go through page objects.

### Observing the running application

The Playwright MCP server, declared in `opencode.json`, opens the application started with `npm run start:test` at `http://127.0.0.1:4200`.
~~~~
