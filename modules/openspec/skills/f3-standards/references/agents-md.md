# AGENTS.md template

`AGENTS.md` of an f3 project has four parts, in this order:

1. **The invariant part**: the exact copy of the block below. It is identical in every project and is never adapted to the stack or to the product.
2. **The Adopted practices section**: `## Adopted practices`, written only by `f3 practices apply` during f3 init, from the practices catalog of the toolkit (section below). Projects framed before the catalog have none.
3. **The Stack section**: `## Stack`, written for the project during f3 init from the stack decision recorded in `arch/decisions.md`. Its subsections and what each one answers are defined below.
4. **The project-specific rules**, only if the user validated some during f3 init: a section `## Project-specific rules`, numbered after the invariant rules (15, 16, and so on), in the same style: a rule, its reason, and an example when two readings are possible. Without such a rule, this section does not exist.

A rule belongs to the invariant part when it follows from the architecture style or the standards, whatever the product and the stack. It belongs to the Adopted practices section when a practice of the catalog states it. It belongs to the Stack section when it follows from a technology choice. It is project-specific when it only makes sense for this product. To classify a rule, ask which principle it expresses: if the principle belongs to the style, the invariant part already states it, and the particular case is not written; if a practice of the catalog states it, that practice is adopted rather than the rule rewritten.

## Invariant part

~~~~markdown
# AGENTS.md

<!-- f3 standards: written by f3 init. To change it, run f3 init again. -->

Rules for all the code of this repository. They take precedence over your general habits. If a request conflicts with them, report the conflict instead of deciding alone.

Examples in this file use a fictional sales and invoicing domain (ordering, inventory, billing), unrelated to the product. Their names illustrate a form and are never to be reused.

## Vocabulary

This section defines the architecture vocabulary. The business vocabulary is defined in a single file, `CONTEXT.md`, at the repository root: each term in the project language, followed by the English term used in code. Structural decisions and their reasons are recorded in `arch/decisions.md`; decisions that concern a single change stay in that change's design.md.

- **Bounded context**: a coherent part of the business with its own model. Always written in full, never abbreviated.
- **Module**: a unit of code that declares its own dependencies. Its concrete form (project, package, library) is defined in the Stack section.
- **Core module**: the module that holds the domain and the use cases of one bounded context.
- **Adapter module**: a module that implements the ports of one bounded context with one technology.
- **Orchestration module**: the module that holds the orchestration use cases.
- **Application**: a deployable unit. It hosts the entry points and the composition root.
- **Shared kernel**: the only module shared by several bounded contexts for their domain: value objects and enumerations that at least two bounded contexts use with the same meaning and that no bounded context owns, and language utilities without business meaning that several core modules need (for example a result type). Each addition, change or removal is recorded in `arch/decisions.md`. It depends on nothing.
- **Technical library**: a module that serves the code using one technology (adapters, other technical libraries, applications), for example database transactions, event bus, HTTP client or file storage, and carries no domain type. It never names a bounded context.
- **Test library**: a technical library used only by tests. It accompanies a technical library or a technology, and is named as the Modules subsection says.
- **Technology**: what an adapter or a technical library depends on: database, framework, SDK, file system, runtime.
- **External dependency**: a package installed from a package registry.
- **Platform API**: an API provided by a runtime rather than by the language (for example the built-in modules of a runtime, or the APIs of a browser or a desktop shell).
- **Entity**: a business object with an identity and a lifecycle, which protects its own invariants.
- **Value object**: an immutable business object defined by its values, which guarantees its own validity.
- **Domain type**: a type defined by a core module, in its domain or its application layer, or by the shared kernel.
- **Use case**: a class that performs one action of the system. The use cases of a bounded context are its only public surface.
- **Orchestration use case**: a use case that performs a business workflow by chaining existing use cases of several bounded contexts.
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
| Core module | the shared kernel; nothing else: no other module, no external dependency, no platform API |
| Adapter module | the core module of its bounded context, the shared kernel, technical libraries other than test libraries, and the external dependencies and platform APIs of its technology |
| Orchestration module | the use cases of core modules, the types of their inputs and outputs, and the shared kernel |
| Shared kernel | nothing |
| Technical library | other technical libraries other than test libraries, and the external dependencies and platform APIs of its technology |
| Application | every module except test libraries |

