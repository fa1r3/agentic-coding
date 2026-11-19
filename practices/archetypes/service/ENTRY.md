---
id: service
kind: archetype
version: 1.0.0
status: draft
summary: A service deployed on its own, which publishes its contract and consumes those of other services through their packages.
invariant: >
  The service is an Application. Every other service is an external system: a port of the project,
  implemented by an adapter that uses the client package the other service publishes. No type is shared
  with another service: the adapter translates the types of the contract into the types of the domain.
interview:
  - Which services does this service call, and in what form do they publish their contract?
  - Synchronous communication, asynchronous, or both?
  - In what form does this service publish its own contract?
recipes: []
practices: [service-contracts]
skills: []
workflow-impact:
  e2e: the service is launched alone; its neighbours are doubles generated from their published contracts
  ui: no user interface unless the service exposes one
---

# service

## When to choose it

- The service is deployed and released on its own, by its own team, and other projects depend on it through its published contract.

## When not to choose it

- One product, one team, one deployment: prefer `web-app`, with bounded contexts inside the repository.
- Several services described at once: each one is its own f3 project (D1); frame one at a time.

## Known pitfalls

- A shared library of types between services: it couples their releases; each service keeps its own types (D3).
- Tests that need the real neighbours: the service is tested alone (D15); the real integration belongs to deployment.
- A breaking change of the contract inside a major version.
