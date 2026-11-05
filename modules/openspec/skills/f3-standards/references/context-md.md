# CONTEXT.md template

`CONTEXT.md`, at the repository root, is the only business glossary of the project. Each concept and each action of the business has a single name in the project language and a single English term, used in code. The gestures of the scenarios in the specs are built with its actions.

## Structure

~~~markdown
# Domain vocabulary

Single business term for the whole code. Each term is defined in the project language, followed by the English term used in code.

- **<Term>** (<English term>): <definition in one or two sentences, which distinguishes this term from the neighboring terms>.
~~~

The title and the introduction line stay in English. The terms and their definitions are written in the project language.

## Rules

- A concept is a noun ("Invoice"). An action is a verb in the infinitive ("Issue"), whose definition says what changes in the business.
- A definition only uses terms of the glossary or of everyday language.
- Terms are in the order in which one discovers them by following the business, concepts before the actions that handle them.
- A term is never renamed silently: a renaming is decided by the user, and the code is renamed in the same change.

## Example

Fictional invoicing project, in English: not to be reused.

~~~markdown
# Domain vocabulary

Single business term for the whole code. Each term is defined in the project language, followed by the English term used in code.

- **Invoice** (Invoice): document that asks a customer to pay for services. It is a draft until it is issued.
- **Line** (Line): a service invoiced, with its label and its amount.
- **Issue** (Issue): action that freezes a draft invoice and gives it its final number.
~~~
