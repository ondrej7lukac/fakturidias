# Fakturidias Design System

Single reference point for all design decisions in this project. The frontend (`invoice-react/`) implements this system; this folder documents it and provides TypeScript token exports for JS-side consumption.

## Using Tokens in CSS

All design values are CSS custom properties defined in `invoice-react/src/styles/utilities.css`. Use them directly:

```css
color: var(--text);
background: var(--card);
border: 1px solid var(--border);
border-radius: var(--radius);
box-shadow: var(--shadow-lg);
```

Dark mode is automatic — no class toggling required. All tokens have `@media (prefers-color-scheme: dark)` overrides in `utilities.css`.

## Using Tokens in TypeScript / JavaScript

For chart colors, PDF generation, or any place that needs raw values in JS:

```ts
import { colors, typography, spacing, shadows } from '../design-system/tokens'

const chartColor = colors.light.accent      // '#2dd7a6'
const darkBg     = colors.dark.bg           // '#0b1022'
const bodyFont   = typography.fontPrimary
const cardRadius = spacing.radius2          // '22px'
```

## Core Design Principles

- **All CSS values via `var(--token)`** — no raw hex or rgba in component CSS files
- **No styles in `index.css` or `globals.css`** — they are import facades only
- **One CSS file per component** — `MyComponent.css` imported at the top of `MyComponent.tsx`
- **No emojis** — all icons are Lucide SVG via `@/lib/icons`
- **No direct `lucide-react` imports** — always go through `@/lib/icons`
- **Button variants override `--btn-*` props** — never touch the `button, .btn` base rule

## Token Reference

| Token | CSS var | Light | Dark |
|-------|---------|-------|------|
| Page background | `--bg` | `#f6f7ff` | `#0b1022` |
| Secondary background | `--bg2` | `#eef1ff` | `#070a14` |
| Surface / card | `--card` | `rgba(10,18,60,0.06)` | `rgba(255,255,255,0.06)` |
| Body text | `--text` | `#0f1430` | `#e9ecff` |
| Muted text | `--muted` | `rgba(15,20,48,0.72)` | `rgba(233,236,255,0.7)` |
| Border | `--border` | `rgba(10,18,60,0.14)` | `rgba(255,255,255,0.12)` |
| Accent (teal) | `--accent` | `#2dd7a6` | `#7cf7d4` |
| Accent 2 (indigo) | `--accent-2` | `#5869ff` | `#8aa4ff` |
| Danger | `--danger` | `#e33d63` | `#ff5b7a` |
| Warning | `--warn` | `#d3921f` | `#ffcc66` |
| Border radius | `--radius` | `18px` | ← same |
| Border radius (lg) | `--radius2` | `22px` | ← same |
| Header height | `--headerH` | `76px` | ← same |

## Component Docs

- [Buttons](./components/buttons.md) — variant system, `--btn-*` override pattern
- [Forms](./components/forms.md) — `.field` wrapper, focus states, grid layouts
- [Badges](./components/badges.md) — `.pill` variants, `StatusBadge` component
- [Icons](./components/icons.md) — import rules, size constants, full icon list

## Pattern Docs

- [CSS Architecture](./patterns/css-architecture.md) — file layers, where to add styles
- [Layout](./patterns/layout.md) — main grid, `.grid.two/three`, breakpoints
- [i18n](./patterns/i18n.md) — language system, translation pattern, adding keys

## Token Files

```
design-system/tokens/
├── colors.ts      — Full light/dark color palette
├── typography.ts  — Font families, sizes, weights
├── spacing.ts     — Radii, headerH, shadows, breakpoints
└── index.ts       — Barrel export
```
