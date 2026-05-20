import './InvoiceDashboard.css'
import { useState, useMemo, Fragment } from 'react'
import { money } from '../utils/storage'
import StatusBadge from './StatusBadge'
import InvoiceForm from './InvoiceForm'
import {
  BarChart2, X, AlertTriangle, Check, Pencil, Mail, FileText,
  Search, Calendar, ChevronRight, Plus, ArrowUp, ArrowDown, ArrowLeftRight,
  ICON_SM, ICON_MD, STROKE,
} from '@/lib/icons'

interface InvoiceItem {
  name: string
  qty: number
  price: number
  total: number
}

interface Invoice {
  id: string
  invoiceNumber?: string
  status?: string
  amount?: number
  currency?: string
  issueDate?: string
  dueDate?: string
  taxableSupplyDate?: string
  category?: string
  isVatPayer?: boolean
  taxRate?: number
  taxAmount?: number
  client?: {
    name?: string
    area?: string
    ico?: string
    vat?: string
    email?: string
    phone?: string
    address?: string
  }
  supplier?: { name?: string }
  items?: InvoiceItem[]
  note?: string
}

// ─── Revenue Line/Area Chart ──────────────────────────────────────────────────
function DashRevenueChart({ invoices, lang }: { invoices: Invoice[]; lang: string }) {
  const now = new Date()
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    return {
      label: d.toLocaleDateString(lang === 'cs' ? 'cs-CZ' : 'en-US', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth(),
    }
  })

  const data = months.map(m => ({
    ...m,
    total: invoices
      .filter(inv => {
        const d = inv.issueDate ? new Date(inv.issueDate) : null
        return d && d.getFullYear() === m.year && d.getMonth() === m.month
      })
      .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0),
  }))

  const W = 720, H = 220, PAD_L = 52, PAD_R = 16, PAD_T = 16, PAD_B = 40
  const rawMax = Math.max(...data.map(d => d.total), 1)
  const max = rawMax * 1.15
  const xStep = (W - PAD_L - PAD_R) / (data.length - 1)
  const pts = data.map((d, i) => [
    PAD_L + i * xStep,
    PAD_T + (H - PAD_T - PAD_B) * (1 - d.total / max),
  ])
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ')
  const area = `${path} L${pts[pts.length - 1][0]},${H - PAD_B} L${pts[0][0]},${H - PAD_B} Z`
  const yTicks = [0, rawMax / 2, rawMax]

  return (
    <svg className="ap-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="dash-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="dash-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      {yTicks.map((tk, i) => {
        const y = PAD_T + (H - PAD_T - PAD_B) * (1 - tk / max)
        return (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="var(--border)" strokeDasharray="3 4" />
            <text x={PAD_L - 6} y={y + 3.5} fontSize="10" textAnchor="end" fill="var(--muted)">
              {tk >= 1000 ? `${(tk / 1000).toFixed(0)}k` : Math.round(tk)}
            </text>
          </g>
        )
      })}
      <path d={area} fill="url(#dash-area)" />
      <path d={path} fill="none" stroke="url(#dash-line)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--bg)" stroke="var(--accent)" strokeWidth="1.8" />
      ))}
      {data.map((d, i) => (
        <text key={i} x={PAD_L + i * xStep} y={H - 12} fontSize="10" textAnchor="middle" fill="var(--muted)">
          {d.label.length > 4 ? d.label.slice(0, 3) : d.label}
        </text>
      ))}
    </svg>
  )
}

