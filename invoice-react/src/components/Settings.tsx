import './Settings.css';
import { useState, useEffect } from 'react';
import { useLiveActivity } from '@/contexts/activity';
import { safeStripeRedirect } from '@/lib/security';
import { parseIban, calculateIban } from '../utils/bank';
import { previewInvoiceNumber, InvoiceNumberFormat } from '../utils/storage';
import AresSearch from './AresSearch';
import ApiSettings from './ApiSettings';
import CompanyProfiles from './CompanyProfiles';
import BankAccounts from './BankAccounts';
import AccountantAccess from './AccountantAccess';
import {
  Contact,
  Wallet,
  Plug,
  Save,
  Mail,
  Cloud,
  Search,
  Check,
  RefreshCw,
  CreditCard,
  TrendingUp,
  Upload,
  FileText,
  ICON_SM,
  ICON_MD,
  STROKE,
} from '@/lib/icons';

interface Supplier {
  name?: string;
  ico?: string;
  vat?: string;
  address?: string;
  registry?: string;
  iban?: string;
  accountNumber?: string;
  bankCode?: string;
  prefix?: string;
  region?: string;
  taxStatus?: string;
  isVatPayer?: boolean;
  vatRate?: string;
  defaultCurrency?: string;
  defaultDueDays?: string;
  bankName?: string;
  bic?: string;
  email?: string;
  phone?: string;
  web?: string;
  invoiceNumberFormat?: InvoiceNumberFormat;
  [key: string]: unknown;
}

interface Subscription {
  plan: string;
  status: string;
  interval: string | null;
  currentPeriodEnd: number | null;
}

interface BankSync {
  fioToken?: string;
  lastSyncAt?: string;
}

interface SettingsProps {
  defaultSupplier: Supplier | null;
  setDefaultSupplier: (fn: (prev: Supplier | null) => Supplier) => void;
  lang: string;
  categories?: string[];
  onLogin?: () => void;
  onLogout?: () => void;
  user?: { email: string } | null;
  t: Record<string, string>;
  subscription?: Subscription | null;
  invoiceCount?: number;
  bankSync?: BankSync | null;
  setBankSync?: (fn: (prev: BankSync | null) => BankSync) => void;
  onInvoicesRefresh?: () => void;
}

