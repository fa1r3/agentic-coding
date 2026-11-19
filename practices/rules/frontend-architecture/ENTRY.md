---
id: frontend-architecture
kind: rules
code: FA
title: Frontend architecture
version: 1.0.0
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
FA-2. **A presentation component only displays.** It receives inputs and emits events; it never calls an entry point, a store, a router or a timer of its own. Reason: a component that fetches is tied to one screen and cannot be shown in every state. Example: `invoice-line` emits `remove`; the view calls the entry point.
FA-3. **The interface takes no business decision.** What a user may do comes from the view model the entry point returns, never from a condition on business data in the interface. Reason: rule 9 of the invariant part holds for the code that runs in the browser or the window as well; the domain decides once. Example: the view model carries `canIssue`; the button never tests `lines.length > 0`.
FA-4. **Every state of the specs is rendered.** Loading, empty, error and each business state that the specs name have their rendering, named after the specs; none is left to a default of the framework. Reason: an unrendered state is an untested behavior. Example: "no invoice yet" shows the empty state of the list view, not a blank table.
FA-5. **A screen is reachable by its address.** The view and its parameters are in the route (or the window state of a desktop application): reloading or opening the address shows the same screen. Reason: navigation, end-to-end tests and support share one way in. Example: `/invoices/{invoiceId}`, not a selected invoice kept only in memory.
FA-6. **A business error is shown with the message of its contract.** The interface displays the message the entry point returns for a domain error, at the place the specs say; it never rewrites it or invents its own. Reason: one source for the wording of business errors. Example: "An invoice without lines cannot be issued" comes from the output contract of the endpoint.
