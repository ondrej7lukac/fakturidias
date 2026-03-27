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
                        if (shouldBeConnected) {
                            localStorage.setItem('google_tokens', JSON.stringify({ connected: true, source: 'server' }));
                        } else {
                            localStorage.removeItem('google_tokens');
                        }
                        window.dispatchEvent(new Event('google_login_update'));
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
                const currentClean = (defaultSupplier.iban || '').replace(/\s/g, '')
                const newClean = newIban.replace(/\s/g, '')
                if (currentClean !== newClean) {
                    setDefaultSupplier(prev => ({ ...prev, iban: newIban }))
                }
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

    const handlePasteBank = (e) => {
        const text = e.clipboardData.getData('text').trim()
        if (!text) return

        const cleanIban = text.replace(/\s/g, '').toUpperCase()
        if (/^[A-Z]{2}\d{10,}/.test(cleanIban)) {
            e.preventDefault()
            const parsed = parseIban(cleanIban)
            setDefaultSupplier(prev => ({
                ...prev,
                iban: cleanIban,
                accountNumber: parsed.accountNumber || prev.accountNumber,
                bankCode: parsed.bankCode || prev.bankCode,
                prefix: parsed.prefix || prev.prefix
            }))
            return
        }

        const czechMatch = text.match(/^(\d{0,6}-)?(\d{1,10})\/(\d{4})$/)
        if (czechMatch) {
            e.preventDefault()
            const prefix = czechMatch[1] ? czechMatch[1].replace('-', '') : ''
            const accountNumber = czechMatch[2]
            const bankCode = czechMatch[3]
            setDefaultSupplier(prev => ({ ...prev, prefix, accountNumber, bankCode }))
        }
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
                if (parts.length === 2) {
                    const [mark, courtCode] = parts
                    const courtMap = {
                        'MSPH': 'Městským soudem v Praze',
                        'KSBR': 'Krajským soudem v Brně',
                        'KSOS': 'Krajským soudem v Ostravě',
                        'KSPL': 'Krajským soudem v Plzni',
                        'KSHK': 'Krajským soudem v Hradci Králové',
                        'KSUL': 'Krajským soudem v Ústí nad Labem',
                        'KSCB': 'Krajským soudem v Českých Budějovicích',
                        'KSLB': 'Krajským soudem v Ústí nad Labem - pobočka Liberec',
                        'KSOL': 'Krajským soudem v Ostravě - pobočka Olomouc',
                        'KSZL': 'Krajským soudem v Brně - pobočka Zlín',
                        'KSJI': 'Krajským soudem v Brně - pobočka Jihlava',
                        'KSPARD': 'Krajským soudem v Hradci Králové - pobočka Pardubice'
                    }
                    const courtName = courtMap[courtCode] || `soudem ${courtCode}`
                    registryText = lang === 'cs'
                        ? `${registerInfo.cs.subject} je zapsána v ${registerInfo.cs.register} vedeném ${courtName}, spisová značka ${mark}.`
                        : `${registerInfo.en.subject} registered in ${registerInfo.en.register} kept by ${courtName}, file no. ${mark}.`
                    if (registerInfo.cs.subject === 'Spolek') registryText = registryText.replace('zapsána', 'zapsán')
                } else {
                    registryText = lang === 'cs'
                        ? `${registerInfo.cs.subject} je zapsána v ${registerInfo.cs.register}, spisová značka ${data.fileNumber}.`
                        : `${registerInfo.en.subject} registered in ${registerInfo.en.register}, file no. ${data.fileNumber}.`
                    if (registerInfo.cs.subject === 'Spolek') registryText = registryText.replace('zapsána', 'zapsán')
                }
            }
        }

        setDefaultSupplier(prev => ({
            ...prev,
            name: data.name,
            address: data.address,
            ico: data.ico,
            vat: data.vat,
            isVatPayer: data.isVatPayer || false,
            registry: registryText
        }))
    }

    const handleSaveProfile = async () => {
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: { defaultSupplier } })
            })
            if (res.ok) {
                alert(lang === 'cs' ? 'Profil uložen!' : 'Profile saved!')
            } else {
                throw new Error('Failed to save')
            }
        } catch (e) {
            console.error(e)
            alert(lang === 'cs' ? 'Chyba při ukládání profilu!' : 'Error saving profile!')
        }
    }

    return (
        <div className="grid two shadow-layout" style={{ alignItems: 'start', maxWidth: '1200px', margin: '0 auto' }}>
            <section className="card">
                <h2>{lang === 'cs' ? '📇 Můj Profil (Dodavatel)' : '📇 My Profile (Supplier)'}</h2>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '1.5rem' }}>
                    {lang === 'cs'
                        ? 'Tyto údaje budou automaticky předvyplněny na každé nové faktuře.'
                        : 'These details will be pre-filled on every new invoice.'}
                </p>

                {/* ARES Search Container */}
                <div style={{ marginBottom: '2rem', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ fontSize: '0.875rem', marginBottom: '1rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)' }}>
                        {lang === 'cs' ? '🔍 Rychlé vyplnění přes ARES' : '🔍 Fast Fill via ARES'}
                    </h3>
                    <AresSearch
                        clientName={defaultSupplier?.name || ''}
                        clientIco={defaultSupplier?.ico || ''}
                        onClientNameChange={(v) => setDefaultSupplier(p => ({ ...p, name: v }))}
                        onClientIcoChange={(v) => setDefaultSupplier(p => ({ ...p, ico: v }))}
                        onAresData={handleAresData}
                        t={t}
                    />
                </div>

                <div className="grid">
                    <div>
                        <label>{t.supplierName} *</label>
                        <input
                            name="name"
                            value={defaultSupplier?.name || ''}
                            onChange={handleProfileChange}
                            placeholder="Firma s.r.o."
                            required
                        />
                    </div>

                    <div className="grid two mobile-grid-2">
                        <div>
                            <label>{lang === 'cs' ? 'IČO *' : 'Business ID (IČO) *'}</label>
                            <input
                                name="ico"
                                value={defaultSupplier?.ico || ''}
                                onChange={handleProfileChange}
                                placeholder="12345678"
                                required
                            />
                        </div>
                        <div>
                            <label>{lang === 'cs' ? 'DIČ' : 'VAT ID (DIČ)'}</label>
                            <input
                                name="vat"
                                value={defaultSupplier?.vat || ''}
                                onChange={handleProfileChange}
                                placeholder="CZ12345678"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <input
                            type="checkbox"
                            name="isVatPayer"
                            id="isVatPayer"
                            checked={defaultSupplier?.isVatPayer || false}
                            onChange={handleProfileChange}
                            style={{ width: 'auto', margin: 0 }}
                        />
                        <label htmlFor="isVatPayer" style={{ margin: 0, cursor: 'pointer', fontWeight: 600 }}>
                            {lang === 'cs' ? 'Jsem plátce DPH' : 'I am a VAT payer'}
                        </label>

                        {defaultSupplier?.isVatPayer && (
                            <select
                                name="taxRate"
                                value={defaultSupplier?.taxRate || '21'}
                                onChange={handleProfileChange}
                                style={{ width: 'auto', marginLeft: 'auto', padding: '4px 8px' }}
                            >
                                <option value="21">21%</option>
                                <option value="15">15%</option>
                                <option value="12">12%</option>
                            </select>
                        )}
                    </div>

                    <div>
                        <label>{t.supplierAddress} *</label>
                        <textarea
                            name="address"
                            value={defaultSupplier?.address || ''}
                            onChange={handleProfileChange}
                            placeholder={lang === 'cs' ? 'Ulice 123, 110 00 Praha' : 'Street 123, 110 00 Prague'}
                            rows="2"
                            required
                        />
                    </div>

                    <div>
                        <label>{lang === 'cs' ? 'Zápis v rejstříku' : 'Registry Entry'}</label>
                        <input
                            name="registry"
                            value={defaultSupplier?.registry || ''}
                            onChange={handleProfileChange}
                            placeholder={lang === 'cs' ? 'např. Městský soud v Praze, oddíl C...' : 'e.g. Commercial Register...'}
                        />
                    </div>

                    <div>
                        <label>{lang === 'cs' ? 'Bankovní spojení' : 'Bank Account'}</label>
                        <div className="grid three mobile-grid-2" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{ flex: '0 0 70px' }}>
                                <input
                                    name="prefix"
                                    value={defaultSupplier?.prefix || ''}
                                    onChange={handleProfileChange}
                                    onPaste={handlePasteBank}
                                    placeholder="Prefix"
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <input
                                    name="accountNumber"
                                    value={defaultSupplier?.accountNumber || ''}
                                    onChange={handleProfileChange}
                                    onPaste={handlePasteBank}
                                    placeholder={lang === 'cs' ? 'Číslo účtu' : 'Account Number'}
                                />
                            </div>
                            <div style={{ flex: '0 0 90px' }}>
                                <input
                                    name="bankCode"
                                    value={defaultSupplier?.bankCode || ''}
                                    onChange={handleProfileChange}
                                    onPaste={handlePasteBank}
                                    placeholder={lang === 'cs' ? 'Kód' : 'Code'}
                                />
                            </div>
                        </div>
                        <input
                            name="iban"
                            value={defaultSupplier?.iban || ''}
                            placeholder="IBAN"
                            readOnly
                            style={{ background: 'rgba(0,0,0,0.1)', color: 'var(--muted)', cursor: 'not-allowed', fontSize: '0.85rem' }}
                        />
                    </div>

                    <div className="grid two mobile-grid-2">
                        <div>
                            <label>{lang === 'cs' ? 'Telefon' : 'Phone'}</label>
                            <input
                                name="phone"
                                value={defaultSupplier?.phone || ''}
                                onChange={handleProfileChange}
                                placeholder="+420..."
                            />
                        </div>
                        <div>
                            <label>Email</label>
                            <input
                                name="email"
                                type="email"
                                value={defaultSupplier?.email || ''}
                                onChange={handleProfileChange}
                            />
                        </div>
                    </div>
                </div>

                <div className="actions" style={{ marginTop: '2rem' }}>
                    <button onClick={handleSaveProfile} className="primary" style={{ width: '100%' }}>
                        {lang === 'cs' ? '💾 Uložit do cloudu' : '💾 Save to Cloud'}
                    </button>
                </div>
            </section>

            <section className="card">
                <h2>{lang === 'cs' ? '🔐 Nastavení Emailu & Drive' : '🔐 Email & Drive Settings'}</h2>
                <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Google Account (OAuth2)</h3>
                    <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '1.5rem' }}>
                        {lang === 'cs' ? 'Připojte svůj Google účet pro odesílání emailů a automatické zálohování faktur na Disk Google.' : 'Connect your Google account to send emails and backup invoices to Google Drive.'}
                    </p>

                    {!smtpConfig.useGoogle ? (
                        <button
                            type="button"
                            className="secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}
                            onClick={async () => {
                                try {
                                    const res = await fetch('/auth/google/url');
                                    const data = await res.json();
                                    if (data.url) {
                                        window.open(data.url, 'Google Auth', 'width=600,height=700');
                                        const handleMessage = (event) => {
                                            if (event.data.type === 'GOOGLE_LOGIN_SUCCESS') {
                                                const { tokens, email } = event.data;
                                                localStorage.setItem('google_tokens', JSON.stringify(tokens));
                                                const newConfig = { ...smtpConfig, useGoogle: true, fromEmail: email };
                                                setSmtpConfig(newConfig);
                                                localStorage.setItem('smtpConfig', JSON.stringify(newConfig));
                                                alert(lang === 'cs' ? 'Úspěšně připojeno!' : 'Successfully connected!');
                                                window.removeEventListener('message', handleMessage);
                                                window.dispatchEvent(new Event('google_login_update'))
                                            }
                                        };
                                        window.addEventListener('message', handleMessage);
                                    }
                                } catch (e) {
                                    alert('Failed to start auth flow');
                                }
                            }}
                        >
                            <span style={{ fontSize: '18px' }}>G</span>
                            {lang === 'cs' ? 'Přihlásit se přes Google' : 'Sign in with Google'}
                        </button>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ padding: '12px', background: 'rgba(102, 187, 106, 0.1)', border: '1px solid #66bb6a', borderRadius: '8px', color: '#66bb6a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>✓</span> {lang === 'cs' ? `Připojeno jako: ${smtpConfig.fromEmail}` : `Connected as: ${smtpConfig.fromEmail}`}
                            </div>
                            <button
                                type="button"
                                className="danger"
                                style={{ width: '100%' }}
                                onClick={async () => {
                                    if (!confirm(lang === 'cs' ? 'Opravdu se chcete odhlásit? Aplikace se restartuje.' : 'Are you sure you want to log out? The application will restart.')) return;
                                    try {
                                        await fetch('/auth/google/disconnect', { method: 'POST' });
                                    } catch (e) { console.error("Logout failed on server", e); }
                                    localStorage.removeItem('google_tokens');
                                    localStorage.removeItem('smtpConfig');
                                    localStorage.removeItem('defaultSupplier');
                                    localStorage.removeItem('categories');
                                    setSmtpConfig({ useGoogle: false, fromName: '', fromEmail: '' });
                                    window.dispatchEvent(new Event('google_login_update'));
                                    window.location.reload();
                                }}
                            >
                                {lang === 'cs' ? 'Odpojit účet' : 'Disconnect Account'}
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
