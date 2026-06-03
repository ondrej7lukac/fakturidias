import './Onboarding.css';
import { useEffect, useMemo, useState } from 'react';
import AresSearch from './AresSearch';
import { calculateIban } from '../utils/bank';
import {
  Sparkles,
  Activity,
  Search,
  Contact,
  Wallet,
  CheckCircle2,
  ChevronRight,
  X,
  ICON_SM,
  ICON_MD,
  ICON_LG,
  STROKE,
} from '@/lib/icons';

export interface OnboardingSupplier {
  name?: string;
  ico?: string;
  vat?: string;
  address?: string;
  email?: string;
  phone?: string;
  web?: string;
  region?: string;
  isVatPayer?: boolean;
  vatRate?: string;
  defaultCurrency?: string;
  defaultDueDays?: string;
  accountNumber?: string;
  bankCode?: string;
  prefix?: string;
  iban?: string;
  bic?: string;
  [key: string]: unknown;
}

interface OnboardingProps {
  lang: string;
  t: Record<string, string>;
  mode: 'welcome' | 'company';
  initialSupplier?: OnboardingSupplier | null;
  onComplete: (supplier: OnboardingSupplier) => void;
  onSkip: () => void;
}

type StepId = 'intro' | 'company' | 'taxbank' | 'done';

const COPY = {
  cs: {
    skip: 'Přeskočit',
    cancel: 'Zrušit',
    back: 'Zpět',
    continue: 'Pokračovat',
    step: 'Krok',
    of: 'z',
    introBadge: 'Vítejte ve Fakturidias',
    introTitle: 'Fakturujte rychleji, s méně klikáním.',
    introLead:
      'Fakturidias je česká aplikace pro vystavování faktur. Pojďme nastavit vaši firmu — zabere to méně než minutu. Nejdřív tři věci, které vám ušetří čas:',
    h1Title: 'AI vyplní fakturu za vás',
    h1Body:
      'Nadiktujte nebo napište jednu větu česky či anglicky a AI doplní klienta, položky i sazby DPH.',
    h2Title: 'Dynamický ostrov vás provází',
    h2Body:
      'Stavový pruh v záhlaví hlasem i textem oznamuje, co se právě děje — plně přístupné pro čtečky obrazovky.',
    h3Title: 'ARES doplní firmu z IČO',
    h3Body:
      'Začněte psát název firmy nebo IČO a údaje z obchodního rejstříku se vyplní samy.',
    introCta: 'Pojďme na to',
    companyTitle: 'Vaše firma',
    companyLead:
      'Vyhledejte se v rejstříku ARES nebo vyplňte údaje ručně. Použijí se jako dodavatel na vašich fakturách.',
    name: 'Jméno / Název firmy',
    ico: 'IČO',
    vat: 'DIČ',
    address: 'Adresa',
    email: 'E-mail',
    phone: 'Telefon',
    web: 'Web',
    region: 'Region',
    taxTitle: 'Daně a banka',
    taxLead:
      'Nastavte DPH a bankovní účet. Vše můžete kdykoliv změnit v Nastavení.',
    vatPayer: 'Jsem plátce DPH',
    vatPayerHint: 'Vystavuji faktury s DPH a podávám přiznání.',
    vatRate: 'Výchozí sazba DPH',
    currency: 'Výchozí měna',
    dueDays: 'Splatnost (dní)',
    accountNumber: 'Číslo účtu',
    bankCode: 'Kód banky',
    iban: 'IBAN (vypočítá se)',
    bic: 'BIC / SWIFT',
    saveCompany: 'Uložit firmu',
    doneTitle: 'Hotovo, můžete fakturovat!',
    doneLead:
      'Vaše firma je nastavená. Vytvořte první fakturu — nebo nechte AI, ať ji vyplní za vás.',
    doneCta: 'Vytvořit první fakturu',
  },
  en: {
    skip: 'Skip',
    cancel: 'Cancel',
    back: 'Back',
    continue: 'Continue',
    step: 'Step',
    of: 'of',
    introBadge: 'Welcome to Fakturidias',
    introTitle: 'Invoice faster, with fewer clicks.',
    introLead:
      "Fakturidias is a Czech invoicing app. Let's set up your company — it takes under a minute. First, three things that save you time:",
    h1Title: 'AI fills the invoice for you',
    h1Body:
      'Dictate or type one sentence in Czech or English and AI fills the client, line items and VAT rates.',
    h2Title: 'The Dynamic Island guides you',
    h2Body:
      'The status bar in the header narrates what is happening in voice and text — fully accessible to screen readers.',
    h3Title: 'ARES fills your company from IČO',
    h3Body:
      'Start typing a company name or IČO and the business-registry details fill in automatically.',
    introCta: "Let's go",
    companyTitle: 'Your company',
    companyLead:
      'Look yourself up in the ARES registry or fill it in manually. It is used as the supplier on your invoices.',
    name: 'Name / Company',
    ico: 'Business ID (IČO)',
    vat: 'VAT ID (DIČ)',
    address: 'Address',
    email: 'Email',
    phone: 'Phone',
    web: 'Website',
    region: 'Region',
    taxTitle: 'Tax & bank',
    taxLead: 'Set VAT and your bank account. You can change anything in Settings.',
    vatPayer: 'I am a VAT payer',
    vatPayerHint: 'I issue invoices with VAT and file tax returns.',
    vatRate: 'Default VAT rate',
    currency: 'Default currency',
    dueDays: 'Due (days)',
    accountNumber: 'Account number',
    bankCode: 'Bank code',
    iban: 'IBAN (calculated)',
    bic: 'BIC / SWIFT',
    saveCompany: 'Save company',
    doneTitle: "You're ready to invoice!",
    doneLead:
      'Your company is set up. Create your first invoice — or let AI fill it in for you.',
    doneCta: 'Create first invoice',
  },
};

