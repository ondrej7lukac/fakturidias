import './Header.css';
import { useState, useEffect } from 'react';
import CompanyInfoModal from './CompanyInfoModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  BarChart2,
  Plus,
  Settings2,
  X,
  Menu,
  Check,
  Shield,
  Mail,
  RefreshCw,
  Wallet,
  Contact,
  Clock,
  FileText,
  Loader2,
  Mic,
  Pencil,
  ICON_SM,
  STROKE,
} from '@/lib/icons';
import type { LiveActivity } from '@/types/activity';
import type { ScreenNarration } from '@/hooks/useScreenNarration';

interface CompanyProfile {
  id: string;
  name: string;
  supplier: Record<string, unknown>;
}

interface RecentInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
}

interface HeaderProps {
  onNewInvoice: () => void;
  lang: string;
  setLang: (lang: string) => void;
  t: Record<string, string>;
  currentView: string;
  onViewChange: (view: string) => void;
  onOpenDashboard: () => void;
  onOpenInvoicesList: () => void;
  user: { email: string } | null;
  onLogout: () => void;
  mobileView: string;
  setMobileView: (v: string) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  isAdmin?: boolean;
  dashboardOpen?: boolean;
  defaultSupplier?: Record<string, unknown> | null;
  setDefaultSupplier?: (supplier: Record<string, unknown>) => void;
  recentInvoices?: RecentInvoice[];
  onOpenInvoice?: (id: string) => void;
  liveActivity?: LiveActivity | null;
  narration?: ScreenNarration | null;
}

