---
description: "Conducts the whole interface design of an OpenSpec change, one unit of work per run: first the impact analysis (missing behaviors decided with the user, then views, components, icons, tokens and conflicts), then the icons, the components and the screens, one view at a time. Keeps a progress tracking in the change so that each run resumes where the previous one stopped, and writes the validation of the step when everything is approved, or states that the change has no interface. With the mode 'conformity', after implementation, compares the running application with the design screens and submits each deviation to the user. Arguments: the identifier of the change, then optionally 'conformity'."
argument-hint: "<change-id> [conformity]"
agent: ux
---

This command runs as the ux agent, in a session started by `f3 ux-design`. If you are not the ux agent, stop and tell the user to run, in a terminal: `f3 ux-design <arguments>`.

Change: "{{ARG1}}". Mode: "{{ARG2}}".

State at launch (from `f3 state ux-design`):

!`f3 state ux-design '$ARGUMENTS'`

If the launch state is missing, empty or reports an error, show it and stop.

If the mode is "conformity", follow only the section Conformity mode. Otherwise, follow the design mode.

# Design mode

Goal: draw and have approved everything the impact of the change provides. Each run performs a single unit of work, then stops. Presentation is yours; this command provides for completing a missing behavior, as rule 3 of ux-practice says; what you submit follows rule 7.

Produces: `ux.md` of the change, in the format of `references/change-ux.md` of ux-practice; the tracking `ux-design.md`, in the format below; amendments of the specs; `validations/ux.md`.

Tracking format:

~~~markdown
# Design tracking of change <change-id>

## Impact analysis

- Completeness of the specs: <status>
- Views: <status>
- Components: <status>
- Icons: <status>
- Tokens: <status>
- Conflicts: <status>

## Icons

- <icon name>: <status>

## Components

- <component name>: <status>

## Views

### <view name>

- <view>/<state>: <status>

## Conformity

- <view>/<state>: <conformity status>
~~~

A step of the impact analysis is `todo` or `approved`. An icon, a component or a screen is `todo`, `drawn` (in the tool, waiting for validation), `approved` or `out-of-scope` (no longer in the Impact section of ux.md). A section without element contains "None.". Each status is updated right after what it describes. The Conformity section is filled only by the conformity mode.

## Applicability

Check it first, in this order:

1. `validations/amigos.md` exists; otherwise, stop: the specs must first be closed with `f3 tres-amigos {{ARG1}}`.
2. If `validations/ux.md` exists, the step is closed: start no unit of work. Say so, with the date of the validation, list the files of the following steps that exist (design.md, tasks.md, review.md, validations/review.md, acceptance/), and ask whether to reopen it and which element to review, knowing those files will have to be reviewed. On an explicit answer, set that element to `todo` and go on; otherwise, stop.
3. If the context says "No design tool", propose to close the step as not-applicable, with the reason "the project has no design tool".
4. If, from the proposal and the titles of the requirements, the change creates or modifies no view and no component, propose to close the step as not-applicable, with your reason.

A not-applicable closing writes the validation on the user's confirmation, then stops. Otherwise, check the preconditions tool, brief, tokens and change of ux-practice.

## Method

1. **Tracking.**
   - Create ux.md with all the sections of its template, each "None.", if it does not exist; create the tracking with every step of the impact analysis at `todo` and the other sections "None.", if it does not exist. If the user asks to redo the impact analysis, set its steps back to `todo`.
   - Once every step of the impact analysis is `approved`, reconcile the sections Icons, Components and Views with the Impact section of ux.md: add the new elements at `todo`, set those no longer there to `out-of-scope`, and delete nothing in the tool without the user's agreement. Check by targeted reads that each `drawn` or `approved` element still exists in the tool; a missing one goes back to `todo`.
