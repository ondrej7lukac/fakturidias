import './InvoicePreview.css'
import { QRCodeCanvas } from 'qrcode.react'
import { getCzechQrPayload } from '../utils/bank'
import { documentTypeTitleKey } from '../utils/storage'
import type { Invoice } from '../types/invoice'

interface InvoicePreviewProps {
    invoice: Invoice
    t: Record<string, string>
    lang: string
}

export default function InvoicePreview({ invoice, t, lang }: InvoicePreviewProps) {
    return (
        <div className="invoice-preview">
            {/* Header */}
            <div className="preview-header">
                <div>
                    <h1 style={{
                        margin: 0,
                        color: 'var(--accent-2)',
                        fontSize: '32px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '-0.025em'
                    }}>{t[documentTypeTitleKey(invoice.documentType)]}</h1>
                    <p style={{
                        margin: '5px 0',
                        color: 'var(--muted)',
                        fontSize: '16px',
                        fontWeight: 500
                    }}># {invoice.invoiceNumber}</p>
                </div>
                <div style={{ textAlign: 'right', color: 'var(--text)' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                        {t.issueDate}: <span style={{ fontWeight: 400 }}>{invoice.issueDate}</span>
                    </p>
                    <p style={{ margin: '5px 0', fontWeight: 600 }}>
                        {t.dueDate}: <span style={{
                            fontWeight: 400,
                            color: new Date(invoice.dueDate || '') < new Date() ? 'var(--danger)' : 'inherit'
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
                        color: 'var(--muted)',
                        letterSpacing: '0.05em'
                    }}>{t.issuer}</h3>
                    <p style={{
                        margin: 0,
                        fontWeight: 700,
                        fontSize: '18px',
                        color: 'var(--text)'
                    }}>{invoice.supplier?.name || '---'}</p>
                    <p style={{
                        margin: '6px 0',
                        lineHeight: 1.5,
                        color: 'var(--text)'
                    }}>{invoice.supplier?.address || ''}</p>
                    <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
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
                            color: 'var(--muted)',
                            fontSize: '11px',
                            fontStyle: 'italic'
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
                        color: 'var(--muted)',
                        letterSpacing: '0.05em'
                    }}>{t.billTo}</h3>
                    <p style={{
                        margin: 0,
                        fontWeight: 700,
                        fontSize: '18px',
                        color: 'var(--text)'
                    }}>{invoice.client?.name}</p>
                    <p style={{
                        margin: '6px 0',
                        lineHeight: 1.5,
                        color: 'var(--text)'
                    }}>{invoice.client?.address || ''}</p>
                    <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
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
                        <tr style={{ borderBottom: '2px solid var(--border)' }}>
                            <th style={{
                                textAlign: 'left',
                                padding: '10px 0',
                                color: 'var(--muted)',
                                fontSize: '12px',
                                textTransform: 'uppercase'
                            }}>{t.itemDescription}</th>
                            <th style={{
                                textAlign: 'center',
                                padding: '10px 0',
                                color: 'var(--muted)',
                                fontSize: '12px',
                                textTransform: 'uppercase'
                            }}>{t.qty}</th>
                            <th style={{
                                textAlign: 'right',
                                padding: '10px 0',
                                color: 'var(--muted)',
                                fontSize: '12px',
                                textTransform: 'uppercase'
                            }}>{lang === 'cs' ? 'CENA/JEDN.' : 'PRICE/UNIT'}</th>
                            <th style={{
                                textAlign: 'center',
                                padding: '10px 0',
                                color: 'var(--muted)',
                                fontSize: '12px',
                                textTransform: 'uppercase'
                            }}>{lang === 'cs' ? 'DPH %' : 'TAX %'}</th>
                            <th style={{
                                textAlign: 'right',
                                padding: '10px 0',
                                color: 'var(--muted)',
                                fontSize: '12px',
                                textTransform: 'uppercase'
                            }}>{lang === 'cs' ? 'SLEVA' : 'DISC.'}</th>
                            <th style={{
                                textAlign: 'right',
                                padding: '10px 0',
                                color: 'var(--muted)',
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
                                    borderBottom: '1px solid var(--border)'
                                }}>{item.name}</td>
                                <td style={{
                                    padding: '12px 0',
                                    borderBottom: '1px solid var(--border)',
                                    textAlign: 'center'
                                }}>{item.qty}</td>
                                <td style={{
                                    padding: '12px 0',
                                    borderBottom: '1px solid var(--border)',
                                    textAlign: 'right'
                                }}>{invoice.currency} {item.price.toFixed(2)}</td>
                                <td style={{
                                    padding: '12px 0',
                                    borderBottom: '1px solid var(--border)',
                                    textAlign: 'center'
                                }}>{item.taxRate || 0}%</td>
                                <td style={{
                                    padding: '12px 0',
                                    borderBottom: '1px solid var(--border)',
                                    textAlign: 'right'
                                }}>{item.discount && item.discount > 0 ? `${invoice.currency} ${item.discount.toFixed(2)}` : '-'}</td>
                                <td style={{
                                    padding: '12px 0',
                                    borderBottom: '1px solid var(--border)',
                                    textAlign: 'right'
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
                    background: 'var(--success-bg)',
                    border: '1px solid var(--success-border)',
                    borderRadius: '8px'
                }}>
                    <h3 style={{
                        margin: '0 0 10px',
                        fontSize: '13px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'var(--accent-ink)',
                        letterSpacing: '0.05em'
                    }}>Daňový doklad - Rozpis DPH</h3>
                    <div className="preview-vat-grid">
                        <div>
                            <p style={{
                                margin: 0,
                                fontSize: '11px',
                                color: 'var(--accent-ink)',
                                textTransform: 'uppercase'
                            }}>Základ daně</p>
                            <p style={{
                                margin: '4px 0',
                                fontWeight: 600,
                                color: 'var(--accent-ink)'
                            }}>{invoice.currency} {parseFloat(String(invoice.taxBase || 0)).toFixed(2)}</p>
                        </div>
                        <div>
                            <p style={{
                                margin: 0,
                                fontSize: '11px',
                                color: 'var(--accent-ink)',
                                textTransform: 'uppercase'
                            }}>Sazba DPH</p>
                            <p style={{
                                margin: '4px 0',
                                fontWeight: 600,
                                color: 'var(--accent-ink)'
                            }}>{invoice.taxRate || '21'}%</p>
                        </div>
                        <div>
                            <p style={{
                                margin: 0,
                                fontSize: '11px',
                                color: 'var(--accent-ink)',
                                textTransform: 'uppercase'
                            }}>Výše daně</p>
                            <p style={{
                                margin: '4px 0',
                                fontWeight: 600,
                                color: 'var(--accent-ink)'
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
                        color: 'var(--muted)'
                    }}>{t.qrPreview}</h3>
                    <div style={{
                        width: '120px',
                        height: '120px',
                        border: '1px solid var(--border)',
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
                        <span style={{ color: 'var(--muted)' }}>{t.subtotal}:</span>
                        <span style={{ fontWeight: 600 }}>{invoice.currency} {parseFloat(String((invoice.isVatPayer ? (invoice.taxBase || invoice.amount) : invoice.amount) || 0)).toFixed(2)}</span>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '10px',
                        color: 'var(--muted)',
                        fontSize: '13px'
                    }}>
                        <span>{lang === 'cs' ? 'DPH' : 'VAT'} ({invoice.isVatPayer ? invoice.taxRate : '0'}%)</span>
                        <span>{invoice.currency} {parseFloat(String(invoice.isVatPayer ? (invoice.taxAmount || 0) : 0)).toFixed(2)}</span>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: '10px',
                        borderTop: '2px solid var(--accent-2)'
                    }}>
                        <span style={{ fontWeight: 700, fontSize: '18px' }}>{t.total}:</span>
                        <span style={{
                            fontWeight: 700,
                            fontSize: '18px',
                            color: 'var(--accent-2)'
                        }}>{invoice.currency} {(invoice.amount || 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Tax Notes / Reverse Charge */}
            {(invoice.reverseChargeText || (invoice.exchangeRate && invoice.exchangeRate !== '1.0000')) && (
                <div style={{ 
                    margin: '20px 0', 
                    padding: '15px 20px', 
                    border: '1px solid var(--border)', 
                    borderRadius: '8px', 
                    background: 'var(--card2)',
                    fontSize: '13px',
                    color: 'var(--text)'
                }}>
                    {invoice.reverseChargeText && (
                        <div style={{ marginBottom: invoice.exchangeRate ? '8px' : '0' }}>
                            <strong>{t.reverseCharge}:</strong> {invoice.reverseChargeText}
                        </div>
                    )}
                    {invoice.exchangeRate && invoice.exchangeRate !== '1.0000' && (
                        <div style={{ fontStyle: 'italic', color: 'var(--muted)' }}>
                            {t.exchangeRate}: 1 {invoice.currency} = {invoice.exchangeRate} {(invoice.supplier?.region === 'SK' ? 'EUR' : 'CZK')}
                        </div>
                    )}
                </div>
            )}

            {/* Minimalistic Payment Details (Bottom) */}
            <div style={{
                padding: '15px 20px',
                background: 'var(--card2)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '20px',
                fontSize: '13px'
            }}>
                <div>
                    <span style={{ color: 'var(--muted)', marginRight: '6px' }}>{t.bankAccount}:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{invoice.payment?.accountNumber}/{invoice.payment?.bankCode}</span>
                </div>
                <div>
                    <span style={{ color: 'var(--muted)', marginRight: '6px' }}>{t.iban}:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>{invoice.payment?.iban}</span>
                </div>
                <div>
                    <span style={{ color: 'var(--muted)', marginRight: '6px' }}>{t.bic}:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{invoice.payment?.bic}</span>
                </div>
                <div>
                    <span style={{ color: 'var(--muted)', marginRight: '6px' }}>{t.variableSymbol}:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{invoice.payment?.variableSymbol}</span>
                </div>
            </div>

            {/* Thank you note */}
            <div style={{
                marginTop: '20px',
                color: 'var(--muted2)',
                fontSize: '11px',
                textAlign: 'center'
            }}>
                <p>{t.thankYou}</p>
            </div>
        </div>
    )
}
