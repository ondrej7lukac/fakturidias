import './Recurring.css';
import { useEffect, useState } from 'react';
import {
  RefreshCw,
  Plus,
  Trash2,
  Calendar,
  Send,
  Clock,
  ICON_SM,
  ICON_MD,
  STROKE,
} from '@/lib/icons';
import { useLiveActivity } from '@/contexts/activity';
import {
  getRecurringTemplates,
  saveRecurringTemplate,
  deleteRecurringTemplate,
  money,
  type RecurringTemplate,
  type RecurringCadence,
} from '../utils/storage';

interface SourceInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  client?: { name?: string };
}

interface RecurringProps {
  lang: string;
  t: Record<string, string>;
  invoices: SourceInvoice[];
  isPro: boolean;
}

const CADENCES: RecurringCadence[] = [
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
];

function cadenceLabel(cadence: RecurringCadence, isCz: boolean): string {
  const map: Record<RecurringCadence, [string, string]> = {
    weekly: ['Týdně', 'Weekly'],
    monthly: ['Měsíčně', 'Monthly'],
    quarterly: ['Čtvrtletně', 'Quarterly'],
    yearly: ['Ročně', 'Yearly'],
  };
  return isCz ? map[cadence][0] : map[cadence][1];
}

function formatRunDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toISOString().split('T')[0];
}

