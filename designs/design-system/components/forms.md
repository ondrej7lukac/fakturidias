# Forms

Source: `invoice-react/src/styles/forms.css`

## Field Wrapper

Wrap every label+input pair in `.field` to get a 6px grid gap:

```html
<div class="field">
  <label>Company Name</label>
  <input type="text" />
</div>
```

## Label

```css
label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.025em;
}
```

## Input / Select / Textarea

All share the same base styles:
- Padding: `0.625rem 0.875rem`
- Border: `1px solid var(--border)`
- Background: `rgba(255, 255, 255, 0.03)`
- Border radius: `12px`

**Focus state** (teal ring):
```css
border-color: rgba(124, 247, 212, 0.55);
box-shadow: 0 0 0 4px rgba(124, 247, 212, 0.1);
```

## Select Arrow

`select` elements render a custom CSS chevron using `background-image`. No JS needed. Do not set `appearance: auto`.

## shadcn Equivalents

For components using the shadcn UI layer, import from `@/components/ui/`:
- `Input` — wraps the base input with shadcn tokens
- `Select` — @base-ui/react Select with scroll buttons
- `Label` — semantic label wrapper

Use the raw `input`/`select` elements for non-shadcn form areas (invoice line items, ARES search fields).

## Grid Layouts for Form Fields

```html
<!-- Two-column field row -->
<div class="grid two">
  <div class="field">...</div>
  <div class="field">...</div>
</div>

<!-- Three-column (qty / unit price / total) -->
<div class="grid three">
  ...
</div>
```

On mobile (`≤768px`), `.grid.two` and `.grid.three` collapse to a single column unless `.mobile-grid-2` is added.