Inside a core module, the domain imports only the domain and the shared kernel; the application layer imports the domain, the shared kernel and the application layer.
The tests of adapter modules, technical libraries and applications may also depend on test libraries, except the tests of the library a test library accompanies; production code and the tests of core modules, of the shared kernel and of the orchestration module never do, nor do end-to-end tests.
A module never depends on a module of another bounded context; the orchestration module, the shared kernel and technical libraries belong to none.
These rules are enforced by the tool named in the Stack section: a violation makes the verification command fail.

## Rules

### Domain and use cases

1. **The core knows no technology.** A core module uses only the language itself and the shared kernel: no framework, no annotation or decorator from a framework, no external dependency, no platform API. Reason: the domain must be readable, testable and movable without any technology.
2. **Business decisions live in the domain.** Every condition that depends on business state is a method of an entity or a value object. A use case loads objects through its ports, calls their methods, then stores them through its ports; it contains no condition on business data. Example: `invoice.issue()` refuses to issue a draft with an empty line; `IssueInvoice` never checks the lines itself.
3. **Entities have behavior.** State changes only through named business methods, never through setters. An entity reduced to data that use cases manipulate is forbidden.
4. **A concept with a rule is a value object.** A business concept that carries a rule (validation, format, calculation, comparison) is a value object, not a primitive type. Example: `Amount`, not `number`.
5. **Use cases receive their ports.** A use case receives its ports through its constructor and never instantiates an adapter.
6. **Bounded contexts are independent.** A module of a bounded context never depends on a module of another bounded context, and its domain never uses a type of another bounded context; the types of the shared kernel belong to no bounded context. A bounded context never knows which workflows use it. Reason: each bounded context must be able to change its model without breaking another one. An action that concerns several bounded contexts is performed by an orchestration use case (rule 7).

### Orchestration

7. **An orchestration use case composes existing use cases into a business workflow.** It exists only for an action that concerns at least two bounded contexts, and receives through its constructor the use cases it chains, nothing else. It does only the following:
   - call the use cases in the order of the workflow;
   - build the input of each use case from the outputs of the previous ones, only by copying values into the types of the next bounded context, or by passing a value of the shared kernel as is, without calculating anything;
   - choose the next step from the outcome a use case returns (for example `StockReserved` or `OutOfStock`), never from business data;
   - when a step fails, call the use cases that undo the steps already performed, then return the failure.

   It never compares, calculates or validates business data. When a workflow needs a decision or an action that no existing use case provides, that use case is first added to the bounded context it belongs to, with its rule in the domain; the orchestration then calls it. Reason: a workflow must read as a sequence of business steps, and every business rule must stay in a domain, where it is tested. Example: `PlaceOrder` calls `ReserveStock`. If the outcome is `OutOfStock`, it calls `NotifyBackorder` and stops. If the outcome is `StockReserved`, it copies the reserved items into invoice lines and calls `IssueInvoice`. If `IssueInvoice` fails, it calls `ReleaseStock` with the reservation and returns the failure. `PlaceOrder` never checks whether the reserved items are enough to invoice: `invoice.issue()` refuses an invoice without lines.

### Shared modules

8. **Only the shared kernel and technical libraries are shared.** A technical library serves the code that uses one technology: one library per technology, plus its test library if its users need one. It is created when a change needs it, never in advance: when a module needs technical code already written in another module, the design of the change moves that code to the technical library of its technology, as a task. Never create a library, move code into one or add to the shared kernel outside a task: stop and report the need. A technical library carries no domain type and never names a bounded context. A technical platform (search index, mail sending, file storage) is a technical library that adapters use; it never defines an interface for bounded contexts to implement. A type enters the shared kernel only when at least two bounded contexts use it with the same meaning and no bounded context owns it, or when it is a language utility without business meaning that several core modules need; the shared kernel module is created by the change that makes its first addition. Adding, changing or removing a type of the shared kernel is proposed to the user, who decides, and recorded in `arch/decisions.md`; so is creating, splitting or merging a bounded context. A type that one bounded context owns stays in it, and an orchestration use case copies its value into the types of the others; a type that several bounded contexts would change together reveals a missing bounded context or a misplaced boundary. Before writing technical code or a domain type, look for what already exists at the locations the Modules subsection of the Stack section names, and in the other bounded contexts. Example: `Currency` is in the shared kernel because ordering and billing use it with the same meaning, and ISO 4217, not the product, defines it; `Sku` stays in inventory, which defines its format; the transaction handling of a database is in the technical library of that database.

