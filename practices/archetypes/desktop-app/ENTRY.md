---
id: desktop-app
kind: archetype
version: 1.0.0
status: stable
summary: An application installed on the machine, often offline, with access to the file system.
invariant: >
  Applied as is. The main process is an Application: it holds the composition root, and each handler of
  inter-process messages (IPC) is an entry point. The interface process takes no business decision and
  reaches the core only through these handlers.
interview:
  - On which operating systems is it installed, and how is it updated?
  - Which native features does it use (files and folders, dialogs, notifications, tray)?
recipes: [ts-electron-angular]
practices: [frontend-architecture]
skills: [f3-stack-angular-new-app, f3-stack-angular-developer]
workflow-impact:
  e2e: the runner launches the built application and drives its window, native dialogs included
  entry-points: each IPC handler is an entry point, one file per handler with its input and output contracts
  ui: the views of ux/views.md are the windows and pages of the interface process
  observation: an MCP server attached to the window of the application started in test mode
---

# desktop-app

## When to choose it

- The product works without a network, or keeps its data on the machine.
- It needs the file system, native dialogs or the operating system beyond what a browser allows.

## When not to choose it

- A browser is enough and the data live on a server: `web-app`.
- It is only a command line tool: `cli-tool`.

## Known pitfalls

- The interface process with access to Node.js or the file system: keep it isolated, with only the handlers exposed through a preload bridge.
- A path received from the interface and used as is by the main process: a path is a technical identifier (rule 12); the main process receives it only from a dialog entry point and converts it at once into a domain identity.
- End-to-end tests that call the handlers instead of launching the application.
- Packaging and updates decided late: they shape the build from the first change.
