---
id: pattern-file-names
kind: rules
code: PN
title: Pattern in file names
version: 1.0.0
status: stable
summary: Naming each file after its subject and the architecture pattern it implements, in the form of the conventions of the stack.
requires: []
conflicts: []
pairs-with: []
size-budget: 20
---

PN-1. **A file named after its subject and its pattern.** A file that implements one role of the architecture (use case, controller, repository, port, adapter, entity, mapper, gateway, view model…) carries that role in its name, after the business subject it handles. Reason: the role is read in a file list, a search or an import, without opening the file. Example: `create-task.usecase.ts` or `CreateTaskUseCase.java`, never `create-task.ts` nor `TaskCreation`.
PN-2. **The form follows the conventions of the stack.** Case, separator and position of the pattern (suffix, extension-like `.usecase.ts`, class suffix) are those of the language and the framework, and of their generators when they have one; the Stack section names the form chosen, with an example per pattern. Reason: a form foreign to the stack fights its tools and surprises its readers. Example: `invoice.repository.ts` in a TypeScript project with Angular or NestJS, `InvoiceRepository.java` in Java, `invoice_repository.py` in Python.
PN-3. **One form for the whole project.** Every file of a pattern uses the form of PN-2, and the vocabulary of patterns is fixed once, in the Stack section: one word per role (`usecase`, not `usecase` here and `interactor` there). Reason: a name that varies by file cannot be searched, nor checked by a tool.
PN-4. **The name and the place agree.** A file named after a pattern lives in the layer or folder of that pattern and implements nothing else; a file whose role changes is renamed in the same change. Reason: a name that no longer tells the truth is worse than none. Example: `invoice.repository.ts` holds the port or its adapter, never a mapper.
PN-5. **The name of a file the stack or a tool imposes is left as is.** Entry files, route files, manifests and configuration (`index.ts`, `main.py`, `page.tsx`, `__init__.py`, `Dockerfile`) keep the name their tool expects; a technical file with no role in the architecture takes no pattern. Reason: the pattern makes a role readable, it is not a decoration.
PN-6. **Where a tool can check the form, it does.** The lint or the architecture test of the verification command refuses a file of a pattern folder whose name does not follow PN-1 to PN-3. Reason: a convention that no tool checks drifts at the first change in a hurry. Example: an ESLint filename rule, an ArchUnit naming rule.
