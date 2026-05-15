# Invoice Maker (Faktroid)

## Register

**Product** — this is a business application UI, not a marketing property. Design serves the product's core mission.

## Product Purpose

Invoice Maker is a professional invoice management system designed for Czech SMBs, freelancers, and small companies. It enables users to:

- Create, manage, and send invoices with professional templates
- Lookup company details via Czech ARES business registry
- Generate SEPA payment QR codes for bank transfers
- Send invoices via Gmail integration
- Track invoice history and generate PDF exports
- Manage company settings, bank accounts, and tax information

## Primary Users

1. **Freelancers & Sole Proprietors** (40%)
   - Czech self-employed professionals
   - Work alone or with small team
   - Need fast, simple invoice creation
   - Send 5–20 invoices/month
   - Value speed and ease over features

2. **Small Business Owners** (35%)
   - SMBs (10–50 employees)
   - Manage invoice creation + sending
   - Track multiple projects/clients
   - Need professional appearance
   - Concerned with compliance (Czech tax law)

3. **Administrative Staff** (25%)
   - Company accounting/admin roles
   - Create invoices on behalf of company
   - Need consistent formatting + approval flow
   - Focused on efficiency and accuracy

## Brand Principles

**Professional yet approachable.** The app is serious business software, but should feel modern and not intimidating. No skeuomorphism, no unnecessary complexity.

**Czech-first, but international-ready.** Primary market is Czech Republic; UI defaults to Czech language and ARES integration. Should scale to other markets (multi-language ready, internationalized patterns).

**Clarity over decoration.** Every visual element should serve information hierarchy or interaction clarity. No decorative gradients, animations, or effects that don't serve UX.

**Efficiency through defaults.** Pre-fill company info, remember settings, auto-populate recurring fields. Reduce friction for repeat tasks.

## Tone

- **Professional**: Formal, trustworthy, reliable. Invoicing is legal business documentation.
- **Clear**: Explicit labels, no jargon abbreviations without explanation. Czech users may not know English acronyms.
- **Direct**: Confirm actions clearly, warn about destructive operations, explain why a field is required.
- **Modern**: Contemporary design language (2024 onwards), not dated or corporate.
- **Helpful**: Provide context and guidance where domain knowledge is assumed (e.g., explain ARES, QR codes, SEPA).

## Anti-References

❌ SaaS Dashboard Clichés

- Hero metrics with large numbers + gradients
- Identical card grids with icon + heading + text
- Rainbow color palettes
- Glass-morphism or blur effects

❌ Overly Playful

- Cute mascots or cartoon illustrations
- Emoji-heavy UI
- Gamification elements (badges, streaks)

❌ Legacy/Desktop Software

- Windows XP-style dialogs
- Heavy shadows and 3D effects
- Skeuomorphic ink/paper metaphors

❌ Minimalism to the Point of Obscurity

- Borderless inputs with no affordance
- Icon-only buttons without tooltips
- Reduced contrast for aesthetics
- Truncated labels to "save space"

## Strategic Principles

1. **Mobile-First Responsive Design**
   - Forms must work flawlessly on phones (invoices often created on job sites)
   - Desktop is the secondary canvas (office, organized entry)
   - Tablet as mid-point (iPad usage in accounting)

2. **Accessibility by Default**
   - WCAG 2.1 AA compliance minimum
   - Screen reader support for all form inputs
   - High contrast light/dark modes (not decorative, functional)
   - Keyboard navigation throughout

3. **Component-Scoped Styling**
   - Each React component owns its CSS file
   - No global cascade pollution
   - Predictable, maintainable stylesheet structure
   - Each component: `ComponentName.jsx` + `ComponentName.css`

4. **Theme Agnostic Architecture**
   - Light and dark modes as first-class citizens (not an afterthought)
   - CSS custom properties for all colors, spacing, typography
   - Theme switching without page reload
   - Respects system preference by default

5. **Offline-First Local Storage**
   - All user data persists locally via localStorage
   - Cloud sync via MongoDB is optional enhancement
   - Users control when / if to save to server
   - No "lost work" scenarios

6. **Localization Ready**
   - All UI strings in i18n system (Czech + English minimum)
   - No hardcoded text in components
   - Number/date/currency formatting via i18n
   - RTL-safe layout patterns (future internationalization)

## Visual Hierarchy

1. **Page Header** — Company/invoice context, navigation
2. **Primary Action** — Green accent button (usually "Create Invoice")
3. **Form Sections** — Clear grouping, consistent spacing
4. **Data Display** — Tables with clear row/column hierarchy
5. **Secondary Actions** — Muted buttons, tooltips on hover
6. **Metadata** — Timestamps, IDs, helper text (subtle gray)

## Component Catalog

### Containers

- **Header** — Top navigation, profile, theme toggle
- **Settings** — Company profile, bank account, integrations
- **Dashboard** — Invoice overview, quick stats
- **WelcomeScreen** — Login, pricing tiers, onboarding

### Forms & Inputs

- **InvoiceForm** — Multi-section invoice creation (company info, items, totals)
- **ItemsTable** — Invoice line items with add/edit/delete
- **AresSearch** — Company lookup by ID/name

### Display

- **InvoiceList** — Table of created invoices with filters
- **InvoicePreview** — Full invoice rendering (PDF-ready)
- **InvoiceDashboard** — Summary stats, recent invoices
- **QRPreview** — SEPA payment QR code display
- **StatusBadge** — Invoice status indicator

### Utilities

- **Settings** — User preferences, integrations, company info
- **Header** — Top bar with navigation, profile, theme

## Data Model (Key Entities)

```
Invoice
├── invoiceNumber: string
├── date: date
├── dueDate: date
├── supplier: { name, address, ico, dic, bankAccount }
├── customer: { name, address, ico, dic }
├── items: [ { description, quantity, unit, unitPrice, amount } ]
├── totalAmount: number
├── currencyCode: string (default: CZK)
├── paymentMethod: string
├── qrCode: string (SEPA payload)
└── status: "draft" | "sent" | "paid"

Company (Settings)
├── name: string
├── address: address
├── ico: string (Czech business ID)
├── dic: string (Czech tax ID)
├── bankAccount: { number, bankCode, iban, swift }
└── googleIntegration: { enabled, email }
```

## User Journeys

### Journey 1: First Invoice Creation (Onboarding)

1. User logs in via Google OAuth
2. Routed to WelcomeScreen (onboarding prompt)
3. Clicks "Create Invoice"
4. Settings form appears (pre-filled from Google profile)
5. User enters company info (ARES lookup available)
6. InvoiceForm opens with pre-filled supplier info
7. User adds items, sets customer, reviews
8. Generates PDF + sends via email or saves locally

### Journey 2: Repeat Invoice (Power User)

1. User logs in
2. Routed to Dashboard
3. Clicks "New from Template" on recent invoice
4. InvoiceForm opens with supplier/items pre-populated
5. User updates customer/amount/date
6. Generates PDF + sends

### Journey 3: Invoice Management

1. User views InvoiceList (searchable, filterable)
2. Clicks invoice to open InvoicePreview
3. Can re-send, download PDF, or mark as paid
4. Can edit draft invoices

## Success Metrics

- First invoice creation < 5 minutes
- Invoice list loads < 1 second
- Settings form no validation errors on submit
- 95%+ of users reach "invoices" view on first login
- Zero data loss (localStorage persistence)
- Mobile portrait mode: readable text, tappable buttons (≥48px)
- Dark mode adoption ≥ 40% of DAU
