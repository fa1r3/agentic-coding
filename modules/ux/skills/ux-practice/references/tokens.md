# Token architecture

This file sets the levels, the naming, the minimum coverage and the quality criteria of the tokens. The values are specific to each project: they derive from the art direction of `ux/brief.md` and live only in the design tool.

## Levels

1. **Global**: the raw values. A global token is never applied directly to a drawn element.
2. **Semantic**: a role, whose value references a global token. There is one variant per theme of the brief, with exactly the same names in each variant.
3. **Component**: a property of a component, whose value references a semantic token. A component token is created with the component that needs it, never at initialization.

## Naming

Names in English, in lowercase, segments separated by dots.

- **Global**: named after its value, with the names set in the minimum coverage below.
- **Semantic**: named after its role.
  - If the Component library section of `ux/brief.md` says that appearance is provided by a library, the roles and their names are those of that library. Discover them in its documentation, and prefix each with the family of the token: `color.`, `text.` or `shape.`. For example, the color role `on-surface` becomes `color.on-surface`.
  - Otherwise, the roles are those of the default list below.
  - A role required by this file or by the brief, which the library does not define, takes its name from the default list.
- **Component**: `component.<component>.<property>`.

## Minimum coverage at initialization

### Global

- `palette.neutral.<step>` and `palette.accent.<step>`, where `<step>` is 50, 100, 200, 300, 400, 500, 600, 700, 800, 900 and 950, from lightest to darkest. The reference colors of the brief appear there unchanged, at the step closest to their lightness.
- `palette.success.<step>`, `palette.warning.<step>`, `palette.error.<step>` and `palette.info.<step>`, where `<step>` is 100, 500 and 700.
- `space.<n>`, where `<n>` is 0, 1, 2, 3, 4, 5, 6, 8, 10, 12 and 16, and where the value is n × 4 px.
- `radius.none` (0), `radius.sm`, `radius.md`, `radius.lg` and `radius.full` (fully rounded shape).
- `font.family.base`, `font.family.mono`, and one entry per other family of the brief.
- `font.size.xs`, `font.size.sm`, `font.size.md`, `font.size.lg`, `font.size.xl`, `font.size.2xl` and `font.size.3xl`, in increasing order. `font.size.md` is the size of body text.
- `font.weight.<name>` for each weight used, among `regular` (400), `medium` (500), `semibold` (600) and `bold` (700), according to the weights the font provides.
- `opacity.disabled` and `opacity.overlay`.

### Semantic, in each theme

With a library that provides appearance: one token for each color, typography and shape role its components use.

Otherwise, the default list:
- Text: `color.text.primary`, `color.text.secondary`, `color.text.disabled`, `color.text.on-accent`.
- Surfaces: `color.surface.base`, `color.surface.raised`, `color.surface.overlay`.
- Borders: `color.border.subtle`, `color.border.default`, `color.border.strong`.
- Accent: `color.accent.default`, `color.accent.hover`, `color.accent.pressed`.
- States: `color.success.surface`, `color.success.text`, `color.warning.surface`, `color.warning.text`, `color.error.surface`, `color.error.text`, `color.info.surface`, `color.info.text`.
- Focus: `color.focus.ring`.
- Text styles, each grouping family, size, weight and line height: `text.display`, `text.title`, `text.subtitle`, `text.body`, `text.caption`, `text.label`.

In both cases, `color.focus.ring` exists.

### Component

None at initialization.

## Fonts

A font family is available in the design tool, and usable by the application under the conditions of the platform described by the brief, for example without network access for a local application. Its license allows embedding it in the application.

## Quality criteria

1. A drawn element only uses semantic or component tokens.
2. Each semantic token references a global token; each component token references a semantic token.
3. In each theme, these pairs reach the contrast thresholds of the Accessibility section of `ux/brief.md`:
   - with a library that provides appearance, each pair it defines between a content role (text, icon) and the background role it is meant for, for example each `on-<role>` on its `<role>`;
   - with the default list: `color.text.primary` and `color.text.secondary` on each of the three surfaces; `color.text.on-accent` on `color.accent.default`, `color.accent.hover` and `color.accent.pressed`; each `color.<state>.text` on the `color.<state>.surface` of the same state.
4. `color.focus.ring` reaches a contrast of at least 3:1 on each background role, in each theme.
5. Disabled text roles are subject to no threshold: the WCAG rules exempt disabled elements.
6. Contrasts are computed by code, with the relative luminance formula of the WCAG, never by estimation.
