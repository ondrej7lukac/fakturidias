import './AdminDashboard.css'
import { useState, useEffect, useCallback } from 'react'
import {
  Shield, Users, Tag, Trash2, Crown, UserCheck, Activity,
  Copy, ToggleLeft, ToggleRight, Zap, BadgeCheck, Search,
  Plus, X, Check, RefreshCw,
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string | number | null) {
  if (!d) return '—'
  return new Date(typeof d === 'number' ? d * 1000 : d)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
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
    : status === 'canceled' ? 'canceled'
    : status === 'trialing' ? 'trialing'
    : 'inactive'
  return <span className={`status-dot status-dot--${cls}`} title={status} />
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ users, analytics }: { users: UserStat[]; analytics: Analytics | null }) {
  const total = users.length
  const paid = users.filter(u => ['standard', 'max', 'pro'].includes(u.plan) && u.status === 'active').length
  const maxPlan = users.filter(u => u.plan === 'max' && u.status === 'active').length
  const free = total - paid
  const totalInvoices = users.reduce((s, u) => s + u.invoiceCount, 0)

  const planCounts = analytics?.plans || {}
  const planTotal = Object.values(planCounts).reduce((a, b) => a + b, 0) || 1

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
        <div className="admin-stat-card">
          <div className="admin-stat-card__label">Total invoices</div>
          <div className="admin-stat-card__value">{totalInvoices}</div>
          <div className="admin-stat-card__sub">Across all users</div>
        </div>
      </div>

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

      <div className="admin-overview-grid">
        <div>
          <div className="admin-section-header">
            <div className="admin-section-title">Recent activity</div>
          </div>
          <div className="admin-activity-list">
            {(analytics?.recentSignups || users.slice(0, 10)).map(u => (
              <div key={u.email} className="admin-activity-item">
                <div className="admin-activity-item__email">{u.email}</div>
                <div className="admin-activity-item__plan">
                  <PlanPill plan={u.plan} />
                </div>
                <div className="admin-activity-item__date">{fmtDate(u.lastActivity)}</div>
              </div>
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
              <div key={u.email} className="admin-activity-item">
                <div className="admin-activity-item__email">{u.email}</div>
                <div className="admin-activity-item__plan">
                  <PlanPill plan={u.plan} />
                </div>
                <div className="admin-activity-item__date">{u.invoiceCount} invoices</div>
              </div>
            ))}
            {users.length === 0 && <div className="admin-empty">No users yet</div>}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab({ users, onRefresh }: { users: UserStat[]; onRefresh: () => void }) {
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
    try {
      const res = await fetch('/api/admin/users/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan, durationDays: days }),
      })
      if (res.ok) { onRefresh(); setPendingPlan(p => { const n = { ...p }; delete n[email]; return n }) }
      else alert('Failed to update plan')
    } catch { alert('Error updating plan') }
    setLoading(null)
  }

  const handleDelete = async (email: string) => {
    setLoading(email)
    try {
      const res = await fetch('/api/admin/users/data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) { onRefresh(); setConfirmDelete(null) }
      else { const d = await res.json(); alert(d.error || 'Failed to delete') }
    } catch { alert('Error deleting user') }
    setLoading(null)
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
        <button className="admin-action-btn" onClick={onRefresh}>
          <RefreshCw size={ICON_SM} strokeWidth={STROKE} /> Refresh
        </button>
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
                  {confirmDelete === u.email ? (
                    <div className="admin-confirm-row">
                      <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>Delete all data?</span>
                      <button
                        className="admin-action-btn admin-action-btn--danger"
                        disabled={loading === u.email}
                        onClick={() => handleDelete(u.email)}
                      >Yes</button>
                      <button
                        className="admin-action-btn"
                        onClick={() => setConfirmDelete(null)}
                      >No</button>
                    </div>
                  ) : (
                    <button
                      className="admin-action-btn admin-action-btn--danger"
                      onClick={() => setConfirmDelete(u.email)}
                    >
                      <Trash2 size={ICON_SM} strokeWidth={STROKE} />
                    </button>
                  )}
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

// ─── Promos Tab ───────────────────────────────────────────────────────────────

const emptyPromoForm = {
  code: '', description: '', planGrant: '', discountPercent: '0',
  durationDays: '30', maxUses: '', expiresAt: '',
}

function PromosTab() {
  const [promos, setPromos] = useState<Promo[]>([])
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
      const res = await fetch('/api/admin/promos')
      if (res.ok) setPromos((await res.json()).promos)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.code) return alert('Code is required')
    setSaving(true)
    try {
      const res = await fetch('/api/admin/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.toUpperCase(),
          description: form.description,
          planGrant: form.planGrant || null,
          discountPercent: Number(form.discountPercent) || 0,
          durationDays: Number(form.durationDays) || 30,
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          expiresAt: form.expiresAt || null,
        }),
      })
      const data = await res.json()
      if (res.ok) { setShowForm(false); setForm({ ...emptyPromoForm }); load() }
      else alert(data.error || 'Failed to create promo')
    } catch { alert('Error') }
    setSaving(false)
  }

  const handleToggle = async (promo: Promo) => {
    await fetch('/api/admin/promos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: promo.code, active: !promo.active }),
    })
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
    try {
      const res = await fetch('/api/admin/promos/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: applyModal.code, userEmail: applyEmail }),
      })
      const data = await res.json()
      if (res.ok) {
        setApplyResult(`Applied! Granted ${data.planGranted || '—'} for ${data.durationDays} days.`)
        load()
      } else {
        setApplyResult(`Error: ${data.error}`)
      }
    } catch { setApplyResult('Network error') }
    setSaving(false)
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
                <th>Expires</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {promos.map(p => (
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
              ))}
              {promos.length === 0 && (
                <tr><td colSpan={9} className="admin-empty">No promo codes yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Apply promo modal */}
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
              <div style={{
                marginTop: '0.8rem',
                padding: '0.6rem 1rem',
                borderRadius: 10,
                background: applyResult.startsWith('Error') ? 'var(--danger-soft)' : 'var(--success-bg)',
                color: applyResult.startsWith('Error') ? 'var(--danger)' : 'var(--accent)',
                fontSize: '0.84rem',
              }}>
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

// ─── Main AdminDashboard component ───────────────────────────────────────────

export default function AdminDashboard() {
  const [tab, setTab] = useState<'overview' | 'users' | 'promos'>('overview')
  const [users, setUsers] = useState<UserStat[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const [usersRes, analyticsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/analytics'),
      ])
      if (usersRes.ok) setUsers((await usersRes.json()).users)
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: <Activity size={ICON_SM} strokeWidth={STROKE} /> },
    { id: 'users' as const, label: 'Users', icon: <Users size={ICON_SM} strokeWidth={STROKE} /> },
    { id: 'promos' as const, label: 'Promo Codes', icon: <Tag size={ICON_SM} strokeWidth={STROKE} /> },
  ]

  return (
    <div className="admin-dashboard">
      <div className="admin-topbar">
        <div className="admin-topbar__title">
          <Shield size={ICON_MD} strokeWidth={STROKE} style={{ color: 'var(--accent)' }} />
          Admin Dashboard
          <span className="admin-topbar__badge">Admin</span>
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
          {tab === 'overview' && <OverviewTab users={users} analytics={analytics} />}
          {tab === 'users' && <UsersTab users={users} onRefresh={loadUsers} />}
          {tab === 'promos' && <PromosTab />}
        </>
      )}
    </div>
  )
}
