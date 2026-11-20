---
id: library
kind: archetype
version: 1.0.0
status: draft
summary: A published package with business rules (an SDK, an API client, a calculation engine), consumed by other projects.
invariant: >
  The built package, installed as a consumer would install it, is the launched application of rule 14:
  the end-to-end harness imports only its public API, never a module of the repository. Each function or
  class of the public API is an entry point (rule 10). The composition root (rule 11) is the public
  factory of the package: it receives the adapters that only the consumer can provide and instantiates
  its own.
interview:
  - Who consumes the package, and through which package registry?
  - Which adapters must the consumer provide (storage, clock, network), and which does the package bring?
recipes: [ts-npm-library]
practices: []
skills: []
workflow-impact:
  modules: the reference of the public API is the published contract, in contract/
  e2e: a harness in tests/e2e/ installs the built package and calls only its public API
  ui: no user interface and no design step; the public API is the contract
  entry-points: the functions and classes of the public API, exported from one entry file
---

# library

## When to choose it

- Other projects depend on this code through a package manager, with their own release schedule.
- The package carries business rules; without any, see `ui-library` or a technical library inside a project.

## When not to choose it

- The code serves a single product: it is a module of that product (rule 8).
- The package is a set of interface components: `ui-library`.

## Known pitfalls

- An internal type that leaks through the public API: once exported, it is part of the contract.
- A breaking change without a major version.
- End-to-end tests that import the sources instead of the built package.
