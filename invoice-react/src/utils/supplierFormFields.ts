import type { Supplier } from '../types/invoice';
import { parseIban } from './bank';

/** The invoice-form fields that come from the active company profile. */
export interface SupplierFormFields {
  iban: string;
  accountNumber: string;
  bankCode: string;
  prefix: string;
  supplierName: string;
  supplierIco: string;
  supplierVat: string;
  supplierAddress: string;
  supplierRegistry: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierWebsite: string;
  isVatPayer: boolean;
  taxStatus: string;
  taxRate: string;
}

export function supplierToFormFields(supplier: Supplier): SupplierFormFields {
  const bankFromIban = (supplier.iban && parseIban(supplier.iban)) || {
    accountNumber: '',
    bankCode: '',
    prefix: '',
  };
  return {
    iban: supplier.iban || '',
    accountNumber: supplier.accountNumber || bankFromIban.accountNumber,
    bankCode: supplier.bankCode || bankFromIban.bankCode,
    prefix: supplier.prefix || bankFromIban.prefix,
    supplierName: supplier.name || '',
    supplierIco: supplier.ico || '',
    supplierVat: supplier.vat || '',
    supplierAddress: supplier.address || '',
    supplierRegistry: supplier.registry || '',
    supplierPhone: supplier.phone || '',
    supplierEmail: supplier.email || '',
    supplierWebsite: supplier.website || '',
    isVatPayer: supplier.isVatPayer || false,
    taxStatus: supplier.taxStatus || 'non-payer',
    taxRate: supplier.taxRate || '21',
  };
}

/**
 * Applies a (possibly new) company profile to the form. A field takes the new
 * profile's value when it is empty or still holds the value the previously
 * applied profile put there — so switching company re-bills the whole draft,
 * while anything the user typed by hand is kept.
 */
export function applySupplierFields<T extends SupplierFormFields>(
  form: T,
  next: SupplierFormFields,
  previous: SupplierFormFields | null,
): T {
  const merged: T = { ...form };
  for (const key of Object.keys(next) as (keyof SupplierFormFields)[]) {
    const current = form[key];
    const isUntouched = !current || (previous !== null && current === previous[key]);
    if (isUntouched) Object.assign(merged, { [key]: next[key] });
  }
  return merged;
}
