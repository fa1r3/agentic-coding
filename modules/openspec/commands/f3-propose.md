---
description: "Starts or resumes an OpenSpec change. Without argument, offers to resume a clarification in progress or to pick the next change from the backlog. With an idea, clarifies it through functional questions asked one at a time, keeps the change focused and sends what is out of scope to the backlog, calibrates it on the light or the full track, then writes the clarification, the proposal and the specs. Argument: nothing, an idea in a few words, or the identifier of a change to resume."
argument-hint: "[idea or change-id]"
agent: analyst
---

This command runs as the analyst agent, in a session started by `f3 propose`. If you are not the analyst agent, stop and tell the user to run, in a terminal: `f3 propose <arguments>`.

Request: "$ARGUMENTS", or the idea from the user at the end of the launch state.

State at launch (from `f3 state propose`):

!`f3 state propose`

If the launch state is missing, empty or reports an error, show it and stop.

A note from the user at the end of the launch state refines the request without replacing the workflow: it lifts no precondition and skips no step.

Produces: `clarification.md` with its Calibration, `proposal.md` and the specs of the change; on the light track, `validations/amigos.md` and `validations/ux.md` as not-applicable; terms of `CONTEXT.md`; `BACKLOG.md` entries with the origin `<change-id>, propose`; the Intentions and Proposed cross-cutting decisions of the change's ux.md for an appearance wish.

## 1. Subject

- **A change in progress:** resume it from the first section of clarification.md without content, then from the provisional calibration if any, then from the first missing artifact (proposal, then specs, then, on the light track, the validations of step 4). If it has `validations/amigos.md`, stop: its specs are closed, and change only through an amendment.
- **An idea:** go to step 2.
- **No argument and no idea:** propose to resume a change that has a clarification.md but no specs. Otherwise, present the open entries of `BACKLOG.md` in their order, propose a sorting if it helps (merging duplicates, reordering, dropping what no longer makes sense), apply each move only with the user's agreement, and recommend the next change with your reason (value, dependencies, size). The chosen entry starts step 2. Without backlog or open entry, ask for the idea.

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
- Then the provisional calibration: with the criteria of the Tracks section of the f3-agent skill, say in two or three lines which track the scope suggests and which criteria are still unknown, and write it in the Calibration section with `(provisional)`. It is not a decision yet: the interview goes on through every angle, whatever the track.
- Each other angle goes into its section as soon as it is validated; a section left empty contains "None.".
- An out-of-scope item the user keeps for later becomes a `BACKLOG.md` entry, in the format of the f3-standards skill (create the file from its template if needed); a new or clarified term goes into `CONTEXT.md`.

## 3. Calibration

Once the Security angle is written, before the proposal: present each criterion C1 to C7 of the f3-agent skill with yes or no and the passage of clarification.md that decides it (for C5, the number of requirements you expect), then recommend a track with its reason. The user decides; a light track the user chooses against a true criterion goes under Decisions against advice. Write the Calibration section in the format of its template, without `(provisional)`.

## 4. Proposal and specs

Write proposal.md following `openspec instructions proposal --change <change-id>`, then the specs following `openspec instructions specs --change <change-id>` and the spec-practice skill, one file at a time. Before the first scenario, build the step catalog. Every validated example becomes a scenario; every rule a requirement or a scenario. Then check the specs as spec-practice says.

If writing the proposal or the specs makes a criterion true on the light track (a second capability, a fourth requirement, a scenario that cannot be automated, a term to create), apply the escalation of the f3-agent skill before going on.

On the light track, once the specs are written, close the two review steps the track skips:
1. Run `node ~/.local/share/f3/scripts/f3-features.mjs --check <change-id>` and `openspec validate <change-id>`, and fix every error.
2. Write `validations/amigos.md`, then `validations/ux.md`, following `openspec instructions amigos --change <change-id>` and `openspec instructions ux --change <change-id>`: Decision "not-applicable: light track, see Calibration in clarification.md"; Record "none"; Summary: the capabilities and the number of requirements and scenarios of the change; Left open: "none".

## 5. End

Present the track and its reason; the requirements written with the names of their scenarios; the new steps, each with the existing sentences you considered; the backlog entries and terms added; the appearance wishes written in ux.md. Next step: `f3 tres-amigos <change-id>` on the full track, `f3 design <change-id>` on the light track.
