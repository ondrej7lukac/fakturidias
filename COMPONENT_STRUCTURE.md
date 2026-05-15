# Component Structure Guide — Invoice Maker Frontend

## Component Inventory & Migration Status

This document tracks the CSS migration from global `index.css` to component-scoped stylesheets.

### Status Legend

- ✅ **Done** — Component CSS file created, imported in JSX, removed from index.css
- 🔄 **In Progress** — CSS file created or migration started
- ⏳ **Pending** — Not yet migrated, styles still in index.css
- ⚠️ **Review** — CSS created but needs design review/optimization

### Component List

#### Core Navigation & Layout

| Component        | File                              | CSS File             | Styles         | Status     | Notes                                                         |
| ---------------- | --------------------------------- | -------------------- | -------------- | ---------- | ------------------------------------------------------------- |
| Header           | `components/Header.jsx`           | Header.css           | 463 lines      | ✅ Done    | Navigation, profile menu, theme toggle — Validated in browser |
| InvoiceDashboard | `components/InvoiceDashboard.jsx` | InvoiceDashboard.css | ~100-150 lines | ⏳ Pending | Overview, stats, quick access                                 |

#### Invoice Management

| Component      | File                            | CSS File           | Styles    | Status  | Notes                                                          |
| -------------- | ------------------------------- | ------------------ | --------- | ------- | -------------------------------------------------------------- |
| InvoiceList    | `components/InvoiceList.jsx`    | InvoiceList.css    | 219 lines | ✅ Done | Table view, filters, item cards, hover effects — Validated     |
| InvoiceForm    | `components/InvoiceForm.jsx`    | InvoiceForm.css    | 703 lines | ✅ Done | **Largest component**, form sections, buttons, VAT, validation |
| InvoicePreview | `components/InvoicePreview.jsx` | InvoicePreview.css | 323 lines | ✅ Done | Full class-based styling; inline styles removed and validated  |
| ItemsTable     | `components/ItemsTable.jsx`     | ItemsTable.css     | 33 lines  | ✅ Done | Inline action/summary styles extracted and scoped              |

#### Settings & Configuration

| Component | File                      | CSS File     | Styles     | Status  | Notes                                    |
| --------- | ------------------------- | ------------ | ---------- | ------- | ---------------------------------------- |
| Settings  | `components/Settings.jsx` | Settings.css | ~515 lines | ✅ Done | Company info, bank account, integrations |

#### User Onboarding & Welcome

| Component     | File                           | CSS File          | Styles    | Status  | Notes                                        |
| ------------- | ------------------------------ | ----------------- | --------- | ------- | -------------------------------------------- |
| WelcomeScreen | `components/WelcomeScreen.jsx` | WelcomeScreen.css | 232 lines | ✅ Done | Pricing tiers, login, onboarding — Validated |

#### Utilities & Helpers

| Component   | File                         | CSS File        | Styles         | Status     | Notes                        |
| ----------- | ---------------------------- | --------------- | -------------- | ---------- | ---------------------------- |
| AresSearch  | `components/AresSearch.jsx`  | AresSearch.css  | ~150-200 lines | ⏳ Pending | ARES company lookup dropdown |
| QRPreview   | `components/QRPreview.jsx`   | QRPreview.css   | ~80-120 lines  | ⏳ Pending | QR code display              |
| StatusBadge | `components/StatusBadge.jsx` | StatusBadge.css | ~60-100 lines  | ⏳ Pending | Invoice status indicator     |

#### Planned Components (if not already existing)

| Component   | Purpose                | Priority |
| ----------- | ---------------------- | -------- |
| FormSection | Reusable form grouping | High     |
| ButtonGroup | Button collections     | Medium   |
| Modal       | Dialog wrapper         | Medium   |
| Alert       | Notification display   | Medium   |
| Skeleton    | Loading placeholder    | Low      |

## Migration Priority

### Phase 1: High-Impact (Next)

1. **InvoiceForm** (~600 lines) — Most CSS, most visible
2. **InvoiceList** (~300 lines) — Table display, filters
3. **Header** (~250 lines) — Navigation, visible everywhere

### Phase 2: Medium-Impact

4. **WelcomeScreen** (~450 lines) — Onboarding, pricing
5. **InvoicePreview** ✅ Complete

### Phase 3: Remaining

6. **ItemsTable** ✅ Complete
7. **AresSearch** (~175 lines)
8. **InvoiceDashboard** (~125 lines)
9. **QRPreview** (~100 lines)
10. **StatusBadge** (~80 lines)

## Global CSS (index.css) — Target State

After migration complete, `index.css` should contain **only**:

```css
/* Reset + base styles */
* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { font-family: 'Plus Jakarta Sans', sans-serif; }

/* Global utilities */
.sr-only { position: absolute; ... }
.container { max-width: 1400px; ... }

/* Maybe: global animations */
@keyframes fadeIn { ... }
@keyframes slideUp { ... }
```

**No component styles. Period.**

## File Structure After Migration

