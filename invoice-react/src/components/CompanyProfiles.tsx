import './CompanyProfiles.css';
import { useEffect, useState } from 'react';
import {
  Contact,
  Plus,
  Trash2,
  Check,
  ICON_SM,
  ICON_MD,
  STROKE,
} from '@/lib/icons';
import { useLiveActivity } from '@/contexts/activity';

type SupplierRecord = Record<string, unknown> | null;

interface CompanyProfile {
  id: string;
  name: string;
  supplier: Record<string, unknown>;
}

interface CompanyProfilesProps {
  lang: string;
  defaultSupplier: SupplierRecord;
  onApplyProfile: (supplier: Record<string, unknown>) => void;
}

async function persistSettings(patch: Record<string, unknown>) {
  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings: patch }),
  });
}

export default function CompanyProfiles({
  lang,
  defaultSupplier,
  onApplyProfile,
}: CompanyProfilesProps) {
  const isCz = lang === 'cs';
  const { announce } = useLiveActivity();
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [name, setName] = useState('');

  useEffect(() => {
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
  }, []);

  async function saveProfiles(next: CompanyProfile[]) {
    setProfiles(next);
    await persistSettings({ supplierProfiles: next }).catch(() => {});
  }

  async function handleSaveCurrent() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const profile: CompanyProfile = {
      id: crypto.randomUUID(),
      name: trimmed,
      supplier: { ...(defaultSupplier || {}) },
    };
    setName('');
    await saveProfiles([...profiles, profile]);
    announce({
      kind: 'done',
      label: isCz ? `Profil „${trimmed}“ uložen` : `Profile “${trimmed}” saved`,
    });
  }

  async function handleApply(profile: CompanyProfile) {
    onApplyProfile({ ...profile.supplier });
    await persistSettings({ defaultSupplier: profile.supplier }).catch(
      () => {},
    );
    announce({
      kind: 'info',
      label: isCz
        ? `Přepnuto na: ${profile.name}`
        : `Switched to: ${profile.name}`,
    });
  }

  async function handleDelete(id: string) {
    announce({
      kind: 'info',
      label: isCz ? 'Profil smazán' : 'Profile deleted',
    });
    await saveProfiles(profiles.filter((p) => p.id !== id));
  }

  const activeName =
    typeof defaultSupplier?.name === 'string' ? defaultSupplier.name : '';

  return (
    <div className='ap-card company-profiles'>
      <h3 className='ap-card__title'>
        <Contact size={ICON_MD} strokeWidth={STROKE} />
        {isCz ? 'Firemní profily' : 'Company profiles'}
      </h3>
      <p className='company-profiles__hint'>
        {isCz
          ? 'Ukládejte více firem (dodavatelů) a přepínejte mezi nimi. Aktivní profil se použije na nové faktury.'
          : 'Save multiple companies (suppliers) and switch between them. The active profile is used on new invoices.'}
      </p>

      <div className='company-profiles__create'>
        <input
          className='ap-input'
          placeholder={isCz ? 'Název nového profilu' : 'New profile name'}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className='ap-btn ap-btn--secondary'
          type='button'
          onClick={handleSaveCurrent}
          disabled={!name.trim()}
        >
          <Plus size={ICON_SM} strokeWidth={STROKE} />
          {isCz ? 'Uložit aktuální' : 'Save current'}
        </button>
      </div>

      <ul className='company-profiles__list'>
        {profiles.map((p) => {
          const isActive = !!activeName && p.name === activeName;
          return (
            <li key={p.id} className='company-profiles__item'>
              <span className='company-profiles__name'>
                {p.name}
                {typeof p.supplier?.ico === 'string' && p.supplier.ico
                  ? ` · IČO ${p.supplier.ico}`
                  : ''}
              </span>
              {isActive ? (
                <span className='company-profiles__active'>
                  <Check size={ICON_SM} strokeWidth={STROKE} />
                  {isCz ? 'Aktivní' : 'Active'}
                </span>
              ) : (
                <button
                  className='ap-btn ap-btn--ghost'
                  type='button'
                  onClick={() => handleApply(p)}
                >
                  {isCz ? 'Přepnout' : 'Use'}
                </button>
              )}
              <button
                className='ap-btn company-profiles__del'
                type='button'
                onClick={() => handleDelete(p.id)}
                aria-label={isCz ? 'Smazat' : 'Delete'}
              >
                <Trash2 size={ICON_SM} strokeWidth={STROKE} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
