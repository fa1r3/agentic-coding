---
id: ts-npm-library
kind: recipe
version: 1.0.0
status: stable
summary: A TypeScript package published on npm, in npm workspaces, with dependency-cruiser and an end-to-end harness that installs the built package.
applies-when:
  archetypes: [library]
  languages: [typescript]
check:
  - the current LTS of Node.js and the current major of TypeScript
  - the maintenance and the license of dependency-cruiser, Vitest, @cucumber/cucumber and API Extractor
  - how npm pack and a local install behave with the module format chosen (ESM only, or dual)
---

Draft of the Stack section for a package with business rules. The architect adapts names, versions and the module format to the project.

### Modules

TypeScript repository with npm workspaces. A module is an npm workspace with its own `package.json`. The published package is the application `packages/<package>` (`@scope/<package>` on npm): its `src/index.ts` exports the public API and the public factory, its composition root. Each module keeps its unit and integration tests in `tests/`, mirroring `src/`, with the suffix `.test.ts` (rule 13).

```
packages/
├── <package>/                     application @scope/<package>: public API, public factory (composition root)
└── <bounded-context>/
    ├── core/                      @internal/<bounded-context>-core: src/{domain,application}/
    └── adapters-<technology>/     @internal/<bounded-context>-adapters-<technology>
contract/
└── api.md                         reference of the public API: the published contract
tests/
└── e2e/                           end-to-end test project @internal/e2e
```

The internal workspaces are bundled into the published package at build (`tsup` or `tsc -b` with project references); only `@scope/<package>` is published.

### Dependency enforcement

dependency-cruiser, configured in `.dependency-cruiser.cjs` at the root: a core imports no other module, no npm package and no Node.js built-in module; adapters import, among the modules, only their own core; `packages/<package>/` imports the cores and the adapters, and exports nothing that is not declared in `src/index.ts`; `tests/e2e/` imports nothing from `packages/`; no cycle. API Extractor fails the verification command when the public API changes without `contract/api.md` changing with it.

### Entry points

The functions and classes exported by `packages/<package>/src/index.ts`, one file per entry point in `src/api/`, each with its input and output types; the public factory receives the adapters the consumer provides (storage, clock) and instantiates the package's own.

### User interface

None: the package has no user interface; its contract is `contract/api.md`.

### Transport security

None: the package opens no network port; it validates every input of its public API before translating it into domain types.

### Verification command

`npm run verify`, which stops at the first failure: `tsc -b`, `eslint .`, `depcruise packages tests --config .dependency-cruiser.cjs`, `vitest run`, `api-extractor run` (public API against its report).

### End-to-end tests

- Runner: Cucumber.js (`@cucumber/cucumber`), configured in `tests/e2e/cucumber.mjs`: feature files in `tests/e2e/features/`, step definitions in `tests/e2e/steps/`, access objects in `tests/e2e/access/`.
- Test mode: `npm run e2e:install` runs `npm pack` in `packages/<package>` and installs the archive into `tests/e2e/`, as a consumer would; the access objects import `@scope/<package>` by its published name only. The consumer adapters of the scenarios (an in-memory storage, a fixed clock) live in `tests/e2e/support/`.
- The scenarios tagged `@manual` are excluded by the tag expression `not @manual` of the configuration.
- Generate the tests: `npx cucumber-js --dry-run --strict -c tests/e2e/cucumber.mjs`. It fails and lists the steps without definition.
- Export the step catalog: `npx cucumber-js --dry-run -c tests/e2e/cucumber.mjs --format usage-json:tests/e2e/reports/steps.json`.
- Run the whole suite: `npm run e2e:install && npx cucumber-js -c tests/e2e/cucumber.mjs`; one capability: the same, followed by `tests/e2e/features/<capability>.feature`.
- An ESLint rule on `tests/e2e/steps/` forbids importing `@scope/<package>`: steps go through access objects.

### Observing the running application

None: there is no running application; an agent observes the package by running the end-to-end harness or a script in `tests/e2e/` that imports the installed package.
