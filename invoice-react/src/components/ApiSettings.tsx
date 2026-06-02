import './ApiSettings.css';
import { useEffect, useState } from 'react';
import {
  Key,
  Webhook,
  Plus,
  Trash2,
  Copy,
  ICON_SM,
  ICON_MD,
  STROKE,
} from '@/lib/icons';
import { useLiveActivity } from '@/contexts/activity';
import {
  getApiKeys,
  createApiKey,
  revokeApiKey,
  getWebhookEndpoints,
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  type ApiKeyInfo,
  type WebhookEndpointInfo,
} from '../utils/storage';

const WEBHOOK_EVENTS = ['invoice.created', 'invoice.updated', 'invoice.paid'];

interface ApiSettingsProps {
  lang: string;
}

export default function ApiSettings({ lang }: ApiSettingsProps) {
  const isCz = lang === 'cs';
  const { announce } = useLiveActivity();
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpointInfo[]>([]);
  const [newSecret, setNewSecret] = useState('');
  const [keyName, setKeyName] = useState('');
  const [hookUrl, setHookUrl] = useState('');
  const [hookEvents, setHookEvents] = useState<string[]>(['invoice.paid']);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [k, w] = await Promise.all([getApiKeys(), getWebhookEndpoints()]);
      setKeys(k);
      setWebhooks(w);
    } catch {
      /* unauthenticated or offline */
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreateKey() {
    try {
      announce({
        kind: 'processing',
        label: isCz ? 'Vytvářím klíč…' : 'Creating key…',
      });
      const { secret } = await createApiKey(keyName || 'API key');
      setNewSecret(secret);
      setKeyName('');
      await load();
      announce({
        kind: 'done',
        label: isCz ? 'API klíč vytvořen' : 'API key created',
      });
    } catch {
      setError(isCz ? 'Nepodařilo se vytvořit klíč' : 'Failed to create key');
      announce({
        kind: 'error',
        label: isCz ? 'Chyba při tvorbě klíče' : 'Failed to create key',
      });
    }
  }

  async function handleRevokeKey(id: string) {
    announce({
      kind: 'info',
      label: isCz ? 'API klíč zrušen' : 'API key revoked',
    });
    await revokeApiKey(id).catch(() => {});
    await load();
  }

  function toggleEvent(ev: string) {
    setHookEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev],
    );
  }

  async function handleCreateWebhook() {
    setError('');
    try {
      announce({
        kind: 'processing',
        label: isCz ? 'Přidávám webhook…' : 'Adding webhook…',
      });
      await createWebhookEndpoint(hookUrl.trim(), hookEvents);
      setHookUrl('');
      await load();
      announce({
        kind: 'done',
        label: isCz ? 'Webhook přidán' : 'Webhook added',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      announce({
        kind: 'error',
        label: isCz ? 'Chyba webhooku' : 'Webhook failed',
      });
    }
  }

  async function handleDeleteWebhook(id: string) {
    announce({
      kind: 'info',
      label: isCz ? 'Webhook smazán' : 'Webhook deleted',
    });
    await deleteWebhookEndpoint(id).catch(() => {});
    await load();
  }

  return (
    <div className='api-settings'>
      <div className='ap-card'>
        <h3 className='ap-card__title'>
          <Key size={ICON_MD} strokeWidth={STROKE} />
          {isCz ? 'API klíče' : 'API keys'}
        </h3>
        <p className='api-settings__hint'>
          {isCz
            ? 'Klíč použijte v hlavičce Authorization: Bearer <klíč> pro přístup k /api/v1.'
            : 'Use a key as Authorization: Bearer <key> to access /api/v1.'}
        </p>

        {newSecret && (
          <div className='api-settings__secret'>
            <span>
              {isCz
                ? 'Zkopírujte klíč nyní – už se znovu nezobrazí:'
                : 'Copy this key now — it will not be shown again:'}
            </span>
            <code>{newSecret}</code>
            <button
              className='btn'
              onClick={() => {
                navigator.clipboard?.writeText(newSecret).catch(() => {});
                announce({
                  kind: 'info',
                  label: isCz ? 'Klíč zkopírován' : 'Key copied',
                });
                setNewSecret('');
              }}
            >
              <Copy size={ICON_SM} strokeWidth={STROKE} />
              {isCz ? 'Kopírovat a zavřít' : 'Copy & dismiss'}
            </button>
          </div>
        )}

        <div className='api-settings__create'>
          <input
            className='ap-input'
            placeholder={isCz ? 'Název klíče' : 'Key name'}
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
          />
          <button className='btn btn--primary' onClick={handleCreateKey}>
            <Plus size={ICON_SM} strokeWidth={STROKE} />
            {isCz ? 'Vytvořit klíč' : 'Create key'}
          </button>
        </div>

        <ul className='api-settings__list'>
          {keys
            .filter((k) => !k.revoked)
            .map((k) => (
              <li key={k.id} className='api-settings__item'>
                <span className='api-settings__mono'>{k.prefix}…</span>
                <span className='api-settings__name'>{k.name}</span>
                <button
                  className='btn api-settings__del'
                  onClick={() => handleRevokeKey(k.id)}
                  aria-label={isCz ? 'Zneplatnit' : 'Revoke'}
                >
                  <Trash2 size={ICON_SM} strokeWidth={STROKE} />
                </button>
              </li>
            ))}
        </ul>
      </div>

      <div className='ap-card'>
        <h3 className='ap-card__title'>
          <Webhook size={ICON_MD} strokeWidth={STROKE} />
          {isCz ? 'Webhooky' : 'Webhooks'}
        </h3>
        <p className='api-settings__hint'>
          {isCz
            ? 'HTTPS URL, na kterou pošleme událost (podpis v hlavičce X-Fakturidias-Signature).'
            : 'An HTTPS URL we POST events to (signed via the X-Fakturidias-Signature header).'}
        </p>

        <div className='api-settings__create api-settings__create--col'>
          <input
            className='ap-input'
            placeholder='https://example.com/webhook'
            value={hookUrl}
            onChange={(e) => setHookUrl(e.target.value)}
          />
          <div className='api-settings__events'>
            {WEBHOOK_EVENTS.map((ev) => (
              <label key={ev} className='api-settings__event'>
                <input
                  type='checkbox'
                  checked={hookEvents.includes(ev)}
                  onChange={() => toggleEvent(ev)}
                />
                {ev}
              </label>
            ))}
          </div>
          <button
            className='btn btn--primary'
            onClick={handleCreateWebhook}
            disabled={!hookUrl.trim() || hookEvents.length === 0}
          >
            <Plus size={ICON_SM} strokeWidth={STROKE} />
            {isCz ? 'Přidat webhook' : 'Add webhook'}
          </button>
        </div>

        {error && <div className='api-settings__error'>{error}</div>}

        <ul className='api-settings__list'>
          {webhooks.map((w) => (
            <li key={w.id} className='api-settings__item'>
              <span className='api-settings__mono api-settings__url'>
                {w.url}
              </span>
              <span className='api-settings__name'>{w.events.join(', ')}</span>
              <button
                className='btn api-settings__del'
                onClick={() => handleDeleteWebhook(w.id)}
                aria-label={isCz ? 'Smazat' : 'Delete'}
              >
                <Trash2 size={ICON_SM} strokeWidth={STROKE} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
