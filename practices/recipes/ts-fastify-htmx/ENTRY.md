---
id: ts-fastify-htmx
kind: recipe
version: 1.0.0
status: stable
summary: TypeScript in npm workspaces, a Fastify server rendering HTML with htmx, dependency-cruiser, Playwright with playwright-bdd.
applies-when:
  archetypes: [web-app]
  ui: yes
  languages: [typescript]
check:
  - the current LTS of Node.js and the current major of TypeScript
  - the maintenance and the license of Fastify, htmx, @kitajs/html, dependency-cruiser, Playwright and playwright-bdd
  - that playwright-bdd supports the current major of Playwright
  - the current release of the Playwright MCP server
---

Draft of the Stack section, practiced on a server-rendered product (multi-tool plan, step 8). The architect adapts names, versions and the security sub-section to the project.

### Modules

TypeScript repository with npm workspaces. A module is an npm workspace with its own `package.json`, named `@app/<module>`, which declares its dependencies. Each module and the application keep their unit and integration tests in `tests/`, mirroring `src/`, with the suffix `.test.ts` (rule 13).

```
apps/
└── web/                              application @app/web: Fastify server, entry points, views, composition root
    └── src/
        ├── server.ts                 starts Fastify from the composition root
        ├── composition-root/<bounded-context>.ts
        ├── endpoints/<bounded-context>/   one file per endpoint
        ├── views/<bounded-context>/  one file per view
        ├── components/               shared view components
        └── styles/                   tokens.css and the style sheets
packages/
├── orchestration/                    orchestration module @app/orchestration, once a workflow needs it
└── <bounded-context>/
    ├── core/                         core module @app/<bounded-context>-core: src/{domain,application}/
    └── adapters-<technology>/        adapter module @app/<bounded-context>-adapters-<technology>
tests/
└── e2e/                              end-to-end test project @app/e2e
```

TypeScript project references (`tsc -b`) build each workspace into its `dist/`; the application runs the built code with `node`.

### Dependency enforcement

dependency-cruiser, configured in `.dependency-cruiser.cjs` at the root, reproduces the Dependencies table of the invariant part from the paths above: `packages/*/core/` imports no other module, no npm package and no Node.js built-in module, and inside it `src/domain/` never imports `src/application/`; `packages/<bounded-context>/adapters-*/` imports, among the modules, only its own core; `packages/orchestration/` imports only `packages/*/core/`; `tests/e2e/` imports nothing from `apps/` or `packages/`; a module imports only the npm packages its `package.json` declares; no cycle.

### Entry points

HTTP endpoints of Fastify in `apps/web/src/endpoints/<bounded-context>/`, one file per endpoint, with its input contract declared as a Fastify JSON schema (parameters, query, form body) and its output contract as a view model type. A `GET` endpoint renders a full page, or only the fragment of the view when the request carries the `HX-Request` header. A form `POST` returns the updated fragment to htmx, or redirects (303) to the page of the result.

### User interface

Server-rendered HTML with htmx for partial updates; no client-side framework and no business calculation in the browser. A view is a page displayed by one `GET` route: a JSX component of @kitajs/html in `apps/web/src/views/<bounded-context>/<view-name>.tsx`, which receives a view model and exports its fragments as named components for htmx swaps. The name of a view, in `ux/views.md` and in the end-to-end page objects, is the name of its file without extension. Shared components live in `apps/web/src/components/`, one file per component. Every interpolated value is escaped: `xss-scan` of @kitajs/ts-html-plugin fails on an unescaped value. The design tokens live in `apps/web/src/styles/tokens.css`, one CSS custom property per token, its dots replaced by hyphens; stylelint with stylelint-declaration-strict-value forbids raw colors, lengths and font sizes outside `tokens.css`.

### Transport security

To adapt to the exposure of the project. The server listens on the address of `HOST` (`127.0.0.1` by default). Behind a reverse proxy, TLS ends at the proxy and Fastify trusts only its address for the forwarded headers. With accounts: a session cookie `HttpOnly`, `Secure` outside test mode, `SameSite=Lax`; a CSRF token on every `POST`, sent by htmx in a header; failed logins limited. Every response carries a Content-Security-Policy that allows scripts only from the application itself.

### Verification command

`npm run verify`, which runs in order and stops at the first failure: `tsc -b`, `eslint .`, `stylelint "apps/web/src/styles/**/*.css"`, `xss-scan -p apps/web/tsconfig.json`, `depcruise apps packages tests --config .dependency-cruiser.cjs`, `vitest run`.

### End-to-end tests

- Runner: Playwright with playwright-bdd, configured in `tests/e2e/playwright.config.ts`: feature files in `tests/e2e/features/`, step definitions in `tests/e2e/steps/`, page objects in `tests/e2e/pages/`. The `webServer` option starts the application with `npm run start:test`, which builds the repository and starts `web` on `http://127.0.0.1:3100` in test mode with an empty data directory.
- Playwright runs with `workers: 1` and calls `POST /__test/reset` before each scenario; the test entry points exist only in test mode.
- The scenarios tagged `@manual` are excluded by the option `tags: 'not @manual'` of `defineBddConfig`.
- Generate the tests: `npx bddgen -c tests/e2e/playwright.config.ts`. Export the step catalog: `npx bddgen export -c tests/e2e/playwright.config.ts`.
- Run the whole suite: `npx bddgen -c tests/e2e/playwright.config.ts && npx playwright test -c tests/e2e/playwright.config.ts`; one capability: the same, followed by its name.
- The ESLint rule `no-restricted-syntax` on `tests/e2e/steps/` forbids `page.locator` and `page.getBy*`: steps go through page objects.

### Observing the running application

The Playwright MCP server (`@playwright/mcp`), named `playwright`, opens the application started with `npm run start:test` at `http://127.0.0.1:3100`.
