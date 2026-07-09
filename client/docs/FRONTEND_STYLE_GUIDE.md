# Ready 4 Learning Frontend Style Guide

This guide defines how new and existing Angular pages should be structured and styled. The goal is consistency across light mode, dark mode, desktop, and mobile without making every component maintain its own design system.

For a compact list of variables and classes, see [Style Quick Reference](STYLE_QUICK_REFERENCE.md).

Open `/style-guide` in the running application for a live, theme-aware component template. Its account-menu shortcut is shown to administrators.
The printable companion is [Frontend Style Visual Reference](../../output/pdf/r4l-frontend-style-reference.pdf).

## Core rule

Use this order when building a UI:

1. Use an Angular Material component for standard controls and interaction behavior.
2. Compose the page with existing `app-*` global classes.
3. Use semantic `--app-*` variables for custom CSS.
4. Add component SCSS only for layout or presentation unique to that feature.

Do not recreate a Material control with custom HTML when Material already provides the behavior.

## Ownership

### `src/styles.scss`

This file owns:

- Angular Material palettes and light/dark theme application.
- Semantic color, spacing, radius, and shadow variables.
- Shared page, surface, layout, form, table, badge, and status classes.
- Intentional global Material overrides.
- Shared mobile and reduced-motion behavior.

Do not place page-specific selectors in `styles.scss`.

### Component HTML

Templates own:

- Semantic structure and accessible labels.
- Angular Material components.
- Composition of global `app-*` classes.
- Stable `data-cy` attributes for E2E tests.
- Feature classes where a unique layout still needs component SCSS.

### Component SCSS

Component styles own:

- Feature-specific grid tracks and proportions.
- Unique responsive behavior not covered by global classes.
- Positioning tied to that component's structure.
- Small visual distinctions built from semantic app tokens.

Component styles should not redefine global buttons, cards, tables, form fields, typography, or theme palettes.

## Angular Material first

Prefer the matching Material component:

| Need | Use |
| --- | --- |
| Command | `button` with `mat-button`, `mat-raised-button`, or `mat-stroked-button` |
| Icon command | `mat-icon-button` with an accessible label and tooltip |
| Text or numeric input | `mat-form-field` and `matInput` |
| Known option set | `mat-select`, radio buttons, or a menu |
| Binary setting | Checkbox, slide toggle, or button toggle |
| Modes or views | `mat-button-toggle-group` or tabs |
| Tabular data | Material table and paginator |
| Confirmation | Shared `DialogService` |
| Short feedback | `MatSnackBar` |

Use Material's `color="primary"`, `color="accent"`, and `color="warn"` when those meanings fit. Angular Material M2 has no `success` color input; use `.app-success-button` or another success utility instead.

## Semantic colors

Never put a palette hex value in component SCSS. Use a variable describing the role of the color.

```scss
.feature-panel {
  border: 1px solid var(--app-border);
  background: var(--app-surface);
  color: var(--app-text);
}

.feature-count {
  color: var(--app-primary);
}
```

The approved semantic roles are:

- `--app-bg`: application background.
- `--app-page-bg`: themed page background treatment.
- `--app-surface`: normal cards and panels.
- `--app-surface-muted`: secondary or subdued surfaces.
- `--app-text`: primary readable text.
- `--app-text-muted`: supporting text.
- `--app-border`: dividers and outlines.
- `--app-primary` / `--app-on-primary`: primary action and its readable foreground.
- `--app-accent` / `--app-on-accent`: secondary emphasis and its foreground.
- `--app-warn` / `--app-on-warn`: destructive actions and errors.
- `--app-success` / `--app-on-success`: completed or positive states.
- `--app-tertiary` / `--app-on-tertiary`: an optional third category, not a replacement for success or warning.
- `--app-contrast`: white in dark mode and black in light mode for rare high-contrast cases.

Use `color-mix()` with semantic variables when a lighter background or border is needed:

```scss
background: color-mix(in srgb, var(--app-primary) 12%, var(--app-surface));
```

## Page structure

Start operational pages with the shared shell:

```html
<section class="app-page-shell app-page-stack">
  <header class="app-page-header">
    <div>
      <h1 class="app-page-title">Page Name</h1>
      <p class="app-page-subtitle">Short task-focused description.</p>
    </div>
  </header>

  <div class="app-panel">
    <!-- Feature controls -->
  </div>
</section>
```

Use `mat-card` for a genuinely framed tool or repeated item. Do not wrap every section in a card, and do not put decorative cards inside other cards.

## Layout primitives

