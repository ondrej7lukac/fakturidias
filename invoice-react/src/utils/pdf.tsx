import React from 'react'
import { Document, Page, Text, View, StyleSheet, Svg, Path, pdf as renderPdf, Font } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import { buildInvoiceLayout } from './invoiceLayout'
import type { LabeledValue } from './invoiceLayout'
import { PAPER } from './paperColors'
import type { Invoice } from '../types/invoice'

// Bundled locally (Vite assets) so PDF rendering never depends on a third-party
// font CDN at render time. Each face ships as a latin + latin-ext pair
// (react-pdf cannot merge subsets), registered as two families that are
// chained in fontFamily so Czech/Slovak diacritics fall through per glyph.
// Plain TTF on purpose: react-pdf fails to embed the WOFF builds.
import SansLatin400 from '@/assets/fonts/InstrumentSans-Latin-Regular.ttf?url'
import SansLatin600 from '@/assets/fonts/InstrumentSans-Latin-SemiBold.ttf?url'
import SansLatin700 from '@/assets/fonts/InstrumentSans-Latin-Bold.ttf?url'
import SansLatin700Italic from '@/assets/fonts/InstrumentSans-Latin-BoldItalic.ttf?url'
import SansExt400 from '@/assets/fonts/InstrumentSans-LatinExt-Regular.ttf?url'
import SansExt600 from '@/assets/fonts/InstrumentSans-LatinExt-SemiBold.ttf?url'
import SansExt700 from '@/assets/fonts/InstrumentSans-LatinExt-Bold.ttf?url'
import SansExt700Italic from '@/assets/fonts/InstrumentSans-LatinExt-BoldItalic.ttf?url'
import MonoLatin400 from '@/assets/fonts/GeistMono-Latin-Regular.ttf?url'
import MonoLatin600 from '@/assets/fonts/GeistMono-Latin-SemiBold.ttf?url'
import MonoExt400 from '@/assets/fonts/GeistMono-LatinExt-Regular.ttf?url'
import MonoExt600 from '@/assets/fonts/GeistMono-LatinExt-SemiBold.ttf?url'

Font.register({
    family: 'InstrumentSans',
    fonts: [
        { src: SansLatin400 },
        { src: SansLatin600, fontWeight: 600 },
        { src: SansLatin700, fontWeight: 700 },
        { src: SansLatin700Italic, fontWeight: 700, fontStyle: 'italic' },
    ]
})
Font.register({
    family: 'InstrumentSansExt',
    fonts: [
        { src: SansExt400 },
        { src: SansExt600, fontWeight: 600 },
        { src: SansExt700, fontWeight: 700 },
        { src: SansExt700Italic, fontWeight: 700, fontStyle: 'italic' },
    ]
})
Font.register({
    family: 'GeistMono',
    fonts: [
        { src: MonoLatin400 },
        { src: MonoLatin600, fontWeight: 600 },
    ]
})
Font.register({
    family: 'GeistMonoExt',
    fonts: [
        { src: MonoExt400 },
        { src: MonoExt600, fontWeight: 600 },
    ]
})

// ─── Design tokens ────────────────────────────────────────────────────────────
// Shared with the on-screen preview (InvoicePreview.tsx via paperColors.ts) so
// the PDF you download always looks exactly like what you saw in the preview.
const C = PAPER
const SANS = ['InstrumentSans', 'InstrumentSansExt']
const MONO = ['GeistMono', 'GeistMonoExt']

