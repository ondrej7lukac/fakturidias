# Fakturidias — Designs

5 high-fidelity, responsive HTML designs for your billing app. Dark default, light toggle, CS/EN toggle, fully responsive.

## Pages

| File | What it is |
|---|---|
| **Landing.html** | Marketing homepage — hero with animated AI voice demo, features, product showcase (tabbed invoice/dashboard preview), how-it-works, 3-tier pricing, FAQ, final CTA, footer |
| **Create Invoice.html** | Form page — AI dictation card up top, supplier, client (with ARES auto-fill), line items, totals, payment, action bar |
| **Dashboard.html** | List + overview — 4 KPI metrics, search + filter row, revenue line chart + status donut, recent invoices list |
| **Settings.html** | 3 tabs — Identity, Tax & Bank, Integrations (ARES, Google Drive, Email, API with toggles) |
| **Fakturidias Design System.html** | Visual design system reference — tokens, components, patterns, all side-by-side light + dark |

Open any of them in a browser. They load React + Babel from a CDN, no build step.

## Files

```
fakturidias/
├── README.md                            ← this file
├── Landing.html                         ← marketing page
├── Create Invoice.html                  ← form page
├── Dashboard.html                       ← list + overview
├── Settings.html                        ← tabbed settings
├── Fakturidias Design System.html       ← system reference
│
├── tokens.css                           ← all CSS custom properties (light + dark scopes)
├── landing.css                          ← landing-specific styles
├── app.css                              ← shared app chrome + form patterns + responsive grids
├── ds-styles.css                        ← design system reference page styles
│
├── i18n.js · landing-i18n.js · app-i18n.js   ← Czech + English strings
│
├── icons.jsx                            ← Lucide-style inline SVG icon set
├── app-chrome.jsx                       ← shared AppHeader + useAppShell hook
├── landing.jsx                          ← landing page
├── create-invoice.jsx                   ← create invoice page
├── dashboard.jsx                        ← dashboard page
├── settings.jsx                         ← settings page
├── ds-app.jsx                           ← design system reference shell
├── ds-sections-a/b/c.jsx                ← design system sections
│
└── design-system/                       ← your source-of-truth spec
    ├── README.md
    ├── tokens/ · components/ · patterns/
```

## How to use with Claude Code

```bash
# in your vscode terminal, point Claude Code at this folder
cd ~/Downloads/fakturidias
claude "use Landing.html as the marketing site template and Create Invoice.html / Dashboard.html / Settings.html as the in-app screens. Match the existing invoice-react codebase using the tokens in design-system/tokens/."
```

## Responsive

Everything works mobile and desktop:

- **Header** collapses brand text on small screens; uses your existing SEZNAM/FAKTURA segment toggle pattern for primary navigation
- **Create Invoice** — desktop is a 1.6fr / 1fr split (form left, supplier+summary right); mobile is a single column with sticky action bar
- **Dashboard** — 4-column metrics → 2-column on tablet → 1-column on phone; invoice list row collapses to a card layout below 820px
- **Settings tabs** — horizontal scroll on small screens, full-width buttons on phone
- **Line items table** — desktop is a 7-column grid; mobile reshapes to 2 rows (description on top, qty/unit/price/vat/total below)

## Languages

CS/EN toggle in every page's header. Czech is the default (Prague launch).

## Themes

Light/dark toggle in every page's header. Dark default. Tokens scope to `.theme-light` / `.theme-dark` on `<html>`.

## Tokens

CSS variables live in `tokens.css`. The TypeScript mirrors in `design-system/tokens/` are for JS-side needs (charts, PDF generation). When you add a token, edit both — same rule as your existing `utilities.css`.
