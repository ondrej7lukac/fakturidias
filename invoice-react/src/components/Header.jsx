import { useState, useEffect, useRef } from 'react';

export default function Header({
  onNewInvoice,
  lang,
  setLang,
  theme,
  setTheme,
  t,
  currentView,
  onViewChange,
  user,
  onLogout,
  mobileView,
  setMobileView,
  mobileMenuOpen,
  setMobileMenuOpen,
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [mobileLanguageMenuOpen, setMobileLanguageMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target))
        setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  useEffect(() => {
    if (!userMenuOpen) setLanguageMenuOpen(false);
  }, [userMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) setMobileLanguageMenuOpen(false);
  }, [mobileMenuOpen]);

  const handleLogin = async () => {
    if (user) {
      // If logged in, button acts as logout
      if (window.confirm(lang === 'cs' ? 'Odhlásit se?' : 'Log out?')) {
        onLogout && onLogout();
      }
      return;
    }

    try {
      const res = await fetch('/auth/google/url');
      if (!res.ok) throw new Error('Failed to start login');
      const data = await res.json();

      if (data.url) {
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        window.open(
          data.url,
          'Google Login',
          `width=${width},height=${height},top=${top},left=${left}`,
        );
      }
    } catch (e) {
      alert('Failed to connect to login server.');
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleMobileView = () => {
    setMobileView(mobileView === 'form' ? 'list' : 'form');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className='header'>
      <div className='header__inner'>
        {/* Brand / Logo */}
        <div className='brand' onClick={() => onViewChange('invoices')}>
          <img
            src='/GEMINI_GEN_LOGO.png'
            alt='F'
            className='brand__mark'
            style={{
              background: 'transparent',
              objectFit: 'contain',
              padding: '2px',
            }}
          />
          <div className='brand__text header-logo-desktop'>
            <span className='brand__name'>Fakturidias</span>
            <span className='brand__sub'>Invoices & Proforma</span>
          </div>
        </div>

        {/* Header Actions (Desktop) */}
        <div
          className='header__actions desktop-only'
          style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}
        >
          <button
            className={`btn ${currentView === 'invoices' ? 'btn--soft' : 'btn--soft'}`}
            onClick={() => onViewChange('invoices')}
            style={{
              border:
                currentView === 'invoices'
                  ? '1px solid var(--border)'
                  : '1px solid transparent',
            }}
          >
            {lang === 'cs' ? 'Přehled faktur' : 'Invoices'}
          </button>

          <button className='btn primary' onClick={onNewInvoice}>
            + {lang === 'cs' ? 'Vytvořit fakturu' : 'New Invoice'}
          </button>

          <button
            type='button'
            className='btn btn--soft'
            onClick={toggleTheme}
            aria-label={lang === 'cs' ? 'Přepnout motiv' : 'Toggle theme'}
            title={lang === 'cs' ? 'Přepnout motiv' : 'Toggle theme'}
            style={{ minWidth: '116px' }}
          >
            <span>{theme === 'dark' ? '☀' : '☾'}</span>
            {theme === 'dark'
              ? lang === 'cs'
                ? 'Světlý'
                : 'Light'
              : lang === 'cs'
                ? 'Tmavý'
                : 'Dark'}
          </button>

          <div
            ref={userMenuRef}
            style={{ position: 'relative', zIndex: userMenuOpen ? 1400 : 1 }}
          >
            <button
              className='btn btn--soft'
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{
                gap: '8px',
                background: user ? 'var(--success-bg)' : undefined,
                borderColor: user ? 'var(--success-border)' : undefined,
                color: user ? 'var(--success-text)' : undefined,
                padding: '10px 16px',
              }}
            >
              <span style={{ fontWeight: 'bold' }}>{user ? '✓' : 'G'}</span>
              {user
                ? `(${user.email?.split('@')[0]})`
                : lang === 'cs'
                  ? 'Přihlášení'
                  : 'Login'}
            </button>

            {userMenuOpen && (
              <div className='user-menu-dropdown'>
                <button
                  onClick={() => {
                    onViewChange('settings');
                    setUserMenuOpen(false);
                  }}
                  className='btn btn--soft'
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    padding: '8px 12px',
                  }}
                >
                  {t.settings || 'Settings'}
                </button>

                <button
                  type='button'
                  className='btn btn--soft user-submenu-toggle'
                  onClick={() => setLanguageMenuOpen((v) => !v)}
                  aria-expanded={languageMenuOpen}
                >
                  <span>{lang === 'cs' ? 'Jazyk' : 'Language'}: {lang === 'cs' ? 'Čeština (CZ)' : 'English (EN)'}</span>
                  <span>{languageMenuOpen ? '▴' : '▾'}</span>
                </button>

                {languageMenuOpen && (
                  <div className='user-submenu-panel'>
                    <button
                      type='button'
                      className={`btn btn--soft user-submenu-option ${lang === 'cs' ? 'is-active' : ''}`}
                      onClick={() => {
                        setLang('cs');
                        setLanguageMenuOpen(false);
                        setUserMenuOpen(false);
                      }}
                    >
                      Čeština (CZ)
                    </button>
                    <button
                      type='button'
                      className={`btn btn--soft user-submenu-option ${lang === 'en' ? 'is-active' : ''}`}
                      onClick={() => {
                        setLang('en');
                        setLanguageMenuOpen(false);
                        setUserMenuOpen(false);
                      }}
                    >
                      English (EN)
                    </button>
                  </div>
                )}

                <div className='user-menu-divider' />

                <button
                  onClick={() => {
                    handleLogin();
                    setUserMenuOpen(false);
                  }}
                  className='btn btn--soft'
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    padding: '8px 12px',
                  }}
                >
                  <span style={{ fontWeight: 'bold' }}>G</span>
                  {user
                    ? lang === 'cs'
                      ? 'Odhlásit se'
                      : 'Logout'
                    : lang === 'cs'
                      ? 'Přihlásit se'
                      : 'Login'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Button & View Switch */}
        <div
          className='header__actions mobile-only-flex'
          style={{ marginLeft: 'auto' }}
        >
          <div className='view-switch' style={{ marginRight: '10px' }}>
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
            className='iconBtn mobile-menu-btn'
            onClick={toggleMobileMenu}
            aria-label='Toggle menu'
            style={{ display: mobileMenuOpen ? 'none' : '' }}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile Slide-in Menu */}
      <div
        className={`mobile-menu ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}
        style={{
          background: 'rgba(10, 12, 25, 0.75)',
          backdropFilter: 'blur(14px)',
          borderLeft: '1px solid var(--border)',
          color: 'var(--text)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2.5rem',
            width: '100%',
            padding: '0 0.5rem',
          }}
        >
          <div
            className='brand__title'
            style={{
              fontWeight: '700',
              fontSize: '1.2rem',
              color: 'var(--text)',
            }}
          >
            Menu
          </div>
          <button
            className='iconBtn'
            onClick={toggleMobileMenu}
            style={{ background: 'var(--card)', color: 'var(--text)' }}
          >
            ✕
          </button>
        </div>

        <div
          className='mobile-menu-actions'
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            alignItems: 'stretch',
          }}
        >
          <button
            onClick={() => {
              onNewInvoice();
              setMobileMenuOpen(false);
            }}
            className='btn primary'
            style={{
              width: '100%',
              padding: '16px',
              justifyContent: 'center',
              fontSize: '1.1rem',
              borderRadius: '14px',
            }}
          >
            + {t.newInvoice}
          </button>

          <button
            onClick={() => {
              onViewChange('invoices');
              setMobileMenuOpen(false);
            }}
            className='btn'
            style={{
              width: '100%',
              padding: '14px',
              background: 'var(--card)',
              color: 'var(--text)',
              justifyContent: 'center',
              borderRadius: '12px',
            }}
          >
            {t.invoices || 'Invoices'}
          </button>

          <button
            onClick={() => {
              onViewChange('settings');
              setMobileMenuOpen(false);
            }}
            className='btn'
            style={{
              width: '100%',
              padding: '14px',
              background: 'var(--card)',
              color: 'var(--text)',
              justifyContent: 'center',
              borderRadius: '12px',
            }}
          >
            {t.settings || 'Settings'}
          </button>
        </div>

        <div
          className='mobile-menu-footer'
          style={{
            marginTop: 'auto',
            paddingTop: '2.5rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            width: '100%',
          }}
        >
          <div className='mobile-language-submenu'>
            <button
              type='button'
              className='btn btn--soft user-submenu-toggle'
              onClick={() => setMobileLanguageMenuOpen((v) => !v)}
              aria-expanded={mobileLanguageMenuOpen}
              style={{ width: '100%', justifyContent: 'space-between', padding: '14px' }}
            >
              <span>{lang === 'cs' ? 'Jazyk: Čeština (CZ)' : 'Language: English (EN)'}</span>
              <span>{mobileLanguageMenuOpen ? '▴' : '▾'}</span>
            </button>

            {mobileLanguageMenuOpen && (
              <div className='user-submenu-panel mobile-submenu-panel'>
                <button
                  type='button'
                  className={`btn btn--soft user-submenu-option ${lang === 'cs' ? 'is-active' : ''}`}
                  onClick={() => {
                    setLang('cs');
                    setMobileLanguageMenuOpen(false);
                  }}
                  style={{ width: '100%' }}
                >
                  Čeština (CZ)
                </button>
                <button
                  type='button'
                  className={`btn btn--soft user-submenu-option ${lang === 'en' ? 'is-active' : ''}`}
                  onClick={() => {
                    setLang('en');
                    setMobileLanguageMenuOpen(false);
                  }}
                  style={{ width: '100%' }}
                >
                  English (EN)
                </button>
              </div>
            )}
          </div>

          <button
            type='button'
            className='btn btn--soft'
            onClick={toggleTheme}
            style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
          >
            <span>{theme === 'dark' ? '☀' : '☾'}</span>
            {theme === 'dark'
              ? lang === 'cs'
                ? 'Přepnout na světlý režim'
                : 'Switch to light mode'
              : lang === 'cs'
                ? 'Přepnout na tmavý režim'
                : 'Switch to dark mode'}
          </button>

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {user && (
              <div
                style={{
                  fontSize: '0.85rem',
                  opacity: 0.7,
                  textAlign: 'center',
                  marginBottom: '5px',
                }}
              >
                {lang === 'cs' ? 'Přihlášen jako' : 'Logged in as'}:{' '}
                <strong>{user.email}</strong>
              </div>
            )}
            <button
              onClick={() => {
                if (user) onLogout();
                else handleLogin();
                setMobileMenuOpen(false);
              }}
              className={`btn ${user ? 'danger' : 'primary'}`}
              style={{
                width: '100%',
                padding: '16px',
                justifyContent: 'center',
                borderRadius: '14px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              }}
            >
              <span style={{ fontWeight: 'bold', marginRight: '10px' }}>
                {user ? '✕' : 'G'}
              </span>
              {user
                ? lang === 'cs'
                  ? 'Odhlásit se'
                  : 'Log out'
                : lang === 'cs'
                  ? 'Přihlásit se přes Google'
                  : 'Sign in with Google'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
