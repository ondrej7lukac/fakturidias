import { useState, useEffect } from 'react'

export default function Header({ onNewInvoice, lang, setLang, t, currentView, onViewChange, user, onLogout }) {

    // Auth state is now managed by parent (App.jsx) via 'user' prop

    const handleLogin = async () => {
        if (user) {
            // If logged in, button acts as "Settings" or "Logout"?
            // Current UI design: The button shows username. Clicking it usually toggles a dropdown or goes to profile.
            // For now, let's make it toggle Settings view or just do nothing if we add a separate Logout button.
            // Wait, the design has a separate "Settings" button.
            // Let's make the User button ask to Logout.
            if (window.confirm(lang === 'cs' ? 'Odhlásit se?' : 'Log out?')) {
                onLogout && onLogout()
            }
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

                // App.jsx listens for 'google_login_update'
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
                        background: user ? 'var(--success-bg, #d4edda)' : undefined,
                        borderColor: user ? 'var(--success-border, #28a745)' : undefined,
                        color: user ? 'var(--success-text, #155724)' : undefined
                    }}
                    title={user ? (user.email || 'Logged in') : (lang === 'cs' ? 'Přihlásit se' : 'Log in')}
                >
                    <span style={{ fontWeight: 'bold', fontSize: '16px' }}>G</span>
                    <span>{user ? (user.email?.split('@')[0] || 'Account') : (lang === 'cs' ? 'Přihlášení' : 'Login')}</span>
                    {user && <span>✓</span>}
                </button>
            </div>
        </header>
    )
}
