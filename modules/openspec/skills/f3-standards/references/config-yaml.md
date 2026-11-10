# openspec/config.yaml template

`openspec/config.yaml` of an f3 project carries the product (the `context`), one artifact rule that depends on the project's modules, and pointers to the commands that conduct implementation and archiving. The workflow itself is carried by the OpenSpec schema `f3`, which the file names.

The `operations` guidance of OpenSpec is advisory only: an agent may ignore it. No rule that must hold is placed there; such rules live in the schema, the agents and the commands.

## Structure

The file contains exactly the keys of the block below, in this order. Only the `context` is written from the interview; the `rules` and `operations` blocks are copied as they are.

~~~yaml
schema: f3

context: |
  Product
  <what the product does, for whom, and the problem it solves, in two to four lines>

  Users
  - <profile, technical level, situation of use>

  Expected behavior
  - <one line per main function, in terms of behavior>

  Out of scope
  - <what the product will never do>

  Volumetry
  - <order of magnitude of a piece of data and its consequence for the user, for example "up to 100,000 invoices per company">

  Platform and constraints
  - <systems, offline operation, interface language, legal constraints>

  Security and data
  - <sensitivity of the data, network exposure, personal data>

  Design tool
  <"The design is kept in <tool>. The skill of this tool is <skill>.", or "No design tool.">

  Language
  The prose of the artifacts (specs, clarification, design, ux files, BACKLOG.md, arch/decisions.md, reports) is written in <language>. Headings, field labels, statuses and file names stay in English. Code (identifiers, comments, commit messages) is in English.

  To be clarified
  - <point left open during the interview, with the default value kept>

rules:
  proposal:
    - Identify the bounded contexts concerned by reading the README.md of each bounded context listed in the Modules subsection of the Stack section of AGENTS.md.
    - If no existing bounded context covers the need, propose a new bounded context in the proposal, with its name and its responsibility. Its creation must be validated by the user before the change goes on.

operations:
  apply:
    guidance:
      - "Implementation is conducted by the developer agent through f3 dev <change-id>. If you are not the developer agent, stop and tell the user to run f3 dev <change-id>."
  archive:
    guidance:
      - "Archiving is conducted by f3 archive <change-id>. If you are not running f3 archive, stop and tell the user to run it."
~~~

## Writing rules for the context

- Each line lets someone decide a concrete case while writing a spec or a design. An adjective alone, such as "fast", is turned into an order of magnitude.
- The context describes the product, never the implementation: no library, no framework, no code structure (they are in AGENTS.md and arch/decisions.md).
- The part titles (Product, Users, Expected behavior, Out of scope, Volumetry, Platform and constraints, Security and data, Design tool, Language, To be clarified) are kept in English, as written above. The content is written in the language of the Language part.
- A part without content contains the single line "- None.". The To be clarified part contains "- None." if nothing was left open.
- No angle bracket remains in the written file.