export default function Recurring({ lang, invoices, isPro }: RecurringProps) {
  const isCz = lang === 'cs';
  const { announce } = useLiveActivity();
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [sourceId, setSourceId] = useState('');
  const [cadence, setCadence] = useState<RecurringCadence>('monthly');
  const [intervalCount, setIntervalCount] = useState(1);
  const [dueDays, setDueDays] = useState(14);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [autoSend, setAutoSend] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadTemplates() {
    try {
      setTemplates(await getRecurringTemplates());
      setError('');
    } catch {
      setError(isCz ? 'Nepodařilo se načíst' : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    const source = invoices.find((inv) => inv.id === sourceId);
    if (!source) {
      setError(isCz ? 'Vyberte zdrojovou fakturu' : 'Pick a source invoice');
      return;
    }
    setSaving(true);
    announce({
      kind: 'processing',
      label: isCz ? 'Vytvářím šablonu…' : 'Creating template…',
    });
    try {
      await saveRecurringTemplate({
        name: source.client?.name || source.invoiceNumber,
        cadence,
        intervalCount,
        dueDays,
        autoSend,
        nextRunAt: new Date(startDate).toISOString(),
        template: source as unknown as Record<string, unknown>,
      });
      setSourceId('');
      setAutoSend(false);
      await loadTemplates();
      setError('');
      announce({
        kind: 'done',
        label: isCz
          ? 'Opakovaná faktura vytvořena'
          : 'Recurring template created',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setError(message);
      announce({
        kind: 'error',
        label: isCz ? 'Chyba při ukládání' : 'Failed to save',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      announce({
        kind: 'info',
        label: isCz ? 'Šablona smazána' : 'Template deleted',
      });
      await deleteRecurringTemplate(id);
      setTemplates((prev) => prev.filter((tpl) => tpl.id !== id));
    } catch {
      setError(isCz ? 'Nepodařilo se smazat' : 'Failed to delete');
    }
  }

  return (
    <div className='recurring-view'>
      <header className='recurring-header'>
        <RefreshCw size={ICON_MD} strokeWidth={STROKE} />
        <div>
          <h2>{isCz ? 'Opakované faktury' : 'Recurring invoices'}</h2>
          <p className='recurring-sub'>
            {isCz
              ? 'Automaticky vystavujte faktury podle plánu.'
              : 'Automatically issue invoices on a schedule.'}
          </p>
        </div>
      </header>

      {!isPro && (
        <div className='recurring-banner'>
          {isCz
            ? 'Opakované faktury jsou součástí plánu Pro. Šablonu si můžete připravit, ale automatické vystavování vyžaduje Pro.'
            : 'Recurring invoices are a Pro feature. You can prepare a template, but automatic issuing requires Pro.'}
        </div>
      )}

      <section className='ap-card recurring-form'>
        <h3 className='ap-card__title'>
          <Plus size={ICON_MD} strokeWidth={STROKE} />
          {isCz ? 'Nová šablona' : 'New template'}
        </h3>
        <div className='ap-grid ap-grid--3'>
          <div className='ap-field'>
            <label>{isCz ? 'Zdrojová faktura' : 'Source invoice'}</label>
            <select
              className='ap-select'
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
            >
              <option value=''>{isCz ? '— vyberte —' : '— select —'}</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} · {inv.client?.name || '—'} ·{' '}
                  {money(inv.amount)} {inv.currency}
                </option>
              ))}
            </select>
          </div>
          <div className='ap-field'>
            <label>{isCz ? 'Frekvence' : 'Frequency'}</label>
            <select
              className='ap-select'
              value={cadence}
              onChange={(e) => setCadence(e.target.value as RecurringCadence)}
            >
              {CADENCES.map((c) => (
                <option key={c} value={c}>
                  {cadenceLabel(c, isCz)}
                </option>
              ))}
            </select>
          </div>
          <div className='ap-field'>
            <label>{isCz ? 'Interval (každých)' : 'Every (interval)'}</label>
            <input
              className='ap-input'
              type='number'
              min={1}
              value={intervalCount}
              onChange={(e) =>
                setIntervalCount(Math.max(1, Number(e.target.value) || 1))
              }
            />
          </div>
          <div className='ap-field'>
            <label>{isCz ? 'První vystavení' : 'First run'}</label>
            <input
              className='ap-input'
              type='date'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className='ap-field'>
            <label>{isCz ? 'Splatnost (dní)' : 'Due in (days)'}</label>
            <input
              className='ap-input'
              type='number'
              min={0}
              value={dueDays}
              onChange={(e) =>
                setDueDays(Math.max(0, Number(e.target.value) || 0))
              }
            />
          </div>
          <div className='ap-field recurring-checkbox'>
            <label>
              <input
                type='checkbox'
                checked={autoSend}
                onChange={(e) => setAutoSend(e.target.checked)}
              />
              <Send size={ICON_SM} strokeWidth={STROKE} />
              {isCz ? 'Automaticky odeslat e-mailem' : 'Auto-send by email'}
            </label>
          </div>
        </div>
        <div className='recurring-form__actions'>
          <button
            className='btn btn--primary'
            onClick={handleCreate}
            disabled={saving || !sourceId}
          >
            {saving
              ? isCz
                ? 'Ukládám…'
                : 'Saving…'
              : isCz
                ? 'Vytvořit šablonu'
                : 'Create template'}
          </button>
        </div>
      </section>

      {error && <div className='recurring-error'>{error}</div>}

      <section className='recurring-list'>
        {loading ? (
          <p className='recurring-empty'>{isCz ? 'Načítám…' : 'Loading…'}</p>
        ) : templates.length === 0 ? (
          <p className='recurring-empty'>
            {isCz
              ? 'Zatím žádné opakované faktury.'
              : 'No recurring invoices yet.'}
          </p>
        ) : (
          templates.map((tpl) => (
            <article key={tpl.id} className='ap-card recurring-item'>
              <div className='recurring-item__main'>
                <span
                  className={`recurring-pill ${tpl.active ? 'is-active' : 'is-paused'}`}
                >
                  {tpl.active
                    ? isCz
                      ? 'Aktivní'
                      : 'Active'
                    : isCz
                      ? 'Pozastaveno'
                      : 'Paused'}
                </span>
                <strong>{tpl.name}</strong>
                <span className='recurring-item__meta'>
                  <RefreshCw size={ICON_SM} strokeWidth={STROKE} />
                  {cadenceLabel(tpl.cadence, isCz)}
                  {tpl.intervalCount > 1 ? ` ×${tpl.intervalCount}` : ''}
                </span>
                <span className='recurring-item__meta'>
                  <Calendar size={ICON_SM} strokeWidth={STROKE} />
                  {isCz ? 'Příště' : 'Next'}: {formatRunDate(tpl.nextRunAt)}
                </span>
                {tpl.autoSend && (
                  <span className='recurring-item__meta'>
                    <Send size={ICON_SM} strokeWidth={STROKE} />
                    {isCz ? 'Auto-odeslání' : 'Auto-send'}
                  </span>
                )}
                {tpl.lastRunAt && (
                  <span className='recurring-item__meta'>
                    <Clock size={ICON_SM} strokeWidth={STROKE} />
                    {isCz ? 'Naposledy' : 'Last'}:{' '}
                    {formatRunDate(tpl.lastRunAt)}
                  </span>
                )}
              </div>
              <button
                className='btn recurring-item__delete'
                onClick={() => handleDelete(tpl.id)}
                aria-label={isCz ? 'Smazat' : 'Delete'}
              >
                <Trash2 size={ICON_SM} strokeWidth={STROKE} />
              </button>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
