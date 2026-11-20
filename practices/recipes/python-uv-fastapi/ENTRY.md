---
id: python-uv-fastapi
kind: recipe
version: 1.0.0
status: stable
summary: A Python service with uv workspaces, FastAPI, an OpenAPI contract published as a client package, import-linter, behave, neighbours replaced by Prism mock servers.
applies-when:
  archetypes: [service]
  languages: [python]
check:
  - the current supported Python versions and the current release of uv
  - the maintenance and the license of FastAPI, import-linter, behave, Schemathesis, Prism and the OpenAPI client generator
  - that behave can fail on undefined steps in a dry run, and export its steps
---

Draft of the Stack section for a service that publishes an HTTP contract. The architect adapts names, versions, the contract format and the transport security to the project.

### Modules

Python repository with uv workspaces. A module is a workspace member with its own `pyproject.toml`, named `<service>-<module>`. Each module keeps its unit and integration tests in `tests/`, mirroring `src/`, with the prefix `test_` (rule 13).

```
apps/
└── api/                           application <service>-api: FastAPI endpoints, composition root
packages/
├── <bounded-context>/
│   ├── core/                      <service>-<bounded-context>-core: src/<pkg>/{domain,application}/
│   └── adapters-<technology>/     <service>-<bounded-context>-adapters-<technology>
└── client/                        <service>-client: the client package, generated from contract/openapi.yaml
contract/
└── openapi.yaml                   the published contract, versioned with semver in info.version
tests/
└── e2e/                           end-to-end test project
```

### Dependency enforcement

import-linter, configured in `.importlinter` at the root: a core imports no other module and no third-party package; adapters import, among the modules, only their own core; `apps/api` imports the cores and adapters; a neighbour's client package is imported only by the adapter of that neighbour; `tests/e2e` imports nothing from `apps/` or `packages/`, except the generated client of this service.

### Entry points

FastAPI endpoints in `apps/api/src/<pkg>/endpoints/<bounded-context>/`, one file per endpoint, with Pydantic input and output models that match `contract/openapi.yaml`. A command endpoint accepts an `Idempotency-Key` header. The contract is the source: a test fails when the OpenAPI document the application serves differs from `contract/openapi.yaml`.

### User interface

None.

### Transport security

To adapt to the exposure of the project: the service listens on the address of `HOST`; callers authenticate with the means the contract declares (OAuth 2 client credentials, mutual TLS); every input is validated by its model before translation into domain types.

### Verification command

`uv run poe verify`, which stops at the first failure: `ruff check`, `ruff format --check`, `pyright`, `lint-imports`, `pytest` (unit and integration tests), `schemathesis run contract/openapi.yaml` against the service started in test mode (provider contract tests).

### End-to-end tests

- Runner: behave, configured in `tests/e2e/behave.ini`: feature files in `tests/e2e/features/`, step definitions in `tests/e2e/steps/`, access objects in `tests/e2e/access/`, one per resource of the contract, using the generated client.
- Test mode: `uv run poe start-test` starts the service alone with `APP_MODE=test`, an empty database, and each neighbour replaced by a Prism mock server started from the OpenAPI document of its published contract, at the version in the lock file, in `tests/e2e/support/neighbours/`. `POST /__test/reset` empties the data before each scenario.
- The scenarios tagged `@manual` are excluded by `tags = -manual` in `behave.ini`.
- Generate the tests: `uv run behave --dry-run --strict tests/e2e/features`. It fails and lists the undefined steps.
- Export the step catalog: `uv run behave --dry-run --format steps.catalog tests/e2e/features`.
- Run the whole suite: `uv run poe start-test && uv run behave tests/e2e/features`; one capability: the same, with `tests/e2e/features/<capability>.feature`.
- A ruff rule on `tests/e2e/steps/` forbids importing the client: steps go through access objects.

### Observing the running application

None for a person; an agent calls the service started with `uv run poe start-test` through its client or `curl`, at `http://127.0.0.1:8100`.
