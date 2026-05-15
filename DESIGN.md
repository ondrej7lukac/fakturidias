# Design System — Invoice Maker

## Color Palette

### Light Theme

**Base Palette**

- Background: `#f6f7ff` (very light blue-tinted white)
- Surface: `rgba(10, 18, 60, 0.06)` (subtle card background)
- Text Primary: `#0f1430` (deep indigo)
- Text Muted: `rgba(15, 20, 48, 0.72)` (medium gray)
- Text Subtle: `rgba(15, 20, 48, 0.55)` (lighter gray for secondary info)
- Border: `rgba(10, 18, 60, 0.14)` (light divider lines)

**Semantic Colors**

- Primary/Success: `#2dd7a6` (teal/mint green — main actions)
- Primary Strong: `#5869ff` (blue — highlights, links)
- Danger: `#e33d63` (red/pink — destructive actions)
- Warning: `#d3921f` (amber/orange — caution states)

**Backgrounds & Overlays**

- Success Background: `rgba(45, 215, 166, 0.1)` (light teal tint)
- Danger Background: `rgba(227, 61, 99, 0.15)` (light red tint)
- Header Background: `rgba(246, 247, 255, 0.66)` (semi-transparent light bg)
- Overlay: `rgba(13, 17, 23, 0.95)` (dark semi-transparent for modals)
- Glass (subtle): `rgba(255, 255, 255, 0.04)`
- Focus Ring: `rgba(88, 105, 255, 0.3)` (blue tint for keyboard focus)

### Dark Theme

**Base Palette**

- Background: `#0b1022` (very dark blue)
- Surface: `rgba(255, 255, 255, 0.06)` (subtle elevated surface)
- Text Primary: `#e9ecff` (light blue-white)
- Text Muted: `rgba(233, 236, 255, 0.7)` (medium gray)
- Text Subtle: `rgba(233, 236, 255, 0.55)` (lighter for secondary)
- Border: `rgba(255, 255, 255, 0.12)` (light dividers)

**Semantic Colors**

- Primary/Success: `#7cf7d4` (bright mint green)
- Primary Strong: `#8aa4ff` (light blue)
- Danger: `#ff5b7a` (bright red)
- Warning: `#ffcc66` (bright yellow/amber)

**Backgrounds & Overlays**

- Success Background: `rgba(124, 247, 212, 0.1)`
- Danger Background: `rgba(255, 91, 122, 0.15)`
- Header Background: `rgba(10, 12, 25, 0.55)`
- Overlay: `rgba(10, 12, 25, 0.82)`
- Glass (subtle): `rgba(255, 255, 255, 0.05)`
- Focus Ring: `rgba(124, 247, 212, 0.26)` (teal tint)

### Color Strategy

**Restrained + Committed Hybrid**

- Primary green (`--color-primary`) carries ~15% of screen weight (buttons, accents)
- Blue (`--color-primary-strong`) used sparingly for secondary actions/links
- Neutrals dominate (surfaces, text, borders)
- Color adds **action affordance** and **semantic meaning**, not decoration

**Accessibility**

- Light theme: Dark text on light background ≥ 7:1 WCAG AAA
- Dark theme: Light text on dark background ≥ 7:1 WCAG AAA
- Color + shape, never color alone for status/meaning
- Red + icon for danger, green + checkmark for success

## Typography

### Font Family

**Primary Font:** `Plus Jakarta Sans` (Google Fonts)

- Sans-serif, geometric, modern
- Supports weights: 400 (Regular), 600 (Semibold), 700 (Bold), 800 (Extra Bold)
- Italic variants available for emphasis
- Excellent screen rendering, high x-height for readability

### Type Scale

**Headings (Hierarchy)**

- `h1` / Page Title: `clamp(1.8rem, 5vw, 2.4rem)` — **800 weight**, letter-spacing -0.02em
- `h2` / Section: `1.5rem` — **700 weight**, letter-spacing -0.01em
- `h3` / Subsection: `1.125rem` — **700 weight**
- `h4` / Card Title: `1.1rem` — **700 weight**
- `h5` / Label: `0.925rem` — **600 weight**
- `h6` / Meta: `0.75rem` — **600 weight**, text transforms to uppercase, +0.5px letter-spacing

**Body**

- Default Body: `1rem` (16px) — **400 weight** — line-height `1.6`
- Body Small: `0.875rem` — **400 weight** — line-height `1.5`
- Body Tiny: `0.75rem` — **400 weight** — reserved for timestamps, helper text
- **Compact paragraph line length: 65–75 characters**

