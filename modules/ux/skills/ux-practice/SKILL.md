---
name: ux-practice
description: "Design conventions of a project, independent of the design tool. Covers the art direction and the brief (ux/brief.md), the register of decisions (ux/decisions.md), the design delta of an OpenSpec change (ux.md), components, icons, views, screens, previews and the token architecture. Load before any design work or any change to these files."
---

# UX practice

## Vocabulary

- **Design tool**: the software where art directions, components and screens are drawn, and tokens are defined. Its skill translates the notions of this skill into its own terms.
- **Art direction**: the overall visual intention of the project, chosen by the user among directions drawn in the design tool. It is recorded in `ux/brief.md`.
- **Preview**: a temporary drawing in the design tool that shows a proposal to the user so that they decide by seeing it. It assembles elements representative of the product (real labels, typical content), in each theme concerned. A preview is neither a component nor a screen: it is deleted as soon as the proposal is validated and carried over to its final place. The directions drawn by `/f3-ux-direction` are not previews: they are kept.
- **Interface part**: a group of pages defined by the project in its code, for example a feature.
- **Component**: a reusable interface block, which ignores where it is displayed. It is drawn once, with its variants and states. Its scope is either the design system (pure presentation, no business knowledge, usable anywhere) or an interface part (it knows the business and is only used in that part). A component used by several interface parts belongs to the design system.
- **Icon**: a pictogram of the icon set chosen by `ux/brief.md`, designated by its name in that set.
- **Variant**: a form of a component, chosen by whoever uses it, for example its size or its importance.
- **State**: a situation of a view or a component. The states of a view are those the specs describe, for example empty, loading or error. The states of a component are its interaction states (hover, focus, disabled) and those the specs describe.
- **View**: a container that assembles components, without ever redrawing one. There are three kinds: a page, displayed by a route; an overlay, displayed over a page without changing the route (modal window, side panel, popup); a frame element, present whatever the page (notifications, global menu). A view belongs to a single group; what serves several groups is a component.
- **Design screen**: the drawing of a view in one state, which shows which components it assembles, where, and at what size. A view has one screen per state. A screen is named `<view>/<state>`. If `ux/brief.md` defines several window sizes with different layouts, a screen is named `<view>/<state>/<size>`.
- **Screen group**: the set of views of one interface part. Frame elements belong to the group `shell`.
- **Naming**: a view carries the name of its unit of code (the page for a page, the containing component for an overlay or a frame element), a component the name of its code component, and a group the name of its interface part. If the view already exists, reuse its name in `ux/views.md`. Otherwise, propose a name built with the English terms of `CONTEXT.md`, if it exists, and compliant with the naming rules of the project; after the user's validation, this name becomes the one the code will use. States, variants and sizes are named in English, in lowercase, words separated by hyphens; the normal state is named `default`. If the agent rules of the project do not define its interface parts and pages, say so before proposing a name.
- **Template**: the imposed structure of a file. In a template, a name in angle brackets, such as `<id>`, is replaced by a real value; no angle bracket remains in a written file.

## Design files

Paths are relative to the project root. The format of each file is defined only in its reference: read it before creating or modifying the file.

- `ux/brief.md`: art direction and design direction of the project. Format: `references/brief.md`.
- `ux/decisions.md`: register of the design decisions that hold for the whole project, enriched at each archiving of a change. Format: `references/decisions.md`.
- `openspec/changes/<id>/ux.md`: design delta of a change, where `<id>` is the identifier of the OpenSpec change. Format: `references/change-ux.md`.
- `ux/views.md`: register of the views present in the code, with their unit of code, their displays (route and kind) and the screens seen through each. Written by the developer, in the commit that creates, renames or removes a view; you read it and never modify it. Format: `references/views-md.md` of the f3-standards skill.

For tokens, read `references/tokens.md`. For any work in the design tool, also load the skill of that tool: it translates these conventions into its own notions. The project names its design tool and the name of that skill in the `context` of `openspec/config.yaml`.

## Common rules

1. In the design tool, you may draw or create what is needed to show the user a proposal; you never modify or delete what they validated without their agreement.
2. You never settle a conflict. A conflict exists when two sources contradict each other: the specs of a change, `ux/brief.md`, `ux/decisions.md`, the `ux.md` of a change, or the code and the design. You report it, quoting both passages, and you propose options.
3. **Behavior and presentation.** The specs describe behavior: the actions available and their conditions, the information shown, the states, the navigation, and what happens after each action. The design decides presentation: the place, shape and composition of elements, and the visual mechanism of an action. Presentation is your responsibility: you decide it based on the brief, the register and the tokens, you show in a preview what is judged by eye, and you never send it back to the user as a specs question. You never add an element, action, step, message or state absent from the specs. When a behavior is missing to draw, you never decide it alone. If the current command provides for it, you propose two or three options, each with its consequence, and your recommendation; then you write in the specs of the change the decision the user validates, as a requirement or a scenario in the OpenSpec format, following the spec-practice skill and its Amendments section, describing behavior and never presentation. Otherwise, you report it without writing the requirement or proposing a solution.
4. Each sentence written in `ux/brief.md` or `ux/decisions.md` must allow deciding a concrete case. An adjective alone, such as "elegant", is not enough: turn it into checkable choices.
5. The names of tokens, components, icons, views, groups, states, variants and sizes are in English, in lowercase.
6. A name of view, component or group always changes in the code and in the design tool within the same change, and the renaming is recorded in the `ux.md` of that change.
7. **Show to make decide.** You only submit to the user decisions they can judge, in a form they can judge, and you do it on your own, without waiting to be asked. What follows from a rule or is checked by a calculation, for example a scale built around a color or the step chosen to reach a contrast threshold, you decide yourself and report. What is judged by eye, you show as an image, exported and looked at before submitting it:
   - a limited choice, such as icons, colors or a presentation detail, is shown in a preview; once the choice is validated, you carry it over to its final place and delete the preview;
   - a component or a screen never goes through a preview: it is drawn once, at its final place, and validated there.
   A value, a code or a list of names of visual elements is never submitted alone.

## Preconditions

Each command says which ones apply. Check them before any other work. If one fails, stop and tell the user what they must do.

- **tool**: you can act in the design tool. Check it with a single minimal call to the tool, without reading its documentation or the content of the open file. If the call fails, diagnose the cause yourself (configuration, environment variables, connection to the tool) and tell the user what they must do. Never simulate work you cannot do, and never modify a configuration without their validation.
- **brief**: `ux/brief.md` exists, contains every section defined in `references/brief.md`, and each one is filled. Otherwise, the command to run is `/f3-ux-direction`.
- **tokens**: the tokens described in `references/tokens.md` exist in the design tool. Otherwise, list what is missing; the command to run is `/f3-ux-tokens`.
- **change**: the folder `openspec/changes/<id>/` exists and contains specs. Otherwise, say that the specs of the change must be created with `/f3-propose`.
