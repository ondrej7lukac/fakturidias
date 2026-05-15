# ⚡ Quick Reference — Design & CSS

## One-Minute Start

```bash
# Navigate to project
cd /Users/nilaybaranwal/Desktop/projects/faktroid/fakturidias

# Load context files
node scripts/load-context.mjs

# Start design work on Header (example)
npx impeccable craft Header

# Or just plan it first
npx impeccable shape Header

# Or audit an existing component
npx impeccable audit InvoiceForm
```

## Essential CSS Rules

### 1. Every Component Owns Its CSS

```jsx
// ✅ DO THIS
import './Header.css';  // At top of Header.jsx

.header {
  background: var(--color-bg);
  color: var(--color-text);
}
```

```jsx
// ❌ DON'T DO THIS
// (Styles in global index.css for Header component)
```

### 2. Use CSS Variables (No Hardcoded Colors)

```css
/* ✅ RIGHT */
background: var(--color-bg);
color: var(--color-text);
border: 1px solid var(--color-border);

/* ❌ WRONG */
background: #0b1022;
color: #e9ecff;
border: 1px solid #fff;
```

### 3. Mobile-First Responsive

```css
/* Base: mobile (all screens) */
.component {
  display: flex;
  flex-direction: column;
}

/* Tablet & up: 768px */
@media (min-width: 768px) {
  .component {
    flex-direction: row;
  }
}

/* Desktop & up: 1180px */
@media (min-width: 1180px) {
  .component {
    max-width: 1400px;
  }
}
```

### 4. Focus Indicators (Accessibility)

```css
/* Every interactive element needs this */
button:focus {
  outline: none;
  box-shadow: 0 0 0 3px var(--focus-ring);
}
```

### 5. BEM Naming

```css
/* Block */
.invoice-form {
}

/* Element (child) */
.invoice-form__header {
}
.invoice-form__button {
}

/* Modifier (variant) */
.invoice-form__button--primary {
}
.invoice-form__button--danger {
}
```

## Common Components Patterns

### Button

```css
.component__button {
  padding: 0.75rem 1.5rem;
  background: var(--color-primary); /* Green */
  color: #000;
  border-radius: 50px; /* Pill shape */
  font-weight: 700;
  cursor: pointer;
}

.component__button:hover {
  filter: brightness(1.1);
}

.component__button:focus {
  outline: 3px solid var(--focus-ring);
}
```

### Input

```css
.component__input {
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.component__input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}
```

### Card

```css
.component__card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  padding: 1.5rem;
  box-shadow: var(--shadow);
}
```

### Grid (2-column, responsive)

```css
.component__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .component__grid {
    grid-template-columns: 1fr 1fr;
  }
}
```

## CSS Custom Properties (Variables)

### Colors

```css
--color-bg              /* Background */
--color-text            /* Main text */
--color-text-muted      /* Secondary text */
--color-surface         /* Card backgrounds */
--color-border          /* Borders */
--color-primary         /* Green accent */
--color-danger          /* Red */
--color-warning         /* Orange */
--focus-ring            /* Focus indicator color */
```

### Spacing (8px grid)

```css
--space-2: 0.5rem (8px) --space-4: 1rem (16px) --space-5: 1.25rem (20px)
  --space-6: 1.5rem (24px);
```

### Other

```css
--radius: 18px /* Card border radius */ --radius2: 22px
  /* Accent border radius */ --shadow: 0 18px 50px... /* Card shadow */
  --headerH: 76px /* Header height */;
```

## Responsive Breakpoints

```css
@media (min-width: 480px) /* Large mobile */ @media (min-width: 768px) /* Tablet */ @media (min-width: 1180px); /* Desktop */
```

## Keyboard Navigation

Every interactive element must be keyboard accessible:

- Buttons: `<button>` tag (not `<div class="btn">`)
- Links: `<a>` tag (not `<button>` for navigation)
- Inputs: `<input>`, `<select>`, `<textarea>`
- Containers: Semantic tags (`<nav>`, `<main>`, `<aside>`)
- Focus order: Logical top-left → bottom-right by default
- Tab key: Move forward between elements
- Shift+Tab: Move backward
- Enter: Activate buttons/links
- Space: Toggle checkboxes
- Arrow keys: Navigate select options, radio groups

## Dark Mode Testing

1. Go to Settings page
2. Toggle theme button (top-right)
3. Page updates to dark mode
4. All colors should use CSS variables (no hardcoded colors)
5. Contrast should be legible in both modes

## Testing Checklist

Before committing any CSS:

- [ ] Light mode rendered correctly
- [ ] Dark mode rendered correctly (toggle in Settings)
- [ ] Mobile 480px layout looks right
- [ ] Tablet 768px layout looks right
- [ ] Desktop 1180px layout looks right
- [ ] Tab through component — all focusable elements highlighted
- [ ] No hardcoded colors (all var(--color-\*))
- [ ] No global styles — only in component CSS
- [ ] Responsive spacing (uses rem/em, not px)
- [ ] No `!important` (except accessibility overrides)
- [ ] No console errors

## Impeccable Commands Quick List

| Command                         | What it does                                 |
| ------------------------------- | -------------------------------------------- |
| `npx impeccable craft Header`   | Design AND implement (shape → code → polish) |
| `npx impeccable shape Header`   | Plan before coding (wireframe + UX)          |
| `npx impeccable audit Header`   | Check accessibility + responsive             |
| `npx impeccable polish Header`  | Final refinement before shipping             |
| `npx impeccable layout Header`  | Fix spacing and visual rhythm                |
| `npx impeccable clarify Header` | Improve UX copy and labels                   |
| `npx impeccable adapt Header`   | Fix mobile/tablet/desktop layouts            |

## File Map

| File                     | Purpose                                 |
| ------------------------ | --------------------------------------- |
| PRODUCT.md               | Product vision, users, brand tone       |
| DESIGN.md                | Complete design system spec             |
| .instructions.md         | Development guidelines                  |
| COMPONENT_STRUCTURE.md   | Component migration tracker             |
| scripts/load-context.mjs | Context validation script               |
| theme.css                | CSS custom properties (colors, spacing) |
| index.css                | Global resets + utilities only          |
| components/\*.css        | Component-scoped styles                 |

## Resources

- **Design System Details:** Read DESIGN.md (~2000 lines, comprehensive)
- **Product Context:** Read PRODUCT.md (~300 lines, strategic)
- **Component Guide:** Read COMPONENT_STRUCTURE.md (tracking + checklist)
- **Development Rules:** Read .instructions.md (workflow + patterns)
- **This File:** Quick reference (you are here)

## Common Issues Quick Fixes

| Problem                  | Fix                                                           |
| ------------------------ | ------------------------------------------------------------- |
| Styles not applying      | Check: CSS file imported in JSX? Filename matches?            |
| Dark mode broken         | Check: Using CSS variables? Avoid hardcoded colors            |
| Mobile layout wrong      | Check: Mobile-first CSS? @media queries present?              |
| Focus ring invisible     | Check: button:focus { outline: 3px solid var(--focus-ring); } |
| Text too small on mobile | Check: Using clamp() or responsive typography?                |
| Components import errors | Check: Component CSS file exists? Path correct?               |

---

**Bookmark this.** Update as you discover patterns.

Next: Read **PRODUCT.md** for product context, then **DESIGN.md** for full design system.
