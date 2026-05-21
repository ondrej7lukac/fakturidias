import './AdminDashboard.css'
import { useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import {
  Shield, Users, Tag, Trash2, Crown, UserCheck, Activity,
  Copy, ToggleLeft, ToggleRight, Zap, BadgeCheck,
  Plus, X, Check, RefreshCw, Eye, Download, RotateCcw, Ban,
  Clock, HeartPulse, Database, Mail, Send, AlertTriangle,
  FileText, CreditCard, Settings2, Plug, Calendar, Pencil, Wallet,
  ICON_SM, ICON_MD, STROKE,
} from '@/lib/icons'

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserStat {
  email: string
  plan: 'free' | 'standard' | 'max' | 'pro'
  status: string
  invoiceCount: number
  currentPeriodEnd: number | null
  interval: string | null
  lastActivity: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId?: string | null
}

interface Promo {
  _id: string
  code: string
  description: string
  planGrant: 'standard' | 'max' | null
  discountPercent: number
  durationDays: number
  maxUses: number | null
  usedCount: number
  usedBy: string[]
  active: boolean
  expiresAt: string | null
  createdAt: string
}

interface Analytics {
  plans: Record<string, number>
  monthlyInvoices: Array<{ _id: { year: number; month: number }; count: number; revenue: number }>
  recentSignups: UserStat[]
}

interface RevenueMetrics {
  mrr: number
  arr: number
  activePaid: number
  byPlan: { standard: number; max: number }
  arpu: number
  churned30: number
  churnRate: number
}

interface DunningUser {
  email: string
  plan: string
  status: string
  stripeCustomerId: string | null
  currentPeriodEnd: number | null
  updatedAt: string | null
}

interface AuditEntry {
  _id: string
  adminEmail: string
  action: string
  target: string | null
  details: Record<string, unknown>
  createdAt: string
}

interface InvoiceLite {
  id: string
  invoiceNumber?: string
  issueDate?: string
  status?: string
  amount?: number
  currency?: string
  client?: { name?: string }
  createdAt?: string
}

interface UserMeta {
  notes?: string
  suspended?: boolean
  suspendedAt?: string | null
  suspendedBy?: string | null
}

interface UserDetail {
  invoices: InvoiceLite[]
  customers: Array<{ name: string; email?: string }>
  items: Array<{ name: string; price?: number }>
  settings: { defaultSupplier?: { name?: string } } | null
  subscription: {
    plan?: string
    status?: string
    interval?: string
    currentPeriodEnd?: number
    stripeCustomerId?: string
    stripeSubscriptionId?: string
  } | null
  meta: UserMeta | null
}

interface Health {
  db: { connected: boolean; mode: string }
  integrations: Record<string, { ok: boolean; note: string }>
  runtime: {
    nodeVersion: string
    platform: string
    uptimeSeconds: number
    memoryMB: number
    loadAvg: number[]
    env: string
  }
}

interface GlobalSettings {
  guestInvoiceLimit: number
  freeInvoiceLimit: number
  standardInvoiceLimit: number
}

interface EmailTemplate {
  _id: string
  name: string
  subject: string
  body: string
  createdAt: string
}

interface ScheduledEmail {
  _id: string
  subject: string
  message: string
  segment: string
  sendAt: string
  status: string
  createdBy?: string
  result?: { sent?: number; failed?: number; total?: number; error?: string } | null
}

interface WebhookEvent {
  _id: string
  provider: string
  eventId: string
  type: string
  status: string
  error: string | null
  createdAt: string
}

interface EmailBounce {
  _id: string
  email: string
  type: string
  reason: string
  createdAt: string
}

interface AdminRole {
  isSuper: boolean
}

type PromoStats = Record<string, { used: number; converted: number }>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string | number | null) {
  if (!d) return '—'
  return new Date(typeof d === 'number' ? d * 1000 : d)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(d: string | number | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmtNum(n: number) {
  return n.toLocaleString('en-US')
}

// Revenue figures come from the backend in haléř (1 CZK = 100).
function fmtCzk(haler: number) {
  return `${Math.round(haler / 100).toLocaleString('en-US')} CZK`
}

function fmtUptime(s: number) {
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`
}

function PlanPill({ plan }: { plan: string }) {
  return (
    <span className={`plan-pill plan-pill--${plan}`}>
      {plan === 'max' && <Crown size={10} strokeWidth={3} />}
      {plan === 'standard' && <BadgeCheck size={10} strokeWidth={3} />}
      {plan}
    </span>
  )
}

function StatusDot({ status }: { status: string }) {
  const cls = ['active', 'trialing'].includes(status) ? 'active'
    : ['canceled', 'past_due', 'unpaid', 'incomplete'].includes(status) ? 'canceled'
    : 'inactive'
  return <span className={`status-dot status-dot--${cls}`} title={status} />
}

function isPaid(u: { plan: string; status: string }) {
  return ['standard', 'max', 'pro'].includes(u.plan) && u.status === 'active'
}

function csvCell(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(csvCell).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportUsersCsv(users: UserStat[]) {
  downloadCsv(`fakturidias-users-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Email', 'Plan', 'Status', 'Invoices', 'Interval', 'Expires', 'Last active'],
    ...users.map(u => [
      u.email, u.plan, u.status, String(u.invoiceCount), u.interval || '',
      u.currentPeriodEnd ? new Date(u.currentPeriodEnd * 1000).toISOString().slice(0, 10) : '',
      u.lastActivity ? new Date(u.lastActivity).toISOString().slice(0, 10) : '',
    ]),
  ])
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function apiPost(url: string, payload: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  let data: any = {}
  try { data = await res.json() } catch { /* ignore */ }
  return { ok: res.ok, data }
}

// ─── Revenue chart ────────────────────────────────────────────────────────────

function RevenueChart({ data }: { data: Analytics['monthlyInvoices'] }) {
  const months = [...(data || [])].sort(
    (a, b) => a._id.year - b._id.year || a._id.month - b._id.month,
  )
  if (months.length === 0) {
    return (
      <div className="admin-chart">
        <div className="admin-chart__title">Invoice volume</div>
        <div className="admin-empty">No invoice data yet</div>
      </div>
    )
  }
  const maxRev = Math.max(...months.map(m => m.revenue || 0), 1)
  const totalRev = months.reduce((s, m) => s + (m.revenue || 0), 0)
  const totalCount = months.reduce((s, m) => s + (m.count || 0), 0)

  return (
    <div className="admin-chart">
      <div className="admin-chart__head">
        <div className="admin-chart__title">Invoice volume — {months.length} months</div>
        <div className="admin-chart__totals">
          <span>{fmtNum(totalCount)} invoices</span>
          <span className="admin-chart__totals-rev">{fmtNum(Math.round(totalRev))} total value</span>
        </div>
      </div>
      <div className="admin-chart__bars">
        {months.map(m => {
          const pct = Math.round(((m.revenue || 0) / maxRev) * 100)
          return (
            <div className="admin-chart__col" key={`${m._id.year}-${m._id.month}`}>
              <div
                className="admin-chart__bar-wrap"
                title={`${fmtNum(m.count)} invoices · ${fmtNum(Math.round(m.revenue || 0))} value`}
              >
                <div className="admin-chart__bar" style={{ height: `${Math.max(pct, 3)}%` }} />
              </div>
              <div className="admin-chart__label">
                {MONTH_NAMES[(m._id.month - 1) % 12]}
                <span className="admin-chart__year">'{String(m._id.year).slice(2)}</span>
              </div>
              <div className="admin-chart__val">{m.count}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Revenue metrics row ──────────────────────────────────────────────────────

function MetricsRow({ metrics }: { metrics: RevenueMetrics | null }) {
  if (!metrics) return null
  return (
    <div className="admin-stats admin-stats--metrics">
      <div className="admin-stat-card admin-stat-card--green">
        <div className="admin-stat-card__label">MRR</div>
        <div className="admin-stat-card__value">{fmtCzk(metrics.mrr)}</div>
        <div className="admin-stat-card__sub">Monthly recurring revenue</div>
      </div>
      <div className="admin-stat-card admin-stat-card--accent">
        <div className="admin-stat-card__label">ARR</div>
        <div className="admin-stat-card__value">{fmtCzk(metrics.arr)}</div>
        <div className="admin-stat-card__sub">Annual run rate</div>
      </div>
      <div className="admin-stat-card admin-stat-card--indigo">
        <div className="admin-stat-card__label">ARPU</div>
        <div className="admin-stat-card__value">{fmtCzk(metrics.arpu)}</div>
        <div className="admin-stat-card__sub">Avg revenue per paid user</div>
      </div>
      <div className={`admin-stat-card ${metrics.churnRate > 5 ? 'admin-stat-card--danger' : ''}`}>
        <div className="admin-stat-card__label">Churn (30d)</div>
        <div className="admin-stat-card__value">{metrics.churnRate}%</div>
        <div className="admin-stat-card__sub">{metrics.churned30} canceled in 30 days</div>
      </div>
    </div>
  )
}

// ─── Dunning panel ────────────────────────────────────────────────────────────

function DunningPanel({
  users, onRetry, onOpenUser, busy,
}: {
  users: DunningUser[]
  onRetry: (email: string) => void
  onOpenUser: (email: string) => void
  busy: string | null
}) {
  if (users.length === 0) return null
  return (
    <div className="admin-risk-panel">
      <div className="admin-section-header">
        <div className="admin-section-title admin-section-title--danger">
          <CreditCard size={ICON_SM} strokeWidth={STROKE} />
          Failed payments — {users.length}
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th><th>Plan</th><th>Status</th><th>Since</th><th></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.email}>
                <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{u.email}</td>
                <td><PlanPill plan={u.plan} /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StatusDot status={u.status} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{u.status}</span>
                  </div>
                </td>
                <td style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{fmtDate(u.updatedAt)}</td>
                <td>
                  <div className="admin-confirm-row">
                    <button className="admin-action-btn" onClick={() => onOpenUser(u.email)}>
                      <Eye size={ICON_SM} strokeWidth={STROKE} />
                    </button>
                    <button
                      className="admin-action-btn admin-action-btn--primary"
                      disabled={busy === u.email}
                      onClick={() => onRetry(u.email)}
                    >
                      <RefreshCw size={ICON_SM} strokeWidth={STROKE} />
                      {busy === u.email ? 'Retrying…' : 'Retry'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  users, analytics, onOpenUser,
}: {
  users: UserStat[]
  analytics: Analytics | null
  onOpenUser: (email: string) => void
}) {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null)
  const [dunning, setDunning] = useState<DunningUser[]>([])
  const [retryBusy, setRetryBusy] = useState<string | null>(null)

  const loadExtra = useCallback(async () => {
    try {
      const [revRes, dunRes] = await Promise.all([
        fetch('/api/admin/revenue'),
        fetch('/api/admin/dunning'),
      ])
      if (revRes.ok) setMetrics(await revRes.json())
      if (dunRes.ok) setDunning((await dunRes.json()).users || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadExtra() }, [loadExtra])

  const handleRetry = async (email: string) => {
    if (!window.confirm(`Retry the latest failed payment for ${email}?`)) return
    setRetryBusy(email)
    const { ok, data } = await apiPost('/api/admin/users/retry-payment', { email })
    setRetryBusy(null)
    if (ok) { alert(`Retry result: ${data.status || 'done'}`); loadExtra() }
    else alert(`Error: ${data.error || 'failed'}`)
  }

  const total = users.length
  const paid = users.filter(isPaid).length
  const maxPlan = users.filter(u => u.plan === 'max' && u.status === 'active').length
  const free = total - paid
  const totalInvoices = users.reduce((s, u) => s + u.invoiceCount, 0)
  const planCounts = analytics?.plans || {}

  const now = Date.now()
  const atRisk = users.filter(u => {
    if (['canceled', 'past_due', 'unpaid'].includes(u.status)) return true
    if (isPaid(u) && u.currentPeriodEnd) {
      const days = (u.currentPeriodEnd * 1000 - now) / 86400000
      return days >= 0 && days <= 7
    }
    return false
  })

  return (
    <>
      <div className="admin-stats">
        <div className="admin-stat-card admin-stat-card--accent">
          <div className="admin-stat-card__label">Total users</div>
          <div className="admin-stat-card__value">{total}</div>
          <div className="admin-stat-card__sub">All registered accounts</div>
        </div>
        <div className="admin-stat-card admin-stat-card--green">
          <div className="admin-stat-card__label">Paid users</div>
          <div className="admin-stat-card__value">{paid}</div>
          <div className="admin-stat-card__sub">Standard + Max active</div>
        </div>
        <div className="admin-stat-card admin-stat-card--indigo">
          <div className="admin-stat-card__label">Max tier</div>
          <div className="admin-stat-card__value">{maxPlan}</div>
          <div className="admin-stat-card__sub">Top-tier subscribers</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__label">Free users</div>
          <div className="admin-stat-card__value">{free}</div>
          <div className="admin-stat-card__sub">Not on paid plan</div>
        </div>
        <div className={`admin-stat-card ${atRisk.length ? 'admin-stat-card--danger' : ''}`}>
          <div className="admin-stat-card__label">At risk</div>
          <div className="admin-stat-card__value">{atRisk.length}</div>
          <div className="admin-stat-card__sub">Expiring or canceled</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__label">Total invoices</div>
          <div className="admin-stat-card__value">{totalInvoices}</div>
          <div className="admin-stat-card__sub">Across all users</div>
        </div>
      </div>

      <div className="admin-section-header">
        <div className="admin-section-title">
          <Wallet size={ICON_SM} strokeWidth={STROKE} /> Recurring revenue
        </div>
      </div>
      <MetricsRow metrics={metrics} />

      <div className="admin-plan-dist">
        <div className="admin-plan-dist__title">Plan distribution</div>
        <div className="admin-plan-dist__bar">
          <div
            className="admin-plan-dist__seg admin-plan-dist__seg--free"
            style={{ flex: Math.max(planCounts['free'] || free, 1) }}
          />
          <div
            className="admin-plan-dist__seg admin-plan-dist__seg--standard"
            style={{ flex: Math.max(planCounts['standard'] || 0, 0) }}
          />
          <div
            className="admin-plan-dist__seg admin-plan-dist__seg--max"
            style={{ flex: Math.max(planCounts['max'] || 0, 0) }}
          />
        </div>
        <div className="admin-plan-dist__legend">
          <div className="admin-plan-dist__item">
            <div className="admin-plan-dist__dot admin-plan-dist__dot--free" />
            Free — {free}
          </div>
          <div className="admin-plan-dist__item">
            <div className="admin-plan-dist__dot admin-plan-dist__dot--standard" />
            Standard — {paid - maxPlan}
          </div>
          <div className="admin-plan-dist__item">
            <div className="admin-plan-dist__dot admin-plan-dist__dot--max" />
            Max — {maxPlan}
          </div>
        </div>
      </div>

      <RevenueChart data={analytics?.monthlyInvoices || []} />

      <DunningPanel users={dunning} onRetry={handleRetry} onOpenUser={onOpenUser} busy={retryBusy} />

      {atRisk.length > 0 && (
        <div className="admin-risk-panel">
          <div className="admin-section-header">
            <div className="admin-section-title admin-section-title--danger">
              <AlertTriangle size={ICON_SM} strokeWidth={STROKE} />
              At-risk users — {atRisk.length}
            </div>
          </div>
          <div className="admin-activity-list">
            {atRisk.map(u => (
              <button key={u.email} className="admin-activity-item admin-activity-item--btn" onClick={() => onOpenUser(u.email)}>
                <div className="admin-activity-item__email">{u.email}</div>
                <div className="admin-activity-item__plan"><PlanPill plan={u.plan} /></div>
                <div className="admin-activity-item__date">
                  {['canceled', 'past_due', 'unpaid'].includes(u.status)
                    ? u.status
                    : `expires ${fmtDate(u.currentPeriodEnd)}`}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="admin-overview-grid">
        <div>
          <div className="admin-section-header">
            <div className="admin-section-title">Recent activity</div>
          </div>
          <div className="admin-activity-list">
            {(analytics?.recentSignups || users.slice(0, 10)).map(u => (
              <button key={u.email} className="admin-activity-item admin-activity-item--btn" onClick={() => onOpenUser(u.email)}>
                <div className="admin-activity-item__email">{u.email}</div>
                <div className="admin-activity-item__plan"><PlanPill plan={u.plan} /></div>
                <div className="admin-activity-item__date">{fmtDate(u.lastActivity)}</div>
              </button>
            ))}
            {users.length === 0 && <div className="admin-empty">No users yet</div>}
          </div>
        </div>

        <div>
          <div className="admin-section-header">
            <div className="admin-section-title">Top by invoices</div>
          </div>
          <div className="admin-activity-list">
            {[...users].sort((a, b) => b.invoiceCount - a.invoiceCount).slice(0, 10).map(u => (
              <button key={u.email} className="admin-activity-item admin-activity-item--btn" onClick={() => onOpenUser(u.email)}>
                <div className="admin-activity-item__email">{u.email}</div>
                <div className="admin-activity-item__plan"><PlanPill plan={u.plan} /></div>
                <div className="admin-activity-item__date">{u.invoiceCount} invoices</div>
              </button>
            ))}
            {users.length === 0 && <div className="admin-empty">No users yet</div>}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab({
  users, onRefresh, onOpenUser, isSuper,
}: {
  users: UserStat[]
  onRefresh: () => void
  onOpenUser: (email: string) => void
  isSuper: boolean
}) {
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [pendingPlan, setPendingPlan] = useState<Record<string, string>>({})
  const [pendingDays, setPendingDays] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const filtered = users.filter(u => {
    const matchSearch = u.email.toLowerCase().includes(search.toLowerCase())
    const matchPlan = planFilter === 'all' || u.plan === planFilter
    return matchSearch && matchPlan
  })

  const handlePlanChange = async (email: string) => {
    const plan = pendingPlan[email] || 'free'
    const days = parseInt(pendingDays[email] || '30', 10)
    setLoading(email)
    const { ok } = await apiPostPut('/api/admin/users/plan', { email, plan, durationDays: days })
    setLoading(null)
    if (ok) { onRefresh(); setPendingPlan(p => { const n = { ...p }; delete n[email]; return n }) }
    else alert('Failed to update plan')
  }

  const handleDelete = async (email: string) => {
    setLoading(email)
    const res = await fetch('/api/admin/users/data', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(null)
    if (res.ok) { onRefresh(); setConfirmDelete(null) }
    else { const d = await res.json().catch(() => ({})); alert(d.error || 'Failed to delete') }
  }

  return (
    <>
      <div className="admin-search-bar">
        <input
          className="admin-search-input"
          placeholder="Search by email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {['all', 'free', 'standard', 'max'].map(p => (
          <button
            key={p}
            className={`admin-filter-chip ${planFilter === p ? 'admin-filter-chip--active' : ''}`}
            onClick={() => setPlanFilter(p)}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <div className="admin-section-header">
        <div className="admin-section-title">{filtered.length} users</div>
        <div className="admin-section-actions">
          <button
            className="admin-action-btn"
            onClick={() => exportUsersCsv(filtered)}
            disabled={filtered.length === 0}
          >
            <Download size={ICON_SM} strokeWidth={STROKE} /> Export CSV
          </button>
          <button className="admin-action-btn" onClick={onRefresh}>
            <RefreshCw size={ICON_SM} strokeWidth={STROKE} /> Refresh
          </button>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Invoices</th>
              <th>Expires</th>
              <th>Last active</th>
              <th>Change plan</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.email}>
                <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                  {u.email}
                  <button
                    className="admin-copy-btn"
                    title="Copy email"
                    onClick={() => navigator.clipboard.writeText(u.email)}
                  >
                    <Copy size={11} strokeWidth={2} />
                  </button>
                </td>
                <td><PlanPill plan={u.plan} /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StatusDot status={u.status} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{u.status}</span>
                  </div>
                </td>
                <td>{u.invoiceCount}</td>
                <td style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  {u.currentPeriodEnd ? fmtDate(u.currentPeriodEnd) : '—'}
                </td>
                <td style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  {fmtDate(u.lastActivity)}
                </td>
                <td>
                  <div className="admin-plan-row">
                    <select
                      className="admin-plan-select"
                      value={pendingPlan[u.email] ?? u.plan}
                      onChange={e => setPendingPlan(p => ({ ...p, [u.email]: e.target.value }))}
                    >
                      <option value="free">Free</option>
                      <option value="standard">Standard</option>
                      <option value="max">Max</option>
                    </select>
                    {pendingPlan[u.email] && pendingPlan[u.email] !== 'free' && (
                      <input
                        className="admin-days-input"
                        type="number"
                        min="1"
                        max="3650"
                        placeholder="days"
                        value={pendingDays[u.email] ?? '30'}
                        onChange={e => setPendingDays(p => ({ ...p, [u.email]: e.target.value }))}
                        title="Duration in days"
                      />
                    )}
                    {pendingPlan[u.email] && (
                      <button
                        className="admin-action-btn admin-action-btn--primary"
                        disabled={loading === u.email}
                        onClick={() => handlePlanChange(u.email)}
                      >
                        <Check size={12} strokeWidth={3} />
                      </button>
                    )}
                  </div>
                </td>
                <td>
                  <div className="admin-confirm-row">
                    <button
                      className="admin-action-btn"
                      title="View details"
                      onClick={() => onOpenUser(u.email)}
                    >
                      <Eye size={ICON_SM} strokeWidth={STROKE} />
                    </button>
                    {isSuper && (confirmDelete === u.email ? (
                      <>
                        <button
                          className="admin-action-btn admin-action-btn--danger"
                          disabled={loading === u.email}
                          onClick={() => handleDelete(u.email)}
                        >Yes</button>
                        <button
                          className="admin-action-btn"
                          onClick={() => setConfirmDelete(null)}
                        >No</button>
                      </>
                    ) : (
                      <button
                        className="admin-action-btn admin-action-btn--danger"
                        title="Delete all data"
                        onClick={() => setConfirmDelete(u.email)}
                      >
                        <Trash2 size={ICON_SM} strokeWidth={STROKE} />
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="admin-empty">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

async function apiPostPut(url: string, payload: unknown) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  let data: any = {}
  try { data = await res.json() } catch { /* ignore */ }
  return { ok: res.ok, data }
}

// ─── User Detail Drawer ───────────────────────────────────────────────────────

function UserDetailDrawer({
  email, onClose, onChanged, isSuper,
}: {
  email: string
  onClose: () => void
  onChanged: () => void
  isSuper: boolean
}) {
  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/user-detail?email=${encodeURIComponent(email)}`)
      if (res.ok) {
        const d: UserDetail = await res.json()
        setDetail(d)
        setNotes(d.meta?.notes || '')
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [email])

  useEffect(() => { load() }, [load])

  const action = async (endpoint: string, label: string, confirmText: string) => {
    if (!window.confirm(confirmText)) return
    setBusy(label)
    setMsg('')
    const { ok, data } = await apiPost(endpoint, { email })
    setBusy(null)
    if (ok) {
      setMsg(label === 'refund' && data.amount
        ? `Refunded ${((data.amount as number) / 100).toFixed(2)} ${String(data.currency || '').toUpperCase()}`
        : `${label} succeeded`)
      load()
      onChanged()
    } else {
      setMsg(`Error: ${data.error || 'failed'}`)
    }
  }

  const saveNotes = async () => {
    setBusy('notes')
    const { ok } = await apiPost('/api/admin/user-notes', { email, notes })
    setBusy(null)
    setMsg(ok ? 'Notes saved' : 'Error: could not save notes')
  }

  const toggleSuspend = async () => {
    const suspend = !detail?.meta?.suspended
    if (!window.confirm(suspend
      ? `Suspend ${email}? They will be locked out of the app.`
      : `Lift the suspension on ${email}?`)) return
    setBusy('suspend')
    const { ok, data } = await apiPost('/api/admin/user-suspend', { email, suspended: suspend })
    setBusy(null)
    if (ok) { setMsg(suspend ? 'User suspended' : 'Suspension lifted'); load(); onChanged() }
    else setMsg(`Error: ${data.error || 'failed'}`)
  }

  const impersonate = async () => {
    if (!window.confirm(`Impersonate ${email}? You'll browse the app as this user until you stop.`)) return
    setBusy('impersonate')
    const { ok, data } = await apiPost('/api/admin/impersonate', { email })
    if (ok) { window.location.href = '/' }
    else { setBusy(null); setMsg(`Error: ${data.error || 'failed'}`) }
  }

  const sub = detail?.subscription
  const hasStripeSub = !!sub?.stripeSubscriptionId
  const hasStripeCustomer = !!sub?.stripeCustomerId
  const suspended = !!detail?.meta?.suspended

  return (
    <div className="admin-drawer-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="admin-drawer">
        <div className="admin-drawer__head">
          <div className="admin-drawer__title">
            <UserCheck size={ICON_MD} strokeWidth={STROKE} />
            <span className="admin-drawer__email">{email}</span>
            {suspended && <span className="admin-suspended-tag">Suspended</span>}
          </div>
          <button className="admin-copy-btn" onClick={onClose} title="Close">
            <X size={ICON_MD} strokeWidth={STROKE} />
          </button>
        </div>

        {loading ? (
          <div className="admin-empty">Loading user…</div>
        ) : !detail ? (
          <div className="admin-empty">Could not load this user (DB offline?)</div>
        ) : (
          <div className="admin-drawer__body">
            {/* Subscription */}
            <div className="admin-drawer__section">
              <div className="admin-drawer__section-title">
                <CreditCard size={ICON_SM} strokeWidth={STROKE} /> Subscription
              </div>
              <div className="admin-kv">
                <div className="admin-kv__row"><span>Plan</span><PlanPill plan={sub?.plan || 'free'} /></div>
                <div className="admin-kv__row"><span>Status</span><b>{sub?.status || 'inactive'}</b></div>
                <div className="admin-kv__row"><span>Interval</span><b>{sub?.interval || '—'}</b></div>
                <div className="admin-kv__row"><span>Expires</span><b>{fmtDate(sub?.currentPeriodEnd ?? null)}</b></div>
                <div className="admin-kv__row">
                  <span>Stripe customer</span>
                  <b className="admin-kv__mono">{sub?.stripeCustomerId || '—'}</b>
                </div>
                <div className="admin-kv__row">
                  <span>Stripe subscription</span>
                  <b className="admin-kv__mono">{sub?.stripeSubscriptionId || '—'}</b>
                </div>
              </div>

              {msg && (
                <div className={`admin-drawer__msg ${msg.startsWith('Error') ? 'admin-drawer__msg--err' : ''}`}>
                  {msg}
                </div>
              )}

              <div className="admin-drawer__actions">
                <button
                  className="admin-action-btn"
                  disabled={!hasStripeSub || busy !== null}
                  onClick={() => action('/api/admin/users/sync-stripe', 'sync', 'Re-fetch this subscription state from Stripe?')}
                >
                  <RotateCcw size={ICON_SM} strokeWidth={STROKE} />
                  {busy === 'sync' ? 'Syncing…' : 'Sync from Stripe'}
                </button>
                {isSuper && (
                  <>
                    <button
                      className="admin-action-btn admin-action-btn--danger"
                      disabled={!hasStripeSub || busy !== null}
                      onClick={() => action('/api/admin/users/cancel-subscription', 'cancel', `Cancel the Stripe subscription for ${email} immediately? This cannot be undone.`)}
                    >
                      <Ban size={ICON_SM} strokeWidth={STROKE} />
                      {busy === 'cancel' ? 'Canceling…' : 'Cancel subscription'}
                    </button>
                    <button
                      className="admin-action-btn admin-action-btn--danger"
                      disabled={!hasStripeCustomer || busy !== null}
                      onClick={() => action('/api/admin/users/refund', 'refund', `Refund the most recent charge for ${email}? This moves real money.`)}
                    >
                      <RotateCcw size={ICON_SM} strokeWidth={STROKE} />
                      {busy === 'refund' ? 'Refunding…' : 'Refund last charge'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Account controls */}
            {isSuper && (
              <div className="admin-drawer__section">
                <div className="admin-drawer__section-title">
                  <Shield size={ICON_SM} strokeWidth={STROKE} /> Account controls
                </div>
                <div className="admin-drawer__actions">
                  <button
                    className="admin-action-btn"
                    disabled={busy !== null}
                    onClick={impersonate}
                  >
                    <Eye size={ICON_SM} strokeWidth={STROKE} />
                    {busy === 'impersonate' ? 'Starting…' : 'Impersonate'}
                  </button>
                  <button
                    className={`admin-action-btn ${suspended ? 'admin-action-btn--primary' : 'admin-action-btn--danger'}`}
                    disabled={busy !== null}
                    onClick={toggleSuspend}
                  >
                    <Ban size={ICON_SM} strokeWidth={STROKE} />
                    {busy === 'suspend' ? '…' : suspended ? 'Lift suspension' : 'Suspend user'}
                  </button>
                </div>
                {detail.meta?.suspended && detail.meta.suspendedBy && (
                  <div className="admin-drawer__hint">
                    Suspended by {detail.meta.suspendedBy} on {fmtDate(detail.meta.suspendedAt || null)}
                  </div>
                )}
              </div>
            )}

            {/* Admin notes */}
            <div className="admin-drawer__section">
              <div className="admin-drawer__section-title">
                <Pencil size={ICON_SM} strokeWidth={STROKE} /> Admin notes
              </div>
              <textarea
                className="admin-form-input admin-email__textarea"
                placeholder="Internal notes about this user…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
              />
              <div className="admin-drawer__actions">
                <button
                  className="admin-action-btn admin-action-btn--primary"
                  disabled={busy !== null}
                  onClick={saveNotes}
                >
                  <Check size={ICON_SM} strokeWidth={STROKE} />
                  {busy === 'notes' ? 'Saving…' : 'Save notes'}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="admin-drawer__stats">
              <div className="admin-drawer__stat">
                <div className="admin-drawer__stat-val">{detail.invoices.length}</div>
                <div className="admin-drawer__stat-label">Invoices</div>
              </div>
              <div className="admin-drawer__stat">
                <div className="admin-drawer__stat-val">{detail.customers.length}</div>
                <div className="admin-drawer__stat-label">Customers</div>
              </div>
              <div className="admin-drawer__stat">
                <div className="admin-drawer__stat-val">{detail.items.length}</div>
                <div className="admin-drawer__stat-label">Items</div>
              </div>
            </div>

            {detail.settings?.defaultSupplier?.name && (
              <div className="admin-drawer__section">
                <div className="admin-drawer__section-title">Company</div>
                <div className="admin-kv__row"><span>Supplier</span><b>{detail.settings.defaultSupplier.name}</b></div>
              </div>
            )}

            {/* Invoices */}
            <div className="admin-drawer__section">
              <div className="admin-drawer__section-title">
                <FileText size={ICON_SM} strokeWidth={STROKE} /> Recent invoices
              </div>
              {detail.invoices.length === 0 ? (
                <div className="admin-empty">No invoices</div>
              ) : (
                <div className="admin-mini-list">
                  {detail.invoices.slice(0, 12).map(inv => (
                    <div key={inv.id} className="admin-mini-list__row">
                      <span className="admin-mini-list__main">{inv.invoiceNumber || inv.id}</span>
                      <span className="admin-mini-list__sub">{inv.client?.name || '—'}</span>
                      <span className="admin-mini-list__meta">
                        {inv.amount != null ? `${fmtNum(inv.amount)} ${inv.currency || ''}` : '—'}
                      </span>
                      <span className="admin-mini-list__meta">{fmtDate(inv.issueDate || inv.createdAt || null)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customers */}
            {detail.customers.length > 0 && (
              <div className="admin-drawer__section">
                <div className="admin-drawer__section-title">
                  <Users size={ICON_SM} strokeWidth={STROKE} /> Customers
                </div>
                <div className="admin-tag-cloud">
                  {detail.customers.slice(0, 30).map(c => (
                    <span key={c.name} className="admin-tag">{c.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Promos Tab ───────────────────────────────────────────────────────────────

const emptyPromoForm = {
  code: '', description: '', planGrant: '', discountPercent: '0',
  durationDays: '30', maxUses: '', expiresAt: '',
}

function PromosTab() {
  const [promos, setPromos] = useState<Promo[]>([])
  const [stats, setStats] = useState<PromoStats>({})
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyPromoForm })
  const [applyModal, setApplyModal] = useState<Promo | null>(null)
  const [applyEmail, setApplyEmail] = useState('')
  const [applyResult, setApplyResult] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, sRes] = await Promise.all([
        fetch('/api/admin/promos'),
        fetch('/api/admin/promos/stats'),
      ])
      if (pRes.ok) setPromos((await pRes.json()).promos)
      if (sRes.ok) setStats((await sRes.json()).stats || {})
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.code) return alert('Code is required')
    setSaving(true)
    const { ok, data } = await apiPost('/api/admin/promos', {
      code: form.code.toUpperCase(),
      description: form.description,
      planGrant: form.planGrant || null,
      discountPercent: Number(form.discountPercent) || 0,
      durationDays: Number(form.durationDays) || 30,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      expiresAt: form.expiresAt || null,
    })
    setSaving(false)
    if (ok) { setShowForm(false); setForm({ ...emptyPromoForm }); load() }
    else alert(data.error || 'Failed to create promo')
  }

  const handleToggle = async (promo: Promo) => {
    await apiPostPut('/api/admin/promos', { code: promo.code, active: !promo.active })
    load()
  }

  const handleDelete = async (code: string) => {
    if (!window.confirm(`Delete promo "${code}"?`)) return
    await fetch('/api/admin/promos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    load()
  }

  const handleApply = async () => {
    if (!applyModal || !applyEmail) return
    setSaving(true)
    const { ok, data } = await apiPost('/api/admin/promos/apply', {
      code: applyModal.code, userEmail: applyEmail,
    })
    setSaving(false)
    if (ok) {
      setApplyResult(`Applied! Granted ${data.planGranted || '—'} for ${data.durationDays} days.`)
      load()
    } else {
      setApplyResult(`Error: ${data.error}`)
    }
  }

  return (
    <>
      <div className="admin-section-header">
        <div className="admin-section-title">Promo codes</div>
        <div className="admin-section-actions">
          <button className="admin-action-btn" onClick={load}>
            <RefreshCw size={ICON_SM} strokeWidth={STROKE} /> Refresh
          </button>
          <button className="admin-action-btn admin-action-btn--primary" onClick={() => setShowForm(s => !s)}>
            <Plus size={ICON_SM} strokeWidth={STROKE} />
            {showForm ? 'Cancel' : 'New promo'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="admin-promo-form">
          <div className="admin-form-group">
            <label className="admin-form-label">Code *</label>
            <input
              className="admin-form-input"
              placeholder="SUMMER25"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
            />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Description</label>
            <input
              className="admin-form-input"
              placeholder="Summer promotion 2025"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Plan grant</label>
            <select
              className="admin-form-select"
              value={form.planGrant}
              onChange={e => setForm(f => ({ ...f, planGrant: e.target.value }))}
            >
              <option value="">None (discount only)</option>
              <option value="standard">Standard</option>
              <option value="max">Max</option>
            </select>
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Discount %</label>
            <input
              className="admin-form-input"
              type="number"
              min="0"
              max="100"
              value={form.discountPercent}
              onChange={e => setForm(f => ({ ...f, discountPercent: e.target.value }))}
            />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Duration (days)</label>
            <input
              className="admin-form-input"
              type="number"
              min="1"
              value={form.durationDays}
              onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))}
            />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Max uses</label>
            <input
              className="admin-form-input"
              type="number"
              min="1"
              placeholder="Unlimited"
              value={form.maxUses}
              onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
            />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Expires at</label>
            <input
              className="admin-form-input"
              type="date"
              value={form.expiresAt}
              onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
            />
          </div>
          <div className="admin-form-group admin-form-actions">
            <button
              className="admin-action-btn admin-action-btn--primary"
              disabled={saving}
              onClick={handleCreate}
            >
              <Check size={ICON_SM} strokeWidth={STROKE} />
              {saving ? 'Creating...' : 'Create promo'}
            </button>
          </div>
        </div>
      )}

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">Loading...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>Plan grant</th>
                <th>Discount</th>
                <th>Duration</th>
                <th>Uses</th>
                <th>Converted</th>
                <th>Expires</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {promos.map(p => {
                const st = stats[p.code]
                const rate = st && st.used > 0 ? Math.round((st.converted / st.used) * 100) : 0
                return (
                  <tr key={p._id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' }}>
                        {p.code}
                      </span>
                      <button
                        className="admin-copy-btn"
                        onClick={() => navigator.clipboard.writeText(p.code)}
                        title="Copy code"
                      >
                        <Copy size={11} strokeWidth={2} />
                      </button>
                    </td>
                    <td style={{ color: 'var(--muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.description || '—'}
                    </td>
                    <td>{p.planGrant ? <PlanPill plan={p.planGrant} /> : <span style={{ color: 'var(--muted2)' }}>—</span>}</td>
                    <td>{p.discountPercent ? `${p.discountPercent}%` : '—'}</td>
                    <td>{p.durationDays}d</td>
                    <td>
                      {p.usedCount}{p.maxUses !== null ? `/${p.maxUses}` : ''}
                    </td>
                    <td>
                      {st && st.used > 0
                        ? <span title={`${st.converted} of ${st.used} now paying`}>{st.converted} ({rate}%)</span>
                        : <span style={{ color: 'var(--muted2)' }}>—</span>}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                      {p.expiresAt ? fmtDate(p.expiresAt) : '—'}
                    </td>
                    <td>
                      <button className="admin-copy-btn" onClick={() => handleToggle(p)} title={p.active ? 'Deactivate' : 'Activate'}>
                        {p.active
                          ? <ToggleRight size={20} strokeWidth={2} style={{ color: 'var(--accent)' }} />
                          : <ToggleLeft size={20} strokeWidth={2} style={{ color: 'var(--muted2)' }} />
                        }
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="admin-action-btn"
                          onClick={() => { setApplyModal(p); setApplyEmail(''); setApplyResult('') }}
                          title="Apply to user"
                        >
                          <Zap size={ICON_SM} strokeWidth={STROKE} /> Apply
                        </button>
                        <button
                          className="admin-action-btn admin-action-btn--danger"
                          onClick={() => handleDelete(p.code)}
                        >
                          <Trash2 size={ICON_SM} strokeWidth={STROKE} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {promos.length === 0 && (
                <tr><td colSpan={10} className="admin-empty">No promo codes yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {applyModal && (
        <div className="admin-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setApplyModal(null) }}>
          <div className="admin-modal">
            <div className="admin-modal__title">
              Apply <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{applyModal.code}</span> to user
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">User email</label>
              <input
                className="admin-form-input"
                placeholder="user@example.com"
                value={applyEmail}
                onChange={e => { setApplyEmail(e.target.value); setApplyResult('') }}
              />
            </div>
            {applyResult && (
              <div className={`admin-drawer__msg ${applyResult.startsWith('Error') ? 'admin-drawer__msg--err' : ''}`} style={{ marginTop: '0.8rem' }}>
                {applyResult}
              </div>
            )}
            <div className="admin-modal__actions">
              <button className="admin-action-btn" onClick={() => setApplyModal(null)}>
                <X size={ICON_SM} strokeWidth={STROKE} /> Cancel
              </button>
              <button
                className="admin-action-btn admin-action-btn--primary"
                disabled={saving || !applyEmail}
                onClick={handleApply}
              >
                <Zap size={ICON_SM} strokeWidth={STROKE} />
                {saving ? 'Applying...' : 'Apply promo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Email Tab ────────────────────────────────────────────────────────────────

const SEGMENTS = [
  { id: 'all', label: 'All users' },
  { id: 'paid', label: 'Paid only' },
  { id: 'free', label: 'Free only' },
  { id: 'standard', label: 'Standard' },
  { id: 'max', label: 'Max' },
]

function EmailTab() {
  const [segment, setSegment] = useState('all')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sendAt, setSendAt] = useState('')
  const [busy, setBusy] = useState('')
  const [result, setResult] = useState('')
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [scheduled, setScheduled] = useState<ScheduledEmail[]>([])
  const [bounces, setBounces] = useState<EmailBounce[]>([])

  const loadAux = useCallback(async () => {
    try {
      const [tRes, sRes, bRes] = await Promise.all([
        fetch('/api/admin/email-templates'),
        fetch('/api/admin/scheduled-emails'),
        fetch('/api/admin/bounces'),
      ])
      if (tRes.ok) setTemplates((await tRes.json()).templates || [])
      if (sRes.ok) setScheduled((await sRes.json()).emails || [])
      if (bRes.ok) setBounces((await bRes.json()).bounces || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadAux() }, [loadAux])

  const segLabel = SEGMENTS.find(s => s.id === segment)?.label || segment

  const sendNow = async () => {
    if (!subject.trim() || !message.trim()) return
    if (!window.confirm(`Send this email to "${segLabel}" now? This sends real emails.`)) return
    setBusy('send')
    setResult('')
    const { ok, data } = await apiPost('/api/admin/broadcast', { subject, message, segment })
    setBusy('')
    if (ok) {
      setResult(`Sent ${data.sent}/${data.total}${data.failed ? ` — ${data.failed} failed` : ''}`)
      setSubject(''); setMessage('')
    } else setResult(`Error: ${data.error || 'failed'}`)
  }

  const schedule = async () => {
    if (!subject.trim() || !message.trim() || !sendAt) return
    setBusy('schedule')
    setResult('')
    const { ok, data } = await apiPost('/api/admin/scheduled-emails', {
      subject, message, segment, sendAt: new Date(sendAt).toISOString(),
    })
    setBusy('')
    if (ok) {
      setResult(`Scheduled for ${fmtDateTime(sendAt)}`)
      setSubject(''); setMessage(''); setSendAt('')
      loadAux()
    } else setResult(`Error: ${data.error || 'failed'}`)
  }

  const saveTemplate = async () => {
    const name = window.prompt('Template name?')
    if (!name) return
    setBusy('template')
    const { ok } = await apiPost('/api/admin/email-templates', { name, subject, body: message })
    setBusy('')
    setResult(ok ? 'Template saved' : 'Error: could not save template')
    if (ok) loadAux()
  }

  const useTemplate = (t: EmailTemplate) => {
    setSubject(t.subject)
    setMessage(t.body)
    setResult(`Loaded template "${t.name}"`)
  }

  const deleteTemplate = async (id: string) => {
    if (!window.confirm('Delete this template?')) return
    await fetch('/api/admin/email-templates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    loadAux()
  }

  const cancelScheduled = async (id: string) => {
    if (!window.confirm('Cancel this scheduled email?')) return
    await apiPost('/api/admin/scheduled-emails/cancel', { id })
    loadAux()
  }

  return (
    <div className="admin-email">
      <div className="admin-section-header">
        <div className="admin-section-title">
          <Mail size={ICON_SM} strokeWidth={STROKE} /> Compose broadcast
        </div>
        <button className="admin-action-btn" onClick={loadAux}>
          <RefreshCw size={ICON_SM} strokeWidth={STROKE} /> Refresh
        </button>
      </div>

      <div className="admin-email__form">
        <div className="admin-form-group">
          <label className="admin-form-label">Recipients</label>
          <div className="admin-search-bar" style={{ marginBottom: 0 }}>
            {SEGMENTS.map(s => (
              <button
                key={s.id}
                className={`admin-filter-chip ${segment === s.id ? 'admin-filter-chip--active' : ''}`}
                onClick={() => setSegment(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-form-group">
          <label className="admin-form-label">Subject</label>
          <input
            className="admin-form-input"
            placeholder="Important update from Fakturidias"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
        </div>

        <div className="admin-form-group">
          <label className="admin-form-label">Message</label>
          <textarea
            className="admin-form-input admin-email__textarea"
            placeholder="Write your announcement…  Line breaks are preserved."
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={9}
          />
        </div>

        <div className="admin-form-group">
          <label className="admin-form-label">Schedule for (optional)</label>
          <input
            className="admin-form-input"
            type="datetime-local"
            value={sendAt}
            onChange={e => setSendAt(e.target.value)}
          />
        </div>

        {result && (
          <div className={`admin-drawer__msg ${result.startsWith('Error') ? 'admin-drawer__msg--err' : ''}`}>
            {result}
          </div>
        )}

        <div className="admin-form-actions">
          <button
            className="admin-action-btn admin-action-btn--primary"
            disabled={busy !== '' || !subject.trim() || !message.trim()}
            onClick={sendNow}
          >
            <Send size={ICON_SM} strokeWidth={STROKE} />
            {busy === 'send' ? 'Sending…' : 'Send now'}
          </button>
          <button
            className="admin-action-btn"
            disabled={busy !== '' || !subject.trim() || !message.trim() || !sendAt}
            onClick={schedule}
          >
            <Calendar size={ICON_SM} strokeWidth={STROKE} />
            {busy === 'schedule' ? 'Scheduling…' : 'Schedule'}
          </button>
          <button
            className="admin-action-btn"
            disabled={busy !== '' || !subject.trim() || !message.trim()}
            onClick={saveTemplate}
          >
            <FileText size={ICON_SM} strokeWidth={STROKE} />
            {busy === 'template' ? 'Saving…' : 'Save as template'}
          </button>
        </div>
      </div>

      {/* Templates */}
      <div className="admin-section-header" style={{ marginTop: '2rem' }}>
        <div className="admin-section-title">
          <FileText size={ICON_SM} strokeWidth={STROKE} /> Templates — {templates.length}
        </div>
      </div>
      {templates.length === 0 ? (
        <div className="admin-empty">No templates saved</div>
      ) : (
        <div className="admin-activity-list">
          {templates.map(t => (
            <div key={t._id} className="admin-activity-item">
              <div className="admin-activity-item__email">{t.name}</div>
              <div className="admin-activity-item__date">{t.subject || '(no subject)'}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="admin-action-btn" onClick={() => useTemplate(t)}>Use</button>
                <button className="admin-action-btn admin-action-btn--danger" onClick={() => deleteTemplate(t._id)}>
                  <Trash2 size={ICON_SM} strokeWidth={STROKE} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scheduled */}
      <div className="admin-section-header" style={{ marginTop: '2rem' }}>
        <div className="admin-section-title">
          <Clock size={ICON_SM} strokeWidth={STROKE} /> Scheduled — {scheduled.length}
        </div>
      </div>
      {scheduled.length === 0 ? (
        <div className="admin-empty">No scheduled emails</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Subject</th><th>Segment</th><th>Send at</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {scheduled.map(s => (
                <tr key={s._id}>
                  <td>{s.subject}</td>
                  <td>{s.segment}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{fmtDateTime(s.sendAt)}</td>
                  <td><span className={`admin-sched-status admin-sched-status--${s.status}`}>{s.status}</span></td>
                  <td>
                    {s.status === 'pending' && (
                      <button className="admin-action-btn admin-action-btn--danger" onClick={() => cancelScheduled(s._id)}>
                        Cancel
                      </button>
                    )}
                    {s.result?.sent != null && (
                      <span style={{ fontSize: '0.76rem', color: 'var(--muted2)' }}>
                        sent {s.result.sent}/{s.result.total}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bounces */}
      <div className="admin-section-header" style={{ marginTop: '2rem' }}>
        <div className="admin-section-title">
          <AlertTriangle size={ICON_SM} strokeWidth={STROKE} /> Bounces & complaints — {bounces.length}
        </div>
      </div>
      {bounces.length === 0 ? (
        <div className="admin-empty">No bounces recorded</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Email</th><th>Type</th><th>Reason</th><th>When</th></tr>
            </thead>
            <tbody>
              {bounces.map(b => (
                <tr key={b._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{b.email}</td>
                  <td><span className="admin-audit-action">{b.type}</span></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{b.reason || '—'}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--muted2)' }}>{fmtDateTime(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Audit Tab ────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  plan_override: 'Plan override',
  delete_user_data: 'Delete user data',
  promo_create: 'Promo created',
  promo_update: 'Promo updated',
  promo_delete: 'Promo deleted',
  promo_apply: 'Promo applied',
  subscription_cancel: 'Subscription canceled',
  subscription_sync: 'Subscription synced',
  refund: 'Refund issued',
  retry_payment: 'Payment retried',
  broadcast: 'Email broadcast',
  schedule_email: 'Email scheduled',
  impersonate_start: 'Impersonation started',
  impersonate_stop: 'Impersonation stopped',
  user_notes: 'Notes updated',
  user_suspend: 'User suspended',
  user_unsuspend: 'User unsuspended',
  settings_update: 'Settings updated',
  webhook_replay: 'Webhook replayed',
}

function AuditTab() {
  const [log, setLog] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/audit')
      if (res.ok) setLog((await res.json()).log || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const actions = Array.from(new Set(log.map(e => e.action)))
  const filtered = log.filter(e => {
    const matchSearch = !search
      || e.adminEmail.toLowerCase().includes(search.toLowerCase())
      || (e.target || '').toLowerCase().includes(search.toLowerCase())
    const matchAction = actionFilter === 'all' || e.action === actionFilter
    return matchSearch && matchAction
  })

  const exportCsv = () => {
    downloadCsv(`fakturidias-audit-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['When', 'Admin', 'Action', 'Target', 'Details'],
      ...filtered.map(e => [
        new Date(e.createdAt).toISOString(),
        e.adminEmail,
        ACTION_LABELS[e.action] || e.action,
        e.target || '',
        Object.entries(e.details || {}).map(([k, v]) => `${k}=${String(v)}`).join('; '),
      ]),
    ])
  }

  return (
    <>
      <div className="admin-search-bar">
        <input
          className="admin-search-input"
          placeholder="Filter by admin or target…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="admin-plan-select"
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
        >
          <option value="all">All actions</option>
          {actions.map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
          ))}
        </select>
      </div>

      <div className="admin-section-header">
        <div className="admin-section-title">
          <Clock size={ICON_SM} strokeWidth={STROKE} /> Audit log — {filtered.length} / {log.length}
        </div>
        <div className="admin-section-actions">
          <button className="admin-action-btn" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={ICON_SM} strokeWidth={STROKE} /> Export CSV
          </button>
          <button className="admin-action-btn" onClick={load}>
            <RefreshCw size={ICON_SM} strokeWidth={STROKE} /> Refresh
          </button>
        </div>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">Loading…</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e._id}>
                  <td style={{ fontSize: '0.78rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {fmtDateTime(e.createdAt)}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{e.adminEmail}</td>
                  <td>
                    <span className="admin-audit-action">{ACTION_LABELS[e.action] || e.action}</span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--muted)' }}>
                    {e.target || '—'}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--muted2)' }}>
                    {Object.keys(e.details || {}).length
                      ? Object.entries(e.details).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')
                      : '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="admin-empty">No matching log entries</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

// ─── System Tab ───────────────────────────────────────────────────────────────

function HealthRow({ label, ok, value }: { label: string; ok: boolean; value?: string }) {
  return (
    <div className="admin-health-row">
      <span className={`status-dot status-dot--${ok ? 'active' : 'inactive'}`} />
      <span className="admin-health-row__label">{label}</span>
      <span className={`admin-health-row__value ${ok ? '' : 'admin-health-row__value--off'}`}>
        {value || (ok ? 'OK' : 'Not configured')}
      </span>
    </div>
  )
}

function SystemTab() {
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/health')
      if (res.ok) setHealth(await res.json())
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="admin-empty">Loading system status…</div>
  if (!health) return <div className="admin-empty">Could not load system status</div>

  const integ = health.integrations

  return (
    <>
      <div className="admin-section-header">
        <div className="admin-section-title">
          <HeartPulse size={ICON_SM} strokeWidth={STROKE} /> System health
        </div>
        <button className="admin-action-btn" onClick={load}>
          <RefreshCw size={ICON_SM} strokeWidth={STROKE} /> Refresh
        </button>
      </div>

      <div className="admin-health-grid">
        <div className="admin-health-card">
          <div className="admin-health-card__title">
            <Database size={ICON_SM} strokeWidth={STROKE} /> Storage
          </div>
          <HealthRow label="Database" ok={health.db.connected} value={health.db.connected ? 'Connected' : 'Disconnected'} />
          <HealthRow
            label="Mode"
            ok={health.db.mode === 'mongodb'}
            value={health.db.mode === 'mongodb' ? 'MongoDB' : 'JSON file fallback'}
          />
        </div>

        <div className="admin-health-card">
          <div className="admin-health-card__title">
            <Zap size={ICON_SM} strokeWidth={STROKE} /> Integrations
          </div>
          <HealthRow label="Stripe" ok={integ.stripe.ok} value={integ.stripe.note} />
          <HealthRow label="Stripe webhook" ok={integ.stripeWebhook.ok} value={integ.stripeWebhook.note} />
          <HealthRow label="Resend (email)" ok={integ.resend.ok} value={integ.resend.note} />
          <HealthRow label="Google OAuth" ok={integ.googleOAuth.ok} value={integ.googleOAuth.note} />
          <HealthRow label="Vertex AI" ok={integ.vertexAI.ok} value={integ.vertexAI.note} />
        </div>

        <div className="admin-health-card">
          <div className="admin-health-card__title">
            <Activity size={ICON_SM} strokeWidth={STROKE} /> Runtime
          </div>
          <div className="admin-kv">
            <div className="admin-kv__row"><span>Environment</span><b>{health.runtime.env}</b></div>
            <div className="admin-kv__row"><span>Node</span><b>{health.runtime.nodeVersion}</b></div>
            <div className="admin-kv__row"><span>Platform</span><b>{health.runtime.platform}</b></div>
            <div className="admin-kv__row"><span>Uptime</span><b>{fmtUptime(health.runtime.uptimeSeconds)}</b></div>
            <div className="admin-kv__row"><span>Memory</span><b>{health.runtime.memoryMB} MB</b></div>
            <div className="admin-kv__row"><span>Load avg</span><b>{health.runtime.loadAvg.join(' / ')}</b></div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ isSuper }: { isSuper: boolean }) {
  const [settings, setSettings] = useState<GlobalSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      if (res.ok) setSettings((await res.json()).settings)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!settings) return
    setSaving(true)
    setMsg('')
    const { ok, data } = await apiPostPut('/api/admin/settings', settings)
    setSaving(false)
    if (ok) { setMsg('Settings saved'); setSettings((data.settings as GlobalSettings) || settings) }
    else setMsg(`Error: ${data.error || 'failed'}`)
  }

  if (loading) return <div className="admin-empty">Loading settings…</div>
  if (!settings) return <div className="admin-empty">Could not load settings (DB offline?)</div>

  const fields: { key: keyof GlobalSettings; label: string; hint: string }[] = [
    { key: 'guestInvoiceLimit', label: 'Guest invoice limit', hint: 'Invoices allowed before sign-up is required' },
    { key: 'freeInvoiceLimit', label: 'Free plan invoice limit', hint: 'Invoices allowed on the free plan (enforced server-side)' },
    { key: 'standardInvoiceLimit', label: 'Standard plan invoice limit', hint: 'Reference value for the Standard tier' },
  ]

  return (
    <>
      <div className="admin-section-header">
        <div className="admin-section-title">
          <Settings2 size={ICON_SM} strokeWidth={STROKE} /> Plan limits
        </div>
        <button className="admin-action-btn" onClick={load}>
          <RefreshCw size={ICON_SM} strokeWidth={STROKE} /> Refresh
        </button>
      </div>

      <div className="admin-email__form">
        {fields.map(f => (
          <div className="admin-form-group" key={f.key}>
            <label className="admin-form-label">{f.label}</label>
            <input
              className="admin-form-input"
              type="number"
              min="0"
              disabled={!isSuper}
              value={settings[f.key]}
              onChange={e => setSettings(s => s ? { ...s, [f.key]: Number(e.target.value) } : s)}
            />
            <div className="admin-drawer__hint">{f.hint}</div>
          </div>
        ))}

        {msg && (
          <div className={`admin-drawer__msg ${msg.startsWith('Error') ? 'admin-drawer__msg--err' : ''}`}>
            {msg}
          </div>
        )}

        <div className="admin-form-actions">
          <button
            className="admin-action-btn admin-action-btn--primary"
            disabled={saving || !isSuper}
            onClick={save}
          >
            <Check size={ICON_SM} strokeWidth={STROKE} />
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {!isSuper && (
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              Super-admin access required to edit.
            </span>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Webhooks Tab ─────────────────────────────────────────────────────────────

function WebhooksTab() {
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/webhooks')
      if (res.ok) setEvents((await res.json()).events || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const replay = async (id: string) => {
    if (!window.confirm('Replay this webhook event? It will re-apply to subscription state.')) return
    setBusy(id)
    const { ok, data } = await apiPost('/api/admin/webhooks/replay', { id })
    setBusy(null)
    if (ok) load()
    else alert(`Error: ${data.error || 'failed'}`)
  }

  return (
    <>
      <div className="admin-section-header">
        <div className="admin-section-title">
          <Plug size={ICON_SM} strokeWidth={STROKE} /> Stripe webhook events — {events.length}
        </div>
        <button className="admin-action-btn" onClick={load}>
          <RefreshCw size={ICON_SM} strokeWidth={STROKE} /> Refresh
        </button>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">Loading…</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th><th>Type</th><th>Status</th><th>Event ID</th><th>Error</th><th></th>
              </tr>
            </thead>
            <tbody>
              {events.map(e => (
                <tr key={e._id}>
                  <td style={{ fontSize: '0.78rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {fmtDateTime(e.createdAt)}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{e.type}</td>
                  <td><span className={`admin-sched-status admin-sched-status--${e.status}`}>{e.status}</span></td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.74rem', color: 'var(--muted)' }}>{e.eventId || '—'}</td>
                  <td style={{ fontSize: '0.76rem', color: 'var(--danger)' }}>{e.error || '—'}</td>
                  <td>
                    <button
                      className="admin-action-btn"
                      disabled={busy === e._id}
                      onClick={() => replay(e._id)}
                    >
                      <RotateCcw size={ICON_SM} strokeWidth={STROKE} />
                      {busy === e._id ? '…' : 'Replay'}
                    </button>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr><td colSpan={6} className="admin-empty">No webhook events recorded yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

// ─── Main AdminDashboard component ───────────────────────────────────────────

type TabId = 'overview' | 'users' | 'promos' | 'email' | 'audit' | 'system' | 'settings' | 'webhooks'

export default function AdminDashboard() {
  const [tab, setTab] = useState<TabId>('overview')
  const [users, setUsers] = useState<UserStat[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawerUser, setDrawerUser] = useState<string | null>(null)
  const [role, setRole] = useState<AdminRole>({ isSuper: false })

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const [usersRes, analyticsRes, checkRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/analytics'),
        fetch('/api/admin/check'),
      ])
      if (usersRes.ok) setUsers((await usersRes.json()).users)
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json())
      if (checkRes.ok) {
        const c = await checkRes.json()
        setRole({ isSuper: !!c.isSuper })
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const tabs: { id: TabId; label: string; icon: ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity size={ICON_SM} strokeWidth={STROKE} /> },
    { id: 'users', label: 'Users', icon: <Users size={ICON_SM} strokeWidth={STROKE} /> },
    { id: 'promos', label: 'Promo Codes', icon: <Tag size={ICON_SM} strokeWidth={STROKE} /> },
    { id: 'email', label: 'Email', icon: <Mail size={ICON_SM} strokeWidth={STROKE} /> },
    { id: 'webhooks', label: 'Webhooks', icon: <Plug size={ICON_SM} strokeWidth={STROKE} /> },
    { id: 'audit', label: 'Audit Log', icon: <Clock size={ICON_SM} strokeWidth={STROKE} /> },
    { id: 'settings', label: 'Settings', icon: <Settings2 size={ICON_SM} strokeWidth={STROKE} /> },
    { id: 'system', label: 'System', icon: <HeartPulse size={ICON_SM} strokeWidth={STROKE} /> },
  ]

  return (
    <div className="admin-dashboard">
      <div className="admin-topbar">
        <div className="admin-topbar__title">
          <Shield size={ICON_MD} strokeWidth={STROKE} style={{ color: 'var(--accent)' }} />
          Admin Dashboard
          <span className="admin-topbar__badge">{role.isSuper ? 'Super Admin' : 'Admin'}</span>
        </div>
      </div>

      <div className="admin-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`admin-tab ${tab === t.id ? 'admin-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {loading && tab === 'overview' ? (
        <div className="admin-empty">Loading data...</div>
      ) : (
        <>
          {tab === 'overview' && <OverviewTab users={users} analytics={analytics} onOpenUser={setDrawerUser} />}
          {tab === 'users' && <UsersTab users={users} onRefresh={loadUsers} onOpenUser={setDrawerUser} isSuper={role.isSuper} />}
          {tab === 'promos' && <PromosTab />}
          {tab === 'email' && <EmailTab />}
          {tab === 'webhooks' && <WebhooksTab />}
          {tab === 'audit' && <AuditTab />}
          {tab === 'settings' && <SettingsTab isSuper={role.isSuper} />}
          {tab === 'system' && <SystemTab />}
        </>
      )}

      {drawerUser && (
        <UserDetailDrawer
          email={drawerUser}
          onClose={() => setDrawerUser(null)}
          onChanged={loadUsers}
          isSuper={role.isSuper}
        />
      )}
    </div>
  )
}
