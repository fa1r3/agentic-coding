# arch/decisions.md template

`arch/decisions.md` records the structural decisions of the project and their reasons: the stack chosen at framing, and every decision of a change that commits the following changes (a new technology, a new storage, a new external dependency, a new kind of entry point). AGENTS.md says what the code must do; this register says why, and which options were set aside.

It is written by /f3-init for the stack, and by /f3-design or /f3-design-review when a change takes such a decision, always after the user's validation. It is read when writing a design.md and during the design review. Decisions that concern a single change stay in its design.md.

## File at creation

~~~markdown
# Architecture decisions

No decision recorded.
~~~

The line "No decision recorded." is removed when the first entry is added.

## Entry format

~~~markdown
## A-<number>: <title>

- Status: <status>
- Origin: <origin>
- Context: <the constraints that led to the decision>
- Decision: <the decision>
- Options set aside: <each option considered, with the reason it was not kept>
- Consequences: <what the code and the following changes must respect>
~~~

- `<number>`: three digits, given in order from 001.
- `<title>`: the decision in a few words.
- `<status>`: `active`, or `replaced by A-<number>`.
- `<origin>`: `initial framing`, or `change <change-id>`, followed by the date as YYYY-MM-DD.

## Rules

1. Entries are added at the end of the file, in the order of their number.
2. An existing entry is never modified, except its status when a new entry replaces it.
3. An entry that replaces another contains, right after its Status line, the line `- Replaces: A-<number>`.
4. A decision that the code must respect at every moment also becomes a rule of the Stack section of AGENTS.md, which cites the entry number.
5. A decision whose reason the user does not know is recorded with `Context: reason not documented`.
6. The headings and field labels stay in English; the content is written in the project language.

## Complete example

Fictional invoicing project: not to be reused.

~~~markdown
# Architecture decisions

## A-001: Web application in TypeScript, Nx monorepo

- Status: active
- Origin: initial framing, 2026-02-20
- Context: accountants work in a browser on office computers; one developer maintains the product with a local agent; the design tool works with web layouts.
- Decision: an Angular interface served by a Node HTTP API, in an Nx monorepo whose lint rules enforce the dependency direction.
- Options set aside: a desktop application, because users do not install software on their office computers; a server-rendered interface, because the interface needs rich tables with keyboard navigation.
- Consequences: every entry point is an HTTP endpoint; every module is an Nx project.

## A-002: PostgreSQL for invoices

- Status: active
- Origin: change add-invoice-issuing, 2026-03-02
- Context: issued invoices must never be lost, and their numbering must have no gap even with concurrent issuing.
- Decision: invoices are stored in PostgreSQL; the final number comes from a sequence inside the issuing transaction.
- Options set aside: an embedded database, because several users issue invoices at the same time.
- Consequences: the invoicing adapters depend on PostgreSQL; a change that stores invoices elsewhere first replaces this entry.
~~~
