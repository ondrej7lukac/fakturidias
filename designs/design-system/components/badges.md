# Status Badges (Pills)

Source: `invoice-react/src/styles/tables.css`, `invoice-react/src/components/StatusBadge.tsx`

## Pill Base

```css
.pill {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid transparent;
}
```

## Status Variants

| Class | Background | Text | Border |
|-------|-----------|------|--------|
| `.pill.draft` | `rgba(255,255,255,0.08)` | `var(--text)` | `var(--border)` |
| `.pill.sent` | `rgba(138,164,255,0.15)` | `var(--accent-2)` | `rgba(138,164,255,0.3)` |
| `.pill.paid` | `var(--success-bg)` | `var(--success-border)` | `rgba(45,215,166,0.3)` |
| `.pill.overdue` | `rgba(255,91,122,0.15)` | `var(--danger)` | `rgba(255,91,122,0.3)` |

## Helper Function

Use `getStatusClass()` from `StatusBadge.tsx` to generate the correct class string:

```ts
import { getStatusClass } from '@/components/StatusBadge'

// Returns: "pill draft" | "pill sent" | "pill paid" | "pill overdue"
const cls = getStatusClass(invoice.status)
```

## Interactive Status Badge

`StatusBadge` renders as a `DropdownMenu` trigger so users can click the pill to change status:

```tsx
import { StatusBadge } from '@/components/StatusBadge'

<StatusBadge
  status={invoice.status}
  invoiceId={invoice.id}
  onStatusChange={(id, newStatus) => handleStatusChange(id, newStatus)}
  lang={lang}
/>
```

## Status Labels (i18n)

| Status | Czech | English |
|--------|-------|---------|
| draft | Rozepsaná | Draft |
| sent | Odeslaná | Sent |
| paid | Zaplacená | Paid |
| overdue | Po splatnosti | Overdue |