**Emphasis**

- **Bold:** `700 weight` for emphasis in body text
- _Italic:_ `400 italic` for titles/data labels only (not body text)
- **Strong + Italic:** Use sparingly; prefer bold or semantic <strong> tag

### Line Height

- Headings: `1.2`
- Body: `1.6`
- Form labels: `1.4`
- Lists: `1.7` (extra room for scanability)

### Letter Spacing

- Headings: `-0.02em` (tighter, more impact)
- Body: `normal` (0em, default)
- Labels/Small: `+0.5px` (openness, clarity)

## Spacing System

All spacing follows an 8px base unit grid for consistency.

### Tokens

```
--space-0: 0
--space-1: 0.25rem (4px)
--space-2: 0.5rem (8px)
--space-3: 0.75rem (12px)
--space-4: 1rem (16px)
--space-5: 1.25rem (20px)
--space-6: 1.5rem (24px)
--space-7: 2rem (32px)
--space-8: 2.5rem (40px)
--space-9: 3rem (48px)
--space-10: 3.5rem (56px)
--space-12: 4rem (64px)
--space-16: 5.5rem (88px)
```

### Application

- **Component Padding:** `--space-4` to `--space-6` (16–24px)
- **Section Margin:** `--space-7` to `--space-9` (32–48px)
- **Gap in Grid/Flex:** `--space-2` to `--space-5`
- **Form Row Gap:** `--space-4` (16px)
- **Card Internal Padding:** `--space-5` to `--space-6`
- **Heading + Paragraph Below:** `--space-3` (12px)
- **Section + Text Below:** `--space-2` (8px)

### Rhythm Principle

- Vary spacing to create visual rhythm; never use the same spacing for consecutive elements
- Primary action buttons get breathing room (margin bottom rarely needed)
- Dense tables use lower spacing; sparse layouts use higher spacing
- Mobile: More aggressive spacing reduction (40–60% of desktop)

## Radius & Corners

```
--radius: 18px (primary, cards, large buttons, modals)
--radius2: 22px (accent, featured cards, hero sections)

Component-Level Radius:
- Cards: 18px
- Buttons (primary): 50px (pill-shaped for accent)
- Buttons (secondary): 18px
- Input fields: 12px
- Badges: 30px (pill)
- Small icons: 8px
```

## Elevation & Shadows

### Shadows

```
--shadow: 0 18px 50px rgba(12, 18, 60, 0.18)          (elevated cards)
--shadow-lg: 0 10px 26px rgba(12, 18, 60, 0.14)        (modals, drawers)
```

**Shadow Usage**

- Cards / Panels: `--shadow`
- Modals / Overlays: `--shadow-lg` + semi-transparent background overlay
- Floating buttons: `--shadow`
- Dropdowns: `--shadow` (light elevation)
- **No shadow on interactive hovers** (use background tint instead)

## Layout Patterns

### Responsive Breakpoints

```
Mobile First:
- Default: 0 – 480px (portrait phones)
- Tablet: 481px – 1024px (iPad, landscape phone)
- Desktop: 1025px+ (desktop, widescreen)

Media Query Breakpoints:
@media (min-width: 768px) { }        /* tablet / large mobile */
@media (min-width: 1180px) { }       /* desktop / wide tablet */
```

### Container Widths

- Mobile: Full width with gutters (16px padding each side)
- Tablet: 90vw, max 800px
- Desktop: 90vw, max 1400px
- Narrow content (single column): max 700px

### Grid System

**2-Column Form Grid** (Desktop)

```css
display: grid;
grid-template-columns: 1fr 1fr;
gap: 1.5rem;

@media (max-width: 768px) {
  grid-template-columns: 1fr;
}
```

**3-Column Card Grid** (Multi-card layouts)

```css
display: grid;
grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
gap: 1.5rem;
```

### Header Layout

- Height: `--headerH: 76px`
- Logo/Title: left side, `--space-5` padding
- Navigation: center (desktop) or hamburger (mobile)
- Profile/Theme: right side
- Sticky positioning: `position: sticky; top: 0; z-index: 100`

## Component Specifications

### Buttons

**Primary Button** (Green accent)

```css
background: var(--color-primary);
color: #000;
padding: 0.75rem 1.5rem;
border-radius: 50px;
font-weight: 700;
border: none;
cursor: pointer;

&:hover {
  background: var(--color-primary) lightened by 10%;
  /* OR: filter: brightness(1.1); */
}

&:active {
  transform: scale(0.98);
}

&:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**Secondary Button** (Outlined/Muted)

```css
background: transparent;
color: var(--color-text);
border: 1px solid var(--color-border);
padding: 0.75rem 1.5rem;
border-radius: 12px;
font-weight: 600;
cursor: pointer;

