---
id: ui-library
kind: archetype
version: 1.0.0
status: draft
summary: A published library of interface components, with a playground, and no business rule.
invariant: >
  Applied as is. Without business rules, the library has no bounded context and no use case: rules 1 to
  8 and 12 have nothing to apply to, and a business rule appearing in it means the project is of another
  archetype. The playground is the launched application of rule 14; like any application, it holds no
  business rule (rule 9). Each component is part of the public API of the package.
interview:
  - Which projects consume the components, and with which interface framework?
  - Which design tool holds the components, and how are the design tokens published?
recipes: []
practices: [frontend-architecture]
skills: []
workflow-impact:
  e2e: the tests drive the playground started in test mode; each story is a view of ux/views.md
  ui: the components of the design tool are the components of the package, with the same names
  observation: a browser MCP server opens the playground
---

# ui-library

## When to choose it

- A design system or a set of components shared by several products, released on its own.

## When not to choose it

- The components serve one product: they are part of its interface.
- The package carries business rules: `library`.

## Known pitfalls

- A component that fetches data or knows a route: it receives inputs and emits events (rule FA-2 of `frontend-architecture`).
- Stories that do not cover the states of the component.
- A token value written in a component instead of the token.
