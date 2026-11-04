import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import { QRCodeCanvas } from 'qrcode.react'

import { getCzechQrPayload } from '../utils/bank'
import { buildInvoiceLayout } from '../utils/invoiceLayout'
import type { LabeledValue } from '../utils/invoiceLayout'
import { PAPER } from '../utils/paperColors'
import type { Invoice } from '../types/invoice'

import '@fontsource/instrument-sans/400.css'
import '@fontsource/instrument-sans/600.css'
import '@fontsource/instrument-sans/700.css'
import '@fontsource/instrument-sans/700-italic.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/600.css'
import './InvoicePreview.css'

interface InvoicePreviewProps {
    invoice: Invoice
    t: Record<string, string>
    lang: string
}

const SANS = "'Instrument Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"
const MONO = "'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace"

const boxStyle: CSSProperties = { position: 'relative', border: `1.5px solid ${PAPER.accent}`, borderRadius: 16 }
const legendStyle: CSSProperties = { position: 'absolute', top: -10, left: 10, padding: '0 8px', background: PAPER.white, fontSize: 15, fontWeight: 700, lineHeight: '18px' }
const italicBold: CSSProperties = { fontWeight: 700, fontStyle: 'italic' }

function DoubleRule({ style }: { style?: CSSProperties }) {
    return (
        <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 2, ...style }}>
            <div style={{ height: 3, background: PAPER.accent }} />
            <div style={{ height: 1, background: PAPER.accent }} />
        </div>
    )
}

function Rows({ rows, labelWidth, monoSize = 14 }: { rows: LabeledValue[]; labelWidth: number; monoSize?: number }) {
    return (
        <>
            {rows.map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: `${labelWidth}px minmax(0, 1fr)`, columnGap: 6, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 12.5, color: PAPER.muted }}>{r.label}</span>
                    <span style={{
                        paddingBottom: 4,
                        borderBottom: `1px dotted ${PAPER.dotted}`,
                        fontSize: r.isMono ? monoSize : 15,
                        fontFamily: r.isMono ? MONO : undefined,
                        fontWeight: r.isStrong ? 600 : 400,
                        overflowWrap: 'anywhere',
                    }}>{r.value}</span>
                </div>
            ))}
        </>
    )
}

