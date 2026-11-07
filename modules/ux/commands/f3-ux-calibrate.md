---
description: "Checks on a fixed and minimal case how to perform in the design tool each operation the design needs, and records the recipes in the project cookbook"
agent: ux
---

State at launch (from `f3 state ux-calibrate`):

!`f3 state ux-calibrate`

If the launch state is missing, empty or reports an error, show it and stop.

Goal: establish or check again `ux/cookbook.md`, on a fixed and minimal case, independent of the product. This command uses neither the brief, nor the specs, nor the tokens of the project.

Preconditions: tool.

The file open in the design tool must be named `calibration`. Otherwise, stop and ask the user to open this dedicated file, creating it if it does not exist. Never work in the file `design`.

1. Determine the version of the design tool.
2. If `ux/cookbook.md` exists, first check again each of its recipes on this version. Fix those that no longer work, and update the version and date line.
3. Then perform the following scenario, step by step. For each step: perform it, check the result in a separate call, check it visually if the step draws something, then write its recipe in the cookbook before moving to the next one. A step already covered by a recipe checked again is not redone.
   1. Create tokens: a global color, a semantic color that references it, a spacing and a text style, each in its set, with an active theme that activates the semantic set.
   2. Create a page and give it a name.
   3. Open this page and check that it became the active page.
   4. Create in it a board of 400 × 300 px, named `sample/default`.
   5. Place in this board a rectangle and a text, 16 px from its top left edge, then apply the tokens created to them.
   6. Create a main component with two variant properties, `variant` and `state`, each with two values.
   7. Place an instance of this component in the board, then change the value of its property `state`.
   8. Find the boards of the page whose name starts with `sample/`.
   9. Export the board as an image at the smallest scale that stays readable, and check visually that the rectangle, the text and the instance are visible, at their place.
4. During these steps, check the following pitfalls, reported by other users, when the step concerned meets them. Record only those that are confirmed on the version used:
   - are the coordinates `x` and `y` of an element absolute, relative to the page, and not relative to its board?
   - is the name passed when creating a page ignored?
   - are the width and height of a board read-only, so that a resize must be used?
   - does the color of a text go through its fills?
   - how is an instance of a component created, and does the variant change expect the position of the property rather than its name?
   - do the accepted font weights depend on the font used?
   - does opening a page take effect in the same call or only in the next one?
   - is a change on a page that is not active silently cancelled or refused with an error?
   - is a call that creates many elements silently cancelled?
5. Apply the working method of the ux-penpot skill, in particular stopping after two failures on the same operation.
6. At the end, delete from the file `calibration` everything you created, so that the next calibration starts from an empty file.
7. End with a table: each step and each pitfall checked, with "works", "fixed", "fails" or "not checked".
