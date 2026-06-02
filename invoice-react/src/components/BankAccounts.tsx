import './BankAccounts.css';
import { useEffect, useState } from 'react';
import { Wallet, Plus, Trash2, ICON_SM, ICON_MD, STROKE } from '@/lib/icons';
import { useLiveActivity } from '@/contexts/activity';
import { parseIban } from '../utils/bank';

export interface BankAccount {
  id: string;
  label: string;
  iban: string;
  accountNumber?: string;
  bankCode?: string;
  prefix?: string;
}

interface BankAccountsProps {
  lang: string;
}

async function persistBankAccounts(accounts: BankAccount[]) {
  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings: { bankAccounts: accounts } }),
  });
}

export default function BankAccounts({ lang }: BankAccountsProps) {
  const isCz = lang === 'cs';
  const { announce } = useLiveActivity();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [label, setLabel] = useState('');
  const [iban, setIban] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = data?.settings?.bankAccounts;
        if (active && Array.isArray(list)) setAccounts(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function save(next: BankAccount[]) {
    setAccounts(next);
    await persistBankAccounts(next).catch(() => {});
  }

  async function handleAdd() {
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    const parsed = parseIban(cleanIban);
    if (!parsed) {
      setError(isCz ? 'Neplatný český IBAN' : 'Invalid Czech IBAN');
      announce({
        kind: 'error',
        label: isCz ? 'Neplatný IBAN' : 'Invalid IBAN',
      });
      return;
    }
    setError('');
    const account: BankAccount = {
      id: crypto.randomUUID(),
      label: label.trim() || cleanIban,
      iban: cleanIban,
      accountNumber: parsed.accountNumber,
      bankCode: parsed.bankCode,
      prefix: parsed.prefix,
    };
    setLabel('');
    setIban('');
    await save([...accounts, account]);
    announce({
      kind: 'done',
      label: isCz ? 'Bankovní účet přidán' : 'Bank account added',
    });
  }

  async function handleDelete(id: string) {
    announce({
      kind: 'info',
      label: isCz ? 'Bankovní účet odstraňěn' : 'Bank account removed',
    });
    await save(accounts.filter((a) => a.id !== id));
  }

  return (
    <div className='ap-card bank-accounts'>
      <h3 className='ap-card__title'>
        <Wallet size={ICON_MD} strokeWidth={STROKE} />
        {isCz ? 'Bankovní účty' : 'Bank accounts'}
      </h3>
      <p className='bank-accounts__hint'>
        {isCz
          ? 'Uložte více účtů a vyberte ten správný při tvorbě faktury.'
          : 'Save multiple accounts and pick the right one when creating an invoice.'}
      </p>

      <div className='bank-accounts__create'>
        <input
          className='ap-input'
          placeholder={
            isCz ? 'Název (např. CZK účet)' : 'Label (e.g. CZK account)'
          }
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          className='ap-input bank-accounts__iban'
          placeholder='CZ.. IBAN'
          value={iban}
          onChange={(e) => setIban(e.target.value)}
        />
        <button
          className='ap-btn ap-btn--secondary'
          type='button'
          onClick={handleAdd}
          disabled={!iban.trim()}
        >
          <Plus size={ICON_SM} strokeWidth={STROKE} />
          {isCz ? 'Přidat' : 'Add'}
        </button>
      </div>

      {error && <div className='bank-accounts__error'>{error}</div>}

      <ul className='bank-accounts__list'>
        {accounts.map((a) => (
          <li key={a.id} className='bank-accounts__item'>
            <span className='bank-accounts__label'>{a.label}</span>
            <span className='bank-accounts__iban-text'>{a.iban}</span>
            <button
              className='ap-btn bank-accounts__del'
              type='button'
              onClick={() => handleDelete(a.id)}
              aria-label={isCz ? 'Smazat' : 'Delete'}
            >
              <Trash2 size={ICON_SM} strokeWidth={STROKE} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