export default function Settings({
  defaultSupplier,
  setDefaultSupplier,
  lang,
  onLogin,
  onLogout,
  t,
  subscription,
  invoiceCount = 0,
  bankSync,
  setBankSync,
  onInvoicesRefresh,
}: SettingsProps) {
  const { announce, setSettingsTab } = useLiveActivity();
  const [tab, setTab] = useState(1);
  const [checkoutLoading, setCheckoutLoading] = useState<
    'month' | 'year' | null
  >(null);
  const [lockedFields, setLockedFields] = useState({
    name: !!defaultSupplier?.name,
    ico: !!defaultSupplier?.ico,
    vat: !!defaultSupplier?.vat,
    address: !!defaultSupplier?.address,
    registry: !!defaultSupplier?.registry,
  });
  const [smtpConfig, setSmtpConfig] = useState({
    useGoogle: false,
    fromEmail: '',
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
    'idle',
  );
  const [fioToken, setFioToken] = useState(bankSync?.fioToken || '');
  const [syncStatus, setSyncStatus] = useState<
    'idle' | 'syncing' | 'done' | 'error'
  >('idle');
  const [syncResult, setSyncResult] = useState<{
    matched: number;
    updated: { invoiceNumber: string }[];
  } | null>(null);
  const [syncError, setSyncError] = useState('');
  const [importStatus, setImportStatus] = useState<
    'idle' | 'importing' | 'done' | 'error'
  >('idle');
  const [importResult, setImportResult] = useState<{
    parsed: number;
    matched: number;
    updated: { invoiceNumber: string }[];
  } | null>(null);
  const [importError, setImportError] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [remindersEnabled, setRemindersEnabled] = useState(false);

  const isCz = lang === 'cs';

  useEffect(() => {
    let active = true;
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.settings?.reminders) {
          setRemindersEnabled(!!data.settings.reminders.enabled);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function handleToggleReminders() {
    const next = !remindersEnabled;
    setRemindersEnabled(next);
    announce({
      kind: 'info',
      label: next
        ? isCz
          ? 'Upomínky zapnuty'
          : 'Reminders on'
        : isCz
          ? 'Upomínky vypnuty'
          : 'Reminders off',
    });
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { reminders: { enabled: next } } }),
      });
    } catch {
      setRemindersEnabled(!next); // revert on failure
    }
  }

  useEffect(() => {
    if (defaultSupplier?.iban && !defaultSupplier.accountNumber) {
      const parsed = parseIban(defaultSupplier.iban);
      if (parsed) {
        setDefaultSupplier((prev) => ({
          ...prev!,
          accountNumber: parsed.accountNumber || '',
          bankCode: parsed.bankCode || '',
          prefix: parsed.prefix || '',
        }));
      }
    }
  }, [defaultSupplier?.iban]);

  useEffect(() => {
    const savedSmtp = localStorage.getItem('smtpConfig');
    if (savedSmtp) setSmtpConfig(JSON.parse(savedSmtp));
    fetch('/auth/google/status')
      .then((res) => res.json())
      .then((data) => {
        setSmtpConfig((prev) => {
          const shouldBeConnected = data.connected;
          if (prev.useGoogle !== shouldBeConnected) {
            const updated = { ...prev, useGoogle: shouldBeConnected };
            localStorage.setItem('smtpConfig', JSON.stringify(updated));
            return updated;
          }
          return prev;
        });
      })
      .catch((e) => console.error('Failed to sync auth status', e));
  }, []);

  useEffect(() => {
    if (defaultSupplier?.accountNumber && defaultSupplier?.bankCode) {
      const newIban = calculateIban(
        defaultSupplier.accountNumber,
        defaultSupplier.bankCode,
        defaultSupplier.prefix,
      );
      if (newIban && newIban !== defaultSupplier?.iban) {
        setDefaultSupplier((prev) => ({ ...prev!, iban: newIban }));
      }
    }
  }, [
    defaultSupplier?.accountNumber,
    defaultSupplier?.bankCode,
    defaultSupplier?.prefix,
  ]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setDefaultSupplier((prev) => ({
      ...prev!,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAresData = (data: Record<string, unknown>) => {
    let registryText = '';
    const legalCode = parseInt(String(data.legalFormCode || '0'));
    if ([101, 102, 105].includes(legalCode)) {
      registryText = isCz
        ? 'Zapsán v živnostenském rejstříku.'
        : 'Registered in the Trade Register.';
    } else {
      let registerInfo: {
        cs: { subject: string; register: string };
        en: { subject: string; register: string };
      } | null = null;
      if ([111, 112, 113, 121].includes(legalCode)) {
        registerInfo = {
          cs: { subject: 'Společnost', register: 'obchodním rejstříku' },
          en: { subject: 'Company', register: 'Commercial Register' },
        };
      } else if ([706, 701].includes(legalCode)) {
        registerInfo = {
          cs: { subject: 'Spolek', register: 'spolkovém rejstříku' },
          en: { subject: 'Association', register: 'Association Register' },
        };
      }
      if (registerInfo && data.fileNumber) {
        const parts = String(data.fileNumber).split('/');
        const courtMap: Record<string, string> = {
          MSPH: 'Městským soudem v Praze',
          KSBR: 'Krajským soudem v Brně',
          KSOS: 'Krajským soudem v Ostravě',
        };
        const courtName = parts[1]
          ? courtMap[parts[1]] || `soudem ${parts[1]}`
          : '';
        registryText = isCz
          ? `${registerInfo.cs.subject} je zapsána v ${registerInfo.cs.register} vedeném ${courtName}, spisová značka ${parts[0]}.`
          : `${registerInfo.en.subject} registered in ${registerInfo.en.register} kept by ${courtName}, file no. ${parts[0]}.`;
      }
    }
    setDefaultSupplier((prev) => ({
      ...prev!,
      name: String(data.name || ''),
      address: String(data.address || ''),
      ico: String(data.ico || ''),
      vat: String(data.vat || prev?.vat || ''),
      isVatPayer: Boolean(data.isVatPayer),
      registry: registryText || prev?.registry || '',
    }));
    setLockedFields({
      name: true,
      ico: true,
      vat: true,
      address: true,
      registry: true,
    });
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    const newBankSync = {
      ...(bankSync || {}),
      fioToken: fioToken.trim() || undefined,
    };
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: { defaultSupplier, bankSync: newBankSync },
        }),
      });
      if (res.ok && setBankSync) {
        setBankSync(() => newBankSync);
      }
      if (res.ok) {
        setSaveStatus('saved');
        announce({
          kind: 'done',
          label: isCz ? 'Nastavení uloženo' : 'Settings saved',
        });
      } else {
        setSaveStatus('idle');
      }
    } catch {
      setSaveStatus('idle');
    }
    setTimeout(() => setSaveStatus('idle'), 2200);
  };

  const handleBankSync = async () => {
    setSyncStatus('syncing');
    setSyncResult(null);
    setSyncError('');
    announce({
      kind: 'processing',
      label: isCz
        ? 'Synchronizuji platby z Fio banky…'
        : 'Syncing Fio Bank payments…',
    });
    try {
      // Save token first if changed
      if (fioToken.trim() !== (bankSync?.fioToken || '')) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: {
              bankSync: { ...(bankSync || {}), fioToken: fioToken.trim() },
            },
          }),
        });
        if (setBankSync)
          setBankSync((prev) => ({
            ...(prev || {}),
            fioToken: fioToken.trim(),
          }));
      }
      const res = await fetch('/api/bank/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setSyncError(
          data.error || (isCz ? 'Synchronizace selhala.' : 'Sync failed.'),
        );
        setSyncStatus('error');
        announce({
          kind: 'error',
          label: isCz ? 'Synchronizace selhala' : 'Sync failed',
        });
      } else {
        setSyncResult(data);
        if (setBankSync)
          setBankSync((prev) => ({
            ...(prev || {}),
            lastSyncAt: new Date().toISOString(),
          }));
        if (data.matched > 0 && onInvoicesRefresh) onInvoicesRefresh();
        setSyncStatus('done');
        announce({
          kind: 'done',
          label: isCz ? 'Platby synchronizovány' : 'Payments synced',
        });
      }
    } catch {
      setSyncError(
        isCz ? 'Chyba připojení k serveru.' : 'Server connection error.',
      );
      setSyncStatus('error');
      announce({
        kind: 'error',
        label: isCz ? 'Chyba připojení' : 'Connection error',
      });
    }
  };

  const handleStatementImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportStatus('importing');
    setImportResult(null);
    setImportError('');
    announce({
      kind: 'processing',
      label: isCz ? 'Zpracovávám výpis…' : 'Importing statement…',
    });
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = ev.target?.result as string;
      try {
        const res = await fetch('/api/bank/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, filename: file.name }),
        });
        const data = await res.json();
        if (!res.ok) {
          setImportError(
            data.error || (isCz ? 'Import selhal.' : 'Import failed.'),
          );
          setImportStatus('error');
          announce({
            kind: 'error',
            label: isCz ? 'Import výpisu selhal' : 'Statement import failed',
          });
        } else {
          setImportResult(data);
          if (data.matched > 0 && onInvoicesRefresh) onInvoicesRefresh();
          setImportStatus('done');
          announce({
            kind: 'done',
            label: isCz ? 'Výpis zpracován' : 'Statement imported',
          });
        }
      } catch {
        setImportError(
          isCz ? 'Chyba připojení k serveru.' : 'Server connection error.',
        );
        setImportStatus('error');
        announce({
          kind: 'error',
          label: isCz ? 'Chyba připojení' : 'Connection error',
        });
      }
    };
    reader.onerror = () => {
      setImportError(
        isCz ? 'Nepodařilo se přečíst soubor.' : 'Could not read file.',
      );
      setImportStatus('error');
      announce({
        kind: 'error',
        label: isCz ? 'Nelze přečíst soubor' : 'Could not read file',
      });
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const unlock = (field: string) => {
    setLockedFields((prev) => ({ ...prev, [field]: false }));
    announce({
      kind: 'info',
      label: isCz ? 'Pole odemčeno pro úpravu' : 'Field unlocked for editing',
    });
  };

  const handleCheckout = async (
    interval: 'month' | 'year',
    plan: 'standard' | 'max' = 'standard',
  ) => {
    setCheckoutLoading(interval);
    announce({
      kind: 'info',
      label: isCz ? 'Spouštím platbu…' : 'Starting checkout…',
    });
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval, plan }),
      });
      const data = await res.json();
      if (data.url) safeStripeRedirect(data.url);
      else
        alert(
          isCz ? 'Nepodařilo se spustit platbu.' : 'Failed to start checkout.',
        );
    } catch {
      alert(
        isCz ? 'Nepodařilo se spustit platbu.' : 'Failed to start checkout.',
      );
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    announce({
      kind: 'info',
      label: isCz ? 'Otevírám správu předplatného…' : 'Opening billing portal…',
    });
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) safeStripeRedirect(data.url);
      else
        alert(
          isCz
            ? 'Nepodařilo se otevřít správu.'
            : 'Failed to open billing portal.',
        );
    } catch {
      alert(
        isCz
          ? 'Nepodařilo se otevřít správu.'
          : 'Failed to open billing portal.',
      );
    }
  };

  const isPro = ['standard', 'max', 'pro'].includes(subscription?.plan ?? '');
  const isMax = subscription?.plan === 'max';
  const isStandard = isPro && !isMax;

  const planLabel = isMax
    ? 'Max'
    : isStandard
      ? 'Standard'
      : isCz
        ? 'Bezplatný'
        : 'Free';

  const tabLabels = [
    isCz ? 'Základní údaje' : 'Identity',
    isCz ? 'Daně a Banka' : 'Tax & Bank',
    isCz ? 'Integrace' : 'Integrations',
    isCz ? 'Plán' : 'Plan',
  ];
  const tabSubs = [
    isCz
      ? 'Správa vaší identity a údajů dodavatele.'
      : 'Manage your identity and supplier details.',
    isCz
      ? 'DPH plátce, bankovní účet a výchozí měna.'
      : 'VAT status, bank account and default currency.',
    isCz
      ? 'Propojení s ARES, Google Drive, e-mail a API.'
      : 'ARES, Google Drive, email and API connections.',
    isPro
      ? isCz
        ? `Správa vašeho ${planLabel} předplatného.`
        : `Manage your ${planLabel} subscription.`
      : isCz
        ? 'Upgradujte pro více faktur a AI funkce.'
        : 'Upgrade for more invoices and AI features.',
  ];

  const saveLabel =
    saveStatus === 'saved'
      ? isCz
        ? 'Uloženo'
        : 'Saved'
      : isCz
        ? 'Uložit všechna nastavení'
        : 'Save all settings';

  return (
    <div className='ap-page'>
      <div className='ap-page__head'>
        <div>
          <h1 className='ap-page__title'>{isCz ? 'Nastavení' : 'Settings'}</h1>
          <p className='ap-page__sub'>{tabSubs[tab - 1]}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className='ap-tabs' role='tablist'>
        {tabLabels.map((label, i) => {
          const icons = [
            <Contact key='c' size={ICON_SM} strokeWidth={STROKE} />,
            <Wallet key='w' size={ICON_SM} strokeWidth={STROKE} />,
            <Plug key='p' size={ICON_SM} strokeWidth={STROKE} />,
            <CreditCard key='cc' size={ICON_SM} strokeWidth={STROKE} />,
          ];
          return (
            <button
              key={i}
              className={`ap-tabs__btn${tab === i + 1 ? ' ap-tabs__btn--active' : ''}`}
              onClick={() => {
                setTab(i + 1);
                setSettingsTab(i + 1);
              }}
            >
              {icons[i]} {label}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: IDENTITY ──────────────────────────────────────── */}
      {tab === 1 && (
        <div className='settings-tab-body'>
          {/* Identity card with ARES */}
          <div className='ap-card'>
            <h3 className='ap-card__title'>
              <Contact size={ICON_MD} strokeWidth={STROKE} />
              {isCz ? 'Základní údaje' : 'Identity'}
            </h3>

            <AresSearch
              clientName={defaultSupplier?.name || ''}
              clientIco={defaultSupplier?.ico || ''}
              onClientNameChange={(v: string) =>
                setDefaultSupplier((p) => ({ ...p!, name: v }))
              }
              onClientIcoChange={(v: string) =>
                setDefaultSupplier((p) => ({ ...p!, ico: v }))
              }
              onAresData={handleAresData}
              t={t}
              region={defaultSupplier?.region || 'CZ'}
            />

            <div className='ap-section-label'>
              {isCz ? 'Fakturační údaje' : 'Billing details'}
            </div>

            <div className='ap-grid ap-grid--2'>
              <div className='ap-field'>
                <label>{isCz ? 'Domovský region' : 'Home region'}</label>
                <select
                  className='ap-select'
                  name='region'
                  value={defaultSupplier?.region || 'CZ'}
                  onChange={handleChange}
                >
                  <option value='CZ'>Czech Republic (CZ)</option>
                  <option value='SK'>Slovakia (SK)</option>
                  <option value='AT'>Austria (AT)</option>
                  <option value='DE'>Germany (DE)</option>
                </select>
              </div>

              <div className='ap-field'>
                <div className='settings-fld-head'>
                  <label className='settings-fld-label'>
                    {t.supplierName ||
                      (isCz
                        ? 'Vaše jméno / Název'
                        : 'Your name / Company')}{' '}
                    <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  {lockedFields.name && (
                    <button
                      className='settings-unlock'
                      onClick={() => unlock('name')}
                    >
                      {isCz ? 'Upravit' : 'Edit'}
                    </button>
                  )}
                </div>
                <input
                  className='ap-input'
                  name='name'
                  value={defaultSupplier?.name || ''}
                  onChange={handleChange}
                  readOnly={lockedFields.name}
                  style={lockedFields.name ? { opacity: 0.6 } : {}}
                />
              </div>

              <div className='ap-field'>
                <div className='settings-fld-head'>
                  <label className='settings-fld-label'>
                    {isCz ? 'IČO' : 'Business ID (IČO)'}{' '}
                    <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  {lockedFields.ico && (
                    <button
                      className='settings-unlock'
                      onClick={() => unlock('ico')}
                    >
                      {isCz ? 'Upravit' : 'Edit'}
                    </button>
                  )}
                </div>
                <input
                  className='ap-input'
                  name='ico'
                  value={defaultSupplier?.ico || ''}
                  onChange={handleChange}
                  readOnly={lockedFields.ico}
                  style={lockedFields.ico ? { opacity: 0.6 } : {}}
                />
              </div>

              <div className='ap-field'>
                <div className='settings-fld-head'>
                  <label className='settings-fld-label'>
                    {isCz ? 'DIČ (VAT ID)' : 'VAT / Tax ID (DIČ)'}
                  </label>
                  {lockedFields.vat && (
                    <button
                      className='settings-unlock'
                      onClick={() => unlock('vat')}
                    >
                      {isCz ? 'Upravit' : 'Edit'}
                    </button>
                  )}
                </div>
                <input
                  className='ap-input'
                  name='vat'
                  value={defaultSupplier?.vat || ''}
                  onChange={handleChange}
                  readOnly={lockedFields.vat}
                  style={lockedFields.vat ? { opacity: 0.6 } : {}}
                />
              </div>

              <div className='ap-field settings-span-2'>
                <div className='settings-fld-head'>
                  <label className='settings-fld-label'>
                    {t.supplierAddress ||
                      (isCz ? 'Vaše adresa' : 'Your address')}{' '}
                    <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  {lockedFields.address && (
                    <button
                      className='settings-unlock'
                      onClick={() => unlock('address')}
                    >
                      {isCz ? 'Upravit' : 'Edit'}
                    </button>
                  )}
                </div>
                <input
                  className='ap-input'
                  name='address'
                  value={defaultSupplier?.address || ''}
                  onChange={handleChange}
                  readOnly={lockedFields.address}
                  style={lockedFields.address ? { opacity: 0.6 } : {}}
                />
              </div>

              <div className='ap-field settings-span-2'>
                <div className='settings-fld-head'>
                  <label className='settings-fld-label'>
                    {isCz ? 'Zápis v rejstříku' : 'Registry entry'}
                  </label>
                  {lockedFields.registry && (
                    <button
                      className='settings-unlock'
                      onClick={() => unlock('registry')}
                    >
                      {isCz ? 'Upravit' : 'Edit'}
                    </button>
                  )}
                </div>
                <input
                  className='ap-input'
                  name='registry'
                  value={defaultSupplier?.registry || ''}
                  onChange={handleChange}
                  readOnly={lockedFields.registry}
                  style={lockedFields.registry ? { opacity: 0.6 } : {}}
                />
              </div>
            </div>
          </div>

          {/* Contact card */}
          <div className='ap-card'>
            <h3 className='ap-card__title'>
              <Mail size={ICON_MD} strokeWidth={STROKE} />
              {isCz ? 'Kontakt' : 'Contact'}
            </h3>
            <div className='ap-grid ap-grid--2'>
              <div className='ap-field'>
                <label>{isCz ? 'E-mail' : 'Email'}</label>
                <input
                  className='ap-input'
                  name='email'
                  type='email'
                  value={defaultSupplier?.email || ''}
                  onChange={handleChange}
                />
              </div>
              <div className='ap-field'>
                <label>{isCz ? 'Telefon' : 'Phone'}</label>
                <input
                  className='ap-input'
                  name='phone'
                  type='tel'
                  value={defaultSupplier?.phone || ''}
                  onChange={handleChange}
                />
              </div>
              <div className='ap-field settings-span-2'>
                <label>{isCz ? 'Web' : 'Website'}</label>
                <input
                  className='ap-input'
                  name='web'
                  value={defaultSupplier?.web || ''}
                  onChange={handleChange}
                  placeholder='fakturidias.cz'
                />
              </div>
            </div>
          </div>

          <div className='ap-save-bar'>
            <button className='ap-btn ap-btn--ghost' type='button'>
              {isCz ? 'Zrušit' : 'Cancel'}
            </button>
            <button
              className='ap-btn ap-btn--primary'
              type='button'
              onClick={handleSave}
            >
              <Save size={ICON_SM} strokeWidth={STROKE} /> {saveLabel}
            </button>
          </div>

          <CompanyProfiles
            lang={lang}
            defaultSupplier={defaultSupplier}
            // Supplier carries an index signature, so the record is structurally a Supplier.
            onApplyProfile={(s) => setDefaultSupplier(() => s as Supplier)}
          />
        </div>
      )}

      {/* ── TAB 2: TAX & BANK ────────────────────────────────────── */}
      {tab === 2 && (
        <div className='settings-tab-body'>
          {/* Tax details card */}
          <div className='ap-card'>
            <h3 className='ap-card__title'>
              <Wallet size={ICON_MD} strokeWidth={STROKE} />
              {isCz ? 'Daňové údaje' : 'Tax details'}
            </h3>

            {/* VAT payer toggle */}
            <div
              className='ap-integration'
              style={{ paddingTop: 4, paddingBottom: 20 }}
            >
              <div className='ap-integration__icon'>
                <Check size={ICON_MD} strokeWidth={STROKE} />
              </div>
              <div className='ap-integration__body'>
                <div className='ap-integration__title'>
                  {isCz ? 'Plátce DPH' : 'VAT payer'}
                </div>
                <div className='ap-integration__desc'>
                  {isCz
                    ? 'Vystavujete faktury s DPH a podáváte daňové přiznání.'
                    : 'You issue invoices with VAT and file tax returns.'}
                </div>
              </div>
              <div className='ap-integration__action'>
                <button
                  className='ap-toggle'
                  data-on={String(!!defaultSupplier?.isVatPayer)}
                  aria-label={isCz ? 'Přepnout plátce DPH' : 'Toggle VAT payer'}
                  onClick={() => {
                    const next = !defaultSupplier?.isVatPayer;
                    setDefaultSupplier((prev) => ({
                      ...prev!,
                      isVatPayer: next,
                    }));
                    announce({
                      kind: 'info',
                      label: next
                        ? isCz
                          ? 'Plátce DPH: Ano'
                          : 'VAT payer: Yes'
                        : isCz
                          ? 'Plátce DPH: Ne'
                          : 'VAT payer: No',
                    });
                  }}
                />
              </div>
            </div>

            <div className='ap-grid ap-grid--3'>
              <div className='ap-field'>
                <label>{isCz ? 'Výchozí sazba DPH' : 'Default VAT rate'}</label>
                <select
                  className='ap-select'
                  name='vatRate'
                  value={defaultSupplier?.vatRate || '21'}
                  onChange={handleChange}
                >
                  <option value='21'>21 %</option>
                  <option value='15'>15 %</option>
                  <option value='10'>10 %</option>
                  <option value='0'>0 %</option>
                </select>
              </div>
              <div className='ap-field'>
                <label>{isCz ? 'Výchozí měna' : 'Default currency'}</label>
                <select
                  className='ap-select'
                  name='defaultCurrency'
                  value={defaultSupplier?.defaultCurrency || 'CZK'}
                  onChange={handleChange}
                >
                  <option value='CZK'>CZK</option>
                  <option value='EUR'>EUR</option>
                  <option value='USD'>USD</option>
                </select>
              </div>
              <div className='ap-field'>
                <label>
                  {isCz ? 'Výchozí splatnost (dní)' : 'Default due (days)'}
                </label>
                <input
                  className='ap-input'
                  type='number'
                  name='defaultDueDays'
                  value={defaultSupplier?.defaultDueDays || '14'}
                  onChange={handleChange}
                  min='1'
                  max='365'
                />
              </div>
            </div>
          </div>

          {/* Bank account card */}
          <div className='ap-card'>
            <h3 className='ap-card__title'>
              <Wallet size={ICON_MD} strokeWidth={STROKE} />
              {isCz ? 'Bankovní účet' : 'Bank account'}
            </h3>
            <div className='ap-grid ap-grid--2'>
              <div className='ap-field'>
                <label>
                  {isCz
                    ? 'Číslo účtu / Kód banky'
                    : 'Account number / Bank code'}
                </label>
                <div className='settings-account-row'>
                  <input
                    className='ap-input'
                    name='accountNumber'
                    value={defaultSupplier?.accountNumber || ''}
                    onChange={handleChange}
                    placeholder='1234567890'
                  />
                  <span className='settings-slash'>/</span>
                  <input
                    className='ap-input settings-bank-code'
                    name='bankCode'
                    value={defaultSupplier?.bankCode || ''}
                    onChange={handleChange}
                    placeholder='0800'
                  />
                </div>
              </div>
              <div className='ap-field'>
                <label>IBAN</label>
                <input
                  className='ap-input'
                  name='iban'
                  value={defaultSupplier?.iban || ''}
                  readOnly
                  style={{ opacity: 0.6 }}
                />
              </div>
              <div className='ap-field'>
                <label>BIC / SWIFT</label>
                <input
                  className='ap-input'
                  name='bic'
                  value={defaultSupplier?.bic || ''}
                  onChange={handleChange}
                  placeholder='GIBACZPX'
                />
              </div>
              <div className='ap-field'>
                <label>{isCz ? 'Banka' : 'Bank name'}</label>
                <select
                  className='ap-select'
                  name='bankName'
                  value={defaultSupplier?.bankName || ''}
                  onChange={handleChange}
                >
                  <option value=''>
                    {isCz ? '— Vyberte —' : '— Select —'}
                  </option>
                  <option value='ČSOB'>ČSOB (0300)</option>
                  <option value='KB'>Komerční banka (0100)</option>
                  <option value='ČSAS'>Česká spořitelna (0800)</option>
                  <option value='RB'>Raiffeisenbank (5500)</option>
                  <option value='FIO'>Fio banka (2010)</option>
                  <option value='MONETA'>MONETA (0600)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Invoice numbering card */}
          <div className='ap-card'>
            <h3 className='ap-card__title'>
              <Wallet size={ICON_MD} strokeWidth={STROKE} />
              {isCz ? 'Číslování faktur' : 'Invoice numbering'}
            </h3>
            <p
              style={{
                color: 'var(--muted)',
                fontSize: 13,
                margin: '0 0 16px',
              }}
            >
              {isCz
                ? 'Nastavte formát čísla faktury. Pořadové číslo se doplní automaticky.'
                : 'Configure the invoice number format. The sequence counter is filled automatically.'}
            </p>
            <div className='ap-grid ap-grid--2'>
              <div className='ap-field'>
                <label>{isCz ? 'Předpona (prefix)' : 'Prefix'}</label>
                <input
                  className='ap-input'
                  placeholder={
                    isCz ? 'např. FA nebo prázdné' : 'e.g. FA or leave empty'
                  }
                  value={String(
                    defaultSupplier?.invoiceNumberFormat?.prefix ?? '',
                  )}
                  onChange={(e) =>
                    setDefaultSupplier((prev) => ({
                      ...prev!,
                      invoiceNumberFormat: {
                        ...prev?.invoiceNumberFormat,
                        prefix: e.target.value,
                      },
                    }))
                  }
                />
              </div>
              <div className='ap-field'>
                <label>{isCz ? 'Oddělovač' : 'Separator'}</label>
                <select
                  className='ap-select'
                  value={String(
                    defaultSupplier?.invoiceNumberFormat?.separator ?? '',
                  )}
                  onChange={(e) =>
                    setDefaultSupplier((prev) => ({
                      ...prev!,
                      invoiceNumberFormat: {
                        ...prev?.invoiceNumberFormat,
                        separator: e.target.value,
                      },
                    }))
                  }
                >
                  <option value=''>
                    {isCz ? 'žádný — 2025001' : 'none — 2025001'}
                  </option>
                  <option value='-'>- pomlčka — FA-2025-001</option>
                  <option value='/'>
                    {isCz ? '/ lomítko — FA/2025/001' : '/ slash — FA/2025/001'}
                  </option>
                </select>
              </div>
              <div className='ap-field'>
                <label>
                  {isCz ? 'Počet číslic pořadí' : 'Sequence digits'}
                </label>
                <select
                  className='ap-select'
                  value={String(
                    defaultSupplier?.invoiceNumberFormat?.padding ?? 3,
                  )}
                  onChange={(e) =>
                    setDefaultSupplier((prev) => ({
                      ...prev!,
                      invoiceNumberFormat: {
                        ...prev?.invoiceNumberFormat,
                        padding: Number(e.target.value),
                      },
                    }))
                  }
                >
                  <option value='2'>2 — 01</option>
                  <option value='3'>3 — 001</option>
                  <option value='4'>4 — 0001</option>
                </select>
              </div>
              <div className='ap-field'>
                <label>{isCz ? 'Zahrnout rok' : 'Include year'}</label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    height: 38,
                  }}
                >
                  <button
                    type='button'
                    className='ap-toggle'
                    data-on={String(
                      defaultSupplier?.invoiceNumberFormat?.includeYear !==
                        false,
                    )}
                    aria-label={isCz ? 'Zahrnout rok' : 'Include year'}
                    onClick={() => {
                      const nextYear =
                        defaultSupplier?.invoiceNumberFormat?.includeYear ===
                        false;
                      setDefaultSupplier((prev) => ({
                        ...prev!,
                        invoiceNumberFormat: {
                          ...prev?.invoiceNumberFormat,
                          includeYear: nextYear,
                        },
                      }));
                      announce({
                        kind: 'info',
                        label: nextYear
                          ? isCz
                            ? 'Rok v číslovaní: Ano'
                            : 'Year in numbering: Yes'
                          : isCz
                            ? 'Rok v číslovaní: Ne'
                            : 'Year in numbering: No',
                      });
                    }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {defaultSupplier?.invoiceNumberFormat?.includeYear !== false
                      ? isCz
                        ? 'Ano'
                        : 'Yes'
                      : isCz
                        ? 'Ne'
                        : 'No'}
                  </span>
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: 14,
                padding: '10px 14px',
                background: 'var(--bg2)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {isCz ? 'Náhled:' : 'Preview:'}
              </span>
              <code
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--accent)',
                  letterSpacing: '0.02em',
                }}
              >
                {previewInvoiceNumber(
                  defaultSupplier?.invoiceNumberFormat as InvoiceNumberFormat,
                )}
              </code>
            </div>
          </div>

          <div className='ap-save-bar'>
            <button className='ap-btn ap-btn--ghost' type='button'>
              {isCz ? 'Zrušit' : 'Cancel'}
            </button>
            <button
              className='ap-btn ap-btn--primary'
              type='button'
              onClick={handleSave}
            >
              <Save size={ICON_SM} strokeWidth={STROKE} /> {saveLabel}
            </button>
          </div>

          <BankAccounts lang={lang} />
        </div>
      )}

      {/* ── TAB 3: INTEGRATIONS ──────────────────────────────────── */}
      {tab === 3 && (
        <div className='settings-tab-body'>
          <div className='ap-card'>
            <h3 className='ap-card__title'>
              <Plug size={ICON_MD} strokeWidth={STROKE} />
              {isCz ? 'Integrace' : 'Integrations'}
            </h3>

            {/* Payment reminders */}
            <div className='ap-integration'>
              <div className='ap-integration__icon'>
                <Mail size={ICON_MD} strokeWidth={STROKE} />
              </div>
              <div className='ap-integration__body'>
                <div className='ap-integration__title'>
                  {isCz ? 'Upomínky po splatnosti' : 'Overdue reminders'}
                </div>
                <div className='ap-integration__desc'>
                  {isCz
                    ? 'Automaticky e-mailem upozorní klienty na neuhrazené faktury po splatnosti (max. 3×, jednou týdně).'
                    : 'Automatically email clients about unpaid overdue invoices (up to 3 times, weekly).'}
                </div>
              </div>
              <div className='ap-integration__action'>
                <button
                  className='ap-toggle'
                  data-on={String(remindersEnabled)}
                  aria-label={
                    isCz ? 'Přepnout upomínky' : 'Toggle overdue reminders'
                  }
                  onClick={handleToggleReminders}
                />
              </div>
            </div>

            {/* ARES */}
            <div className='ap-integration'>
              <div className='ap-integration__icon'>
                <Search size={ICON_MD} strokeWidth={STROKE} />
              </div>
              <div className='ap-integration__body'>
                <div className='ap-integration__title'>
                  {isCz ? 'ARES vyhledávání' : 'ARES lookup'}
                  <span
                    className='ap-pill paid'
                    style={{ fontSize: 10.5, padding: '2px 8px' }}
                  >
                    {isCz ? 'Připojeno' : 'Connected'}
                  </span>
                </div>
                <div className='ap-integration__desc'>
                  {isCz
                    ? 'Automatické vyplňování klienta podle IČO z českého obchodního rejstříku.'
                    : 'Auto-fill client details from the Czech business registry by IČO.'}
                </div>
              </div>
              <div className='ap-integration__action'>
                <button
                  className='ap-toggle'
                  data-on='true'
                  aria-label='ARES always on'
                />
              </div>
            </div>

            {/* Google Drive */}
            <div className='ap-integration'>
              <div className='ap-integration__icon ap-integration__icon--alt'>
                <Cloud size={ICON_MD} strokeWidth={STROKE} />
              </div>
              <div className='ap-integration__body'>
                <div className='ap-integration__title'>
                  {isCz ? 'Google Drive zálohy' : 'Google Drive backups'}
                  {smtpConfig.useGoogle && (
                    <span
                      className='ap-pill paid'
                      style={{ fontSize: 10.5, padding: '2px 8px' }}
                    >
                      {isCz ? 'Připojeno' : 'Connected'}
                    </span>
                  )}
                </div>
                <div className='ap-integration__desc'>
                  {smtpConfig.useGoogle
                    ? isCz
                      ? `Přihlášen jako: ${smtpConfig.fromEmail || 'Google'}`
                      : `Connected as: ${smtpConfig.fromEmail || 'Google'}`
                    : isCz
                      ? 'Automatické nahrávání PDF faktur na váš Google Drive.'
                      : 'Automatically upload PDF invoices to your Google Drive.'}
                </div>
              </div>
              <div className='ap-integration__action'>
                {smtpConfig.useGoogle ? (
                  <button
                    className='ap-btn ap-btn--secondary'
                    onClick={() => {
                      announce({
                        kind: 'info',
                        label: isCz
                          ? 'Odpojuji Google Drive'
                          : 'Disconnecting Google Drive',
                      });
                      onLogout?.();
                    }}
                  >
                    {isCz ? 'Odpojit' : 'Disconnect'}
                  </button>
                ) : (
                  <button
                    className='ap-btn ap-btn--primary'
                    onClick={() => {
                      announce({
                        kind: 'info',
                        label: isCz
                          ? 'Připojuji Google Drive…'
                          : 'Connecting Google Drive…',
                      });
                      onLogin?.();
                    }}
                  >
                    <Cloud size={ICON_SM} strokeWidth={STROKE} />
                    {isCz ? 'Připojit' : 'Connect'}
                  </button>
                )}
              </div>
            </div>

            {/* Email sending */}
            <div className='ap-integration'>
              <div className='ap-integration__icon'>
                <Mail size={ICON_MD} strokeWidth={STROKE} />
              </div>
              <div className='ap-integration__body'>
                <div className='ap-integration__title'>
                  {isCz ? 'Odesílání e-mailem' : 'Email sending'}
                  {smtpConfig.useGoogle && (
                    <span
                      className='ap-pill paid'
                      style={{ fontSize: 10.5, padding: '2px 8px' }}
                    >
                      {isCz ? 'Připojeno' : 'Connected'}
                    </span>
                  )}
                </div>
                <div className='ap-integration__desc'>
                  {isCz
                    ? 'Posílejte faktury klientům přímo z aplikace přes Google.'
                    : 'Send invoices to clients directly from the app via Google.'}
                </div>
              </div>
              <div className='ap-integration__action'>
                <button
                  className='ap-toggle'
                  data-on={String(smtpConfig.useGoogle)}
                  aria-label={isCz ? 'Přepnout e-mail' : 'Toggle email'}
                  onClick={() => {
                    announce({
                      kind: 'info',
                      label: smtpConfig.useGoogle
                        ? isCz
                          ? 'Odpojuji Google e-mail'
                          : 'Disconnecting Google email'
                        : isCz
                          ? 'Připojuji Google e-mail…'
                          : 'Connecting Google email…',
                    });
                    smtpConfig.useGoogle ? onLogout?.() : onLogin?.();
                  }}
                />
              </div>
            </div>

            {/* API access */}
            <div className='ap-integration'>
              <div className='ap-integration__icon ap-integration__icon--alt'>
                <Plug size={ICON_MD} strokeWidth={STROKE} />
              </div>
              <div className='ap-integration__body'>
                <div className='ap-integration__title'>
                  {isCz ? 'API přístup' : 'API access'}
                </div>
                <div className='ap-integration__desc'>
                  {isCz
                    ? 'Generujte API klíče a integrujte Fakturidias s vaším softwarem.'
                    : 'Generate API keys and integrate Fakturidias with your stack.'}
                </div>
              </div>
              <div className='ap-integration__action'>
                <button className='ap-btn ap-btn--secondary'>
                  {isCz ? 'Připojit' : 'Connect'}
                </button>
              </div>
            </div>
          </div>

          {/* Fio Bank payment matching card */}
          <div className='ap-card'>
            <h3 className='ap-card__title'>
              <Wallet size={ICON_MD} strokeWidth={STROKE} />
              {isCz
                ? 'Fio banka — automatické párování plateb'
                : 'Fio Bank — automatic payment matching'}
              {bankSync?.fioToken && (
                <span
                  className='ap-pill paid'
                  style={{ fontSize: 10.5, padding: '2px 8px' }}
                >
                  {isCz ? 'Připojeno' : 'Connected'}
                </span>
              )}
            </h3>
            <p
              style={{
                color: 'var(--muted)',
                fontSize: 13,
                margin: '0 0 14px',
              }}
            >
              {isCz
                ? 'Zadejte API token z Fio banky (Internet banking → API). Aplikace načte příchozí platby a automaticky označí odpovídající faktury jako zaplacené podle variabilního symbolu a částky.'
                : 'Enter your Fio Bank API token (Internet banking → API). The app will fetch incoming payments and automatically mark matching invoices as paid based on variable symbol and amount.'}
            </p>
            <div className='ap-field' style={{ marginBottom: 14 }}>
              <label>{isCz ? 'Fio API token' : 'Fio API token'}</label>
              <input
                className='ap-input'
                type='password'
                placeholder={
                  isCz
                    ? 'Vložte token z Fio Internet Bankingu'
                    : 'Paste token from Fio Internet Banking'
                }
                value={fioToken}
                onChange={(e) => setFioToken(e.target.value)}
                autoComplete='off'
              />
            </div>
            {bankSync?.lastSyncAt && (
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  margin: '0 0 12px',
                }}
              >
                {isCz ? 'Poslední synchronizace:' : 'Last sync:'}{' '}
                {new Date(bankSync.lastSyncAt).toLocaleString(
                  isCz ? 'cs-CZ' : 'en-GB',
                )}
              </p>
            )}
            {syncStatus === 'done' && syncResult && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(45,215,166,0.1)',
                  border: '1px solid rgba(45,215,166,0.3)',
                  borderRadius: 8,
                  marginBottom: 12,
                  fontSize: 13,
                  color: 'var(--text)',
                }}
              >
                {syncResult.matched === 0
                  ? isCz
                    ? 'Žádné nové platby ke spárování.'
                    : 'No new payments to match.'
                  : isCz
                    ? `Spárováno ${syncResult.matched} faktur: ${syncResult.updated.map((u) => u.invoiceNumber).join(', ')}`
                    : `Matched ${syncResult.matched} invoice(s): ${syncResult.updated.map((u) => u.invoiceNumber).join(', ')}`}
              </div>
            )}
            {syncStatus === 'error' && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(227,61,99,0.1)',
                  border: '1px solid rgba(227,61,99,0.3)',
                  borderRadius: 8,
                  marginBottom: 12,
                  fontSize: 13,
                  color: 'var(--danger)',
                }}
              >
                {syncError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className='ap-btn ap-btn--primary'
                type='button'
                disabled={!fioToken.trim() || syncStatus === 'syncing'}
                onClick={handleBankSync}
              >
                <RefreshCw size={ICON_SM} strokeWidth={STROKE} />
                {syncStatus === 'syncing'
                  ? isCz
                    ? 'Synchronizuji…'
                    : 'Syncing…'
                  : isCz
                    ? 'Synchronizovat platby'
                    : 'Sync payments'}
              </button>
            </div>
          </div>

          {/* Bank statement import card */}
          <div className='ap-card'>
            <h3 className='ap-card__title'>
              <Upload size={ICON_MD} strokeWidth={STROKE} />
              {isCz
                ? 'Import výpisu — všechny banky'
                : 'Import bank statement — all banks'}
            </h3>
            <p
              style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px' }}
            >
              {isCz
                ? 'Nahrajte CSV nebo XML výpis z internet bankingu. Funguje s Fio, Air Bank, KB, ČS, ČSOB, Raiffeisenbank, mBank a Moneta.'
                : 'Upload a CSV or XML export from your internet banking. Works with Fio, Air Bank, KB, ČS, ČSOB, Raiffeisenbank, mBank and Moneta.'}
            </p>
            <p
              style={{
                color: 'var(--muted)',
                fontSize: 12,
                margin: '0 0 14px',
              }}
            >
              {isCz
                ? 'Faktury se statusem Odeslaná nebo Po splatnosti jsou automaticky označeny jako Zaplacené podle variabilního symbolu a částky.'
                : 'Invoices with status Sent or Overdue are automatically marked as Paid based on variable symbol and amount.'}
            </p>

            {importStatus === 'done' && importResult && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(45,215,166,0.1)',
                  border: '1px solid rgba(45,215,166,0.3)',
                  borderRadius: 8,
                  marginBottom: 12,
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 2 }}>
                  {importFileName && (
                    <>
                      <FileText
                        size={12}
                        strokeWidth={STROKE}
                        style={{ marginRight: 4 }}
                      />
                      {importFileName} —{' '}
                    </>
                  )}
                  {isCz
                    ? `${importResult.parsed} transakcí načteno`
                    : `${importResult.parsed} transactions parsed`}
                </div>
                {importResult.matched === 0
                  ? isCz
                    ? 'Žádné faktury ke spárování.'
                    : 'No invoices matched.'
                  : isCz
                    ? `Spárováno ${importResult.matched} faktur: ${importResult.updated.map((u) => u.invoiceNumber).join(', ')}`
                    : `Matched ${importResult.matched} invoice(s): ${importResult.updated.map((u) => u.invoiceNumber).join(', ')}`}
              </div>
            )}
            {importStatus === 'error' && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(227,61,99,0.1)',
                  border: '1px solid rgba(227,61,99,0.3)',
                  borderRadius: 8,
                  marginBottom: 12,
                  fontSize: 13,
                  color: 'var(--danger)',
                }}
              >
                {importError}
              </div>
            )}

            <label
              className={`ap-btn ${importStatus === 'importing' ? 'ap-btn--secondary' : 'ap-btn--primary'}`}
              style={{
                cursor:
                  importStatus === 'importing' ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                gap: 6,
                alignItems: 'center',
              }}
            >
              <Upload size={ICON_SM} strokeWidth={STROKE} />
              {importStatus === 'importing'
                ? isCz
                  ? 'Zpracovávám…'
                  : 'Processing…'
                : isCz
                  ? 'Nahrát výpis'
                  : 'Upload statement'}
              <input
                type='file'
                accept='.csv,.xml,.txt'
                style={{ display: 'none' }}
                disabled={importStatus === 'importing'}
                onChange={handleStatementImport}
              />
            </label>
          </div>

          {/* Sync card */}
          <div className='ap-card'>
            <h3 className='ap-card__title'>
              <RefreshCw size={ICON_MD} strokeWidth={STROKE} />
              {isCz ? 'Synchronizace' : 'Sync'}
            </h3>
            <p
              style={{
                color: 'var(--muted)',
                fontSize: 14,
                margin: '0 0 14px',
              }}
            >
              {isCz
                ? 'Všechna data jsou automaticky synchronizována se serverem.'
                : 'All data is automatically synced with the server.'}
            </p>
            <button
              className='ap-btn ap-btn--secondary'
              type='button'
              onClick={() =>
                announce({
                  kind: 'info',
                  label: isCz
                    ? 'Data jsou synchronizována automaticky'
                    : 'Data is synced automatically',
                })
              }
            >
              <RefreshCw size={ICON_SM} strokeWidth={STROKE} />
              {isCz ? 'Synchronizovat nyní' : 'Sync now'}
            </button>
          </div>

          <div className='ap-save-bar'>
            <button
              className='ap-btn ap-btn--primary'
              type='button'
              onClick={handleSave}
            >
              <Save size={ICON_SM} strokeWidth={STROKE} /> {saveLabel}
            </button>
          </div>

          <ApiSettings lang={lang} />

          <AccountantAccess lang={lang} />
        </div>
      )}

      {/* ── TAB 4: PLAN ──────────────────────────────────────── */}
      {tab === 4 && (
        <div className='settings-tab-body'>
          {/* Current plan card */}
          <div className='ap-card'>
            <h3 className='ap-card__title'>
              <CreditCard size={ICON_MD} strokeWidth={STROKE} />
              {isCz ? 'Váš plán' : 'Your plan'}
            </h3>

            <div className='ap-integration'>
              <div className='ap-integration__body'>
                <div className='ap-integration__title'>
                  {isCz ? `${planLabel} plán` : `${planLabel} plan`}
                  <span
                    className={`pill ${isPro ? 'paid' : 'draft'}`}
                    style={{
                      fontSize: 10.5,
                      padding: '2px 8px',
                      marginLeft: 8,
                    }}
                  >
                    {planLabel}
                  </span>
                </div>
                <div className='ap-integration__desc'>
                  {isPro
                    ? subscription?.currentPeriodEnd
                      ? isCz
                        ? `Platí do: ${new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString('cs-CZ')}`
                        : `Valid until: ${new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString('en-GB')}`
                      : isCz
                        ? 'Aktivní předplatné'
                        : 'Active subscription'
                    : isCz
                      ? `Faktury: ${invoiceCount} / 5 využito`
                      : `Invoices: ${invoiceCount} / 5 used`}
                </div>
              </div>
              {isPro && (
                <div className='ap-integration__action'>
                  <button
                    className='ap-btn ap-btn--secondary'
                    type='button'
                    onClick={handleManageSubscription}
                  >
                    {isCz ? 'Spravovat' : 'Manage'}
                  </button>
                </div>
              )}
            </div>

            {/* Invoice progress bar for free users */}
            {!isPro && (
              <div style={{ marginTop: 12, marginBottom: 4 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: 'var(--muted)',
                    marginBottom: 6,
                  }}
                >
                  <span>{isCz ? 'Využité faktury' : 'Invoices used'}</span>
                  <span>{invoiceCount} / 5</span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: 'var(--border)',
                    borderRadius: 3,
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, (invoiceCount / 5) * 100)}%`,
                      background:
                        invoiceCount >= 5 ? 'var(--danger)' : 'var(--accent)',
                      borderRadius: 3,
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Invoice progress bar for Standard users */}
            {isStandard && (
              <div style={{ marginTop: 12, marginBottom: 4 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: 'var(--muted)',
                    marginBottom: 6,
                  }}
                >
                  <span>{isCz ? 'Faktury za rok' : 'Invoices this year'}</span>
                  <span>{invoiceCount} / 100</span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: 'var(--border)',
                    borderRadius: 3,
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, (invoiceCount / 100) * 100)}%`,
                      background:
                        invoiceCount >= 100 ? 'var(--danger)' : 'var(--accent)',
                      borderRadius: 3,
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Upgrade card — shown for free and Standard users */}
          {!isMax && (
            <div className='ap-card'>
              <h3 className='ap-card__title'>
                <TrendingUp size={ICON_MD} strokeWidth={STROKE} />
                {!isPro
                  ? isCz
                    ? 'Vyberte plán'
                    : 'Choose a plan'
                  : isCz
                    ? 'Upgradujte na Max'
                    : 'Upgrade to Max'}
              </h3>
              <p
                style={{
                  color: 'var(--muted)',
                  fontSize: 14,
                  margin: '0 0 18px',
                }}
              >
                {!isPro
                  ? isCz
                    ? 'Získejte více faktur a AI funkce.'
                    : 'Get more invoices and AI features.'
                  : isCz
                    ? 'Neomezené faktury, neomezené AI a prioritní podpora.'
                    : 'Unlimited invoices, unlimited AI, and priority support.'}
              </p>

              <div className={`ap-grid ap-grid--${!isPro ? '2' : '1'}`}>
                {/* Standard — shown only for free users */}
                {!isPro && (
                  <div className='plan-pricing-card'>
                    <div className='plan-pricing__interval'>Standard</div>
                    <div className='plan-pricing__price'>65 CZK</div>
                    <div className='plan-pricing__sub'>
                      {isCz
                        ? '/ měsíc · 100 faktur/rok'
                        : '/ month · 100 invoices/yr'}
                    </div>
                    <button
                      className='ap-btn ap-btn--secondary'
                      style={{ width: '100%', marginTop: 14 }}
                      type='button'
                      disabled={checkoutLoading !== null}
                      onClick={() => handleCheckout('month', 'standard')}
                    >
                      {checkoutLoading === 'month'
                        ? isCz
                          ? 'Načítání…'
                          : 'Loading…'
                        : isCz
                          ? 'Předplatit'
                          : 'Subscribe'}
                    </button>
                  </div>
                )}

                {/* Max */}
                <div className='plan-pricing-card plan-pricing-card--featured'>
                  {!isPro && (
                    <div className='plan-pricing__badge'>
                      {isCz ? 'Nejoblíbenější' : 'Most popular'}
                    </div>
                  )}
                  <div className='plan-pricing__interval'>Max</div>
                  <div className='plan-pricing__price'>120 CZK</div>
                  <div className='plan-pricing__sub'>
                    {isCz
                      ? '/ měsíc · vše neomezené'
                      : '/ month · everything unlimited'}
                  </div>
                  <button
                    className='ap-btn ap-btn--primary'
                    style={{ width: '100%', marginTop: 14 }}
                    type='button'
                    disabled={checkoutLoading !== null}
                    onClick={() => handleCheckout('month', 'max')}
                  >
                    {checkoutLoading === 'year'
                      ? isCz
                        ? 'Načítání…'
                        : 'Loading…'
                      : isCz
                        ? 'Předplatit Max'
                        : 'Subscribe to Max'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
