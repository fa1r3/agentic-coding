---
description: "Starts or resumes an OpenSpec change. Without argument, offers to resume a clarification in progress or to pick the next change from the backlog. With an idea, clarifies it through functional questions asked one at a time, keeps the change focused and sends what is out of scope to the backlog, then writes the clarification, the proposal and the specs. Argument: nothing, an idea in a few words, or the identifier of a change to resume."
agent: analyst
---

Request: "$ARGUMENTS".

State at launch:

- Project schema: !`head -1 openspec/config.yaml 2>&1`
- Changes in progress and their files: !`for d in openspec/changes/*/; do n=$(basename "$d"); [ "$n" = archive ] && continue; s=""; for f in clarification.md proposal.md; do [ -f "$d$f" ] && s="$s $f"; done; [ -d "${d}specs" ] && s="$s specs/"; [ -f "${d}validations/amigos.md" ] && s="$s validations/amigos.md"; echo "- $n:${s:- (empty)}"; done 2>/dev/null`
- Backlog entries: !`if [ -f BACKLOG.md ]; then grep -E '^## B-|^- Status:' BACKLOG.md | paste -d' ' - - | head -40; else echo "BACKLOG.md absent"; fi`

If `openspec/config.yaml` does not start with `schema: f3`, stop: the project must first be framed with `f3 init`.

Produces: `clarification.md`, `proposal.md` and the specs of the change; terms of `CONTEXT.md`; `BACKLOG.md` entries with the origin `<change-id>, propose`; the Intentions and Proposed cross-cutting decisions of the change's ux.md for an appearance wish.

## 1. Subject

- **A change in progress:** resume it from the first section of clarification.md without content, then from the first missing artifact (proposal, then specs). If it has `validations/amigos.md`, stop: its specs are closed, and change only through an amendment.
- **An idea:** go to step 2.
- **No argument:** propose to resume a change that has a clarification.md but no specs. Otherwise, present the open entries of `BACKLOG.md` in their order, propose a sorting if it helps (merging duplicates, reordering, dropping what no longer makes sense), apply each move only with the user's agreement, and recommend the next change with your reason (value, dependencies, size). The chosen entry starts step 2. Without backlog or open entry, ask for the idea.

## 2. Interview

Functional questions, about the product. Read the context of `openspec/config.yaml`, `CONTEXT.md` and `openspec/specs/` by passages when a question needs them. Cover these angles in this order; each anticipates a member of the Tres Amigos session:

1. **Need and scope.** The need in the user's words; what is in, what is out. A change delivers one coherent behavior the user can try: if the need covers several independent journeys, or more than one session of work can deliver and test, propose a split, the other parts becoming backlog entries. An item the user keeps against your advice goes under Decisions against advice.
2. **Vocabulary.** Each term or action absent from `CONTEXT.md`, or ambiguous there.
3. **Behavior.** For each view or entry point: its states (including empty, loading and error), how one comes to it and leaves it (including after an action that makes what it shows disappear), the information it shows, the actions it offers. Never where or in what form.
4. **Rules and edge cases.** Data and their rules, edge cases, the volumes of the context that concern the change, the errors the user can cause or suffer, the contradictions with the existing specs.
5. **Examples.** For each behavior, at least one concrete example with its data and its expected observable result, written by you and validated by the user. Ask only when the expected result is not obvious.
6. **Security.** Untrusted inputs, access to files or to the network, sensitive data.

Writing:
- As soon as need and scope are validated, create the change with `openspec new change <change-id>`, in kebab-case starting with a verb (`add-invoice-issuing`), and write the Need and Scope sections of clarification.md following `openspec instructions clarification --change <change-id>`. A backlog entry it comes from gets the status `in-progress <change-id>`.
- Each other angle goes into its section as soon as it is validated; a section left empty contains "None.".
- An out-of-scope item the user keeps for later becomes a `BACKLOG.md` entry, in the format of the f3-standards skill (create the file from its template if needed); a new or clarified term goes into `CONTEXT.md`.

## 3. Proposal and specs

Write proposal.md following `openspec instructions proposal --change <change-id>`, then the specs following `openspec instructions specs --change <change-id>` and the spec-practice skill, one file at a time. Before the first scenario, build the step catalog. Every validated example becomes a scenario; every rule a requirement or a scenario. Then check the specs as spec-practice says.

## 4. End

Present the requirements written with the names of their scenarios; the new steps, each with the existing sentences you considered; the backlog entries and terms added; the appearance wishes written in ux.md. Next step: `f3 tres-amigos <change-id>`.