### Entry points and applications

9. **An application contains no business rule.**
10. **An entry point does three things, in this order:** it translates its input contract into domain types, calls exactly one use case (a core use case if the action concerns one bounded context, otherwise an orchestration use case) received from the composition root, and translates the result or the error into its output contract. A domain object is never returned as is.
11. **Only the composition root instantiates adapters and use cases.** Anywhere else, an adapter or a use case is received, never created.
12. **Domain identity at the boundaries.** Outside the adapters that store or read it, a business object is always designated by its domain identity. A technical identifier never crosses a port, an entry point or an output contract. It enters the system only when the outside introduces a new resource, through a dedicated entry point that converts it at once into a domain identity; the adapter that needs it then finds it from that identity. Reason: a technical identifier in a contract couples the callers to an adapter, and lets a caller designate a resource the system does not manage. Example: an invoice attachment is read through `GET /invoices/{invoiceId}/attachment`, never through `?path=...`; only the upload entry point receives the file, and it returns the identity of the attachment.

### Tests

13. **The domain is tested without any adapter; a use case is tested with doubles of its ports; an orchestration use case is tested with doubles of the use cases it chains, including the outcome and the failure of each step.** These unit and integration tests are written by the developer. Each module and each application keeps them in a single tests folder, which mirrors the tree of its source folder: a test file has the relative path of the file it tests, with the test suffix of the ecosystem written in the Stack section. When the language or its tooling imposes where tests live, its convention applies instead, and the Stack section says so. Reason: production code stays free of tests, and the place of a test is known without searching. The shared kernel is tested like a domain, without any adapter; a technical library is tested against its technology.
14. **End-to-end tests drive the launched application and import no code of the application.** Every module of the repository, shared modules included, is code of the application. They live in the end-to-end test project, `tests/e2e/`, and are written only by the tester, following the e2e-practice skill. The developer may run them, never modify them.

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

## Adopted practices section

Written by `f3 practices apply`, never by hand, just before the Stack section:

~~~markdown
## Adopted practices

<!-- f3 practices: archetype:web-app@1.0.0, frontend-architecture@1.0.0#e16493801802, f3-stack-angular-developer@1.0.0 -->

### Frontend architecture (FA)

FA-1. **A view owns the state of its screen.** …
~~~

- The marker lists the archetype and the recipe of the framing, then each adopted entry with its version; the rules entries carry the fingerprint of the text written, which tells whether it was modified by hand. f3 init reads it to propose the updates of the catalog.
- Each rules entry is a sub-section titled with its code; its rules are numbered with that code (`FA-1`, `FA-2`…), and a rule is cited by that number (`rule FA-3`). A number removed by a new version of the entry is never given again. The numbering of the invariant part and of the project-specific rules does not depend on this section.
- The text of a practice is never adapted: an adaptation to the product is a project-specific rule.
- When no practice is adopted, the section holds the marker and the line "No practice of the f3 catalog is adopted."
- A practice skill (`.claude/skills/f3-stack-<name>/`), copied by the same command, details the rules of a practice for one technology. Its header says its source (`source: f3 practices <id>@<version> sha256:<fingerprint>`). Agents load it by its description, when their task matches.

## Stack section

The Stack section is written by the architect during f3 init, from the stack decision of `arch/decisions.md`. It contains exactly the subsections below, in this order, each answering its question for this project. A subsection that does not apply contains the single line "None." and the reason. It contains no placeholder: commands are complete and runnable as written. A pattern such as `<bounded-context>` in a directory tree or a module name is allowed: it names a variable part, defined in the Vocabulary.

