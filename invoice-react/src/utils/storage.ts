// Server-based storage functions

// Invoices carry many optional, view-specific fields across the app (the form
// uses a flat shape, the dashboard a nested one). Storage only needs the
// identity/date fields it reads here; the index signature keeps both shapes
// assignable without forcing a single canonical model.
export interface StoredInvoice {
  id: string;
  invoiceNumber?: string;
  issueDate?: string;
  [key: string]: unknown;
}

// --- API Storage (Authenticated) ---

export async function loadApiData() {
  try {
    const response = await fetch('/api/invoices');
    if (!response.ok) {
      if (response.status === 401) return null; // Signal not authenticated
      throw new Error('Failed to load invoices');
    }
    const data = await response.json();
    return { invoices: data.invoices || [] };
  } catch (error) {
    console.error('Failed to load API data:', error);
    return null;
  }
}

export async function saveApiInvoice(invoice: StoredInvoice) {
  const response = await fetch('/api/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoice }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 403 && data.limitReached) {
      const err: any = new Error(data.error || 'Invoice limit reached');
      err.limitReached = true;
      err.limit = data.limit;
      throw err;
    }
    throw new Error('Failed to save invoice to API');
  }
  const data = await response.json();
  return data.invoice;
}

export async function deleteApiInvoice(invoiceId: string) {
  const response = await fetch(`/api/invoices/${invoiceId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete invoice from API');
  return true;
}

// --- Local Storage (Guest Mode) ---

const LOCAL_STORAGE_KEY = 'invoices_guest';

export function loadLocalData(): { invoices: StoredInvoice[] } {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return { invoices: data ? (JSON.parse(data) as StoredInvoice[]) : [] };
  } catch (e) {
    console.error('Failed to load local data', e);
    return { invoices: [] };
  }
}

export function saveLocalInvoice(invoice: StoredInvoice) {
  // Guest Validations are handled in App.jsx (e.g. max count)
  const { invoices } = loadLocalData();
  const existingIndex = invoices.findIndex((inv) => inv.id === invoice.id);

  if (existingIndex >= 0) {
    invoices[existingIndex] = invoice;
  } else {
    invoices.unshift(invoice);
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(invoices));
  return invoice;
}

export function deleteLocalInvoice(invoiceId: string) {
  const { invoices } = loadLocalData();
  const newInvoices = invoices.filter((inv) => inv.id !== invoiceId);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newInvoices));
  return true;
}

export type AccountantExportLang = 'cs' | 'en';
export type AccountantPaymentFilter = 'all' | 'paid' | 'unpaid';
export type AccountantExportVariant =
  | 'detail'
  | 'monthly'
  | 'vat'
  | 'smallBusiness';
export type AccountantDateBasis = 'issueDate' | 'taxableSupplyDate';
export type AccountantDocumentScope = 'issued' | 'all';
export type AccountantTerritoryFilter = 'all' | 'domestic' | 'eu' | 'foreign';

export interface AccountantExportOptions {
  paymentFilter: AccountantPaymentFilter;
  variant: AccountantExportVariant;
  languages: AccountantExportLang[];
  dateBasis: AccountantDateBasis;
  documentScope: AccountantDocumentScope;
  territoryFilter: AccountantTerritoryFilter;
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getZipFileName(
  year: number,
  options: AccountantExportOptions,
): string {
  const languageSuffix =
    options.languages.length > 0 ? options.languages.join('-') : 'none';
  return `fakturidias-accountant-export-${year}-${options.variant}-${options.paymentFilter}-${options.territoryFilter}-${options.dateBasis}-${options.documentScope}-${languageSuffix}.zip`;
}

export async function downloadAnnualAccountantExportZipFromApi(
  year: number,
  options: AccountantExportOptions,
): Promise<void> {
  const query = new URLSearchParams({
    year: String(year),
    variant: options.variant,
    paymentFilter: options.paymentFilter,
    territoryFilter: options.territoryFilter,
    dateBasis: options.dateBasis,
    documentScope: options.documentScope,
    languages: options.languages.join(','),
  });
  const response = await fetch(`/api/export/accountant?${query.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to export accountant ZIP');
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
  const filename = filenameMatch?.[1] || getZipFileName(year, options);

  downloadBlob(filename, blob);
}

// --- Mailbox / inbound received invoices ---

export interface MailboxInfo {
  address: string;
  slug: string;
  createdAt?: string;
}

export interface MailboxInboundStatus {
  ready: boolean;
  missing: string[];
}

export interface ReceivedAttachment {
  index: number;
  filename: string;
  contentType: string;
  size: number;
}

export type ReceivedStatus = 'pending' | 'approved' | 'rejected';

export interface ReceivedInvoice {
  id: string;
  status: ReceivedStatus;
  receivedAt: string;
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  textPreview: string;
  parsed: any | null;
  parseStatus: 'none' | 'pending' | 'done' | 'failed';
  parseError?: string | null;
  approvedInvoiceId?: string | null;
  attachments: ReceivedAttachment[];
}

export async function getMailbox(): Promise<{
  mailbox: MailboxInfo | null;
  domain: string;
  inbound: MailboxInboundStatus;
}> {
  const res = await fetch('/api/mailbox');
  if (!res.ok) throw new Error('Failed to load mailbox');
  return res.json();
}

export async function claimMailbox(
  slug: string,
): Promise<{
  mailbox: MailboxInfo;
  domain: string;
  inbound: MailboxInboundStatus;
}> {
  const res = await fetch('/api/mailbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to set mailbox');
  return data;
}

export async function getReceivedInvoices(): Promise<ReceivedInvoice[]> {
  const res = await fetch('/api/mailbox/received');
  if (!res.ok) throw new Error('Failed to load received invoices');
  const data = await res.json();
  return data.received || [];
}

export async function approveReceivedInvoice(
  id: string,
  parsed: any,
): Promise<ReceivedInvoice> {
  const res = await fetch('/api/mailbox/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, parsed }),
  });
  if (!res.ok) throw new Error('Failed to approve');
  return (await res.json()).received;
}

export async function rejectReceivedInvoice(
  id: string,
): Promise<ReceivedInvoice> {
  const res = await fetch('/api/mailbox/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error('Failed to reject');
  return (await res.json()).received;
}

export async function deleteReceivedInvoice(id: string): Promise<void> {
  const res = await fetch(`/api/mailbox/received/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete');
}

export function attachmentUrl(id: string, index = 0): string {
  return `/api/mailbox/attachment/${id}?index=${index}`;
}

// Legacy export compatibility (defaults to API but warns, or we can remove if we refactor App.jsx completely)
export async function loadData() {
  return loadApiData();
}
export async function saveInvoice(inv: StoredInvoice) {
  return saveApiInvoice(inv);
}
export async function deleteInvoice(id: string) {
  return deleteApiInvoice(id);
}

export type DocumentType = 'invoice' | 'proforma' | 'advance' | 'creditNote';

// ASCII prefixes keep each document series visually distinct while leaving the
// numeric variable symbol (derived via .replace(/\D/g, '')) intact.
export const DOC_TYPE_PREFIX: Record<DocumentType, string> = {
  invoice: '',
  proforma: 'PF',
  advance: 'DD',
  creditNote: 'OD',
};

const DOC_TYPE_PREFIX_RE = /^(PF|DD|OD)-/;

export function stripDocumentTypePrefix(invoiceNumber: string): string {
  return (invoiceNumber || '').replace(DOC_TYPE_PREFIX_RE, '');
}

export function applyDocumentTypeToNumber(
  baseNumber: string,
  documentType: DocumentType,
): string {
  const prefix = DOC_TYPE_PREFIX[documentType] || '';
  const base = stripDocumentTypePrefix(baseNumber);
  return prefix ? `${prefix}-${base}` : base;
}

// Maps a document type to the i18n key used for the document heading.
// Regular invoices fall back to the existing `invoice` title key.
export function documentTypeTitleKey(documentType?: string): string {
  switch (documentType) {
    case 'proforma':
      return 'docTypeProforma';
    case 'advance':
      return 'docTypeAdvance';
    case 'creditNote':
      return 'docTypeCreditNote';
    default:
      return 'invoice';
  }
}

// ── Recurring invoice templates (API client) ────────────────────────────────

export type RecurringCadence =
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export interface RecurringTemplate {
  id: string;
  name: string;
  active: boolean;
  cadence: RecurringCadence;
  intervalCount: number;
  dueDays: number;
  autoSend: boolean;
  nextRunAt: string;
  lastRunAt?: string | null;
  endDate?: string | null;
  occurrencesLeft?: number | null;
  template: Record<string, unknown>;
}

export async function getRecurringTemplates(): Promise<RecurringTemplate[]> {
  const res = await fetch('/api/recurring');
  if (!res.ok) throw new Error('Failed to load recurring templates');
  const data = await res.json();
  return data.templates || [];
}

export async function saveRecurringTemplate(
  template: Partial<RecurringTemplate>,
): Promise<RecurringTemplate> {
  const res = await fetch('/api/recurring', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: Error & { upgradeRequired?: boolean } = new Error(
      data.error || 'Failed to save recurring template',
    );
    err.upgradeRequired = data.upgradeRequired === true;
    throw err;
  }
  return data.template;
}

export async function deleteRecurringTemplate(id: string): Promise<boolean> {
  const res = await fetch(`/api/recurring/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete recurring template');
  return true;
}

// ── Online payments (Stripe Checkout per invoice) ───────────────────────────

export async function createPaymentLink(invoiceId: string): Promise<string> {
  const res = await fetch(`/api/pay-link/${invoiceId}`, { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to create payment link');
  return data.url;
}

// ── Pohoda accounting export (batch XML) ────────────────────────────────────

export async function downloadPohodaExportFromApi(
  year: number,
  dateBasis: AccountantDateBasis,
): Promise<void> {
  const query = new URLSearchParams({ year: String(year), dateBasis });
  const response = await fetch(`/api/export/pohoda?${query.toString()}`);
  if (!response.ok) throw new Error('Failed to export Pohoda XML');
  downloadBlob(`pohoda-${year}.xml`, await response.blob());
}

export async function downloadMoneyS3ExportFromApi(
  year: number,
  dateBasis: AccountantDateBasis,
): Promise<void> {
  const query = new URLSearchParams({ year: String(year), dateBasis });
  const response = await fetch(`/api/export/money-s3?${query.toString()}`);
  if (!response.ok) throw new Error('Failed to export Money S3 XML');
  downloadBlob(`money-s3-${year}.xml`, await response.blob());
}

// ── Kontrolní hlášení (CZ VAT control statement) ─────────────────────────────

export async function downloadControlStatementFromApi(
  year: number,
  month: number,
): Promise<void> {
  const query = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  const response = await fetch(`/api/export/control-statement?${query}`);
  if (!response.ok) throw new Error('Failed to export control statement');
  const filename = `kontrolni-hlaseni-${year}-${String(month).padStart(2, '0')}.xml`;
  downloadBlob(filename, await response.blob());
}

// ── Developer: API keys & outgoing webhooks ─────────────────────────────────

export interface ApiKeyInfo {
  id: string;
  name: string;
  prefix: string;
  revoked: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface WebhookEndpointInfo {
  id: string;
  url: string;
  events: string[];
  active: boolean;
}

export async function getApiKeys(): Promise<ApiKeyInfo[]> {
  const res = await fetch('/api/dev/keys');
  if (!res.ok) throw new Error('Failed to load API keys');
  return (await res.json()).keys || [];
}

export async function createApiKey(
  name: string,
): Promise<{ key: ApiKeyInfo; secret: string }> {
  const res = await fetch('/api/dev/keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create API key');
  return res.json();
}

export async function revokeApiKey(id: string): Promise<void> {
  const res = await fetch(`/api/dev/keys/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to revoke API key');
}

export async function getWebhookEndpoints(): Promise<WebhookEndpointInfo[]> {
  const res = await fetch('/api/dev/webhooks');
  if (!res.ok) throw new Error('Failed to load webhooks');
  return (await res.json()).webhooks || [];
}

export async function createWebhookEndpoint(
  url: string,
  events: string[],
): Promise<{ webhook: WebhookEndpointInfo; secret: string }> {
  const res = await fetch('/api/dev/webhooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, events }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to create webhook');
  return data;
}

export async function deleteWebhookEndpoint(id: string): Promise<void> {
  const res = await fetch(`/api/dev/webhooks/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete webhook');
}

// ── Accountant access / sharing ─────────────────────────────────────────────

export interface AccessGrant {
  email: string;
  role: string;
}

export interface AccessibleAccount {
  ownerEmail: string;
  role: string;
}

export async function getGrantedAccountants(): Promise<AccessGrant[]> {
  const res = await fetch('/api/access/granted');
  if (!res.ok) throw new Error('Failed to load access grants');
  return (await res.json()).grants || [];
}

export async function grantAccountantAccess(email: string): Promise<void> {
  const res = await fetch('/api/access/grant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to grant access');
}

export async function revokeAccountantAccess(email: string): Promise<void> {
  const res = await fetch(`/api/access/grant/${encodeURIComponent(email)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to revoke access');
}

export async function getAccessibleAccounts(): Promise<{
  accounts: AccessibleAccount[];
  viewingAs: string | null;
}> {
  const res = await fetch('/api/access/accessible');
  if (!res.ok) throw new Error('Failed to load accessible accounts');
  return res.json();
}

export async function viewAsAccount(ownerEmail: string): Promise<void> {
  const res = await fetch('/api/access/view', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerEmail }),
  });
  if (!res.ok) throw new Error('Failed to switch account');
}

export async function stopViewingAs(): Promise<void> {
  await fetch('/api/access/view/stop', { method: 'POST' });
}

// ── Public invoice share links ──────────────────────────────────────────────

export async function createShareLink(
  invoiceId: string,
): Promise<{ url: string; viewCount: number; viewedAt: string | null }> {
  const res = await fetch(`/api/share-link/${invoiceId}`, { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to create share link');
  return data;
}

export async function getPublicInvoice(
  token: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`/api/public/invoice/${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error('Invoice not found');
  return (await res.json()).invoice;
}

// ── ISDOC export (Czech e-invoice XML) ──────────────────────────────────────

export async function downloadInvoiceIsdoc(
  invoice: { invoiceNumber?: string } & Record<string, unknown>,
): Promise<void> {
  const res = await fetch('/api/export/isdoc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoice }),
  });
  if (!res.ok) throw new Error('Failed to generate ISDOC');
  const blob = await res.blob();
  downloadBlob(`${invoice.invoiceNumber || 'invoice'}.isdoc`, blob);
}

export interface InvoiceNumberFormat {
  prefix?: string;
  separator?: string;
  includeYear?: boolean;
  padding?: number;
}

export function formatInvoiceNumber(
  counter: number,
  format?: InvoiceNumberFormat | null,
): string {
  const year = new Date().getFullYear();
  const prefix = format?.prefix ?? '';
  const sep = format?.separator ?? '';
  const includeYear = format?.includeYear ?? true;
  const padding = format?.padding ?? 3;

  const seq = String(counter).padStart(padding, '0');
  const parts: string[] = [];
  if (prefix) parts.push(prefix);
  if (includeYear) parts.push(String(year));
  parts.push(seq);
  return parts.join(sep);
}

export function previewInvoiceNumber(
  format?: InvoiceNumberFormat | null,
): string {
  return formatInvoiceNumber(1, format);
}

export function getNextInvoiceCounter(invoices: StoredInvoice[]) {
  const year = new Date().getFullYear();
  const yearStr = String(year);

  // Only consider invoices issued this year
  const thisYearInvoices = invoices.filter(
    (inv) => inv.issueDate && String(inv.issueDate).startsWith(yearStr),
  );

  if (thisYearInvoices.length === 0) return 1;

  // Extract trailing numeric run from each invoice number (the sequence counter)
  const counters = thisYearInvoices
    .map((inv) => {
      const match = String(inv.invoiceNumber || '').match(/(\d+)$/);
      if (!match) return NaN;
      return parseInt(match[1], 10);
    })
    .filter((n) => !isNaN(n));

  if (counters.length === 0) return 1;

  return Math.max(...counters) + 1;
}

export function addDays(date: Date | string | number, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatDate(date: Date | string | number | null | undefined) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

export function money(value: number | string | null | undefined) {
  return Number(value || 0).toFixed(2);
}

export function debounce<Args extends unknown[]>(
  callback: (...args: Args) => void,
  wait = 400,
) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), wait);
  };
}
