import './AresSearch.css'
import { useState, useEffect } from 'react'
import { parseIban, calculateIban } from '../utils/bank'
import AresSearch from './AresSearch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Contact, Wallet, Plug, Save } from '@/lib/icons'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
  const [lockedFields, setLockedFields] = useState({
    name: !!defaultSupplier?.name,
    ico: !!defaultSupplier?.ico,
    vat: !!defaultSupplier?.vat,
    address: !!defaultSupplier?.address,
    registry: !!defaultSupplier?.registry,
  })

  const [smtpConfig, setSmtpConfig] = useState({
    useGoogle: false,
    fromName: '',
    fromEmail: '',
  })

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
            const newConfig = { ...prev, useGoogle: shouldBeConnected }
            localStorage.setItem('smtpConfig', JSON.stringify(newConfig))
            return newConfig
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

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      registryText = lang === 'cs' ? 'Zapsán v živnostenském rejstříku.' : 'Registered in the Trade Register.'
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
        registryText = lang === 'cs'
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

  const handleSaveProfile = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { defaultSupplier } }),
      })
      if (res.ok) alert(lang === 'cs' ? 'Profil uložen!' : 'Profile saved!')
    } catch {
      alert(lang === 'cs' ? 'Chyba!' : 'Error!')
    }
  }

  const unlockField = (field: string) => setLockedFields(prev => ({ ...prev, [field]: false }))

  const fieldClass = 'flex flex-col gap-1.5'
  const labelClass = 'text-xs font-semibold uppercase tracking-wide opacity-70'
  const lockedInputStyle = { background: 'rgba(255,255,255,0.03)', opacity: 0.7 }

  return (
    <div
      className="w-full max-w-3xl mx-auto px-4 py-6 md:py-10"
      style={{ paddingTop: 'calc(var(--headerH) + 2rem)' }}
    >
      <Tabs defaultValue="basic" className="w-full">

        {/* Tab navigation — horizontal on all screens, centered */}
        <TabsList className="w-full mb-8 h-auto p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}>
          <TabsTrigger value="basic" className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ color: 'var(--text)' }}>
            <Contact size={14} strokeWidth={2} className="mr-1.5" /> {lang === 'cs' ? 'Základní údaje' : 'Basic Info'}
          </TabsTrigger>
          <TabsTrigger value="finance" className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ color: 'var(--text)' }}>
            <Wallet size={14} strokeWidth={2} className="mr-1.5" /> {lang === 'cs' ? 'Daně a Banka' : 'Taxes & Bank'}
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ color: 'var(--text)' }}>
            <Plug size={14} strokeWidth={2} className="mr-1.5" /> {lang === 'cs' ? 'Integrace' : 'Integrations'}
          </TabsTrigger>
        </TabsList>

        {/* ── Basic Info ─────────────────────────────────── */}
        <TabsContent value="basic" className="space-y-6">
          <div>
            <h1 className="text-xl font-bold mb-1">{lang === 'cs' ? 'Základní údaje' : 'Basic Info'}</h1>
            <p className="text-sm opacity-60">{lang === 'cs' ? 'Správa vaší identity a údajů dodavatele.' : 'Manage your identity and supplier details.'}</p>
          </div>

          <div className="rounded-2xl p-4 border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'var(--border)' }}>
            <AresSearch
              clientName={defaultSupplier?.name || ''}
              clientIco={defaultSupplier?.ico || ''}
              onClientNameChange={(v: string) => setDefaultSupplier(p => ({ ...p!, name: v }))}
              onClientIcoChange={(v: string) => setDefaultSupplier(p => ({ ...p!, ico: v }))}
              onAresData={handleAresData}
              t={t}
              region={defaultSupplier?.region || 'CZ'}
            />
          </div>

          <div className="rounded-2xl p-5 border space-y-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'var(--border)' }}>
            <h2 className="text-base font-bold">{lang === 'cs' ? 'Fakturační údaje' : 'Billing Details'}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={fieldClass}>
                <Label className={labelClass}>{t.homeRegion}</Label>
                <select name="region" value={defaultSupplier?.region || 'CZ'} onChange={handleProfileChange}
                  className="w-full px-3 py-2 rounded-xl text-sm border" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                  <option value="CZ">Czech Republic (CZ)</option>
                  <option value="SK">Slovakia (SK)</option>
                </select>
              </div>

              <div className={fieldClass}>
                <div className="flex items-center justify-between">
                  <Label className={labelClass}>{t.supplierName} *</Label>
                  {lockedFields.name && <button className="text-xs text-blue-400 hover:underline" onClick={() => unlockField('name')}>{lang === 'cs' ? 'Upravit' : 'Edit'}</button>}
                </div>
                <Input name="name" value={defaultSupplier?.name || ''} onChange={handleProfileChange} readOnly={lockedFields.name}
                  style={lockedFields.name ? lockedInputStyle : {}} />
              </div>

              <div className={fieldClass}>
                <div className="flex items-center justify-between">
                  <Label className={labelClass}>{lang === 'cs' ? 'IČO *' : 'Business ID (IČO) *'}</Label>
                  {lockedFields.ico && <button className="text-xs text-blue-400 hover:underline" onClick={() => unlockField('ico')}>{lang === 'cs' ? 'Upravit' : 'Edit'}</button>}
                </div>
                <Input name="ico" value={defaultSupplier?.ico || ''} onChange={handleProfileChange} readOnly={lockedFields.ico}
                  style={lockedFields.ico ? lockedInputStyle : {}} />
              </div>

              <div className={fieldClass}>
                <div className="flex items-center justify-between">
                  <Label className={labelClass}>{lang === 'sk' ? 'DIČ' : 'VAT / Tax ID (DIČ)'}</Label>
                  {lockedFields.vat && <button className="text-xs text-blue-400 hover:underline" onClick={() => unlockField('vat')}>{lang === 'cs' ? 'Upravit' : 'Edit'}</button>}
                </div>
                <Input name="vat" value={defaultSupplier?.vat || ''} onChange={handleProfileChange} readOnly={lockedFields.vat}
                  style={lockedFields.vat ? lockedInputStyle : {}} />
              </div>

              <div className={`${fieldClass} sm:col-span-2`}>
                <div className="flex items-center justify-between">
                  <Label className={labelClass}>{t.supplierAddress} *</Label>
                  {lockedFields.address && <button className="text-xs text-blue-400 hover:underline" onClick={() => unlockField('address')}>{lang === 'cs' ? 'Upravit' : 'Edit'}</button>}
                </div>
                <Input name="address" value={defaultSupplier?.address || ''} onChange={handleProfileChange} readOnly={lockedFields.address}
                  style={lockedFields.address ? lockedInputStyle : {}} />
              </div>

              <div className={`${fieldClass} sm:col-span-2`}>
                <div className="flex items-center justify-between">
                  <Label className={labelClass}>{lang === 'cs' ? 'Zápis v rejstříku' : 'Registry Entry'}</Label>
                  {lockedFields.registry && <button className="text-xs text-blue-400 hover:underline" onClick={() => unlockField('registry')}>{lang === 'cs' ? 'Upravit' : 'Edit'}</button>}
                </div>
                <Input name="registry" value={defaultSupplier?.registry || ''} onChange={handleProfileChange} readOnly={lockedFields.registry}
                  style={lockedFields.registry ? lockedInputStyle : {}} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Taxes & Bank ────────────────────────────────── */}
        <TabsContent value="finance" className="space-y-6">
          <div>
            <h1 className="text-xl font-bold mb-1">{lang === 'cs' ? 'Daně a Banka' : 'Taxes & Bank'}</h1>
            <p className="text-sm opacity-60">{lang === 'cs' ? 'Nastavení finančních toků a DPH.' : 'Manage financial flows and VAT.'}</p>
          </div>

          <div className="rounded-2xl p-5 border space-y-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'var(--border)' }}>
            <h2 className="text-base font-bold">{lang === 'cs' ? 'Status plátce' : 'Tax Status'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={fieldClass}>
                <Label className={labelClass}>{t.taxStatus}</Label>
                <select name="taxStatus" value={defaultSupplier?.taxStatus || 'non-payer'} onChange={handleProfileChange}
                  className="w-full px-3 py-2 rounded-xl text-sm border" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                  <option value="non-payer">{t.nonVatPayer}</option>
                  <option value="vat-payer">{t.vatPayer}</option>
                  <option value="identified-person">{t.identifiedPerson}</option>
                </select>
              </div>
              <div className="flex items-center gap-3 pt-5">
                <input type="checkbox" id="isVatPayer" name="isVatPayer"
                  checked={defaultSupplier?.isVatPayer || false} onChange={handleProfileChange}
                  className="w-5 h-5 cursor-pointer rounded" />
                <label htmlFor="isVatPayer" className="text-sm cursor-pointer">
                  {lang === 'cs' ? 'Aktivní plátce DPH' : 'Active VAT Payer'}
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-5 border space-y-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'var(--border)' }}>
            <h2 className="text-base font-bold">{lang === 'cs' ? 'Bankovní spojení' : 'Bank Details'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={fieldClass}>
                <Label className={labelClass}>{lang === 'cs' ? 'Číslo účtu / Kód banky' : 'Account Number / Bank Code'}</Label>
                <div className="flex gap-2 items-center">
                  <Input name="accountNumber" value={defaultSupplier?.accountNumber || ''} onChange={handleProfileChange} placeholder="1234567890" />
                  <span className="opacity-30 font-bold">/</span>
                  <Input name="bankCode" value={defaultSupplier?.bankCode || ''} onChange={handleProfileChange} placeholder="0800" className="w-28 shrink-0" />
                </div>
              </div>
              <div className={fieldClass}>
                <Label className={labelClass}>IBAN</Label>
                <Input name="iban" value={defaultSupplier?.iban || ''} readOnly style={lockedInputStyle} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Integrations ─────────────────────────────────── */}
        <TabsContent value="integrations" className="space-y-6">
          <div>
            <h1 className="text-xl font-bold mb-1">{lang === 'cs' ? 'Integrace' : 'Integrations'}</h1>
            <p className="text-sm opacity-60">{lang === 'cs' ? 'Propojte své cloudové služby.' : 'Connect your cloud services.'}</p>
          </div>

          <div className="rounded-2xl p-5 border space-y-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'var(--border)' }}>
            <h2 className="text-base font-bold">Google Workspace</h2>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-semibold text-sm">OAuth2 Authentication</p>
                <p className="text-sm opacity-60 mt-0.5">
                  {smtpConfig.useGoogle ? `Connected as ${smtpConfig.fromEmail}` : 'Not connected'}
                </p>
              </div>
              {!smtpConfig.useGoogle ? (
                <Button onClick={onLogin} style={{ background: 'linear-gradient(135deg, rgba(124,247,212,0.92), rgba(138,164,255,0.92))', color: '#061022', fontWeight: 700 }}>
                  Connect
                </Button>
              ) : (
                <Button onClick={onLogout} variant="destructive">
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Save footer ─────────────────────────────────── */}
        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleSaveProfile}
            className="px-8 py-3 text-base font-bold"
            style={{
              background: 'linear-gradient(135deg, rgba(124,247,212,0.92), rgba(138,164,255,0.92))',
              color: '#061022',
              border: '1px solid rgba(255,255,255,0.14)',
            }}
          >
            <Save size={16} strokeWidth={2} className="mr-2" /> {lang === 'cs' ? 'Uložit všechna nastavení' : 'Save All Settings'}
          </Button>
        </div>
      </Tabs>
    </div>
  )
}
