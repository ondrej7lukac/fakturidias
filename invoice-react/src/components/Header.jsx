import { useState, useEffect } from 'react'

export default function Header({ onNewInvoice, lang, setLang, t, currentView, onViewChange }) {
    const [isGoogleConnected, setIsGoogleConnected] = useState(false)

    useEffect(() => {
        checkGoogleStatus()

        // Listen for storage changes (e.g. login/logout in other tab or component)
        const handleStorageChange = () => checkGoogleStatus()
        window.addEventListener('storage', handleStorageChange)
        // Also listen for custom event we might dispatch
        window.addEventListener('google_login_update', handleStorageChange)

        return () => {
            window.removeEventListener('storage', handleStorageChange)
            window.removeEventListener('google_login_update', handleStorageChange)
        }
    }, [])

    const checkGoogleStatus = async () => {
        // 1. Check Local (Fast DB)
        const tokens = localStorage.getItem('google_tokens')
        if (tokens) {
            setIsGoogleConnected(true)
        }

        // 2. data Source of Truth (Server)
        try {
            const res = await fetch('/auth/google/status')
            if (res.ok) {
                const data = await res.json()
                setIsGoogleConnected(data.connected)

                // Sync Local Storage state if server says connected but local differs
                if (data.connected && !tokens) {
                    localStorage.setItem('google_tokens', JSON.stringify({ connected: true, note: 'synced_from_server' }))
                } else if (!data.connected && tokens) {
                    // Server lost auth -> Clear local
                    localStorage.removeItem('google_tokens')
                }
            }
        } catch (e) {
            console.error('Failed to check google status', e)
        }
    }

    const handleGoogleLogin = async () => {
        if (isGoogleConnected) {
            // If connected, clicking might mean "Show settings" or "Logout". 
            // For now, let's just go to Settings to manage account
            onViewChange('settings')
            return
        }

        try {
            const res = await fetch('/auth/google/url')
            const data = await res.json()
            if (data.url) {
                window.open(data.url, 'Google Auth', 'width=600,height=700')

                const handleMessage = (event) => {
                    if (event.data.type === 'GOOGLE_LOGIN_SUCCESS') {
                        const { tokens, email } = event.data
                        localStorage.setItem('google_tokens', JSON.stringify(tokens))

                        // Save email to smtpConfig (used by Settings and App)
                        const currentSmtp = JSON.parse(localStorage.getItem('smtpConfig') || '{}')
                        localStorage.setItem('smtpConfig', JSON.stringify({
                            ...currentSmtp,
                            useGoogle: true,
                            fromEmail: email
                        }))

                        checkGoogleStatus()
                        window.removeEventListener('message', handleMessage)
                        // Dispath event for other components
                        window.dispatchEvent(new Event('google_login_update'))
                    }
                }
                window.addEventListener('message', handleMessage)
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
