import './InvoiceForm.css';
import { useState, useEffect, useRef } from 'react';
import type {
  Dispatch,
  SetStateAction,
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
  FormEvent,
} from 'react';
import { useLiveActivity } from '@/contexts/activity';
import {
  formatInvoiceNumber,
  addDays,
  formatDate,
  money,
  applyDocumentTypeToNumber,
  createPaymentLink,
  createShareLink,
  downloadInvoiceIsdoc,
  type DocumentType,
} from '../utils/storage';
import { searchAres, parseAresItem, lookupAresByIco } from '../utils/ares';
import { searchRpo } from '../utils/rpo';
import type { BankAccount } from './BankAccounts';
import type { Invoice, InvoiceLineItem, Supplier } from '../types/invoice';
import {
  BarChart2,
  Pencil,
  Eye,
  AlertTriangle,
  Cloud,
  FileText,
  RefreshCw,
  ArrowLeftRight,
  Check,
  Mail,
  Contact,
  Wallet,
  Search,
  X,
  Send,
  Save,
  CreditCard,
  ICON_MD,
  ICON_SM,
  STROKE,
} from '@/lib/icons';

import ItemsTable from './ItemsTable';
import InvoicePreview from './InvoicePreview';
import AIPrompt from './AIPrompt';
import {
  BANK_CODES,
  calculateIban,
  parseIban,
  getCzechQrPayload,
} from '../utils/bank';
import { QRCodeCanvas } from 'qrcode.react';
import QRCode from 'qrcode';

async function loadPdfUtils() {
  return import('../utils/pdf');
}

