---
id: practice-angular
kind: skill
name: practice-angular
description: "Angular know-how of the project: views and presentation components, signals, routing, calls to the entry points, tests. Load before writing, changing or reviewing an Angular component, view, route or service of the project."
version: 1.0.0
status: stable
summary: How the rules of frontend-architecture are written with Angular, with patterns, anti-patterns and a checklist.
applies-when:
  ui: yes
  frameworks: [angular]
loaded-by: [developer, architect, ux, tester]
---

# Angular in this project

This skill details, for Angular, the rules `FA-*` of the Adopted practices section of `AGENTS.md`. The rules win when they and this skill differ. Where an API depends on the version, follow the version of the Stack section, and check its documentation (angular.dev) before using an API this skill marks as recent.

## Views and presentation components (FA-1, FA-2)

- A **view** is a routed standalone component, one per view of `ux/views.md`, named after it: `invoice-detail` → `InvoiceDetailView` in `invoice-detail.view.ts`. It injects the client of the entry points (`inject()`), holds the state of the screen in signals, and passes data to its components.
- A **presentation component** is a standalone component with `changeDetection: ChangeDetectionStrategy.OnPush`, inputs declared with `input()` / `input.required()` and events with `output()`. It injects nothing that reaches the outside: no `HttpClient`, no `Router`, no store.
- State: `signal()` for what the view changes, `computed()` for what derives from it, never a computed value stored in a second signal. A two-way binding (`model()`) only for a form control the component owns.
- Templates use the built-in control flow: `@if`, `@for (item of items(); track item.id)` (always a `track` by domain identity, never `$index` for a list that changes), `@switch` for the states of FA-4.

```ts
@Component({
  selector: 'app-invoice-line',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span>{{ line().label }}</span>
    @if (line().canRemove) { <button (click)="remove.emit(line().lineId)">Remove</button> }
  `,
})
export class InvoiceLineComponent {
  readonly line = input.required<InvoiceLineVm>();
  readonly remove = output<string>();
}
```

## Calls to the entry points (FA-3, FA-6)

- One client per bounded context, `invoicing.client.ts`, in the interface part, wraps `HttpClient` (or the IPC bridge of a desktop application). It returns the view models of the output contracts, never domain types (rule 10).
- What the user may do comes from the view model (`canIssue`, `canRemove`): no condition on business data in a template or a component.
- A domain error comes back with its message in the output contract: the view shows that message at the place the specs say. An `HttpInterceptor` handles only transport failures (network, session), never business errors.

## Routing (FA-5)

- Each view has its route; its parameters are the domain identities (`/invoices/:invoiceId`). Enable `withComponentInputBinding()` and read them as `input()` of the view.
- A view loads its data from its parameters, so that a reload shows the same screen; lazy-load views with `loadComponent`.

## States (FA-4)

The view model of a view says which state is shown (`loading`, `empty`, `error`, and the business states of the specs); the template has one `@switch` branch per state, each named after the specs.

## Tests

- Unit tests of a presentation component render it with inputs and assert on the DOM and the emitted outputs; tests of a view replace the client of the entry points with a double. The test file mirrors the path of the component (rule 13).
- Selectors used by end-to-end page objects are roles and accessible names first; add a `data-testid` only where no accessible name exists.

## Anti-patterns

- A component that subscribes to an `Observable` in `ngOnInit` and stores the result in a field: use a signal (`toSignal()`) or let the view own the call.
- `ngOnChanges` to derive a value from inputs: use `computed()`.
- A shared "state service" that every component injects: the view owns the state of its screen.
- `any` in a view model; a view model that is a domain type.
- A business condition in a pipe.

## Checklist before a commit

- [ ] Every view is named after `ux/views.md`; every component after its design component.
- [ ] Presentation components inject nothing that reaches the outside, and use `OnPush`.
- [ ] No business condition in templates, components or pipes.
- [ ] Every `@for` tracks a domain identity.
- [ ] Every state of the specs has its branch.
- [ ] Route parameters are domain identities.
