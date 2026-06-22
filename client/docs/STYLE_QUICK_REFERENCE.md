# Ready 4 Learning Style Quick Reference

Use this page while building or reviewing frontend work. The full rules are in [Frontend Style Guide](FRONTEND_STYLE_GUIDE.md).

Live examples are available at `/style-guide`; administrators also receive an account-menu shortcut.
For a visual handout, use the [Frontend Style Visual Reference PDF](../../output/pdf/r4l-frontend-style-reference.pdf).

## Build order

1. Angular Material component.
2. Existing global `app-*` class.
3. Semantic `--app-*` variable.
4. Feature SCSS only when the layout is unique.

## Color variables

| Purpose | Variable |
| --- | --- |
| App background | `--app-bg` or `--app-page-bg` |
| Card/panel | `--app-surface` |
| Muted panel/hover | `--app-surface-muted` |
| Main text | `--app-text` |
| Supporting text | `--app-text-muted` |
| Border/divider | `--app-border` |
| Primary | `--app-primary`, `--app-on-primary` |
| Accent | `--app-accent`, `--app-on-accent` |
| Error/destructive | `--app-warn`, `--app-on-warn` |
| Positive/completed | `--app-success`, `--app-on-success` |
| Optional third category | `--app-tertiary`, `--app-on-tertiary` |
| Rare theme contrast | `--app-contrast` |

Component SCSS should not contain palette hex values.

## Spacing and shape

| Purpose | Variable |
| --- | --- |
| 4px | `--app-space-xs` |
| 8px | `--app-space-sm` |
| 16px | `--app-space-md` |
| 24px | `--app-space-lg` |
| 32px | `--app-space-xl` |
| Small radius | `--app-radius-sm` |
| Standard radius | `--app-radius-md` |
| Card/panel radius | `--app-radius-lg` |
| Pill | `--app-radius-pill` |
| Shadows | `--app-shadow-sm`, `--app-shadow-md`, `--app-shadow-lg` |

## Common classes

| Need | Class |
| --- | --- |
| Page container | `.app-page-shell` |
| Page spacing | `.app-page-stack` |
| Header/title/subtitle | `.app-page-header`, `.app-page-title`, `.app-page-subtitle` |
| Vertical spacing | `.app-stack-sm`, `.app-stack-md`, `.app-stack-lg` |
| Inline wrapping group | `.app-cluster` |
| Split row | `.app-split` |
| Grid | `.app-grid-2`, `.app-grid-3`, `.app-grid-auto` |
| Normal panel | `.app-panel` |
| Muted panel | `.app-panel-muted` |
| Strong surface | `.app-card` |
| Form stack | `.app-form-stack` |
| Field grid | `.app-field-grid` |
| Input plus button | `.app-field-action-row` |
| Button group | `.app-action-row`, `.app-action-row-end` |
| Scrollable list | `.app-scroll-region` |
| Empty state | `.app-empty-state` |
| Muted text | `.app-text-muted` |

## Status classes

```html
<span class="app-badge app-badge-primary">Current</span>
<span class="app-badge app-badge-accent">Secondary</span>
<span class="app-badge app-badge-success">Complete</span>
<span class="app-badge app-badge-warn">Error</span>
<span class="app-badge app-badge-tertiary">Category</span>
```

For success buttons:

```html
<button mat-raised-button class="app-success-button">Complete</button>
```

## Standard page

```html
<section class="app-page-shell app-page-stack">
  <header class="app-page-header">
    <div>
      <h1 class="app-page-title">Page Name</h1>
      <p class="app-page-subtitle">What users do here.</p>
    </div>
  </header>

  <div class="app-panel">
    <!-- Page controls or content -->
  </div>
</section>
```

## Review reminders

- Use Material controls before custom controls.
- Use semantic tokens, not hard-coded colors.
- Use `data-cy` for stable E2E selectors.
- Test mobile, desktop, light mode, and dark mode.
- Add comments only for intent or unusual constraints.
- Keep feature CSS local and reusable CSS global.