2. **Pending validations.** Elements `drawn` are presented first, exported as images; apply the feedback, then set each validated one to `approved`.
3. **Unit of work.** The first unit with a step or an element at `todo`, in this order:
   a. **Impact analysis.** Read the proposal, the intentions of ux.md, the active entries of `ux/decisions.md` and how the Stack section of AGENTS.md defines interface parts and pages; read the specs requirement by requirement when needed; note by targeted reads the screen groups, views, components and icons that exist in the tool. Existing views carry the names of `ux/views.md`. Then, the steps still `todo`, in order:
      - **Completeness of the specs.** Note what you lack to draw each view the specs imply: its states, how one comes to it and leaves it (including after an action that makes what it shows disappear), the information it shows, the actions it offers. Classify each gap: behavior absent from the specs (an action, a piece of information, a state, a navigation or a consequence of an action), already decided (by the specs, the brief or the register: one line each with its reference), or presentation (place, shape, composition, visual mechanism), which you decide when drawing and never present as a gap. Handle the absent behaviors one by one, those others depend on first: the question in one sentence, the views concerned, the options; write each decision as an amendment. Skip what a previous decision answered. Then set the step to `approved`.
      - **Views, Components, Conflicts.** Propose each sub-section of the Impact section, wait for the validation, write it, set the step to `approved`. Views: each view the specs create or modify, with its states. Components: those the views assemble, existing ones reused as is apart from those to create or modify. Conflicts: each contradiction between the specs, the intentions, the brief and the register, with the resolution the user chose. Each new name follows the naming of ux-practice.
      - **Icons, Tokens.** Decide them yourself from the components and the brief, write them, set the step to `approved`, and report in one line. Icons: those the components use, from the set of the brief, existing or to import. Tokens: the component tokens the new components need; a global or semantic token only if the user decides to create or modify it.
      When every step is `approved`, if Views and Components are both "None.", the change has no interface impact: close the step as not-applicable. Otherwise fill the sections Icons, Components and Views of the tracking at `todo`: each icon to import, each new or modified component, each screen `<view>/<state>`.
   b. **Icons to import,** all together: shown first on a single exported image of the preview; the user may ask to replace one by another of the same set. Once the set is validated, import them into the icons board as the skill of the tool says, delete the preview, set each to `approved`.
   c. **Components,** by coherent group: those one view assembles, starting with the first view of the impact.
   d. **Screens of one view,** all its states, in the order of the views of the impact, once every component it assembles is `approved`. Before presenting a screen, check it against the specs: every action, piece of information and state they require for this view is present, nothing absent from them is added.
   Each component or screen is drawn once at its final place, exported, looked at, set to `drawn`, then presented with your presentation choices and their reasons; a limited choice inside it is shown as options in a preview. Apply the feedback, then set it to `approved`. A missing behavior follows rule 3, a contradiction with the brief or the register rule 2. A preference that holds for the whole product is proposed for the Proposed cross-cutting decisions section of ux.md.
4. **End of the unit.** Stop without starting the next unit. Say what was done and what remains (steps of the impact analysis, and the number of icons, components and views to do), and the amendments made; if one touches a sensitive point such as security or data, say the user can submit it to a new Tres Amigos session. If work remains, the next step is `f3 ux-design {{ARG1}}` again. If everything is approved, present the summary of the step and ask whether the user declares it finished; if so, write `validations/ux.md` following `openspec instructions ux --change {{ARG1}}` (Decision "approved by the user", or "not-applicable: " and the reason; Record "ux.md and ux-design.md", or "none" if not applicable; Summary: the views, components and icons drawn and approved; Left open: elements `out-of-scope` still in the tool, and amendments to submit to a Tres Amigos session, or "none"), and name the next step, `f3 design {{ARG1}}`.

# Conformity mode

Goal: after implementation, check that the running application conforms to the approved screens of the change, and have the user decide on each deviation. Each run handles all the impacted views.

1. **Preconditions.** Tool. `validations/ux.md` says "approved by the user"; otherwise there is nothing to compare. No task of tasks.md is unchecked; otherwise the implementation is not finished.
2. **Capture.** Delegate it to the built-in subagent `{{GENERAL}}` through {{SUBAGENT_TOOL}}, `<screens>` being the screens `<view>/<state>` of the Views section of the tracking that are `approved`: "Read the Observing the running application subsection of the Stack section of AGENTS.md, and start the application as it describes, if it is not running. For each of these screens: <screens>, navigate to the view through the display under which ux/views.md lists the screen, and bring it into the state, using only the actions a user has. Take a screenshot of the window and save it as openspec/changes/{{ARG1}}/conformity/<view>--<state>.png. Do not modify any other file. Answer with the list of the screens captured, and for each screen not captured, the reason in one sentence." If the subagent is not available, or the call fails, stop and report it.
3. **Comparison.** For each capture, export the matching design screen, look at both images, and note the presentation deviations: a missing, extra or different component, a different composition or place, a different icon, a color, spacing or text style that does not match the tokens applied in the design. A behavior deviation (a missing action or piece of information) belongs to the acceptance, but is reported too. Note the reason of each screen not captured. Then read `ux/views.md`: each display whose screens are `none` is a display coded without design, each screen of the tool attached to no display of its view is a screen without display; each is a deviation of its own.
4. **Decisions.** One grid, screen by screen, with your proposal for each deviation: a ticket for the developer, a design update because the implementation is better, or a backlog entry. For a display coded without design, the design update means drawing its screens, and the developer then completes the entry of the view in `ux/views.md` through a ticket. The user decides row by row; apply each decision at once:
   - **ticket**: at the end of tasks.md, a group "## <next number>. Conformity fixes", one task per ticket: `- [ ] <group>.<n> Make <view>/<state> conform to the design: <deviation>. Screens: <view>/<state>.`;
   - **design update**: update the screen in the tool, export it, look at it, present it for validation;
   - **backlog**: an entry with the origin `{{ARG1}}, conformity`, in the format of the f3-standards skill.
5. **Tracking.** In its Conformity section, one line per screen, and one per display coded without design (its view and its route), with its status: `conform`, `ticket`, `design-updated`, `backlog`, or `not-captured` and the reason.
6. **End.** With tickets: `f3 dev {{ARG1}}`, then `f3 ux-design {{ARG1}} conformity` again. Otherwise: `f3 acceptance {{ARG1}}`.