const S = StyleSheet.create({
    page: { fontFamily: SANS, fontSize: 10, color: C.ink, backgroundColor: C.white, paddingTop: 33, paddingHorizontal: 36, paddingBottom: 26 },

    // Header
    header:       { flexDirection: 'row', alignItems: 'flex-end' },
    title:        { fontFamily: SANS, fontWeight: 700, fontStyle: 'italic', fontSize: 30, lineHeight: 1 },
    headerRule:   { flexGrow: 1, marginLeft: 14, marginRight: 14, marginBottom: 6 },
    ruleThick:    { height: 2.25, backgroundColor: C.accent },
    ruleThin:     { height: 0.75, backgroundColor: C.accent, marginTop: 1.5 },
    numberBox:    { borderWidth: 1.1, borderColor: C.accent, borderRadius: 12, paddingTop: 9, paddingBottom: 4, paddingHorizontal: 14 },
    number:       { fontFamily: SANS, fontWeight: 700, fontStyle: 'italic', fontSize: 22, lineHeight: 1 },

    // Legend sitting on a box border
    legend:       { position: 'absolute', top: -8, left: 8, backgroundColor: C.white, paddingHorizontal: 6, fontFamily: SANS, fontWeight: 700, fontSize: 11 },
    legendSmall:  { position: 'absolute', top: -8, left: 8, backgroundColor: C.white, paddingHorizontal: 6, fontFamily: SANS, fontWeight: 700, fontSize: 10 },

    // Dates
    datesRow:     { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    dateGroup:    { flexDirection: 'row', alignItems: 'flex-end' },
    dateLabel:    { fontSize: 9.5, color: C.muted, marginRight: 6 },
    dateValue:    { fontFamily: MONO, fontSize: 10.5 },
    dateDivider:  { width: 1.1, height: 10, backgroundColor: C.accent, marginHorizontal: 10 },

    // Boxes
    box:          { borderWidth: 1.1, borderColor: C.accent, borderRadius: 12 },
    partiesRow:   { flexDirection: 'row', marginTop: 22 },
    partyBox:     { flex: 1, paddingTop: 15, paddingBottom: 10, paddingHorizontal: 13 },
    row:          { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
    rowLabel:     { fontSize: 9.5, color: C.muted },
    rowValue:     { flex: 1, paddingBottom: 2, borderBottomWidth: 0.75, borderBottomColor: C.dotted, borderBottomStyle: 'dotted', fontSize: 11 },

    // Items box
    itemsBox:     { marginTop: 22, flexGrow: 1, paddingTop: 10, paddingBottom: 10, paddingHorizontal: 13 },
    itemsLegendRow: { position: 'absolute', top: -8, left: 13, right: 13, flexDirection: 'row', alignItems: 'center' },
    itemsLegend:  { backgroundColor: C.white, paddingHorizontal: 6, marginLeft: -6, fontFamily: SANS, fontWeight: 700, fontSize: 11 },
    colHead:      { fontSize: 9.5, color: C.muted, backgroundColor: C.white, paddingHorizontal: 4, textAlign: 'right' },
    itemRow:      { flexDirection: 'row', alignItems: 'flex-end', paddingTop: 7, paddingBottom: 4, borderBottomWidth: 0.75, borderBottomColor: C.dotted, borderBottomStyle: 'dotted' },
    itemName:     { flex: 1, fontSize: 11, paddingRight: 8 },
    cellQty:      { width: 36, textAlign: 'right', fontFamily: MONO, fontSize: 10 },
    cellPrice:    { width: 84, textAlign: 'right', fontFamily: MONO, fontSize: 10 },
    cellDisc:     { width: 62, textAlign: 'right', fontFamily: MONO, fontSize: 10 },
    cellTax:      { width: 40, textAlign: 'right', fontFamily: MONO, fontSize: 10 },
    cellTotal:    { width: 93, textAlign: 'right', fontFamily: MONO, fontSize: 10, fontWeight: 600 },

    // Payment + totals
    bottomRow:    { flexDirection: 'row', marginTop: 22 },
    paymentBox:   { flex: 1, paddingTop: 15, paddingBottom: 12, paddingHorizontal: 13, marginRight: 15 },
    paymentInner: { flexDirection: 'row' },
    paymentRows:  { flex: 1, paddingRight: 12 },
    qrWrap:       { width: 66, alignItems: 'center' },
    qrFrame:      { width: 66, height: 66, borderWidth: 0.75, borderColor: C.qrBorder, borderRadius: 4, padding: 5 },
    qrLabel:      { fontSize: 9, color: C.muted, marginTop: 4 },
    totalsBlock:  { width: 174 },
    totalsHead:   { flexDirection: 'row', alignItems: 'center', marginTop: -7 },
    totalsLabel:  { fontFamily: SANS, fontWeight: 700, fontStyle: 'italic', fontSize: 11.5 },
    totalsLine:   { flexGrow: 1, height: 0.75, backgroundColor: C.ink, marginLeft: 8 },
    totalsSub:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, fontSize: 9.5 },
    totalsSubLabel: { fontSize: 9.5, color: C.muted },
    totalsSubValue: { fontFamily: MONO, fontSize: 9.5 },
    amountRow:    { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end', marginTop: 8, paddingBottom: 4, borderBottomWidth: 1.5, borderBottomColor: C.accent },
    amount:       { fontFamily: SANS, fontWeight: 700, fontStyle: 'italic', fontSize: 27, lineHeight: 1 },
    currency:     { fontFamily: SANS, fontWeight: 700, fontStyle: 'italic', fontSize: 12, marginLeft: 6, marginBottom: 2 },

    // Tax note
    noteBox:      { borderWidth: 0.75, borderColor: C.noteBorder, borderRadius: 6, backgroundColor: C.noteBg, padding: 8, marginTop: 14, fontSize: 9.5 },

    // Footer
    footer:       { marginTop: 14 },
    footerLine:   { flexDirection: 'row', justifyContent: 'space-between', fontSize: 9, color: C.inkSoft, marginBottom: 2 },
    footerRule:   { marginTop: 8 },
})

function Rows({ rows, labelWidth }: { rows: LabeledValue[]; labelWidth: number }) {
    return (
        <>
            {rows.map((r, i) => (
                <View key={i} style={S.row}>
                    <Text style={[S.rowLabel, { width: labelWidth }]}>{r.label}</Text>
                    <Text style={[S.rowValue, r.isMono ? { fontFamily: MONO, fontSize: 10 } : {}, r.isStrong ? { fontWeight: 600 } : {}]}>{r.value}</Text>
                </View>
            ))}
        </>
    )
}

function DoubleRule({ style }: { style?: React.ComponentProps<typeof View>['style'] }) {
    return (
        <View style={style}>
            <View style={S.ruleThick} />
            <View style={S.ruleThin} />
        </View>
    )
}

// ─── PDF component ─────────────────────────────────────────────────────────────
// Drawn as vector paths (not a PNG) so react-pdf never has to decode an image,
// which would need a blob: Worker and weaken our CSP.
function qrPathData(payload: string): { path: string; size: number } | null {
    try {
        const { size, data } = QRCode.create(payload, { errorCorrectionLevel: 'M' }).modules
        let path = ''
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (data[row * size + col]) path += `M${col} ${row}h1v1h-1z`
            }
        }
        return { path, size }
    } catch {
        return null
    }
}

