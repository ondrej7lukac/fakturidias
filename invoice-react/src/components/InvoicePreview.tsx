import './InvoicePreview.css'
import { useLayoutEffect, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { getCzechQrPayload } from '../utils/bank'
import { documentTypeTitleKey } from '../utils/storage'
import { PAPER } from '../utils/paperColors'
import type { Invoice } from '../types/invoice'

interface InvoicePreviewProps {
    invoice: Invoice
    t: Record<string, string>
    lang: string
}

// The page is ALWAYS laid out at its true fixed A4 width (210mm, set in
// InvoicePreview.css) — never reflowed for mobile — and scaled down as one
// rigid unit to fit narrow viewports (see the frame wrapper below), so
// proportions always match the printed/downloaded PDF exactly.
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

    return (
        <div
            className="invoice-preview-frame"
            ref={frameRef}
            style={{ height: pageHeight ? Math.ceil(pageHeight * scale) : undefined }}
        >
            <div
                className="invoice-preview"
                ref={pageRef}
                style={{ transform: `scale(${scale})` }}
            >
                {/* Header */}
                <div className="preview-header">
                    <div>
                        <h1 style={{
                            margin: 0,
                            color: PAPER.indigo,
                            fontSize: '32px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '-0.025em'
                        }}>{t[documentTypeTitleKey(invoice.documentType)]}</h1>
                        <p style={{
                            margin: '5px 0',
                            color: PAPER.slate500,
                            fontSize: '16px',
                            fontWeight: 500
                        }}># {invoice.invoiceNumber}</p>
                    </div>
                    <div style={{ textAlign: 'right', color: PAPER.gray900 }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>
                            {t.issueDate}: <span style={{ fontWeight: 400 }}>{invoice.issueDate}</span>
                        </p>
                        <p style={{ margin: '5px 0', fontWeight: 600 }}>
                            {t.dueDate}: <span style={{
                                fontWeight: 400,
                                color: new Date(invoice.dueDate || '') < new Date() ? PAPER.danger : 'inherit'
                            }}>{invoice.dueDate || 'N/A'}</span>
                        </p>
                        {invoice.taxableSupplyDate && invoice.taxableSupplyDate !== invoice.issueDate && (
                            <p style={{ margin: '5px 0', fontWeight: 600, fontSize: '12px' }}>
                                DUZP: <span style={{ fontWeight: 400 }}>{invoice.taxableSupplyDate}</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Supplier and Client Info */}
                <div className="preview-grid-2">
                    {/* Supplier */}
                    <div>
                        <h3 style={{
                            margin: '0 0 12px',
                            fontSize: '13px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color: PAPER.slate500,
                            letterSpacing: '0.05em'
                        }}>{t.issuer}</h3>
                        <p style={{
                            margin: 0,
                            fontWeight: 700,
                            fontSize: '18px',
                            color: PAPER.gray900
                        }}>{invoice.supplier?.name || '---'}</p>
                        <p style={{
                            margin: '6px 0',
                            lineHeight: 1.5,
                            color: PAPER.gray700
                        }}>{invoice.supplier?.address || ''}</p>
                        <div style={{ fontSize: '14px', color: PAPER.gray500 }}>
                            {invoice.supplier?.ico && (
                                <p style={{ margin: '2px 0' }}>
                                    <strong>{t.ico}:</strong> {invoice.supplier.ico}
                                </p>
                            )}
                            {invoice.supplier?.vat && (
                                <p style={{ margin: '2px 0' }}>
                                    <strong>{t.vat}:</strong> {invoice.supplier.vat}
                                </p>
                            )}
                            {invoice.supplier?.registry && (
                                <p style={{ margin: '2px 0', fontSize: '12px' }}>
                                    {invoice.supplier.registry}
                                </p>
                            )}
                            {invoice.supplier?.phone && (
                                <p style={{ margin: '2px 0' }}>Tel: {invoice.supplier.phone}</p>
                            )}
                            {invoice.supplier?.email && (
                                <p style={{ margin: '2px 0' }}>Email: {invoice.supplier.email}</p>
                            )}
                        </div>
                        {!invoice.isVatPayer && (
                            <p style={{
                                marginTop: '10px',
                                color: PAPER.slate500,
                                fontSize: '11px'
                            }}>Nejsem plátce DPH</p>
                        )}
                    </div>

                    {/* Client */}
                    <div>
                        <h3 style={{
                            margin: '0 0 12px',
                            fontSize: '13px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color: PAPER.slate500,
                            letterSpacing: '0.05em'
                        }}>{t.billTo}</h3>
                        <p style={{
                            margin: 0,
                            fontWeight: 700,
                            fontSize: '18px',
                            color: PAPER.gray900
                        }}>{invoice.client?.name}</p>
                        <p style={{
                            margin: '6px 0',
                            lineHeight: 1.5,
                            color: PAPER.gray700
                        }}>{invoice.client?.address || ''}</p>
                        <div style={{ fontSize: '14px', color: PAPER.gray500 }}>
                            {invoice.client?.ico && (
                                <p style={{ margin: '2px 0' }}>
                                    <strong>{t.ico}:</strong> {invoice.client.ico}
                                </p>
                            )}
                            {invoice.client?.vat && (
                                <p style={{ margin: '2px 0' }}>
                                    <strong>{t.vat}:</strong> {invoice.client.vat}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="table-container">
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        marginBottom: '40px'
                    }}>
                        <thead>
                            <tr style={{ borderBottom: `2px solid ${PAPER.gray200}` }}>
                                <th style={{
                                    textAlign: 'left',
                                    padding: '10px 0',
                                    color: PAPER.slate500,
                                    fontSize: '12px',
                                    textTransform: 'uppercase'
                                }}>{t.itemDescription}</th>
                                <th style={{
                                    textAlign: 'center',
                                    padding: '10px 0',
                                    color: PAPER.slate500,
                                    fontSize: '12px',
                                    textTransform: 'uppercase'
                                }}>{t.qty}</th>
                                <th style={{
                                    textAlign: 'right',
                                    padding: '10px 0',
                                    color: PAPER.slate500,
                                    fontSize: '12px',
                                    textTransform: 'uppercase'
                                }}>{lang === 'cs' ? 'CENA/JEDN.' : 'PRICE/UNIT'}</th>
                                <th style={{
                                    textAlign: 'center',
                                    padding: '10px 0',
                                    color: PAPER.slate500,
                                    fontSize: '12px',
                                    textTransform: 'uppercase'
                                }}>{lang === 'cs' ? 'DPH %' : 'TAX %'}</th>
                                <th style={{
                                    textAlign: 'right',
                                    padding: '10px 0',
                                    color: PAPER.slate500,
                                    fontSize: '12px',
                                    textTransform: 'uppercase'
                                }}>{lang === 'cs' ? 'SLEVA' : 'DISC.'}</th>
                                <th style={{
                                    textAlign: 'right',
                                    padding: '10px 0',
                                    color: PAPER.slate500,
                                    fontSize: '12px',
                                    textTransform: 'uppercase'
                                }}>{t.total}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(invoice.items || []).map((item, idx) => (
                                <tr key={idx}>
                                    <td style={{
                                        padding: '12px 0',
                                        borderBottom: `1px solid ${PAPER.gray200}`,
                                        color: PAPER.gray900
                                    }}>{item.name}</td>
                                    <td style={{
                                        padding: '12px 0',
                                        borderBottom: `1px solid ${PAPER.gray200}`,
                                        textAlign: 'center',
                                        color: PAPER.gray900
                                    }}>{item.qty}</td>
                                    <td style={{
                                        padding: '12px 0',
                                        borderBottom: `1px solid ${PAPER.gray200}`,
                                        textAlign: 'right',
                                        color: PAPER.gray900
                                    }}>{invoice.currency} {item.price.toFixed(2)}</td>
                                    <td style={{
                                        padding: '12px 0',
                                        borderBottom: `1px solid ${PAPER.gray200}`,
                                        textAlign: 'center',
                                        color: PAPER.gray900
                                    }}>{item.taxRate || 0}%</td>
                                    <td style={{
                                        padding: '12px 0',
                                        borderBottom: `1px solid ${PAPER.gray200}`,
                                        textAlign: 'right',
                                        color: PAPER.gray900
                                    }}>{item.discount && item.discount > 0 ? `${invoice.currency} ${item.discount.toFixed(2)}` : '-'}</td>
                                    <td style={{
                                        padding: '12px 0',
                                        borderBottom: `1px solid ${PAPER.gray200}`,
                                        textAlign: 'right',
                                        color: PAPER.gray900
                                    }}>{invoice.currency} {item.total.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* VAT Section */}
                {invoice.isVatPayer && (
                    <div style={{
                        marginBottom: '30px',
                        padding: '15px',
                        background: PAPER.greenBg,
                        border: `1px solid ${PAPER.greenBorder}`,
                        borderRadius: '8px'
                    }}>
                        <h3 style={{
                            margin: '0 0 10px',
                            fontSize: '13px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color: PAPER.green800,
                            letterSpacing: '0.05em'
                        }}>Daňový doklad - Rozpis DPH</h3>
                        <div className="preview-vat-grid">
                            <div>
                                <p style={{
                                    margin: 0,
                                    fontSize: '11px',
                                    color: PAPER.green800,
                                    textTransform: 'uppercase'
                                }}>Základ daně</p>
                                <p style={{
                                    margin: '4px 0',
                                    fontWeight: 600,
                                    color: PAPER.green700
                                }}>{invoice.currency} {parseFloat(String(invoice.taxBase || 0)).toFixed(2)}</p>
                            </div>
                            <div>
                                <p style={{
                                    margin: 0,
                                    fontSize: '11px',
                                    color: PAPER.green800,
                                    textTransform: 'uppercase'
                                }}>Sazba DPH</p>
                                <p style={{
                                    margin: '4px 0',
                                    fontWeight: 600,
                                    color: PAPER.green700
                                }}>{invoice.taxRate || '21'}%</p>
                            </div>
                            <div>
                                <p style={{
                                    margin: 0,
                                    fontSize: '11px',
                                    color: PAPER.green800,
                                    textTransform: 'uppercase'
                                }}>Výše daně</p>
                                <p style={{
                                    margin: '4px 0',
                                    fontWeight: 600,
                                    color: PAPER.green700
                                }}>{invoice.currency} {parseFloat(String(invoice.taxAmount || 0)).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Total & QR */}
                <div className="preview-footer" style={{ marginBottom: '40px' }}>
                    <div style={{ width: '180px' }}>
                        <h3 style={{
                            margin: '0 0 8px',
                            fontSize: '12px',
                            textTransform: 'uppercase',
                            color: PAPER.slate500
                        }}>{t.qrPreview}</h3>
                        <div style={{
                            width: '120px',
                            height: '120px',
                            border: `1px solid ${PAPER.gray200}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <QRCodeCanvas
                                value={getCzechQrPayload(invoice)}
                                size={120}
                                level="M"
                                includeMargin={false}
                            />
                        </div>
                    </div>
                    <div style={{ width: '250px' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '10px'
                        }}>
                            <span style={{ color: PAPER.slate500 }}>{t.subtotal}:</span>
                            <span style={{ fontWeight: 600, color: PAPER.gray900 }}>{invoice.currency} {parseFloat(String((invoice.isVatPayer ? (invoice.taxBase || invoice.amount) : invoice.amount) || 0)).toFixed(2)}</span>
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '10px',
                            color: PAPER.slate500,
                            fontSize: '13px'
                        }}>
                            <span>{lang === 'cs' ? 'DPH' : 'VAT'} ({invoice.isVatPayer ? invoice.taxRate : '0'}%)</span>
                            <span>{invoice.currency} {parseFloat(String(invoice.isVatPayer ? (invoice.taxAmount || 0) : 0)).toFixed(2)}</span>
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            paddingTop: '10px',
                            borderTop: `2px solid ${PAPER.indigo}`
                        }}>
                            <span style={{ fontWeight: 700, fontSize: '18px', color: PAPER.gray900 }}>{t.total}:</span>
                            <span style={{
                                fontWeight: 700,
                                fontSize: '18px',
                                color: PAPER.indigo
                            }}>{invoice.currency} {(invoice.amount || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Tax Notes / Reverse Charge */}
                {(invoice.reverseChargeText || (invoice.exchangeRate && invoice.exchangeRate !== '1.0000')) && (
                    <div style={{
                        margin: '20px 0',
                        padding: '15px 20px',
                        border: `1px solid ${PAPER.slate200}`,
                        borderRadius: '8px',
                        background: PAPER.slate50,
                        fontSize: '13px',
                        color: PAPER.gray900
                    }}>
                        {invoice.reverseChargeText && (
                            <div style={{ marginBottom: invoice.exchangeRate ? '8px' : '0' }}>
                                <strong>{t.reverseCharge}:</strong> {invoice.reverseChargeText}
                            </div>
                        )}
                        {invoice.exchangeRate && invoice.exchangeRate !== '1.0000' && (
                            <div style={{ color: PAPER.slate500 }}>
                                {t.exchangeRate}: 1 {invoice.currency} = {invoice.exchangeRate} {(invoice.supplier?.region === 'SK' ? 'EUR' : 'CZK')}
                            </div>
                        )}
                    </div>
                )}

                {/* Minimalistic Payment Details (Bottom) */}
                <div style={{
                    padding: '15px 20px',
                    background: PAPER.slate50,
                    borderTop: `1px solid ${PAPER.slate200}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '20px',
                    fontSize: '13px'
                }}>
                    <div>
                        <span style={{ color: PAPER.slate500, marginRight: '6px' }}>{t.bankAccount}:</span>
                        <span style={{ fontWeight: 600, color: PAPER.gray900 }}>{invoice.payment?.accountNumber}/{invoice.payment?.bankCode}</span>
                    </div>
                    <div>
                        <span style={{ color: PAPER.slate500, marginRight: '6px' }}>{t.iban}:</span>
                        <span style={{ fontWeight: 600, color: PAPER.gray900, fontFamily: 'monospace' }}>{invoice.payment?.iban}</span>
                    </div>
                    <div>
                        <span style={{ color: PAPER.slate500, marginRight: '6px' }}>{t.bic}:</span>
                        <span style={{ fontWeight: 600, color: PAPER.gray900 }}>{invoice.payment?.bic}</span>
                    </div>
                    <div>
                        <span style={{ color: PAPER.slate500, marginRight: '6px' }}>{t.variableSymbol}:</span>
                        <span style={{ fontWeight: 600, color: PAPER.gray900 }}>{invoice.payment?.variableSymbol}</span>
                    </div>
                </div>

                {/* Thank you note */}
                <div style={{
                    marginTop: '20px',
                    color: PAPER.slate400,
                    fontSize: '11px',
                    textAlign: 'center'
                }}>
                    <p>{t.thankYou}</p>
                </div>
            </div>
        </div>
    )
}
