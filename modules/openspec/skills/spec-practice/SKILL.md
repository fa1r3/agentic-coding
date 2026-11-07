---
name: spec-practice
description: "Rules for writing the requirements and scenarios of OpenSpec specs in an f3 project: behavior only, scenarios as short reusable steps with explicit data, so that each scenario becomes an executable feature file. Load before writing, completing or reviewing a requirement or a scenario."
---

# Spec practice

These rules apply to whoever writes, reviews or amends a spec. They complete the OpenSpec format: a requirement starts with `### Requirement:` and its text contains SHALL or MUST; each scenario starts with `#### Scenario:`.

The f3-features script converts every scenario literally into Gherkin: the capability becomes a Feature, the requirement a Rule, each step a Given, When, Then, And or But step. The tester binds each step sentence to code once, and reuses that binding wherever the sentence appears. A scenario written as two long descriptive sentences needs its own binding and proves no more than its title: these rules keep steps short, reused and checkable.

## Vocabulary

- **Capability**: a durable behavior of the product, which owns its requirements. Its spec is in `openspec/specs/<capability>/spec.md`.
- **Requirement**: one expected behavior, stated as one rule.
- **Scenario**: an example that proves a requirement, unrolled step by step, from the starting state to the observable result.
- **Step**: one line of a scenario, starting with `- **GIVEN**`, `- **WHEN**`, `- **THEN**`, `- **AND**` or `- **BUT**`.
- **Business gesture**: an action of the user or of the system expressed with the terms of the business, for example "the accountant issues the invoice". A gesture never says how the interface performs it.
- **Observable**: what the user can see without reading the code or the database: information shown, the state of a screen, a file produced, a message.
- **Step catalog**: the step sentences that already exist in the project, in two places: the specs of `openspec/specs/` and of the changes in progress, and the step definitions of the end-to-end test project, listed by the "export the step catalog" command of the Stack section of AGENTS.md.

## Rules

1. **One requirement, one behavior.** A requirement that covers several behaviors is split. Examples and edge cases go into its scenarios, not into its statement.
2. **Behavior, never appearance.** A spec says what the user can know or do, and when. It never says where or in what form: no button, no menu, no screen label, no color, no position. The design decides the presentation, and the tester finds on screen how a gesture is performed.
3. **Steps in order.** A scenario is a sequence of steps in this order: optional GIVEN steps (the starting state), then WHEN steps (the gestures), then THEN steps (the results). AND and BUT continue the previous kind of step. The f3-features script rejects any other order and any line of a scenario that is not a step.
4. **One fact or one action per step.** A GIVEN states one fact of the starting state. A WHEN is one gesture. A THEN is one observable result. A sentence that joins two facts, two gestures or two results with "and" or a comma is split into two steps.
5. **Explicit data.** A step names its data: "a draft invoice F-2024-001 for the customer Dupont with a line of 100 euros", not "an invoice". A scenario never depends on another scenario or on the order of execution.
6. **Business gestures.** Each WHEN is a business gesture, built with an action verb of `CONTEXT.md`. An action missing from `CONTEXT.md` is added there before it is used.
7. **Reuse the catalog.** Before writing a step, look in the step catalog for a sentence that says the same thing, and reuse it word for word, changing only its data. A new step is a deliberate choice: when you write one, say so in your closing message, with the existing sentences you considered.
8. **Same data, same place in the sentence.** In a step, data that varies (a number, a name, a quoted text) appears in quotes or as a number, so that one step definition serves every scenario that uses the sentence with other data: `the invoice "F-2024-001" has the status "issued"`.
9. **An expected result is observable and checkable.** It gives the expected value when it matters (a number, an order, a business text), never a judgment such as "correctly" or "quickly" without a threshold.
10. **States and errors are scenarios.** For each piece of information shown: the empty case, the nominal case, and the edge case that the volumetry of the project makes likely. For each gesture: the success, each refusal and each error the user can cause or suffer.
11. **Scenario name.** It sums up the situation in a few words, it is unique in its requirement, and it does not change without a reason: it is the name the test carries.

## Checks

After writing or amending specs, run `node ~/.local/share/f3/scripts/f3-features.mjs --check <change-id>` and `openspec validate <change-id>`, and fix every error. The first checks the form of the steps only (keywords and order), not the rules above.

