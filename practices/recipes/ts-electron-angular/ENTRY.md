---
id: ts-electron-angular
kind: recipe
version: 1.0.0
status: stable
summary: TypeScript in npm workspaces, Electron with an Angular interface, IPC handlers as entry points, dependency-cruiser, Playwright driving Electron.
applies-when:
  archetypes: [desktop-app]
  ui: yes
  languages: [typescript]
check:
  - the current major of Electron and its supported Node.js, and the current LTS of Angular
  - the maintenance and the license of Electron Forge or electron-builder, dependency-cruiser, Playwright and playwright-bdd
  - that the Electron support of Playwright (_electron) works with the current Electron
  - how an MCP server can observe the window of the application started in test mode
---

Draft of the Stack section, from the desktop product the f3 workflow was first used on (drift log). The architect adapts names, versions and the packaging to the project.

### Modules

TypeScript repository with npm workspaces. A module is an npm workspace with its own `package.json`, named `@app/<module>`. Each module and application keep their unit and integration tests in `tests/`, mirroring `src/`, with the suffix `.spec.ts` (rule 13).

```
apps/
├── desktop/                          application @app/desktop: Electron main process, preload, IPC handlers, composition root
│   └── src/
│       ├── main.ts                   creates the window from the composition root
│       ├── preload.ts                exposes the IPC bridge, and nothing else, to the interface
│       ├── handlers/<bounded-context>/   one file per IPC handler
│       └── composition-root/<bounded-context>.ts
└── interface/                        application @app/interface: the Angular interface, built and loaded by the window
    └── src/app/
        ├── views/<bounded-context>/  one folder per view
        ├── components/               shared presentation components
        ├── clients/                  one client of the IPC bridge per bounded context
        └── styles/                   the design tokens
packages/
└── <bounded-context>/
    ├── core/                         @app/<bounded-context>-core: src/{domain,application}/
    └── adapters-<technology>/        @app/<bounded-context>-adapters-<technology>
tests/
└── e2e/                              end-to-end test project @app/e2e
```

### Dependency enforcement

dependency-cruiser, configured in `.dependency-cruiser.cjs` at the root: `packages/*/core/` imports no other module, no npm package and no Node.js built-in module; adapters import, among the modules, only their own core; `apps/interface/` imports no module of `packages/` and no Node.js built-in module: it reaches the core only through the IPC bridge; `tests/e2e/` imports nothing from `apps/` or `packages/`; no cycle.

### Entry points

IPC handlers of the main process in `apps/desktop/src/handlers/<bounded-context>/`, one file per handler, registered with `ipcMain.handle` on a channel named `<bounded-context>:<action>`, with its input and output contracts as types shared only through the preload bridge. A path chosen by the user enters only through a dialog handler, which converts it at once into a domain identity (rule 12).

### User interface

Angular, standalone components, in `apps/interface/`. A view is a routed component named after its view in `ux/views.md`; shared presentation components live in `components/`. The window runs with `contextIsolation: true`, `nodeIntegration: false` and `sandbox: true`; the interface calls only the functions the preload exposes. The design tokens are CSS custom properties in `apps/interface/src/app/styles/tokens.css`; stylelint forbids raw colors, lengths and font sizes elsewhere.

### Transport security

No network server: the interface reaches the main process only through IPC. The main process checks the input contract of every handler, loads only the built interface (no remote content), and sets a Content-Security-Policy without remote scripts.

### Verification command

`npm run verify`, which stops at the first failure: `tsc -b`, `eslint .`, `stylelint "apps/interface/src/**/*.css"`, `depcruise apps packages tests --config .dependency-cruiser.cjs`, the unit and integration tests of each workspace.

### End-to-end tests

- Runner: Playwright with playwright-bdd, configured in `tests/e2e/playwright.config.ts`; each scenario launches the built application with `_electron.launch()` in test mode (`APP_MODE=test`, an empty data folder), and drives its window.
- Native dialogs are answered in test mode by the dialog handlers, from a file the scenario prepares through the test entry point; no other code is replaced.
- Generate, export the catalog and run as with playwright-bdd: `npx bddgen -c tests/e2e/playwright.config.ts`, `npx bddgen export -c tests/e2e/playwright.config.ts`, `npx playwright test -c tests/e2e/playwright.config.ts`.
- Steps go through page objects only: an ESLint rule on `tests/e2e/steps/` forbids `page.locator` and `page.getBy*`.

### Observing the running application

An MCP server able to attach to the window of the application started in test mode (for example through the remote debugging port of Electron): to choose with the research of `check`.
