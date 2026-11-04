import { documentTypeTitleKey, money } from './storage'
import type { Invoice, InvoiceLineItem, InvoiceParty } from '../types/invoice'

// View-model for the printed invoice. Both the on-screen preview
// (InvoicePreview.tsx) and the PDF (pdf.tsx) render from this, so the two
// can never drift apart in wording, formatting or which rows are shown.

export interface LabeledValue {
    label: string
    value: string
    isMono?: boolean
    isStrong?: boolean
}

export interface PartyBox {
    title: string
    rows: LabeledValue[]
}

export interface ItemRow {
    name: string
    qty: string
    unitPrice: string
    discount: string
    taxRate: string
    total: string
}

export interface ItemColumns {
    hasDiscount: boolean
    hasTax: boolean
    labels: { qty: string; unitPrice: string; discount: string; tax: string; total: string }
}

export interface InvoiceLayout {
    title: string
    numberLabel: string
    number: string
    dates: LabeledValue[]
    supplier: PartyBox
    client: PartyBox
    itemsTitle: string
    columns: ItemColumns
    items: ItemRow[]
    paymentTitle: string
    paymentRows: LabeledValue[]
    totalLabel: string
    totalAmount: string
    currency: string
    vatRows: LabeledValue[]
    discountRow: LabeledValue | null
    taxNotes: LabeledValue[]
    issuedBy: string
    registry: string
    thankYou: string
}

type Translations = Record<string, string>

function formatMoney(value: unknown, isCs: boolean): string {
    return money(Number(value), isCs ? 'cs-CZ' : 'en-GB')
}

function partyRows(party: InvoiceParty | undefined, t: Translations, extra: LabeledValue[] = []): LabeledValue[] {
    const rows: LabeledValue[] = []
    if (party?.name) rows.push({ label: t.name, value: party.name, isStrong: true })
    if (party?.address) rows.push({ label: t.address, value: party.address })
    if (party?.ico) rows.push({ label: t.ico, value: party.ico, isMono: true })
    if (party?.vat) rows.push({ label: t.vat, value: party.vat, isMono: true })
    return [...rows, ...extra]
}

function discountText(item: InvoiceLineItem, currency: string, isCs: boolean): string {
    if (!item.discount || Number(item.discount) <= 0) return '-'
    return (item.discountType || 'percent') === 'percent'
        ? `${item.discount} %`
        : `${formatMoney(item.discount, isCs)} ${currency}`
}

export function buildInvoiceLayout(invoice: Invoice, t: Translations, isCs: boolean): InvoiceLayout {
    const currency = invoice.currency || 'CZK'
    const items = invoice.items || []
    const isVatPayer = !!invoice.isVatPayer
    const hasDiscount = items.some(item => Number(item.discount) > 0)

    const dates: LabeledValue[] = [
        { label: t.issueDate, value: invoice.issueDate || '' },
        { label: t.dueDate, value: invoice.dueDate || 'N/A', isStrong: true },
    ]
    if (isVatPayer && invoice.taxableSupplyDate) {
        dates.push({ label: 'DUZP', value: invoice.taxableSupplyDate })
    }

    const supplierExtra: LabeledValue[] = isVatPayer || invoice.supplier?.vat
        ? []
        : [{ label: t.vat, value: 'Nejsem plátce DPH' }]

    const payment = invoice.payment
    const paymentRows: LabeledValue[] = []
    if (payment?.accountNumber) {
        paymentRows.push({ label: t.bankAccount, value: `${payment.accountNumber}/${payment.bankCode || ''}`, isMono: true, isStrong: true })
    }
    if (payment?.iban) paymentRows.push({ label: t.iban, value: payment.iban, isMono: true })
    if (payment?.bic) paymentRows.push({ label: t.bic, value: payment.bic, isMono: true })
    if (payment?.variableSymbol) paymentRows.push({ label: t.variableSymbol, value: payment.variableSymbol, isMono: true, isStrong: true })

    const vatRows: LabeledValue[] = isVatPayer
        ? [
            { label: isCs ? 'Základ daně' : 'Tax base', value: formatMoney(invoice.taxBase, isCs) },
            { label: `${isCs ? 'DPH' : 'VAT'} ${invoice.taxRate || '21'} %`, value: formatMoney(invoice.taxAmount, isCs) },
        ]
        : []

    const discountValue = Number(invoice.invoiceDiscount)
    const discountRow: LabeledValue | null = discountValue > 0
        ? {
            label: t.invoiceDiscount || 'Sleva',
            value: `- ${(invoice.invoiceDiscountType || 'percent') === 'percent'
                ? `${invoice.invoiceDiscount} %`
                : `${formatMoney(invoice.invoiceDiscount, isCs)} ${currency}`}`,
        }
        : null

    const taxNotes: LabeledValue[] = []
    if (invoice.reverseChargeText) taxNotes.push({ label: t.reverseCharge, value: invoice.reverseChargeText })
    if (invoice.exchangeRate && invoice.exchangeRate !== '1.0000') {
        taxNotes.push({
            label: t.exchangeRate,
            value: `1 ${currency} = ${invoice.exchangeRate} ${invoice.supplier?.region === 'SK' ? 'EUR' : 'CZK'}`,
        })
    }

    const contact = [invoice.supplier?.name, invoice.supplier?.phone, invoice.supplier?.email].filter(Boolean).join(' · ')

    return {
        title: (t[documentTypeTitleKey(invoice.documentType)] || '').toUpperCase(),
        numberLabel: t.invoiceNumber,
        number: invoice.invoiceNumber || '',
        dates,
        supplier: { title: t.issuer, rows: partyRows(invoice.supplier, t, supplierExtra) },
        client: { title: t.billTo, rows: partyRows(invoice.client, t) },
        itemsTitle: t.items,
        columns: {
            hasDiscount,
            hasTax: isVatPayer,
            labels: {
                qty: t.qty,
                unitPrice: t.unitPrice,
                discount: isCs ? 'Sleva' : 'Disc.',
                tax: isCs ? 'DPH' : 'VAT',
                total: t.total,
            },
        },
        items: items.map(item => ({
            name: item.name,
            qty: String(item.qty),
            unitPrice: formatMoney(item.price, isCs),
            discount: discountText(item, currency, isCs),
            taxRate: `${item.taxRate || 0} %`,
            total: formatMoney(item.total, isCs),
        })),
        paymentTitle: t.paymentMethodTitle,
        paymentRows,
        totalLabel: t.totalToPay,
        totalAmount: formatMoney(invoice.amount, isCs),
        currency,
        vatRows,
        discountRow,
        taxNotes,
        issuedBy: contact ? `${t.issuedBy}: ${contact}` : '',
        registry: invoice.supplier?.registry || '',
        thankYou: t.thankYou,
    }
}
