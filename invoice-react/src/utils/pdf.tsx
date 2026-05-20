import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, pdf as renderPdf } from '@react-pdf/renderer'

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
    indigo:      '#6366f1',
    slate400:    '#94a3b8',
    slate500:    '#64748b',
    gray900:     '#111827',
    gray700:     '#374151',
    gray500:     '#6b7280',
    gray200:     '#e5e7eb',
    greenBg:     '#f0fdf4',
    greenBorder: '#86efac',
    green700:    '#15803d',
    green800:    '#166534',
    slate50:     '#f8fafc',
    slate200:    '#e2e8f0',
}

const S = StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 10, color: C.gray900, backgroundColor: '#ffffff', padding: 40 },

    // Header
    header:      { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: C.indigo, paddingBottom: 14, marginBottom: 22 },
    headerTitle: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: C.indigo },
    headerNum:   { fontSize: 12, color: C.slate500, marginTop: 4 },
    dateRow:     { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 3 },
    dateLabel:   { fontFamily: 'Helvetica-Bold', fontSize: 10 },
    dateValue:   { fontSize: 10, marginLeft: 4 },

    // Parties
    parties:     { flexDirection: 'row', marginBottom: 22 },
    partyBlock:  { flex: 1, paddingRight: 20 },
    partyLabel:  { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.slate500, marginBottom: 6 },
    partyName:   { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
    partyAddr:   { fontSize: 10, color: C.gray700, lineHeight: 1.5, marginBottom: 2 },
    partyDetail: { fontSize: 9, color: C.gray500, marginTop: 1 },
    nonVat:      { fontSize: 9, color: C.slate500, marginTop: 6, fontStyle: 'italic' },

    // Items table
    tblSection:    { marginBottom: 22 },
    tblHeaderRow:  { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: C.gray200, paddingBottom: 6, marginBottom: 2 },
    tblRow:        { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.gray200, paddingTop: 8, paddingBottom: 8 },
    tblHead:       { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.slate500 },
    tblCell:       { fontSize: 10, color: C.gray900 },
    colDesc:       { flex: 3 },
    colQty:        { flex: 0.8, textAlign: 'center' },
    colPrice:      { flex: 1.4, textAlign: 'right' },
    colTax:        { flex: 0.8, textAlign: 'center' },
    colDisc:       { flex: 1.4, textAlign: 'right' },
    colTotal:      { flex: 1.4, textAlign: 'right' },

    // VAT box
    vatBox:   { backgroundColor: C.greenBg, borderWidth: 1, borderColor: C.greenBorder, borderRadius: 6, padding: 12, marginBottom: 18 },
    vatTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.green800, marginBottom: 8 },
    vatRow:   { flexDirection: 'row' },
    vatCol:   { flex: 1 },
    vatLabel: { fontSize: 9, color: C.green800 },
    vatVal:   { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.green700, marginTop: 2 },

    // QR + totals
    footerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 },
    qrLabel:     { fontSize: 8, color: C.slate500, marginBottom: 4 },
    totalsBlock: { width: 190 },
    totRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    totLabel:    { color: C.slate500, fontSize: 10 },
    totVal:      { fontSize: 10, fontFamily: 'Helvetica-Bold' },
    grandRow:    { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: C.indigo, paddingTop: 8, marginTop: 4 },
    grandLabel:  { fontSize: 14, fontFamily: 'Helvetica-Bold' },
    grandVal:    { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.indigo },

    // Tax note
    noteBox: { borderWidth: 1, borderColor: C.slate200, borderRadius: 6, backgroundColor: C.slate50, padding: 10, marginBottom: 14, fontSize: 10 },

    // Payment bar
    payBar:   { backgroundColor: C.slate50, borderTopWidth: 1, borderTopColor: C.slate200, padding: 10, flexDirection: 'row', flexWrap: 'wrap' },
    payItem:  { flexDirection: 'row', marginRight: 16, marginBottom: 4 },
    payLabel: { color: C.slate500, fontSize: 10 },
    payVal:   { fontSize: 10, fontFamily: 'Helvetica-Bold', marginLeft: 3 },

    thanks: { marginTop: 14, textAlign: 'center', fontSize: 9, color: C.slate400 },
})

