import './PublicInvoiceView.css';
import { useEffect, useState } from 'react';
import InvoicePreview from './InvoicePreview';
import { getPublicInvoice } from '../utils/storage';
import { languages } from '../utils/i18n';

interface PublicInvoiceViewProps {
  token: string;
}

type Lang = 'cs' | 'en';

export default function PublicInvoiceView({ token }: PublicInvoiceViewProps) {
  const [invoice, setInvoice] = useState<Record<string, unknown> | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [lang, setLang] = useState<Lang>('cs');

  useEffect(() => {
    let active = true;
    getPublicInvoice(token)
      .then((inv) => {
        if (!active) return;
        setInvoice(inv);
        const country = String(
          (inv?.client as { country?: string })?.country || 'CZ',
        ).toUpperCase();
        setLang(country === 'CZ' || country === 'SK' ? 'cs' : 'en');
        setState('ready');
      })
      .catch(() => active && setState('error'));
    return () => {
      active = false;
    };
  }, [token]);

  const t = (languages as Record<string, Record<string, string>>)[lang];

  if (state === 'loading') {
    return (
      <div className="public-invoice public-invoice--center">
        <p>Loading…</p>
      </div>
    );
  }

  if (state === 'error' || !invoice) {
    return (
      <div className="public-invoice public-invoice--center">
        <h1>404</h1>
        <p>{lang === 'cs' ? 'Faktura nenalezena.' : 'Invoice not found.'}</p>
      </div>
    );
  }

  return (
    <div className="public-invoice">
      <div className="public-invoice__bar">
        <span className="public-invoice__brand">Fakturidias</span>
        <div className="public-invoice__lang">
          <button
            className={lang === 'cs' ? 'is-active' : ''}
            onClick={() => setLang('cs')}
          >
            CS
          </button>
          <button
            className={lang === 'en' ? 'is-active' : ''}
            onClick={() => setLang('en')}
          >
            EN
          </button>
        </div>
      </div>
      <div className="public-invoice__sheet">
        <InvoicePreview invoice={invoice} t={t} lang={lang} />
      </div>
    </div>
  );
}
