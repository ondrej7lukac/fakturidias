import './InvoiceList.css'
import { useState } from 'react'
import { money } from '../utils/storage'
import { BarChart2 } from '@/lib/icons'
import InvoiceDashboard from './InvoiceDashboard'
import StatusBadge from './StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  amount: number
  currency: string
  issueDate?: string
  category?: string
  client: { name: string; area?: string }
}

interface InvoiceListProps {
  invoices: Invoice[]
  categories: string[]
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onSendReminder?: (id: string) => void
  onStatusChange: (id: string, status: string) => void
  selectedId?: string | null
  lang: string
  t: Record<string, string>
  isAuthenticated: boolean
  dashboardOpen: boolean
  setDashboardOpen: (open: boolean) => void
  onSave: (invoice: unknown) => void
  onAddCategory: (cat: string) => void
  invoiceCounter: number
  invoicesLoaded: boolean
  draftNumber: string
  setDraftNumber: (n: string) => void
  defaultSupplier: unknown
  setDefaultSupplier: (fn: (prev: unknown) => unknown) => void
}

export default function InvoiceList({
  invoices,
  categories,
  onSelect,
  onDelete,
  onSendReminder,
  onStatusChange,
  selectedId,
  lang,
  t,
  isAuthenticated,
  dashboardOpen,
  setDashboardOpen,
  onSave,
  onAddCategory,
  invoiceCounter,
  invoicesLoaded,
  draftNumber,
  setDraftNumber,
  defaultSupplier,
  setDefaultSupplier,
}: InvoiceListProps) {
  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')

  const sortedInvoices = [...invoices].reverse()

  const filteredInvoices = sortedInvoices.filter(inv => {
    const query = searchText.trim().toLowerCase()
    const matchQuery =
      !query ||
      inv.invoiceNumber.toLowerCase().includes(query) ||
      inv.client.name.toLowerCase().includes(query) ||
      (inv.client.area || '').toLowerCase().includes(query)
    const matchStatus = filterStatus === 'all' || inv.status === filterStatus
    const matchCategory = filterCategory === 'all' || (inv.category || '') === filterCategory
    return matchQuery && matchStatus && matchCategory
  })

  if (dashboardOpen) {
    return (
      <InvoiceDashboard
        invoices={invoices}
        categories={categories}
        onSelect={onSelect}
        onDelete={onDelete}
        onSendReminder={onSendReminder}
        onStatusChange={onStatusChange}
        onClose={() => setDashboardOpen(false)}
        lang={lang}
        t={t}
        isAuthenticated={isAuthenticated}
        onSave={onSave}
        onAddCategory={onAddCategory}
        invoiceCounter={invoiceCounter}
        invoicesLoaded={invoicesLoaded}
        draftNumber={draftNumber}
        setDraftNumber={setDraftNumber}
        defaultSupplier={defaultSupplier}
        setDefaultSupplier={setDefaultSupplier}
      />
    )
  }

  return (
    <section className="card" style={{ marginBottom: '20px' }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="m-0">{t.invoices}</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDashboardOpen(true)}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <BarChart2 size={16} strokeWidth={2} className="mr-1" /> {lang === 'cs' ? 'Přehled' : 'Dashboard'}
        </Button>
      </div>

      <div className="grid two mb-3">
        <div>
          <label htmlFor="searchText">{t.search}</label>
          <Input
            id="searchText"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Invoice #, client, area"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>
        <div>
          <label htmlFor="filterStatus">{t.status}</label>
          <select
            id="filterStatus"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">{t.all}</option>
            <option value="draft">{t.draft}</option>
            <option value="sent">{t.sent}</option>
            <option value="paid">{t.paid}</option>
            <option value="overdue">{t.overdue}</option>
          </select>
        </div>
      </div>

      <div className="grid mb-3">
        <div>
          <label htmlFor="filterCategory">{t.category}</label>
          <select
            id="filterCategory"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="all">{lang === 'cs' ? 'Všechny kategorie' : 'All categories'}</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="list">
        {filteredInvoices.length === 0 ? (
          <div className="empty">{lang === 'cs' ? 'Nenalezeny žádné faktury.' : 'No invoices found.'}</div>
        ) : (
          filteredInvoices.map(inv => (
            <div
              key={inv.id}
              className={`invoice-item ${selectedId === inv.id ? 'active' : ''}`}
              onClick={() => onSelect(inv.id)}
              style={{ cursor: 'pointer', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', background: 'var(--card)', marginBottom: '0.5rem', transition: 'all 0.2s ease' }}
            >
              <div className="flex justify-between items-center mb-2">
                <strong className="text-base">{inv.invoiceNumber}</strong>
                <StatusBadge status={inv.status} invoiceId={inv.id} onStatusChange={onStatusChange} lang={lang} />
              </div>
              <div className="font-medium mb-1">{inv.client.name}</div>
              <div className="invoice-meta mb-3 text-sm opacity-70">
                {inv.currency} {money(inv.amount)} • {inv.client.area || (lang === 'cs' ? 'Bez oblasti' : 'No area')}
                {inv.issueDate && <span className="ml-2">• {lang === 'cs' ? 'Vystaveno' : 'Issued'}: {inv.issueDate}</span>}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={e => { e.stopPropagation(); onSelect(inv.id) }}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.75rem' }}
                >
                  {lang === 'cs' ? 'Otevřít' : 'Open'}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={e => { e.stopPropagation(); onDelete(inv.id) }}
                  className="ml-auto text-xs"
                >
                  {lang === 'cs' ? 'Smazat' : 'Delete'}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