// ─── PDF component ─────────────────────────────────────────────────────────────
function InvoicePDF({ invoice, t, qrDataUrl }: { invoice: any; t: any; qrDataUrl: string | null }) {
    const isCs = !t.lang || t.lang === 'cs'
    const hasTaxNote = invoice.reverseChargeText || (invoice.exchangeRate && invoice.exchangeRate !== '1.0000')

    return (
        <Document>
            <Page size="A4" style={S.page}>

                {/* Header */}
                <View style={S.header}>
                    <View>
                        <Text style={S.headerTitle}>{t.invoice}</Text>
                        <Text style={S.headerNum}># {invoice.invoiceNumber}</Text>
                    </View>
                    <View>
                        <View style={S.dateRow}>
                            <Text style={S.dateLabel}>{t.issueDate}:</Text>
                            <Text style={S.dateValue}>{invoice.issueDate}</Text>
                        </View>
                        <View style={S.dateRow}>
                            <Text style={S.dateLabel}>{t.dueDate}:</Text>
                            <Text style={S.dateValue}>{invoice.dueDate || 'N/A'}</Text>
                        </View>
                        {invoice.taxableSupplyDate && invoice.taxableSupplyDate !== invoice.issueDate && (
                            <View style={S.dateRow}>
                                <Text style={[S.dateLabel, { fontSize: 9 }]}>DUZP:</Text>
                                <Text style={[S.dateValue, { fontSize: 9 }]}>{invoice.taxableSupplyDate}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Parties */}
                <View style={S.parties}>
                    <View style={S.partyBlock}>
                        <Text style={S.partyLabel}>{t.issuer}</Text>
                        <Text style={S.partyName}>{invoice.supplier?.name || '---'}</Text>
                        {!!invoice.supplier?.address  && <Text style={S.partyAddr}>{invoice.supplier.address}</Text>}
                        {!!invoice.supplier?.ico      && <Text style={S.partyDetail}>{t.ico}: {invoice.supplier.ico}</Text>}
                        {!!invoice.supplier?.vat      && <Text style={S.partyDetail}>{t.vat}: {invoice.supplier.vat}</Text>}
                        {!!invoice.supplier?.registry && <Text style={[S.partyDetail, { fontSize: 8 }]}>{invoice.supplier.registry}</Text>}
                        {!!invoice.supplier?.phone    && <Text style={S.partyDetail}>Tel: {invoice.supplier.phone}</Text>}
                        {!!invoice.supplier?.email    && <Text style={S.partyDetail}>Email: {invoice.supplier.email}</Text>}
                        {!invoice.isVatPayer && <Text style={S.nonVat}>Nejsem plátce DPH</Text>}
                    </View>
                    <View style={S.partyBlock}>
                        <Text style={S.partyLabel}>{t.billTo}</Text>
                        <Text style={S.partyName}>{invoice.client.name}</Text>
                        {!!invoice.client.address && <Text style={S.partyAddr}>{invoice.client.address}</Text>}
                        {!!invoice.client.ico     && <Text style={S.partyDetail}>{t.ico}: {invoice.client.ico}</Text>}
                        {!!invoice.client.vat     && <Text style={S.partyDetail}>{t.vat}: {invoice.client.vat}</Text>}
                    </View>
                </View>

                {/* Items table */}
                <View style={S.tblSection}>
                    <View style={S.tblHeaderRow}>
                        <Text style={[S.tblHead, S.colDesc]}>{t.itemDescription}</Text>
                        <Text style={[S.tblHead, S.colQty]}>{t.qty}</Text>
                        <Text style={[S.tblHead, S.colPrice]}>{isCs ? 'CENA/JEDN.' : 'PRICE/UNIT'}</Text>
                        <Text style={[S.tblHead, S.colTax]}>{isCs ? 'DPH %' : 'TAX %'}</Text>
                        <Text style={[S.tblHead, S.colDisc]}>{isCs ? 'SLEVA' : 'DISC.'}</Text>
                        <Text style={[S.tblHead, S.colTotal]}>{t.total}</Text>
                    </View>
                    {invoice.items.map((item: any, i: number) => (
                        <View key={i} style={S.tblRow}>
                            <Text style={[S.tblCell, S.colDesc]}>{item.name}</Text>
                            <Text style={[S.tblCell, S.colQty]}>{item.qty}</Text>
                            <Text style={[S.tblCell, S.colPrice]}>{invoice.currency} {Number(item.price).toFixed(2)}</Text>
                            <Text style={[S.tblCell, S.colTax]}>{item.taxRate || 0}%</Text>
                            <Text style={[S.tblCell, S.colDisc]}>{item.discount > 0 ? `${invoice.currency} ${Number(item.discount).toFixed(2)}` : '-'}</Text>
                            <Text style={[S.tblCell, S.colTotal]}>{invoice.currency} {Number(item.total).toFixed(2)}</Text>
                        </View>
                    ))}
                </View>

                {/* VAT summary */}
                {invoice.isVatPayer && (
                    <View style={S.vatBox}>
                        <Text style={S.vatTitle}>Daňový doklad – Rozpis DPH</Text>
                        <View style={S.vatRow}>
                            <View style={S.vatCol}>
                                <Text style={S.vatLabel}>Základ daně</Text>
                                <Text style={S.vatVal}>{invoice.currency} {parseFloat(invoice.taxBase || 0).toFixed(2)}</Text>
                            </View>
                            <View style={S.vatCol}>
                                <Text style={S.vatLabel}>Sazba DPH</Text>
                                <Text style={S.vatVal}>{invoice.taxRate || '21'}%</Text>
                            </View>
                            <View style={S.vatCol}>
                                <Text style={S.vatLabel}>Výše daně</Text>
                                <Text style={S.vatVal}>{invoice.currency} {parseFloat(invoice.taxAmount || 0).toFixed(2)}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* QR code + totals */}
                <View style={S.footerRow}>
                    <View>
                        {qrDataUrl
                            ? <><Text style={S.qrLabel}>{t.qrPreview}</Text><Image src={qrDataUrl} style={{ width: 88, height: 88 }} /></>
                            : <View style={{ width: 88 }} />
                        }
                    </View>
                    <View style={S.totalsBlock}>
                        <View style={S.totRow}>
                            <Text style={S.totLabel}>{t.subtotal}:</Text>
                            <Text style={S.totVal}>
                                {invoice.currency} {parseFloat(invoice.isVatPayer ? (invoice.taxBase || invoice.amount) : invoice.amount).toFixed(2)}
                            </Text>
                        </View>
                        <View style={S.totRow}>
                            <Text style={S.totLabel}>{isCs ? 'DPH' : 'VAT'} ({invoice.isVatPayer ? invoice.taxRate : '0'}%):</Text>
                            <Text style={S.totLabel}>
                                {invoice.currency} {parseFloat(invoice.isVatPayer ? (invoice.taxAmount || 0) : 0).toFixed(2)}
                            </Text>
                        </View>
                        <View style={S.grandRow}>
                            <Text style={S.grandLabel}>{t.total}:</Text>
                            <Text style={S.grandVal}>{invoice.currency} {Number(invoice.amount).toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* Tax notes / reverse charge */}
                {hasTaxNote && (
                    <View style={S.noteBox}>
                        {!!invoice.reverseChargeText && (
                            <Text style={{ marginBottom: (invoice.exchangeRate && invoice.exchangeRate !== '1.0000') ? 5 : 0 }}>
                                <Text style={{ fontFamily: 'Helvetica-Bold' }}>{t.reverseCharge}: </Text>
                                {invoice.reverseChargeText}
                            </Text>
                        )}
                        {invoice.exchangeRate && invoice.exchangeRate !== '1.0000' && (
                            <Text style={{ color: C.slate500, fontStyle: 'italic' }}>
                                {t.exchangeRate}: 1 {invoice.currency} = {invoice.exchangeRate} {invoice.supplier?.region === 'SK' ? 'EUR' : 'CZK'}
                            </Text>
                        )}
                    </View>
                )}

                {/* Payment bar */}
                <View style={S.payBar}>
                    <View style={S.payItem}>
                        <Text style={S.payLabel}>{t.bankAccount}:</Text>
                        <Text style={S.payVal}>{invoice.payment.accountNumber || ''}/{invoice.payment.bankCode || ''}</Text>
                    </View>
                    <View style={S.payItem}>
                        <Text style={S.payLabel}>{t.iban}:</Text>
                        <Text style={S.payVal}>{invoice.payment.iban}</Text>
                    </View>
                    <View style={S.payItem}>
                        <Text style={S.payLabel}>{t.bic}:</Text>
                        <Text style={S.payVal}>{invoice.payment.bic}</Text>
                    </View>
                    <View style={S.payItem}>
                        <Text style={S.payLabel}>{t.variableSymbol}:</Text>
                        <Text style={S.payVal}>{invoice.payment.variableSymbol || ''}</Text>
                    </View>
                </View>

                <Text style={S.thanks}>{t.thankYou}</Text>
            </Page>
        </Document>
    )
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateInvoicePDF(invoice: any, t: any, qrDataUrl: string | null = null): Promise<Blob> {
    return renderPdf(<InvoicePDF invoice={invoice} t={t} qrDataUrl={qrDataUrl} />).toBlob()
}

export function downloadPDF(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const cleanup = () => URL.revokeObjectURL(url)

    const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent)

    if (isIOS) {
        // iOS Safari ignores the download attribute — open in new tab so the
        // user can save via the native share sheet
        const tab = window.open(url, '_blank')
        if (!tab) {
            // Popup blocked: show overlay instead of navigating away
            _showMobileFallback(url, filename, cleanup)
        } else {
            setTimeout(cleanup, 60_000)
        }
    } else {
        // Desktop + Android Chrome: <a download> triggers a real file download
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(cleanup, 1_000)
    }
}

function _showMobileFallback(url: string, filename: string, cleanup: () => void): void {
    const overlay = document.createElement('div')
    overlay.style.cssText = [
        'position:fixed;inset:0;z-index:99999;',
        'background:rgba(0,0,0,.55);',
        'display:flex;align-items:center;justify-content:center;padding:24px;',
    ].join('')

    const card = document.createElement('div')
    card.style.cssText = [
        'background:#fff;border-radius:16px;padding:28px 24px;',
        'max-width:320px;width:100%;text-align:center;',
        'box-shadow:0 24px 64px rgba(0,0,0,.35);',
    ].join('')

    const msg = document.createElement('p')
    msg.style.cssText = 'margin:0 0 18px;font-size:15px;color:#111827;line-height:1.5;'
    msg.textContent = 'Tap the button below to open your invoice PDF.'

    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.download = filename
    link.textContent = 'Open PDF'
    link.style.cssText = [
        'display:inline-block;background:#6366f1;color:#fff;',
        'padding:13px 28px;border-radius:10px;',
        'text-decoration:none;font-weight:600;font-size:15px;',
    ].join('')

    const dismiss = document.createElement('button')
    dismiss.textContent = 'Dismiss'
    dismiss.style.cssText = [
        'display:block;margin:16px auto 0;background:none;border:none;',
        'color:#64748b;font-size:13px;cursor:pointer;',
    ].join('')

    const close = () => { overlay.remove(); cleanup() }
    dismiss.addEventListener('click', close)
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })

    card.append(msg, link, dismiss)
    overlay.appendChild(card)
    document.body.appendChild(overlay)
    setTimeout(close, 60_000)
}

// Converts the PDF Blob to a base64 data URI (needed for email / Drive upload)
export function pdfBlobToDataUri(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}