function randomUUID(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface InvoiceFormProps {
  invoice?: Invoice | null;
  categories: string[];
  onSave: (invoice: Invoice, options?: { autoSave?: boolean }) => void;
  onAddCategory: (cat: string) => void;
  invoiceCounter: number;
  invoicesLoaded: boolean;
  draftNumber: string;
  setDraftNumber: (n: string) => void;
  lang: string;
  t: Record<string, string>;
  defaultSupplier?: Supplier | null;
  setDefaultSupplier: Dispatch<SetStateAction<Supplier | null>>;
  isAuthenticated: boolean;
  onShowInvoiceForm?: () => void;
  onOpenDashboard?: () => void;
}

// Autocomplete suggestion rows merge saved customers and ARES/RPO lookups, so
// every field is optional plus a `source` tag identifying its origin.
interface CustomerSuggestion {
  name?: string;
  email?: string;
  emailCopy?: string;
  phone?: string;
  area?: string;
  city?: string;
  ico?: string;
  vat?: string;
  address?: string;
  country?: string;
  source?: string;
  [key: string]: unknown;
}

interface ItemSuggestion {
  name?: string;
  price?: number | string;
  unit?: string;
  taxRate?: number | string;
  [key: string]: unknown;
}

export default function InvoiceForm({
  invoice,
  categories,
  onSave,
  onAddCategory,
  invoiceCounter,
  invoicesLoaded,
  draftNumber,
  setDraftNumber,
  lang,
  t,
  defaultSupplier,
  setDefaultSupplier,
  isAuthenticated,
  onShowInvoiceForm,
  onOpenDashboard,
}: InvoiceFormProps) {
  const { announce } = useLiveActivity();
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    documentType: 'invoice',
    issueDate: formatDate(new Date()),
    dueDate: formatDate(addDays(new Date(), 7)),
    taxableSupplyDate: '',
    status: 'draft',
    category: '',
    clientName: '',
    clientEmail: '',
    clientEmailCopy: '',
    clientPhone: '',
    clientArea: 'Prague',
    clientIco: '',
    clientVat: '',
    clientAddress: '',
    currency: 'CZK',
    amount: '0.00',
    iban: '',
    bic: '',
    paymentNote: '',
    accountNumber: '',
    bankCode: '',
    prefix: '',
    variableSymbol: '',
    supplierName: '',
    supplierIco: '',
    supplierVat: '',
    supplierAddress: '',
    supplierRegistry: '',
    supplierPhone: '',
    supplierEmail: '',
    supplierWebsite: '',
    isVatPayer: false,
    taxStatus: 'non-payer', // supplier's status
    clientCountry: 'CZ', // CZ or SK
    exchangeRate: '1.00',
    reverseChargeText: '',
    taxBase: '0.00',
    taxRate: '21',
    taxAmount: '0.00',
  });

  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  const stateRef = useRef({ formData, items });
  const itemSuggestionsRef = useRef<HTMLDivElement | null>(null);
  // Stable ID for this new-invoice session — generated once, reused across all auto-saves
  const newInvoiceIdRef = useRef<string | null>(null);

  useEffect(() => {
    stateRef.current = { formData, items };
  }, [formData, items]);

  // Close item suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Node;
      if (
        itemSuggestionsRef.current &&
        !itemSuggestionsRef.current.contains(target)
      ) {
        setItemSuggestions([]);
      }
      if (
        supplierSuggestionsRef.current &&
        !supplierSuggestionsRef.current.contains(target)
      ) {
        setSupplierSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [itemInput, setItemInput] = useState({
    name: '',
    qty: 1,
    price: '',
    taxRate: formData.isVatPayer ? '21' : '0',
    discount: 0,
    total: '',
  });
  const [categoryInput, setCategoryInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');
  const [payStatus, setPayStatus] = useState('');
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [viesStatus, setViesStatus] = useState<
    'loading' | 'valid' | 'invalid' | null
  >(null);
  const [savedItems, setSavedItems] = useState<ItemSuggestion[]>([]);
  const [savedCustomers, setSavedCustomers] = useState<CustomerSuggestion[]>([]);
  const [itemSuggestions, setItemSuggestions] = useState<ItemSuggestion[]>([]);
  const [customerSuggestions, setCustomerSuggestions] = useState<
    CustomerSuggestion[]
  >([]);
  const [customerActiveIndex, setCustomerActiveIndex] = useState(-1);
  const [supplierSuggestions, setSupplierSuggestions] = useState<
    CustomerSuggestion[]
  >([]);
  const [saveTimer, setSaveTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [aresAutoFilled, setAresAutoFilled] = useState(false);
  const [supplierAresAutoFilled, setSupplierAresAutoFilled] = useState(false);
  const supplierSuggestionsRef = useRef<HTMLDivElement | null>(null);
  const supplierAresDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // ─── Effect 1: Load invoice data when selected invoice changes ────────────
  // ONLY this effect may call setItems — prevents items being wiped by unrelated state changes
  useEffect(() => {
    // Cancel any pending auto-save from the PREVIOUS invoice before switching
    // Prevents stale timer from firing with wrong invoice ID / form data mix
    setSaveTimer((prev) => {
      if (prev) clearTimeout(prev);
      return null;
    });

    if (invoice) {
      // Opening an existing invoice for editing
      newInvoiceIdRef.current = null;
      const ibanData = parseIban(invoice.payment?.iban || '');
      setFormData((prev) => ({
        ...prev,
        invoiceNumber: invoice.invoiceNumber || '',
        documentType: invoice.documentType || 'invoice',
        issueDate: invoice.issueDate || '',
        dueDate: invoice.dueDate || '',
        taxableSupplyDate: invoice.taxableSupplyDate || '',
        status: invoice.status || 'draft',
        category: invoice.category || '',
        clientName: invoice.client?.name || '',
        clientEmail: invoice.client?.email || '',
        clientEmailCopy: invoice.client?.emailCopy || '',
        clientPhone: invoice.client?.phone || '',
        clientArea: invoice.client?.area || '',
        clientIco: invoice.client?.ico || '',
        clientVat: invoice.client?.vat || '',
        clientAddress: invoice.client?.address || '',
        clientCountry: invoice.client?.country || 'CZ',
        currency: invoice.currency || 'CZK',
        amount: money(invoice.amount),
        iban: invoice.payment?.iban || '',
        bic: invoice.payment?.bic || '',
        paymentNote: invoice.payment?.note || '',
        accountNumber: ibanData?.accountNumber || '',
        bankCode: ibanData?.bankCode || '',
        prefix: ibanData?.prefix || '',
        variableSymbol:
          invoice.payment?.variableSymbol ||
          (invoice.invoiceNumber || '').replace(/\D/g, ''),
        supplierName: invoice.supplier?.name || '',
        supplierIco: invoice.supplier?.ico || '',
        supplierVat: invoice.supplier?.vat || '',
        supplierAddress: invoice.supplier?.address || '',
        supplierRegistry: invoice.supplier?.registry || '',
        supplierPhone: invoice.supplier?.phone || '',
        supplierEmail: invoice.supplier?.email || '',
        supplierWebsite: invoice.supplier?.website || '',
        isVatPayer: invoice.isVatPayer || false,
        taxBase: String(invoice.taxBase || '0.00'),
        taxRate: String(invoice.taxRate || '21'),
        taxAmount: String(invoice.taxAmount || '0.00'),
      }));
      setItems(invoice.items || []);
    } else {
      // Switching to new invoice mode — reset everything
      if (!newInvoiceIdRef.current) {
        newInvoiceIdRef.current = randomUUID();
      }
      const today = new Date();
      setFormData((prev) => ({
        ...prev,
        // Keep only layout/supplier defaults, reset client/invoice-specific fields
        invoiceNumber: prev.invoiceNumber || '...',
        documentType: 'invoice',
        issueDate: formatDate(today),
        dueDate: formatDate(addDays(today, 7)),
        taxableSupplyDate: '',
        status: 'draft',
        category: '',
        clientName: '',
        clientEmail: '',
        clientEmailCopy: '',
        clientPhone: '',
        clientArea: '',
        clientIco: '',
        clientVat: '',
        clientAddress: '',
        currency: 'CZK',
        amount: '0.00',
        // Keep supplier/bank from previous state (filled in Effect 3)
        iban: prev.iban,
        bic: prev.bic,
        paymentNote: '',
        accountNumber: prev.accountNumber,
        bankCode: prev.bankCode,
        prefix: prev.prefix,
        variableSymbol: (prev.invoiceNumber || '').replace(/\D/g, ''),
        supplierName: prev.supplierName,
        supplierIco: prev.supplierIco,
        supplierVat: prev.supplierVat,
        supplierAddress: prev.supplierAddress,
        supplierRegistry: prev.supplierRegistry,
        supplierPhone: prev.supplierPhone,
        supplierEmail: prev.supplierEmail,
        supplierWebsite: prev.supplierWebsite,
        isVatPayer: prev.isVatPayer,
        taxBase: '0.00',
        taxRate: prev.taxRate,
        taxAmount: '0.00',
      }));
      setItems([]); // ← ONLY cleared here, when truly starting a new invoice
    }
  }, [invoice]); // ← ONLY invoice as dependency

  // ─── Effect 2: Generate invoice number once invoices are loaded ────────────
  useEffect(() => {
    if (invoice) return; // Editing existing — never change its number
    if (!invoicesLoaded) {
      setFormData((prev) => ({ ...prev, invoiceNumber: '...' }));
      return;
    }
    // Generate number from real counter (draftNumber persists across renders)
    if (!draftNumber) {
      const newNumber = formatInvoiceNumber(
        invoiceCounter,
        defaultSupplier?.invoiceNumberFormat,
      );
      setDraftNumber(newNumber);
      setFormData((prev) => ({
        ...prev,
        invoiceNumber: newNumber,
        variableSymbol: newNumber.replace(/\D/g, ''),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        invoiceNumber: draftNumber,
        variableSymbol: draftNumber.replace(/\D/g, ''),
      }));
    }
  }, [invoice, invoiceCounter, invoicesLoaded, draftNumber, setDraftNumber]);

  // ─── Effect 3: Pre-fill supplier/bank for new invoices when profile loads ──
  useEffect(() => {
    if (invoice) return; // Don't override data of an existing invoice being edited
    if (!defaultSupplier) return;
    let bankFields = { accountNumber: '', bankCode: '', prefix: '' };
    if (defaultSupplier.iban) {
      const parsed = parseIban(defaultSupplier.iban);
      if (parsed) bankFields = parsed;
    }
    // Only fill fields that are currently empty (supplier fields, not client fields)
    setFormData((prev) => ({
      ...prev,
      iban: prev.iban || defaultSupplier.iban || '',
      accountNumber:
        prev.accountNumber ||
        defaultSupplier.accountNumber ||
        bankFields.accountNumber,
      bankCode:
        prev.bankCode || defaultSupplier.bankCode || bankFields.bankCode,
      prefix: prev.prefix || defaultSupplier.prefix || bankFields.prefix,
      supplierName: prev.supplierName || defaultSupplier.name || '',
      supplierIco: prev.supplierIco || defaultSupplier.ico || '',
      supplierVat: prev.supplierVat || defaultSupplier.vat || '',
      supplierAddress: prev.supplierAddress || defaultSupplier.address || '',
      supplierRegistry: prev.supplierRegistry || defaultSupplier.registry || '',
      supplierPhone: prev.supplierPhone || defaultSupplier.phone || '',
      supplierEmail: prev.supplierEmail || defaultSupplier.email || '',
      supplierWebsite: prev.supplierWebsite || defaultSupplier.website || '',
      isVatPayer: prev.isVatPayer || defaultSupplier.isVatPayer || false,
      taxStatus: prev.taxStatus || defaultSupplier.taxStatus || 'non-payer',
      taxRate: prev.taxRate || defaultSupplier.taxRate || '21',
      // Never touch: invoiceNumber, client fields, items, dates, status
    }));
  }, [defaultSupplier]); // ← only runs when supplier profile changes

  // ─── Effect 3.1: Cross-Border EU B2B Reverse Charge Logic ────────────
  useEffect(() => {
    const supplierRegion = defaultSupplier?.region || 'CZ';
    const isCrossBorder =
      formData.clientCountry && formData.clientCountry !== supplierRegion;
    const isB2B = formData.clientIco && formData.clientVat;

    let message = '';
    let forceZeroVat = false;

    if (isCrossBorder) {
      // Logic B: VAT Reverse Charge
      if (isB2B) {
        forceZeroVat = true;
        message =
          supplierRegion === 'SK'
            ? 'Prenesenie daňovej povinnosti'
            : 'Přenesení daňové povinnosti';
      }

      // Logic C: "Identified Person" warning (CZ specific)
      if (
        supplierRegion === 'CZ' &&
        defaultSupplier?.taxStatus === 'non-payer' &&
        formData.clientVat
      ) {
        // Warning only, don't force logic here unless user expects it
        console.warn('Identifikovaná osoba trigger');
      }
    }

    setFormData((prev) => ({
      ...prev,
      reverseChargeText: message,
      taxRate: forceZeroVat ? '0' : prev.taxRate,
    }));
  }, [
    formData.clientCountry,
    formData.clientVat,
    formData.clientIco,
    defaultSupplier,
  ]);

  // ─── Effect 3.2: Exchange Rate Auto-Fetch ────────────
  useEffect(() => {
    const supplierRegion = defaultSupplier?.region || 'CZ';
    const homeCurrency = supplierRegion === 'SK' ? 'EUR' : 'CZK';

    if (formData.currency && formData.currency !== homeCurrency) {
      const fetchRate = async () => {
        try {
          const source = supplierRegion === 'SK' ? 'ECB' : 'CNB';
          const date = formData.issueDate; // format is YYYY-MM-DD in state usually
          const res = await fetch(
            `/api/exchange-rate?source=${source}&target=${formData.currency}&date=${date}`,
          );
          if (res.ok) {
            const data = await res.json();
            setFormData((prev) => ({
              ...prev,
              exchangeRate: data.rate.toFixed(4),
            }));
          }
        } catch (e) {
          console.error('Failed to fetch exchange rate', e);
        }
      };
      fetchRate();
    } else {
      setFormData((prev) => ({ ...prev, exchangeRate: '1.0000' }));
    }
  }, [formData.currency, formData.issueDate, defaultSupplier]);

  // ─── Effect 4: Auto-calculate Amount and VAT Summary ────────────
  useEffect(() => {
    const calculatedTotals = items.reduce(
      (acc, item) => {
        const qty = parseFloat(String(item.qty)) || 0;
        const price = parseFloat(String(item.price)) || 0;
        const taxRate = parseFloat(String(item.taxRate)) || 0;
        const discount = parseFloat(String(item.discount)) || 0;

        const subtotal = qty * price;
        const afterDiscount = subtotal - discount;
        const taxAmount = afterDiscount * (taxRate / 100);
        const total = afterDiscount + taxAmount;

        return {
          taxBase: acc.taxBase + afterDiscount,
          taxAmount: acc.taxAmount + taxAmount,
          amount: acc.amount + total,
        };
      },
      { taxBase: 0, taxAmount: 0, amount: 0 },
    );

    setFormData((prev) => ({
      ...prev,
      amount: money(calculatedTotals.amount),
      taxBase: calculatedTotals.taxBase.toFixed(2),
      taxAmount: calculatedTotals.taxAmount.toFixed(2),
    }));
  }, [items]);

  useEffect(() => {
    const updates: { bic?: string; iban?: string } = {};
    if (formData.bankCode) {
      const bankInfo = BANK_CODES[formData.bankCode];
      if (bankInfo?.bic && bankInfo.bic !== formData.bic) {
        updates.bic = bankInfo.bic;
      }
    }
    if (formData.accountNumber && formData.bankCode) {
      const newIban = calculateIban(
        formData.accountNumber,
        formData.bankCode,
        formData.prefix,
      );
      if (newIban && newIban !== formData.iban) {
        const currentClean = (formData.iban || '').replace(/\s/g, '');
        const newClean = newIban.replace(/\s/g, '');
        if (currentClean !== newClean) {
          updates.iban = newIban;
        }
      }
    }
    if (Object.keys(updates).length > 0) {
      setFormData((prev) => ({ ...prev, ...updates }));
    }
  }, [formData.accountNumber, formData.bankCode, formData.prefix]);

  // Update item input tax rate when VAT payer status changes
  useEffect(() => {
    setItemInput((prev) => ({
      ...prev,
      taxRate: formData.isVatPayer ? '21' : '0',
    }));
  }, [formData.isVatPayer]);

  const handleBlurSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    // Don't auto-save blank forms — require at minimum a client name
    const currentFormData = stateRef.current.formData;
    if (!currentFormData.clientName?.trim()) return;

    const timer = setTimeout(() => {
      const currentData = stateRef.current;
      const invoiceData = getCurrentInvoiceData(
        currentData.formData,
        currentData.items,
      );
      onSave(invoiceData, { autoSave: true });

      if (invoiceData.client && invoiceData.client.name) {
        fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer: invoiceData.client }),
        }).catch((e) => console.error(e));
      }
    }, 1000);
    setSaveTimer(timer);
  };

  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const resItems = await fetch('/api/items');
        if (resItems.ok) {
          const data = await resItems.json();
          setSavedItems(data.items || []);
        }
        const resCust = await fetch('/api/customers');
        if (resCust.ok) {
          const data = await resCust.json();
          setSavedCustomers(data.customers || []);
        }
      } catch (e) {
        console.error('[DB] Failed to load data:', e);
      }
    };
    loadSavedData();
  }, []);

  const getCurrentInvoiceData = (
    currentFormData = formData,
    currentItems = items,
  ) => {
    return {
      id: invoice?.id || newInvoiceIdRef.current || randomUUID(),
      invoiceNumber: currentFormData.invoiceNumber.trim(),
      documentType: currentFormData.documentType || 'invoice',
      issueDate: currentFormData.issueDate,
      dueDate: currentFormData.dueDate,
      taxableSupplyDate:
        currentFormData.taxableSupplyDate || currentFormData.issueDate,
      status: currentFormData.status,
      category: currentFormData.category,
      client: {
        name: currentFormData.clientName.trim(),
        email: currentFormData.clientEmail.trim(),
        emailCopy: (currentFormData.clientEmailCopy || '').trim(),
        phone: (currentFormData.clientPhone || '').trim(),
        area: currentFormData.clientArea.trim(),
        ico: currentFormData.clientIco.trim(),
        vat: currentFormData.clientVat.trim(),
        address: currentFormData.clientAddress.trim(),
        country: (currentFormData.clientCountry || 'CZ').trim().toUpperCase(),
      },
      items: currentItems,
      currency: currentFormData.currency,
      amount: currentItems.reduce((sum, item) => sum + item.total, 0),
      payment: {
        iban: currentFormData.iban.trim(),
        bic: currentFormData.bic.trim(),
        note: currentFormData.paymentNote.trim(),
        accountNumber: currentFormData.accountNumber,
        bankCode: currentFormData.bankCode,
        variableSymbol:
          currentFormData.variableSymbol ||
          currentFormData.invoiceNumber.replace(/\D/g, ''),
      },
      supplier: {
        name: currentFormData.supplierName.trim(),
        ico: currentFormData.supplierIco.trim(),
        vat: currentFormData.supplierVat.trim(),
        address: currentFormData.supplierAddress.trim(),
        registry: currentFormData.supplierRegistry.trim(),
        phone: currentFormData.supplierPhone.trim(),
        email: currentFormData.supplierEmail.trim(),
        website: currentFormData.supplierWebsite.trim(),
        // Fix: Include bank details in supplier object so they are saved to global settings
        accountNumber: currentFormData.accountNumber || '',
        bankCode: currentFormData.bankCode || '',
        prefix: currentFormData.prefix || '',
        iban: currentFormData.iban || '',
      },
      isVatPayer: currentFormData.isVatPayer,
      taxBase: currentFormData.taxBase,
      taxRate: currentFormData.taxRate,
      taxAmount: currentFormData.taxAmount,
    };
  };

  const handleDocTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const documentType = e.target.value as DocumentType;
    setFormData((prev) => {
      // Existing invoices keep their issued number; only re-prefix drafts.
      if (invoice) return { ...prev, documentType };
      const invoiceNumber = applyDocumentTypeToNumber(
        prev.invoiceNumber,
        documentType,
      );
      return {
        ...prev,
        documentType,
        invoiceNumber,
        variableSymbol: invoiceNumber.replace(/\D/g, ''),
      };
    });
  };

  useEffect(() => {
    let active = true;
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = data?.settings?.bankAccounts;
        if (active && Array.isArray(list)) setBankAccounts(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleSelectBankAccount = (e: ChangeEvent<HTMLSelectElement>) => {
    const account = bankAccounts.find((a) => a.id === e.target.value);
    if (!account) return;
    setFormData((prev) => ({
      ...prev,
      iban: account.iban || '',
      accountNumber: account.accountNumber || '',
      bankCode: account.bankCode || '',
      prefix: account.prefix || '',
    }));
  };

  const handlePasteBank = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').trim();
    if (!text) return;
    const cleanIban = text.replace(/\s/g, '').toUpperCase();
    if (/^[A-Z]{2}\d{10,}/.test(cleanIban)) {
      e.preventDefault();
      const parsed = parseIban(cleanIban);
      const bankInfo = parsed ? BANK_CODES[parsed.bankCode] : undefined;
      setFormData((prev) => ({
        ...prev,
        iban: cleanIban,
        bankCode: parsed?.bankCode || prev.bankCode,
        prefix: parsed?.prefix || prev.prefix,
        accountNumber: parsed?.accountNumber || prev.accountNumber,
        bic: bankInfo?.bic || prev.bic,
      }));
      return;
    }
    const czechMatch = text.match(/^(\d{0,6}-)?(\d{1,10})\/(\d{4})$/);
    if (czechMatch) {
      e.preventDefault();
      const prefix = czechMatch[1] ? czechMatch[1].replace('-', '') : '';
      const accountNumber = czechMatch[2];
      const bankCode = czechMatch[3];
      setFormData((prev) => ({
        ...prev,
        prefix,
        accountNumber,
        bankCode,
      }));
    }
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Czech account numbers may carry an optional prefix ("19-2000145399").
  // Split it so calculateIban() receives prefix + base number separately.
  const handleAccountNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.includes('-')) {
      const [prefix, account = ''] = raw.split('-');
      setFormData((prev) => ({
        ...prev,
        prefix: prefix.replace(/\D/g, ''),
        accountNumber: account.replace(/\D/g, ''),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        prefix: '',
        accountNumber: raw.replace(/\D/g, ''),
      }));
    }
  };

  // Debounce reference for ARES
  const aresDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClientNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, clientName: value }));
    setAresAutoFilled(false);
    setCustomerActiveIndex(-1);

    if (value.trim().length > 0) {
      // 1. Saved Customers (Instant) — match ignoring spaces so "skillnav",
      // "Skill Nav" and "Skill  Nav" all find "Skill Nav s.r.o.".
      const normalize = (s?: string) =>
        (s || '').replace(/\s+/g, '').toLowerCase();
      const needle = normalize(value);
      const matches: CustomerSuggestion[] = savedCustomers
        .filter((c) => normalize(c.name).includes(needle))
        .slice(0, 5)
        .map((c) => ({ ...c, source: 'saved' }));
      setCustomerSuggestions(matches);

      // 2. ARES/RPO Search (Debounced)
      if (value.trim().length >= 3) {
        if (aresDebounceRef.current) clearTimeout(aresDebounceRef.current);
        const isSk = formData.clientCountry === 'SK';
        aresDebounceRef.current = setTimeout(() => {
          const lookup = isSk ? searchRpo(value) : searchAres(value);
          lookup.then((results: unknown[]) => {
            const newMatches: CustomerSuggestion[] = results.map((item) => {
              const parsed = isSk
                ? (item as CustomerSuggestion)
                : parseAresItem(item as Parameters<typeof parseAresItem>[0]);
              return { ...parsed, source: isSk ? 'rpo' : 'ares' };
            });
            setCustomerSuggestions((prev) => {
              const existingNames = new Set(prev.map((p) => p.name));
              const newResults = newMatches
                .filter((a) => !existingNames.has(a.name))
                .slice(0, 3);
              return [...prev, ...newResults];
            });
          });
        }, 500);
      }
    } else {
      setCustomerSuggestions([]);
    }
  };

  const handleSelectCustomer = (customer: CustomerSuggestion) => {
    setFormData((prev) => ({
      ...prev,
      clientName: customer.name || '',
      clientEmail: customer.email || '',
      clientEmailCopy: customer.emailCopy || '',
      clientPhone: customer.phone || '',
      clientIco: customer.ico || '',
      clientVat: customer.vat || '',
      clientAddress: customer.address || '',
      clientArea: customer.city || customer.area || '',
      clientCountry: customer.country || prev.clientCountry,
    }));
    if (customer.source === 'ares' || customer.source === 'rpo') {
      setAresAutoFilled(true);
    }
    setCustomerSuggestions([]);
    setCustomerActiveIndex(-1);
  };

  // Keyboard navigation for the subscriber suggestions dropdown: arrows to move,
  // Enter to pick the highlighted (or first) result, Escape to dismiss.
  const handleClientNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (customerSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCustomerActiveIndex((i) => (i + 1) % customerSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCustomerActiveIndex((i) =>
        i <= 0 ? customerSuggestions.length - 1 : i - 1,
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = customerActiveIndex >= 0 ? customerActiveIndex : 0;
      handleSelectCustomer(customerSuggestions[idx]);
    } else if (e.key === 'Escape') {
      setCustomerSuggestions([]);
      setCustomerActiveIndex(-1);
    }
  };

  const handleSupplierNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, supplierName: value }));
    setSupplierAresAutoFilled(false);
    if (value.trim().length >= 3) {
      if (supplierAresDebounceRef.current)
        clearTimeout(supplierAresDebounceRef.current);
      supplierAresDebounceRef.current = setTimeout(async () => {
        const results = (await searchAres(value)) as unknown[];
        setSupplierSuggestions(
          results
            .map(
              (item): CustomerSuggestion => ({
                ...parseAresItem(item as Parameters<typeof parseAresItem>[0]),
                source: 'ares',
              }),
            )
            .slice(0, 5),
        );
      }, 500);
    } else {
      setSupplierSuggestions([]);
    }
  };

  const handleSupplierIcoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, supplierIco: value }));
    if (/^\d{8}$/.test(value.trim())) {
      const entity = await lookupAresByIco(value.trim());
      if (entity) {
        const parsed = parseAresItem(entity);
        setFormData((prev) => ({
          ...prev,
          supplierName: parsed.name || prev.supplierName,
          supplierVat: parsed.vat || prev.supplierVat,
          supplierAddress: parsed.address || prev.supplierAddress,
        }));
        setSupplierAresAutoFilled(true);
      }
    }
  };

  const handleSelectSupplier = (entity: CustomerSuggestion) => {
    setFormData((prev) => ({
      ...prev,
      supplierName: entity.name || prev.supplierName,
      supplierIco: entity.ico || prev.supplierIco,
      supplierVat: entity.vat || prev.supplierVat,
      supplierAddress: entity.address || prev.supplierAddress,
    }));
    setSupplierSuggestions([]);
    setSupplierAresAutoFilled(true);
  };

  const handleInputBlur = () => {
    handleBlurSave();
  };

  const handleAddItem = async () => {
    if (!itemInput.name.trim() || itemInput.qty <= 0) return;

    const basePrice = Number(itemInput.price) || 0;
    const qty = Number(itemInput.qty);
    const discount = Number(itemInput.discount) || 0;
    // Use the selected tax rate directly, don't force it to 0
    const taxRate = Number(itemInput.taxRate) || 0;

    const priceAfterDiscount = basePrice - discount;
    const subtotal = qty * priceAfterDiscount;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    const newItem = {
      id: randomUUID(),
      name: itemInput.name.trim(),
      qty,
      price: basePrice,
      discount,
      taxRate,
      taxAmount,
      subtotal,
      total,
    };

    setItems([...items, newItem]);

    try {
      await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: {
            name: newItem.name,
            price: basePrice,
            taxRate,
          },
        }),
      });
      const response = await fetch('/api/items');
      if (response.ok) {
        const data = await response.json();
        setSavedItems(data.items || []);
      }
    } catch (e) {
      console.error('[Items] Failed to save item:', e);
    }

    // Reset with default tax rate based on VAT payer status
    setItemInput({
      name: '',
      qty: 1,
      price: '',
      taxRate: formData.isVatPayer ? '21' : '0',
      discount: 0,
      total: '',
    });
    setItemSuggestions([]);
  };

  const handleClearItems = () => setItems([]);

  const handleItemNameChange = (value: string) => {
    setItemInput((prev) => ({ ...prev, name: value }));
    if (value.trim().length > 0) {
      const itemsToFilter = Array.isArray(savedItems) ? savedItems : [];
      const matches = itemsToFilter
        .filter((item) =>
          (item.name || '').toLowerCase().includes(value.toLowerCase()),
        )
        .slice(0, 5);
      setItemSuggestions(matches);
    } else {
      setItemSuggestions([]);
    }
  };

  const handleSelectSuggestion = (item: ItemSuggestion) => {
    setItemInput((prev) => ({
      ...prev,
      name: item.name || '',
      price: String(item.price ?? ''),
      taxRate: String(item.taxRate ?? '21'),
    }));
    setItemSuggestions([]);
  };

  const handleDeleteRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    announce({
      kind: 'info',
      label: lang === 'cs' ? 'Položka odebrána' : 'Item removed',
    });
    handleBlurSave();
  };

  const addItem = () => {
    announce({
      kind: 'info',
      label: lang === 'cs' ? 'Položka přidána' : 'Item added',
    });
    setItems((prev) => [
      ...prev,
      {
        id: randomUUID(),
        name: '',
        qty: 1,
        unit: 'h',
        price: 0,
        discount: 0,
        taxRate: formData.isVatPayer ? 21 : 0,
        subtotal: 0,
        taxAmount: 0,
        total: 0,
      },
    ]);
  };

  const updateItem = (i: number, key: string, rawValue: any) => {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== i) return it;
        const updated = { ...it, [key]: rawValue };
        const qty =
          parseFloat(String(key === 'qty' ? rawValue : updated.qty)) || 0;
        const price =
          parseFloat(String(key === 'price' ? rawValue : updated.price)) || 0;
        const taxRate =
          parseFloat(String(key === 'taxRate' ? rawValue : updated.taxRate)) ||
          0;
        const discount = parseFloat(String(updated.discount)) || 0;
        const afterDiscount = qty * price - discount;
        const taxAmount = afterDiscount * (taxRate / 100);
        return {
          ...updated,
          subtotal: afterDiscount,
          taxAmount,
          total: afterDiscount + taxAmount,
        };
      }),
    );
  };

  const handleItemTotalChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newTotalStr = e.target.value;
    const newTotal = Number(newTotalStr);

    const qty = Number(itemInput.qty) || 1;
    const taxRate = formData.isVatPayer ? Number(itemInput.taxRate) || 0 : 0;
    const discountPct = Number(itemInput.discount) || 0;
    const taxMultiplier = 1 + taxRate / 100;
    const discountMultiplier = 1 - discountPct / 100;

    // Working backwards: Total = (Price * DiscountMultiplier * Qty) * TaxMultiplier
    // So: Price = Total / (Qty * TaxMultiplier * DiscountMultiplier)
    if (qty > 0 && taxMultiplier > 0 && discountMultiplier > 0) {
      const price = newTotal / (qty * taxMultiplier * discountMultiplier);
      setItemInput((prev) => ({
        ...prev,
        price: price.toFixed(2),
        total: newTotalStr,
      }));
    }
    setItemInput((prev) => ({ ...prev, total: newTotalStr }));
  };

  const handleAddCategory = () => {
    const normalized = categoryInput.trim();
    if (normalized) {
      onAddCategory(normalized);
      setFormData((prev) => ({ ...prev, category: normalized }));
      setCategoryInput('');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Ensure we use the very latest state from stateRef for saving
    const data = stateRef.current;
    const invoiceData = getCurrentInvoiceData(data.formData, data.items);
    onSave(invoiceData);
    setDefaultSupplier(invoiceData.supplier);
    announce({
      kind: 'done',
      label: lang === 'cs' ? 'Faktura uložena' : 'Invoice saved',
    });
  };

  const handleMarkPaid = () => {
    if (!invoice) return; // Safety: can't mark unsaved new invoice as paid
    // Use invoice PROP (source of truth from DB), NOT formData
    // formData may still be from previous invoice if Effect 1 hasn't re-rendered yet
    const updatedData = { ...invoice, status: 'paid' };
    setFormData((prev) => ({ ...prev, status: 'paid' }));
    onSave(updatedData);
    announce({
      kind: 'done',
      label:
        lang === 'cs'
          ? 'Faktura označena jako uhrazená'
          : 'Invoice marked as paid',
    });
  };

  const handleAresData = (data: CustomerSuggestion) => {
    setFormData((prev) => ({
      ...prev,
      clientName: data.name || prev.clientName,
      clientAddress: data.address || prev.clientAddress,
      clientIco: data.ico || prev.clientIco,
      clientArea: data.city || prev.clientArea,
      clientVat: data.vat || prev.clientVat,
    }));
    setAresAutoFilled(true);
  };

  const handleDownloadPDF = async () => {
    const currentData = getCurrentInvoiceData();
    setIsGenerating(true);
    announce({
      kind: 'processing',
      label: lang === 'cs' ? 'Generuji PDF…' : 'Generating PDF…',
    });
    try {
      const { generateInvoicePDF, downloadPDF } = await loadPdfUtils();
      let qrDataUrl = null;
      try {
        const qrPayload = getCzechQrPayload(currentData);
        if (qrPayload) {
          qrDataUrl = await QRCode.toDataURL(qrPayload, {
            errorCorrectionLevel: 'M',
            margin: 0,
            width: 256,
          });
        }
      } catch (err) {}

      const pdf = await generateInvoicePDF(currentData, t, qrDataUrl);
      downloadPDF(pdf, `${currentData.invoiceNumber}.pdf`);
      announce({
        kind: 'done',
        label: lang === 'cs' ? 'PDF staženo' : 'PDF downloaded',
      });
    } catch (error) {
      alert('Failed to generate PDF');
      announce({
        kind: 'error',
        label: lang === 'cs' ? 'Chyba PDF' : 'PDF failed',
      });
    }
    setIsGenerating(false);
  };

  const handleEmailPDF = async () => {
    if (!isAuthenticated) {
      return alert(
        lang === 'cs'
          ? 'Pro odeslání emailu se musíte přihlásit.'
          : 'You must be logged in to send emails.',
      );
    }
    const currentData = getCurrentInvoiceData();
    if (!currentData.client.email) {
      return alert(t.alertEmailMissing);
    }
    setIsGenerating(true);
    setEmailStatus(lang === 'cs' ? 'Odesílám…' : 'Sending…');
    announce({
      kind: 'processing',
      label: lang === 'cs' ? 'Odesílám e-mail…' : 'Sending email…',
    });
    try {
      const { generateInvoicePDF, pdfBlobToDataUri } = await loadPdfUtils();
      let qrDataUrl = null;
      try {
        const qrPayload = getCzechQrPayload(currentData);
        if (qrPayload) {
          qrDataUrl = await QRCode.toDataURL(qrPayload, {
            errorCorrectionLevel: 'M',
            margin: 0,
            width: 256,
          });
        }
      } catch (err) {}
      const pdfBlob = await generateInvoicePDF(currentData, t, qrDataUrl);
      const pdfBase64 = await pdfBlobToDataUri(pdfBlob);
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice: currentData, pdfBase64, lang }),
      });
      const result = await response.json();
      if (response.ok) {
        setEmailStatus(t.alertEmailSuccess);
        announce({
          kind: 'done',
          label: lang === 'cs' ? 'E-mail odeslán' : 'Email sent',
        });
        setTimeout(() => setEmailStatus(''), 3000);
      } else {
        setEmailStatus('');
        announce({
          kind: 'error',
          label: lang === 'cs' ? 'Chyba odeslání' : 'Email failed',
        });
        alert(`${t.alertEmailFailed}${result.message || result.error}`);
      }
    } catch (error) {
      setEmailStatus('');
      announce({
        kind: 'error',
        label: lang === 'cs' ? 'Chyba e-mailu' : 'Email error',
      });
      alert(t.alertError);
    }
    setIsGenerating(false);
  };

  const handlePaymentLink = async () => {
    if (!isAuthenticated) {
      return alert(
        lang === 'cs'
          ? 'Pro vytvoření platebního odkazu se musíte přihlásit.'
          : 'You must be logged in to create a payment link.',
      );
    }
    const { id } = getCurrentInvoiceData();
    if (!id) return;
    setPayStatus(lang === 'cs' ? 'Generuji…' : 'Generating…');
    announce({
      kind: 'processing',
      label: lang === 'cs' ? 'Generuji odkaz…' : 'Generating link…',
    });
    try {
      const url = await createPaymentLink(id);
      await navigator.clipboard?.writeText(url).catch(() => {});
      window.open(url, '_blank', 'noopener');
      setPayStatus(lang === 'cs' ? 'Odkaz zkopírován' : 'Link copied');
      announce({
        kind: 'done',
        label:
          lang === 'cs' ? 'Platební odkaz zkopírován' : 'Payment link copied',
      });
      setTimeout(() => setPayStatus(''), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error';
      setPayStatus(message);
      announce({
        kind: 'error',
        label: lang === 'cs' ? 'Chyba odkazu' : 'Link error',
      });
      setTimeout(() => setPayStatus(''), 4000);
    }
  };

  const handleShareLink = async () => {
    if (!isAuthenticated) {
      return alert(
        lang === 'cs'
          ? 'Pro sdílení faktury se musíte přihlásit.'
          : 'You must be logged in to share an invoice.',
      );
    }
    const { id } = getCurrentInvoiceData();
    if (!id) return;
    setPayStatus(lang === 'cs' ? 'Generuji…' : 'Generating…');
    announce({
      kind: 'processing',
      label: lang === 'cs' ? 'Generuji odkaz…' : 'Generating link…',
    });
    try {
      const { url } = await createShareLink(id);
      await navigator.clipboard?.writeText(url).catch(() => {});
      window.open(url, '_blank', 'noopener');
      setPayStatus(lang === 'cs' ? 'Odkaz zkopírován' : 'Link copied');
      announce({
        kind: 'done',
        label: lang === 'cs' ? 'Odkaz sdílení zkopírován' : 'Share link copied',
      });
      setTimeout(() => setPayStatus(''), 3000);
    } catch {
      setPayStatus(lang === 'cs' ? 'Chyba' : 'Error');
      announce({
        kind: 'error',
        label: lang === 'cs' ? 'Chyba sdílení' : 'Share failed',
      });
      setTimeout(() => setPayStatus(''), 3000);
    }
  };

  const handleExportIsdoc = async () => {
    announce({
      kind: 'processing',
      label: lang === 'cs' ? 'Exportuji ISDOC…' : 'Exporting ISDOC…',
    });
    try {
      await downloadInvoiceIsdoc(getCurrentInvoiceData());
      announce({ kind: 'done', label: 'ISDOC' });
    } catch {
      alert(
        lang === 'cs' ? 'Export ISDOC se nezdařil.' : 'ISDOC export failed.',
      );
      announce({
        kind: 'error',
        label: lang === 'cs' ? 'Chyba ISDOC' : 'ISDOC failed',
      });
    }
  };

  const handleBackupToDrive = async () => {
    if (!isAuthenticated) {
      return alert(
        lang === 'cs'
          ? 'Pro zálohování na Google Drive se musíte přihlásit.'
          : 'You must be logged in to backup to Google Drive.',
      );
    }
    const currentData = getCurrentInvoiceData();
    setIsGenerating(true);
    setEmailStatus(lang === 'cs' ? 'Zálohování...' : 'Backing up...');
    announce({
      kind: 'processing',
      label: lang === 'cs' ? 'Zálohuji na Drive…' : 'Backing up to Drive…',
    });
    try {
      const { generateInvoicePDF, pdfBlobToDataUri } = await loadPdfUtils();
      let qrDataUrl = null;
      try {
        const qrPayload = getCzechQrPayload(currentData);
        if (qrPayload) {
          qrDataUrl = await QRCode.toDataURL(qrPayload, {
            errorCorrectionLevel: 'M',
            margin: 0,
            width: 256,
          });
        }
      } catch (err) {}

      const pdfBlob = await generateInvoicePDF(currentData, t, qrDataUrl);
      const pdfBase64 = await pdfBlobToDataUri(pdfBlob);

      const response = await fetch('/api/drive/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice: currentData,
          pdfBase64: pdfBase64,
        }),
      });
      if (response.ok) {
        announce({
          kind: 'done',
          label:
            lang === 'cs' ? 'Uloženo na Google Drive' : 'Saved to Google Drive',
        });
        alert(
          lang === 'cs' ? 'Uloženo na Google Drive!' : 'Saved to Google Drive!',
        );
      } else {
        const result = await response.json();
        announce({
          kind: 'error',
          label: lang === 'cs' ? 'Chyba Drive' : 'Drive backup failed',
        });
        alert(`Backup failed: ${result.message || result.error}`);
      }
    } catch (error) {
      announce({
        kind: 'error',
        label: lang === 'cs' ? 'Chyba zálohy' : 'Backup error',
      });
      alert(t.alertError);
    }
    setIsGenerating(false);
    setEmailStatus('');
  };

  const togglePreview = () => setPreviewMode(!previewMode);

  const handleAIFill = (data: any) => {
    setFormData((prev) => ({
      ...prev,
      clientName: data.clientName || prev.clientName,
      clientEmail: data.clientEmail || prev.clientEmail,
      clientPhone: data.clientPhone || prev.clientPhone,
      clientAddress: data.clientAddress || prev.clientAddress,
      clientIco: data.clientIco || prev.clientIco,
      clientVat: data.clientVat || prev.clientVat,
      clientArea: data.clientArea || prev.clientArea,
      clientCountry: data.clientCountry || prev.clientCountry,
      currency: data.currency || prev.currency,
      dueDate: data.dueDate || prev.dueDate,
      issueDate: data.issueDate || prev.issueDate,
      variableSymbol: data.variableSymbol || prev.variableSymbol,
      paymentNote: data.paymentNote || prev.paymentNote,
      ...(data.supplierName ? { supplierName: data.supplierName } : {}),
      ...(data.supplierIco ? { supplierIco: data.supplierIco } : {}),
      ...(data.supplierVat ? { supplierVat: data.supplierVat } : {}),
      ...(data.supplierAddress
        ? { supplierAddress: data.supplierAddress }
        : {}),
    }));
    if (Array.isArray(data.items) && data.items.length > 0) {
      const vatPayer = formData.isVatPayer;
      setItems(
        data.items.map((item: any) => {
          const qty = Number(item.qty) || 1;
          const price = Number(item.price) || 0;
          const taxRate =
            item.taxRate != null ? Number(item.taxRate) : vatPayer ? 21 : 0;
          const subtotal = qty * price;
          const taxAmount = subtotal * (taxRate / 100);
          return {
            id: randomUUID(),
            name: String(item.name || ''),
            qty,
            price,
            discount: 0,
            taxRate,
            subtotal,
            taxAmount,
            total: subtotal + taxAmount,
          };
        }),
      );
    }
  };

  // Supplier section — rendered in sidebar
  const supplierSection = (
    <div className='ap-card'>
      <h3 className='ap-card__title'>
        <Contact size={ICON_MD} strokeWidth={STROKE} />
        {lang === 'cs' ? 'Dodavatel' : 'Supplier'}
      </h3>
      <div className='ap-grid'>
        <div
          className='ap-field'
          ref={supplierSuggestionsRef}
          style={{ position: 'relative' }}
        >
          <label>{lang === 'cs' ? 'Jméno / Název' : 'Name / Company'}</label>
          <input
            className='ap-input'
            name='supplierName'
            value={formData.supplierName}
            onChange={handleSupplierNameChange}
            onBlur={handleInputBlur}
            placeholder={
              lang === 'cs'
                ? 'Vyhledat firmu nebo zadat IČO...'
                : 'Search company or enter business ID...'
            }
            autoComplete='off'
          />
          {supplierSuggestions.length > 0 && (
            <ul
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                zIndex: 10,
                listStyle: 'none',
                padding: '4px',
                margin: '4px 0 0 0',
                maxHeight: '200px',
                overflowY: 'auto',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              {supplierSuggestions.map((s, i) => (
                <li
                  key={i}
                  onClick={() => handleSelectSupplier(s)}
                  style={{
                    padding: '9px 12px',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--card)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: 8,
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      {s.name}
                    </span>
                    <small
                      style={{
                        color: 'var(--accent)',
                        fontSize: 10.5,
                        fontWeight: 600,
                      }}
                    >
                      ARES
                    </small>
                  </div>
                  <small style={{ color: 'var(--muted)', fontSize: 12 }}>
                    {s.ico && `IČO: ${s.ico}`}
                    {s.address && ` · ${s.address}`}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </div>
        {supplierAresAutoFilled && (
          <div className='ap-ares-banner'>
            <Check size={ICON_SM} strokeWidth={STROKE} />
            <strong>ARES</strong> ·{' '}
            {lang === 'cs'
              ? 'Automaticky vyplněno z ARES'
              : 'Auto-filled from ARES'}
          </div>
        )}
        <div className='ap-grid ap-grid--2'>
          <div className='ap-field'>
            <label>{lang === 'cs' ? 'IČO' : 'Business ID'}</label>
            <input
              className='ap-input'
              name='supplierIco'
              value={formData.supplierIco}
              onChange={handleSupplierIcoChange}
              onBlur={handleInputBlur}
              placeholder='12345678'
            />
          </div>
          <div className='ap-field'>
            <label>{lang === 'cs' ? 'DIČ' : 'VAT ID'}</label>
            <input
              className='ap-input'
              name='supplierVat'
              value={formData.supplierVat}
              onChange={handleChange}
              onBlur={handleInputBlur}
              placeholder='CZ12345678'
            />
          </div>
        </div>
        <div className='ap-field'>
          <label>{lang === 'cs' ? 'Adresa' : 'Address'}</label>
          <input
            className='ap-input'
            name='supplierAddress'
            value={formData.supplierAddress}
            onChange={handleChange}
            onBlur={handleInputBlur}
            placeholder='Ulice 123, Praha'
          />
        </div>
      </div>
    </div>
  );

  const getDueInDays = () => {
    if (!formData.dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(formData.dueDate);
    due.setHours(0, 0, 0, 0);
    const days = Math.round(
      (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (days < 0)
      return lang === 'cs'
        ? `Po splatnosti (${Math.abs(days)} dní)`
        : `Overdue by ${Math.abs(days)} days`;
    if (days === 0) return lang === 'cs' ? 'Splatno dnes' : 'Due today';
    return lang === 'cs' ? `Splatnost za ${days} dní` : `Due in ${days} days`;
  };

  // Summary sidebar card
  const summaryCard = (
    <div
      className='ap-card'
      style={{
        background:
          'radial-gradient(closest-side at 100% 0%, rgba(124, 247, 212, 0.08), transparent 60%), var(--card)',
      }}
    >
      <h3 className='ap-card__title'>
        <FileText size={ICON_MD} strokeWidth={STROKE} />
        {lang === 'cs' ? 'Souhrn' : 'Summary'}
      </h3>
      <div style={{ display: 'grid', gap: 8 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 13,
          }}
        >
          <span style={{ color: 'var(--muted)' }}>
            {lang === 'cs' ? 'Mezisoučet' : 'Subtotal'}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-secondary, inherit)',
              fontWeight: 500,
            }}
          >
            {formData.taxBase} {formData.currency}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 13,
          }}
        >
          <span style={{ color: 'var(--muted)' }}>
            {lang === 'cs'
              ? `DPH ${formData.taxRate} %`
              : `VAT ${formData.taxRate} %`}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-secondary, inherit)',
              fontWeight: 500,
            }}
          >
            {formData.taxAmount} {formData.currency}
          </span>
        </div>
        <div className='ap-summary-total'>
          <span style={{ fontWeight: 600 }}>
            {lang === 'cs' ? 'Celkem k úhradě' : 'Total to be paid'}
          </span>
          <span className='amount'>{formData.amount}</span>
        </div>
        <div
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
          }}
        >
          <span className={`ap-pill ${formData.status}`}>
            {t[formData.status] || formData.status}
          </span>
          {getDueInDays() && (
            <span style={{ color: 'var(--muted)' }}>{getDueInDays()}</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
            input[type="number"]::-webkit-inner-spin-button,
            input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
            input[type="number"] { -moz-appearance: textfield; }
        `}</style>

      <div className='ap-page'>
        {/* Page header */}
        <div className='ap-page__head'>
          <div>
            {onShowInvoiceForm && onOpenDashboard && (
              <div className='invoice-form-mobile-tabs' role='tablist'>
                <button
                  className='invoice-form-mobile-tabs__tab invoice-form-mobile-tabs__tab--active'
                  type='button'
                  role='tab'
                  aria-selected='true'
                  onClick={onShowInvoiceForm}
                >
                  <FileText size={ICON_SM} strokeWidth={STROKE} />
                  <span>{lang === 'cs' ? 'Faktura' : 'Invoice form'}</span>
                </button>
                <button
                  className='invoice-form-mobile-tabs__tab'
                  type='button'
                  role='tab'
                  aria-selected='false'
                  onClick={onOpenDashboard}
                >
                  <BarChart2 size={ICON_SM} strokeWidth={STROKE} />
                  <span>{lang === 'cs' ? 'Přehled' : 'Invoice dashboard'}</span>
                </button>
              </div>
            )}
            <h1 className='ap-page__title'>
              {invoice
                ? lang === 'cs'
                  ? 'Upravit fakturu'
                  : 'Edit invoice'
                : lang === 'cs'
                  ? 'Nová faktura'
                  : 'New invoice'}
            </h1>
            <p className='ap-page__sub'>
              {lang === 'cs'
                ? 'Vyplňte hlasem, textem, nebo ručně.'
                : 'Fill it by voice, by text, or by hand.'}
              <span
                style={{
                  color: 'var(--muted2)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 12,
                  marginLeft: 8,
                }}
              >
                · {formData.invoiceNumber}
              </span>
            </p>
          </div>
        </div>

        {previewMode ? (
          <div className='ap-card'>
            <InvoicePreview
              invoice={getCurrentInvoiceData()}
              t={t}
              lang={lang}
            />
            <div className='ap-action-bar' style={{ marginTop: '24px' }}>
              <button
                type='button'
                onClick={(e) => {
                  e.preventDefault();
                  onSave(getCurrentInvoiceData());
                }}
                className='ap-btn ap-btn--primary ap-btn--lg'
              >
                <Save size={ICON_MD} strokeWidth={STROKE} /> {t.saveInvoice}
              </button>
              <button
                type='button'
                onClick={(e) => {
                  e.preventDefault();
                  setPreviewMode(false);
                }}
                className='ap-btn ap-btn--secondary'
              >
                <Pencil size={ICON_MD} strokeWidth={STROKE} />{' '}
                {lang === 'cs' ? 'Upravit' : 'Edit'}
              </button>
              <button
                type='button'
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                className='ap-btn ap-btn--secondary'
              >
                {isGenerating && !emailStatus
                  ? t.alertGenerating
                  : t.downloadPdf}
              </button>
              <button
                type='button'
                onClick={handleEmailPDF}
                disabled={isGenerating || !isAuthenticated}
                className='ap-btn ap-btn--secondary'
              >
                <Send size={ICON_MD} strokeWidth={STROKE} />{' '}
                {emailStatus || t.emailPdf}
              </button>
              {isAuthenticated && formData.status !== 'paid' && (
                <button
                  type='button'
                  onClick={handlePaymentLink}
                  className='ap-btn ap-btn--secondary'
                >
                  <CreditCard size={ICON_MD} strokeWidth={STROKE} />{' '}
                  {payStatus ||
                    (lang === 'cs' ? 'Platební odkaz' : 'Payment link')}
                </button>
              )}
              <button
                type='button'
                onClick={handleExportIsdoc}
                className='ap-btn ap-btn--ghost'
              >
                <FileText size={ICON_MD} strokeWidth={STROKE} /> ISDOC
              </button>
              {isAuthenticated && (
                <button
                  type='button'
                  onClick={handleShareLink}
                  className='ap-btn ap-btn--ghost'
                >
                  <Eye size={ICON_MD} strokeWidth={STROKE} />{' '}
                  {lang === 'cs' ? 'Sdílet odkaz' : 'Share link'}
                </button>
              )}
              <button
                type='button'
                onClick={handleBackupToDrive}
                disabled={isGenerating}
                className='ap-btn ap-btn--ghost'
              >
                <Cloud size={ICON_MD} strokeWidth={STROKE} /> Drive
              </button>
              <button
                type='button'
                onClick={handleMarkPaid}
                className='ap-btn ap-btn--ghost'
                style={{ marginLeft: 'auto' }}
              >
                {t.markPaid}
              </button>
            </div>
          </div>
        ) : (
          /* ── create layout (single column, beside list) ── */
          <div className='ap-create'>
            <div className='ap-create__main'>
              {/* AI dictation card */}
              <AIPrompt
                lang={lang}
                onFillForm={handleAIFill}
                isGuest={!isAuthenticated}
                isVatPayer={formData.isVatPayer}
              />

              {/* Region/Tax Warning */}
              {defaultSupplier?.region === 'CZ' &&
                defaultSupplier?.taxStatus === 'non-payer' &&
                formData.clientCountry !== 'CZ' && (
                  <div className='form-warning-banner'>
                    <AlertTriangle
                      size={ICON_SM}
                      strokeWidth={STROKE}
                      style={{ flexShrink: 0 }}
                    />{' '}
                    {t.identifiedPersonWarning}
                  </div>
                )}

              <form
                onSubmit={handleSubmit}
                onBlur={handleInputBlur}
                style={{ display: 'contents' }}
              >
                {/* Basic info */}
                <div className='ap-card'>
                  <h3 className='ap-card__title'>
                    <FileText size={ICON_MD} strokeWidth={STROKE} />
                    {lang === 'cs' ? 'Základní údaje' : 'Basic info'}
                  </h3>
                  <div className='ap-grid ap-grid--3'>
                    <div className='ap-field'>
                      <label>{t.docType}</label>
                      <select
                        className='ap-select'
                        name='documentType'
                        value={formData.documentType}
                        onChange={handleDocTypeChange}
                      >
                        <option value='invoice'>{t.docTypeInvoice}</option>
                        <option value='proforma'>{t.docTypeProforma}</option>
                        <option value='advance'>{t.docTypeAdvance}</option>
                        <option value='creditNote'>
                          {t.docTypeCreditNote}
                        </option>
                      </select>
                    </div>
                    <div className='ap-field'>
                      <label>{t.invoiceNumber}</label>
                      <input
                        className='ap-input'
                        name='invoiceNumber'
                        value={formData.invoiceNumber}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className='ap-field'>
                      <label>{t.issueDate}</label>
                      <input
                        className='ap-input'
                        name='issueDate'
                        type='date'
                        value={formData.issueDate}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className='ap-field'>
                      <label>{t.dueDate}</label>
                      <input
                        className='ap-input'
                        name='dueDate'
                        type='date'
                        value={formData.dueDate}
                        onChange={handleChange}
                      />
                    </div>
                    <div className='ap-field'>
                      <label>
                        {lang === 'cs' ? 'DUZP' : 'Tax supply date'}
                      </label>
                      <input
                        className='ap-input'
                        name='taxableSupplyDate'
                        type='date'
                        value={formData.taxableSupplyDate || formData.issueDate}
                        onChange={handleChange}
                      />
                    </div>
                    <div className='ap-field'>
                      <label>{t.currency}</label>
                      <select
                        className='ap-select'
                        name='currency'
                        value={formData.currency}
                        onChange={handleChange}
                      >
                        <option value='CZK'>CZK · Česká koruna</option>
                        <option value='EUR'>EUR · Euro</option>
                        <option value='USD'>USD · US Dollar</option>
                      </select>
                    </div>
                    <div className='ap-field'>
                      <label>{t.category}</label>
                      <select
                        className='ap-select'
                        name='category'
                        value={formData.category}
                        onChange={handleChange}
                      >
                        <option value=''>
                          {lang === 'cs' ? 'Kategorie' : 'Category'}
                        </option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Supplier */}
                {supplierSection}

                {/* Client / Subscriber */}
                <div className='ap-card'>
                  <h3 className='ap-card__title'>
                    <Contact size={ICON_MD} strokeWidth={STROKE} />
                    {lang === 'cs' ? 'Odběratel' : 'Subscriber'}
                  </h3>

                  {/* Name search — full width */}
                  <div
                    className='ap-grid ap-grid--2'
                    style={{ marginBottom: 14 }}
                  >
                    <div className='ap-field' style={{ gridColumn: 'span 2' }}>
                      <label>
                        {lang === 'cs' ? 'Jméno / Název' : 'Name / Title'}
                      </label>
                      <div
                        className='ap-input-wrap'
                        style={{ position: 'relative' }}
                      >
                        <Search size={ICON_SM} strokeWidth={STROKE} />
                        <input
                          className='ap-input'
                          name='clientName'
                          value={formData.clientName}
                          onChange={handleClientNameChange}
                          onKeyDown={handleClientNameKeyDown}
                          onBlur={handleInputBlur}
                          placeholder={
                            lang === 'cs'
                              ? 'Vyhledat firmu nebo zadat IČO...'
                              : 'Search a company or enter business ID...'
                          }
                          autoComplete='off'
                          role='combobox'
                          aria-expanded={customerSuggestions.length > 0}
                          aria-autocomplete='list'
                        />
                        {customerSuggestions.length > 0 && (
                          <ul
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              background: 'var(--bg)',
                              border: '1px solid var(--border)',
                              borderRadius: '12px',
                              zIndex: 10,
                              listStyle: 'none',
                              padding: '4px',
                              margin: '4px 0 0 0',
                              maxHeight: '200px',
                              overflowY: 'auto',
                              boxShadow: 'var(--shadow-lg)',
                            }}
                          >
                            {customerSuggestions.map((c, i) => (
                              <li
                                key={i}
                                role='option'
                                aria-selected={i === customerActiveIndex}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleSelectCustomer(c)}
                                onMouseEnter={() => setCustomerActiveIndex(i)}
                                style={{
                                  padding: '9px 12px',
                                  cursor: 'pointer',
                                  borderRadius: '8px',
                                  transition: 'background 0.1s',
                                  background:
                                    i === customerActiveIndex
                                      ? 'var(--card)'
                                      : '',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'baseline',
                                    gap: 8,
                                  }}
                                >
                                  <span
                                    style={{ fontWeight: 600, fontSize: 13 }}
                                  >
                                    {c.name}
                                  </span>
                                  <small
                                    style={{
                                      color: 'var(--accent)',
                                      fontSize: 10.5,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {c.source === 'ares'
                                      ? 'ARES'
                                      : c.source === 'rpo'
                                        ? 'RPO'
                                        : 'Saved'}
                                  </small>
                                </div>
                                <small
                                  style={{
                                    color: 'var(--muted)',
                                    fontSize: 12,
                                  }}
                                >
                                  {c.ico && `IČO: ${c.ico}`}
                                  {c.email && ` · ${c.email}`}
                                </small>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ARES auto-fill banner */}
                  {aresAutoFilled && (
                    <div className='ap-ares-banner'>
                      <Check size={ICON_SM} strokeWidth={STROKE} />
                      <strong>ARES</strong> ·{' '}
                      {lang === 'cs'
                        ? 'Automaticky vyplněno z ARES'
                        : 'Auto-filled from ARES'}
                    </div>
                  )}

                  {/* ICO / DIC + Address + Email / Phone */}
                  <div className='ap-grid ap-grid--2'>
                    <div className='ap-field'>
                      <label>{lang === 'cs' ? 'IČO' : 'Business ID'}</label>
                      <input
                        className='ap-input'
                        name='clientIco'
                        value={formData.clientIco}
                        onChange={handleChange}
                      />
                    </div>
                    <div className='ap-field'>
                      <label>
                        {lang === 'cs' ? 'DIČ' : 'VAT ID'}
                        {viesStatus === 'valid' && (
                          <Check
                            size={12}
                            strokeWidth={3}
                            className='vat-valid'
                            style={{ marginLeft: 4 }}
                          />
                        )}
                        {viesStatus === 'invalid' && (
                          <span
                            className='vat-invalid'
                            style={{ marginLeft: 4 }}
                          >
                            ✗
                          </span>
                        )}
                      </label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          className='ap-input'
                          name='clientVat'
                          value={formData.clientVat}
                          onChange={handleChange}
                          style={{ flex: 1 }}
                        />
                        {formData.clientVat && (
                          <button
                            type='button'
                            className='ap-btn ap-btn--secondary'
                            style={{
                              padding: '0 10px',
                              fontSize: 11,
                              flexShrink: 0,
                            }}
                            onClick={async () => {
                              setViesStatus('loading');
                              try {
                                const res = await fetch('/api/vat/validate', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    vat: formData.clientVat,
                                  }),
                                });
                                const data = await res.json();
                                setViesStatus(
                                  data.isValid ? 'valid' : 'invalid',
                                );
                              } catch {
                                setViesStatus(null);
                              }
                            }}
                            disabled={viesStatus === 'loading'}
                          >
                            {viesStatus === 'loading' ? '…' : 'VIES'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className='ap-field' style={{ gridColumn: 'span 2' }}>
                      <label>{lang === 'cs' ? 'Adresa' : 'Address'}</label>
                      <input
                        className='ap-input'
                        name='clientAddress'
                        value={formData.clientAddress}
                        onChange={handleChange}
                      />
                    </div>
                    <div className='ap-field'>
                      <label>Email</label>
                      <input
                        className='ap-input'
                        name='clientEmail'
                        type='email'
                        value={formData.clientEmail}
                        onChange={handleChange}
                      />
                    </div>
                    <div className='ap-field'>
                      <label>{lang === 'cs' ? 'Telefon' : 'Phone'}</label>
                      <input
                        className='ap-input'
                        name='clientPhone'
                        value={formData.clientPhone}
                        onChange={handleChange}
                        placeholder='+420...'
                      />
                    </div>
                    <div className='ap-field'>
                      <label>{lang === 'cs' ? 'Země' : 'Country'}</label>
                      <select
                        className='ap-select'
                        name='clientCountry'
                        value={formData.clientCountry}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            clientCountry: e.target.value,
                          }))
                        }
                      >
                        <option value='CZ'>Czech Republic (CZ)</option>
                        <option value='SK'>Slovakia (SK)</option>
                        <option value='DE'>Germany (DE)</option>
                        <option value='AT'>Austria (AT)</option>
                        <option value='PL'>Poland (PL)</option>
                        <option value='OTHER'>Other EU / World</option>
                      </select>
                    </div>
                    <div className='ap-field'>
                      <label>Email CC</label>
                      <input
                        className='ap-input'
                        name='clientEmailCopy'
                        type='email'
                        value={formData.clientEmailCopy}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Line items */}
                <div className='ap-card'>
                  <h3 className='ap-card__title'>
                    <Wallet size={ICON_MD} strokeWidth={STROKE} />
                    {lang === 'cs' ? 'Položky' : 'Items'}
                  </h3>

                  <div className='ap-items'>
                    {/* Header row */}
                    <div className='ap-items__row'>
                      <div>
                        {lang === 'cs' ? 'Popis položky' : 'Item description'}
                      </div>
                      <div>{lang === 'cs' ? 'Množství' : 'Amount'}</div>
                      <div>{lang === 'cs' ? 'Jedn.' : 'Unit'}</div>
                      <div style={{ textAlign: 'right' }}>
                        {lang === 'cs' ? 'Jedn. cena' : 'Unit price'}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {lang === 'cs' ? 'DPH %' : 'VAT %'}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {lang === 'cs' ? 'Celkem' : 'Total'}
                      </div>
                      <div />
                    </div>
                    {items.map((it, i) => (
                      <div key={it.id || i} className='ap-items__row'>
                        <input
                          className='ap-input'
                          placeholder={
                            lang === 'cs'
                              ? 'Popis (např. Konzultace UX designu)'
                              : 'Description (e.g. UX design consulting)'
                          }
                          value={it.name}
                          onChange={(e) =>
                            updateItem(i, 'name', e.target.value)
                          }
                        />
                        <input
                          className='ap-input'
                          type='number'
                          value={it.qty}
                          onChange={(e) =>
                            updateItem(
                              i,
                              'qty',
                              parseFloat(e.target.value) || 0,
                            )
                          }
                        />
                        <select
                          className='ap-select'
                          value={(it as any).unit || 'h'}
                          onChange={(e) =>
                            updateItem(i, 'unit', e.target.value)
                          }
                        >
                          <option value='h'>{lang === 'cs' ? 'h' : 'h'}</option>
                          <option value='ks'>
                            {lang === 'cs' ? 'ks' : 'pcs'}
                          </option>
                          <option value='m'>
                            {lang === 'cs' ? 'měsíc' : 'month'}
                          </option>
                        </select>
                        <input
                          className='ap-input'
                          type='number'
                          value={it.price}
                          onChange={(e) =>
                            updateItem(
                              i,
                              'price',
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          style={{ textAlign: 'right' }}
                        />
                        <select
                          className='ap-select'
                          value={String(it.taxRate || 0)}
                          onChange={(e) =>
                            updateItem(i, 'taxRate', parseFloat(e.target.value))
                          }
                        >
                          <option value='21'>21</option>
                          <option value='15'>15</option>
                          <option value='12'>12</option>
                          <option value='0'>0</option>
                        </select>
                        <div className='num'>{money(it.total)}</div>
                        <button
                          type='button'
                          className='ap-items__remove'
                          onClick={() => handleDeleteRow(i)}
                          aria-label={lang === 'cs' ? 'Odstranit' : 'Remove'}
                        >
                          <X size={ICON_SM} strokeWidth={STROKE} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type='button'
                    className='ap-items__add'
                    onClick={addItem}
                  >
                    {lang === 'cs' ? '+ Přidat položku' : '+ Add line item'}
                  </button>

                  {/* Totals */}
                  <div className='ap-totals'>
                    <div className='ap-totals__row'>
                      <span className='label'>
                        {lang === 'cs' ? 'Mezisoučet' : 'Subtotal'}
                      </span>
                      <span className='num'>{formData.taxBase}</span>
                    </div>
                    <div className='ap-totals__row'>
                      <span className='label'>
                        {lang === 'cs' ? 'DPH' : 'VAT'}
                      </span>
                      <span className='num'>{formData.taxAmount}</span>
                    </div>
                    <div className='ap-totals__row ap-totals__row--grand'>
                      <span>
                        {lang === 'cs' ? 'Celkem k úhradě' : 'Total to be paid'}
                      </span>
                      <span className='num'>
                        {formData.amount} {formData.currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment card */}
                <div className='ap-card'>
                  <h3 className='ap-card__title'>
                    <Wallet size={ICON_MD} strokeWidth={STROKE} />
                    {lang === 'cs' ? 'Platba' : 'Payment'}
                  </h3>
                  {bankAccounts.length > 0 && (
                    <div className='ap-field' style={{ marginBottom: 12 }}>
                      <label>
                        {lang === 'cs' ? 'Bankovní účet' : 'Bank account'}
                      </label>
                      <select
                        className='ap-select'
                        value=''
                        onChange={handleSelectBankAccount}
                      >
                        <option value=''>
                          {lang === 'cs'
                            ? '— vybrat uložený účet —'
                            : '— pick a saved account —'}
                        </option>
                        {bankAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className='ap-grid ap-grid--2'>
                    <div className='ap-field'>
                      <label>
                        {lang === 'cs' ? 'Číslo účtu' : 'Account number'}
                      </label>
                      <input
                        className='ap-input'
                        name='accountNumber'
                        value={
                          formData.prefix
                            ? `${formData.prefix}-${formData.accountNumber}`
                            : formData.accountNumber
                        }
                        onChange={handleAccountNumberChange}
                        onPaste={handlePasteBank}
                        placeholder={
                          lang === 'cs' ? '19-2000145399' : '2000145399'
                        }
                        inputMode='numeric'
                      />
                    </div>
                    <div className='ap-field'>
                      <label>{lang === 'cs' ? 'Kód banky' : 'Bank code'}</label>
                      <select
                        className='ap-select'
                        name='bankCode'
                        value={formData.bankCode}
                        onChange={handleChange}
                      >
                        <option value=''>
                          {lang === 'cs'
                            ? '— vyberte banku —'
                            : '— select bank —'}
                        </option>
                        {Object.entries(BANK_CODES).map(([code, info]) => (
                          <option key={code} value={code}>
                            {code} — {info.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className='ap-field'>
                      <label>IBAN</label>
                      <input
                        className='ap-input'
                        name='iban'
                        value={formData.iban}
                        onChange={handleChange}
                        onPaste={handlePasteBank}
                        placeholder='CZ...'
                      />
                    </div>
                    <div className='ap-field'>
                      <label>BIC / SWIFT</label>
                      <input
                        className='ap-input'
                        name='bic'
                        value={formData.bic}
                        onChange={handleChange}
                      />
                    </div>
                    <div className='ap-field'>
                      <label>
                        {lang === 'cs'
                          ? 'Variabilní symbol'
                          : 'Variable symbol'}
                      </label>
                      <input
                        className='ap-input'
                        name='variableSymbol'
                        value={formData.variableSymbol}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  {/* Exchange rate & reverse charge */}
                  {(formData.reverseChargeText ||
                    (formData.exchangeRate &&
                      formData.exchangeRate !== '1.0000')) && (
                    <div
                      style={{
                        marginTop: 14,
                        display: 'grid',
                        gap: 8,
                        fontSize: 13,
                        color: 'var(--muted)',
                      }}
                    >
                      {formData.reverseChargeText && (
                        <div className='form-info-banner'>
                          <RefreshCw
                            size={12}
                            strokeWidth={2}
                            style={{ flexShrink: 0 }}
                          />
                          <strong>{t.reverseCharge}:</strong>{' '}
                          {formData.reverseChargeText} (VAT 0%)
                        </div>
                      )}
                      {formData.exchangeRate &&
                        formData.exchangeRate !== '1.0000' && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <ArrowLeftRight
                              size={12}
                              strokeWidth={2}
                              style={{ flexShrink: 0 }}
                            />
                            {t.exchangeRate}: 1 {formData.currency} ={' '}
                            {formData.exchangeRate}{' '}
                            {defaultSupplier?.region === 'SK' ? 'EUR' : 'CZK'}
                          </div>
                        )}
                    </div>
                  )}
                </div>

                {/* Note card */}
                <div className='ap-card'>
                  <h3 className='ap-card__title'>
                    <Pencil size={ICON_MD} strokeWidth={STROKE} />
                    {lang === 'cs' ? 'Poznámka' : 'Note'}
                  </h3>
                  <textarea
                    className='ap-textarea'
                    name='paymentNote'
                    value={formData.paymentNote}
                    onChange={handleChange}
                    placeholder={
                      lang === 'cs'
                        ? 'Děkujeme za spolupráci...'
                        : 'Thank you for working with us...'
                    }
                  />
                </div>

                {/* Summary */}
                {summaryCard}

                {/* Action bar */}
                <div className='ap-action-bar ap-action-bar--mobile-stack'>
                  <button
                    type='button'
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, status: 'draft' }))
                    }
                    className='ap-btn ap-btn--ghost'
                  >
                    {lang === 'cs' ? 'Uložit jako rozepsanou' : 'Save as draft'}
                  </button>
                  <button
                    type='button'
                    onClick={(e) => {
                      e.preventDefault();
                      setPreviewMode(true);
                    }}
                    className='ap-btn ap-btn--secondary'
                  >
                    <Eye size={ICON_MD} strokeWidth={STROKE} />{' '}
                    {lang === 'cs' ? 'Náhled PDF' : 'PDF preview'}
                  </button>
                  <button
                    type='button'
                    onClick={handleEmailPDF}
                    disabled={isGenerating || !isAuthenticated}
                    className='ap-btn ap-btn--secondary'
                  >
                    <Send size={ICON_MD} strokeWidth={STROKE} />{' '}
                    {emailStatus ||
                      (lang === 'cs' ? 'Odeslat e-mailem' : 'Send by email')}
                  </button>
                  <button
                    type='submit'
                    className='ap-btn ap-btn--primary ap-btn--lg'
                  >
                    <Save size={ICON_MD} strokeWidth={STROKE} /> {t.saveInvoice}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
