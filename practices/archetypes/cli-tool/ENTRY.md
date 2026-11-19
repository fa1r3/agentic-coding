---
id: cli-tool
kind: archetype
version: 1.0.0
status: stable
summary: A command line tool, run by a person or a script, with no graphical interface.
invariant: >
  Applied as is. The executable is an Application; each command is an entry point: it translates its
  arguments and its input into domain types, calls one use case, and translates the result into its
  output and its exit code.
interview:
  - Is it run mostly by a person, by scripts, or both?
  - Does it read or write files, the standard input and output, or the network?
recipes: []
practices: []
skills: []
workflow-impact:
  ui: no user interface and no design step; the output of each command is its contract
  e2e: the tests run the built executable with arguments and input, and check its output, its files and its exit code
  entry-points: each command is an entry point, one file per command with its arguments, input and output contracts
---

# cli-tool

## When to choose it

- The product is used from a terminal or from scripts.
- Its interface is its arguments, its input, its output and its exit codes.

## When not to choose it

- A person needs screens to work: `desktop-app` or `web-app`.
- Other programs call it as a library rather than as a process: `library`.

## Known pitfalls

- Output meant for people parsed by scripts: offer a machine-readable output (JSON lines, a stable format) and keep it in the contract.
- Exit codes left to chance: each failure class has its code, listed in the contract.
- Tests that import the commands instead of running the executable (rule 14).
