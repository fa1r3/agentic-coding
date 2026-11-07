---
description: "Sets the art direction of the project. Two contrasting directions drawn in the design tool, the user's choice, then the design brief, written section by section."
agent: ux
---

This command runs as the ux agent, in a session started by `f3 ux-direction`. If you are not the ux agent, stop and tell the user to run, in a terminal: `f3 ux-direction`.

State at launch (from `f3 state ux-direction`):

!`f3 state ux-direction`

If the launch state is missing, empty or reports an error, show it and stop.

Goal: set the art direction of the project and write `ux/brief.md` in the format of the ux-practice skill, section by section as soon as they are validated; create `ux/decisions.md` if it does not exist.

Preconditions: tool.

1. If `ux/brief.md` exists:
   - If one of its sections contains only its title, the command was interrupted: resume it. If the section Users and context of use is empty, resume at step 2. Otherwise, if the section Art direction is empty, resume at step 3; if direction boards already exist in the design tool, present them instead of drawing them again. Otherwise, resume step 7 at the first empty section.
   - Otherwise, do not overwrite it. Present it, and ask the user what they want to review. If the art direction is questioned, resume at step 3; otherwise, conduct the interview on the sections to review only, following step 7, then go to step 8.
2. Analyze the product. Start from the `context` of `openspec/config.yaml`, `CONTEXT.md` and the proposals of the changes in progress in `openspec/changes/`, outside `openspec/changes/archive/`. Read the specs only by passages, when a precise point of the analysis requires it. Draw from it, in a few lines, the design constraints that follow from real use: who uses the application, in what conditions, what the interface must serve and what it must not disturb. Distinguish what the repository establishes from your hypotheses. Present this analysis, integrate the user's corrections, and wait for their validation. As soon as it is validated, create `ux/brief.md` with all the headings of the template, filling only the section Users and context of use, and create `ux/decisions.md` if it does not exist, with the content its template provides at creation.
3. Design two clearly contrasting art directions: they differ by their palette, their typography and the character of their components, not only by a hue. Each answers the validated analysis. For each, prepare:
   - a one-word name;
   - its intention, in two sentences, and its reasons linked to the analysis;
   - its palette: the key hues, with their code, their role and their reason, in the main theme;
   - its typography, compliant with the Fonts section of `references/tokens.md`;
   - its icon set, with its license;
   - the character of its components: shapes, density, relation between icons and text, motion.
4. Compute by code the contrasts of the text and background pairs of each palette. A direction must reach at least the WCAG AA level: fix its hues before drawing it.
5. Draw each direction in a board `direction/<name>` of the page direction, following the skill of the design tool: the palette, the typography, a primary button with its icon and a real label of the product, a secondary button, three icons of the set, and a thumbnail of the main screen of the product with realistic content. Export each board, look at it, then present the two directions side by side: what each favors, what it sacrifices, and your recommendation.
6. The user chooses a direction or combines several. For a combination or an adjustment, draw a new board `direction/<name>` that shows it, present it, and wait for their validation. Never keep a direction that was not drawn. As soon as a drawn direction is validated, write in the brief the sections Art direction, Reference colors, Typography and Iconography, from that direction.
7. Conduct the interview on the sections still empty, in the order of the template. For each, propose a first version with your recommendation, show in a preview what is judged by eye, ask one question at a time, and write the section in the brief as soon as the user validates it. Apply the rule of the template on behavior: any behavior idea is reported as a requirement to have written in the specs.
8. Review the complete brief against the rules of its template and the consistency between its sections. If you find a problem, propose the correction, and write it as soon as it is validated.
9. Delete the previews created by this command.
10. End by listing what was written in the files and in the design tool, and say that the next step is `f3 ux-tokens`.
