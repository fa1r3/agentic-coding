# ux/decisions.md template

Register of the design decisions that hold for the whole project. Entries are only ever added. A decision is about presentation, never about behavior, which belongs to the specs.

## File at creation

~~~markdown
# Design decisions

No decision recorded.
~~~

The line "No decision recorded." is removed when the first entry is added.

## Entry format

~~~markdown
## D-<number>: <title>

- Status: active
- Origin: change <id>, <date>
- Decision: <decision>
- Reason: <reason>
- Scope: <scope>
~~~

- `<number>`: three digits, given in order from 001.
- `<title>`: the decision summed up in a few words.
- `<id>`: the identifier of the OpenSpec change the decision comes from.
- `<date>`: the date of archiving of that change, as YYYY-MM-DD.
- `<scope>`: the part of the interface concerned, or "the whole product".
- Status: "active", or "replaced by D-<number>".

The headings and field labels stay in English; the content is written in the project language.

## Rules

1. Entries are added at the end of the file, in the order of their number.
2. An existing entry is never modified, except its status when a new entry replaces it.
3. An entry that replaces another contains, right after its Status line, the line "- Replaces: D-<number>".
4. A decision never contradicts `ux/brief.md`. If it should, it is the brief that must be modified, on the user's decision.

## Complete example

Fictional invoicing project: not to be reused.

~~~markdown
# Design decisions

## D-001: Statuses as colored pills

- Status: replaced by D-002
- Origin: change add-invoice-issuing, 2026-03-02
- Decision: the status of an invoice is shown in a pill with a colored background, with its label.
- Reason: spot the issued invoices at a glance in a dense list.
- Scope: the whole product.

## D-002: Statuses as icon and label

- Status: active
- Replaces: D-001
- Origin: change add-invoice-archive, 2026-04-15
- Decision: the status of an invoice is shown by an icon and a label, without a colored background.
- Reason: the colored pills made the lists look like a dashboard, which the brief excludes.
- Scope: the whole product.
~~~
