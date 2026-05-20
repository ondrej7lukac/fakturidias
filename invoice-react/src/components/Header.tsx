import './Header.css'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { BarChart2, Plus, Settings2, X, Menu, Check, ICON_SM, STROKE } from '@/lib/icons'

interface HeaderProps {
  onNewInvoice: () => void
  lang: string
  setLang: (lang: string) => void
  t: Record<string, string>
  currentView: string
  onViewChange: (view: string) => void
  onOpenDashboard: () => void
  user: { email: string } | null
  onLogout: () => void
  mobileView: string
  setMobileView: (v: string) => void
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}

export default function Header({
  onNewInvoice,
  lang,
  setLang,
  t,
  currentView,
  onViewChange,
  onOpenDashboard,
  user,
  onLogout,
  mobileMenuOpen,
  setMobileMenuOpen,
}: HeaderProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.remove('theme-light', 'theme-dark')
    document.documentElement.classList.add(`theme-${next}`)
    setTheme(next)
  }

  const handleLogin = async () => {
    const w = 500, h = 600
    const left = window.screen.width / 2 - w / 2
    const top = window.screen.height / 2 - h / 2
    const popup = window.open('about:blank', 'Google Login', `width=${w},height=${h},top=${top},left=${left}`)
    try {
      const res = await fetch('/auth/google/url')
      if (!res.ok) throw new Error('Failed to start login')
      const data = await res.json()
      if (data.url && popup) popup.location.href = data.url
      else popup?.close()
    } catch {
      popup?.close()
      alert('Failed to connect to login server.')
    }
    // Detect popup close and signal auth refresh (localStorage is same-origin here)
    if (popup) {
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          localStorage.setItem('auth_success', Date.now().toString())
        }
      }, 500)
    }
  }

  const isCz = lang === 'cs'

  return (
    <header className="lp-header lp-header--app">
      <div className="lp-header__inner lp-header__inner--app">

        {/* Brand */}
        <button className="lp-brand lp-brand--btn" onClick={() => onViewChange('invoices')}>
          <img src="/GEMINI_LOGO_LONG.png" alt="Fakturidias" className="lp-logo" />
        </button>

        {/* Desktop segment: Invoice overview + New invoice */}
        <div className="ap-seg header-seg-desktop">
          <button className="ap-seg__btn" onClick={onOpenDashboard}>
            <BarChart2 size={ICON_SM} strokeWidth={STROKE} />
            <span className="seg-label-long">{isCz ? 'Přehled faktur' : 'Invoice overview'}</span>
          </button>
          <button className="ap-seg__btn ap-seg__btn--primary" onClick={onNewInvoice}>
            <Plus size={ICON_SM} strokeWidth={STROKE} />
            {isCz ? 'Nová faktura' : 'New invoice'}
          </button>
        </div>

        {/* Actions */}
        <div className="lp-header__actions">

          {/* Language toggle */}
          <div className="lp-lang header-lang-desktop">
            <button className={`lp-lang__btn${lang === 'cs' ? ' lp-lang__btn--active' : ''}`} onClick={() => setLang('cs')}>CS</button>
            <button className={`lp-lang__btn${lang === 'en' ? ' lp-lang__btn--active' : ''}`} onClick={() => setLang('en')}>EN</button>
          </div>

          {/* Theme toggle */}
          <button
            className="lp-icon-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark'
              ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>}
          </button>

          {/* User avatar with dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className={`ap-avatar${user ? ' ap-avatar--active' : ''}`} aria-label="User menu">
              {user ? user.email[0].toUpperCase() : 'G'}
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={8} className="user-dropdown">
              {user ? (
                <div className="user-dropdown__card">
                  <div className="user-dropdown__avatar">{user.email[0].toUpperCase()}</div>
                  <div className="user-dropdown__info">
                    <div className="user-dropdown__name">{user.email.split('@')[0]}</div>
                    <div className="user-dropdown__email">{user.email}</div>
                    <div className="user-dropdown__badge">
                      <Check size={10} strokeWidth={3} />
                      {isCz ? 'Přihlášen' : 'Signed in'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="user-dropdown__signin-prompt">
                  <div className="user-dropdown__google-icon">G</div>
                  <div>
                    <div className="user-dropdown__prompt-title">{isCz ? 'Nejste přihlášeni' : 'Not signed in'}</div>
                    <div className="user-dropdown__prompt-sub">{isCz ? 'Přihlaste se pro ukládání faktur' : 'Sign in to save invoices'}</div>
                  </div>
                </div>
              )}
              <DropdownMenuSeparator className="user-dropdown__separator" />
              <div className="user-dropdown__actions">
                <DropdownMenuItem onClick={() => onViewChange('settings')} className="user-dropdown__item">
                  <Settings2 size={15} strokeWidth={2} className="user-dropdown__item-icon" />
                  <span>{isCz ? 'Nastavení' : 'Settings'}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="user-dropdown__separator--inner" />
                {user ? (
                  <DropdownMenuItem onClick={onLogout} className="user-dropdown__item user-dropdown__item--danger">
                    <X size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
                    <span>{isCz ? 'Odhlásit se' : 'Sign out'}</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleLogin} className="user-dropdown__item user-dropdown__item--signin">
                    <span className="user-dropdown__signin-letter">G</span>
                    <span>{isCz ? 'Přihlásit se přes Google' : 'Sign in with Google'}</span>
                  </DropdownMenuItem>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile hamburger */}
          <button
            className="lp-icon-toggle header-mobile-menu"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menu"
          >
            <Menu size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Mobile Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="flex flex-col gap-0 p-0 w-[300px] header__sheet">
          <SheetHeader className="px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <SheetTitle style={{ color: 'var(--text)', fontWeight: 700 }}>Menu</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-3 px-6 py-6 flex-1">
            <button
              className="lp-btn lp-btn--secondary"
              style={{ justifyContent: 'flex-start', width: '100%' }}
              onClick={() => { onOpenDashboard(); setMobileMenuOpen(false) }}
            >
              <BarChart2 size={ICON_SM} strokeWidth={STROKE} />
              {isCz ? 'Přehled faktur' : 'Invoice overview'}
            </button>
            <button
              className="lp-btn lp-btn--primary"
              style={{ justifyContent: 'flex-start', width: '100%' }}
              onClick={() => { onNewInvoice(); setMobileMenuOpen(false) }}
            >
              <Plus size={ICON_SM} strokeWidth={STROKE} />
              {isCz ? 'Nová faktura' : 'New invoice'}
            </button>
          </div>

          <div className="flex flex-col gap-4 px-6 py-6 border-t" style={{ borderColor: 'var(--border)' }}>
            <div>
              <p className="text-xs font-semibold mb-2 text-center opacity-60 uppercase tracking-wider">
                {isCz ? 'Jazyk' : 'Language'}
              </p>
              <div className="lp-lang" style={{ width: '100%', borderRadius: 12 }}>
                <button
                  className={`lp-lang__btn${lang === 'cs' ? ' lp-lang__btn--active' : ''}`}
                  style={{ flex: 1, textAlign: 'center', padding: '8px 0' }}
                  onClick={() => { setLang('cs'); setMobileMenuOpen(false) }}
                >CS — Čeština</button>
                <button
                  className={`lp-lang__btn${lang === 'en' ? ' lp-lang__btn--active' : ''}`}
                  style={{ flex: 1, textAlign: 'center', padding: '8px 0' }}
                  onClick={() => { setLang('en'); setMobileMenuOpen(false) }}
                >EN — English</button>
              </div>
            </div>

            {user && (
              <p className="text-xs text-center opacity-60">
                {isCz ? 'Přihlášen jako' : 'Logged in as'}: <strong>{user.email}</strong>
              </p>
            )}

            <button
              className={`lp-btn lp-btn--lg ${user ? 'header__mobile-auth--logout' : 'lp-btn--primary'}`}
              style={{ justifyContent: 'center', width: '100%' }}
              onClick={() => { user ? onLogout() : handleLogin(); setMobileMenuOpen(false) }}
            >
              {user
                ? <><X size={ICON_SM} strokeWidth={2} /> {isCz ? 'Odhlásit se' : 'Log out'}</>
                : <><span style={{ fontWeight: 800, marginRight: 6 }}>G</span> {isCz ? 'Přihlásit se přes Google' : 'Sign in with Google'}</>}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
