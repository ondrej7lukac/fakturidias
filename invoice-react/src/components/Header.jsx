import { useState, useEffect } from 'react'

export default function Header({ onNewInvoice, lang, setLang, t, currentView, onViewChange }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [userEmail, setUserEmail] = useState(null)

    useEffect(() => {
        checkAuthStatus()
        const handleAuthUpdate = () => checkAuthStatus()
        window.addEventListener('google_login_update', handleAuthUpdate)
        return () => window.removeEventListener('google_login_update', handleAuthUpdate)
    }, [])

    const checkAuthStatus = async () => {
        try {
            const res = await fetch('/api/me')
            if (res.ok) {
                const data = await res.json()
                setIsAuthenticated(data.authenticated)
                setUserEmail(data.user)
            }
        } catch (e) {
            setIsAuthenticated(false)
        }
    }

    const handleLogin = async () => {
        if (isAuthenticated) {
            onViewChange('settings')
            return
        }

        try {
            const res = await fetch('/auth/google/url')
            if (!res.ok) throw new Error('Failed to start login')
            const data = await res.json()

            if (data.url) {
                const width = 500
                const height = 600
                const left = window.screen.width / 2 - width / 2
                const top = window.screen.height / 2 - height / 2
                window.open(data.url, 'Google Login', `width=${width},height=${height},top=${top},left=${left}`)

                const handleMessage = (event) => {
                    if (event.data && event.data.type === 'GOOGLE_LOGIN_SUCCESS') {
                        window.removeEventListener('message', handleMessage)
                        window.dispatchEvent(new Event('google_login_update'))
                    }
                }
                window.addEventListener('message', handleMessage)
            }
        } catch (e) {
            alert('Failed to connect to login server.')
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
                    onClick={handleLogin}
                    className="secondary"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: isAuthenticated ? 'var(--success-bg, #d4edda)' : undefined,
                        borderColor: isAuthenticated ? 'var(--success-border, #28a745)' : undefined,
                        color: isAuthenticated ? 'var(--success-text, #155724)' : undefined
                    }}
                    title={isAuthenticated ? (userEmail || 'Logged in') : (lang === 'cs' ? 'Přihlásit se' : 'Log in')}
                >
                    <span style={{ fontWeight: 'bold', fontSize: '16px' }}>G</span>
                    <span>{isAuthenticated ? (userEmail?.split('@')[0] || 'Account') : (lang === 'cs' ? 'Přihlášení' : 'Login')}</span>
                    {isAuthenticated && <span>✓</span>}
                </button>
            </div>
        </header>
    )
}
