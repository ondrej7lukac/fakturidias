# Icons

Source: `invoice-react/src/lib/icons.ts`

## Import Rule

Always import from `@/lib/icons`. Never import from `lucide-react` directly.

```ts
// Correct
import { Pencil, Eye, ICON_MD, STROKE } from '@/lib/icons'

// Wrong — do not do this
import { Pencil } from 'lucide-react'
```

This ensures icon size constants are co-located and future icon swaps only require one file change.

## Size Constants

| Constant | Value | Usage |
|----------|-------|-------|
| `ICON_SM` | 14px | Compact UI, inline text |
| `ICON_MD` | 16px | Default — nav, buttons, form fields |
| `ICON_LG` | 18px | Prominent actions, headers |
| `STROKE` | 2 | `strokeWidth` for all icons |

```tsx
<Pencil size={ICON_MD} strokeWidth={STROKE} />
```

## Available Icons

| Icon | Usage |
|------|-------|
| `Settings2` | Settings navigation |
| `Contact` | Customer / contact |
| `Wallet` | Payment / bank |
| `Plug` | Integrations tab |
| `Save` | Save action |
| `BarChart2` | Dashboard toggle |
| `FileText` | Invoice / document |
| `Check` | Confirmation, selection |
| `CheckCircle2` | Success state |
| `X` | Close / dismiss |
| `Menu` | Mobile hamburger |
| `Pencil` | Edit action |
| `Eye` | Preview / view |
| `AlertTriangle` | Warning / error |
| `Cloud` | Drive / cloud backup |
| `Mail` | Email action |
| `RefreshCw` | Refresh / sync |
| `ArrowLeftRight` | Exchange rate / swap |
| `Sparkles` | AI feature |
| `Mic` | Voice input (active) |
| `MicOff` | Voice input (inactive) |

## Adding a New Icon

1. Add the named export to `invoice-react/src/lib/icons.ts`
2. Import from `@/lib/icons` in the component

No other files need changes.

## No Emoji Icons

All icons in the UI are Lucide SVG. Do not use emoji characters as icons anywhere in the codebase.
