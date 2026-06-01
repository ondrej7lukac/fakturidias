'use strict';

const crypto = require('crypto');

function toIsoDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days || 0));
  return d;
}

// Advance a date by one cadence step. Mirrors the cadence options offered in
// the Recurring UI (weekly / monthly / quarterly / yearly).
function computeNextRunAt(from, cadence, intervalCount = 1) {
  const d = new Date(from);
  const n = Math.max(1, Number(intervalCount) || 1);
  switch (cadence) {
    case 'weekly':
      d.setDate(d.getDate() + 7 * n);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3 * n);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + n);
      break;
    case 'monthly':
    default:
      d.setMonth(d.getMonth() + n);
      break;
  }
  return d;
}

// Mirror of the client's getNextInvoiceCounter (src/utils/storage.ts): take the
// highest trailing-digit run among this year's invoices and add one.
function getNextInvoiceCounter(invoices) {
  const yearStr = String(new Date().getFullYear());
  const counters = (invoices || [])
    .filter((inv) => inv.issueDate && String(inv.issueDate).startsWith(yearStr))
    .map((inv) => {
      const match = String(inv.invoiceNumber || '').match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : NaN;
    })
    .filter((n) => !Number.isNaN(n));
  return counters.length === 0 ? 1 : Math.max(...counters) + 1;
}

// Build the next number by bumping the trailing counter of the template's own
// number — this preserves whatever prefix/year/doc-type format it already uses.
function nextInvoiceNumber(existing, templateNumber) {
  const counter = getNextInvoiceCounter(existing);
  const tn = String(templateNumber || '');
  const match = tn.match(/(\d+)$/);
  if (!match) return String(counter);
  const seq = String(counter).padStart(match[1].length, '0');
  return tn.slice(0, tn.length - match[1].length) + seq;
}

// Turn a recurring template into a concrete invoice payload (same shape the
// frontend's getCurrentInvoiceData produces). Item totals are static, so the
// amount/VAT captured in the template carry over unchanged.
function buildInvoiceFromTemplate(tpl, existing) {
  const base = tpl.template || {};
  const today = new Date();
  const issueDate = toIsoDate(today);
  const dueDate = toIsoDate(addDays(today, tpl.dueDays));
  const invoiceNumber = nextInvoiceNumber(existing, base.invoiceNumber);

  return {
    ...base,
    id: crypto.randomUUID(),
    invoiceNumber,
    documentType: base.documentType || 'invoice',
    recurringId: tpl.id,
    issueDate,
    dueDate,
    taxableSupplyDate: issueDate,
    status: tpl.autoSend ? 'sent' : 'draft',
    payment: {
      ...(base.payment || {}),
      variableSymbol: invoiceNumber.replace(/\D/g, ''),
    },
  };
}

module.exports = {
  computeNextRunAt,
  getNextInvoiceCounter,
  nextInvoiceNumber,
  buildInvoiceFromTemplate,
};
