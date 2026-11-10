---
description: "Creates or adjusts the tokens of the project in the design tool, deriving them from the art direction of the brief, then has them validated on a preview and updates their token board"
agent: ux
---

This command runs as the ux agent, in a session started by `f3 ux-tokens`. If you are not the ux agent, stop and tell the user to run, in a terminal: `f3 ux-tokens`.

State at launch (from `f3 state ux-tokens`):

!`f3 state ux-tokens`

If the launch state is missing, empty or reports an error, show it and stop.

A note from the user at the end of the launch state refines the request without replacing the workflow: it lifts no precondition and skips no step.

Goal: create or adjust in the design tool the tokens of the project, compliant with `references/tokens.md` of the ux-practice skill and with the art direction of `ux/brief.md`, have the user validate them on a preview, then update their token board. This command creates no component and no screen.

Preconditions: tool, brief.

1. Read `ux/brief.md`, in particular its sections Art direction, Reference colors, Typography, Accessibility, Platform and Component library. Also read `ux/decisions.md` and `references/tokens.md`. If the section Component library says that appearance is provided by a library, consult its documentation to know its color, typography and shape roles.
2. Read the tokens and themes that already exist in the design tool, then compare them with the minimum coverage of `references/tokens.md` and with the themes of the brief:
   - no token: go to step 3;
   - only part of them: the command was interrupted. Resume at step 3 for the missing families only, without modifying the existing tokens;
   - all of them: ask the user what they want to adjust, and go to step 5.
3. Create the sets and themes following the skill of the design tool, and activate the theme of the default theme of the brief. Then handle each family, in this order: palette; state colors; spacings; radii; fonts; opacities; semantic tokens of the default theme; semantic tokens of each other theme. For each family:
   - derive its values from the brief, following the rules below;
   - for semantic tokens, compute by code the contrast of each pair required by the quality criteria of `references/tokens.md`, and fix any failing value by choosing another step of the scale;
   - create it in the tool, read it again, and compare the values created with the values derived.
   Derivation rules:
   - palette: place each reference color unchanged in the matching global scale, at the step closest to its lightness, then build the other steps around it keeping its hue. Never modify a reference color: if one is a problem, report it and propose to modify the brief;
   - state colors: in tune with the palette;
   - radii: according to the character of the components of the direction;
   - fonts: the families of the brief, with only the weights each font provides;
   - semantic tokens of a theme: according to the hues the brief gives for it.
4. Compute the contrasts again on the values resolved in the tool, for each theme. Create or update the token board following the skill of the design tool.
5. Draw a preview of the tokens: elements representative of the product, chosen from the brief and the specs, with the tokens applied. It contains at least a primary button and a secondary button with real labels of the product, a title and body text with realistic content, a typical content element of the product, one message per state color, and an element with its keyboard focus visible. Export it in each theme, look at each image, then present them with a table of the contrasts (pair, ratio, threshold, result), given as a report and not as a question. Ask the user what they think of it.
6. For each feedback, if a token to modify is already used by a component or a screen validated in the design tool, first list these elements and wait for the user's agreement. Then modify the tokens concerned, compute again the contrasts affected, export the preview again in each theme, and present the result. Repeat until the user validates.
7. After validation, delete the preview, export the token board, look at it, and invite the user to look at it in the tool.
8. End by listing what was created or modified, and say that the next step is `f3 ux-design <change-id>` for the change in progress.
