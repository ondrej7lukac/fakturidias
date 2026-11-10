import './MobileTabBar.css';
import { useEffect, useState } from 'react';

import {
  BarChart2,
  FileText,
  Menu,
  Plus,
  Settings2,
  STROKE,
  type LucideIcon,
} from '@/lib/icons';

type TabId = 'dashboard' | 'list' | 'new' | 'settings' | 'more';

interface MobileTabBarProps {
  lang: string;
  currentView: string;
  dashboardOpen: boolean;
  mobileView: string;
  mobileMenuOpen: boolean;
  onOpenDashboard: () => void;
  onOpenInvoicesList: () => void;
  onNewInvoice: () => void;
  onOpenSettings: () => void;
  onOpenMenu: () => void;
}

interface Tab {
  id: TabId;
  label: string;
  Icon: LucideIcon;
  onSelect: () => void;
}

function isEditableElement(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return true;
  }
  if (el instanceof HTMLInputElement) {
    return !['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'range', 'color'].includes(el.type);
  }
  return el instanceof HTMLElement && el.isContentEditable;
}

/**
 * True while an on-screen keyboard is likely open (an editable field has
 * focus). The tab bar hides then, so it never covers the field or the form's
 * own buttons above the keyboard.
 */
function useIsTyping(): boolean {
  const [isTyping, setIsTyping] = useState(false);
  useEffect(() => {
    const update = () => setIsTyping(isEditableElement(document.activeElement));
    document.addEventListener('focusin', update);
    // focusout fires before focus moves on; re-check after it has settled.
    const handleFocusOut = () => window.setTimeout(update, 0);
    document.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);
  return isTyping;
}

/** Bottom navigation for phones (≤768px); hidden on larger screens via CSS. */
export default function MobileTabBar({
  lang,
  currentView,
  dashboardOpen,
  mobileView,
  mobileMenuOpen,
  onOpenDashboard,
  onOpenInvoicesList,
  onNewInvoice,
  onOpenSettings,
  onOpenMenu,
}: MobileTabBarProps) {
  const isTyping = useIsTyping();
  const isCz = lang === 'cs';

  // Expose the bar's footprint so sticky bottom elements (e.g. save bars)
  // sit above it, and drop it to 0 while the bar is hidden for typing.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('has-mobile-tabbar', !isTyping);
    return () => root.classList.remove('has-mobile-tabbar');
  }, [isTyping]);

  const activeTab: TabId | null = mobileMenuOpen
    ? 'more'
    : currentView === 'settings'
      ? 'settings'
      : currentView !== 'invoices'
        ? null
        : dashboardOpen
          ? 'dashboard'
          : mobileView === 'list'
            ? 'list'
            : 'new';

  const tabs: Tab[] = [
    {
      id: 'dashboard',
      label: isCz ? 'Přehled' : 'Overview',
      Icon: BarChart2,
      onSelect: onOpenDashboard,
    },
    {
      id: 'list',
      label: isCz ? 'Faktury' : 'Invoices',
      Icon: FileText,
      onSelect: onOpenInvoicesList,
    },
    {
      id: 'new',
      label: isCz ? 'Nová' : 'New',
      Icon: Plus,
      onSelect: onNewInvoice,
    },
    {
      id: 'settings',
      label: isCz ? 'Nastavení' : 'Settings',
      Icon: Settings2,
      onSelect: onOpenSettings,
    },
    {
      id: 'more',
      label: isCz ? 'Více' : 'More',
      Icon: Menu,
      onSelect: onOpenMenu,
    },
  ];

  return (
    <nav
      className={`mobile-tabbar${isTyping ? ' mobile-tabbar--hidden' : ''}`}
      aria-label={isCz ? 'Hlavní navigace' : 'Main navigation'}
    >
      {tabs.map(({ id, label, Icon, onSelect }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type='button'
            className={`mobile-tabbar__tab${id === 'new' ? ' mobile-tabbar__tab--primary' : ''}${isActive ? ' mobile-tabbar__tab--active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => {
              onSelect();
              window.scrollTo({ top: 0 });
            }}
          >
            <span className='mobile-tabbar__icon'>
              <Icon size={id === 'new' ? 22 : 20} strokeWidth={STROKE} />
            </span>
            <span className='mobile-tabbar__label'>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
