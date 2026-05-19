# Buttons

Source: `invoice-react/src/styles/buttons.css`

## Open/Closed System

All buttons share a base set of CSS custom properties. Variants override only what differs — the base handles hover, active, and transition.

```css
button, .btn {
  --btn-bg: rgba(255, 255, 255, 0.06);
  --btn-color: var(--text);
  --btn-border: transparent;
  --btn-hover-bg: rgba(255, 255, 255, 0.10);
  --btn-hover-shadow: var(--shadow-lg);
  --btn-hover-filter: none;
}
```

**Rule:** To create a new variant, override `--btn-*` props. Never modify the `button, .btn` base rule.

## Variants

| Class | Description |
|-------|-------------|
| `button.primary` / `button[type="submit"]` / `.btn--primary` | Teal→indigo gradient, dark text, glow on hover |
| `button.secondary` / `.btn--soft` | Transparent with `--border` outline |
| `button.success` | Indigo→teal gradient, dark text |
| `button.danger` | On hover: fills with `--danger`, white text |
| `.iconBtn` | 42×42px square, 14px radius, grid-centered icon |
| `button.pill` | Pill-shaped; inherits base font |

## Primary Button Gradient

```css
--btn-bg: radial-gradient(14px 14px at 18% 18%, rgba(255, 255, 255, 0.35), transparent 60%),
          linear-gradient(135deg, rgba(124, 247, 212, 0.92), rgba(138, 164, 255, 0.92));
--btn-color: #061022;
```

## Creating a Custom Variant

```css
.btn--brand {
  --btn-bg: var(--accent);
  --btn-color: #061022;
  --btn-border: transparent;
  --btn-hover-filter: brightness(1.08);
  --btn-hover-bg: var(--btn-bg);
}
```

## Icon Button Usage

```tsx
import { Pencil, ICON_MD, STROKE } from '@/lib/icons'

<button className="iconBtn">
  <Pencil size={ICON_MD} strokeWidth={STROKE} />
</button>
```