// ─── Wedge Donut Chart ────────────────────────────────────────────────────────
function DashDonut({ invoices, lang }: { invoices: Invoice[]; lang: string }) {
  const statusLabels: Record<string, Record<string, string>> = {
    cs: { paid: 'Zaplacená', sent: 'Odeslaná', draft: 'Rozepsaná', overdue: 'Po splatnosti' },
    en: { paid: 'Paid', sent: 'Sent', draft: 'Draft', overdue: 'Overdue' },
  }
  const SL = statusLabels[lang] || statusLabels.en
  const STATUS_COLORS: Record<string, string> = {
    paid: 'var(--accent)',
    sent: 'var(--accent-2)',
    draft: 'var(--muted)',
    overdue: 'var(--danger)',
  }

  const data = ['paid', 'sent', 'draft', 'overdue']
    .map(s => ({
      label: SL[s],
      value: invoices.filter(inv => (inv.status || 'draft') === s).length,
      color: STATUS_COLORS[s],
    }))
    .filter(d => d.value > 0)

  const total = data.reduce((a, b) => a + b.value, 0)
  if (total === 0) return (
    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
      {lang === 'cs' ? 'Žádná data' : 'No data'}
    </div>
  )

  const R = 70, CX = 90, CY = 90
  let cum = 0
  const arcs = data.map(d => {
    const start = (cum / total) * Math.PI * 2 - Math.PI / 2
    cum += d.value
    const end = (cum / total) * Math.PI * 2 - Math.PI / 2
    const large = end - start > Math.PI ? 1 : 0
    const x1 = CX + R * Math.cos(start), y1 = CY + R * Math.sin(start)
    const x2 = CX + R * Math.cos(end), y2 = CY + R * Math.sin(end)
    return { ...d, path: `M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} Z` }
  })

  return (
    <>
      <svg className="ap-donut" viewBox="0 0 180 180">
        {arcs.map((a, i) => <path key={i} d={a.path} fill={a.color} opacity={0.92} />)}
        <circle cx={CX} cy={CY} r={42} fill="var(--bg)" />
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize="11" fill="var(--muted)" letterSpacing="0.04em">TOTAL</text>
        <text x={CX} y={CY + 16} textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--text)">{total}</text>
      </svg>
      <div className="ap-legend">
        {arcs.map((a, i) => (
          <div key={i} className="ap-legend__row">
            <span className="left">
              <span className="ap-legend__dot" style={{ background: a.color }} />
              {a.label}
            </span>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{a.value}</span>
          </div>
        ))}
      </div>
    </>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
interface InvoiceDashboardProps {
  invoices: Invoice[]
  categories: string[]
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onSendReminder?: (id: string) => void
  onStatusChange: (id: string, status: string) => void
  onClose: () => void
  onNewInvoice?: () => void
  lang: string
  t: Record<string, string>
  isAuthenticated: boolean
  onSave: (invoice: unknown) => Promise<void> | void
  onAddCategory: (cat: string) => void
  invoiceCounter: number
  invoicesLoaded: boolean
  draftNumber: string
  setDraftNumber: (n: string) => void
  defaultSupplier: unknown
  setDefaultSupplier: (fn: (prev: unknown) => unknown) => void
}

export default function InvoiceDashboard({
  invoices,
  categories,
  onDelete,
  onStatusChange,
  onClose,
  onNewInvoice,
  lang,
  t,
  isAuthenticated,
  onSave,
  onAddCategory,
  invoiceCounter,
  invoicesLoaded,
  draftNumber,
  setDraftNumber,
  defaultSupplier,
  setDefaultSupplier,
}: InvoiceDashboardProps) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [sortKey, setSortKey] = useState('issueDate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [inlineEditId, setInlineEditId] = useState<string | null>(null)

  const isCz = lang === 'cs'

  const L = {
    title: isCz ? 'Přehled faktur' : 'Invoice Dashboard',
    sub: isCz ? 'Spravujte a sledujte všechny faktury' : 'Manage and track all your invoices',
    back: isCz ? 'Zpět' : 'Back',
    newInvoice: isCz ? 'Nová faktura' : 'New invoice',
    search: isCz ? 'Hledat (číslo, klient, oblast…)' : 'Search (number, client, area…)',
    allStatuses: isCz ? 'Všechny stavy' : 'All statuses',
    allCategories: isCz ? 'Všechny kategorie' : 'All categories',
    from: isCz ? 'Od' : 'From',
    to: isCz ? 'Do' : 'To',
    colNum: '#',
    colClient: isCz ? 'Klient' : 'Client',
    colIssued: isCz ? 'Vystaveno' : 'Issued',
    colDue: isCz ? 'Splatnost' : 'Due',
    colAmount: isCz ? 'Částka' : 'Amount',
    colStatus: isCz ? 'Stav' : 'Status',
    revenue: isCz ? 'Příjmy (12 měsíců)' : 'Revenue (12 months)',
    statusOverview: isCz ? 'Přehled stavů' : 'Status overview',
    recent: isCz ? 'Faktury' : 'Invoices',
    metricRevenue: isCz ? 'Příjmy (tento měsíc)' : 'Revenue (this month)',
    metricInvoices: isCz ? 'Faktury celkem' : 'Total invoices',
    metricOverdue: isCz ? 'Po splatnosti' : 'Overdue',
    metricAvg: isCz ? 'Průměrná hodnota' : 'Avg. invoice value',
    dashFiltered: isCz ? 'faktur' : 'invoices',
    noResults: isCz ? 'Žádné faktury neodpovídají filtru.' : 'No invoices match the filter.',
    createFirst: isCz ? 'Vytvořit první fakturu' : 'Create first invoice',
    confirmDelete: isCz ? 'Smazat fakturu?' : 'Delete invoice?',
    edit: isCz ? 'Editovat' : 'Edit',
    cancelEdit: isCz ? 'Zrušit úpravy' : 'Cancel edit',
  }

  const SL: Record<string, string> = isCz
    ? { draft: 'Rozepsaná', sent: 'Odeslaná', paid: 'Zaplacená', overdue: 'Po splatnosti' }
    : { draft: 'Draft', sent: 'Sent', paid: 'Paid', overdue: 'Overdue' }

  // ── Metrics (computed from all invoices) ─────────────────────────────────────
  const metrics = useMemo(() => {
    const now = new Date()
    const thisMonth = invoices.filter(inv => {
      const d = inv.issueDate ? new Date(inv.issueDate) : null
      return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonth = invoices.filter(inv => {
      const d = inv.issueDate ? new Date(inv.issueDate) : null
      return d && d.getFullYear() === prevDate.getFullYear() && d.getMonth() === prevDate.getMonth()
    })
    const revenue = thisMonth.reduce((s, inv) => s + (Number(inv.amount) || 0), 0)
    const prevRevenue = lastMonth.reduce((s, inv) => s + (Number(inv.amount) || 0), 0)
    const revDeltaPct = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue * 100) : null
    const overdueCount = invoices.filter(inv => {
      if (inv.status === 'paid') return false
      return inv.dueDate ? new Date(inv.dueDate) < now : false
    }).length
    const totalAmt = invoices.reduce((s, inv) => s + (Number(inv.amount) || 0), 0)
    const avg = invoices.length > 0 ? totalAmt / invoices.length : 0
    return {
      revenue,
      revDeltaPct,
      totalCount: invoices.length,
      thisMonthCount: thisMonth.length,
      prevMonthCount: lastMonth.length,
      overdueCount,
      avg,
    }
  }, [invoices])

  // ── Filtering ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return invoices.filter(inv => {
      const itemNames = (inv.items || []).map(it => it.name).join(' ').toLowerCase()
      const matchQ = !q ||
        (inv.invoiceNumber || '').toLowerCase().includes(q) ||
        (inv.client?.name || '').toLowerCase().includes(q) ||
        (inv.client?.area || '').toLowerCase().includes(q) ||
        (inv.client?.ico || '').toLowerCase().includes(q) ||
        (inv.supplier?.name || '').toLowerCase().includes(q) ||
        (inv.category || '').toLowerCase().includes(q) ||
        itemNames.includes(q)
      const matchStatus = filterStatus === 'all' || (inv.status || 'draft') === filterStatus
      const matchCat = filterCategory === 'all' || (inv.category || '') === filterCategory
      const issueDate = inv.issueDate ? new Date(inv.issueDate) : null
      const matchFrom = !filterDateFrom || (issueDate && issueDate >= new Date(filterDateFrom))
      const matchTo = !filterDateTo || (issueDate && issueDate <= new Date(filterDateTo))
      return matchQ && matchStatus && matchCat && matchFrom && matchTo
    })
  }, [invoices, search, filterStatus, filterCategory, filterDateFrom, filterDateTo])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: string | number = '', vb: string | number = ''
      switch (sortKey) {
        case 'invoiceNumber': va = a.invoiceNumber || ''; vb = b.invoiceNumber || ''; break
        case 'client': va = a.client?.name || ''; vb = b.client?.name || ''; break
        case 'issueDate': va = a.issueDate || ''; vb = b.issueDate || ''; break
        case 'dueDate': va = a.dueDate || ''; vb = b.dueDate || ''; break
        case 'amount': va = Number(a.amount) || 0; vb = Number(b.amount) || 0; break
        case 'status': va = a.status || ''; vb = b.status || ''; break
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortKey, sortDir])

  const totalValue = filtered.reduce((s, inv) => s + (Number(inv.amount) || 0), 0)
  const currency = filtered[0]?.currency || 'CZK'

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ k }: { k: string }) => {
    if (sortKey !== k) return <span style={{ opacity: 0.3, marginLeft: 3, fontSize: 10 }}>↕</span>
    return <span style={{ marginLeft: 3, fontSize: 10, color: 'var(--accent)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const isOverdue = (inv: Invoice) => {
    if (inv.status === 'paid') return false
    return inv.dueDate ? new Date(inv.dueDate) < new Date() : false
  }

  return (
    <div className="ap-page">
      {/* Page header */}
      <div className="ap-page__head">
        <div>
          <h1 className="ap-page__title">{L.title}</h1>
          <p className="ap-page__sub">{L.sub}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="ap-btn ap-btn--secondary" onClick={onClose}>
            <X size={ICON_SM} strokeWidth={STROKE} /> {L.back}
          </button>
          {onNewInvoice && (
            <button className="ap-btn ap-btn--primary ap-btn--lg" onClick={() => { onClose(); onNewInvoice() }}>
              <Plus size={ICON_SM} strokeWidth={STROKE} /> {L.newInvoice}
            </button>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="ap-metrics">
        <div className="ap-metric">
          <div className="ap-metric__label">{L.metricRevenue}</div>
          <div className="ap-metric__value">
            {metrics.revenue >= 1000
              ? `${(metrics.revenue / 1000).toFixed(0)}k`
              : Math.round(metrics.revenue)}
            <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>CZK</span>
          </div>
          {metrics.revDeltaPct !== null ? (
            <div className={`ap-metric__delta ${metrics.revDeltaPct >= 0 ? 'ap-metric__delta--up' : 'ap-metric__delta--down'}`}>
              {metrics.revDeltaPct >= 0
                ? <ArrowUp size={11} strokeWidth={STROKE} />
                : <ArrowDown size={11} strokeWidth={STROKE} />}
              {metrics.revDeltaPct >= 0 ? '+' : ''}{metrics.revDeltaPct.toFixed(1)} %
            </div>
          ) : (
            <div className="ap-metric__delta" style={{ color: 'var(--muted)' }}>
              <ArrowLeftRight size={11} strokeWidth={STROKE} /> {isCz ? 'tento měsíc' : 'this month'}
            </div>
          )}
        </div>
        <div className="ap-metric">
          <div className="ap-metric__label">{L.metricInvoices}</div>
          <div className="ap-metric__value">{metrics.totalCount}</div>
          <div className="ap-metric__delta ap-metric__delta--up">
            <ArrowUp size={11} strokeWidth={STROKE} /> +{metrics.thisMonthCount} {isCz ? 'tento měsíc' : 'this month'}
          </div>
        </div>
        <div className={`ap-metric${metrics.overdueCount > 0 ? ' ap-metric--danger' : ''}`}>
          <div className="ap-metric__label">{L.metricOverdue}</div>
          <div className="ap-metric__value">{metrics.overdueCount}</div>
          {metrics.overdueCount > 0 ? (
            <div className="ap-metric__delta ap-metric__delta--down">
              <ArrowDown size={11} strokeWidth={STROKE} /> {isCz ? 'vyžaduje akci' : 'requires action'}
            </div>
          ) : (
            <div className="ap-metric__delta ap-metric__delta--up">
              <ArrowUp size={11} strokeWidth={STROKE} /> {isCz ? 'vše v pořádku' : 'all clear'}
            </div>
          )}
        </div>
        <div className="ap-metric">
          <div className="ap-metric__label">{L.metricAvg}</div>
          <div className="ap-metric__value">
            {metrics.avg >= 1000
              ? `${(metrics.avg / 1000).toFixed(1)}k`
              : Math.round(metrics.avg)}
          </div>
          <div className="ap-metric__delta" style={{ color: 'var(--muted)' }}>
            <ArrowLeftRight size={11} strokeWidth={STROKE} /> CZK
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="ap-filters">
        <div className="ap-input-wrap">
          <Search size={ICON_SM} strokeWidth={STROKE} />
          <input
            className="ap-input"
            placeholder={L.search}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="ap-select"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="all">{L.allStatuses}</option>
          <option value="draft">{SL.draft}</option>
          <option value="sent">{SL.sent}</option>
          <option value="paid">{SL.paid}</option>
          <option value="overdue">{SL.overdue}</option>
        </select>
        <select
          className="ap-select"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="all">{L.allCategories}</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="ap-input-wrap">
          <Calendar size={ICON_SM} strokeWidth={STROKE} />
          <input
            className="ap-input"
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            placeholder={L.from}
          />
        </div>
        <div className="ap-input-wrap">
          <Calendar size={ICON_SM} strokeWidth={STROKE} />
          <input
            className="ap-input"
            type="date"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            placeholder={L.to}
          />
        </div>
      </div>

      {/* Filter summary line */}
      <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--muted)' }}>
        {filtered.length} {L.dashFiltered}
        {' · '}
        <strong style={{ color: 'var(--text)' }}>
          {totalValue.toLocaleString(isCz ? 'cs-CZ' : 'en-US', { minimumFractionDigits: 2 })} {currency}
        </strong>
      </div>

      {/* Charts */}
      <div className="ap-split">
        <div className="ap-card">
          <h3 className="ap-card__title">
            <BarChart2 size={ICON_MD} strokeWidth={STROKE} /> {L.revenue}
          </h3>
          <DashRevenueChart invoices={invoices} lang={lang} />
        </div>
        <div className="ap-card">
          <h3 className="ap-card__title">
            <FileText size={ICON_MD} strokeWidth={STROKE} /> {L.statusOverview}
          </h3>
          <DashDonut invoices={invoices} lang={lang} />
        </div>
      </div>

      {/* Invoice list */}
      <div className="ap-card">
        <h3 className="ap-card__title">
          {L.recent}
          <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>· {filtered.length}</span>
        </h3>

        {sorted.length === 0 ? (
          <div className="ap-empty">
            <div className="ap-empty__icon">
              <FileText size={26} strokeWidth={1.6} />
            </div>
            <p style={{ marginBottom: 16 }}>{L.noResults}</p>
            {onNewInvoice && (
              <button className="ap-btn ap-btn--primary" onClick={() => { onClose(); onNewInvoice() }}>
                <Plus size={ICON_SM} strokeWidth={STROKE} /> {L.createFirst}
              </button>
            )}
          </div>
        ) : (
          <div className="ap-list">
            {/* Header row */}
            <div className="ap-list__row">
              <span style={{ cursor: 'pointer' }} onClick={() => handleSort('invoiceNumber')}>
                {L.colNum}<SortIcon k="invoiceNumber" />
              </span>
              <span style={{ cursor: 'pointer' }} onClick={() => handleSort('client')}>
                {L.colClient}<SortIcon k="client" />
              </span>
              <span style={{ cursor: 'pointer' }} onClick={() => handleSort('issueDate')}>
                {L.colIssued}<SortIcon k="issueDate" />
              </span>
              <span style={{ cursor: 'pointer' }} onClick={() => handleSort('dueDate')}>
                {L.colDue}<SortIcon k="dueDate" />
              </span>
              <span style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('amount')}>
                {L.colAmount}<SortIcon k="amount" />
              </span>
              <span style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>
                {L.colStatus}<SortIcon k="status" />
              </span>
              <span />
            </div>

            {/* Data rows */}
            {sorted.map(inv => {
              const overdue = isOverdue(inv)
              const isExpanded = expandedId === inv.id
              return (
                <Fragment key={inv.id}>
                  <div
                    className={`ap-list__row${overdue && inv.status !== 'paid' ? ' list-row--overdue' : ''}`}
                    onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="ap-list__num">{inv.invoiceNumber || '—'}</span>
                    <span>
                      <span style={{ fontWeight: 500 }}>{inv.client?.name || '—'}</span>
                      {inv.client?.area && (
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{inv.client.area}</span>
                      )}
                    </span>
                    <span style={{ color: 'var(--muted)' }}>{inv.issueDate || '—'}</span>
                    <span style={{ color: overdue && inv.status !== 'paid' ? 'var(--danger)' : 'var(--muted)' }}>
                      {inv.dueDate || '—'}
                      {overdue && inv.status !== 'paid' && (
                        <AlertTriangle size={11} strokeWidth={2} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
                      )}
                    </span>
                    <span className="ap-list__amount">
                      {money(inv.amount || 0)} {inv.currency || 'CZK'}
                    </span>
                    <span onClick={e => e.stopPropagation()}>
                      <StatusBadge
                        status={inv.status || 'draft'}
                        invoiceId={inv.id}
                        onStatusChange={onStatusChange}
                        lang={lang}
                      />
                    </span>
                    <button
                      className="ap-btn ap-btn--icon ap-btn--ghost"
                      aria-label="Open"
                      style={{ width: 32, height: 32 }}
                      onClick={e => { e.stopPropagation(); setExpandedId(isExpanded ? null : inv.id) }}
                    >
                      <ChevronRight
                        size={ICON_SM}
                        strokeWidth={STROKE}
                        style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
                      />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="expanded-row">
                      <div className="expanded-row-header">
                        <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>{inv.invoiceNumber}</span>
                        <StatusBadge
                          status={inv.status || 'draft'}
                          invoiceId={inv.id}
                          onStatusChange={onStatusChange}
                          lang={lang}
                        />
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button
                            className="ap-btn ap-btn--secondary"
                            style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                            onClick={() => {
                              if (window.confirm(L.confirmDelete)) onDelete(inv.id)
                            }}
                          >
                            <X size={12} strokeWidth={2} />
                            {isCz ? 'Smazat' : 'Delete'}
                          </button>
                          {inlineEditId === inv.id ? (
                            <button
                              className="ap-btn ap-btn--secondary"
                              style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                              onClick={() => setInlineEditId(null)}
                            >
                              <X size={12} strokeWidth={2} /> {L.cancelEdit}
                            </button>
                          ) : (
                            <button
                              className="ap-btn ap-btn--primary"
                              style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                              onClick={() => setInlineEditId(inv.id)}
                            >
                              <Pencil size={12} strokeWidth={2} /> {L.edit}
                            </button>
                          )}
                        </div>
                      </div>

                      {inlineEditId === inv.id ? (
                        <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                          <InvoiceForm
                            invoice={inv}
                            categories={categories}
                            onSave={async (updatedInv) => {
                              await onSave(updatedInv)
                              setInlineEditId(null)
                            }}
                            onAddCategory={onAddCategory}
                            invoiceCounter={invoiceCounter}
                            invoicesLoaded={invoicesLoaded}
                            draftNumber={draftNumber}
                            setDraftNumber={setDraftNumber}
                            lang={lang}
                            t={t}
                            defaultSupplier={defaultSupplier}
                            setDefaultSupplier={setDefaultSupplier}
                            isAuthenticated={isAuthenticated}
                          />
                        </div>
                      ) : (
                        <div className="expanded-row-grid">
                          <div className="expanded-section">
                            <div className="expanded-section-title">{isCz ? 'Odběratel' : 'Client'}</div>
                            <div><strong>{inv.client?.name || '—'}</strong></div>
                            {inv.client?.address && <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{inv.client.address}</div>}
                            {inv.client?.ico && <div style={{ fontSize: '0.8rem' }}>IČO: {inv.client.ico}</div>}
                            {inv.client?.vat && <div style={{ fontSize: '0.8rem' }}>DIČ: {inv.client.vat}</div>}
                            {inv.client?.email && (
                              <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Mail size={12} strokeWidth={2} />{inv.client.email}
                              </div>
                            )}
                            {inv.client?.phone && <div style={{ fontSize: '0.8rem' }}>{inv.client.phone}</div>}
                          </div>
                          <div className="expanded-section">
                            <div className="expanded-section-title">{isCz ? 'Datum & Částka' : 'Dates & Amount'}</div>
                            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                              <div>{isCz ? 'Vystaveno' : 'Issued'}: <strong>{inv.issueDate || '—'}</strong></div>
                              <div>
                                {isCz ? 'Splatnost' : 'Due'}:{' '}
                                <strong style={{ color: isOverdue(inv) && inv.status !== 'paid' ? 'var(--danger)' : 'inherit' }}>
                                  {inv.dueDate || '—'}
                                </strong>
                              </div>
                              {inv.taxableSupplyDate && (
                                <div>{isCz ? 'DUZP' : 'Tax Supply'}: <strong>{inv.taxableSupplyDate}</strong></div>
                              )}
                              <div style={{ marginTop: '0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
                                {inv.currency || 'CZK'} {money(inv.amount || 0)}
                              </div>
                              {inv.isVatPayer && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                                  DPH {inv.taxRate}% = {money(inv.taxAmount || 0)}
                                </div>
                              )}
                            </div>
                          </div>
                          {inv.items && inv.items.length > 0 && (
                            <div className="expanded-section expanded-section-items">
                              <div className="expanded-section-title">{isCz ? 'Položky' : 'Items'}</div>
                              <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ color: 'var(--muted)', textAlign: 'left' }}>
                                    <th style={{ padding: '0.2rem 0.4rem', fontWeight: 600, fontSize: '0.72rem' }}>{isCz ? 'Název' : 'Name'}</th>
                                    <th style={{ padding: '0.2rem 0.4rem', fontWeight: 600, fontSize: '0.72rem', textAlign: 'right' }}>Mn.</th>
                                    <th style={{ padding: '0.2rem 0.4rem', fontWeight: 600, fontSize: '0.72rem', textAlign: 'right' }}>{isCz ? 'Cena/j.' : 'Price'}</th>
                                    <th style={{ padding: '0.2rem 0.4rem', fontWeight: 600, fontSize: '0.72rem', textAlign: 'right' }}>{isCz ? 'Celkem' : 'Total'}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inv.items.map((item, i) => (
                                    <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                                      <td style={{ padding: '0.3rem 0.4rem' }}>{item.name}</td>
                                      <td style={{ padding: '0.3rem 0.4rem', textAlign: 'right' }}>{item.qty}</td>
                                      <td style={{ padding: '0.3rem 0.4rem', textAlign: 'right' }}>{money(item.price)}</td>
                                      <td style={{ padding: '0.3rem 0.4rem', textAlign: 'right', fontWeight: 600 }}>{money(item.total)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {inv.status === 'sent' || inv.status === 'overdue' ? (
                            <div className="expanded-section">
                              <div className="expanded-section-title">{isCz ? 'Odeslání' : 'Delivery'}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                                <Check size={14} strokeWidth={2} style={{ color: 'var(--accent-2)' }} />
                                {isCz ? 'Faktura byla odeslána' : 'Invoice was sent'}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )}
                </Fragment>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
