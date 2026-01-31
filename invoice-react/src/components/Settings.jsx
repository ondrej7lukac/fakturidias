import { useState, useEffect } from 'react'
import AresSearch from './AresSearch'
import { BANK_CODES, calculateIban, parseIban } from '../utils/bank'

export default function Settings({
    lang,
    t,
    defaultSupplier,
    setDefaultSupplier
}) {
    const [smtpConfig, setSmtpConfig] = useState({
        useGoogle: false,
        fromName: '',
        fromEmail: ''
    })

    const [bankDetails, setBankDetails] = useState({
        accountNumber: '',
        bankCode: '',
        prefix: ''
    })

    // Load local settings on mount
    useEffect(() => {
        const savedSmtp = localStorage.getItem('smtpConfig')
        if (savedSmtp) {
            setSmtpConfig(JSON.parse(savedSmtp))
        }

        // Sync with Server Status (Source of Truth)
        fetch('/auth/google/status')
            .then(res => res.json())
            .then(data => {
                setSmtpConfig(prev => {
                    const shouldBeConnected = data.connected;
                    // Only update if changed prevents unnecessary renders/writes
                    if (prev.useGoogle !== shouldBeConnected) {
                        const newConfig = { ...prev, useGoogle: shouldBeConnected };
                        localStorage.setItem('smtpConfig', JSON.stringify(newConfig));

                        if (shouldBeConnected) {
                            localStorage.setItem('google_tokens', JSON.stringify({ connected: true, source: 'server' }));
                        } else {
                            localStorage.removeItem('google_tokens');
                        }

                        // Notify other tabs/components
                        window.dispatchEvent(new Event('google_login_update'));

                        return newConfig;
                    }
                    return prev;
                });
            })
            .catch(e => console.error("Failed to sync auth status in Settings", e));
    }, [])

    // Initialize bank details from loaded profile
    useEffect(() => {
        if (defaultSupplier?.iban) {
            const parsed = parseIban(defaultSupplier.iban)
            if (parsed) {
                setBankDetails({
                    accountNumber: parsed.accountNumber || '',
                    bankCode: parsed.bankCode || '',
                    prefix: parsed.prefix || ''
                })
            }
        }
    }, [defaultSupplier?.iban])

    // Smart Bank Logic - Auto Calculate IBAN
    useEffect(() => {
        if (bankDetails.accountNumber && bankDetails.bankCode) {
            const newIban = calculateIban(bankDetails.accountNumber, bankDetails.bankCode, bankDetails.prefix)
            if (newIban && newIban !== defaultSupplier?.iban) {
                // Avoid infinite loop if values match
                const currentClean = (defaultSupplier?.iban || '').replace(/\s/g, '')
                const newClean = newIban.replace(/\s/g, '')

                if (currentClean !== newClean) {
                    setDefaultSupplier(prev => ({ ...prev, iban: newIban }))
                }
            }
        }
    }, [bankDetails.accountNumber, bankDetails.bankCode, bankDetails.prefix])


    const handleProfileChange = (e) => {
        const { name, value, type, checked } = e.target
        setDefaultSupplier(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    const handleBankChange = (e) => {
        const { name, value } = e.target
        setBankDetails(prev => {
            const updated = { ...prev, [name]: value }
            // Sync to defaultSupplier immediately so it's ready to save
            setDefaultSupplier(ds => ({ ...ds, ...updated }))
            return updated
        })
    }

    const handlePasteBank = (e) => {
        const text = e.clipboardData.getData('text').trim()
        if (!text) return

        // 1. Try parsing IBAN
        const cleanIban = text.replace(/\s/g, '').toUpperCase()
        if (/^[A-Z]{2}\d{10,}/.test(cleanIban)) {
            e.preventDefault()
            const parsed = parseIban(cleanIban)

            setDefaultSupplier(prev => ({ ...prev, iban: cleanIban }))
            setBankDetails({
                accountNumber: parsed.accountNumber || '',
                bankCode: parsed.bankCode || '',
                prefix: parsed.prefix || ''
            })
            return
        }

        // 2. Try parsing Czech format (prefix-number/code)
        const czechMatch = text.match(/^(\d{0,6}-)?(\d{1,10})\/(\d{4})$/)
        if (czechMatch) {
            e.preventDefault()
            const prefix = czechMatch[1] ? czechMatch[1].replace('-', '') : ''
            const accountNumber = czechMatch[2]
            const bankCode = czechMatch[3]

            setBankDetails({ prefix, accountNumber, bankCode })
            setDefaultSupplier(prev => ({ ...prev, prefix, accountNumber, bankCode }))
        }
    }

    const handleAresData = (data) => {
        let registryText = ''
        // Detect OSVČ (Physical Person) -> 101, 102, 105
        if (data.legalFormCode && [101, 102, 105].includes(parseInt(data.legalFormCode))) {
            registryText = lang === 'cs' ? 'Zapsán v živnostenském rejstříku.' : 'Registered in the Trade Register.'
        } else {
            // Handle Commercial Register (SRO, AS, KS, VOS) and Association Register (ZS)
            const code = parseInt(data.legalFormCode)
            let registerInfo = null

            // Commercial Register: 111 (v.o.s), 112 (s.r.o), 113 (k.s.), 121 (a.s.)
            if ([111, 112, 113, 121].includes(code)) {
                registerInfo = {
                    cs: { subject: 'Společnost', register: 'obchodním rejstříku' },
                    en: { subject: 'Company', register: 'Commercial Register' }
                }
            }
            // Association Register: 706 (z.s. - spolek), 701 (zájmové sdružení)
            else if ([706, 701].includes(code)) {
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

                    // Fix grammar for "Spolek" (masculine) vs "Společnost" (feminine) -> "zapsán" vs "zapsána"
                    if (registerInfo.cs.subject === 'Spolek') {
                        registryText = registryText.replace('zapsána', 'zapsán')
                    }
                } else {
                    registryText = lang === 'cs'
                        ? `${registerInfo.cs.subject} je zapsána v ${registerInfo.cs.register}, spisová značka ${data.fileNumber}.`
                        : `${registerInfo.en.subject} registered in ${registerInfo.en.register}, file no. ${data.fileNumber}.`

                    if (registerInfo.cs.subject === 'Spolek') {
                        registryText = registryText.replace('zapsána', 'zapsán')
                    }
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
        // Save to server
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: defaultSupplier })
            })
            if (res.ok) {
                alert(lang === 'cs' ? 'Profil uložen!' : 'Profile saved!')
            } else {
                throw new Error('Failed to save')
            }
        } catch (e) {
            console.error(e)
            // Fallback to local
            localStorage.setItem('defaultSupplier', JSON.stringify(defaultSupplier))
            alert(lang === 'cs' ? 'Profil uložen offline! (Chyba serveru)' : 'Profile saved offline! (Server error)')
        }
    }

    return (
        <div className="grid two" style={{ alignItems: 'start' }}>
            <section className="card">
                <h2>{lang === 'cs' ? 'Můj Profil (Vystavovatel)' : 'My Profile (Issuer)'}</h2>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '1.5rem' }}>
                    {lang === 'cs'
                        ? 'Vyplňte údaje podle zákona č. 235/2004 Sb. (DPH) a č. 563/1991 Sb. (účetnictví)'
                        : 'Fill in details according to Czech laws for invoice requirements'}
                </p>

                {/* ARES Search */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        {lang === 'cs' ? 'Vyhledat v ARES' : 'Search ARES'}
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
                    {/* Business Nickname */}
                    <div>
                        <label>{lang === 'cs' ? 'Přezdívka firmy (interní reference)' : 'Business Nickname (internal reference)'}</label>
                        <input
                            name="nickname"
                            value={defaultSupplier?.nickname || ''}
                            onChange={handleProfileChange}
                            placeholder={lang === 'cs' ? 'např. Hlavní firma' : 'e.g. Main Business'}
                        />
                        <small style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            {lang === 'cs' ? 'Toto pole není zobrazeno na faktuře' : 'This field is not shown on invoices'}
                        </small>
                    </div>

                    {/* Legal Name (Obchodní jméno) - REQUIRED */}
                    <div>
                        <label>{lang === 'cs' ? 'Obchodní jméno / Název firmy *' : 'Business Name *'}</label>
                        <input
                            name="name"
                            value={defaultSupplier?.name || ''}
                            onChange={handleProfileChange}
                            placeholder="Firma s.r.o."
                            required
                        />
                    </div>

                    {/* IČO - REQUIRED */}
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
                            <label>{lang === 'cs' ? 'DIČ (pokud jste plátce DPH)' : 'VAT ID (DIČ) if VAT payer'}</label>
                            <input
                                name="vat"
                                value={defaultSupplier?.vat || ''}
                                onChange={handleProfileChange}
                                placeholder="CZ12345678"
                            />
                        </div>
                    </div>

                    {/* DPH Status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--bg)', borderRadius: '8px' }}>
                        <input
                            type="checkbox"
                            name="isVatPayer"
                            id="isVatPayer"
                            checked={defaultSupplier?.isVatPayer || false}
                            onChange={handleProfileChange}
                            style={{ width: 'auto', margin: 0 }}
                        />
                        <label htmlFor="isVatPayer" style={{ margin: 0, cursor: 'pointer' }}>
                            {lang === 'cs' ? 'Jsem plátce DPH' : 'I am a VAT payer'}
                        </label>

                        {defaultSupplier?.isVatPayer && (
                            <select
                                name="taxRate"
                                value={defaultSupplier?.taxRate || '21'}
                                onChange={handleProfileChange}
                                style={{ width: 'auto', marginLeft: 'auto' }}
                            >
                                <option value="21">21%</option>
                                <option value="15">15%</option>
                                <option value="12">12%</option>
                            </select>
                        )}
                    </div>

                    {/* Address (Sídlo) - REQUIRED */}
                    <div>
                        <label>{lang === 'cs' ? 'Sídlo / Adresa *' : 'Registered Address *'}</label>
                        <textarea
                            name="address"
                            value={defaultSupplier?.address || ''}
                            onChange={handleProfileChange}
                            placeholder={lang === 'cs' ? 'Ulice 123, 110 00 Praha' : 'Street 123, 110 00 Prague'}
                            rows="2"
                            required
                        />
                    </div>

                    {/* Registry Information (pro s.r.o.) */}
                    <div>
                        <label>{lang === 'cs' ? 'Zápis v rejstříku (pro s.r.o.)' : 'Registry Entry (for Ltd.)'}</label>
                        <input
                            name="registry"
                            value={defaultSupplier?.registry || ''}
                            onChange={handleProfileChange}
                            placeholder={lang === 'cs' ? 'Obchodní rejstřík, oddíl C, vložka 12345' : 'Commercial Register, Section C, Insert 12345'}
                        />
                        <small style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            {lang === 'cs' ? 'Např.: OR vedený u KS v Praze, oddíl C, vložka 12345' : 'e.g.: Commercial Register at Regional Court in Prague, Section C, Insert 12345'}
                        </small>
                    </div>

                    {/* Bank Account - Smart Input */}
                    <div>
                        <label>{lang === 'cs' ? 'Bankovní spojení' : 'Bank Account'}</label>
                        <div className="grid three mobile-grid-2" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{ flex: '0 0 60px' }}>
                                <input
                                    name="prefix"
                                    value={bankDetails.prefix}
                                    onChange={handleBankChange}
                                    onPaste={handlePasteBank}
                                    placeholder={lang === 'cs' ? 'Předčíslí' : 'Prefix'}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <input
                                    name="accountNumber"
                                    value={bankDetails.accountNumber}
                                    onChange={handleBankChange}
                                    onPaste={handlePasteBank}
                                    placeholder={lang === 'cs' ? 'Číslo účtu' : 'Account Number'}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ flex: '0 0 80px' }}>
                                <input
                                    name="bankCode"
                                    value={bankDetails.bankCode}
                                    onChange={handleBankChange}
                                    onPaste={handlePasteBank}
                                    placeholder={lang === 'cs' ? 'Kód' : 'Code'}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>
                        <label style={{ fontSize: '0.7rem', marginTop: '0.2rem' }}>IBAN</label>
                        <input
                            name="iban"
                            value={defaultSupplier?.iban || ''}
                            onChange={handleProfileChange}
                            onPaste={handlePasteBank}
                            placeholder="CZ6508000000192000145399"
                            readOnly
                            style={{ background: 'var(--bg)', color: 'var(--muted)', cursor: 'not-allowed' }}
                        />
                    </div>

                    {/* Phone */}
                    <div className="grid two mobile-grid-2">
                        <div>
                            <label>{lang === 'cs' ? 'Telefon' : 'Phone'}</label>
                            <input
                                name="phone"
                                value={defaultSupplier?.phone || ''}
                                onChange={handleProfileChange}
                                placeholder="+420 123 456 789"
                            />
                        </div>
                        <div>
                            <label>Email</label>
                            <input
                                name="email"
                                type="email"
                                value={defaultSupplier?.email || ''}
                                onChange={handleProfileChange}
                                placeholder="info@firma.cz"
                            />
                        </div>
                    </div>

                    {/* Website */}
                    <div>
                        <label>Web</label>
                        <input
                            name="website"
                            value={defaultSupplier?.website || ''}
                            onChange={handleProfileChange}
                            placeholder="www.firma.cz"
                        />
                    </div>

                    <div style={{ marginTop: '1rem', padding: '12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                            <strong>{lang === 'cs' ? '📋 Povinné údaje:' : '📋 Required fields:'}</strong><br />
                            {lang === 'cs'
                                ? '• Obchodní jméno/název, IČO, sídlo\n• DIČ (pokud jste plátce DPH)\n• Zápis v rejstříku (pro s.r.o.)'
                                : '• Business name, IČO, address\n• VAT ID (if VAT payer)\n• Registry entry (for Ltd.)'}
                        </p>
                    </div>

                    <div className="actions">
                        <button onClick={handleSaveProfile} className="success">
                            {lang === 'cs' ? '💾 Uložit profil' : '💾 Save Profile'}
                        </button>
                    </div>
                </div>
            </section>

            <section className="card">
                <h2>{lang === 'cs' ? 'Nastavení Emailu' : 'Email Settings'}</h2>

                {/* Google OAuth Section */}
                <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Google Account (OAuth2)</h3>
                    <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '10px' }}>
                        {lang === 'cs' ? 'Připojte svůj Google účet pro bezpečné odesílání emailů.' : 'Connect your Google account for secure email sending.'}
                    </p>

                    {!smtpConfig.useGoogle ? (
                        <button
                            type="button"
                            className="secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={async () => {
                                try {
                                    const res = await fetch('/auth/google/url');
                                    const data = await res.json();
                                    if (data.url) {
                                        window.open(data.url, 'Google Auth', 'width=600,height=700');

                                        // Listen for success message from popup
                                        const handleMessage = (event) => {
                                            if (event.data.type === 'GOOGLE_LOGIN_SUCCESS') {
                                                const { tokens, email } = event.data;
                                                localStorage.setItem('google_tokens', JSON.stringify(tokens));

                                                const newConfig = { ...smtpConfig, useGoogle: true, fromEmail: email };
                                                setSmtpConfig(newConfig);
                                                localStorage.setItem('smtpConfig', JSON.stringify(newConfig));

                                                alert(lang === 'cs' ? 'Úspěšně připojeno!' : 'Successfully connected!');
                                                window.removeEventListener('message', handleMessage);
                                                // Dispatch global event
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ color: 'var(--accent-2)', fontWeight: 'bold' }}>✓ {lang === 'cs' ? 'Připojeno' : 'Connected'}</div>
                            <button
                                type="button"
                                className="danger"
                                onClick={async () => {
                                    if (!confirm(lang === 'cs' ? 'Opravdu se chcete odhlásit? Aplikace se restartuje.' : 'Are you sure you want to log out? The application will restart.')) return;

                                    try {
                                        // 1. Call Backend to clear session/tokens
                                        await fetch('/auth/google/disconnect', { method: 'POST' });
                                    } catch (e) {
                                        console.error("Logout failed on server", e);
                                    }

                                    // 2. Clear Local Storage
                                    localStorage.removeItem('google_tokens');
                                    localStorage.removeItem('smtpConfig');
                                    localStorage.removeItem('defaultSupplier');
                                    localStorage.removeItem('categories');
                                    // localStorage.removeItem('lang'); // Keep language preference

                                    // 3. Reset State & Reload
                                    const newConfig = {
                                        useGoogle: false,
                                        fromName: '',
                                        fromEmail: ''
                                    };
                                    setSmtpConfig(newConfig);

                                    // Dispatch global event
                                    window.dispatchEvent(new Event('google_login_update'));

                                    // 4. Force Reload to clear App state
                                    window.location.reload();
                                }}
                            >
                                {lang === 'cs' ? 'Odpojit' : 'Disconnect'}
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