&:hover {
  background: var(--color-surface);
  border-color: var(--color-text);
}
```

**Danger Button** (Red)

```css
background: var(--color-danger);
color: #fff;
padding: 0.75rem 1.5rem;
border-radius: 12px;
font-weight: 700;

&:hover {
  background: var(--color-danger) darkened by 10%;
  /* OR: filter: brightness(0.9); */
}
```

**Icon Button** (Square, for actions)

```css
width: 44px;
height: 44px;
padding: 0;
border-radius: 12px;
display: flex;
align-items: center;
justify-content: center;
background: transparent;
color: var(--color-text);
border: none;
cursor: pointer;

&:hover {
  background: var(--color-surface);
}
```

### Form Inputs

**Text Input / Select**

```css
width: 100%;
padding: 0.75rem 1rem;
border: 1px solid var(--color-border);
border-radius: 12px;
background: var(--color-bg);
color: var(--color-text);
font-family: 'Plus Jakarta Sans', sans-serif;
font-size: 1rem;

&:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

&::placeholder {
  color: var(--color-text-subtle);
}

&:disabled {
  background: var(--color-surface);
  cursor: not-allowed;
  opacity: 0.6;
}
```

**Label**

```css
display: block;
font-weight: 600;
font-size: 0.925rem;
margin-bottom: 0.5rem;
color: var(--color-text);

/*  Required indicator */
&[data-required]::after {
  content: ' *';
  color: var(--color-danger);
}
```

### Cards / Panels

```css
background: var(--color-surface);
border: 1px solid var(--color-border);
border-radius: 18px;
padding: 1.5rem;
box-shadow: var(--shadow);

/*  Elevated card (featured, highlight) */
&.card--featured {
  background: var(--color-surface-strong);
  box-shadow: var(--shadow-lg);
}

/*  Compact card (dense info) */
&.card--compact {
  padding: 1rem;
  border-radius: 12px;
}
```

### Tables

```css
/*  Header row */
thead {
  background: var(--color-surface-strong);
  border-bottom: 2px solid var(--color-border);
  font-weight: 700;
  font-size: 0.925rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-muted);
}

/*  Body rows */
tbody tr {
  border-bottom: 1px solid var(--color-border);

  &:hover {
    background: var(--color-surface);
  }
}

/*  Cells */
td,
th {
  padding: 1rem;
  text-align: left;

  &:first-child {
    border-radius: 12px 0 0 0;
  }

  &:last-child {
    border-radius: 0 0 0 12px;
  }
}
```

### Modals & Overlays

```css
/*  Backdrop overlay */
.modal__backdrop {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

/*  Modal content */
.modal {
  background: var(--color-bg);
  border-radius: 18px;
  padding: 2rem;
  box-shadow: var(--shadow-lg);
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;

  /*  Close button (top-right) */
  .modal__close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 44px;
    height: 44px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 12px;

    &:hover {
      background: var(--color-surface);
    }
  }
}
```

### Status Badges / Pills

```css
display: inline-flex;
align-items: center;
gap: 0.5rem;
padding: 0.4rem 1rem;
border-radius: 30px;
font-weight: 600;
font-size: 0.75rem;
text-transform: uppercase;
letter-spacing: 0.5px;

/*  Status: Draft (Gray) */
&.badge--draft {
  background: var(--color-surface-strong);
  color: var(--color-text-muted);
}

/*  Status: Sent (Blue) */
&.badge--sent {
  background: rgba(88, 105, 255, 0.15);
  color: var(--color-primary-strong);
}

/*  Status: Paid (Green) */
&.badge--paid {
  background: var(--color-success-bg);
  color: var(--color-primary);
}

/*  Status: Overdue (Red) */
&.badge--overdue {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}
```

### Lists & Navigation

```css
/*  Sidebar or vertical menu */
.navigation {
  list-style: none;
  padding: 0;
  margin: 0;
}