1. `### Modules`: the concrete form of a module; how each kind of module (core, adapter, orchestration, application, end-to-end test project) is named and where it lives, as a directory tree; where the shared kernel, technical libraries and test libraries live, and how a test library is named; where the unit and integration tests of a module and of an application live and their test suffix, or, when the language or its tooling imposes their place, that place and the reason.
2. `### Dependency enforcement`: the tool that enforces the Dependencies table and the independence of bounded contexts, and how (tags, constraints, configuration file); how the tool tells apart the shared kernel, technical libraries and test libraries; how it lets the modules of a bounded context depend on the shared kernel; how it keeps test libraries out of production code and out of the tests that may not use them, or which check the verification command adds where the tool cannot; what changes in its configuration when a bounded context is created.
3. `### Entry points`: the kinds of entry points the applications expose, the transport of each one, and where they live.
4. `### User interface`: if the product has an interface: how it is split (pages, view state, components shared or not), how it calls the entry points, and where each part lives. The name of a view in the design tool and in `ux.md` is the name of its unit of code. It also says where the design tokens live in the code and how a token of the design tool is named there, where the components of the design system live, and how the rule "appearance values come only from tokens" is enforced (for example a lint rule on the styles that forbids raw colors).
5. `### Transport security`: the security rules that follow from the chosen transports (listening address, authentication between the interface and the entry points, isolation of processes).
6. `### Verification command`: the exact command, and what it runs.
7. `### End-to-end tests`: the runner; how the application is launched in test mode; one exact command for each of these four labels, which the commands of the workflow use: "generate the tests" (from the feature files, failing and listing the steps that have no definition), "export the step catalog", "run the whole suite", "run one capability"; and how the rule "step definitions go through page objects only" is enforced (for example a lint rule on the steps folder). During the migration of the existing scenarios of an adopted project only, the runner may skip the scenarios that have a step without definition instead of failing the generation: the subsection then says so, following the e2e-practice skill. The scenarios tagged `@manual` (Manual scenarios section of the e2e-practice skill) are excluded from generation and from every run, for example by a tag filter of the runner: the subsection says how.
8. `### Observing the running application`: how an agent sees and drives the running application outside the tests (for example a browser automation server attached to the application), and how the application is started for it.

## Example of a Stack section

Fictional sales and invoicing product: not to be reused.

~~~~markdown
## Stack

### Modules

TypeScript monorepo in an Nx workspace. A module is an Nx project.

```
apps/
├── api/                          application: HTTP server, entry points, composition root
│   ├── src/
│   │   ├── endpoints/<bounded-context>/
│   │   └── composition-root/<bounded-context>.ts
│   └── tests/                    mirror of src/
└── web/                          application: Angular interface served by api
    ├── src/
    └── tests/
libs/
├── shared-kernel/                shared kernel, created by its first addition
│   ├── src/
│   └── tests/
├── technical/
│   ├── <technology>/             technical library <technology>, created when a change needs it
│   │   ├── src/
│   │   └── tests/
│   └── <technology>-testing/     test library of <technology>
│       └── src/
├── orchestration/                orchestration module
│   ├── src/
│   └── tests/
└── <bounded-context>/
    ├── core/                     core module <bounded-context>-core
    │   ├── src/
    │   │   ├── domain/
    │   │   └── application/
    │   └── tests/
    │       ├── domain/
    │       └── application/
    └── adapters-<technology>/    adapter module <bounded-context>-adapters-<technology>
        ├── src/
        └── tests/
tests/
└── e2e/                          end-to-end test project e2e
```

Unit and integration tests: the `tests/` folder of each project, which mirrors its `src/`, with the suffix `.spec.ts`. The test of `libs/billing/core/src/domain/invoice.ts` is `libs/billing/core/tests/domain/invoice.spec.ts`.

### Dependency enforcement

Each project carries tags in its `project.json`: `type:core`, `type:adapters`, `type:orchestration`, `type:shared-kernel`, `type:technical`, `type:app`, `type:e2e`, `scope:test` for a test library besides `type:technical`, and `bc:<bounded-context>` for the modules of a bounded context. The `@nx/enforce-module-boundaries` lint rule reproduces the Dependencies table between `type:*` tags, with one constraint per `bc:*` tag that allows only the same `bc:*` tag and `type:shared-kernel`, and `notDependOnLibsWithTags: ["scope:test"]` for every project. An ESLint override on the `tests/` folders of `type:adapters`, `type:technical` and `type:app` projects repeats every constraint and lifts only the `scope:test` ban; `tests/e2e/` is outside its pattern. Creating a bounded context adds its `bc:*` constraint to the lint configuration.

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

The Playwright MCP server, named `playwright`, opens the application started with `npm run start:test` at `http://127.0.0.1:4200`.
~~~~
