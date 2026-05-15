# Fakturidias — Invoice App

Czech/Slovak invoice generator. React 18 + Vite 6 + TypeScript, Tailwind v4, shadcn/ui.

## Stack

| Layer | Tech |
|-------|------|
| Framework | React 18 + Vite 6 |
| Language | TypeScript (.tsx) — strict mode |
| Styling | Tailwind v4 (`@tailwindcss/vite`) + scoped component CSS |
| UI Components | shadcn/ui (Radix primitives) — `@/components/ui/...` |
| Icons | Lucide React via `@/lib/icons` (never import lucide-react directly) |
| Path alias | `@/` → `src/` |
| CSS tokens | `src/styles/utilities.css` — all `--var` tokens live here |

## CSS Architecture (SOLID)

```
src/
  index.css                 ← 5-line @import facade (do not add styles here)
  globals.css               ← Tailwind + shadcn tokens (do not edit)
  styles/
    utilities.css           ← :root tokens + body + card/panel + animations
    layout.css              ← main grid, .grid.two/three, responsive breakpoints
    forms.css               ← label, input, select, textarea base styles
    buttons.css             ← Open/Closed button system via CSS custom props
    tables.css              ← table, th/td, .pill status badges
  components/
    Header.css              ← header, brand, nav, lang-toggle, view-switch
    AresSearch.css          ← ARES/RPO search + settings-v3-* layout classes
    InvoiceDashboard.css    ← dashboard, expanded-row, charts
    InvoiceForm.css         ← form-item-grid, payment-grid-mobile
    InvoiceList.css         ← invoice-item, invoice-meta, list
    InvoicePreview.css      ← A4 preview, print styles
    WelcomeScreen.css       ← pricing grid, welcome layout
```

**Rules:**
- All CSS variables via `var(--token)` — no raw hex/rgba in component CSS
- New component → create `ComponentName.css`, import it at top of `.tsx`
- Button variants: override `--btn-*` custom props, never modify `button, .btn` base
- No styles in `index.css` or `globals.css`

## Icon System

```ts
// Always import from @/lib/icons — never from lucide-react directly
import { Pencil, Eye, ICON_MD, STROKE } from '@/lib/icons'

// Use the size constants
<Pencil size={ICON_MD} strokeWidth={STROKE} />
// ICON_SM=14  ICON_MD=16  ICON_LG=18  STROKE=2
```

## Language

- Two languages: `cs` (Czech) and `en` (English)  
- `lang` prop flows from `App.tsx` → all components
- Translations via `t: Record<string, string>` (from `src/utils/i18n.ts`)
- Language toggle in header: `.lang-toggle` / `.lang-toggle__btn--active` (no dropdown)
- SK (Slovak) was removed from the toggle — do not re-add without asking

## Key Components

| File | Role |
|------|------|
| `App.tsx` | Root state — invoices, lang, user, currentView, dashboardOpen |
| `Header.tsx` | Fixed nav bar, lang toggle, user menu (DropdownMenu), mobile Sheet |
| `InvoiceForm.tsx` | Full invoice editor + preview mode |
| `InvoiceDashboard.tsx` | Overlay dashboard with filters, table, expanded row detail |
| `InvoiceList.tsx` | Sidebar list with search/filter |
| `InvoicePreview.tsx` | A4 print-ready preview |
| `Settings.tsx` | Tabs (Basic Info / Taxes & Bank / Integrations) |
| `AresSearch.tsx` | ARES/RPO company lookup (CZ + SK) |
| `StatusBadge.tsx` | Clickable pill dropdown for draft/sent/paid/overdue |

## Auth

- Google OAuth via `/auth/google/url` (server-side)
- Login opens a 500×600 popup — see `handleLogin()` in `Header.tsx`
- `user: { email: string } | null` passed from `App.tsx`
- `onLogin` / `onLogout` callbacks flow from `App.tsx`

## Patterns

- **No emojis** — all icons are Lucide SVG via `@/lib/icons`
- **No flag emojis** — country options use text codes like `Czech Republic (CZ)`
- shadcn `DropdownMenu` for user menu (never manual ref+mousedown)
- shadcn `Sheet` for mobile slide-in menu
- shadcn `Tabs` for Settings (horizontal, all screens)
- `money()` from `src/utils/storage` for all currency formatting
- `debounce()` from `src/utils/storage` for search inputs

## Design Tokens (Light / Dark)

```
--bg / --bg2          page background
--card / --card2      surface background  
--text / --muted      text hierarchy
--border              1px borders
--accent              #2dd7a6 / #7cf7d4 (teal)
--accent-2            #5869ff / #8aa4ff (indigo)
--danger              #e33d63 / #ff5b7a
--headerH             76px  (fixed header height)
--radius / --radius2  18px / 22px
```

## Build & Dev

```bash
npm run dev    # Vite dev server
npm run build  # TypeScript + CSS build (must pass cleanly)
```

Build must always produce zero TypeScript errors.
