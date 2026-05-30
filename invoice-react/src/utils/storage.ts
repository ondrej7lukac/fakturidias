// Server-based storage functions

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

export async function saveApiInvoice(invoice) {
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

export async function deleteApiInvoice(invoiceId) {
  const response = await fetch(`/api/invoices/${invoiceId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete invoice from API');
  return true;
}

// --- Local Storage (Guest Mode) ---

const LOCAL_STORAGE_KEY = 'invoices_guest';

export function loadLocalData() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return { invoices: data ? JSON.parse(data) : [] };
  } catch (e) {
    console.error('Failed to load local data', e);
    return { invoices: [] };
  }
}

export function saveLocalInvoice(invoice) {
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

export function deleteLocalInvoice(invoiceId) {
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
export async function saveInvoice(inv) {
  return saveApiInvoice(inv);
}
export async function deleteInvoice(id) {
  return deleteApiInvoice(id);
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

export function getNextInvoiceCounter(invoices) {
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

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

export function money(value) {
  return Number(value || 0).toFixed(2);
}

export function debounce(callback, wait = 400) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), wait);
  };
}
