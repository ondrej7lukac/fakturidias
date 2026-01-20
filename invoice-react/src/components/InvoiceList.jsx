import { useState } from 'react'
import { money } from '../utils/storage'

export default function InvoiceList({
    invoices,
    categories,
    onSelect,
    onDelete,
    selectedId,
    lang,
    t
}) {
    const [searchText, setSearchText] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [filterCategory, setFilterCategory] = useState('all')

    const getStatusClass = (status) => {
        return `pill ${status || 'draft'}`
    }

    const filteredInvoices = invoices.filter(inv => {
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

    const translateStatus = (status) => {
        switch (status) {
            case 'draft': return t.draft
            case 'sent': return t.sent
            case 'paid': return t.paid
            case 'overdue': return t.overdue
            default: return status
        }
    }

    return (
        <section className="card" style={{ marginBottom: '20px' }}>
            <h2>{t.invoices}</h2>
            <div className="grid two">
                <div>
                    <label htmlFor="searchText">{t.search}</label>
                    <input
                        id="searchText"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Invoice #, client, area"
                    />
                </div>
                <div>
                    <label htmlFor="filterStatus">{t.status}</label>
                    <select
                        id="filterStatus"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">{t.all}</option>
                        <option value="draft">{t.draft}</option>
                        <option value="sent">{t.sent}</option>
                        <option value="paid">{t.paid}</option>
                        <option value="overdue">{t.overdue}</option>
                    </select>
                </div>
            </div>
            <div className="grid">
                <div>
                    <label htmlFor="filterCategory">{t.category}</label>
                    <select
                        id="filterCategory"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
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
                        <div key={inv.id} className={`invoice-item ${selectedId === inv.id ? 'active' : ''}`} onClick={() => onSelect(inv.id)} style={{ cursor: 'pointer', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', background: 'var(--card)', marginBottom: '0.5rem', transition: 'all 0.2s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <strong style={{ fontSize: '1rem' }}>{inv.invoiceNumber}</strong>
                                <span className={getStatusClass(inv.status)}>{translateStatus(inv.status)}</span>
                            </div>
                            <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{inv.client.name}</div>
                            <div className="invoice-meta" style={{ marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                                {inv.currency} {money(inv.amount)} • {inv.client.area || (lang === 'cs' ? 'Bez oblasti' : 'No area')}
                            </div>
                            <div className="actions" style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    type="button"
                                    className="secondary"
                                    onClick={(e) => { e.stopPropagation(); onSelect(inv.id); }}
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                                >
                                    {lang === 'cs' ? 'Otevřít' : 'Open'}
                                </button>
                                <button
                                    type="button"
                                    className="danger"
                                    onClick={(e) => { e.stopPropagation(); onDelete(inv.id); }}
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', marginLeft: 'auto' }}
                                >
                                    {lang === 'cs' ? 'Smazat' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
    )
}