export default function Header({
  onNewInvoice,
  lang,
  setLang,
  t,
  currentView,
  onViewChange,
  onOpenDashboard,
  onOpenInvoicesList,
  user,
  onLogout,
  mobileMenuOpen,
  setMobileMenuOpen,
  isAdmin = false,
  dashboardOpen = false,
  defaultSupplier = null,
  setDefaultSupplier,
  recentInvoices = [],
  onOpenInvoice,
  liveActivity = null,
  narration = null,
}: HeaderProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  );

  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfiles([]);
      return;
    }
    let active = true;
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = data?.settings?.supplierProfiles;
        if (active && Array.isArray(list)) setProfiles(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);

  const activeCompanyName =
    typeof defaultSupplier?.name === 'string' ? defaultSupplier.name : '';

  const handleSwitchCompany = (profile: CompanyProfile) => {
    setDefaultSupplier?.({ ...profile.supplier });
  };

  const handleSaveCompany = (supplier: Record<string, unknown>) => {
    setDefaultSupplier?.(supplier);
    const name = typeof supplier.name === 'string' ? supplier.name.trim() : '';
    if (!name) return;
    setProfiles((prev) => {
      const existing = prev.find((p) => p.name === name);
      const next = existing
        ? prev.map((p) => (p.name === name ? { ...p, supplier } : p))
        : [...prev, { id: crypto.randomUUID(), name, supplier }];
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { supplierProfiles: next } }),
      }).catch(() => {});
      return next;
    });
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(`theme-${next}`);
    setTheme(next);
  };

  const handleLogin = async () => {
    const w = 500,
      h = 600;
    const left = window.screen.width / 2 - w / 2;
    const top = window.screen.height / 2 - h / 2;
    const popup = window.open(
      'about:blank',
      'Google Login',
      `width=${w},height=${h},top=${top},left=${left}`,
    );
    try {
      const res = await fetch('/auth/google/url');
      if (!res.ok) throw new Error('Failed to start login');
      const data = await res.json();
      if (data.url && popup) popup.location.href = data.url;
      else popup?.close();
    } catch {
      popup?.close();
      alert('Failed to connect to login server.');
    }
    // Detect popup close and signal auth refresh (localStorage is same-origin here)
    if (popup) {
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          localStorage.setItem('auth_success', Date.now().toString());
        }
      }, 500);
    }
  };

  const isCz = lang === 'cs';

  // Dynamic Island — purely reflects what the user is currently doing.
  // A transient live interaction (AI listening / processing / saving …) takes
  // precedence over the static section context.
  const liveFace = (() => {
    if (!liveActivity) return null;
    switch (liveActivity.kind) {
      case 'listening':
        return {
          icon: Mic,
          spin: false,
          tone: 'live' as const,
          detail: isCz
            ? 'Posloucháme — nahlas popište fakturu, kterou chcete vytvořit.'
            : 'Listening — say out loud the invoice you want to create.',
        };
      case 'processing':
      case 'scanning':
        return {
          icon: Loader2,
          spin: true,
          tone: 'live' as const,
          detail: isCz
            ? 'AI zpracovává váš vstup a připravuje náhled faktury ke kontrole.'
            : 'The AI is processing your input and preparing an invoice preview to review.',
        };
      case 'done':
        return {
          icon: Check,
          spin: false,
          tone: 'done' as const,
          detail: isCz
            ? 'Náhled faktury je připraven — zkontrolujte ho a potvrďte vytvoření.'
            : 'Your invoice preview is ready — review it and confirm to create the invoice.',
        };
      case 'error':
        return {
          icon: X,
          spin: false,
          tone: 'error' as const,
          detail: isCz
            ? 'Zpracování se nezdařilo. Upravte vstup a zkuste to prosím znovu.'
            : 'That didn’t work. Adjust your input and please try again.',
        };
    }
  })();

  const sectionFace = (() => {
    if (dashboardOpen)
      return { icon: BarChart2, label: isCz ? 'Přehled faktur' : 'Invoice overview' };
    switch (currentView) {
      case 'settings':
        return { icon: Settings2, label: isCz ? 'Nastavení' : 'Settings' };
      case 'mailbox':
        return { icon: Mail, label: isCz ? 'Schránka faktur' : 'Invoice mailbox' };
      case 'recurring':
        return { icon: RefreshCw, label: isCz ? 'Opakované faktury' : 'Recurring invoices' };
      case 'expenses':
        return { icon: Wallet, label: isCz ? 'Výdaje' : 'Expenses' };
      case 'admin':
        return { icon: Shield, label: 'Admin' };
      default:
        return { icon: Plus, label: isCz ? 'Nová faktura' : 'New invoice' };
    }
  })();

  // Priority: a transient live interaction (AI / saving) → the on-screen
  // narration (focused field / section in view) → the static section name.
  const island = liveFace
    ? {
        Icon: liveFace.icon,
        label: liveActivity?.label ?? '',
        tone: liveFace.tone,
        spin: liveFace.spin,
        detail: liveFace.detail,
      }
    : narration
      ? {
          Icon: narration.mode === 'field' ? Pencil : FileText,
          label:
            narration.mode === 'field'
              ? `${isCz ? 'Vyplňujete' : 'Editing'}: ${narration.text}`
              : narration.text,
          tone: 'idle' as const,
          spin: false,
          detail:
            narration.mode === 'field'
              ? isCz
                ? `Právě upravujete pole „${narration.text}".`
                : `You’re editing the “${narration.text}” field.`
              : isCz
                ? `Prohlížíte sekci „${narration.text}".`
                : `You’re viewing the “${narration.text}” section.`,
        }
      : {
          Icon: sectionFace.icon,
          label: sectionFace.label,
          tone: 'idle' as const,
          spin: false,
          detail: isCz
            ? `Aktuální oblast: ${sectionFace.label}.`
            : `You are in: ${sectionFace.label}.`,
        };
  const IslandIcon = island.Icon;
  const islandLabel = island.label;
  const islandTone = island.tone;
  const islandSpin = island.spin;
  const islandDetail = island.detail;

  return (
    <header className='lp-header lp-header--app'>
      <div className='lp-header__inner lp-header__inner--app'>
        {/* Brand */}
        <button
          className='lp-brand lp-brand--btn'
          onClick={() => onViewChange('invoices')}
        >
          <img
            src='/GEMINI_LOGO_LONG.png'
            alt='Fakturidias'
            className='lp-logo'
          />
        </button>

        {/* Dynamic Island — centered live status of what the user is doing */}
        <div
          className={`header-island header-island--${islandTone}`}
          role='status'
          aria-live='polite'
          data-tooltip={islandDetail}
        >
          <span key={`${islandTone}-${islandLabel}`} className='header-island__face'>
            <span className='header-island__dot' aria-hidden />
            <IslandIcon
              size={ICON_SM}
              strokeWidth={STROKE}
              className={`header-island__icon${islandSpin ? ' header-island__icon--spin' : ''}`}
            />
            <span className='header-island__label'>{islandLabel}</span>
          </span>
        </div>

        {/* Actions */}
        <div className='lp-header__actions'>
          {/* New invoice — primary action (desktop; mobile uses the menu) */}
          <button
            className='lp-btn lp-btn--secondary header-new-desktop'
            onClick={onNewInvoice}
          >
            <Plus size={ICON_SM} strokeWidth={STROKE} />
            {isCz ? 'Nová faktura' : 'New invoice'}
          </button>

          {/* Language toggle */}
          <div className='lp-lang header-lang-desktop'>
            <button
              className={`lp-lang__btn${lang === 'cs' ? ' lp-lang__btn--active' : ''}`}
              onClick={() => setLang('cs')}
            >
              CS
            </button>
            <button
              className={`lp-lang__btn${lang === 'en' ? ' lp-lang__btn--active' : ''}`}
              onClick={() => setLang('en')}
            >
              EN
            </button>
          </div>

          {/* Theme toggle */}
          <button
            className='lp-icon-toggle'
            onClick={toggleTheme}
            aria-label={
              theme === 'dark'
                ? 'Switch to light theme'
                : 'Switch to dark theme'
            }
          >
            {theme === 'dark' ? (
              <svg
                width='22'
                height='22'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <circle cx='12' cy='12' r='4' />
                <path d='M12 2v2' />
                <path d='M12 20v2' />
                <path d='m4.93 4.93 1.41 1.41' />
                <path d='m17.66 17.66 1.41 1.41' />
                <path d='M2 12h2' />
                <path d='M20 12h2' />
                <path d='m6.34 17.66-1.41 1.41' />
                <path d='m19.07 4.93-1.41 1.41' />
              </svg>
            ) : (
              <svg
                width='22'
                height='22'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <path d='M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' />
              </svg>
            )}
          </button>

          {/* User avatar with dropdown (desktop only) */}
          <div className='header-user-desktop'>
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`ap-avatar${user ? ' ap-avatar--active' : ''}`}
              aria-label='User menu'
            >
              {user ? user.email[0].toUpperCase() : 'G'}
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align='end'
              sideOffset={8}
              className='user-dropdown'
            >
              {user ? (
                <div className='user-dropdown__card'>
                  <div className='user-dropdown__avatar'>
                    {user.email[0].toUpperCase()}
                  </div>
                  <div className='user-dropdown__info'>
                    <div className='user-dropdown__name'>
                      {user.email.split('@')[0]}
                    </div>
                    <div className='user-dropdown__email'>{user.email}</div>
                    <div className='user-dropdown__badge'>
                      <Check size={10} strokeWidth={3} />
                      {isCz ? 'Přihlášen' : 'Signed in'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className='user-dropdown__signin-prompt'>
                  <div className='user-dropdown__google-icon'>G</div>
                  <div>
                    <div className='user-dropdown__prompt-title'>
                      {isCz ? 'Nejste přihlášeni' : 'Not signed in'}
                    </div>
                    <div className='user-dropdown__prompt-sub'>
                      {isCz
                        ? 'Přihlaste se pro ukládání faktur'
                        : 'Sign in to save invoices'}
                    </div>
                  </div>
                </div>
              )}
              <DropdownMenuSeparator className='user-dropdown__separator' />
              {user && (
                <div className='user-dropdown__section'>
                  <div className='user-dropdown__section-label'>
                    <Contact size={12} strokeWidth={2} />
                    {isCz ? 'Firma' : 'Company'}
                  </div>
                  {activeCompanyName && (
                    <div className='user-dropdown__company-active'>
                      {activeCompanyName}
                    </div>
                  )}
                  {profiles
                    .filter((p) => p.name !== activeCompanyName)
                    .slice(0, 4)
                    .map((p) => (
                      <DropdownMenuItem
                        key={p.id}
                        onClick={() => handleSwitchCompany(p)}
                        className='user-dropdown__item user-dropdown__item--compact'
                      >
                        <RefreshCw size={14} strokeWidth={2} className='user-dropdown__item-icon' />
                        <span>{p.name}</span>
                      </DropdownMenuItem>
                    ))}
                  <DropdownMenuItem
                    onClick={() => setCompanyModalOpen(true)}
                    className='user-dropdown__item user-dropdown__item--compact'
                  >
                    <Plus size={14} strokeWidth={2} className='user-dropdown__item-icon' />
                    <span>{isCz ? 'Přidat / upravit firmu' : 'Add / edit company'}</span>
                  </DropdownMenuItem>
                </div>
              )}
              {user && recentInvoices.length > 0 && (
                <div className='user-dropdown__section'>
                  <div className='user-dropdown__section-label'>
                    <Clock size={12} strokeWidth={2} />
                    {isCz ? 'Naposledy otevřené' : 'Recent'}
                  </div>
                  {recentInvoices.slice(0, 4).map((r) => (
                    <DropdownMenuItem
                      key={r.id}
                      onClick={() => onOpenInvoice?.(r.id)}
                      className='user-dropdown__item user-dropdown__item--compact'
                    >
                      <FileText size={14} strokeWidth={2} className='user-dropdown__item-icon' />
                      <span className='user-dropdown__recent-text'>
                        {r.invoiceNumber || (isCz ? 'Faktura' : 'Invoice')}
                        {r.clientName ? ` · ${r.clientName}` : ''}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
              <DropdownMenuSeparator className='user-dropdown__separator' />
              <div className='user-dropdown__actions'>
                {user && (
                  <DropdownMenuItem
                    onClick={() => onViewChange('mailbox')}
                    className='user-dropdown__item'
                  >
                    <Mail
                      size={15}
                      strokeWidth={2}
                      className='user-dropdown__item-icon'
                    />
                    <span>{isCz ? 'Schránka faktur' : 'Invoice mailbox'}</span>
                  </DropdownMenuItem>
                )}
                {user && (
                  <DropdownMenuItem
                    onClick={() => onViewChange('recurring')}
                    className='user-dropdown__item'
                  >
                    <RefreshCw
                      size={15}
                      strokeWidth={2}
                      className='user-dropdown__item-icon'
                    />
                    <span>
                      {isCz ? 'Opakované faktury' : 'Recurring invoices'}
                    </span>
                  </DropdownMenuItem>
                )}
                {user && (
                  <DropdownMenuItem
                    onClick={() => onViewChange('expenses')}
                    className='user-dropdown__item'
                  >
                    <Wallet
                      size={15}
                      strokeWidth={2}
                      className='user-dropdown__item-icon'
                    />
                    <span>{isCz ? 'Výdaje' : 'Expenses'}</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onViewChange('settings')}
                  className='user-dropdown__item'
                >
                  <Settings2
                    size={15}
                    strokeWidth={2}
                    className='user-dropdown__item-icon'
                  />
                  <span>{isCz ? 'Nastavení' : 'Settings'}</span>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem
                    onClick={() => onViewChange('admin')}
                    className='user-dropdown__item'
                  >
                    <Shield
                      size={15}
                      strokeWidth={2}
                      className='user-dropdown__item-icon'
                      style={{ color: 'var(--accent)' }}
                    />
                    <span style={{ color: 'var(--accent)' }}>Admin</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className='user-dropdown__separator--inner' />
                {user ? (
                  <DropdownMenuItem
                    onClick={onLogout}
                    className='user-dropdown__item user-dropdown__item--danger'
                  >
                    <X size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
                    <span>{isCz ? 'Odhlásit se' : 'Sign out'}</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={handleLogin}
                    className='user-dropdown__item user-dropdown__item--signin'
                  >
                    <span className='user-dropdown__signin-letter'>G</span>
                    <span>
                      {isCz
                        ? 'Přihlásit se přes Google'
                        : 'Sign in with Google'}
                    </span>
                  </DropdownMenuItem>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>

          {/* Mobile hamburger */}
          <button
            className='lp-icon-toggle header-mobile-menu'
            onClick={() => setMobileMenuOpen(true)}
            aria-label='Menu'
          >
            <Menu size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Mobile Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side='right'
          className='flex flex-col gap-0 p-0 w-[300px] header__sheet'
        >
          <SheetHeader
            className='px-6 py-5 border-b'
            style={{ borderColor: 'var(--border)' }}
          >
            <SheetTitle style={{ color: 'var(--text)', fontWeight: 700 }}>
              Menu
            </SheetTitle>
          </SheetHeader>

          <div className='header__sheet-body flex flex-col flex-1'>
            {/* User identity card — mirrors the desktop dropdown */}
            {user ? (
              <div className='user-dropdown__card'>
                <div className='user-dropdown__avatar'>
                  {user.email[0].toUpperCase()}
                </div>
                <div className='user-dropdown__info'>
                  <div className='user-dropdown__name'>
                    {user.email.split('@')[0]}
                  </div>
                  <div className='user-dropdown__email'>{user.email}</div>
                  <div className='user-dropdown__badge'>
                    <Check size={10} strokeWidth={3} />
                    {isCz ? 'Přihlášen' : 'Signed in'}
                  </div>
                </div>
              </div>
            ) : (
              <div className='user-dropdown__signin-prompt'>
                <div className='user-dropdown__google-icon'>G</div>
                <div>
                  <div className='user-dropdown__prompt-title'>
                    {isCz ? 'Nejste přihlášeni' : 'Not signed in'}
                  </div>
                  <div className='user-dropdown__prompt-sub'>
                    {isCz
                      ? 'Přihlaste se pro ukládání faktur'
                      : 'Sign in to save invoices'}
                  </div>
                </div>
              </div>
            )}

            {/* Primary navigation */}
            <div className='user-dropdown__actions'>
              <button
                className='user-dropdown__item'
                onClick={() => {
                  onOpenDashboard();
                  setMobileMenuOpen(false);
                }}
              >
                <BarChart2 size={15} strokeWidth={2} className='user-dropdown__item-icon' />
                <span>{isCz ? 'Přehled faktur' : 'Invoice overview'}</span>
              </button>
              <button
                className='user-dropdown__item'
                onClick={() => {
                  onOpenInvoicesList();
                  setMobileMenuOpen(false);
                }}
              >
                <FileText size={15} strokeWidth={2} className='user-dropdown__item-icon' />
                <span>{isCz ? 'Faktury' : 'Invoices'}</span>
              </button>
              <button
                className='user-dropdown__item user-dropdown__item--accent'
                onClick={() => {
                  onNewInvoice();
                  setMobileMenuOpen(false);
                }}
              >
                <Plus size={15} strokeWidth={2} className='user-dropdown__item-icon' />
                <span>{isCz ? 'Nová faktura' : 'New invoice'}</span>
              </button>
            </div>

            {/* Company quick-switch */}
            {user && (
              <div className='user-dropdown__section'>
                <div className='user-dropdown__section-label'>
                  <Contact size={12} strokeWidth={2} />
                  {isCz ? 'Firma' : 'Company'}
                </div>
                {activeCompanyName && (
                  <div className='user-dropdown__company-active'>
                    {activeCompanyName}
                  </div>
                )}
                {profiles
                  .filter((p) => p.name !== activeCompanyName)
                  .slice(0, 4)
                  .map((p) => (
                    <button
                      key={p.id}
                      className='user-dropdown__item user-dropdown__item--compact'
                      onClick={() => {
                        handleSwitchCompany(p);
                        setMobileMenuOpen(false);
                      }}
                    >
                      <RefreshCw size={14} strokeWidth={2} className='user-dropdown__item-icon' />
                      <span>{p.name}</span>
                    </button>
                  ))}
                <button
                  className='user-dropdown__item user-dropdown__item--compact'
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setCompanyModalOpen(true);
                  }}
                >
                  <Plus size={14} strokeWidth={2} className='user-dropdown__item-icon' />
                  <span>{isCz ? 'Přidat / upravit firmu' : 'Add / edit company'}</span>
                </button>
              </div>
            )}

            {/* Recent invoices */}
            {user && recentInvoices.length > 0 && (
              <div className='user-dropdown__section'>
                <div className='user-dropdown__section-label'>
                  <Clock size={12} strokeWidth={2} />
                  {isCz ? 'Naposledy otevřené' : 'Recent'}
                </div>
                {recentInvoices.slice(0, 4).map((r) => (
                  <button
                    key={r.id}
                    className='user-dropdown__item user-dropdown__item--compact'
                    onClick={() => {
                      onOpenInvoice?.(r.id);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <FileText size={14} strokeWidth={2} className='user-dropdown__item-icon' />
                    <span className='user-dropdown__recent-text'>
                      {r.invoiceNumber || (isCz ? 'Faktura' : 'Invoice')}
                      {r.clientName ? ` · ${r.clientName}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Account actions */}
            <div className='user-dropdown__actions'>
              {user && (
                <button
                  className='user-dropdown__item'
                  onClick={() => {
                    onViewChange('mailbox');
                    setMobileMenuOpen(false);
                  }}
                >
                  <Mail size={15} strokeWidth={2} className='user-dropdown__item-icon' />
                  <span>{isCz ? 'Schránka faktur' : 'Invoice mailbox'}</span>
                </button>
              )}
              {user && (
                <button
                  className='user-dropdown__item'
                  onClick={() => {
                    onViewChange('recurring');
                    setMobileMenuOpen(false);
                  }}
                >
                  <RefreshCw size={15} strokeWidth={2} className='user-dropdown__item-icon' />
                  <span>{isCz ? 'Opakované faktury' : 'Recurring invoices'}</span>
                </button>
              )}
              {user && (
                <button
                  className='user-dropdown__item'
                  onClick={() => {
                    onViewChange('expenses');
                    setMobileMenuOpen(false);
                  }}
                >
                  <Wallet size={15} strokeWidth={2} className='user-dropdown__item-icon' />
                  <span>{isCz ? 'Výdaje' : 'Expenses'}</span>
                </button>
              )}
              <button
                className='user-dropdown__item'
                onClick={() => {
                  onViewChange('settings');
                  setMobileMenuOpen(false);
                }}
              >
                <Settings2 size={15} strokeWidth={2} className='user-dropdown__item-icon' />
                <span>{isCz ? 'Nastavení' : 'Settings'}</span>
              </button>
              {isAdmin && (
                <button
                  className='user-dropdown__item'
                  onClick={() => {
                    onViewChange('admin');
                    setMobileMenuOpen(false);
                  }}
                >
                  <Shield size={15} strokeWidth={2} className='user-dropdown__item-icon' style={{ color: 'var(--accent)' }} />
                  <span style={{ color: 'var(--accent)' }}>Admin</span>
                </button>
              )}
            </div>
          </div>

          <div
            className='flex flex-col gap-4 px-6 py-6 border-t'
            style={{ borderColor: 'var(--border)' }}
          >
            <div>
              <p className='text-xs font-semibold mb-2 text-center opacity-60 uppercase tracking-wider'>
                {isCz ? 'Jazyk' : 'Language'}
              </p>
              <div
                className='lp-lang'
                style={{ width: '100%', borderRadius: 12 }}
              >
                <button
                  className={`lp-lang__btn${lang === 'cs' ? ' lp-lang__btn--active' : ''}`}
                  style={{ flex: 1, textAlign: 'center', padding: '8px 0' }}
                  onClick={() => {
                    setLang('cs');
                    setMobileMenuOpen(false);
                  }}
                >
                  CS — Čeština
                </button>
                <button
                  className={`lp-lang__btn${lang === 'en' ? ' lp-lang__btn--active' : ''}`}
                  style={{ flex: 1, textAlign: 'center', padding: '8px 0' }}
                  onClick={() => {
                    setLang('en');
                    setMobileMenuOpen(false);
                  }}
                >
                  EN — English
                </button>
              </div>
            </div>

            {user && (
              <p className='text-xs text-center opacity-60'>
                {isCz ? 'Přihlášen jako' : 'Logged in as'}:{' '}
                <strong>{user.email}</strong>
              </p>
            )}

            <button
              className={`lp-btn lp-btn--lg ${user ? 'header__mobile-auth--logout' : 'lp-btn--primary'}`}
              style={{ justifyContent: 'center', width: '100%' }}
              onClick={() => {
                user ? onLogout() : handleLogin();
                setMobileMenuOpen(false);
              }}
            >
              {user ? (
                <>
                  <X size={ICON_SM} strokeWidth={2} />{' '}
                  {isCz ? 'Odhlásit se' : 'Log out'}
                </>
              ) : (
                <>
                  <span style={{ fontWeight: 800, marginRight: 6 }}>G</span>{' '}
                  {isCz ? 'Přihlásit se přes Google' : 'Sign in with Google'}
                </>
              )}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <CompanyInfoModal
        lang={lang}
        t={t}
        open={companyModalOpen}
        onOpenChange={setCompanyModalOpen}
        initialSupplier={defaultSupplier}
        onSave={handleSaveCompany}
      />
    </header>
  );
}
