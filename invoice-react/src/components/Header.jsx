import { useState, useEffect, useRef } from 'react';
import './Header.css';
import { Button } from './ui/button';

export default function Header({
  onNewInvoice,
  lang,
  setLang,
  theme,
  setTheme,
  t,
  currentView,
  onViewChange,
  setDashboardOpen,
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
        <Button
          type='button'
          className='brand brand-button'
          onClick={() => onViewChange('invoices')}
          aria-label='Open invoices view'
          variant='ghost'
        >
          <img
            src='/GEMINI_GEN_LOGO.png'
            alt='F'
            className='brand__mark brand__mark-image'
          />
          <div className='brand__text header-logo-desktop'>
            <span className='brand__name'>Fakturidias</span>
            <span className='brand__sub'>Invoices & Proforma</span>
          </div>
        </Button>

        {/* Header Actions (Desktop) */}
        <div className='header__actions header__actions--desktop desktop-only'>
          <Button
            variant='soft'
            size='sm'
            className={`btn btn--soft ${currentView === 'invoices' ? 'is-current-view' : ''}`}
            onClick={() => {
              onViewChange('invoices');
              setDashboardOpen(true);
            }}
          >
            {lang === 'cs' ? 'Přehled faktur' : 'Invoices'}
          </Button>

          <Button className='btn primary' onClick={onNewInvoice} size='sm'>
            + {lang === 'cs' ? 'Vytvořit fakturu' : 'New Invoice'}
          </Button>

          <Button
            type='button'
            className='btn btn--soft header-theme-btn'
            onClick={toggleTheme}
            aria-label={lang === 'cs' ? 'Přepnout motiv' : 'Toggle theme'}
            title={lang === 'cs' ? 'Přepnout motiv' : 'Toggle theme'}
            variant='soft'
            size='sm'
          >
            <span>{theme === 'dark' ? '☀' : '☾'}</span>
            {theme === 'dark'
              ? lang === 'cs'
                ? 'Světlý'
                : 'Light'
              : lang === 'cs'
                ? 'Tmavý'
                : 'Dark'}
          </Button>

          <div
            ref={userMenuRef}
            className={`user-menu-wrap ${userMenuOpen ? 'is-open' : ''}`}
          >
            <Button
              variant='soft'
              size='sm'
              className={`btn btn--soft user-menu-trigger ${user ? 'is-authenticated' : ''}`}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-expanded={userMenuOpen}
            >
              <span className='user-menu-trigger-icon'>{user ? '✓' : 'G'}</span>
              {user
                ? `(${user.email?.split('@')[0]})`
                : lang === 'cs'
                  ? 'Přihlášení'
                  : 'Login'}
            </Button>

            {userMenuOpen && (
              <div className='user-menu-dropdown'>
                <Button
                  onClick={() => {
                    onViewChange('settings');
                    setUserMenuOpen(false);
                  }}
                  className='btn btn--soft user-menu-item'
                  variant='soft'
                  size='sm'
                >
                  {t.settings || 'Settings'}
                </Button>

                <Button
                  type='button'
                  className='btn btn--soft user-submenu-toggle'
                  onClick={() => setLanguageMenuOpen((v) => !v)}
                  aria-expanded={languageMenuOpen}
                  variant='soft'
                  size='sm'
                >
                  <span>
                    {lang === 'cs' ? 'Jazyk' : 'Language'}:{' '}
                    {lang === 'cs' ? 'Čeština (CZ)' : 'English (EN)'}
                  </span>
                  <span>{languageMenuOpen ? '▴' : '▾'}</span>
                </Button>

                {languageMenuOpen && (
                  <div className='user-submenu-panel'>
                    <Button
                      type='button'
                      className={`btn btn--soft user-submenu-option ${lang === 'cs' ? 'is-active' : ''}`}
                      onClick={() => {
                        setLang('cs');
                        setLanguageMenuOpen(false);
                        setUserMenuOpen(false);
                      }}
                      variant='soft'
                      size='sm'
                    >
                      Čeština (CZ)
                    </Button>
                    <Button
                      type='button'
                      className={`btn btn--soft user-submenu-option ${lang === 'en' ? 'is-active' : ''}`}
                      onClick={() => {
                        setLang('en');
                        setLanguageMenuOpen(false);
                        setUserMenuOpen(false);
                      }}
                      variant='soft'
                      size='sm'
                    >
                      English (EN)
                    </Button>
                  </div>
                )}

                <div className='user-menu-divider' />

                <Button
                  onClick={() => {
                    handleLogin();
                    setUserMenuOpen(false);
                  }}
                  className='btn btn--soft user-menu-item'
                  variant='soft'
                  size='sm'
                >
                  <span className='user-menu-trigger-icon'>G</span>
                  {user
                    ? lang === 'cs'
                      ? 'Odhlásit se'
                      : 'Logout'
                    : lang === 'cs'
                      ? 'Přihlásit se'
                      : 'Login'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Button & View Switch */}
        <div className='header__actions header__actions--mobile mobile-only-flex'>
          <div className='view-switch'>
            <Button
              variant='ghost'
              size='sm'
              className={`switch-option ${mobileView === 'list' ? 'active' : ''}`}
              onClick={() => setMobileView('list')}
            >
              {lang === 'cs' ? 'Seznam' : 'List'}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              className={`switch-option ${mobileView === 'form' ? 'active' : ''}`}
              onClick={() => setMobileView('form')}
            >
              {lang === 'cs' ? 'Faktura' : 'Invoice'}
            </Button>
          </div>

          <Button
            variant='ghost'
            size='icon'
            className={`iconBtn mobile-menu-btn ${mobileMenuOpen ? 'is-hidden' : ''}`}
            onClick={toggleMobileMenu}
            aria-label='Toggle menu'
          >
            ☰
          </Button>
        </div>
      </div>

      {/* Mobile Slide-in Menu */}
      <div
        className={`mobile-menu ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}
      >
        <div className='mobile-menu-head'>
          <div className='brand__title mobile-menu-title'>Menu</div>
          <Button
            variant='ghost'
            size='icon'
            className='iconBtn mobile-menu-close'
            onClick={toggleMobileMenu}
          >
            ✕
          </Button>
        </div>

        <div className='mobile-menu-actions'>
          <Button
            onClick={() => {
              onNewInvoice();
              setMobileMenuOpen(false);
            }}
            className='btn primary mobile-menu-action-btn mobile-menu-action-btn-primary'
            size='sm'
          >
            + {t.newInvoice}
          </Button>

          <Button
            onClick={() => {
              onViewChange('invoices');
              setMobileMenuOpen(false);
            }}
            className='btn btn--soft mobile-menu-action-btn'
            variant='soft'
            size='sm'
          >
            {t.invoices || 'Invoices'}
          </Button>

          <Button
            onClick={() => {
              onViewChange('settings');
              setMobileMenuOpen(false);
            }}
            className='btn btn--soft mobile-menu-action-btn'
            variant='soft'
            size='sm'
          >
            {t.settings || 'Settings'}
          </Button>
        </div>

        <div className='mobile-menu-footer'>
          <div className='mobile-language-submenu'>
            <Button
              type='button'
              className='btn btn--soft user-submenu-toggle'
              onClick={() => setMobileLanguageMenuOpen((v) => !v)}
              aria-expanded={mobileLanguageMenuOpen}
              variant='soft'
              size='sm'
            >
              <span>
                {lang === 'cs'
                  ? 'Jazyk: Čeština (CZ)'
                  : 'Language: English (EN)'}
              </span>
              <span>{mobileLanguageMenuOpen ? '▴' : '▾'}</span>
            </Button>

            {mobileLanguageMenuOpen && (
              <div className='user-submenu-panel mobile-submenu-panel'>
                <Button
                  type='button'
                  className={`btn btn--soft user-submenu-option ${lang === 'cs' ? 'is-active' : ''}`}
                  onClick={() => {
                    setLang('cs');
                    setMobileLanguageMenuOpen(false);
                  }}
                  variant='soft'
                  size='sm'
                >
                  Čeština (CZ)
                </Button>
                <Button
                  type='button'
                  className={`btn btn--soft user-submenu-option ${lang === 'en' ? 'is-active' : ''}`}
                  onClick={() => {
                    setLang('en');
                    setMobileLanguageMenuOpen(false);
                  }}
                  variant='soft'
                  size='sm'
                >
                  English (EN)
                </Button>
              </div>
            )}
          </div>

          <Button
            type='button'
            className='btn btn--soft'
            onClick={toggleTheme}
            variant='soft'
            size='sm'
          >
            <span>{theme === 'dark' ? '☀' : '☾'}</span>
            {theme === 'dark'
              ? lang === 'cs'
                ? 'Přepnout na světlý režim'
                : 'Switch to light mode'
              : lang === 'cs'
                ? 'Přepnout na tmavý režim'
                : 'Switch to dark mode'}
          </Button>

          <div className='mobile-auth-section'>
            {user && (
              <div className='mobile-auth-caption'>
                {lang === 'cs' ? 'Přihlášen jako' : 'Logged in as'}:{' '}
                <strong>{user.email}</strong>
              </div>
            )}
            <Button
              onClick={() => {
                if (user) onLogout();
                else handleLogin();
                setMobileMenuOpen(false);
              }}
              className={`btn ${user ? 'danger' : 'primary'} mobile-auth-btn`}
              variant={user ? 'destructive' : 'default'}
              size='sm'
            >
              <span className='mobile-auth-icon'>{user ? '✕' : 'G'}</span>
              {user
                ? lang === 'cs'
                  ? 'Odhlásit se'
                  : 'Log out'
                : lang === 'cs'
                  ? 'Přihlásit se přes Google'
                  : 'Sign in with Google'}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
