import { useState, useMemo, Fragment } from 'react';
import { money } from '../utils/storage';
import StatusBadge from './StatusBadge';
import InvoiceForm from './InvoiceForm';
import './InvoiceDashboard.css';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';

const STATUS_COLORS = {
  draft: '#94a3b8',
  sent: '#3b82f6',
  paid: '#10b981',
  overdue: '#ef4444',
};

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────
function BarChart({ invoices, lang }) {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString(lang === 'cs' ? 'cs-CZ' : 'en-US', {
        month: 'short',
        year: '2-digit',
      }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }

  const data = months.map((m) => {
    const total = invoices
      .filter((inv) => {
        const d = new Date(inv.issueDate);
        return d.getFullYear() === m.year && d.getMonth() === m.month;
      })
      .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
    return { ...m, total };
  });

  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const W = 660,
    H = 180,
    padL = 60,
    padB = 36,
    padT = 16,
    padR = 10;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW = Math.max(8, chartW / 12 - 6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className='dashboard-bar-chart-svg'>
      {/* Y gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padT + chartH * (1 - t);
        const val = maxVal * t;
        return (
          <g key={t}>
            <line
              x1={padL}
              y1={y}
              x2={W - padR}
              y2={y}
              stroke='var(--border)'
              strokeWidth='1'
            />
            <text
              x={padL - 6}
              y={y + 4}
              textAnchor='end'
              fontSize='10'
              fill='var(--muted)'
            >
              {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}
            </text>
          </g>
        );
      })}
      {/* Bars */}
      {data.map((d, i) => {
        const x = padL + (chartW / 12) * i + (chartW / 12 - barW) / 2;
        const barH = (d.total / maxVal) * chartH;
        const y = padT + chartH - barH;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(barH, 1)}
              rx='3'
              fill={d.total > 0 ? 'var(--accent)' : 'var(--border)'}
              opacity={d.total > 0 ? 0.85 : 1}
            />
            <text
              x={x + barW / 2}
              y={H - 4}
              textAnchor='middle'
              fontSize='9'
              fill='var(--muted)'
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── SVG Donut Chart ─────────────────────────────────────────────────────────
function DonutChart({ invoices, lang }) {
  const statuses = ['draft', 'sent', 'paid', 'overdue'];
  const labels = {
    cs: {
      draft: 'Rozepsaná',
      sent: 'Odeslaná',
      paid: 'Zaplacená',
      overdue: 'Po splatnosti',
    },
    en: { draft: 'Draft', sent: 'Sent', paid: 'Paid', overdue: 'Overdue' },
  };
  const lbl = labels[lang] || labels.en;

  const counts = statuses
    .map((s) => ({
      status: s,
      count: invoices.filter((inv) => (inv.status || 'draft') === s).length,
      label: lbl[s],
      color: STATUS_COLORS[s],
    }))
    .filter((d) => d.count > 0);

  const total = counts.reduce((s, c) => s + c.count, 0);
  if (total === 0) {
    return (
      <div className='dashboard-donut-empty'>
        {lang === 'cs' ? 'Žádná data' : 'No data'}
      </div>
    );
  }

  const R = 50,
    cx = 70,
    cy = 70,
    stroke = 28;
  let startAngle = -Math.PI / 2;

  const arcs = counts.map((d) => {
    const fraction = d.count / total;
    const angle = fraction * 2 * Math.PI;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    startAngle += angle;
    const x2 = cx + R * Math.cos(startAngle);
    const y2 = cy + R * Math.sin(startAngle);
    const large = angle > Math.PI ? 1 : 0;
    return { ...d, x1, y1, x2, y2, large, fraction };
  });

  return (
    <div className='dashboard-donut-wrap'>
      <svg viewBox='0 0 140 140' className='dashboard-donut-svg'>
        {arcs.map((a, i) => (
          <path
            key={i}
            d={`M ${a.x1} ${a.y1} A ${R} ${R} 0 ${a.large} 1 ${a.x2} ${a.y2}`}
            fill='none'
            stroke={a.color}
            strokeWidth={stroke}
          />
        ))}
        <text
          x={cx}
          y={cy - 6}
          textAnchor='middle'
          fontSize='18'
          fontWeight='700'
          fill='var(--text)'
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 10}
          textAnchor='middle'
          fontSize='9'
          fill='var(--muted)'
        >
          {lang === 'cs' ? 'faktur' : 'invoices'}
        </text>
      </svg>
      <div className='dashboard-donut-legend'>
        {arcs.map((a, i) => (
          <div key={i} className='dashboard-donut-legend-row'>
            <span
              className='dashboard-donut-dot'
              style={{ background: a.color }}
            />
            <span className='dashboard-donut-label'>{a.label}</span>
            <span className='dashboard-donut-count'>{a.count}</span>
            <span className='dashboard-donut-percent'>
              ({(a.fraction * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function InvoiceDashboard({
  invoices,
  categories,
  onSelect,
  onDelete,
  onSendReminder,
  onStatusChange,
  onClose,
  lang,
  t,
  isAuthenticated,
  // Props for inline editing:
  onSave,
  onAddCategory,
  invoiceCounter,
  invoicesLoaded,
  draftNumber,
  setDraftNumber,
  defaultSupplier,
  setDefaultSupplier,
}) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sortKey, setSortKey] = useState('issueDate');
  const [sortDir, setSortDir] = useState('desc');
  const [sendingId, setSendingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [inlineEditId, setInlineEditId] = useState(null); // ID of invoice being edited inline

  const lbl = {
    cs: {
      dashboard: 'Přehled faktur',
      close: 'Zpět',
      search: 'Hledat (číslo, klient, položka, oblast…)',
      status: 'Stav',
      category: 'Kategorie',
      from: 'Od',
      to: 'Do',
      allStatuses: 'Všechny stavy',
      allCategories: 'Všechny kategorie',
      num: 'Číslo',
      client: 'Klient',
      issued: 'Vystaveno',
      due: 'Splatnost',
      value: 'Hodnota',
      sent: 'Odeslaná',
      actions: 'Akce',
      open: 'Otevřít',
      remind: 'Připomenout',
      delete: 'Smazat',
      yes: 'Ano',
      no: 'Ne',
      noResults: 'Žádné faktury neodpovídají filtru.',
      revenue: 'Příjmy v čase (dle data vystavení)',
      breakdown: 'Přehled stavů',
      reminderSent: 'Připomínka odeslána!',
      reminderFail: 'Odeslání selhalo.',
      confirmDelete: 'Smazat fakturu?',
      totalFiltered: 'Celkem (filtrováno)',
    },
    en: {
      dashboard: 'Invoice Dashboard',
      close: 'Back',
      search: 'Search (number, client, item, area…)',
      status: 'Status',
      category: 'Category',
      from: 'From',
      to: 'To',
      allStatuses: 'All statuses',
      allCategories: 'All categories',
      num: '#',
      client: 'Client',
      issued: 'Issued',
      due: 'Due',
      value: 'Value',
      sent: 'Sent',
      actions: 'Actions',
      open: 'Open',
      remind: 'Remind',
      delete: 'Delete',
      yes: 'Yes',
      no: 'No',
      noResults: 'No invoices match the filter.',
      revenue: 'Revenue over time (by issue date)',
      breakdown: 'Status breakdown',
      reminderSent: 'Reminder sent!',
      reminderFail: 'Failed to send.',
      confirmDelete: 'Delete invoice?',
      totalFiltered: 'Total (filtered)',
    },
  };
  const L = lbl[lang] || lbl.en;

  const statusLabels = {
    cs: {
      draft: 'Rozepsaná',
      sent: 'Odeslaná',
      paid: 'Zaplacená',
      overdue: 'Po splatnosti',
    },
    en: { draft: 'Draft', sent: 'Sent', paid: 'Paid', overdue: 'Overdue' },
  };
  const SL = statusLabels[lang] || statusLabels.en;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      // text search across multiple fields
      const itemNames = (inv.items || [])
        .map((it) => it.name)
        .join(' ')
        .toLowerCase();
      const matchQ =
        !q ||
        (inv.invoiceNumber || '').toLowerCase().includes(q) ||
        (inv.client?.name || '').toLowerCase().includes(q) ||
        (inv.client?.area || '').toLowerCase().includes(q) ||
        (inv.client?.ico || '').toLowerCase().includes(q) ||
        (inv.supplier?.name || '').toLowerCase().includes(q) ||
        (inv.category || '').toLowerCase().includes(q) ||
        itemNames.includes(q);

      const matchStatus =
        filterStatus === 'all' || (inv.status || 'draft') === filterStatus;
      const matchCat =
        filterCategory === 'all' || (inv.category || '') === filterCategory;

      const issueDate = inv.issueDate ? new Date(inv.issueDate) : null;
      const matchFrom =
        !filterDateFrom || (issueDate && issueDate >= new Date(filterDateFrom));
      const matchTo =
        !filterDateTo || (issueDate && issueDate <= new Date(filterDateTo));

      return matchQ && matchStatus && matchCat && matchFrom && matchTo;
    });
  }, [
    invoices,
    search,
    filterStatus,
    filterCategory,
    filterDateFrom,
    filterDateTo,
  ]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va, vb;
      switch (sortKey) {
        case 'invoiceNumber':
          va = a.invoiceNumber || '';
          vb = b.invoiceNumber || '';
          break;
        case 'client':
          va = a.client?.name || '';
          vb = b.client?.name || '';
          break;
        case 'issueDate':
          va = a.issueDate || '';
          vb = b.issueDate || '';
          break;
        case 'dueDate':
          va = a.dueDate || '';
          vb = b.dueDate || '';
          break;
        case 'amount':
          va = Number(a.amount) || 0;
          vb = Number(b.amount) || 0;
          break;
        case 'status':
          va = a.status || '';
          vb = b.status || '';
          break;
        default:
          va = '';
          vb = '';
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const totalValue = filtered.reduce(
    (s, inv) => s + (Number(inv.amount) || 0),
    0,
  );

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ k }) => {
    if (sortKey !== k)
      return (
        <span className='dashboard-sort-icon dashboard-sort-icon-muted'>↕</span>
      );
    return (
      <span className='dashboard-sort-icon'>
        {sortDir === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  // handleRemind and canRemind removed for production deployment

  const isOverdue = (inv) => {
    if (inv.status === 'paid') return false;
    if (!inv.dueDate) return false;
    return new Date(inv.dueDate) < new Date();
  };

  return (
    <div className='invoice-dashboard'>
      {/* Header */}
      <div className='dashboard-header'>
        <h2 className='dashboard-title'>{L.dashboard}</h2>
        <Button
          variant='secondary'
          size='sm'
          className='dashboard-close-btn'
          onClick={onClose}
        >
          {L.close}
        </Button>
      </div>

      {/* Filter Bar */}
      <div className='dashboard-filters'>
        <div className='dashboard-filter-search'>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={L.search}
          />
        </div>
        <div className='dashboard-filter-row'>
          <div>
            <label>{L.status}</label>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value='all'>{L.allStatuses}</option>
              <option value='draft'>{SL.draft}</option>
              <option value='sent'>{SL.sent}</option>
              <option value='paid'>{SL.paid}</option>
              <option value='overdue'>{SL.overdue}</option>
            </Select>
          </div>
          <div>
            <label>{L.category}</label>
            <Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value='all'>{L.allCategories}</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label>{L.from}</label>
            <Input
              type='date'
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label>{L.to}</label>
            <Input
              type='date'
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
            />
          </div>
        </div>
        {/* Summary strip */}
        <div className='dashboard-summary-strip'>
          <span>
            {filtered.length} {lang === 'cs' ? 'faktur' : 'invoices'}
          </span>
          <span className='dash-divider'>|</span>
          <span>
            {L.totalFiltered}:{' '}
            <strong>
              {totalValue.toLocaleString(lang === 'cs' ? 'cs-CZ' : 'en-US', {
                minimumFractionDigits: 2,
              })}{' '}
              Kč
            </strong>
          </span>
        </div>
      </div>

      {/* Invoice Table */}
      <div className='dashboard-table-wrap'>
        {sorted.length === 0 ? (
          <div className='empty'>{L.noResults}</div>
        ) : (
          <table className='dashboard-table'>
            <thead>
              <tr>
                {[
                  ['invoiceNumber', L.num],
                  ['client', L.client],
                  ['issueDate', L.issued],
                  ['dueDate', L.due],
                  ['amount', L.value],
                  ['status', L.status],
                ].map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className='dashboard-sortable-header'
                  >
                    {label}
                    <SortIcon k={key} />
                  </th>
                ))}
                <th>{L.sent}</th>
                <th>{L.actions}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((inv) => {
                const overdue = isOverdue(inv);
                const isExpanded = expandedId === inv.id;
                return (
                  <Fragment key={inv.id}>
                    <tr
                      key={inv.id}
                      className={
                        overdue && inv.status !== 'paid'
                          ? 'row-overdue dashboard-row'
                          : 'dashboard-row'
                      }
                      onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                    >
                      <td>
                        <strong>{inv.invoiceNumber}</strong>
                      </td>
                      <td>
                        <div>{inv.client?.name || '—'}</div>
                        {inv.client?.area && (
                          <div className='dashboard-client-area'>
                            {inv.client.area}
                          </div>
                        )}
                      </td>
                      <td className='dashboard-nowrap'>
                        {inv.issueDate || '—'}
                      </td>
                      <td
                        className={`dashboard-nowrap ${overdue && inv.status !== 'paid' ? 'dashboard-overdue' : ''}`}
                      >
                        {inv.dueDate || '—'}
                        {overdue && inv.status !== 'paid' && (
                          <span className='dashboard-overdue-icon'>⚠️</span>
                        )}
                      </td>
                      <td className='dashboard-nowrap dashboard-value-cell'>
                        {inv.currency || 'CZK'} {money(inv.amount)}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <StatusBadge
                          status={inv.status}
                          invoiceId={inv.id}
                          onStatusChange={onStatusChange}
                          lang={lang}
                        />
                      </td>
                      <td className='dashboard-sent-cell'>
                        {inv.status === 'sent' || inv.status === 'overdue' ? (
                          <span className='dashboard-sent-ok'>✓</span>
                        ) : (
                          <span className='dashboard-sent-na'>—</span>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className='dashboard-row-actions'>
                          <Button
                            variant={isExpanded ? 'default' : 'secondary'}
                            size='sm'
                            className='dashboard-action-btn'
                            onClick={() =>
                              setExpandedId(isExpanded ? null : inv.id)
                            }
                          >
                            {isExpanded ? '▲' : '▼'} {L.open}
                          </Button>
                          {/* Reminder button removed */}
                          <Button
                            variant='destructive'
                            size='sm'
                            className='dashboard-action-btn'
                            onClick={() => {
                              if (window.confirm(L.confirmDelete))
                                onDelete(inv.id);
                            }}
                          >
                            {L.delete}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${inv.id}-detail`} className='row-expanded'>
                        <td colSpan={8} className='dashboard-expanded-cell'>
                          <div className='expanded-row'>
                            {/* Header */}
                            <div className='expanded-row-header'>
                              <span className='expanded-row-title'>
                                {inv.invoiceNumber}
                              </span>
                              <StatusBadge
                                status={inv.status}
                                invoiceId={inv.id}
                                onStatusChange={onStatusChange}
                                lang={lang}
                              />
                              {inlineEditId === inv.id ? (
                                <Button
                                  variant='secondary'
                                  size='sm'
                                  className='expanded-row-toolbar-btn'
                                  onClick={() => setInlineEditId(null)}
                                >
                                  ✕{' '}
                                  {lang === 'cs'
                                    ? 'Zrušit úpravy'
                                    : 'Cancel edit'}
                                </Button>
                              ) : (
                                <Button
                                  variant='default'
                                  size='sm'
                                  className='expanded-row-toolbar-btn'
                                  onClick={() => setInlineEditId(inv.id)}
                                >
                                  ✏️ {lang === 'cs' ? 'Editovat' : 'Edit'}
                                </Button>
                              )}
                            </div>
                            {inlineEditId === inv.id ? (
                              <div className='dashboard-inline-form-shell'>
                                <InvoiceForm
                                  invoice={inv}
                                  categories={categories}
                                  onSave={async (updatedInv) => {
                                    await onSave(updatedInv);
                                    setInlineEditId(null);
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
                              /* Detail Grid */
                              <div className='expanded-row-grid'>
                                {/* Client */}
                                <div className='expanded-section'>
                                  <div className='expanded-section-title'>
                                    {lang === 'cs' ? 'Odběratel' : 'Client'}
                                  </div>
                                  <div>
                                    <strong>{inv.client?.name || '—'}</strong>
                                  </div>
                                  {inv.client?.address && (
                                    <div className='dashboard-muted-sm'>
                                      {inv.client.address}
                                    </div>
                                  )}
                                  {inv.client?.ico && (
                                    <div className='dashboard-body-sm'>
                                      IČO: {inv.client.ico}
                                    </div>
                                  )}
                                  {inv.client?.vat && (
                                    <div className='dashboard-body-sm'>
                                      DIČ: {inv.client.vat}
                                    </div>
                                  )}
                                  {inv.client?.email && (
                                    <div className='dashboard-body-sm'>
                                      {inv.client.email}
                                    </div>
                                  )}
                                  {inv.client?.phone && (
                                    <div className='dashboard-body-sm'>
                                      {inv.client.phone}
                                    </div>
                                  )}
                                </div>
                                {/* Dates & amounts */}
                                <div className='expanded-section'>
                                  <div className='expanded-section-title'>
                                    {lang === 'cs'
                                      ? 'Datum & Částka'
                                      : 'Dates & Amount'}
                                  </div>
                                  <div className='dashboard-dates-block'>
                                    <div>
                                      {lang === 'cs' ? 'Vystaveno' : 'Issued'}:{' '}
                                      <strong>{inv.issueDate || '—'}</strong>
                                    </div>
                                    <div>
                                      {lang === 'cs' ? 'Splatnost' : 'Due'}:{' '}
                                      <strong
                                        className={
                                          isOverdue(inv) &&
                                          inv.status !== 'paid'
                                            ? 'dashboard-overdue'
                                            : ''
                                        }
                                      >
                                        {inv.dueDate || '—'}
                                      </strong>
                                    </div>
                                    {inv.taxableSupplyDate && (
                                      <div>
                                        {lang === 'cs' ? 'DUZP' : 'Tax Supply'}:{' '}
                                        <strong>{inv.taxableSupplyDate}</strong>
                                      </div>
                                    )}
                                    <div className='dashboard-amount-lg'>
                                      {inv.currency || 'CZK'}{' '}
                                      {money(inv.amount)}
                                    </div>
                                    {inv.isVatPayer && (
                                      <div className='dashboard-muted-xs'>
                                        DPH {inv.taxRate}% ={' '}
                                        {money(inv.taxAmount)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {/* Items */}
                                {inv.items && inv.items.length > 0 && (
                                  <div className='expanded-section expanded-section-items'>
                                    <div className='expanded-section-title'>
                                      {lang === 'cs' ? 'Položky' : 'Items'}
                                    </div>
                                    <table className='dashboard-items-table'>
                                      <thead>
                                        <tr className='dashboard-items-header-row'>
                                          <th className='dashboard-items-header-cell'>
                                            {lang === 'cs' ? 'Název' : 'Name'}
                                          </th>
                                          <th className='dashboard-items-header-cell dashboard-items-right'>
                                            Mn.
                                          </th>
                                          <th className='dashboard-items-header-cell dashboard-items-right'>
                                            {lang === 'cs'
                                              ? 'Cena/j.'
                                              : 'Price'}
                                          </th>
                                          <th className='dashboard-items-header-cell dashboard-items-right'>
                                            {lang === 'cs' ? 'Celkem' : 'Total'}
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {inv.items.map((item, i) => (
                                          <tr
                                            key={i}
                                            className='dashboard-items-row'
                                          >
                                            <td className='dashboard-items-cell'>
                                              {item.name}
                                            </td>
                                            <td className='dashboard-items-cell dashboard-items-right'>
                                              {item.qty}
                                            </td>
                                            <td className='dashboard-items-cell dashboard-items-right'>
                                              {money(item.price)}
                                            </td>
                                            <td className='dashboard-items-cell dashboard-items-right dashboard-items-strong'>
                                              {money(item.total)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Charts */}
      <div className='dashboard-charts'>
        <div className='dashboard-chart-card'>
          <h3 className='dashboard-chart-title'>{L.revenue}</h3>
          <BarChart invoices={filtered} lang={lang} />
        </div>
        <div className='dashboard-chart-card'>
          <h3 className='dashboard-chart-title'>{L.breakdown}</h3>
          <DonutChart invoices={filtered} lang={lang} />
        </div>
      </div>
    </div>
  );
}
