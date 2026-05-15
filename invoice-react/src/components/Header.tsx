import './Header.css'
import { Button } from '@/components/ui/button'
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
import { Settings2, X, Menu, FileText, Check } from '@/lib/icons'

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
  mobileView,
  setMobileView,
  mobileMenuOpen,
  setMobileMenuOpen,
}: HeaderProps) {

  const handleLogin = async () => {
    const w = 500, h = 600
    const left = window.screen.width / 2 - w / 2
    const top = window.screen.height / 2 - h / 2
    const popup = window.open('about:blank', 'Google Login', `width=${w},height=${h},top=${top},left=${left}`)
    try {
      const res = await fetch('/auth/google/url')
      if (!res.ok) throw new Error('Failed to start login')
      const data = await res.json()
      if (data.url && popup) {
        popup.location.href = data.url
      } else {
        popup?.close()
      }
    } catch {
      popup?.close()
      alert('Failed to connect to login server.')
    }
  }

  return (
    <header className="header">
      <div className="header__inner">

        {/* Brand */}
        <div className="brand" onClick={() => onViewChange('invoices')} role="button" tabIndex={0}>
          <img src="/GEMINI_GEN_LOGO.png" alt="Fakturidias" className="brand__mark" />
          <div className="brand__text">
            <span className="brand__name">Fakturidias</span>
            <span className="brand__sub">Invoices & Proforma</span>
          </div>
        </div>

        {/* ── Desktop nav ────────────────────────────────────── */}
        <div className="header__nav">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenDashboard}
            className={currentView === 'invoices' ? 'border-border' : 'border-transparent'}
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}
          >
            {lang === 'cs' ? 'Přehled faktur' : 'Invoices'}
          </Button>

          <Button
            size="sm"
            onClick={onNewInvoice}
            style={{
              background: 'linear-gradient(135deg, rgba(124,247,212,0.92), rgba(138,164,255,0.92))',
              color: '#061022',
              border: '1px solid rgba(255,255,255,0.14)',
              fontWeight: 700,
            }}
          >
            + {lang === 'cs' ? 'Vytvořit fakturu' : 'New Invoice'}
          </Button>

          {/* Language toggle — CS / EN inline */}
          <div className="lang-toggle">
            <button
              className={`lang-toggle__btn${lang === 'cs' ? ' lang-toggle__btn--active' : ''}`}
              onClick={() => setLang('cs')}
            >CS</button>
            <button
              className={`lang-toggle__btn${lang === 'en' ? ' lang-toggle__btn--active' : ''}`}
              onClick={() => setLang('en')}
            >EN</button>
          </div>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="user-trigger" aria-label="User menu">
                <span className={`user-avatar${user ? ' user-avatar--active' : ''}`}>
                  {user ? user.email[0].toUpperCase() : 'G'}
                </span>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="user-dropdown"
              style={{ background: 'rgba(10,13,28,0.96)', backdropFilter: 'blur(20px)', border: '1px solid var(--border)', borderRadius: '16px', padding: 0, minWidth: '220px', boxShadow: 'var(--shadow)' }}
            >
              {/* User info card */}
              {user ? (
                <div className="user-dropdown__card">
                  <div className="user-dropdown__avatar">
                    {user.email[0].toUpperCase()}
                  </div>
                  <div className="user-dropdown__info">
                    <div className="user-dropdown__name">{user.email.split('@')[0]}</div>
                    <div className="user-dropdown__email">{user.email}</div>
                    <div className="user-dropdown__badge">
                      <Check size={10} strokeWidth={3} />
                      {lang === 'cs' ? 'Přihlášen' : 'Signed in'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="user-dropdown__signin-prompt">
                  <div className="user-dropdown__google-icon">G</div>
                  <div>
                    <div className="user-dropdown__prompt-title">{lang === 'cs' ? 'Nejste přihlášeni' : 'Not signed in'}</div>
                    <div className="user-dropdown__prompt-sub">{lang === 'cs' ? 'Přihlaste se pro ukládání faktur' : 'Sign in to save invoices'}</div>
                  </div>
                </div>
              )}

              <DropdownMenuSeparator style={{ background: 'var(--border)', margin: 0 }} />

              {/* Actions */}
              <div style={{ padding: '6px' }}>
                <DropdownMenuItem
                  onClick={() => onViewChange('settings')}
                  className="user-dropdown__item"
                  style={{ borderRadius: '10px', padding: '9px 12px', cursor: 'pointer', color: 'var(--text)', gap: '10px' }}
                >
                  <Settings2 size={15} strokeWidth={2} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                  <span>{t.settings || 'Settings'}</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator style={{ background: 'var(--border)', margin: '4px 0' }} />

                {user ? (
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="user-dropdown__item user-dropdown__item--danger"
                    style={{ borderRadius: '10px', padding: '9px 12px', cursor: 'pointer', color: 'var(--danger)', gap: '10px' }}
                  >
                    <X size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
                    <span>{lang === 'cs' ? 'Odhlásit se' : 'Sign out'}</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={handleLogin}
                    className="user-dropdown__item user-dropdown__item--signin"
                    style={{ borderRadius: '10px', padding: '10px 12px', cursor: 'pointer', gap: '10px',
                      background: 'linear-gradient(135deg, rgba(124,247,212,0.12), rgba(138,164,255,0.12))',
                      border: '1px solid rgba(124,247,212,0.2)',
                      color: 'var(--accent)', fontWeight: 700 }}
                  >
                    <span style={{ fontWeight: 800, fontSize: '14px', flexShrink: 0, width: 15, textAlign: 'center' }}>G</span>
                    <span>{lang === 'cs' ? 'Přihlásit se přes Google' : 'Sign in with Google'}</span>
                  </DropdownMenuItem>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── Mobile controls ─────────────────────────────────── */}
        <div className="header__mobile">
          <div className="view-switch">
            <button
              className={`switch-option ${mobileView === 'list' ? 'active' : ''}`}
              onClick={() => setMobileView('list')}
            >
              {lang === 'cs' ? 'Seznam' : 'List'}
            </button>
            <button
              className={`switch-option ${mobileView === 'form' ? 'active' : ''}`}
              onClick={() => setMobileView('form')}
            >
              {lang === 'cs' ? 'Faktura' : 'Invoice'}
            </button>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="w-9 h-9"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <Menu size={18} strokeWidth={2} />
          </Button>
        </div>
      </div>

      {/* ── Mobile Sheet menu ────────────────────────────────── */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="right"
          className="flex flex-col gap-0 p-0 w-[300px]"
          style={{ background: 'rgba(10,12,25,0.92)', backdropFilter: 'blur(20px)', borderLeft: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <SheetHeader className="px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <SheetTitle style={{ color: 'var(--text)', fontWeight: 700 }}>Menu</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-3 px-6 py-6 flex-1">
            <Button
              onClick={() => { onNewInvoice(); setMobileMenuOpen(false) }}
              className="w-full justify-center text-base py-6"
              style={{
                background: 'linear-gradient(135deg, rgba(124,247,212,0.92), rgba(138,164,255,0.92))',
                color: '#061022',
                border: '1px solid rgba(255,255,255,0.14)',
                fontWeight: 700,
              }}
            >
              + {t.newInvoice || 'New Invoice'}
            </Button>

            <Button
              variant="outline"
              onClick={() => { onOpenDashboard(); setMobileMenuOpen(false) }}
              className="w-full justify-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              <FileText size={16} strokeWidth={2} className="mr-2" /> {t.invoices || 'Invoices'}
            </Button>

            <Button
              variant="outline"
              onClick={() => { onViewChange('settings'); setMobileMenuOpen(false) }}
              className="w-full justify-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              <Settings2 size={16} strokeWidth={2} className="mr-2" /> {t.settings || 'Settings'}
            </Button>
          </div>

          <div className="flex flex-col gap-4 px-6 py-6 border-t" style={{ borderColor: 'var(--border)' }}>
            {/* Language toggle in mobile menu */}
            <div>
              <p className="text-xs font-semibold mb-2 text-center opacity-60 uppercase tracking-wider">
                {lang === 'cs' ? 'Jazyk' : 'Language'}
              </p>
              <div className="lang-toggle lang-toggle--mobile">
                <button
                  className={`lang-toggle__btn${lang === 'cs' ? ' lang-toggle__btn--active' : ''}`}
                  onClick={() => { setLang('cs'); setMobileMenuOpen(false) }}
                >CS — Čeština</button>
                <button
                  className={`lang-toggle__btn${lang === 'en' ? ' lang-toggle__btn--active' : ''}`}
                  onClick={() => { setLang('en'); setMobileMenuOpen(false) }}
                >EN — English</button>
              </div>
            </div>

            {user && (
              <p className="text-xs text-center opacity-60">
                {lang === 'cs' ? 'Přihlášen jako' : 'Logged in as'}: <strong>{user.email}</strong>
              </p>
            )}

            <Button
              onClick={() => { user ? onLogout() : handleLogin(); setMobileMenuOpen(false) }}
              className="w-full justify-center py-6"
              style={{
                background: user ? 'rgba(255,91,122,0.15)' : 'linear-gradient(135deg, rgba(124,247,212,0.92), rgba(138,164,255,0.92))',
                border: user ? '1px solid var(--danger)' : '1px solid rgba(255,255,255,0.14)',
                color: user ? 'var(--danger)' : '#061022',
                fontWeight: 700,
              }}
            >
              {user
                ? <><X size={16} strokeWidth={2} className="mr-2" /> {lang === 'cs' ? 'Odhlásit se' : 'Log out'}</>
                : <><span className="font-bold mr-2">G</span> {lang === 'cs' ? 'Přihlásit se přes Google' : 'Sign in with Google'}</>}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
