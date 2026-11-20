---
id: web-app
kind: archetype
version: 1.0.0
status: stable
summary: A web interface and the server that serves it, for one product, in one repository.
invariant: >
  Applied as is. The server is an Application; its HTTP endpoints are its entry points. A client-side
  interface, if any, is part of the interface of that Application: it calls only the entry points and
  takes no business decision.
interview:
  - Does the interface render on the server, in the browser, or both?
  - Is the server reachable from the internet, or only from a private network?
recipes: []
practices: [frontend-architecture]
skills: []
workflow-impact:
  e2e: the server is started in test mode by the runner; the tests drive a browser on it
  ui: the views of ux/views.md are the pages of the interface
  observation: a browser MCP server opens the application started in test mode
---

# web-app

## When to choose it

- One product, used through a browser, whose server and interface change together.
- One team, one deployment: the interface and the server are released at the same time.
- Several bounded contexts are fine: they stay modules of this repository (rule 6).

## When not to choose it

- The interface is installed on the machine, works offline or needs the file system: `desktop-app`.
- The server is consumed by other products, which release on their own schedule: it is a `service`, and each consumer is its own project.
- The product is a set of reusable components for other products: `ui-library`.

## Known pitfalls

- A client-side framework that re-implements business conditions to enable or disable actions: the entry point says what the user may do (rule FA-3 of `frontend-architecture`).
- An API designed for the screens of today and called "public" by another product: once another product depends on it, that product is a separate project and the API a published contract.
- Test entry points (reset, clock) reachable outside test mode.
