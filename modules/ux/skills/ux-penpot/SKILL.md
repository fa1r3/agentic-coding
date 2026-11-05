---
name: ux-penpot
description: "Translation into Penpot of the conventions of the ux-practice skill. Covers the organization of the Penpot file (directions, previews, components, icons, tokens, screens), the working method with the Penpot MCP server and the project cookbook. Load with ux-practice for any work in Penpot."
---

# UX practice in Penpot

This skill translates the notions of the `ux-practice` skill into Penpot. Always load `ux-practice` with it: the notions of direction, preview, group, view, screen, component, icon, variant, state and token are defined there.

You handle Penpot with the tools of its MCP server. The MCP server also provides the documentation of these tools and of the Penpot plugin API; consult it following the "Cookbook before documentation" rule of the working method.

## Cookbook

The file `ux/cookbook.md` of the project contains the ways of doing things verified in Penpot, and the pitfalls met. Before writing code for Penpot, read it and start from its recipes. If it does not exist, recommend that the user run `/f3-ux-calibrate` before any work in Penpot.

File format:

~~~~markdown
# Penpot cookbook

Verified on Penpot <version>, on <date as YYYY-MM-DD>.

## <operation>

~~~js
<code that worked>
~~~

Pitfalls: <what fails and why, or "none">.
~~~~

A recipe contains only code that worked and was verified in a separate call. It does not tell how it was found.

The cookbook is read in every session: it stays short. One recipe per operation, the shortest that works. A recipe that replaces another replaces it, without duplicating it. Each pitfall fits on one line. Beyond 150 lines, propose to the user to condense it.

## Working method

1. **Small calls.** Do not create more than eight elements in one call. In the next call, check that what was created still exists.
2. **Immediate writing.** As soon as a way of doing works and has been verified, or as soon as a cause of failure is established, add it to `ux/cookbook.md` before going on. Do not wait for the end of the session.
3. **No spiral.** After two failures on the same operation, stop: sum up what you tried and what you observed, and ask the user what to do.
4. **Visual check.** After drawing or modifying a direction, a preview, a component, a screen or the token board, export it as an image at the smallest scale that stays readable, and look at it before submitting it to the user.
5. **Cookbook before documentation.** For an operation, start from its recipe in `ux/cookbook.md`. Only consult the documentation provided by the MCP server (overview, API information) for an operation the cookbook does not cover, and only the part that concerns it.
6. **Targeted reads.** A query on the file returns only the elements and fields the step needs, in compact form: for example the name and value of each token of a set, or the name and identifier of the boards of a page. Never return full API objects, or the full content of a page.

## File organization

You work in the file the user opened in Penpot. The API allows neither opening nor creating another file: you only navigate between its pages.

- A page `direction`, which contains one top-level board per proposed art direction, named `direction/<name>`. A direction board is no longer modified once presented to the user; a combination of directions gets a new board.
- A page `preview`, which contains one top-level board per preview in progress, named `preview/<subject>`, where `<subject>` is in English, in lowercase, words separated by hyphens, for example `preview/tokens`. A preview is deleted as soon as its proposal is validated and carried over to its final place.
- A page `design-system`, which contains three top-level boards: `components`, for the components of the design system; `icons`, for the icons used; `tokens`, the token board.
- One page per screen group, named after the group, including the page `shell` for frame elements.
- In the page of a group: one top-level board per screen, named `<view>/<state>`, or `<view>/<state>/<size>` following the rule of `ux-practice`. The screens of one view are placed on one row, in the order of their states, the state `default` first.
- In the page of a group, a top-level board named `components`, which contains the main components of its interface part.

## Previews

- A preview applies the tokens when they exist, so that the user judges the real rendering.
- Penpot displays only one theme at a time. To show a preview in several themes, activate the theme of each in turn and export the preview once per theme, then reactivate the theme of the default theme of `ux/brief.md`.

## Components

- A component is a Penpot main component, named exactly like the component of `ux-practice`, without a group path.
- Its variants and states are two Penpot variant properties: `variant`, whose values are its variants (a single value, `default`, if it has none), and `state`, whose values are its states.
- A screen uses instances of components. It never redraws a component and never detaches an instance.

## Icons

- Each icon used is a Penpot main component of the board `icons`, named `icon-<name of the icon in the set>`, imported from the set chosen by the brief.
- A component or a screen uses instances of these icons, never an icon drawn by hand.
- The color of an icon is applied by a token.

## Tokens

Tokens belong to the library of the file, not to a page.

- **Sets**, in this order: `global`, then one semantic set per theme of `ux/brief.md`, named `semantic/<theme>` (for example `semantic/light`), then `component`. `global` and `component` are active; the semantic sets are activated by the themes.
- **Themes**: one Penpot theme per theme of `ux/brief.md`, in the group `color-scheme`, named like the theme. Each theme contains `global`, `semantic/<its theme>` and `component`. The theme of the default theme of `ux/brief.md` is active.
- **Names**: those of `ux-practice`, segments separated by dots. A reference to another token is written with its name in braces, for example `{palette.neutral.900}`.
- **Types**: each token family receives its Penpot type: color for `palette.*` and `color.*`, spacing for `space.*`, border radius for `radius.*` and `shape.*`, font family, size and weight for `font.*`, composite typography for `text.*`, opacity for `opacity.*`.
- **Application**: a color, a spacing, a radius or a text style is never entered as a raw value in a component or a screen: it is applied by a token. The boards of the page `direction`, and previews drawn before the tokens exist, are the exception: they use raw values.

## Token board

The board `tokens` of the page `design-system` shows the tokens to the user:
- each semantic color token, as a sample, with its name;
- each text style, as a text sample, with its name;
- the scale of spacings and the scale of radii, with their names.

Each sample applies the token it shows: the board follows by itself any change of value. It shows the active theme; to see another theme, activate its Penpot theme.

## Finding the design

- **The direction kept**: the board of the page `direction` whose name appears in the Art direction section of `ux/brief.md`.
- **The screens of a view**: in the page of its group, the boards whose name starts with `<view>/`, one per state.
- **A component**: in the board `components` of the page `design-system` if it belongs to the design system, otherwise of the page of the group of its interface part.
- Export each screen, or each combination of variant and state of a component, as an image, and look at it. For exact values (components used, tokens applied), read the structure of the elements concerned only.

## Pitfalls specific to Penpot

- The connection between the MCP server and the file goes through a plugin that runs in the Penpot tab. Connecting it is a user action in their browser (menu File, MCP Server, Connect). The plugin stops if the tab is closed, reloaded or put to sleep by the browser.
- The MCP server only acts on the active page.
- A token set is inactive when created, and an inactive set has no effect.
- When the same token name exists in several active sets, the last one in the order of the sets wins.
- A file displays only one theme at a time: the value of an applied token depends on the active sets.
