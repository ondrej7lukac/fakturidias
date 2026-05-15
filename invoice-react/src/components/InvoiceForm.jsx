import { useState, useEffect, useRef } from 'react';
import './InvoiceForm.css';
import {
  formatInvoiceNumber,
  addDays,
  formatDate,
  money,
  getUserId,
} from '../utils/storage';
import { searchAres, parseAresItem } from '../utils/ares';

import ItemsTable from './ItemsTable';
import InvoicePreview from './InvoicePreview';
import { generateInvoicePDF } from '../utils/pdf';
import {
  BANK_CODES,
  calculateIban,
  parseIban,
  getCzechQrPayload,
} from '../utils/bank';
import { QRCodeCanvas } from 'qrcode.react';
import QRCode from 'qrcode';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Textarea } from './ui/textarea';

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
}) {
  const createLocalId = () => {
    if (typeof globalThis !== 'undefined') {
      const c = globalThis.crypto;
      if (c?.randomUUID) {
        return c.randomUUID();
      }
      if (c?.getRandomValues) {
        const bytes = new Uint8Array(16);
        c.getRandomValues(bytes);
        // RFC4122 v4 bits
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0'));
        return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
          .slice(6, 8)
          .join(
            '',
          )}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
      }
    }
    return `id-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  };

  const qrCanvasRef = useRef(null);
  const [formData, setFormData] = useState({
    invoiceNumber: '',
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
    taxBase: '0.00',
    taxRate: '21',
    taxAmount: '0.00',
  });

  const [items, setItems] = useState([]);
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
  const [previewMode, setPreviewMode] = useState(false);
  const [savedItems, setSavedItems] = useState([]);
  const [savedCustomers, setSavedCustomers] = useState([]);
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [saveTimer, setSaveTimer] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [showValidation, setShowValidation] = useState(false);
  const [saveState, setSaveState] = useState('idle');

  const stateRef = useRef({ formData, items });
  const itemSuggestionsRef = useRef(null);
  // Stable ID for this new-invoice session — generated once, reused across all auto-saves
  const newInvoiceIdRef = useRef(null);

  useEffect(() => {
    stateRef.current = { formData, items };
  }, [formData, items]);

  useEffect(() => {
    if (showValidation) {
      setValidationErrors(validateForm(formData, items));
    }
  }, [formData, items, showValidation]);

  // Close item suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        itemSuggestionsRef.current &&
        !itemSuggestionsRef.current.contains(event.target)
      ) {
        setItemSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const validateForm = (currentFormData = formData, currentItems = items) => {
    const errors = {};

    if (!currentFormData.supplierName?.trim()) {
      errors.supplierName =
        t.validationRequired ||
        (lang === 'cs' ? 'Toto pole je povinné.' : 'This field is required.');
    }
    if (!currentFormData.supplierAddress?.trim()) {
      errors.supplierAddress =
        t.validationRequired ||
        (lang === 'cs' ? 'Toto pole je povinné.' : 'This field is required.');
    }
    if (!currentFormData.clientName?.trim()) {
      errors.clientName =
        t.validationRequired ||
        (lang === 'cs' ? 'Toto pole je povinné.' : 'This field is required.');
    }
    if (
      currentFormData.clientEmail?.trim() &&
      !isValidEmail(currentFormData.clientEmail.trim())
    ) {
      errors.clientEmail =
        t.validationEmail ||
        (lang === 'cs' ? 'Zadej platný email.' : 'Enter a valid email.');
    }
    if (
      currentFormData.clientEmailCopy?.trim() &&
      !isValidEmail(currentFormData.clientEmailCopy.trim())
    ) {
      errors.clientEmailCopy =
        t.validationEmail ||
        (lang === 'cs' ? 'Zadej platný email.' : 'Enter a valid email.');
    }
    if (
      currentFormData.issueDate &&
      currentFormData.dueDate &&
      new Date(currentFormData.dueDate) < new Date(currentFormData.issueDate)
    ) {
      errors.dueDate =
        t.validationDueBeforeIssue ||
        (lang === 'cs'
          ? 'Splatnost musí být stejné nebo pozdější datum než vystavení.'
          : 'Due date must be on or after issue date.');
    }
    if (!currentItems || currentItems.length === 0) {
      errors.items =
        t.validationItemRequired ||
        (lang === 'cs'
          ? 'Přidej alespoň jednu položku.'
          : 'Add at least one item.');
    }

    return errors;
  };

  const getFieldError = (fieldName) =>
    showValidation ? validationErrors[fieldName] : '';

  const getFieldClassName = (fieldName) =>
    showValidation && validationErrors[fieldName] ? 'input-error' : '';

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
      const ibanData = parseIban(invoice.payment.iban || '');
      setFormData({
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate || '',
        taxableSupplyDate: invoice.taxableSupplyDate || '',
        status: invoice.status,
        category: invoice.category || '',
        clientName: invoice.client.name,
        clientEmail: invoice.client.email || '',
        clientEmailCopy: invoice.client.emailCopy || '',
        clientPhone: invoice.client.phone || '',
        clientArea: invoice.client.area || '',
        clientIco: invoice.client.ico || '',
        clientVat: invoice.client.vat || '',
        clientAddress: invoice.client.address || '',
        currency: invoice.currency,
        amount: money(invoice.amount),
        iban: invoice.payment.iban || '',
        bic: invoice.payment.bic || '',
        paymentNote: invoice.payment.note || '',
        accountNumber: ibanData?.accountNumber || '',
        bankCode: ibanData?.bankCode || '',
        prefix: ibanData?.prefix || '',
        variableSymbol:
          invoice.payment.variableSymbol ||
          invoice.invoiceNumber.replace(/\D/g, ''),
        supplierName: invoice.supplier?.name || '',
        supplierIco: invoice.supplier?.ico || '',
        supplierVat: invoice.supplier?.vat || '',
        supplierAddress: invoice.supplier?.address || '',
        supplierRegistry: invoice.supplier?.registry || '',
        supplierPhone: invoice.supplier?.phone || '',
        supplierEmail: invoice.supplier?.email || '',
        supplierWebsite: invoice.supplier?.website || '',
        isVatPayer: invoice.isVatPayer || false,
        taxBase: invoice.taxBase || '0.00',
        taxRate: invoice.taxRate || '21',
        taxAmount: invoice.taxAmount || '0.00',
      });
      setItems(invoice.items || []);
    } else {
      // Switching to new invoice mode — reset everything
      if (!newInvoiceIdRef.current) {
        newInvoiceIdRef.current = createLocalId();
      }
      const today = new Date();
      setFormData((prev) => ({
        // Keep only layout/supplier defaults, reset client/invoice-specific fields
        invoiceNumber: prev.invoiceNumber || '...',
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
      const newNumber = formatInvoiceNumber(invoiceCounter);
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
      taxRate: prev.taxRate || defaultSupplier.taxRate || '21',
      // Never touch: invoiceNumber, client fields, items, dates, status
    }));
  }, [defaultSupplier]); // ← only runs when supplier profile changes

  useEffect(() => {
    const total = items.reduce((sum, item) => sum + item.total, 0);
    setFormData((prev) => ({ ...prev, amount: money(total) }));
  }, [items]);

  useEffect(() => {
    let updates = {};
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
      setSaveState('saving');

      Promise.resolve(onSave(invoiceData, { autoSave: true }))
        .then(() => {
          if (invoiceData.client && invoiceData.client.name) {
            fetch('/api/customers', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': getUserId(),
              },
              body: JSON.stringify({ customer: invoiceData.client }),
            }).catch((e) => console.error(e));
          }
          setSaveState('saved');
          setTimeout(() => setSaveState('idle'), 1400);
        })
        .catch(() => {
          setSaveState('error');
        });
    }, 1000);
    setSaveTimer(timer);
  };

  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const resItems = await fetch('/api/items', {
          headers: { 'x-user-id': getUserId() },
        });
        if (resItems.ok) {
          const data = await resItems.json();
          setSavedItems(data.items || []);
        }
        const resCust = await fetch('/api/customers', {
          headers: { 'x-user-id': getUserId() },
        });
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
      id: invoice?.id || newInvoiceIdRef.current,
      invoiceNumber: currentFormData.invoiceNumber.trim(),
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

  const handlePasteBank = (e) => {
    const text = e.clipboardData.getData('text').trim();
    if (!text) return;
    const cleanIban = text.replace(/\s/g, '').toUpperCase();
    if (/^[A-Z]{2}\d{10,}/.test(cleanIban)) {
      e.preventDefault();
      const parsed = parseIban(cleanIban);
      const bankInfo = BANK_CODES[parsed.bankCode];
      setFormData((prev) => ({
        ...prev,
        iban: cleanIban,
        bankCode: parsed.bankCode || prev.bankCode,
        prefix: parsed.prefix || prev.prefix,
        accountNumber: parsed.accountNumber || prev.accountNumber,
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const nextData = { ...prev, [name]: value };
      if (showValidation) {
        setValidationErrors(validateForm(nextData, items));
      }
      return nextData;
    });
  };

  // Debounce reference for ARES
  const aresDebounceRef = useRef(null);

  const handleClientNameChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, clientName: value }));

    if (value.trim().length > 0) {
      // 1. Saved Customers (Instant)
      const matches = savedCustomers
        .filter((c) => c.name.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5)
        .map((c) => ({ ...c, source: 'saved' }));
      setCustomerSuggestions(matches);

      // 2. ARES Search (Debounced)
      if (value.trim().length >= 3) {
        if (aresDebounceRef.current) clearTimeout(aresDebounceRef.current);
        aresDebounceRef.current = setTimeout(() => {
          searchAres(value).then((aresResults) => {
            const aresMatches = aresResults.map((item) => {
              const parsed = parseAresItem(item);
              return { ...parsed, source: 'ares' };
            });
            setCustomerSuggestions((prev) => {
              // Deduplicate by name
              const existingNames = new Set(prev.map((p) => p.name));
              const newAres = aresMatches
                .filter((a) => !existingNames.has(a.name))
                .slice(0, 3);
              return [...prev, ...newAres];
            });
          });
        }, 500);
      }
    } else {
      setCustomerSuggestions([]);
    }
  };

  const handleSelectCustomer = (customer) => {
    setFormData((prev) => ({
      ...prev,
      clientName: customer.name,
      clientEmail: customer.email || '',
      clientEmailCopy: customer.emailCopy || '',
      clientPhone: customer.phone || '',
      clientIco: customer.ico || '',
      clientVat: customer.vat || '',
      clientAddress: customer.address || '',
      clientArea: customer.city || customer.area || '',
    }));
    setCustomerSuggestions([]);
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
      id: createLocalId(),
      name: itemInput.name.trim(),
      qty,
      price: basePrice,
      discount,
      taxRate,
      taxAmount,
      subtotal,
      total,
    };

    console.log('[InvoiceForm] Adding item:', newItem);
    setItems([...items, newItem]);

    try {
      await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': getUserId(),
        },
        body: JSON.stringify({
          item: {
            name: newItem.name,
            price: basePrice,
            taxRate,
          },
        }),
      });
      const response = await fetch('/api/items', {
        headers: { 'x-user-id': getUserId() },
      });
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

  const handleItemNameChange = (value) => {
    setItemInput((prev) => ({ ...prev, name: value }));
    if (value.trim().length > 0) {
      const itemsToFilter = Array.isArray(savedItems) ? savedItems : [];
      const matches = itemsToFilter
        .filter((item) => item.name.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5);
      setItemSuggestions(matches);
    } else {
      setItemSuggestions([]);
    }
  };

  const handleSelectSuggestion = (item) => {
    setItemInput((prev) => ({
      ...prev,
      name: item.name,
      price: item.price || 0,
      taxRate: item.taxRate || '21',
    }));
    setItemSuggestions([]);
  };

  const handleDeleteRow = (index) => {
    if (window.confirm(lang === 'cs' ? 'Smazat položku?' : 'Delete item?')) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
      handleBlurSave();
    }
  };

  const handleItemTotalChange = (e) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Ensure we use the very latest state from stateRef for saving
    const data = stateRef.current;
    const invoiceData = getCurrentInvoiceData(data.formData, data.items);
    const errors = validateForm(data.formData, data.items);
    setShowValidation(true);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      setSaveState('error');
      return;
    }

    try {
      setSaveState('saving');
      await Promise.resolve(onSave(invoiceData));
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1600);
      setDefaultSupplier(invoiceData.supplier);
    } catch (e) {
      setSaveState('error');
    }
  };

  const handleMarkPaid = () => {
    if (!invoice) return; // Safety: can't mark unsaved new invoice as paid
    // Use invoice PROP (source of truth from DB), NOT formData
    // formData may still be from previous invoice if Effect 1 hasn't re-rendered yet
    const updatedData = { ...invoice, status: 'paid' };
    setFormData((prev) => ({ ...prev, status: 'paid' }));
    onSave(updatedData);
  };

  const handleAresData = (data) => {
    setFormData((prev) => ({
      ...prev,
      clientName: data.name || prev.clientName,
      clientAddress: data.address || prev.clientAddress,
      clientIco: data.ico || prev.clientIco,
      clientArea: data.city || prev.clientArea,
      clientVat: data.vat || prev.clientVat,
    }));
  };

  const handleDownloadPDF = async () => {
    const snapshot = stateRef.current;
    const currentData = getCurrentInvoiceData(
      snapshot.formData,
      snapshot.items,
    );
    setIsGenerating(true);
    try {
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
      pdf.save(`${currentData.invoiceNumber}.pdf`);
    } catch (error) {
      alert('Failed to generate PDF');
    }
    setIsGenerating(false);
  };

  // handleEmailPDF removed for production deployment

  const handleBackupToDrive = async () => {
    if (!isAuthenticated) {
      return alert(
        lang === 'cs'
          ? 'Pro zálohování na Google Drive se musíte přihlásit.'
          : 'You must be logged in to backup to Google Drive.',
      );
    }
    const snapshot = stateRef.current;
    const currentData = getCurrentInvoiceData(
      snapshot.formData,
      snapshot.items,
    );
    setIsGenerating(true);
    setEmailStatus(lang === 'cs' ? 'Zálohování...' : 'Backing up...');
    try {
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
      const pdfBase64 = pdf.output('datauristring');

      const response = await fetch('/api/drive/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice: currentData,
          pdfBase64: pdfBase64,
        }),
      });
      if (response.ok) {
        alert(
          lang === 'cs' ? 'Uloženo na Google Drive!' : 'Saved to Google Drive!',
        );
      } else {
        const result = await response.json();
        alert(`Backup failed: ${result.message || result.error}`);
      }
    } catch (error) {
      alert(t.alertError);
    }
    setIsGenerating(false);
    setEmailStatus('');
  };

  const togglePreview = () => setPreviewMode(!previewMode);

  return (
    <section className='card invoice-form-card'>
      <div className='invoice-form-header-row'>
        <div>
          <h2 className='invoice-form-title'>{t.createEditInvoice}</h2>
          <p className='invoice-form-subtitle'>
            {t.formSubtitle ||
              (lang === 'cs'
                ? 'Vyplnujte postupne shora dolu, formular se prubezne uklada.'
                : 'Fill top to bottom, your draft is saved continuously.')}
          </p>
          <p className={`invoice-save-state invoice-save-state-${saveState}`}>
            {saveState === 'saving' &&
              (t.autosaveSaving ||
                (lang === 'cs' ? 'Prubezne ukladam...' : 'Saving...'))}
            {saveState === 'saved' &&
              (t.autosaveSaved || (lang === 'cs' ? 'Ulozeno' : 'Saved'))}
            {saveState === 'error' &&
              (t.autosaveError ||
                (lang === 'cs'
                  ? 'Zkontroluj vyplnena pole.'
                  : 'Please check the highlighted fields.'))}
          </p>
        </div>
        <Button
          type='button'
          onClick={togglePreview}
          className='secondary invoice-form-preview-toggle'
          variant='secondary'
          size='sm'
        >
          {previewMode
            ? `✏️ ${t.editView || (lang === 'cs' ? 'Upravit' : 'Edit')}`
            : `👁️ ${t.previewView || (lang === 'cs' ? 'Nahled' : 'Preview')}`}
        </Button>
      </div>

      <style>{`
                input[type="number"]::-webkit-inner-spin-button,
                input[type="number"]::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                input[type="number"] {
                    -moz-appearance: textfield;
                }
            `}</style>

      {previewMode ? (
        <>
          <InvoicePreview invoice={getCurrentInvoiceData()} t={t} lang={lang} />
          <div className='actions invoice-form-actions-row invoice-form-actions-row-preview'>
            <Button
              type='button'
              onClick={(e) => {
                e.preventDefault();
                onSave(getCurrentInvoiceData());
              }}
              className='primary'
            >
              {t.saveInvoice}
            </Button>
            <Button
              type='button'
              onClick={(e) => {
                e.preventDefault();
                setPreviewMode(false);
              }}
              className='secondary'
              variant='secondary'
            >
              ✏️ {t.editView || (lang === 'cs' ? 'Upravit' : 'Edit')}
            </Button>
            <Button
              type='button'
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className='secondary'
              variant='secondary'
            >
              {isGenerating && !emailStatus ? t.alertGenerating : t.downloadPdf}
            </Button>
            <Button
              type='button'
              onClick={handleBackupToDrive}
              disabled={isGenerating}
              className='secondary'
              variant='secondary'
            >
              {emailStatus
                ? emailStatus
                : t.backupToDrive ||
                  (lang === 'cs' ? '☁️ Zaloha na Drive' : '☁️ Backup to Drive')}
            </Button>
            <Button
              type='button'
              onClick={handleMarkPaid}
              className='secondary invoice-form-action-edge'
              variant='secondary'
            >
              {t.markPaid}
            </Button>
          </div>
        </>
      ) : (
        <form
          onSubmit={handleSubmit}
          onBlur={handleInputBlur}
          className='grid invoice-form-grid'
        >
          <div className='grid two'>
            <div>
              <label>{t.invoiceNumber}</label>
              <Input
                name='invoiceNumber'
                value={formData.invoiceNumber}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label>{t.issueDate}</label>
              <Input
                name='issueDate'
                type='date'
                value={formData.issueDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className='grid two'>
            <div>
              <label>{t.dueDate}</label>
              <Input
                name='dueDate'
                type='date'
                value={formData.dueDate}
                onChange={handleChange}
                className={getFieldClassName('dueDate')}
              />
              {getFieldError('dueDate') ? (
                <p className='field-error'>{getFieldError('dueDate')}</p>
              ) : null}
            </div>
            <div>
              <label>{lang === 'cs' ? 'DUZP' : 'DUZP'}</label>
              <Input
                name='taxableSupplyDate'
                type='date'
                value={formData.taxableSupplyDate || formData.issueDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className='grid two'>
            <div>
              <label>{t.status}</label>
              <Select
                name='status'
                value={formData.status}
                onChange={handleChange}
              >
                <option value='draft'>{t.draft}</option>
                <option value='sent'>{t.sent}</option>
                <option value='paid'>{t.paid}</option>
                <option value='overdue'>{t.overdue}</option>
              </Select>
            </div>
            <div>
              <label>{t.category}</label>
              <Select
                name='category'
                value={formData.category}
                onChange={handleChange}
              >
                <option value=''>{t.all}</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label>{t.addCategory}</label>
            <div className='actions invoice-inline-actions'>
              <Input
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), handleAddCategory())
                }
                placeholder={
                  t.newCategoryPlaceholder ||
                  (lang === 'cs'
                    ? 'napr. Marketing, Sluzby...'
                    : 'e.g. Marketing, Services...')
                }
              />
              <Button
                type='button'
                onClick={handleAddCategory}
                className='secondary'
                variant='secondary'
                size='sm'
              >
                {t.add}
              </Button>
            </div>
          </div>

          <h3 className='form-section-title'>{t.issuer}</h3>
          <div className='grid two'>
            <div>
              <label>{t.supplierName}</label>
              <Input
                name='supplierName'
                value={formData.supplierName}
                onChange={handleChange}
                placeholder='Vaše firma s.r.o.'
                className={getFieldClassName('supplierName')}
              />
              {getFieldError('supplierName') ? (
                <p className='field-error'>{getFieldError('supplierName')}</p>
              ) : null}
            </div>
            <div>
              <label>{t.supplierIco}</label>
              <Input
                name='supplierIco'
                value={formData.supplierIco}
                onChange={handleChange}
                placeholder='12345678'
              />
            </div>
          </div>
          <div className='grid two'>
            <div>
              <label>{t.supplierVat}</label>
              <Input
                name='supplierVat'
                value={formData.supplierVat}
                onChange={handleChange}
                placeholder='CZ12345678'
              />
            </div>
            <div>
              <label>{t.supplierAddress}</label>
              <Input
                name='supplierAddress'
                value={formData.supplierAddress}
                onChange={handleChange}
                placeholder='Ulice 123, Praha'
                className={getFieldClassName('supplierAddress')}
              />
              {getFieldError('supplierAddress') ? (
                <p className='field-error'>
                  {getFieldError('supplierAddress')}
                </p>
              ) : null}
            </div>
          </div>
          <div>
            <label>
              {lang === 'cs' ? 'Zápis v rejstříku' : 'Registry Entry'}
            </label>
            <Input
              name='supplierRegistry'
              value={formData.supplierRegistry}
              onChange={handleChange}
            />
          </div>

          <div className='grid two'>
            <div>
              <label>{lang === 'cs' ? 'Telefon' : 'Phone'}</label>
              <Input
                name='supplierPhone'
                value={formData.supplierPhone}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>Email</label>
              <Input
                name='supplierEmail'
                type='email'
                value={formData.supplierEmail}
                onChange={handleChange}
              />
            </div>
          </div>
          <div>
            <label>{t.websiteLabel || 'Web'}</label>
            <Input
              name='supplierWebsite'
              value={formData.supplierWebsite}
              onChange={handleChange}
              placeholder='https://'
            />
          </div>

          <div className='invoice-vat-box'>
            <div className='invoice-vat-header'>
              <input
                type='checkbox'
                name='isVatPayer'
                id='isVatPayer'
                checked={formData.isVatPayer}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isVatPayer: e.target.checked,
                  }))
                }
                className='invoice-vat-checkbox'
              />
              <label htmlFor='isVatPayer' className='invoice-vat-label'>
                {t.vatPayerLabel ||
                  (lang === 'cs' ? 'Jsem platce DPH' : 'I am a VAT payer')}
              </label>
            </div>

            {formData.isVatPayer && (
              <div className='grid three'>
                <div>
                  <label>{lang === 'cs' ? 'Základ daně' : 'Tax Base'}</label>
                  <Input
                    name='taxBase'
                    type='number'
                    step='0.01'
                    value={formData.taxBase}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label>
                    {lang === 'cs' ? 'Sazba DPH (%)' : 'VAT Rate (%)'}
                  </label>
                  <Select
                    name='taxRate'
                    value={formData.taxRate}
                    onChange={handleChange}
                  >
                    <option value='21'>21%</option>
                    <option value='15'>15%</option>
                    <option value='12'>12%</option>
                  </Select>
                </div>
                <div>
                  <label>{lang === 'cs' ? 'Výše daně' : 'Tax Amount'}</label>
                  <Input
                    name='taxAmount'
                    type='number'
                    step='0.01'
                    value={formData.taxAmount}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}
          </div>

          <h3 className='form-section-title'>{t.client}</h3>
          <div className='grid two'>
            <div>
              <label>{t.clientName}</label>
              <div className='form-suggest-wrap'>
                <Input
                  name='clientName'
                  value={formData.clientName}
                  onChange={handleClientNameChange}
                  onBlur={handleInputBlur}
                  placeholder={
                    t.clientLookupPlaceholder ||
                    (lang === 'cs'
                      ? 'Zadej nazev firmy nebo ICO pro rychle vyhledani...'
                      : 'Enter company name or business ID for quick lookup...')
                  }
                  autoComplete='off'
                  className={getFieldClassName('clientName')}
                />
                {customerSuggestions.length > 0 && (
                  <ul className='suggestions form-suggestions-list'>
                    {customerSuggestions.map((c, i) => (
                      <li
                        key={i}
                        onClick={() => handleSelectCustomer(c)}
                        className='form-suggestion-item'
                      >
                        <div className='form-suggestion-head'>
                          <b>{c.name}</b>
                          <small className='form-suggestion-source'>
                            {c.source === 'ares' ? 'ARES' : 'Saved'}
                          </small>
                        </div>
                        <small>
                          {c.ico && `IČO: ${c.ico}`} {c.email && `| ${c.email}`}
                        </small>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {getFieldError('clientName') ? (
                <p className='field-error'>{getFieldError('clientName')}</p>
              ) : null}
            </div>
            <div>
              <label>{t.clientAddress}</label>
              <Input
                name='clientAddress'
                value={formData.clientAddress}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className='grid three'>
            <div>
              <label>{t.clientIco}</label>
              <Input
                name='clientIco'
                value={formData.clientIco}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>{t.clientVat}</label>
              <Input
                name='clientVat'
                value={formData.clientVat}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>{t.clientArea}</label>
              <Input
                name='clientArea'
                value={formData.clientArea}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className='grid three'>
            <div>
              <label>Email</label>
              <Input
                name='clientEmail'
                type='email'
                value={formData.clientEmail}
                onChange={handleChange}
                className={getFieldClassName('clientEmail')}
              />
              {getFieldError('clientEmail') ? (
                <p className='field-error'>{getFieldError('clientEmail')}</p>
              ) : null}
            </div>
            <div>
              <label>{t.emailCopyLabel || 'Email (CC)'}</label>
              <Input
                name='clientEmailCopy'
                type='email'
                value={formData.clientEmailCopy}
                onChange={handleChange}
                className={getFieldClassName('clientEmailCopy')}
              />
              {getFieldError('clientEmailCopy') ? (
                <p className='field-error'>
                  {getFieldError('clientEmailCopy')}
                </p>
              ) : null}
            </div>
            <div>
              <label>{lang === 'cs' ? 'Telefon' : 'Phone'}</label>
              <Input
                name='clientPhone'
                value={formData.clientPhone}
                onChange={handleChange}
                placeholder='+420...'
              />
            </div>
          </div>

          <h3 className='form-section-title'>{t.items}</h3>

          <div className='add-item-form grid form-item-grid invoice-item-builder-grid'>
            <div className='form-suggest-wrap' ref={itemSuggestionsRef}>
              <label>{t.item}</label>
              <Input
                value={itemInput.name}
                onChange={(e) => handleItemNameChange(e.target.value)}
                placeholder={t.itemPlaceholder}
              />
              {itemSuggestions.length > 0 && (
                <ul className='suggestions form-suggestions-list form-suggestions-list-compact'>
                  {itemSuggestions.map((s, i) => (
                    <li
                      key={i}
                      onClick={() => handleSelectSuggestion(s)}
                      className='form-suggestion-item form-suggestion-item-compact'
                    >
                      {s.name}{' '}
                      <small className='form-suggestion-source'>
                        ({s.price} {formData.currency})
                      </small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label>
                {t.priceExTaxLabel ||
                  (lang === 'cs' ? 'Cena (bez dane)' : 'Price (ex. tax)')}
              </label>
              <Input
                type='number'
                placeholder='0'
                value={itemInput.price}
                onChange={(e) => {
                  const price = e.target.value;
                  const qty = Number(itemInput.qty) || 1;
                  const taxRate = formData.isVatPayer
                    ? Number(itemInput.taxRate) || 0
                    : 0;
                  const discountPct = Number(itemInput.discount) || 0;
                  const priceAfterDiscount =
                    Number(price) * (1 - discountPct / 100);
                  const sub = priceAfterDiscount * qty;
                  const total = sub * (1 + taxRate / 100);
                  setItemInput((prev) => ({
                    ...prev,
                    price,
                    total: total.toFixed(2),
                  }));
                }}
              />
            </div>
            <div>
              <label>{lang === 'cs' ? 'DPH %' : 'Tax %'}</label>
              <Select
                value={itemInput.taxRate}
                onChange={(e) => {
                  const taxRate = e.target.value;
                  const qty = Number(itemInput.qty) || 1;
                  const price = Number(itemInput.price) || 0;
                  const discountPct = Number(itemInput.discount) || 0;
                  const priceAfterDiscount = price * (1 - discountPct / 100);
                  const sub = priceAfterDiscount * qty;
                  const total = sub * (1 + Number(taxRate) / 100);
                  setItemInput((prev) => ({
                    ...prev,
                    taxRate,
                    total: total.toFixed(2),
                  }));
                }}
              >
                {!formData.isVatPayer ? (
                  <>
                    <option value='0'>0%</option>
                    <option value='21'>21%</option>
                    <option value='15'>15%</option>
                    <option value='12'>12%</option>
                  </>
                ) : (
                  <>
                    <option value='21'>21%</option>
                    <option value='15'>15%</option>
                    <option value='12'>12%</option>
                    <option value='0'>0%</option>
                  </>
                )}
              </Select>
            </div>
            <div>
              <label>{lang === 'cs' ? 'Sleva %' : 'Discount %'}</label>
              <Select
                value={itemInput.discount}
                onChange={(e) => {
                  const discountPct = e.target.value;
                  const qty = Number(itemInput.qty) || 1;
                  const price = Number(itemInput.price) || 0;
                  const taxRate = Number(itemInput.taxRate) || 0;
                  const priceAfterDiscount =
                    price * (1 - Number(discountPct) / 100);
                  const sub = priceAfterDiscount * qty;
                  const total = sub * (1 + taxRate / 100);
                  setItemInput((prev) => ({
                    ...prev,
                    discount: discountPct,
                    total: total.toFixed(2),
                  }));
                }}
              >
                <option value='0'>0%</option>
                <option value='5'>5%</option>
                <option value='10'>10%</option>
                <option value='15'>15%</option>
                <option value='20'>20%</option>
                <option value='25'>25%</option>
                <option value='50'>50%</option>
              </Select>
            </div>
            <div>
              <label>
                {t.totalInclTaxLabel ||
                  (lang === 'cs' ? 'Celkem (s dani)' : 'Total (incl. tax)')}
              </label>
              <Input
                type='number'
                placeholder='0'
                value={itemInput.total}
                onChange={handleItemTotalChange}
              />
            </div>
          </div>

          <div className='invoice-item-builder-actions'>
            <div className='qty-stepper'>
              <Button
                type='button'
                onClick={() =>
                  setItemInput((prev) => ({
                    ...prev,
                    qty: Math.max(1, prev.qty - 1),
                  }))
                }
                className='qty-stepper-btn'
                variant='ghost'
                size='sm'
              >
                −
              </Button>
              <span className='qty-stepper-value'>{itemInput.qty}</span>
              <Button
                type='button'
                onClick={() =>
                  setItemInput((prev) => ({ ...prev, qty: prev.qty + 1 }))
                }
                className='qty-stepper-btn'
                variant='ghost'
                size='sm'
              >
                +
              </Button>
            </div>
            <Button
              type='button'
              onClick={handleAddItem}
              className='secondary'
              variant='secondary'
              size='sm'
            >
              {t.addItem}
            </Button>
          </div>

          <ItemsTable
            items={items}
            lang={lang}
            t={t}
            onDelete={handleDeleteRow}
          />
          {getFieldError('items') ? (
            <p className='field-error field-error-block'>
              {getFieldError('items')}
            </p>
          ) : null}

          <div className='grid two'>
            <div>
              <h3>{t.payment}</h3>
              <label>IBAN</label>
              <Input
                name='iban'
                value={formData.iban}
                onChange={handleChange}
                onPaste={handlePasteBank}
                placeholder='CZ...'
              />
            </div>
            <div>
              <h3>&nbsp;</h3>
              <label>BIC (SWIFT)</label>
              <Input name='bic' value={formData.bic} onChange={handleChange} />
            </div>
          </div>
          <div className='grid payment-grid-mobile invoice-payment-grid'>
            <div>
              <label>{lang === 'cs' ? 'Předčíslí' : 'Prefix'}</label>
              <Input
                name='prefix'
                value={formData.prefix}
                onChange={handleChange}
                placeholder='000'
              />
            </div>
            <div>
              <label>{lang === 'cs' ? 'Číslo účtu' : 'Account Number'}</label>
              <Input
                name='accountNumber'
                value={formData.accountNumber}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>{lang === 'cs' ? 'Kód banky' : 'Bank Code'}</label>
              <Input
                name='bankCode'
                value={formData.bankCode}
                onChange={handleChange}
              />
            </div>
          </div>
          <div>
            <label>{t.variableSymbol}</label>
            <Input
              name='variableSymbol'
              value={formData.variableSymbol}
              onChange={handleChange}
            />
          </div>
          <div>
            <label>{lang === 'cs' ? 'Poznámka' : 'Note'}</label>
            <Textarea
              name='paymentNote'
              value={formData.paymentNote}
              onChange={handleChange}
              rows='2'
            />
          </div>

          <div className='summary'>
            <div className='invoice-total-line'>
              {t.total}: {formData.amount} {formData.currency}
            </div>
          </div>

          <div className='actions invoice-form-actions-row'>
            <Button type='submit' className='primary'>
              {t.saveInvoice}
            </Button>
            <Button
              type='button'
              onClick={(e) => {
                e.preventDefault();
                setPreviewMode(!previewMode);
              }}
              className='secondary'
              variant='secondary'
            >
              👁️ {t.previewView || (lang === 'cs' ? 'Nahled' : 'Preview')}
            </Button>
            <Button
              type='button'
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className='secondary'
              variant='secondary'
            >
              {isGenerating && !emailStatus ? t.alertGenerating : t.downloadPdf}
            </Button>
            <Button
              type='button'
              onClick={handleMarkPaid}
              className='secondary invoice-form-action-edge'
              variant='secondary'
            >
              {t.markPaid}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
