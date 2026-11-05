# BACKLOG.md template

`BACKLOG.md`, at the repository root, is the only place for ideas that are not planned yet: what a clarification left out of scope, the parts of a change that was split, the points set aside during a review, defects found outside the scope of a change. It lets a change stay focused without losing anything.

/f3-propose manages it: it creates entries, sorts them with the user and proposes the next change. /f3-init, /f3-tres-amigos, /f3-ux-design, /f3-design, /f3-design-review and /f3-acceptance add entries; /f3-archive closes the entry of the archived change. No entry is added, changed or dropped without the user's agreement.

## File at creation

~~~markdown
# Backlog

Ideas not planned yet. Open entries are kept in priority order, decided with the user.

No entry.
~~~

The line "No entry." is removed when the first entry is added.

## Entry format

~~~markdown
## B-<number>: <title>

- Status: <status>
- Origin: <origin>
- Description: <two or three lines: the idea, and what is known about it>
~~~

- `<number>`: three digits, given in order from 001. A number is never reused.
- `<title>`: the idea in a few words.
- `<status>`: `open`, `in-progress <change-id>`, `done <change-id>` or `dropped`, followed for `dropped` by the reason.
- `<origin>`: `initial framing`, or `<change-id>, <step>`, followed by the date as YYYY-MM-DD. The step is one of `propose`, `tres-amigos`, `ux-design`, `design`, `design-review`, `conformity`, `acceptance`.

## Rules

1. Open entries are kept in priority order: when sorting, entries move and keep their number.
2. An entry is never deleted: it changes status.
3. When a change is created from an entry, its status becomes `in-progress <change-id>`. When the change is archived, it becomes `done <change-id>`.
4. The headings, field labels and statuses stay in English; the titles and descriptions are written in the project language.

## Complete example

Fictional invoicing project: not to be reused.

~~~markdown
# Backlog

Ideas not planned yet. Open entries are kept in priority order, decided with the user.

## B-003: Credit notes

- Status: open
- Origin: add-invoice-issuing, propose, 2026-03-02
- Description: cancel an issued invoice by issuing a credit note. Left out of add-invoice-issuing to keep the change small.

## B-001: Recurring invoices

- Status: open
- Origin: initial framing, 2026-02-20
- Description: issue the same invoice every month to a customer.

## B-002: Invoice issuing

- Status: done add-invoice-issuing
- Origin: initial framing, 2026-02-20
- Description: issue a draft invoice whose lines all have an amount.
~~~
