import './Settings.css'
import { useState, useEffect } from 'react'
import { parseIban, calculateIban } from '../utils/bank'
import AresSearch from './AresSearch'
import {
  Contact, Wallet, Plug, Save, Mail, Cloud, Search, Check, RefreshCw,
  ICON_SM, ICON_MD, STROKE,
} from '@/lib/icons'

interface Supplier {
  name?: string
  ico?: string
  vat?: string
  address?: string
  registry?: string
  iban?: string
  accountNumber?: string
  bankCode?: string
  prefix?: string
  region?: string
  taxStatus?: string
  isVatPayer?: boolean
  vatRate?: string
  defaultCurrency?: string
  defaultDueDays?: string
  bankName?: string
  bic?: string
  email?: string
  phone?: string
  web?: string
  [key: string]: unknown
}

interface SettingsProps {
  defaultSupplier: Supplier | null
  setDefaultSupplier: (fn: (prev: Supplier | null) => Supplier) => void
  lang: string
  categories?: string[]
  onLogin?: () => void
  onLogout?: () => void
  user?: { email: string } | null
  t: Record<string, string>
}

export default function Settings({
  defaultSupplier,
  setDefaultSupplier,
  lang,
  onLogin,
  onLogout,
  t,
}: SettingsProps) {
  const [tab, setTab] = useState(1)
  const [lockedFields, setLockedFields] = useState({
    name: !!defaultSupplier?.name,
    ico: !!defaultSupplier?.ico,
    vat: !!defaultSupplier?.vat,
    address: !!defaultSupplier?.address,
    registry: !!defaultSupplier?.registry,
  })
  const [smtpConfig, setSmtpConfig] = useState({ useGoogle: false, fromEmail: '' })
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const isCz = lang === 'cs'

  useEffect(() => {
    if (defaultSupplier?.iban && !defaultSupplier.accountNumber) {
      const parsed = parseIban(defaultSupplier.iban)
      if (parsed) {
        setDefaultSupplier(prev => ({
          ...prev!,
          accountNumber: parsed.accountNumber || '',
          bankCode: parsed.bankCode || '',
          prefix: parsed.prefix || '',
        }))
      }
    }
  }, [defaultSupplier?.iban])

  useEffect(() => {
    const savedSmtp = localStorage.getItem('smtpConfig')
    if (savedSmtp) setSmtpConfig(JSON.parse(savedSmtp))
    fetch('/auth/google/status')
      .then(res => res.json())
      .then(data => {
        setSmtpConfig(prev => {
          const shouldBeConnected = data.connected
          if (prev.useGoogle !== shouldBeConnected) {
            const updated = { ...prev, useGoogle: shouldBeConnected }
            localStorage.setItem('smtpConfig', JSON.stringify(updated))
            return updated
          }
          return prev
        })
      })
      .catch(e => console.error('Failed to sync auth status', e))
  }, [])

  useEffect(() => {
    if (defaultSupplier?.accountNumber && defaultSupplier?.bankCode) {
      const newIban = calculateIban(
        defaultSupplier.accountNumber,
        defaultSupplier.bankCode,
        defaultSupplier.prefix,
      )
      if (newIban && newIban !== defaultSupplier?.iban) {
        setDefaultSupplier(prev => ({ ...prev!, iban: newIban }))
      }
    }
  }, [defaultSupplier?.accountNumber, defaultSupplier?.bankCode, defaultSupplier?.prefix])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setDefaultSupplier(prev => ({
      ...prev!,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleAresData = (data: Record<string, unknown>) => {
    let registryText = ''
    const legalCode = parseInt(String(data.legalFormCode || '0'))
    if ([101, 102, 105].includes(legalCode)) {
      registryText = isCz ? 'Zapsán v živnostenském rejstříku.' : 'Registered in the Trade Register.'
    } else {
      let registerInfo: { cs: { subject: string; register: string }; en: { subject: string; register: string } } | null = null
      if ([111, 112, 113, 121].includes(legalCode)) {
        registerInfo = { cs: { subject: 'Společnost', register: 'obchodním rejstříku' }, en: { subject: 'Company', register: 'Commercial Register' } }
      } else if ([706, 701].includes(legalCode)) {
        registerInfo = { cs: { subject: 'Spolek', register: 'spolkovém rejstříku' }, en: { subject: 'Association', register: 'Association Register' } }
      }
      if (registerInfo && data.fileNumber) {
        const parts = String(data.fileNumber).split('/')
        const courtMap: Record<string, string> = { MSPH: 'Městským soudem v Praze', KSBR: 'Krajským soudem v Brně', KSOS: 'Krajským soudem v Ostravě' }
        const courtName = parts[1] ? (courtMap[parts[1]] || `soudem ${parts[1]}`) : ''
        registryText = isCz
          ? `${registerInfo.cs.subject} je zapsána v ${registerInfo.cs.register} vedeném ${courtName}, spisová značka ${parts[0]}.`
          : `${registerInfo.en.subject} registered in ${registerInfo.en.register} kept by ${courtName}, file no. ${parts[0]}.`
      }
    }
    setDefaultSupplier(prev => ({
      ...prev!,
      name: String(data.name || ''),
      address: String(data.address || ''),
      ico: String(data.ico || ''),
      vat: String(data.vat || prev?.vat || ''),
      isVatPayer: Boolean(data.isVatPayer),
      registry: registryText || prev?.registry || '',
    }))
    setLockedFields({ name: true, ico: true, vat: true, address: true, registry: true })
  }

  const handleSave = async () => {
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { defaultSupplier } }),
      })
      setSaveStatus(res.ok ? 'saved' : 'idle')
    } catch {
      setSaveStatus('idle')
    }
    setTimeout(() => setSaveStatus('idle'), 2200)
  }

  const unlock = (field: string) => setLockedFields(prev => ({ ...prev, [field]: false }))

  const tabLabels = [
    isCz ? 'Základní údaje' : 'Identity',
    isCz ? 'Daně a Banka' : 'Tax & Bank',
    isCz ? 'Integrace' : 'Integrations',
  ]
  const tabSubs = [
    isCz ? 'Správa vaší identity a údajů dodavatele.' : 'Manage your identity and supplier details.',
    isCz ? 'DPH plátce, bankovní účet a výchozí měna.' : 'VAT status, bank account and default currency.',
    isCz ? 'Propojení s ARES, Google Drive, e-mail a API.' : 'ARES, Google Drive, email and API connections.',
  ]

  const saveLabel = saveStatus === 'saved'
    ? (isCz ? 'Uloženo' : 'Saved')
    : (isCz ? 'Uložit všechna nastavení' : 'Save all settings')

  return (
    <div className="ap-page">
      <div className="ap-page__head">
        <div>
          <h1 className="ap-page__title">{isCz ? 'Nastavení' : 'Settings'}</h1>
          <p className="ap-page__sub">{tabSubs[tab - 1]}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="ap-tabs" role="tablist">
        {tabLabels.map((label, i) => {
          const icons = [
            <Contact key="c" size={ICON_SM} strokeWidth={STROKE} />,
            <Wallet key="w" size={ICON_SM} strokeWidth={STROKE} />,
            <Plug key="p" size={ICON_SM} strokeWidth={STROKE} />,
          ]
          return (
            <button
              key={i}
              className={`ap-tabs__btn${tab === i + 1 ? ' ap-tabs__btn--active' : ''}`}
              onClick={() => setTab(i + 1)}
            >
              {icons[i]} {label}
            </button>
          )
        })}
      </div>

      {/* ── TAB 1: IDENTITY ──────────────────────────────────────── */}
      {tab === 1 && (
        <div className="settings-tab-body">
          {/* Identity card with ARES */}
          <div className="ap-card">
            <h3 className="ap-card__title">
              <Contact size={ICON_MD} strokeWidth={STROKE} />
              {isCz ? 'Základní údaje' : 'Identity'}
            </h3>

            <AresSearch
              clientName={defaultSupplier?.name || ''}
              clientIco={defaultSupplier?.ico || ''}
              onClientNameChange={(v: string) => setDefaultSupplier(p => ({ ...p!, name: v }))}
              onClientIcoChange={(v: string) => setDefaultSupplier(p => ({ ...p!, ico: v }))}
              onAresData={handleAresData}
              t={t}
              region={defaultSupplier?.region || 'CZ'}
            />

            <div className="ap-section-label">
              {isCz ? 'Fakturační údaje' : 'Billing details'}
            </div>

            <div className="ap-grid ap-grid--2">
              <div className="ap-field">
                <label>{isCz ? 'Domovský region' : 'Home region'}</label>
                <select className="ap-select" name="region" value={defaultSupplier?.region || 'CZ'} onChange={handleChange}>
                  <option value="CZ">Czech Republic (CZ)</option>
                  <option value="SK">Slovakia (SK)</option>
                  <option value="AT">Austria (AT)</option>
                  <option value="DE">Germany (DE)</option>
                </select>
              </div>

              <div className="ap-field">
                <div className="settings-fld-head">
                  <label className="settings-fld-label">
                    {t.supplierName || (isCz ? 'Vaše jméno / Název' : 'Your name / Company')}
                    {' '}<span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  {lockedFields.name && (
                    <button className="settings-unlock" onClick={() => unlock('name')}>
                      {isCz ? 'Upravit' : 'Edit'}
                    </button>
                  )}
                </div>
                <input
                  className="ap-input"
                  name="name"
                  value={defaultSupplier?.name || ''}
                  onChange={handleChange}
                  readOnly={lockedFields.name}
                  style={lockedFields.name ? { opacity: 0.6 } : {}}
                />
              </div>

              <div className="ap-field">
                <div className="settings-fld-head">
                  <label className="settings-fld-label">
                    {isCz ? 'IČO' : 'Business ID (IČO)'}
                    {' '}<span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  {lockedFields.ico && (
                    <button className="settings-unlock" onClick={() => unlock('ico')}>
                      {isCz ? 'Upravit' : 'Edit'}
                    </button>
                  )}
                </div>
                <input
                  className="ap-input"
                  name="ico"
                  value={defaultSupplier?.ico || ''}
                  onChange={handleChange}
                  readOnly={lockedFields.ico}
                  style={lockedFields.ico ? { opacity: 0.6 } : {}}
                />
              </div>

              <div className="ap-field">
                <div className="settings-fld-head">
                  <label className="settings-fld-label">
                    {isCz ? 'DIČ (VAT ID)' : 'VAT / Tax ID (DIČ)'}
                  </label>
                  {lockedFields.vat && (
                    <button className="settings-unlock" onClick={() => unlock('vat')}>
                      {isCz ? 'Upravit' : 'Edit'}
                    </button>
                  )}
                </div>
                <input
                  className="ap-input"
                  name="vat"
                  value={defaultSupplier?.vat || ''}
                  onChange={handleChange}
                  readOnly={lockedFields.vat}
                  style={lockedFields.vat ? { opacity: 0.6 } : {}}
                />
              </div>

              <div className="ap-field settings-span-2">
                <div className="settings-fld-head">
                  <label className="settings-fld-label">
                    {t.supplierAddress || (isCz ? 'Vaše adresa' : 'Your address')}
                    {' '}<span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  {lockedFields.address && (
                    <button className="settings-unlock" onClick={() => unlock('address')}>
                      {isCz ? 'Upravit' : 'Edit'}
                    </button>
                  )}
                </div>
                <input
                  className="ap-input"
                  name="address"
                  value={defaultSupplier?.address || ''}
                  onChange={handleChange}
                  readOnly={lockedFields.address}
                  style={lockedFields.address ? { opacity: 0.6 } : {}}
                />
              </div>

              <div className="ap-field settings-span-2">
                <div className="settings-fld-head">
                  <label className="settings-fld-label">
                    {isCz ? 'Zápis v rejstříku' : 'Registry entry'}
                  </label>
                  {lockedFields.registry && (
                    <button className="settings-unlock" onClick={() => unlock('registry')}>
                      {isCz ? 'Upravit' : 'Edit'}
                    </button>
                  )}
                </div>
                <input
                  className="ap-input"
                  name="registry"
                  value={defaultSupplier?.registry || ''}
                  onChange={handleChange}
                  readOnly={lockedFields.registry}
                  style={lockedFields.registry ? { opacity: 0.6 } : {}}
                />
              </div>
            </div>
          </div>

          {/* Contact card */}
          <div className="ap-card">
            <h3 className="ap-card__title">
              <Mail size={ICON_MD} strokeWidth={STROKE} />
              {isCz ? 'Kontakt' : 'Contact'}
            </h3>
            <div className="ap-grid ap-grid--2">
              <div className="ap-field">
                <label>{isCz ? 'E-mail' : 'Email'}</label>
                <input className="ap-input" name="email" type="email" value={defaultSupplier?.email || ''} onChange={handleChange} />
              </div>
              <div className="ap-field">
                <label>{isCz ? 'Telefon' : 'Phone'}</label>
                <input className="ap-input" name="phone" type="tel" value={defaultSupplier?.phone || ''} onChange={handleChange} />
              </div>
              <div className="ap-field settings-span-2">
                <label>{isCz ? 'Web' : 'Website'}</label>
                <input className="ap-input" name="web" value={defaultSupplier?.web || ''} onChange={handleChange} placeholder="fakturidias.cz" />
              </div>
            </div>
          </div>

          <div className="ap-save-bar">
            <button className="ap-btn ap-btn--ghost" type="button">{isCz ? 'Zrušit' : 'Cancel'}</button>
            <button className="ap-btn ap-btn--primary" type="button" onClick={handleSave}>
              <Save size={ICON_SM} strokeWidth={STROKE} /> {saveLabel}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 2: TAX & BANK ────────────────────────────────────── */}
      {tab === 2 && (
        <div className="settings-tab-body">
          {/* Tax details card */}
          <div className="ap-card">
            <h3 className="ap-card__title">
              <Wallet size={ICON_MD} strokeWidth={STROKE} />
              {isCz ? 'Daňové údaje' : 'Tax details'}
            </h3>

            {/* VAT payer toggle */}
            <div className="ap-integration" style={{ paddingTop: 4, paddingBottom: 20 }}>
              <div className="ap-integration__icon">
                <Check size={ICON_MD} strokeWidth={STROKE} />
              </div>
              <div className="ap-integration__body">
                <div className="ap-integration__title">
                  {isCz ? 'Plátce DPH' : 'VAT payer'}
                </div>
                <div className="ap-integration__desc">
                  {isCz
                    ? 'Vystavujete faktury s DPH a podáváte daňové přiznání.'
                    : 'You issue invoices with VAT and file tax returns.'}
                </div>
              </div>
              <div className="ap-integration__action">
                <button
                  className="ap-toggle"
                  data-on={String(!!defaultSupplier?.isVatPayer)}
                  aria-label={isCz ? 'Přepnout plátce DPH' : 'Toggle VAT payer'}
                  onClick={() => setDefaultSupplier(prev => ({ ...prev!, isVatPayer: !prev?.isVatPayer }))}
                />
              </div>
            </div>

            <div className="ap-grid ap-grid--3">
              <div className="ap-field">
                <label>{isCz ? 'Výchozí sazba DPH' : 'Default VAT rate'}</label>
                <select className="ap-select" name="vatRate" value={defaultSupplier?.vatRate || '21'} onChange={handleChange}>
                  <option value="21">21 %</option>
                  <option value="15">15 %</option>
                  <option value="10">10 %</option>
                  <option value="0">0 %</option>
                </select>
              </div>
              <div className="ap-field">
                <label>{isCz ? 'Výchozí měna' : 'Default currency'}</label>
                <select className="ap-select" name="defaultCurrency" value={defaultSupplier?.defaultCurrency || 'CZK'} onChange={handleChange}>
                  <option value="CZK">CZK</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="ap-field">
                <label>{isCz ? 'Výchozí splatnost (dní)' : 'Default due (days)'}</label>
                <input className="ap-input" type="number" name="defaultDueDays" value={defaultSupplier?.defaultDueDays || '14'} onChange={handleChange} min="1" max="365" />
              </div>
            </div>
          </div>

          {/* Bank account card */}
          <div className="ap-card">
            <h3 className="ap-card__title">
              <Wallet size={ICON_MD} strokeWidth={STROKE} />
              {isCz ? 'Bankovní účet' : 'Bank account'}
            </h3>
            <div className="ap-grid ap-grid--2">
              <div className="ap-field">
                <label>{isCz ? 'Číslo účtu / Kód banky' : 'Account number / Bank code'}</label>
                <div className="settings-account-row">
                  <input
                    className="ap-input"
                    name="accountNumber"
                    value={defaultSupplier?.accountNumber || ''}
                    onChange={handleChange}
                    placeholder="1234567890"
                  />
                  <span className="settings-slash">/</span>
                  <input
                    className="ap-input settings-bank-code"
                    name="bankCode"
                    value={defaultSupplier?.bankCode || ''}
                    onChange={handleChange}
                    placeholder="0800"
                  />
                </div>
              </div>
              <div className="ap-field">
                <label>IBAN</label>
                <input
                  className="ap-input"
                  name="iban"
                  value={defaultSupplier?.iban || ''}
                  readOnly
                  style={{ opacity: 0.6 }}
                />
              </div>
              <div className="ap-field">
                <label>BIC / SWIFT</label>
                <input className="ap-input" name="bic" value={defaultSupplier?.bic || ''} onChange={handleChange} placeholder="GIBACZPX" />
              </div>
              <div className="ap-field">
                <label>{isCz ? 'Banka' : 'Bank name'}</label>
                <select className="ap-select" name="bankName" value={defaultSupplier?.bankName || ''} onChange={handleChange}>
                  <option value="">{isCz ? '— Vyberte —' : '— Select —'}</option>
                  <option value="ČSOB">ČSOB (0300)</option>
                  <option value="KB">Komerční banka (0100)</option>
                  <option value="ČSAS">Česká spořitelna (0800)</option>
                  <option value="RB">Raiffeisenbank (5500)</option>
                  <option value="FIO">Fio banka (2010)</option>
                  <option value="MONETA">MONETA (0600)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="ap-save-bar">
            <button className="ap-btn ap-btn--ghost" type="button">{isCz ? 'Zrušit' : 'Cancel'}</button>
            <button className="ap-btn ap-btn--primary" type="button" onClick={handleSave}>
              <Save size={ICON_SM} strokeWidth={STROKE} /> {saveLabel}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 3: INTEGRATIONS ──────────────────────────────────── */}
      {tab === 3 && (
        <div className="settings-tab-body">
          <div className="ap-card">
            <h3 className="ap-card__title">
              <Plug size={ICON_MD} strokeWidth={STROKE} />
              {isCz ? 'Integrace' : 'Integrations'}
            </h3>

            {/* ARES */}
            <div className="ap-integration">
              <div className="ap-integration__icon">
                <Search size={ICON_MD} strokeWidth={STROKE} />
              </div>
              <div className="ap-integration__body">
                <div className="ap-integration__title">
                  {isCz ? 'ARES vyhledávání' : 'ARES lookup'}
                  <span className="ap-pill paid" style={{ fontSize: 10.5, padding: '2px 8px' }}>
                    {isCz ? 'Připojeno' : 'Connected'}
                  </span>
                </div>
                <div className="ap-integration__desc">
                  {isCz
                    ? 'Automatické vyplňování klienta podle IČO z českého obchodního rejstříku.'
                    : 'Auto-fill client details from the Czech business registry by IČO.'}
                </div>
              </div>
              <div className="ap-integration__action">
                <button className="ap-toggle" data-on="true" aria-label="ARES always on" />
              </div>
            </div>

            {/* Google Drive */}
            <div className="ap-integration">
              <div className="ap-integration__icon ap-integration__icon--alt">
                <Cloud size={ICON_MD} strokeWidth={STROKE} />
              </div>
              <div className="ap-integration__body">
                <div className="ap-integration__title">
                  {isCz ? 'Google Drive zálohy' : 'Google Drive backups'}
                  {smtpConfig.useGoogle && (
                    <span className="ap-pill paid" style={{ fontSize: 10.5, padding: '2px 8px' }}>
                      {isCz ? 'Připojeno' : 'Connected'}
                    </span>
                  )}
                </div>
                <div className="ap-integration__desc">
                  {smtpConfig.useGoogle
                    ? (isCz ? `Přihlášen jako: ${smtpConfig.fromEmail || 'Google'}` : `Connected as: ${smtpConfig.fromEmail || 'Google'}`)
                    : (isCz ? 'Automatické nahrávání PDF faktur na váš Google Drive.' : 'Automatically upload PDF invoices to your Google Drive.')}
                </div>
              </div>
              <div className="ap-integration__action">
                {smtpConfig.useGoogle ? (
                  <button className="ap-btn ap-btn--secondary" onClick={onLogout}>
                    {isCz ? 'Odpojit' : 'Disconnect'}
                  </button>
                ) : (
                  <button className="ap-btn ap-btn--primary" onClick={onLogin}>
                    <Cloud size={ICON_SM} strokeWidth={STROKE} />
                    {isCz ? 'Připojit' : 'Connect'}
                  </button>
                )}
              </div>
            </div>

            {/* Email sending */}
            <div className="ap-integration">
              <div className="ap-integration__icon">
                <Mail size={ICON_MD} strokeWidth={STROKE} />
              </div>
              <div className="ap-integration__body">
                <div className="ap-integration__title">
                  {isCz ? 'Odesílání e-mailem' : 'Email sending'}
                  {smtpConfig.useGoogle && (
                    <span className="ap-pill paid" style={{ fontSize: 10.5, padding: '2px 8px' }}>
                      {isCz ? 'Připojeno' : 'Connected'}
                    </span>
                  )}
                </div>
                <div className="ap-integration__desc">
                  {isCz
                    ? 'Posílejte faktury klientům přímo z aplikace přes Google.'
                    : 'Send invoices to clients directly from the app via Google.'}
                </div>
              </div>
              <div className="ap-integration__action">
                <button
                  className="ap-toggle"
                  data-on={String(smtpConfig.useGoogle)}
                  aria-label={isCz ? 'Přepnout e-mail' : 'Toggle email'}
                  onClick={smtpConfig.useGoogle ? onLogout : onLogin}
                />
              </div>
            </div>

            {/* API access */}
            <div className="ap-integration">
              <div className="ap-integration__icon ap-integration__icon--alt">
                <Plug size={ICON_MD} strokeWidth={STROKE} />
              </div>
              <div className="ap-integration__body">
                <div className="ap-integration__title">
                  {isCz ? 'API přístup' : 'API access'}
                </div>
                <div className="ap-integration__desc">
                  {isCz
                    ? 'Generujte API klíče a integrujte Fakturidias s vaším softwarem.'
                    : 'Generate API keys and integrate Fakturidias with your stack.'}
                </div>
              </div>
              <div className="ap-integration__action">
                <button className="ap-btn ap-btn--secondary">
                  {isCz ? 'Připojit' : 'Connect'}
                </button>
              </div>
            </div>
          </div>

          {/* Sync card */}
          <div className="ap-card">
            <h3 className="ap-card__title">
              <RefreshCw size={ICON_MD} strokeWidth={STROKE} />
              {isCz ? 'Synchronizace' : 'Sync'}
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 14px' }}>
              {isCz
                ? 'Všechna data jsou automaticky synchronizována se serverem.'
                : 'All data is automatically synced with the server.'}
            </p>
            <button className="ap-btn ap-btn--secondary" type="button">
              <RefreshCw size={ICON_SM} strokeWidth={STROKE} />
              {isCz ? 'Synchronizovat nyní' : 'Sync now'}
            </button>
          </div>

          <div className="ap-save-bar">
            <button className="ap-btn ap-btn--primary" type="button" onClick={handleSave}>
              <Save size={ICON_SM} strokeWidth={STROKE} /> {saveLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