## Example

Fictional invoicing project: not to be reused.

Not to write:

~~~markdown
#### Scenario: Issuing
- **WHEN** the user clicks the "Issue" button at the top of the screen and the invoice is complete
- **THEN** the invoice is correctly issued and appears in the list with its total
~~~

To write:

~~~markdown
### Requirement: Issue an invoice
The system SHALL let the accountant issue a draft invoice whose lines all have an amount.

#### Scenario: Issuing a complete draft
- **GIVEN** a draft invoice "F-2024-001" for the customer "Dupont"
- **AND** the invoice "F-2024-001" has a line "Consulting" of 100 euros
- **AND** the invoice "F-2024-001" has a line "Travel" of 20 euros
- **WHEN** the accountant opens the invoice "F-2024-001"
- **AND** the accountant issues the invoice
- **THEN** the invoice "F-2024-001" has the status "issued"
- **AND** the total of the invoice is 120 euros
- **AND** the invoice can no longer be edited

#### Scenario: Issuing refused for a line without amount
- **GIVEN** a draft invoice "F-2024-002" for the customer "Dupont"
- **AND** the invoice "F-2024-002" has a line "Consulting" without amount
- **WHEN** the accountant opens the invoice "F-2024-002"
- **AND** the accountant issues the invoice
- **THEN** the issuing is refused with the reason "A line has no amount"
- **AND** the invoice "F-2024-002" has the status "draft"
~~~

The steps "the accountant opens the invoice", "the accountant issues the invoice" and "the invoice ... has the status ..." are written the same way in both scenarios, and in every other scenario of the project that needs them: each is bound to code once.

## Amendments

Once the Tres Amigos step of a change is validated (`validations/amigos.md` exists), a change to its specs, its `proposal.md`, the entries of `tests/e2e/manual-scenarios.md` for its scenarios or a term of `CONTEXT.md` is an amendment. It corrects them without sending the change back to the start: no step is reopened, and the validations stay valid, because the user validates each amendment.

- **Who.** The agent of the step in progress, when its command offers it: the ux agent in /f3-ux-design, the architect in /f3-design and /f3-design-review, the tester in /f3-acceptance, and the analyst whenever the user asks. The developer never amends: it reports what it finds.
- **Scope.** Within the proposal of the change, its capabilities and its What Changes section. A need outside them is a backlog entry or a new change with /f3-propose. The proposal itself is amended only to describe the specs as validated or amended, never to add a need the specs do not contain.
- **Proposal.** For each element concerned (requirement, scenario, part of the proposal, entry of the register, term): the current text, the proposed text, the reason in one sentence, and the files of the following steps it affects. If it changes an expected result (a THEN step), removes a scenario or reduces what a scenario proves, say so explicitly in one sentence. When it is a pragmatic way around a problem rather than the right formulation of the need, also propose a `BACKLOG.md` entry to rework the requirement in a Tres Amigos session.
- **Validation.** Nothing is written before the user validates this exact text. If the user prefers a Tres Amigos session, write nothing: `/f3-tres-amigos <change-id>` reopens the step.
- **Writing.** Write the validated text following the rules above, then the checks. A renamed scenario that has an entry in `tests/e2e/manual-scenarios.md` gets its heading changed in the same amendment.
- **Record.** At the end of the change's `tres-amigos.md`, numbered in its own sequence from 1:

~~~markdown
## Amendment <number>: <date as YYYY-MM-DD>

- Step: <ux-design, design, design-review, acceptance, or on request>
- Concerned: <capability> › <requirement>, or <capability> › <requirement> › <scenario>, or the file and its part: proposal.md and its section, the entry of tests/e2e/manual-scenarios.md, the term of CONTEXT.md
- Reason: <one sentence>
- Before: <the current text, quoted>
- After: <the validated text, quoted>
- Changes what is proven: <"no", or the sentence said to the user>
- Following files: <each file of the following steps affected, and whether it was updated or reported, to whom>
- Backlog: <B-<number>, or "none">
~~~

- **Following files.** Update those within your writing scope in the same step. Report the others, each with the command that handles it: a screen to redraw with `/f3-ux-design <change-id>`, a task to change with `/f3-design <change-id>`, or, when the tasks concerned are already checked, a ticket for the developer.
