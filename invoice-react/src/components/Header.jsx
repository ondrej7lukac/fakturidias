import { useState, useEffect } from 'react'

export default function Header({ onNewInvoice, lang, setLang, t, currentView, onViewChange }) {
    const [isGoogleConnected, setIsGoogleConnected] = useState(false)

    useEffect(() => {
        checkGoogleStatus()
    }, [])

    const checkGoogleStatus = async () => {
        try {
            const res = await fetch('/auth/google/status')
            const data = await res.json()
            setIsGoogleConnected(data.connected)
        } catch (e) {
            console.error('Failed to check google status', e)
        }
    }

    const handleGoogleLogin = async () => {
        try {
            const res = await fetch('/auth/google/url')
            const data = await res.json()
            if (data.url) {
                const popup = window.open(data.url, 'Google Auth', 'width=600,height=700')
                const timer = setInterval(async () => {
                    if (popup.closed) {
                        clearInterval(timer)
                        checkGoogleStatus()
                    }
                }, 1000)
            }
        } catch (e) {
            alert('Failed to start auth flow')
        }
    }

    return (
        <header>
            <div>
                <h1>{t.appTitle}</h1>
                <small>{t.premiumSubtitle}</small>
            </div>
            <div className="actions">
                <button onClick={onNewInvoice} className="secondary">
                    {t.newInvoice}
                </button>
                <button onClick={() => onViewChange(currentView === 'settings' ? 'invoices' : 'settings')} className="secondary">
                    {currentView === 'settings' ? (t.invoices || 'Invoices') : (t.settings || 'Settings')}
                </button>
                <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    className="lang-select"
                >
                    <option value="cs">Čeština</option>
                    <option value="en">English</option>
                </select>
                <button
                    onClick={handleGoogleLogin}
                    className="secondary"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: isGoogleConnected ? 'var(--success-bg, #d4edda)' : undefined,
                        borderColor: isGoogleConnected ? 'var(--success-border, #28a745)' : undefined,
                        color: isGoogleConnected ? 'var(--success-text, #155724)' : undefined
                    }}
                    title={isGoogleConnected ? (lang === 'cs' ? 'Připojeno k Google' : 'Connected to Google') : (lang === 'cs' ? 'Připojit Google' : 'Connect Google')}
                >
                    <span style={{ fontWeight: 'bold', fontSize: '16px' }}>G</span>
                    <span>{lang === 'cs' ? 'Přihlášení' : 'Login'}</span>
                    {isGoogleConnected && <span>✓</span>}
                </button>
            </div>
        </header>
    )
}
