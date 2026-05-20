# CSS Architecture

## Layer Overview

`invoice-react/src/index.css` is a 5-line import facade — it does nothing except load:

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
@import './styles/utilities.css';   /* tokens, body, card/panel, animations */
@import './styles/layout.css';      /* main grid, .grid.two/three, breakpoints */
@import './styles/forms.css';       /* label, input, select, textarea */
@import './styles/buttons.css';     /* button system via CSS custom props */
@import './styles/tables.css';      /* table, th/td, .pill status badges */
```

## Rules

| Rule | Why |
|------|-----|
| No styles in `index.css` | It is a facade — adding styles here breaks ordering guarantees |
| No styles in `globals.css` | Tailwind + shadcn config only — editing it breaks shadcn components |
| All CSS values via `var(--token)` | No raw hex/rgba in component CSS |
| New component → new `.css` file | Co-located with `.tsx`, imported at the top of the component file |
| Button variants override `--btn-*` props | Never modify the `button, .btn` base rule |

## Adding a New Component

1. Create `src/components/MyComponent.css`
2. Import it at the top of `src/components/MyComponent.tsx`:
   ```ts
   import './MyComponent.css'
   ```
3. Use `var(--token)` for all color/spacing values

## Adding a New Global Style

- If it belongs to an existing category (forms, tables, layout) → add to the correct `src/styles/*.css` file
- If it's a new category → create `src/styles/newcategory.css` and add the import to `index.css`

## Token Source of Truth

`invoice-react/src/styles/utilities.css` defines all `:root` CSS variables. The TypeScript mirrors are in `design-system/tokens/` for JS-side consumption. When adding a new token, add it to **both** files.

## Dark Mode

Automatic via `@media (prefers-color-scheme: dark)` in `utilities.css`. No class toggling, no JS. All tokens have dark-mode overrides in that media query.

## Animations

Three keyframes are defined in `utilities.css` and available globally:

| Name | Effect |
|------|--------|
| `pulse` | Scale + opacity pulse |
| `fadeIn` | translateY(-5px) → 0 + opacity |
| `scale-up` | scale(0) → scale(1) |

Usage: `animation: fadeIn 0.2s ease`