export default function InvoicePreview({ invoice, t, lang }: InvoicePreviewProps) {
    const frameRef = useRef<HTMLDivElement>(null)
    const pageRef = useRef<HTMLDivElement>(null)
    const [scale, setScale] = useState(1)
    const [pageHeight, setPageHeight] = useState(0)

    // Fit-to-width, never reflow: measure the true (unscaled) page size — via
    // offsetWidth/scrollHeight, which CSS transforms don't affect — and the
    // available container width, then shrink the whole page as one unit.
    // Zooming in further (pinch-zoom) is left to the browser's native gesture.
    useLayoutEffect(() => {
        const frame = frameRef.current
        const page = pageRef.current
        if (!frame || !page) return

        const measure = () => {
            const naturalWidth = page.offsetWidth
            const available = frame.clientWidth
            setScale(
                naturalWidth > 0 && available > 0
                    ? Math.min(1, available / naturalWidth)
                    : 1,
            )
            setPageHeight(page.scrollHeight)
        }
        measure()

        const ro = new ResizeObserver(measure)
        ro.observe(frame)
        ro.observe(page)
        return () => ro.disconnect()
    }, [invoice])

    const layout = buildInvoiceLayout(invoice, t, lang === 'cs')
    const { columns } = layout
    const gridColumns = ['minmax(0, 1fr)', '48px', '112px', columns.hasDiscount && '84px', columns.hasTax && '56px', '124px']
        .filter(Boolean)
        .join(' ')
    const headCell: CSSProperties = { justifySelf: 'end', marginRight: -6, padding: '0 6px', background: PAPER.white, fontSize: 13, color: PAPER.muted }
    const cell: CSSProperties = { textAlign: 'right', fontFamily: MONO, fontSize: 14, whiteSpace: 'nowrap' }

    return (
        <div
            className="invoice-preview-frame"
            ref={frameRef}
            style={{ height: pageHeight ? Math.ceil(pageHeight * scale) : undefined }}
        >
            <div
                className="invoice-preview"
                ref={pageRef}
                style={{ transform: `scale(${scale})`, fontFamily: SANS, color: PAPER.ink }}
            >
                {/* Header */}
                <header style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
                    <h1 style={{ margin: 0, fontSize: layout.title.length > 12 ? 26 : 40, ...italicBold, lineHeight: 1, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>{layout.title}</h1>
                    <DoubleRule style={{ flex: 1, marginBottom: 8 }} />
                    <div style={{ ...boxStyle, padding: '12px 18px 6px' }}>
                        <span style={{ ...legendStyle, fontSize: 13 }}>{layout.numberLabel}</span>
                        <span style={{ fontSize: 30, ...italicBold, lineHeight: 1 }}>{layout.number}</span>
                    </div>
                </header>

                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, whiteSpace: 'nowrap' }}>
                    {layout.dates.map((d, i) => (
                        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            {i > 0 && <span aria-hidden="true" style={{ width: 1.5, height: 13, background: PAPER.accent }} />}
                            <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                <span style={{ color: PAPER.muted }}>{d.label}</span>
                                <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: d.isStrong ? 600 : 400 }}>{d.value}</span>
                            </span>
                        </span>
                    ))}
                </div>

                {/* Supplier and client */}
                <div style={{ marginTop: 30, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20 }}>
                    {[layout.supplier, layout.client].map((party, i) => (
                        <section key={i} style={{ ...boxStyle, minWidth: 0, padding: '20px 18px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={legendStyle}>{party.title}</span>
                            <Rows rows={party.rows} labelWidth={99} />
                        </section>
                    ))}
                </div>

                {/* Items */}
                <section className="invoice-preview-items" style={{ ...boxStyle, marginTop: 30, padding: '14px 18px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ position: 'absolute', top: -10, left: 18, right: 18, display: 'grid', gridTemplateColumns: gridColumns, columnGap: 12, alignItems: 'center', lineHeight: '18px' }}>
                        <span style={{ ...legendStyle, position: 'static', justifySelf: 'start', marginLeft: -8 }}>{layout.itemsTitle}</span>
                        <span style={headCell}>{columns.labels.qty}</span>
                        <span style={headCell}>{columns.labels.unitPrice}</span>
                        {columns.hasDiscount && <span style={headCell}>{columns.labels.discount}</span>}
                        {columns.hasTax && <span style={headCell}>{columns.labels.tax}</span>}
                        <span style={headCell}>{columns.labels.total}</span>
                    </div>
                    {layout.items.map((item, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: gridColumns, columnGap: 12, alignItems: 'baseline', padding: '10px 0 6px', borderBottom: `1px dotted ${PAPER.dotted}`, fontSize: 15 }}>
                            <span style={{ overflowWrap: 'anywhere' }}>{item.name}</span>
                            <span style={cell}>{item.qty}</span>
                            <span style={cell}>{item.unitPrice}</span>
                            {columns.hasDiscount && <span style={cell}>{item.discount}</span>}
                            {columns.hasTax && <span style={cell}>{item.taxRate}</span>}
                            <span style={{ ...cell, fontWeight: 600 }}>{item.total}</span>
                        </div>
                    ))}
                </section>

                {/* Payment + total */}
                <div style={{ marginTop: 30, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 232px', gap: 20, alignItems: 'start' }}>
                    <section style={{ ...boxStyle, minWidth: 0, padding: '20px 18px 16px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                        <span style={legendStyle}>{layout.paymentTitle}</span>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <Rows rows={layout.paymentRows} labelWidth={99} monoSize={12.5} />
                        </div>
                        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 88, height: 88, boxSizing: 'border-box', padding: 7, border: `1px solid ${PAPER.qrBorder}`, borderRadius: 6, display: 'flex' }}>
                                <QRCodeCanvas value={getCzechQrPayload(invoice)} size={72} level="M" includeMargin={false} />
                            </div>
                            <span style={{ fontSize: 12, color: PAPER.muted }}>{t.qrPreview}</span>
                        </div>
                    </section>

                    <section style={{ marginTop: -9, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, ...italicBold, lineHeight: '18px' }}>
                            <span>{layout.totalLabel}</span>
                            <div aria-hidden="true" style={{ flex: 1, height: 1, background: PAPER.ink }} />
                        </div>
                        {(layout.vatRows.length > 0 || layout.discountRow) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                                {layout.vatRows.map((r, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                        <span style={{ color: PAPER.muted }}>{r.label}</span>
                                        <span style={{ fontFamily: MONO, whiteSpace: 'nowrap' }}>{r.value}</span>
                                    </div>
                                ))}
                                {layout.discountRow && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: PAPER.danger }}>
                                        <span>{layout.discountRow.label}</span>
                                        <span style={{ fontFamily: MONO, whiteSpace: 'nowrap' }}>{layout.discountRow.value}</span>
                                    </div>
                                )}
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: 8, paddingBottom: 6, borderBottom: `2px solid ${PAPER.accent}`, whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: 36, ...italicBold, letterSpacing: '0.01em', lineHeight: 1 }}>{layout.totalAmount}</span>
                            <span style={{ fontSize: 16, ...italicBold }}>{layout.currency}</span>
                        </div>
                    </section>
                </div>

                {/* Tax notes / reverse charge */}
                {layout.taxNotes.length > 0 && (
                    <div style={{ marginTop: 20, padding: '12px 16px', border: `1px solid ${PAPER.noteBorder}`, borderRadius: 8, background: PAPER.noteBg, fontSize: 13 }}>
                        {layout.taxNotes.map((n, i) => (
                            <div key={i} style={i > 0 ? { marginTop: 6, color: PAPER.muted } : undefined}>
                                <strong>{n.label}:</strong> {n.value}
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <footer style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12, color: PAPER.inkSoft }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
                            <span>{layout.issuedBy}</span>
                            <span>{layout.thankYou}</span>
                        </div>
                        {layout.registry && <span>{layout.registry}</span>}
                    </div>
                    <DoubleRule />
                </footer>
            </div>
        </div>
    )
}
