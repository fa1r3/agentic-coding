# Template of the ux.md of a change

File `openspec/changes/<id>/ux.md`. It carries the design delta of a change. It is created with all its sections when it receives its first content, and archived with the change.

ux.md names and decides; it never describes appearance. It contains no appearance value: no dimension, no color, no shadow, no font, no token value. The design tool is the only source of appearance, and the code takes it over by opening the components and screens in that tool. An appearance intention is written in words, without values.

The names in ux.md are the ones the code, the design tool and the end-to-end tests use: a view of ux.md has a page of the same name in the code, screens `<view>/<state>` in the design tool, and a page object of the same name in the end-to-end test project.

## Structure

The file contains exactly these headings, in this order. The headings and the field labels stay in English; the content is written in the project language. A section without content contains the single line "None.".

~~~markdown
# Design of change <id>

## Intentions

## Impact

### Views

### Components

### Icons

### Tokens

### Conflicts

## Proposed cross-cutting decisions
~~~

## Content of each section

### Intentions

The appearance decisions expressed during the clarification, specific to this change. One bullet per intention: the intention, then "Requirement:" followed by the title of the requirement of the specs concerned, or "none".

### Views

One bullet per view concerned by the change, with, in this order:
- its name, its kind (page, overlay or frame element) and its group;
- its status: "new", "modified", "renamed from <old name>" or "removed";
- "States:" followed by its states; each state corresponds to a design screen named `<view>/<state>`;
- "Components:" followed by the components it assembles;
- "Requirements:" followed by the titles of the requirements of the specs it covers;
- for a modified view, "What changes:" followed by the change.

### Components

One bullet per component concerned by the change, with, in this order:
- its name and its scope ("design system", or the name of its interface part);
- its status: "new", "existing", "modified", "renamed from <old name>", "removed" or "promoted to the design system";
- "Variants:" followed by its variants, or "none";
- "States:" followed by its states;
- "Icons:" followed by the icons it uses, or "none";
- "Used by:" followed by the views that assemble it;
- "Reason:" followed by the reason for its creation or modification. An existing component reused as is has no reason.

### Icons

One bullet per icon needed by the change: its name in the set chosen by the brief, its status ("to import" or "existing"), and "Used by:" followed by the components that use it.

### Tokens

One bullet per token concerned: its name, its level as defined in `references/tokens.md`, its status ("new", "modified" or "removed") and the reason. A global token is only created, modified or removed on an explicit decision of the user.

### Conflicts

One bullet per conflict: the two sources, each with a short quotation, then "Resolution:" followed by the decision of the user.

### Proposed cross-cutting decisions

The decisions taken during this change that hold for the whole product, each validated by the user. One bullet per decision: the decision, its reason and its scope. When the change is archived, each one becomes an entry of `ux/decisions.md`.

## Complete example

Fictional invoicing project: not to be reused.

~~~markdown
# Design of change add-invoice-issuing

## Intentions

- The issue action stays visible while the invoice scrolls. Requirement: Issue an invoice.

## Impact

### Views

- invoice-editor: page, group invoices. New. States: default, issuing, issued, issue-error. Components: invoice-form, issue-summary, status-badge, button. Requirements: Issue an invoice, Report an issuing failure.
- issue-confirmation-dialog: overlay, group invoices. New. States: default. Components: issue-summary, button. Requirements: Issue an invoice.
- invoice-list: page, group invoices. Modified. States: default, empty. Components: invoice-row, status-badge. Requirements: List the invoices. What changes: each row shows the issuing status.

### Components

- button: design system. Existing. Variants: primary, secondary. States: default, hover, focus, disabled. Icons: send. Used by: invoice-editor, issue-confirmation-dialog.
- issue-summary: invoices. New. Variants: compact, full. States: default. Icons: none. Used by: invoice-editor, issue-confirmation-dialog. Reason: sum up the invoice before and during issuing.
- status-badge: design system. New. Variants: none. States: default. Icons: check, clock. Used by: invoice-editor, invoice-list. Reason: show a status with an icon and a label.

### Icons

- send: existing. Used by: button.
- check: to import. Used by: status-badge.
- clock: to import. Used by: status-badge.

### Tokens

- component.status-badge.foreground: component, new. Reason: color of the label and of the icon of the component status-badge.

### Conflicts

- The brief requires that no information be carried by color alone; the initial intention showed a status with a colored dot alone. Resolution: the status is shown with an icon and a label.

## Proposed cross-cutting decisions

- Every status is shown with the component status-badge. Reason: present statuses the same way everywhere. Scope: the whole product.
~~~
