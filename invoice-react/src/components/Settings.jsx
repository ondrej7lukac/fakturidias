import { useState, useEffect } from 'react'
import { parseIban, calculateIban } from '../utils/bank'
import AresSearch from './AresSearch'

export default function Settings({
    defaultSupplier,
    setDefaultSupplier,
    lang,
    categories,
    onLogout,
    user,
    t
}) {
    const [activeTab, setActiveTab] = useState('basic') // 'basic', 'finance', 'integrations'
    const [lockedFields, setLockedFields] = useState({
        name: !!defaultSupplier?.name,
        ico: !!defaultSupplier?.ico,
        vat: !!defaultSupplier?.vat,
        address: !!defaultSupplier?.address,
        registry: !!defaultSupplier?.registry
    })

    const [smtpConfig, setSmtpConfig] = useState({
        useGoogle: false,
        fromName: '',
        fromEmail: ''
    })

    // Initialize bank details if missing and iban exists
    useEffect(() => {
        if (defaultSupplier?.iban && !defaultSupplier.accountNumber) {
            const parsed = parseIban(defaultSupplier.iban)
            if (parsed) {
                setDefaultSupplier(prev => ({
                    ...prev,
                    accountNumber: parsed.accountNumber || '',
                    bankCode: parsed.bankCode || '',
                    prefix: parsed.prefix || ''
                }))
            }
        }
    }, [defaultSupplier?.iban])

    // Load SMTP settings and sync auth status
    useEffect(() => {
        const savedSmtp = localStorage.getItem('smtpConfig')
        if (savedSmtp) {
            setSmtpConfig(JSON.parse(savedSmtp))
        }

        fetch('/auth/google/status')
            .then(res => res.json())
            .then(data => {
                setSmtpConfig(prev => {
                    const shouldBeConnected = data.connected;
                    if (prev.useGoogle !== shouldBeConnected) {
                        const newConfig = { ...prev, useGoogle: shouldBeConnected };
                        localStorage.setItem('smtpConfig', JSON.stringify(newConfig));
                        return newConfig;
                    }
                    return prev;
                });
            })
            .catch(e => console.error("Failed to sync auth status in Settings", e));
    }, [])

    // Smart Bank Logic - Auto Calculate IBAN
    useEffect(() => {
        if (defaultSupplier?.accountNumber && defaultSupplier?.bankCode) {
            const newIban = calculateIban(defaultSupplier.accountNumber, defaultSupplier.bankCode, defaultSupplier.prefix)
            if (newIban && newIban !== defaultSupplier?.iban) {
                setDefaultSupplier(prev => ({ ...prev, iban: newIban }))
            }
        }
    }, [defaultSupplier?.accountNumber, defaultSupplier?.bankCode, defaultSupplier?.prefix])

    const handleProfileChange = (e) => {
        const { name, value, type, checked } = e.target
        setDefaultSupplier(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    const handleAresData = (data) => {
        let registryText = ''
        if (data.legalFormCode && [101, 102, 105].includes(parseInt(data.legalFormCode))) {
            registryText = lang === 'cs' ? 'Zapsán v živnostenském rejstříku.' : 'Registered in the Trade Register.'
        } else {
            const code = parseInt(data.legalFormCode)
            let registerInfo = null
            if ([111, 112, 113, 121].includes(code)) {
                registerInfo = {
                    cs: { subject: 'Společnost', register: 'obchodním rejstříku' },
                    en: { subject: 'Company', register: 'Commercial Register' }
                }
            } else if ([706, 701].includes(code)) {
                registerInfo = {
                    cs: { subject: 'Spolek', register: 'spolkovém rejstříku' },
                    en: { subject: 'Association', register: 'Association Register' }
                }
            }
            if (registerInfo && data.fileNumber) {
                const parts = data.fileNumber.split('/')
                const courtMap = { 'MSPH': 'Městským soudem v Praze', 'KSBR': 'Krajským soudem v Brně', 'KSOS': 'Krajským soudem v Ostravě' }
                const courtName = parts[1] ? (courtMap[parts[1]] || `soudem ${parts[1]}`) : ''
                registryText = lang === 'cs'
                    ? `${registerInfo.cs.subject} je zapsána v ${registerInfo.cs.register} vedeném ${courtName}, spisová značka ${parts[0]}.`
                    : `${registerInfo.en.subject} registered in ${registerInfo.en.register} kept by ${courtName}, file no. ${parts[0]}.`
            }
        }

        setDefaultSupplier(prev => ({
            ...prev,
            name: data.name,
            address: data.address,
            ico: data.ico,
            vat: data.vat || prev.vat,
            isVatPayer: data.isVatPayer || false,
            registry: registryText || prev.registry
        }))

        setLockedFields({ name: true, ico: true, vat: true, address: true, registry: true })
    }

    const handleSaveProfile = async () => {
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: { defaultSupplier } })
            })
            if (res.ok) alert(lang === 'cs' ? 'Profil uložen!' : 'Profile saved!')
        } catch (e) { alert(lang === 'cs' ? 'Chyba!' : 'Error!') }
    }

    const unlockField = (field) => setLockedFields(prev => ({ ...prev, [field]: false }))

    return (
        <div className="settings-v3-layout">
            {/* Sidebar Navigation */}
            <aside className="settings-v3-sidebar">
                <button
                    className={`settings-v3-nav-item ${activeTab === 'basic' ? 'active' : ''}`}
                    onClick={() => setActiveTab('basic')}
                >
                    <span>📇</span> {lang === 'cs' ? 'Základní údaje' : 'Basic Info'}
                </button>
                <button
                    className={`settings-v3-nav-item ${activeTab === 'finance' ? 'active' : ''}`}
                    onClick={() => setActiveTab('finance')}
                >
                    <span>💰</span> {lang === 'cs' ? 'Daně a Banka' : 'Taxes & Bank'}
                </button>
                <button
                    className={`settings-v3-nav-item ${activeTab === 'integrations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('integrations')}
                >
                    <span>🔌</span> {lang === 'cs' ? 'Integrace' : 'Integrations'}
                </button>
            </aside>

            {/* Main Content Area */}
            <div className="settings-v3-content">
                {activeTab === 'basic' && (
                    <div className="fade-in">
                        <header className="settings-v3-header">
                            <h1>{lang === 'cs' ? 'Základní údaje' : 'Basic Info'}</h1>
                            <p>{lang === 'cs' ? 'Správa vaší identity a údajů dodavatele.' : 'Manage your identity and supplier details.'}</p>
                        </header>

                        <div className="ares-v3-box">
                            <AresSearch
                                clientName={defaultSupplier?.name || ''}
                                clientIco={defaultSupplier?.ico || ''}
                                onClientNameChange={(v) => setDefaultSupplier(p => ({ ...p, name: v }))}
                                onClientIcoChange={(v) => setDefaultSupplier(p => ({ ...p, ico: v }))}
                                onAresData={handleAresData}
                                t={t}
                                region={defaultSupplier?.region || 'CZ'}
                            />
                        </div>

                        <section className="settings-v3-section">
                            <h2>{lang === 'cs' ? 'Fakturační údaje' : 'Billing Details'}</h2>
                            <div className="settings-v3-form-grid">
                                <div className="settings-v3-field">
                                    <div className="settings-v3-label-row">
                                        <label>{t.homeRegion}</label>
                                    </div>
                                    <select
                                        name="region"
                                        value={defaultSupplier?.region || 'CZ'}
                                        onChange={handleProfileChange}
                                    >
                                        <option value="CZ">Czech Republic 🇨🇿</option>
                                        <option value="SK">Slovakia 🇸🇰</option>
                                    </select>
                                </div>

                                <div className="settings-v3-field">
                                    <div className="settings-v3-label-row">
                                        <label>{t.supplierName} *</label>
                                        {lockedFields.name && <button className="settings-v3-edit-link" onClick={() => unlockField('name')}>{lang === 'cs' ? 'Upravit' : 'Edit'}</button>}
                                    </div>
                                    <input
                                        name="name"
                                        className={lockedFields.name ? 'settings-v3-input-locked' : ''}
                                        value={defaultSupplier?.name || ''}
                                        onChange={handleProfileChange}
                                        readOnly={lockedFields.name}
                                    />
                                </div>

                                <div className="settings-v3-field">
                                    <div className="settings-v3-label-row">
                                        <label>{lang === 'cs' ? 'IČO *' : 'Business ID (IČO) *'}</label>
                                        {lockedFields.ico && <button className="settings-v3-edit-link" onClick={() => unlockField('ico')}>{lang === 'cs' ? 'Upravit' : 'Edit'}</button>}
                                    </div>
                                    <input
                                        name="ico"
                                        className={lockedFields.ico ? 'settings-v3-input-locked' : ''}
                                        value={defaultSupplier?.ico || ''}
                                        onChange={handleProfileChange}
                                        readOnly={lockedFields.ico}
                                    />
                                </div>

                                <div className="settings-v3-field">
                                    <div className="settings-v3-label-row">
                                        <label>{lang === 'sk' ? 'DIČ' : 'VAT / Tax ID (DIČ)'}</label>
                                        {lockedFields.vat && <button className="settings-v3-edit-link" onClick={() => unlockField('vat')}>{lang === 'cs' ? 'Upravit' : 'Edit'}</button>}
                                    </div>
                                    <input
                                        name="vat"
                                        className={lockedFields.vat ? 'settings-v3-input-locked' : ''}
                                        value={defaultSupplier?.vat || ''}
                                        onChange={handleProfileChange}
                                        readOnly={lockedFields.vat}
                                    />
                                </div>

                                <div className="settings-v3-field full">
                                    <div className="settings-v3-label-row">
                                        <label>{t.supplierAddress} *</label>
                                        {lockedFields.address && <button className="settings-v3-edit-link" onClick={() => unlockField('address')}>{lang === 'cs' ? 'Upravit' : 'Edit'}</button>}
                                    </div>
                                    <input
                                        name="address"
                                        className={lockedFields.address ? 'settings-v3-input-locked' : ''}
                                        value={defaultSupplier?.address || ''}
                                        onChange={handleProfileChange}
                                        readOnly={lockedFields.address}
                                    />
                                </div>

                                <div className="settings-v3-field full">
                                    <div className="settings-v3-label-row">
                                        <label>{lang === 'cs' ? 'Zápis v rejstříku' : 'Registry Entry'}</label>
                                        {lockedFields.registry && <button className="settings-v3-edit-link" onClick={() => unlockField('registry')}>{lang === 'cs' ? 'Upravit' : 'Edit'}</button>}
                                    </div>
                                    <input
                                        name="registry"
                                        className={lockedFields.registry ? 'settings-v3-input-locked' : ''}
                                        value={defaultSupplier?.registry || ''}
                                        onChange={handleProfileChange}
                                        readOnly={lockedFields.registry}
                                    />
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'finance' && (
                    <div className="fade-in">
                        <header className="settings-v3-header">
                            <h1>{lang === 'cs' ? 'Daně a Banka' : 'Taxes & Bank'}</h1>
                            <p>{lang === 'cs' ? 'Nastavení finančních toků a DPH.' : 'Manage financial flows and VAT.'}</p>
                        </header>

                        <section className="settings-v3-section">
                            <h2>{lang === 'cs' ? 'Status plátce' : 'Tax Status'}</h2>
                            <div className="settings-v3-form-grid">
                                <div className="settings-v3-field">
                                    <label>{t.taxStatus}</label>
                                    <select
                                        name="taxStatus"
                                        value={defaultSupplier?.taxStatus || 'non-payer'}
                                        onChange={handleProfileChange}
                                    >
                                        <option value="non-payer">{t.nonVatPayer}</option>
                                        <option value="vat-payer">{t.vatPayer}</option>
                                        <option value="identified-person">{t.identifiedPerson}</option>
                                    </select>
                                </div>
                                <div className="settings-v3-field" style={{ justifyContent: 'center' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            name="isVatPayer"
                                            checked={defaultSupplier?.isVatPayer || false}
                                            onChange={handleProfileChange}
                                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                        />
                                        <span>{lang === 'cs' ? 'Aktivní plátce DPH' : 'Active VAT Payer'}</span>
                                    </label>
                                </div>
                            </div>
                        </section>

                        <section className="settings-v3-section">
                            <h2>{lang === 'cs' ? 'Bankovní spojení' : 'Bank Details'}</h2>
                            <div className="settings-v3-form-grid">
                                <div className="settings-v3-field">
                                    <label>{lang === 'cs' ? 'Číslo účtu / Kód banky' : 'Account Number / Bank Code'}</label>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <input
                                            name="accountNumber"
                                            value={defaultSupplier?.accountNumber || ''}
                                            onChange={handleProfileChange}
                                            placeholder="1234567890"
                                        />
                                        <span style={{ opacity: 0.3 }}>/</span>
                                        <input
                                            name="bankCode"
                                            value={defaultSupplier?.bankCode || ''}
                                            onChange={handleProfileChange}
                                            style={{ width: '120px' }}
                                            placeholder="0800"
                                        />
                                    </div>
                                </div>
                                <div className="settings-v3-field">
                                    <label>IBAN</label>
                                    <input
                                        name="iban"
                                        value={defaultSupplier?.iban || ''}
                                        readOnly
                                        style={{ background: 'rgba(255,255,255,0.03)', opacity: 0.6 }}
                                    />
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'integrations' && (
                    <div className="fade-in">
                        <header className="settings-v3-header">
                            <h1>{lang === 'cs' ? 'Integrace' : 'Integrations'}</h1>
                            <p>{lang === 'cs' ? 'Propojte své cloudové služby.' : 'Connect your cloud services.'}</p>
                        </header>

                        <section className="settings-v3-section">
                            <h2>Google Workspace</h2>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>OAuth2 Authentication</div>
                                    <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{smtpConfig.useGoogle ? `Connected as ${smtpConfig.fromEmail}` : 'Not connected'}</div>
                                </div>
                                {!smtpConfig.useGoogle ? (
                                    <button className="settings-v3-save-btn" onClick={() => { /* oauth logic */ }}>Connect</button>
                                ) : (
                                    <button className="danger" onClick={() => { /* diconnect logic */ }}>Disconnect</button>
                                )}
                            </div>
                        </section>
                    </div>
                )}

                <footer className="settings-v3-action-bar">
                    <button className="settings-v3-save-btn" onClick={handleSaveProfile}>
                        {lang === 'cs' ? '💾 Uložit všechna nastavení' : '💾 Save All Settings'}
                    </button>
                </footer>
            </div>
        </div>
    )
}