Prefer combining the global classes:

- `.app-page-shell`: centered page width and responsive padding.
- `.app-page-stack`: standard page section spacing.
- `.app-stack-sm`, `.app-stack-md`, `.app-stack-lg`: vertical flow.
- `.app-cluster`: wrapping inline controls.
- `.app-split`: content on opposite sides of a row.
- `.app-grid-2`, `.app-grid-3`, `.app-grid-auto`: responsive grids.
- `.app-panel`, `.app-panel-muted`: low-emphasis surfaces.
- `.app-card`, `.app-card-muted`: stronger framed surfaces.
- `.app-scroll-region`: bounded scrollable content.

Add a feature class beside a global class when only one detail is unique:

```html
<div class="report-columns app-grid-2">...</div>
```

```scss
.report-columns {
  align-items: start;
}
```

## Forms and actions

Use:

- `.app-form-stack` for vertical forms.
- `.app-field-grid` for a responsive field grid.
- `.app-field-action-row` when inputs and a button share a row.
- `.app-action-row` for grouped commands.
- `.app-action-row-end` when commands should align to the end.
- `.app-form-field-full` or `.full-width` for full-width fields.

Buttons next to Material inputs should normally use `.app-field-action-row`; its actions match the standard 56px field height.

Put the primary action first in the DOM when that is the natural reading order. Use icon-only buttons for familiar compact actions such as edit, delete, download, settings, and close. Every icon-only button needs `aria-label`; unfamiliar icons also need `matTooltip`.

## Status and feedback

Use status by meaning:

- Primary: current selection or branded information.
- Accent: secondary emphasis.
- Success: completed, available, or positive result.
- Warn: destructive, failed, blocked, or urgent.
- Tertiary: a neutral third category when primary/accent are already meaningful.

Use `.app-badge` with one badge tone class:

```html
<span class="app-badge app-badge-success">Completed</span>
```

Do not use color as the only signal. Include text, an icon, or both.

## Responsive behavior

Build mobile behavior into the initial implementation.

- Let shared grids collapse through `styles.scss`.
- Use stable grid tracks such as `minmax(0, 1fr)`.
- Use `.app-scroll-region` for long lists.
- Allow action rows to wrap.
- Keep tables usable through a simple view, column reduction, or horizontal scrolling.
- Add component breakpoints only for feature-specific structure.
- Do not scale font size directly with viewport width.

Test at narrow mobile, tablet, and desktop widths. Verify that text, buttons, badges, tables, menus, and dialogs do not overlap.

## HTML and CSS comments

Comments should explain intent or a non-obvious constraint.

Good:

```html
<!-- Keep stable data-cy selectors separate from visual classes. -->
```

```scss
/* This panel stays opaque because the page background contains decorative color. */
```

Avoid comments that repeat the element or property:

```scss
/* Set display to grid. */
display: grid;
```

Use comments at major template regions and before unusual CSS blocks. Do not comment every field or selector.

## Naming

- Global reusable classes use the `app-` prefix.
- Feature classes describe the feature role, such as `.stock-summary`.
- State classes describe meaning, such as `.is-selected` or `.app-badge-warn`.
- Test selectors use `data-cy`.
- Do not use visual names such as `.blue-card` or `.left-box`.

## Accessibility

- Use semantic headings in order.
- Label form fields and icon buttons.
- Preserve keyboard focus; global `:focus-visible` styling is intentional.
- Keep readable contrast in both themes.
- Respect reduced motion.
- Use buttons for actions and links for navigation.
- Associate sections with headings through `aria-labelledby` when helpful.

## Testing

Styling changes must preserve behavior.

- Unit tests should query behavior, accessible text, or stable component APIs.
- E2E tests should prefer `data-cy`, form control names, roles, and accessible labels.
- Do not use layout classes such as `.app-grid-2` as test selectors.
- Verify light and dark mode for new custom surfaces.
- Run `npm run lint`, the relevant unit tests, and `npm run e2e` when navigation or full workflows change.

## New page checklist

Before opening a pull request:

- The page uses Angular Material controls where available.
- The root uses `.app-page-shell`.
- Colors use semantic `--app-*` variables.
- Existing global layout classes were considered before new CSS was added.
- Inputs and adjacent actions align.
- Empty, loading, error, and disabled states exist.
- Icon-only buttons have labels and tooltips.
- The layout works on mobile and desktop.
- Light and dark mode are readable.
- E2E selectors do not depend on visual classes.
- Comments explain only non-obvious intent.
- Lint, unit tests, build, and relevant E2E tests pass.
