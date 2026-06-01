import './Expenses.css';
import { useEffect, useMemo, useState } from 'react';
import { Wallet, RefreshCw, ICON_MD, ICON_SM, STROKE } from '@/lib/icons';
import {
  getReceivedInvoices,
  money,
  type ReceivedInvoice,
} from '../utils/storage';

interface ExpensesProps {
  lang: string;
}

// Derive an amount from the AI-parsed bill: prefer an explicit total, else sum
// the line items (qty × price × VAT).
function expenseAmount(parsed: unknown): number {
  if (!parsed || typeof parsed !== 'object') return 0;
  const p = parsed as { total?: unknown; items?: unknown[] };
  const total = Number(p.total);
  if (!Number.isNaN(total) && total > 0) return total;
  const items = Array.isArray(p.items) ? p.items : [];
  return items.reduce((sum: number, raw) => {
    const it = raw as { qty?: unknown; price?: unknown; taxRate?: unknown };
    const qty = Number(it.qty) || 0;
    const price = Number(it.price) || 0;
    const tax = Number(it.taxRate) || 0;
    return sum + qty * price * (1 + tax / 100);
  }, 0);
}

function fmtDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toISOString().split('T')[0];
}

export default function Expenses({ lang }: ExpensesProps) {
  const isCz = lang === 'cs';
  const [items, setItems] = useState<ReceivedInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setItems(await getReceivedInvoices());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(
    () =>
      items
        .filter((r) => r.status !== 'rejected')
        .map((r) => ({ ...r, amount: expenseAmount(r.parsed) })),
    [items],
  );
  const total = useMemo(
    () => rows.reduce((sum, r) => sum + r.amount, 0),
    [rows],
  );

  return (
    <div className="expenses-view">
      <header className="expenses-header">
        <Wallet size={ICON_MD} strokeWidth={STROKE} />
        <div>
          <h2>{isCz ? 'Výdaje' : 'Expenses'}</h2>
          <p className="expenses-sub">
            {isCz
              ? 'Přijaté faktury z e-mailové schránky jako evidence výdajů.'
              : 'Bills received in your invoice mailbox, tracked as expenses.'}
          </p>
        </div>
        <button className="ap-btn ap-btn--ghost expenses-refresh" onClick={load}>
          <RefreshCw size={ICON_SM} strokeWidth={STROKE} />
          {isCz ? 'Obnovit' : 'Refresh'}
        </button>
      </header>

      <div className="expenses-summary">
        <div className="expenses-summary__label">
          {isCz ? 'Celkem výdajů' : 'Total expenses'}
        </div>
        <div className="expenses-summary__value">{money(total)}</div>
        <div className="expenses-summary__count">
          {rows.length} {isCz ? 'položek' : 'items'}
        </div>
      </div>

      <div className="ap-card expenses-table-card">
        {loading ? (
          <p className="expenses-empty">{isCz ? 'Načítám…' : 'Loading…'}</p>
        ) : rows.length === 0 ? (
          <p className="expenses-empty">
            {isCz
              ? 'Zatím žádné přijaté faktury. Přeposílejte faktury do své schránky.'
              : 'No received bills yet. Forward invoices to your mailbox.'}
          </p>
        ) : (
          <table className="expenses-table">
            <thead>
              <tr>
                <th>{isCz ? 'Datum' : 'Date'}</th>
                <th>{isCz ? 'Dodavatel' : 'Supplier'}</th>
                <th>{isCz ? 'Předmět' : 'Subject'}</th>
                <th>{isCz ? 'Stav' : 'Status'}</th>
                <th className="expenses-table__num">
                  {isCz ? 'Částka' : 'Amount'}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.receivedAt)}</td>
                  <td>{r.fromName || r.from}</td>
                  <td className="expenses-table__subject">{r.subject}</td>
                  <td>
                    <span className={`expenses-pill expenses-pill--${r.status}`}>
                      {r.status === 'approved'
                        ? isCz
                          ? 'Schváleno'
                          : 'Approved'
                        : isCz
                          ? 'Čeká'
                          : 'Pending'}
                    </span>
                  </td>
                  <td className="expenses-table__num">{money(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
