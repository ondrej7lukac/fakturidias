import { useState, useEffect, useRef } from 'react'

export default function Header({
    onNewInvoice,
    lang,
    setLang,
    t,
    currentView,
    onViewChange,
    user,
    onLogout,
    mobileView,
    setMobileView,
    mobileMenuOpen,
    setMobileMenuOpen
}) {
    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const userMenuRef = useRef(null)

    // Close on outside click
    useEffect(() => {
        if (!userMenuOpen) return
        const handler = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [userMenuOpen])

    const handleLogin = async () => {
        if (user) {
            // If logged in, button acts as logout
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
            }
        } catch (e) {
            alert('Failed to connect to login server.')
        }
    }

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen)
    }

    const toggleMobileView = () => {
        setMobileView(mobileView === 'form' ? 'list' : 'form')
    }

    return (
        <header className="header">
            <div className="header__inner">
                {/* Brand / Logo */}
                <div className="brand" onClick={() => onViewChange('invoices')}>
                    <img 
                        src="/GEMINI_GEN_LOGO.png" 
                        alt="F" 
                        className="brand__mark" 
                        style={{ background: 'transparent', objectFit: 'contain', padding: '2px' }}
                    />
                    <div className="brand__text header-logo-desktop">
                        <span className="brand__name">Fakturidias</span>
                        <span className="brand__sub">Invoices & Proforma</span>
                    </div>
                </div>

                {/* Header Actions (Desktop) */}
                <div className="header__actions desktop-only" style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                    <button 
                        className={`btn ${currentView === 'invoices' ? 'btn--soft' : 'btn--soft'}`}
                        onClick={() => onViewChange('invoices')}
                        style={{ border: currentView === 'invoices' ? '1px solid var(--border)' : '1px solid transparent' }}
                    >
                        {lang === 'cs' ? 'Přehled faktur' : 'Invoices'}
                    </button>
                    
                    <button 
                        className="btn primary" 
                        onClick={onNewInvoice}
                    >
                        + {lang === 'cs' ? 'Vytvořit fakturu' : 'New Invoice'}
                    </button>

                    <div ref={userMenuRef} style={{ position: 'relative' }}>
                        <button
                            className="btn btn--soft"
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            style={{ 
                                gap: '8px', 
                                background: user ? 'var(--success-bg)' : undefined,
                                borderColor: user ? 'var(--success-border)' : undefined,
                                color: user ? 'var(--success-text)' : undefined,
                                padding: '10px 16px'
                            }}
                        >
                            <span style={{ fontWeight: 'bold' }}>{user ? '✓' : 'G'}</span>
                            {user ? `(${user.email?.split('@')[0]})` : (lang === 'cs' ? 'Přihlášení' : 'Login')}
                        </button>

                        {userMenuOpen && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 8px)',
                                right: 0,
                                zIndex: 200,
                                background: 'rgba(20, 25, 45, 0.75)',
                                backdropFilter: 'blur(14px)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                boxShadow: 'var(--shadow-lg)',
                                minWidth: '180px',
                                padding: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                            }}>
                                <button
                                    onClick={() => {
                                        onViewChange('settings')
                                        setUserMenuOpen(false)
                                    }}
                                    className="btn btn--soft"
                                    style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px' }}
                                >
                                    ⚙️ {t.settings || 'Settings'}
                                </button>
                                
                                <select
                                    value={lang}
                                    onChange={(e) => {
                                        setLang(e.target.value)
                                        setUserMenuOpen(false)
                                    }}
                                    className="field__control"
                                    style={{ 
                                        width: '100%', padding: '8px 12px', 
                                        appearance: 'none', background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--border)', borderRadius: '8px',
                                        color: 'var(--text)', outline: 'none',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <option value="cs">Čeština (CZ)</option>
                                    <option value="en">English (EN)</option>
                                </select>

                                <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

                                <button
                                    onClick={() => {
                                        handleLogin()
                                        setUserMenuOpen(false)
                                    }}
                                    className="btn btn--soft"
                                    style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px' }}
                                >
                                    <span style={{ fontWeight: 'bold' }}>G</span>
                                    {user ? (lang === 'cs' ? 'Odhlásit se' : 'Logout') : (lang === 'cs' ? 'Přihlásit se' : 'Login')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Menu Button & View Switch */}
                <div className="header__actions mobile-only-flex" style={{ marginLeft: 'auto' }}>
                    <div className="view-switch" style={{ marginRight: '10px' }}>
                        <button
                            className={`switch-option ${mobileView === 'list' ? 'active' : ''}`}
                            onClick={() => setMobileView('list')}
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        >
                            {lang === 'cs' ? 'Seznam' : 'List'}
                        </button>
                        <button
                            className={`switch-option ${mobileView === 'form' ? 'active' : ''}`}
                            onClick={() => setMobileView('form')}
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        >
                            {lang === 'cs' ? 'Faktura' : 'Invoice'}
                        </button>
                    </div>

                    <button
                        className="iconBtn mobile-menu-btn"
                        onClick={toggleMobileMenu}
                        aria-label="Toggle menu"
                        style={{ display: mobileMenuOpen ? 'none' : '' }}
                    >
                        ☰
                    </button>
                </div>
            </div>

            {/* Mobile Slide-in Menu */}
            <div className={`mobile-menu ${mobileMenuOpen ? 'mobile-menu-open' : ''}`} style={{ 
                background: 'rgba(10, 12, 25, 0.75)', 
                backdropFilter: 'blur(14px)',
                borderLeft: '1px solid rgba(255,255,255,0.05)',
                color: 'var(--text)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', width: '100%', padding: '0 0.5rem' }}>
                    <div className="brand__title" style={{ fontWeight: '700', fontSize: '1.2rem', color: '#fff' }}>Menu</div>
                    <button className="iconBtn" onClick={toggleMobileMenu} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>✕</button>
                </div>
                
                <div className="mobile-menu-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', alignItems: 'stretch' }}>
                    <button onClick={() => { onNewInvoice(); setMobileMenuOpen(false); }} className="btn primary" style={{ width: '100%', padding: '16px', justifyContent: 'center', fontSize: '1.1rem', borderRadius: '14px' }}>
                        + {t.newInvoice}
                    </button>
                    
                    <button onClick={() => { onViewChange('invoices'); setMobileMenuOpen(false); }} className="btn" style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.05)', color: '#fff', justifyContent: 'center', borderRadius: '12px' }}>
                        📄 {t.invoices || 'Invoices'}
                    </button>
                    
                    <button onClick={() => { onViewChange('settings'); setMobileMenuOpen(false); }} className="btn" style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.05)', color: '#fff', justifyContent: 'center', borderRadius: '12px' }}>
                        ⚙️ {t.settings || 'Settings'}
                    </button>
                </div>
                
                <div className="mobile-menu-footer" style={{ marginTop: 'auto', paddingTop: '2.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                     <div style={{ position: 'relative' }}>
                        <div style={{ marginBottom: '8px', fontSize: '0.8rem', opacity: 0.6, textAlign: 'center' }}>{lang === 'cs' ? 'JAZYK' : 'LANGUAGE'}</div>
                        <select
                            value={lang}
                            onChange={(e) => {
                                setLang(e.target.value);
                                setMobileMenuOpen(false);
                            }}
                            className="field__control"
                            style={{ 
                                width: '100%', padding: '14px', 
                                appearance: 'none', background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px',
                                color: '#fff', outline: 'none',
                                cursor: 'pointer', textAlign: 'center', fontSize: '1rem'
                            }}
                        >
                            <option value="cs" style={{ color: '#000' }}>Čeština (CZ)</option>
                            <option value="en" style={{ color: '#000' }}>English (EN)</option>
                        </select>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {user && (
                             <div style={{ fontSize: '0.85rem', opacity: 0.7, textAlign: 'center', marginBottom: '5px' }}>
                                {lang === 'cs' ? 'Přihlášen jako' : 'Logged in as'}: <strong>{user.email}</strong>
                             </div>
                        )}
                        <button 
                            onClick={() => { if(user) onLogout(); else handleLogin(); setMobileMenuOpen(false); }} 
                            className={`btn ${user ? 'danger' : 'primary'}`}
                            style={{ 
                                width: '100%', padding: '16px', 
                                justifyContent: 'center',
                                borderRadius: '14px',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                            }}
                        >
                            <span style={{ fontWeight: 'bold', marginRight: '10px' }}>{user ? '✕' : 'G'}</span>
                            {user ? (lang === 'cs' ? 'Odhlásit se' : 'Log out') : (lang === 'cs' ? 'Přihlásit se přes Google' : 'Sign in with Google')}
                        </button>
                    </div>
                </div>
            </div>
        </header>
    )
}