const EMPTY: OnboardingSupplier = {
  name: '',
  ico: '',
  vat: '',
  address: '',
  email: '',
  phone: '',
  web: '',
  region: 'CZ',
  isVatPayer: false,
  vatRate: '21',
  defaultCurrency: 'CZK',
  defaultDueDays: '14',
};

export default function Onboarding({
  lang,
  t,
  mode,
  initialSupplier,
  onComplete,
  onSkip,
}: OnboardingProps) {
  const c = lang === 'cs' ? COPY.cs : COPY.en;
  const steps: StepId[] = useMemo(
    () =>
      mode === 'welcome'
        ? ['intro', 'company', 'taxbank', 'done']
        : ['company', 'taxbank'],
    [mode],
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [supplier, setSupplier] = useState<OnboardingSupplier>(() =>
    mode === 'welcome'
      ? { ...EMPTY, ...(initialSupplier || {}) }
      : { ...EMPTY },
  );

  const current = steps[stepIndex];

  // Derive IBAN from account number + bank code, like Settings.tsx.
  useEffect(() => {
    if (supplier.accountNumber && supplier.bankCode) {
      const iban = calculateIban(
        supplier.accountNumber,
        supplier.bankCode,
        supplier.prefix,
      );
      if (iban && iban !== supplier.iban) {
        setSupplier((prev) => ({ ...prev, iban }));
      }
    }
  }, [supplier.accountNumber, supplier.bankCode, supplier.prefix]);

  const set = (key: keyof OnboardingSupplier, value: unknown) =>
    setSupplier((prev) => ({ ...prev, [key]: value }));

  const str = (key: keyof OnboardingSupplier): string =>
    typeof supplier[key] === 'string' ? (supplier[key] as string) : '';

  const nameValid = str('name').trim().length > 0;

  const finish = () => onComplete(supplier);

  const goBack = () => {
    if (stepIndex === 0) onSkip();
    else setStepIndex((i) => i - 1);
  };

  const goNext = () => {
    if (current === 'company' && !nameValid) return;
    if (current === 'taxbank' && mode === 'company') {
      finish();
      return;
    }
    if (current === 'done') {
      finish();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const handleAresData = (data: Record<string, unknown>) =>
    setSupplier((prev) => ({
      ...prev,
      name: (data.name as string) || prev.name,
      ico: (data.ico as string) || prev.ico,
      vat: (data.vat as string) || (data.dic as string) || prev.vat,
      address: (data.address as string) || prev.address,
      isVatPayer: data.isVatPayer ? true : prev.isVatPayer,
    }));

  return (
    <div
      className='ob-overlay'
      role='dialog'
      aria-modal='true'
      aria-label={c.introBadge}
    >
      <div className='ob-panel'>
        <div className='ob-topbar'>
          <div className='ob-dots' aria-hidden>
            {steps.map((s, i) => (
              <span
                key={s}
                className={`ob-dot${i === stepIndex ? ' ob-dot--active' : ''}${
                  i < stepIndex ? ' ob-dot--done' : ''
                }`}
              />
            ))}
          </div>
          <span className='ob-step-count'>
            {c.step} {stepIndex + 1} {c.of} {steps.length}
          </span>
          <button
            type='button'
            className='ob-skip'
            onClick={onSkip}
            aria-label={mode === 'welcome' ? c.skip : c.cancel}
          >
            {mode === 'welcome' ? c.skip : c.cancel}
            <X size={ICON_SM} strokeWidth={STROKE} />
          </button>
        </div>

        <div className='ob-body'>
          {current === 'intro' && (
            <div className='ob-step ob-intro'>
              <div className='ob-badge'>
                <Sparkles size={ICON_SM} strokeWidth={STROKE} />
                {c.introBadge}
              </div>
              <h1 className='ob-title'>{c.introTitle}</h1>
              <p className='ob-lead'>{c.introLead}</p>
              <div className='ob-highlights'>
                <div className='ob-highlight'>
                  <span className='ob-highlight__icon'>
                    <Sparkles size={ICON_LG} strokeWidth={STROKE} />
                  </span>
                  <h3 className='ob-highlight__title'>{c.h1Title}</h3>
                  <p className='ob-highlight__body'>{c.h1Body}</p>
                </div>
                <div className='ob-highlight'>
                  <span className='ob-highlight__icon ob-highlight__icon--alt'>
                    <Activity size={ICON_LG} strokeWidth={STROKE} />
                  </span>
                  <h3 className='ob-highlight__title'>{c.h2Title}</h3>
                  <p className='ob-highlight__body'>{c.h2Body}</p>
                </div>
                <div className='ob-highlight'>
                  <span className='ob-highlight__icon'>
                    <Search size={ICON_LG} strokeWidth={STROKE} />
                  </span>
                  <h3 className='ob-highlight__title'>{c.h3Title}</h3>
                  <p className='ob-highlight__body'>{c.h3Body}</p>
                </div>
              </div>
            </div>
          )}

          {current === 'company' && (
            <div className='ob-step'>
              <h2 className='ob-step-title'>
                <Contact size={ICON_MD} strokeWidth={STROKE} />
                {c.companyTitle}
              </h2>
              <p className='ob-step-lead'>{c.companyLead}</p>

              <AresSearch
                clientName={str('name')}
                clientIco={str('ico')}
                onClientNameChange={(v) => set('name', v)}
                onClientIcoChange={(v) => set('ico', v)}
                onAresData={handleAresData}
                t={t}
                region={str('region') || 'CZ'}
              />

              <div className='ap-grid ap-grid--2 ob-grid'>
                <div className='ap-field'>
                  <label>
                    {c.name} <span className='req'>*</span>
                  </label>
                  <input
                    className='ap-input'
                    value={str('name')}
                    onChange={(e) => set('name', e.target.value)}
                  />
                </div>
                <div className='ap-field'>
                  <label>{c.region}</label>
                  <select
                    className='ap-select'
                    value={str('region') || 'CZ'}
                    onChange={(e) => set('region', e.target.value)}
                  >
                    <option value='CZ'>Czech Republic (CZ)</option>
                    <option value='SK'>Slovakia (SK)</option>
                    <option value='AT'>Austria (AT)</option>
                    <option value='DE'>Germany (DE)</option>
                  </select>
                </div>
                <div className='ap-field'>
                  <label>{c.ico}</label>
                  <input
                    className='ap-input'
                    value={str('ico')}
                    onChange={(e) => set('ico', e.target.value)}
                  />
                </div>
                <div className='ap-field'>
                  <label>{c.vat}</label>
                  <input
                    className='ap-input'
                    value={str('vat')}
                    onChange={(e) => set('vat', e.target.value)}
                  />
                </div>
                <div className='ap-field ob-span-2'>
                  <label>{c.address}</label>
                  <input
                    className='ap-input'
                    value={str('address')}
                    onChange={(e) => set('address', e.target.value)}
                  />
                </div>
                <div className='ap-field'>
                  <label>{c.email}</label>
                  <input
                    className='ap-input'
                    type='email'
                    value={str('email')}
                    onChange={(e) => set('email', e.target.value)}
                  />
                </div>
                <div className='ap-field'>
                  <label>{c.phone}</label>
                  <input
                    className='ap-input'
                    type='tel'
                    value={str('phone')}
                    onChange={(e) => set('phone', e.target.value)}
                  />
                </div>
                <div className='ap-field ob-span-2'>
                  <label>{c.web}</label>
                  <input
                    className='ap-input'
                    value={str('web')}
                    onChange={(e) => set('web', e.target.value)}
                    placeholder='fakturidias.cz'
                  />
                </div>
              </div>
            </div>
          )}

          {current === 'taxbank' && (
            <div className='ob-step'>
              <h2 className='ob-step-title'>
                <Wallet size={ICON_MD} strokeWidth={STROKE} />
                {c.taxTitle}
              </h2>
              <p className='ob-step-lead'>{c.taxLead}</p>

              <div className='ob-vat-row'>
                <div>
                  <div className='ob-vat-title'>{c.vatPayer}</div>
                  <div className='ob-vat-hint'>{c.vatPayerHint}</div>
                </div>
                <button
                  type='button'
                  className='ap-toggle'
                  data-on={String(!!supplier.isVatPayer)}
                  aria-label={c.vatPayer}
                  aria-pressed={!!supplier.isVatPayer}
                  onClick={() => set('isVatPayer', !supplier.isVatPayer)}
                />
              </div>

              <div className='ap-grid ap-grid--3 ob-grid'>
                <div className='ap-field'>
                  <label>{c.vatRate}</label>
                  <select
                    className='ap-select'
                    value={str('vatRate') || '21'}
                    onChange={(e) => set('vatRate', e.target.value)}
                  >
                    <option value='21'>21 %</option>
                    <option value='15'>15 %</option>
                    <option value='12'>12 %</option>
                    <option value='10'>10 %</option>
                    <option value='0'>0 %</option>
                  </select>
                </div>
                <div className='ap-field'>
                  <label>{c.currency}</label>
                  <select
                    className='ap-select'
                    value={str('defaultCurrency') || 'CZK'}
                    onChange={(e) => set('defaultCurrency', e.target.value)}
                  >
                    <option value='CZK'>CZK</option>
                    <option value='EUR'>EUR</option>
                    <option value='USD'>USD</option>
                  </select>
                </div>
                <div className='ap-field'>
                  <label>{c.dueDays}</label>
                  <input
                    className='ap-input'
                    type='number'
                    min='1'
                    max='365'
                    value={str('defaultDueDays') || '14'}
                    onChange={(e) => set('defaultDueDays', e.target.value)}
                  />
                </div>
              </div>

              <div className='ap-grid ap-grid--2 ob-grid'>
                <div className='ap-field'>
                  <label>{c.accountNumber}</label>
                  <input
                    className='ap-input'
                    value={str('accountNumber')}
                    onChange={(e) => set('accountNumber', e.target.value)}
                    placeholder='1234567890'
                  />
                </div>
                <div className='ap-field'>
                  <label>{c.bankCode}</label>
                  <input
                    className='ap-input'
                    value={str('bankCode')}
                    onChange={(e) => set('bankCode', e.target.value)}
                    placeholder='0800'
                  />
                </div>
                <div className='ap-field'>
                  <label>{c.iban}</label>
                  <input
                    className='ap-input'
                    value={str('iban')}
                    readOnly
                    style={{ opacity: 0.6 }}
                  />
                </div>
                <div className='ap-field'>
                  <label>{c.bic}</label>
                  <input
                    className='ap-input'
                    value={str('bic')}
                    onChange={(e) => set('bic', e.target.value)}
                    placeholder='GIBACZPX'
                  />
                </div>
              </div>
            </div>
          )}

          {current === 'done' && (
            <div className='ob-step ob-done'>
              <span className='ob-done__icon'>
                <CheckCircle2 size={40} strokeWidth={STROKE} />
              </span>
              <h1 className='ob-title'>{c.doneTitle}</h1>
              <p className='ob-lead'>{c.doneLead}</p>
            </div>
          )}
        </div>

        <div className='ob-footer'>
          <button type='button' className='ap-btn ap-btn--ghost' onClick={goBack}>
            {stepIndex === 0 ? (mode === 'welcome' ? c.skip : c.cancel) : c.back}
          </button>
          <button
            type='button'
            className='ap-btn ap-btn--primary'
            onClick={goNext}
            disabled={current === 'company' && !nameValid}
          >
            {current === 'intro'
              ? c.introCta
              : current === 'done'
                ? c.doneCta
                : current === 'taxbank' && mode === 'company'
                  ? c.saveCompany
                  : c.continue}
            <ChevronRight size={ICON_SM} strokeWidth={STROKE} />
          </button>
        </div>
      </div>
    </div>
  );
}
