// Shared invoice/party domain types. The app stores invoices in a nested shape
// (client/supplier/payment objects) produced by InvoiceForm.getCurrentInvoiceData.
// Fields are optional (except id) because invoices arrive from several sources
// (API, localStorage, in-progress form state) that may omit values.

export interface InvoiceParty {
  name?: string;
  email?: string;
  emailCopy?: string;
  phone?: string;
  area?: string;
  ico?: string;
  vat?: string;
  address?: string;
  country?: string;
  registry?: string;
  website?: string;
  accountNumber?: string;
  bankCode?: string;
  prefix?: string;
  iban?: string;
  [key: string]: unknown;
}

export interface InvoicePayment {
  iban?: string;
  bic?: string;
  note?: string;
  accountNumber?: string;
  bankCode?: string;
  prefix?: string;
  variableSymbol?: string;
}

export interface InvoiceLineItem {
  id?: string;
  name: string;
  qty: number;
  unit?: string;
  price: number;
  discount?: number;
  discountType?: 'percent' | 'amount';
  taxRate?: number;
  subtotal?: number;
  taxAmount?: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber?: string;
  documentType?: string;
  issueDate?: string;
  dueDate?: string;
  taxableSupplyDate?: string;
  status?: string;
  category?: string;
  client?: InvoiceParty;
  supplier?: InvoiceParty;
  payment?: InvoicePayment;
  items?: InvoiceLineItem[];
  currency?: string;
  amount?: number;
  isVatPayer?: boolean;
  taxStatus?: string;
  exchangeRate?: number | string;
  reverseChargeText?: string;
  itemsSubtotal?: number;
  invoiceDiscount?: number;
  invoiceDiscountType?: 'percent' | 'amount';
  invoiceDiscountAmount?: number;
  taxBase?: number | string;
  taxRate?: number | string;
  taxAmount?: number | string;
  note?: string;
  [key: string]: unknown;
}

// Supplier profile / default-supplier shape used across settings, onboarding and
// the invoice form. Mirrors OnboardingSupplier (kept as an alias of this type).
export interface Supplier {
  name?: string;
  ico?: string;
  vat?: string;
  address?: string;
  email?: string;
  phone?: string;
  web?: string;
  region?: string;
  isVatPayer?: boolean;
  vatRate?: string;
  taxRate?: string;
  defaultCurrency?: string;
  defaultDueDays?: string;
  accountNumber?: string;
  bankCode?: string;
  prefix?: string;
  iban?: string;
  bic?: string;
  registry?: string;
  website?: string;
  taxStatus?: string;
  invoiceNumberFormat?: {
    prefix?: string;
    separator?: string;
    includeYear?: boolean;
    padding?: number;
  };
  [key: string]: unknown;
}
