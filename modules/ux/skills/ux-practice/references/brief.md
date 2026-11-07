# ux/brief.md template

The brief sets the art direction and the design direction of the project. It is written during the `f3 ux-direction` command, each section as soon as the user validates it, then modified only on the user's decision. While that command is not finished, a section not yet validated contains only its title.

## Rule on values

The brief contains the values that set the direction: the codes of the reference colors, and the names of the fonts and of the icon set, each with its reason. It contains no full scales and no spacing, radius or font size values: they belong to the tokens, which derive from the direction. It may contain measurable criteria, such as a minimum text size or a maximum animation duration.

A fine adjustment of a token in the design tool does not modify the brief. A change of direction does.

## Rule on behavior

The brief describes presentation, never behavior. A consequence that adds an action, a step, a message or a confirmation is a behavior: it belongs to the specs. If such an idea comes up, report it to the user as a requirement to have written in the specs, and do not write it in the brief.

## Structure

The file contains exactly these headings, in this order. The headings stay in English; the content is written in the project language.

~~~markdown
# Design brief

## Users and context of use

## Art direction

## Principles

## Reference colors

## Typography

## Iconography

## Anti-references

## Accessibility

## Platform

## Component library
~~~

## Content of each section

### Users and context of use

- Content: who uses the application, on what hardware, for how long at a stretch, in what situation and with what goal.
- Form: a short paragraph per user profile.

### Art direction

Mandatory content, in this order:
- "Direction kept:" followed by its name, then "Reference board:" followed by the name of the board that shows it in the design tool;
- "Intention:" followed by what the interface must evoke, in two or three sentences;
- "Reasons:" followed by the reasons that link this intention to the product and its users;
- "Character of the components:" followed by one bullet per axis: shapes, density, relation between icons and text, motion. Each bullet is a choice that can be checked on a screen.

### Principles

- Content: five principles at most, numbered by decreasing priority.
- Form: for each principle, a short title, then "Therefore:" followed by its consequences on presentation.
- Test: when two principles conflict, the one with the smaller number wins. This order is decided by the user.

### Reference colors

- Content: each key hue of the direction (backgrounds, text, accent, and any hue that carries a role), with its code and the reason for its choice. For each theme other than the main one, the hues that change.
- Test: each hue has a role and a reason linked to the product.

### Typography

- Content: each font family, with its license and the reason for its choice; the size contrast sought; the minimum text size.
- Rule: each font complies with the Fonts section of `references/tokens.md`.

### Iconography

- Content: the icon set, with its license and the reason for its choice; its style (stroke or filled, thickness); the rule for associating icons and labels.

### Anti-references

- Content: what the interface must not evoke.
- Form: one bullet per anti-reference, followed by what would cause it on a screen.

### Accessibility

Mandatory content:
- the WCAG 2.2 level targeted: AA or AAA;
- the contrast thresholds that follow from it. Level AA: 4.5:1 for body text; 3:1 for large text (at least 24 px, or at least 18.66 px in bold). Level AAA: 7:1 for body text; 4.5:1 for large text. At both levels: 3:1 for interface components and graphical indicators;
- keyboard access to every action, with a focus always visible;
- no information carried by color alone;
- respect of the system preference for reduced motion.

### Platform

Content: the type of device, the minimum window size supported, the input modes (mouse, keyboard, touch), the themes offered and the default theme.

### Component library

Mandatory content:
- "Behavior and accessibility:" followed by the library that provides them, and what it covers, or "none";
- "Appearance provided by the library:" followed by "yes" and the name of the library, or by "no". With "no", the appearance of every component is specific to the project.

## Complete example

Fictional invoicing project: not to be reused.

~~~markdown
# Design brief

## Users and context of use

Accountants of small firms, on a desktop computer with two screens, who enter and check invoices several hours a day. Their goal is to process a large volume quickly and without error.

## Art direction

Direction kept: ledger. Reference board: direction/ledger.

Intention: the interface evokes a neat accounting ledger, cream paper and dark ink, where every figure has its place. It inspires rigor without austerity.

Reasons: accountants spend their days on figures; a slightly warm background tires the eye less than pure white over long sessions, and the evocation of the ledger makes a new tool familiar.

Character of the components:
- shapes: sharp corners, barely perceptible radii, no shadow;
- density: compact in tables, airy between blocks;
- icons and text: main actions combine an icon and a label; actions repeated on each table row only have an icon, with an accessible name;
- motion: transitions of 120 ms at most, only on state changes.

## Principles

1. Readability of amounts first. Therefore: figures in a monospaced font, right-aligned, never truncated.
2. Controlled density. Therefore: at least twenty invoice rows visible on a 1080 px high screen, with no text under 14 px.
3. Ink for the essential. Therefore: only amounts and main actions use the darkest ink hue; the rest of the text is in a muted tone.

## Reference colors

- Background: cream #F7F3EA, like the paper of a ledger; it reduces glare during long sessions.
- Ink: blue-black #1F2A44, for the main text; it contrasts strongly with the cream.
- Accent: burgundy #8C2F39, reserved for main actions; it recalls correction ink without evoking an alert.
- Dark theme: background #1B1D22 and ink #E9E4D8; the accent is lightened to stay readable.

## Typography

- IBM Plex Sans for the interface and IBM Plex Mono for amounts, under the SIL Open Font License: a technical and readable design, whose monospaced version aligns figures.
- Marked size contrast between titles and body text, three sizes at most per screen.
- Minimum size: 14 px for body text.

## Iconography

- Lucide, under the ISC license: a thin and regular stroke, consistent with the sharpness of the ledger.
- Style: 1.5 px stroke, no fill.
- A main action is never represented by an icon alone: the icon accompanies a label.

## Anti-references

- A marketing dashboard: caused by decorative charts and bright colors.
- A spreadsheet: caused by a tight grid on every cell.

## Accessibility

- WCAG 2.2 level AA.
- Contrast: 4.5:1 for body text; 3:1 for large text (at least 24 px, or at least 18.66 px in bold), interface components and graphical indicators.
- Every action is keyboard accessible; the focus is always visible.
- No information is carried by color alone: a late invoice also carries an icon and a label.
- The system preference for reduced motion disables all transitions.

## Platform

Desktop application, window of 1280 × 800 px at least, mouse and keyboard, light and dark themes, light theme by default.

## Component library

- Behavior and accessibility: the Angular CDK, for focus, keyboard, overlays and virtual scrolling.
- Appearance provided by the library: no.
~~~