.navigation__item {
  margin-bottom: 0.5rem;

  a {
    display: block;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    color: var(--color-text);
    text-decoration: none;
    transition: background 0.15s ease;

    &:hover {
      background: var(--color-surface);
    }

    &.active {
      background: var(--color-primary);
      color: #000;
      font-weight: 700;
    }
  }
}
```

## Motion & Interaction

### Transitions

- **Duration:** 150ms for micro-interactions (button hover, checkbox), 300ms for medium (modals, slideovers), 500ms for full-page navigations
- **Easing Function:** `ease-out-cubic` or `cubic-bezier(0.33, 0.66, 0.66, 1)` for smooth, fast-in-slow-out behavior
- **No layout animation:** Never animate width, height, or grid-column changes (causes jank); use opacity + transform instead

### Hover States

- Buttons: Slightly darker/lighter background, subtle scale (no transform on text inputs)
- Cards / Links: Slight background lift or border color change
- Icons: Color shift + optional scale(1.05)
- **No hover on mobile** (no :hover cascade on touch devices; use active/focus instead)

### Focus States

- All interactive elements: Visible keyboard focus ring (3px, with --focus-ring color)
- Never `outline: none` without replacement focus style
- Focus ring should be at least 2px outside the element boundary

### Loading States

- Buttons: Disable + spinner icon inside button (don't disable interactivity if possible)
- Forms: Skeleton screens for data loading (shimmer effect optional)
- Tables: Fade-in rows one-by-one (stagger 50ms between rows)

### Animations

- **No decorative animations.** Every animation must serve UX (loading, feedback, guidance).
- **Reduce motion:** Respect `prefers-reduced-motion` media query; default to instant transitions for users with this preference.

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Dark Mode Implementation

### CSS Variables Structure

Theme variables organized in `:root` (light) and `:root[data-theme="dark"]` (dark):

```css
:root {
  --color-bg: #f6f7ff;
  --color-text: #0f1430;
  /*  ... light colors ... */
}

:root[data-theme='dark'] {
  --color-bg: #0b1022;
  --color-text: #e9ecff;
  /*  ... dark colors ... */
}
```

### System Preference Detection

```javascript
const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
```

### User Override (Toggle)

```javascript
function toggleTheme() {
  const current =
    document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}
```

### No Hardcoded Colors in Component CSS

- Every color comes from CSS custom properties
- Never use literals like `#fff`, `#000`, `rgb(255, 255, 255)`
- Always: `background: var(--color-bg);` or `color: var(--color-text);`

## Accessibility Standards

### WCAG 2.1 Level AA Compliance

1. **Color Contrast**
   - Minimum 4.5:1 for normal text
   - Minimum 3:1 for large text (18px+ or 14px+ bold)
   - No information conveyed by color alone (always add icon/text/border)

2. **Keyboard Navigation**
   - Tab order logical and intuitive (top-left to bottom-right)
   - Skip link to main content (hidden, visible on focus)
   - All interactive elements keyboard-accessible
   - No keyboard traps

3. **Focus Indicators**
   - Always visible (never `outline: none`)
   - At least 2px thickness, 3px for medium-sized elements
   - High contrast (uses --focus-ring, ~4:1+ contrast)

4. **Semantic HTML**
   - Proper heading hierarchy (h1 → h2 → h3, never skip levels)
   - `<button>` for buttons (never `<div class="btn">`)
   - `<label for="input-id">` for all form inputs
   - ARIA labels where semantic HTML insufficient

5. **Form Accessibility**
   - All inputs have associated labels
   - Error messages linked to inputs via `aria-describedby`
   - Required fields marked with `aria-required="true"` or `<label>…<span aria-label="required">*</span>`
   - Inline validation feedback with appropriate `role="alert"`

6. **Images & Icons**
   - All images have descriptive `alt` text (not "image" or "icon")
   - Decorative icons: `aria-hidden="true"`
   - Functional icons: Wrapped in `<button>` with `aria-label`

7. **Screen Readers**
   - Main landmark: `<main role="main">`
   - Navigation landmark: `<nav>`
   - Complementary content: `<aside role="complementary">`
   - List items: Proper `<ul>` / `<ol>` / `<li>` semantics

## Responsive Design Rules

### Mobile First

1. Base CSS for mobile (portrait, ≤480px)
2. Tablet adjustments: `@media (min-width: 768px)`
3. Desktop enhancements: `@media (min-width: 1180px)`

### Flexible Layouts

- Use `flex` or `grid` for layout (no floats)
- `width: 100%` for full-width containers by default
- `max-width` to cap content width on large screens
- Avoid fixed heights; let content flow naturally

### Typography Scaling

- Headings: Use `clamp()` for fluid scaling
  ```css
  h1 {
    font-size: clamp(1.8rem, 5vw, 2.4rem);
  }
  ```
- Body text: Fixed 1rem (16px) mobile, 1.1rem (17.6px) desktop
- Line length: Never exceed 75ch on any screen

### Touch Targets

