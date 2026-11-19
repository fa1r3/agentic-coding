---
id: frontend-architecture
kind: rules
code: FA
title: Frontend architecture
version: 1.1.0
status: stable
summary: Splitting a user interface into views that own their state and presentation components that only display.
applies-when:
  ui: yes
requires: []
conflicts: []
pairs-with: [practice-angular]
size-budget: 20
---

FA-1. **A view owns the state of its screen.** A view is a screen of `ux/views.md`: it loads its view model through the entry points, holds the state of the screen, and passes data down to its components. Reason: the state of a screen lives in one place, which the tests and the next change can find. Example: the invoice view holds the selected line; the line component receives `selected` and emits `select`.
FA-2. **A presentation component only displays.** It receives its data and the actions it may trigger as inputs, and emits events or renders those actions; it never chooses an entry point, and never reaches a store, a router or a timer of its own. Reason: a component that chooses what it calls is tied to one screen and cannot be shown in every state. Example: `invoice-line` emits `remove`, or renders the `hx-post` address its view gives it; the view decides which entry point is called.
FA-3. **The interface takes no business decision.** What a user may do comes from the view model the entry point returns, never from a condition on business data in the interface. Reason: rule 9 of the invariant part holds for the code that runs in the browser or the window as well; the domain decides once. Example: the view model carries `canIssue`; the button never tests `lines.length > 0`.
FA-4. **Every state of the specs is rendered.** Loading, empty, error and each business state that the specs name have their rendering, named after the specs; none is left to a default of the framework. Reason: an unrendered state is an untested behavior. Example: "no invoice yet" shows the empty state of the list view, not a blank table.
FA-5. **A screen can be opened directly.** Each view, with its parameters, can be opened without going through other screens: by its route, by the state of its window, or, where neither exists, by a test entry point that opens it. Reason: navigation, end-to-end tests and support share one way in. Example: `/invoices/{invoiceId}`, not a selected invoice kept only in memory; on a device display, a test command that opens a view with its parameters.
FA-6. **A business error is shown with the message of its contract.** The interface displays the message the entry point returns for a domain error, at the place the specs say; it never rewrites it or invents its own. Reason: one source for the wording of business errors. Example: "An invoice without lines cannot be issued" comes from the output contract of the endpoint.
