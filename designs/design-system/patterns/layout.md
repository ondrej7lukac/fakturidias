# Layout

Source: `invoice-react/src/styles/layout.css`

## Main Grid

The app uses a two-column `main` grid:

```css
main {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;   /* form (wider) | list (narrower) */
  gap: 2rem;
  padding: calc(var(--headerH) + 2rem) 2rem 2rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
}
```

- Left column (`1.2fr`): `InvoiceForm` + `InvoicePreview`
- Right column (`0.8fr`): `InvoiceList`
- `--headerH` (76px) offsets content below the fixed header

## Dashboard Mode

When the dashboard is open, `main` gets `.dashboard-mode`:
- Left column hidden (`display: none`)
- Right column stretches to full width (`grid-column: 1 / -1`)

## Utility Grid Classes

```html
<div class="grid two">…</div>   <!-- 2 equal columns -->
<div class="grid three">…</div> <!-- 3 equal columns -->
```

Collapse to 1 column at `≤768px`, unless `.mobile-grid-2` is added:

```html
<!-- Stays 2 cols on mobile (e.g., qty / price) -->
<div class="grid two mobile-grid-2">…</div>

<!-- Becomes 60px / 1fr / 80px on mobile (qty / description / total) -->
<div class="grid three mobile-grid-2">…</div>
```

## Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| `≤1024px` | `main` collapses to 1 column |
| `≤768px` | All `.grid.two/.three` collapse to 1 col; `.view-switch` appears; `.mobile-hidden` hides; `.mobile-only-flex` shows |

## Header Offset

Always use `padding-top: calc(var(--headerH) + Xrem)` for any full-page container, since the header is `position: fixed`.

## Actions Row

```html
<div class="actions">
  <button>Save</button>
  <button class="secondary">Cancel</button>
</div>
```

`flex-wrap: wrap` with `0.75rem` gap. On mobile, buttons stack full-width.

## Settings Layout

Settings uses a sidebar + content layout defined in `AresSearch.css`:

```css
.settings-v3-layout {
  display: grid;
  grid-template-columns: 260px 1fr;  /* sidebar | content */
}
```

Collapses to single column at `≤1024px`.