function QrCode({ payload, dimension }: { payload: string; dimension: number }) {
    const qr = qrPathData(payload)
    if (!qr) return <View style={{ width: dimension }} />
    return (
        <Svg width={dimension} height={dimension} viewBox={`0 0 ${qr.size} ${qr.size}`}>
            <Path d={qr.path} fill="#000000" />
        </Svg>
    )
}

function InvoicePDF({ invoice, t, qrPayload }: { invoice: Invoice; t: Record<string, string>; qrPayload: string | null }) {
    const isCs = !t.lang || t.lang === 'cs'
    const layout = buildInvoiceLayout(invoice, t, isCs)
    const { columns } = layout
    const hasTotals = layout.vatRows.length > 0 || !!layout.discountRow

    return (
        <Document>
            <Page size="A4" style={S.page}>

                {/* Header */}
                <View style={S.header}>
                    <Text style={[S.title, layout.title.length > 12 ? { fontSize: 20 } : {}]}>{layout.title}</Text>
                    <DoubleRule style={S.headerRule} />
                    <View style={S.numberBox}>
                        <Text style={S.legendSmall}>{layout.numberLabel}</Text>
                        <Text style={S.number}>{layout.number}</Text>
                    </View>
                </View>

                <View style={S.datesRow}>
                    {layout.dates.map((d, i) => (
                        <View key={i} style={S.dateGroup}>
                            {i > 0 && <View style={S.dateDivider} />}
                            <Text style={S.dateLabel}>{d.label}</Text>
                            <Text style={[S.dateValue, d.isStrong ? { fontWeight: 600 } : {}]}>{d.value}</Text>
                        </View>
                    ))}
                </View>

                {/* Parties */}
                <View style={S.partiesRow}>
                    <View style={[S.box, S.partyBox, { marginRight: 15 }]}>
                        <Text style={S.legend}>{layout.supplier.title}</Text>
                        <Rows rows={layout.supplier.rows} labelWidth={74} />
                    </View>
                    <View style={[S.box, S.partyBox]}>
                        <Text style={S.legend}>{layout.client.title}</Text>
                        <Rows rows={layout.client.rows} labelWidth={74} />
                    </View>
                </View>

                {/* Items */}
                <View style={[S.box, S.itemsBox]}>
                    <View style={S.itemsLegendRow}>
                        <Text style={[S.itemsLegend, { flex: 1 }]}>{layout.itemsTitle}</Text>
                        <Text style={[S.colHead, { width: 36 }]}>{columns.labels.qty}</Text>
                        <Text style={[S.colHead, { width: 84 }]}>{columns.labels.unitPrice}</Text>
                        {columns.hasDiscount && <Text style={[S.colHead, { width: 62 }]}>{columns.labels.discount}</Text>}
                        {columns.hasTax && <Text style={[S.colHead, { width: 40 }]}>{columns.labels.tax}</Text>}
                        <Text style={[S.colHead, { width: 93, marginRight: -4 }]}>{columns.labels.total}</Text>
                    </View>
                    {layout.items.map((item, i) => (
                        <View key={i} style={S.itemRow} wrap={false}>
                            <Text style={S.itemName}>{item.name}</Text>
                            <Text style={S.cellQty}>{item.qty}</Text>
                            <Text style={S.cellPrice}>{item.unitPrice}</Text>
                            {columns.hasDiscount && <Text style={S.cellDisc}>{item.discount}</Text>}
                            {columns.hasTax && <Text style={S.cellTax}>{item.taxRate}</Text>}
                            <Text style={S.cellTotal}>{item.total}</Text>
                        </View>
                    ))}
                </View>

                {/* Payment + total */}
                <View style={S.bottomRow} wrap={false}>
                    <View style={[S.box, S.paymentBox]}>
                        <Text style={S.legend}>{layout.paymentTitle}</Text>
                        <View style={S.paymentInner}>
                            <View style={S.paymentRows}>
                                <Rows rows={layout.paymentRows} labelWidth={76} />
                            </View>
                            <View style={S.qrWrap}>
                                <View style={S.qrFrame}>
                                    {qrPayload ? <QrCode payload={qrPayload} dimension={54} /> : null}
                                </View>
                                <Text style={S.qrLabel}>{t.qrPreview}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={S.totalsBlock}>
                        <View style={S.totalsHead}>
                            <Text style={S.totalsLabel}>{layout.totalLabel}</Text>
                            <View style={S.totalsLine} />
                        </View>
                        {hasTotals && (
                            <View style={{ marginTop: 6 }}>
                                {layout.vatRows.map((r, i) => (
                                    <View key={i} style={S.totalsSub}>
                                        <Text style={S.totalsSubLabel}>{r.label}</Text>
                                        <Text style={S.totalsSubValue}>{r.value}</Text>
                                    </View>
                                ))}
                                {layout.discountRow && (
                                    <View style={S.totalsSub}>
                                        <Text style={[S.totalsSubLabel, { color: C.danger }]}>{layout.discountRow.label}</Text>
                                        <Text style={[S.totalsSubValue, { color: C.danger }]}>{layout.discountRow.value}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                        <View style={S.amountRow}>
                            <Text style={S.amount}>{layout.totalAmount}</Text>
                            <Text style={S.currency}>{layout.currency}</Text>
                        </View>
                    </View>
                </View>

                {/* Tax notes / reverse charge */}
                {layout.taxNotes.length > 0 && (
                    <View style={S.noteBox} wrap={false}>
                        {layout.taxNotes.map((n, i) => (
                            <Text key={i} style={i > 0 ? { marginTop: 4, color: C.muted } : {}}>
                                <Text style={{ fontWeight: 700 }}>{n.label}: </Text>
                                {n.value}
                            </Text>
                        ))}
                    </View>
                )}

                {/* Footer */}
                <View style={S.footer} wrap={false}>
                    <View style={S.footerLine}>
                        <Text>{layout.issuedBy}</Text>
                        <Text>{layout.thankYou}</Text>
                    </View>
                    {!!layout.registry && <Text style={[S.footerLine, { justifyContent: 'flex-start' }]}>{layout.registry}</Text>}
                    <DoubleRule style={S.footerRule} />
                </View>
            </Page>
        </Document>
    )
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateInvoicePDF(invoice: Invoice, t: Record<string, string>, qrPayload: string | null = null): Promise<Blob> {
    return renderPdf(<InvoicePDF invoice={invoice} t={t} qrPayload={qrPayload} />).toBlob()
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
        'background:var(--card);border-radius:16px;padding:28px 24px;',
        'max-width:320px;width:100%;text-align:center;',
        'box-shadow:0 24px 64px rgba(0,0,0,.35);',
    ].join('')

    const msg = document.createElement('p')
    msg.style.cssText = 'margin:0 0 18px;font-size:15px;color:var(--text);line-height:1.5;'
    msg.textContent = 'Tap the button below to open your invoice PDF.'

    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.download = filename
    link.textContent = 'Open PDF'
    link.style.cssText = [
        'display:inline-block;background:var(--accent-2);color:var(--on-accent-2);',
        'padding:13px 28px;border-radius:10px;',
        'text-decoration:none;font-weight:600;font-size:15px;',
    ].join('')

    const dismiss = document.createElement('button')
    dismiss.textContent = 'Dismiss'
    dismiss.style.cssText = [
        'display:block;margin:16px auto 0;background:none;border:none;',
        'color:var(--muted);font-size:13px;cursor:pointer;',
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
