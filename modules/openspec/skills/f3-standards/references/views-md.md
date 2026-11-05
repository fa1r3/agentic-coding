# ux/views.md template

`ux/views.md` is the register of the views of the product: every view present in the code, with its unit of code, its displays (the routes and kinds through which it appears) and, under each display, the screens of the design tool seen through it. It exists as soon as the product has a user interface, that is when the User interface subsection of the Stack section of `AGENTS.md` is not "None.".

A view carries the same name in four places: the ux.md of the change that created it, its screens in the design tool, its unit of code, and its page object in the end-to-end tests. The register writes this link down for the views that exist, display by display. It is the source of the names of views, of their routes and of their screens for the agents that read neither the code nor the design tool: the tester, and the reviewers of the tests.

## Who writes it

- The developer, in the commit of the task that creates, renames or removes a view, that adds, changes or removes one of its routes, or that builds the register. At any commit, the register describes the views of the code of that commit: it is never written ahead of the code, and a branch that is abandoned takes its changes with it.
- The developer never chooses the name of a view. For a view created or renamed by a change, the name is the one of the Interface section of the change's design.md, which repeats its ux.md. For an existing view, it is the name of its unit of code.
- The other agents read it and never modify it. A deviation they notice (a missing view or display, a name that differs from the code or from the design tool, a screen attached to no display) is reported to the user.

## Format

~~~markdown
# Views

## <view>

- Code unit: <code unit>
- Displays:
  - <display>
    - <screen>
~~~

One section per view, sorted by the kind of its first display (pages, then overlays, then frame elements), then by name. The file contains nothing else.

## Fields

- **Section title**: the name of the view, in English, in lowercase, words separated by hyphens.
- **Code unit**: the path of the file of its unit of code, from the repository root.
- **Displays**: each way the view appears, one per line:
  - `<route> (<kind>)` when a route displays it. The route is the full path the user sees, from the root: `/` for the home, parameters written `:name`, for example `/invoices/:number`. The kind is `page` (the content displayed by the route) or `overlay` (displayed over a page: modal window, side panel, popup);
  - `none (<kind>)` when no route displays it: an `overlay` opened by an action, or a `frame element` (present whatever the page: notifications, global menu).
- **Screens**, under each display: the screens of the design tool seen through this display, named `<view>/<state>`, or `<view>/<state>/<size>` when the brief defines several window sizes, one per line, the state `default` first. A screen seen through several displays is repeated under each. A display without any screen has the single line `none`: it was coded without design, which is a deviation, reported at once to the user. If the context of `openspec/config.yaml` says "No design tool", the single line is `no design tool`.

## Rules

- Every screen of the view in the design tool is listed under at least one display. A screen reached through no display is a deviation, reported to the user.
- A view with a single display receives all its screens. For a view with several displays, the developer attaches each screen by running the application at each display, and reports the screens reached through none.

## Building the register of an existing project

When the register does not exist, or does not list every view present in the code (an adopted project, or views created before the register), a task of the first change that needs it builds or completes it:

1. List the views present in the code: the pages displayed by the router, the overlays and the frame elements, as the User interface subsection of the Stack section of `AGENTS.md` defines them.
2. Name each view after its unit of code. Note its file, and every route that displays it, written as a full path from the root.
3. In the design tool, look for the screens whose name starts with `<view>/`. If screens exist for this view under another name, its displays get `none`, and report to the user the names found: the renaming is decided in the design of a change, never in this task.
4. Attach the screens to the displays, following the rules above.
5. Write the register, then report the displays without screen and the screens attached to no display.

## Example

Fictional invoicing project: not to be reused.

~~~markdown
# Views

## credit-note-list

- Code unit: apps/web/src/invoicing/credit-note-list.page.ts
- Displays:
  - /credit-notes (page)
    - none

## invoice-editor

- Code unit: apps/web/src/invoicing/invoice-editor.page.ts
- Displays:
  - /invoices/:number (page)
    - invoice-editor/default
    - invoice-editor/issue-error
  - /invoices/:number/preview (page)
    - invoice-editor/preview

## invoice-list

- Code unit: apps/web/src/invoicing/invoice-list.page.ts
- Displays:
  - /invoices (page)
    - invoice-list/default
    - invoice-list/empty

## confirm-issue

- Code unit: apps/web/src/invoicing/confirm-issue.component.ts
- Displays:
  - none (overlay)
    - confirm-issue/default

## notification-area

- Code unit: apps/web/src/shell/notification-area.component.ts
- Displays:
  - none (frame element)
    - notification-area/default
~~~

The display `/credit-notes` has no screen: the page was coded without design, and the developer reported it when writing its entry. The view `invoice-editor` has two displays: its screen `invoice-editor/preview` is seen only through the second one.