```
/invoice-react/src/
├── App.jsx
├── index.jsx
├── index.css              (ONLY global resets + utilities)
├── theme.css              (CSS custom properties)
│
├── components/
│   ├── Header.jsx
│   ├── Header.css         ← NEW
│   ├── Settings.jsx
│   ├── Settings.css       ← EXISTING (already migrated)
│   ├── InvoiceForm.jsx
│   ├── InvoiceForm.css    ← TODO
│   ├── InvoiceList.jsx
│   ├── InvoiceList.css    ← TODO
│   ├── InvoicePreview.jsx
│   ├── InvoicePreview.css
│   ├── WelcomeScreen.jsx
│   ├── WelcomeScreen.css  ← TODO
│   ├── ItemsTable.jsx
│   ├── ItemsTable.css
│   ├── AresSearch.jsx
│   ├── AresSearch.css     ← TODO
│   ├── InvoiceDashboard.jsx
│   ├── InvoiceDashboard.css ← TODO
│   ├── QRPreview.jsx
│   ├── QRPreview.css      ← TODO
│   └── StatusBadge.jsx
│   └── StatusBadge.css    ← TODO
│
└── utils/
    ├── storage.js
    ├── pdf.js
    ├── bank.js
    └── i18n.js
```

## Component Checklist Template

Use this for each component before marking "Done":

### ComponentName Migration Checklist

- [ ] **CSS File Created** — `/src/components/ComponentName.css` exists
- [ ] **Import Added** — First line of ComponentName.jsx: `import './ComponentName.css';`
- [ ] **All Styles Migrated** — All `.component-name-*` styles moved from index.css to ComponentName.css
- [ ] **Source Verified** — Grep checked for all component classnames in index.css (should be 0 matches)
- [ ] **No Hardcoded Colors** — All colors use CSS custom properties (var(--color-\*))
- [ ] **Responsive Check** — Styles include breakpoints @media (min-width: 768px) and @media (min-width: 1180px)
- [ ] **Dark Mode Check** — Tested with theme toggle in Settings
- [ ] **Accessibility Check** — Focus rings, contrast, keyboard nav tested
- [ ] **Performance Check** — No render-blocking styles, uses transforms for animations
- [ ] **Code Review** — Manual review of CSS file for:
  - [ ] Consistent indentation (2 spaces)
  - [ ] No unused class selectors
  - [ ] Consistent naming convention (BEM: .component\_\_element--modifier)
  - [ ] No `!important` flags (except accessibility overrides)
  - [ ] Comments for complex selectors

## Migration Steps (Template)

### Step 1: Identify Component Styles

```bash
# Search for all styles for this component in index.css
grep -n "\.component-name" invoice-react/src/index.css
```

### Step 2: Create Component CSS File

```bash
touch invoice-react/src/components/ComponentName.css
```

### Step 3: Extract Styles

Copy all matching `.component-name-*` selectors from index.css to ComponentName.css

### Step 4: Add Import

Edit `components/ComponentName.jsx`:

```jsx
import './ComponentName.css'; // ← Add this line at top
```

### Step 5: Remove from Global

Delete all component styles from `index.css`

### Step 6: Test

```bash
npm run dev
# Then:
# 1. Navigate to component
# 2. Verify it renders correctly
# 3. Test dark mode toggle
# 4. Test responsive (480px, 768px, 1180px)
# 5. Verify no console errors
```

### Step 7: Verify Removal

```bash
# Should return 0 matches
grep -n "\.component-name" invoice-react/src/index.css
```

### Step 8: Run Impeccable

```bash
npx impeccable audit ComponentName
```

## Common Issues & Solutions

### Issue: Style not applying

**Solution:**

1. Verify import added to JSX: `import './ComponentName.css';`
2. Check file exists: `ls invoice-react/src/components/ComponentName.css`
3. Check CSS file has no syntax errors: `npm run dev` console

### Issue: Dark mode not working in new CSS file

**Solution:**

1. Verify using CSS variables: `background: var(--color-bg);` ✅ not `background: #0b1022;` ❌
2. Check theme.css includes variable definitions for dark theme
3. Restart dev server: `npm run dev`

### Issue: Styles look different than before

**Solution:**

1. Compare selector in old vs. new CSS (class name typo?)
2. Check cascade — maybe a global style was overriding (good — scoped CSS avoids this)
3. Verify media queries present: `@media (min-width: 768px) {`

## Completion Criteria

Project is complete when:

- [ ] All 10+ components have dedicated .css files
- [ ] Each component imports its CSS file
- [ ] No component styles remain in global `index.css`
- [ ] `index.css` ≤ 500 lines (only resets + utilities + global)
- [ ] All components tested: light/dark, 3 breakpoints, keyboard nav
- [ ] Impeccable audit passes all components
- [ ] Lighthouse score ≥ 90 for Performance + Accessibility
- [ ] Zero console errors during normal usage

---

**Started:** May 2026  
**Target Completion:** June 2026  
**Owner:** Frontend Team  
**Design System:** Impeccable