- Minimum 44×44px on mobile (WCAG AAA standard)
- Buttons, links, controls: Tappable with thumb at arms-length
- Spacing: 8px minimum between adjacent touch targets

### Responsive Images

- Use `<img srcset="">` for multiple resolutions
- `max-width: 100%;` to prevent overflow
- Aspect ratio containers: `position: relative; padding-bottom: 66.67%;` for 3:2 ratio
- Or use CSS Grid with `auto-rows: auto;` for image galleries

### Viewport Meta Tag

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover"
/>
```

## Performance Guidelines

1. **CSS Delivery**
   - Critical styles: Inline in `<head>`
   - Non-critical styles: Async load (or bundled by tool)
   - Never render-block on non-critical CSS

2. **Image Optimization**
   - WebP with PNG/JPG fallback
   - Lazy load offscreen images: `loading="lazy"`
   - Maximum image width = 2x device pixel ratio (e.g., 1920px for 960px display)

3. **Font Loading**
   - Use `font-display: swap;` for Google Fonts
   - Load only required weights (400, 600, 700, 800)
   - Avoid italic unless actually used

4. **Animations**
   - Use CSS transforms (translate, scale, rotate) over position changes
   - Use `will-change: transform;` sparingly (only on animated elements)
   - Minimize repaints: Test with DevTools Performance tab

5. **State of CSS-in-JS vs. CSS Modules**
   - This project: **CSS Modules / scoped CSS files per component**
   - Import stylesheet in component: `import './ComponentName.css';`
   - Keeps global namespace clean, avoids cascade pollution

## File Structure & Organization

### Directory Layout

```
/invoice-react/src/
├── components/
│   ├── Header.jsx
│   ├── Header.css
│   ├── Settings.jsx
│   ├── Settings.css
│   ├── InvoiceForm.jsx
│   ├── InvoiceForm.css
│   ├── InvoiceList.jsx
│   ├── InvoiceList.css
│   ├── InvoicePreview.jsx
│   ├── InvoicePreview.css
│   ├── WelcomeScreen.jsx
│   ├── WelcomeScreen.css
│   ├── AresSearch.jsx
│   ├── ... (other components + CSS files)
│
├── utils/
│   ├── storage.js      (localStorage + API calls)
│   ├── pdf.js          (PDF generation)
│   ├── bank.js         (SEPA QR code generation)
│   ├── i18n.js         (Translations)
│   └── ...
│
├── index.css           (GLOBAL styles only: reset, theme, base typography)
├── theme.css           (CSS custom properties for light/dark)
├── index.jsx           (React entry point)
└── App.jsx             (Root component)
```

### CSS File Naming

- **Component CSS:** Same name as component file
  - `Settings.jsx` → `Settings.css`
  - `InvoiceForm.jsx` → `InvoiceForm.css`
  - Upper camelCase for component names, matching JSX file

### Global CSS (index.css & theme.css)

- **theme.css:** CSS custom property definitions (colors, spacing, typography scales)
- **index.css:** ONLY truly global styles:
  - CSS reset (margin/padding resets on elements)
  - Base typography (body, html defaults)
  - Global utility classes (if any, e.g., `.sr-only` for screen reader text)
  - **NO component-specific styles** (each component owns its CSS)

## Design Review Checklist

Before shipping any UI feature, verify:

- [ ] **Light & dark mode** both rendered, tested in browser
- [ ] **Mobile, tablet, desktop** layouts all responsive and readable
- [ ] **Keyboard navigation** fully functional (tab through all controls)
- [ ] **Focus indicators** visible on all interactive elements
- [ ] **Color contrast** meets 4.5:1 (text) and 3:1 (UI components)
- [ ] **Touch targets** minimum 44×44px on mobile
- [ ] **Form validation** clear error messages, no jargon
- [ ] **Loading states** indicate progress (never frozen UI)
- [ ] **Error handling** graceful degradation, helpful messages (no console errors)
- [ ] **No hardcoded colors** in component CSS (all from CSS variables)
- [ ] **Component CSS file** created + imported (no global cascade pollution)
- [ ] **Spacing follows grid** (multiples of 8px base unit)
- [ ] **Typography hierarchy** clear and consistent (scale + weight)
- [ ] **No fixed layouts** (use flexbox/grid, no floats or absolute positioning)
- [ ] **Animations test** with `prefers-reduced-motion` (disabled animations for users)
- [ ] **Internationalization ready** (all strings in i18n, no hardcoded text)
- [ ] **Performance** images optimized, CSS scoped, no render-blocking
