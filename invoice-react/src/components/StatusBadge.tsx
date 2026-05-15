import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Check } from '@/lib/icons'

const STATUSES = ['draft', 'sent', 'paid', 'overdue'] as const
type Status = typeof STATUSES[number]

const STATUS_LABELS: Record<string, Record<Status, string>> = {
  cs: { draft: 'Rozepsaná', sent: 'Odeslaná', paid: 'Zaplacená', overdue: 'Po splatnosti' },
  en: { draft: 'Draft', sent: 'Sent', paid: 'Paid', overdue: 'Overdue' },
  sk: { draft: 'Rozpísaná', sent: 'Odoslaná', paid: 'Zaplatená', overdue: 'Po splatnosti' },
}

export function getStatusClass(status: string) {
  return `pill ${status || 'draft'}`
}

interface StatusBadgeProps {
  status: string
  invoiceId: string
  onStatusChange?: (id: string, status: string) => void
  lang?: string
}

export default function StatusBadge({ status, invoiceId, onStatusChange, lang = 'cs' }: StatusBadgeProps) {
  const current = (status || 'draft') as Status
  const labels = STATUS_LABELS[lang] || STATUS_LABELS.cs

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={getStatusClass(current)}
        onClick={e => e.stopPropagation()}
        style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px', paddingRight: '0.5rem' }}
      >
        {labels[current]}
        <span style={{ opacity: 0.6, fontSize: '0.6rem' }}>▼</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="min-w-[150px] p-1.5 rounded-xl"
        style={{ background: 'rgba(15,18,35,0.92)', backdropFilter: 'blur(14px)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {STATUSES.map(s => (
          <DropdownMenuItem
            key={s}
            onClick={e => {
              e.stopPropagation()
              if (s !== current && onStatusChange) onStatusChange(invoiceId, s)
            }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer"
            style={{ background: s === current ? 'rgba(255,255,255,0.08)' : 'transparent', color: 'var(--text)' }}
          >
            <span className={`pill ${s}`} style={{ fontSize: '0.65rem', pointerEvents: 'none', flexShrink: 0 }}>
              {labels[s]}
            </span>
            {s === current && <Check size={12} strokeWidth={3} className="ml-auto" style={{ color: 'var(--accent)' }} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
