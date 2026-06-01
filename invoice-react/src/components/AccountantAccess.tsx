import './AccountantAccess.css';
import { useEffect, useState } from 'react';
import { Users, UserCheck, Plus, Trash2, ICON_SM, ICON_MD, STROKE } from '@/lib/icons';
import {
  getGrantedAccountants,
  grantAccountantAccess,
  revokeAccountantAccess,
  getAccessibleAccounts,
  viewAsAccount,
  stopViewingAs,
  type AccessGrant,
  type AccessibleAccount,
} from '../utils/storage';

interface AccountantAccessProps {
  lang: string;
}

export default function AccountantAccess({ lang }: AccountantAccessProps) {
  const isCz = lang === 'cs';
  const [granted, setGranted] = useState<AccessGrant[]>([]);
  const [accessible, setAccessible] = useState<AccessibleAccount[]>([]);
  const [viewingAs, setViewingAs] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const [g, a] = await Promise.all([
        getGrantedAccountants(),
        getAccessibleAccounts(),
      ]);
      setGranted(g);
      setAccessible(a.accounts);
      setViewingAs(a.viewingAs);
    } catch {
      /* unauthenticated */
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleGrant() {
    setError('');
    try {
      await grantAccountantAccess(email.trim());
      setEmail('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function handleRevoke(e: string) {
    await revokeAccountantAccess(e).catch(() => {});
    await load();
  }

  async function handleView(ownerEmail: string) {
    try {
      await viewAsAccount(ownerEmail);
      window.location.reload();
    } catch {
      setError(isCz ? 'Přepnutí selhalo' : 'Switch failed');
    }
  }

  async function handleStop() {
    await stopViewingAs().catch(() => {});
    window.location.reload();
  }

  return (
    <div className="accountant-access">
      {viewingAs && (
        <div className="accountant-access__banner">
          <span>
            {isCz ? 'Prohlížíte účet: ' : 'Viewing account: '}
            <strong>{viewingAs}</strong> ({isCz ? 'jen pro čtení' : 'read-only'})
          </span>
          <button className="ap-btn ap-btn--secondary" onClick={handleStop}>
            {isCz ? 'Ukončit' : 'Stop'}
          </button>
        </div>
      )}

      <div className="ap-card">
        <h3 className="ap-card__title">
          <Users size={ICON_MD} strokeWidth={STROKE} />
          {isCz ? 'Sdílení s účetním' : 'Share with accountant'}
        </h3>
        <p className="accountant-access__hint">
          {isCz
            ? 'Udělte účetnímu přístup pro čtení k vašim fakturám a exportům.'
            : 'Give an accountant read-only access to your invoices and exports.'}
        </p>
        <div className="accountant-access__create">
          <input
            className="ap-input"
            type="email"
            placeholder={isCz ? 'E-mail účetního' : 'Accountant email'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            className="ap-btn ap-btn--secondary"
            onClick={handleGrant}
            disabled={!email.trim()}
          >
            <Plus size={ICON_SM} strokeWidth={STROKE} />
            {isCz ? 'Udělit přístup' : 'Grant access'}
          </button>
        </div>
        {error && <div className="accountant-access__error">{error}</div>}
        <ul className="accountant-access__list">
          {granted.map((g) => (
            <li key={g.email} className="accountant-access__item">
              <span>{g.email}</span>
              <button
                className="ap-btn accountant-access__del"
                onClick={() => handleRevoke(g.email)}
                aria-label={isCz ? 'Odebrat' : 'Revoke'}
              >
                <Trash2 size={ICON_SM} strokeWidth={STROKE} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {accessible.length > 0 && (
        <div className="ap-card">
          <h3 className="ap-card__title">
            <UserCheck size={ICON_MD} strokeWidth={STROKE} />
            {isCz ? 'Účty, ke kterým máte přístup' : 'Accounts you can access'}
          </h3>
          <ul className="accountant-access__list">
            {accessible.map((a) => (
              <li key={a.ownerEmail} className="accountant-access__item">
                <span>{a.ownerEmail}</span>
                {viewingAs === a.ownerEmail ? (
                  <span className="accountant-access__current">
                    {isCz ? 'Aktivní' : 'Active'}
                  </span>
                ) : (
                  <button
                    className="ap-btn ap-btn--ghost"
                    onClick={() => handleView(a.ownerEmail)}
                  >
                    {isCz ? 'Zobrazit' : 'View'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
