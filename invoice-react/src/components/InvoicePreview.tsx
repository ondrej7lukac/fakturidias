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
                        color: '#2563eb',
                        fontSize: '32px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '-0.025em'
                    }}>{t[documentTypeTitleKey(invoice.documentType)]}</h1>
                    <p style={{
                        margin: '5px 0',
                        color: '#64748b',
                        fontSize: '16px',
                        fontWeight: 500
                    }}># {invoice.invoiceNumber}</p>
                </div>
                <div style={{ textAlign: 'right', color: '#0f172a' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                        {t.issueDate}: <span style={{ fontWeight: 400 }}>{invoice.issueDate}</span>
                    </p>
                    <p style={{ margin: '5px 0', fontWeight: 600 }}>
                        {t.dueDate}: <span style={{
                            fontWeight: 400,
                            color: new Date(invoice.dueDate || '') < new Date() ? '#dc2626' : 'inherit'
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
                        color: '#64748b',
                        letterSpacing: '0.05em'
                    }}>{t.issuer}</h3>
                    <p style={{
                        margin: 0,
                        fontWeight: 700,
                        fontSize: '18px',
                        color: '#0f172a'
                    }}>{invoice.supplier?.name || '---'}</p>
                    <p style={{
                        margin: '6px 0',
                        lineHeight: 1.5,
                        color: '#334155'
                    }}>{invoice.supplier?.address || ''}</p>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>
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
                            color: '#64748b',
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
                        color: '#64748b',
                        letterSpacing: '0.05em'
                    }}>{t.billTo}</h3>
                    <p style={{
                        margin: 0,
                        fontWeight: 700,
                        fontSize: '18px',
                        color: '#0f172a'
                    }}>{invoice.client?.name}</p>
                    <p style={{
                        margin: '6px 0',
                        lineHeight: 1.5,
                        color: '#334155'
                    }}>{invoice.client?.address || ''}</p>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>
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
                        <tr style={{ borderBottom: '2px solid #cbd5e1' }}>
                            <th style={{
                                textAlign: 'left',
                                padding: '10px 0',
                                color: '#475569',
                                fontSize: '12px',
                                textTransform: 'uppercase'
                            }}>{t.itemDescription}</th>
                            <th style={{
                                textAlign: 'center',
                                padding: '10px 0',
                                color: '#475569',
                                fontSize: '12px',
                                textTransform: 'uppercase'
                            }}>{t.qty}</th>
                            <th style={{
                                textAlign: 'right',
                                padding: '10px 0',
                                color: '#475569',
                                fontSize: '12px',
                                textTransform: 'uppercase'
                            }}>{lang === 'cs' ? 'CENA/JEDN.' : 'PRICE/UNIT'}</th>
                            <th style={{
                                textAlign: 'center',
                                padding: '10px 0',
                                color: '#475569',
                                fontSize: '12px',
                                textTransform: 'uppercase'
                            }}>{lang === 'cs' ? 'DPH %' : 'TAX %'}</th>
                            <th style={{
                                textAlign: 'right',
                                padding: '10px 0',
                                color: '#475569',
                                fontSize: '12px',
                                textTransform: 'uppercase'
                            }}>{lang === 'cs' ? 'SLEVA' : 'DISC.'}</th>
                            <th style={{
                                textAlign: 'right',
                                padding: '10px 0',
                                color: '#475569',
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
                                    borderBottom: '1px solid #f1f5f9',
                                    color: '#1e293b'
                                }}>{item.name}</td>
                                <td style={{
                                    padding: '12px 0',
                                    borderBottom: '1px solid #f1f5f9',
                                    textAlign: 'center',
                                    color: '#1e293b'
                                }}>{item.qty}</td>
                                <td style={{
                                    padding: '12px 0',
                                    borderBottom: '1px solid #f1f5f9',
                                    textAlign: 'right',
                                    color: '#1e293b'
                                }}>{invoice.currency} {item.price.toFixed(2)}</td>
                                <td style={{
                                    padding: '12px 0',
                                    borderBottom: '1px solid #f1f5f9',
                                    textAlign: 'center',
                                    color: '#1e293b'
                                }}>{item.taxRate || 0}%</td>
                                <td style={{
                                    padding: '12px 0',
                                    borderBottom: '1px solid #f1f5f9',
                                    textAlign: 'right',
                                    color: '#1e293b'
                                }}>{item.discount && Number(item.discount) > 0 ? ((item.discountType || 'percent') === 'percent' ? `${item.discount}%` : `${invoice.currency} ${Number(item.discount).toFixed(2)}`) : '-'}</td>
                                <td style={{
                                    padding: '12px 0',
                                    borderBottom: '1px solid #f1f5f9',
                                    textAlign: 'right',
                                    color: '#1e293b'
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
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px'
                }}>
                    <h3 style={{
                        margin: '0 0 10px',
                        fontSize: '13px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: '#166534',
                        letterSpacing: '0.05em'
                    }}>Daňový doklad - Rozpis DPH</h3>
                    <div className="preview-vat-grid">
                        <div>
                            <p style={{
                                margin: 0,
                                fontSize: '11px',
                                color: '#166534',
                                textTransform: 'uppercase'
                            }}>Základ daně</p>
                            <p style={{
                                margin: '4px 0',
                                fontWeight: 600,
                                color: '#166534'
                            }}>{invoice.currency} {parseFloat(String(invoice.taxBase || 0)).toFixed(2)}</p>
                        </div>
                        <div>
                            <p style={{
                                margin: 0,
                                fontSize: '11px',
                                color: '#166534',
                                textTransform: 'uppercase'
                            }}>Sazba DPH</p>
                            <p style={{
                                margin: '4px 0',
                                fontWeight: 600,
                                color: '#166534'
                            }}>{invoice.taxRate || '21'}%</p>
                        </div>
                        <div>
                            <p style={{
                                margin: 0,
                                fontSize: '11px',
                                color: '#166534',
                                textTransform: 'uppercase'
                            }}>Výše daně</p>
                            <p style={{
                                margin: '4px 0',
                                fontWeight: 600,
                                color: '#166534'
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
                        color: '#64748b'
                    }}>{t.qrPreview}</h3>
                    <div style={{
                        width: '120px',
                        height: '120px',
                        border: '1px solid #cbd5e1',
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
                        <span style={{ color: '#64748b' }}>{t.subtotal}:</span>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{invoice.currency} {parseFloat(String(invoice.itemsSubtotal || (invoice.isVatPayer ? (invoice.taxBase || invoice.amount) : invoice.amount) || 0)).toFixed(2)}</span>
                    </div>

                    {!!invoice.invoiceDiscount && Number(invoice.invoiceDiscount) > 0 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '10px',
                            color: '#dc2626'
                        }}>
                            <span>{t.invoiceDiscount || 'Sleva'}:</span>
                            <span style={{ fontWeight: 600 }}>
                                - {(invoice.invoiceDiscountType || 'percent') === 'percent' ? `${invoice.invoiceDiscount}%` : `${invoice.currency} ${Number(invoice.invoiceDiscount).toFixed(2)}`}
                            </span>
                        </div>
                    )}

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '10px',
                        color: '#64748b',
                        fontSize: '13px'
                    }}>
                        <span>{lang === 'cs' ? 'DPH' : 'VAT'} ({invoice.isVatPayer ? invoice.taxRate : '0'}%)</span>
                        <span style={{ color: '#0f172a' }}>{invoice.currency} {parseFloat(String(invoice.isVatPayer ? (invoice.taxAmount || 0) : 0)).toFixed(2)}</span>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: '10px',
                        borderTop: '2px solid #2563eb'
                    }}>
                        <span style={{ fontWeight: 700, fontSize: '18px', color: '#0f172a' }}>{t.total}:</span>
                        <span style={{
                            fontWeight: 700,
                            fontSize: '18px',
                            color: '#2563eb'
                        }}>{invoice.currency} {Number(invoice.amount || 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Tax Notes / Reverse Charge */}
            {(invoice.reverseChargeText || (invoice.exchangeRate && invoice.exchangeRate !== '1.0000')) && (
                <div style={{ 
                    margin: '20px 0', 
                    padding: '15px 20px', 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '8px', 
                    background: '#f8fafc',
                    fontSize: '13px',
                    color: '#0f172a'
                }}>
                    {invoice.reverseChargeText && (
                        <div style={{ marginBottom: invoice.exchangeRate ? '8px' : '0' }}>
                            <strong>{t.reverseCharge}:</strong> {invoice.reverseChargeText}
                        </div>
                    )}
                    {invoice.exchangeRate && invoice.exchangeRate !== '1.0000' && (
                        <div style={{ fontStyle: 'italic', color: '#64748b' }}>
                            {t.exchangeRate}: 1 {invoice.currency} = {invoice.exchangeRate} {(invoice.supplier?.region === 'SK' ? 'EUR' : 'CZK')}
                        </div>
                    )}
                </div>
            )}

            {/* Minimalistic Payment Details (Bottom) */}
            <div style={{
                padding: '15px 20px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '20px',
                fontSize: '13px'
            }}>
                <div>
                    <span style={{ color: '#64748b', marginRight: '6px' }}>{t.bankAccount}:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{invoice.payment?.accountNumber}/{invoice.payment?.bankCode}</span>
                </div>
                <div>
                    <span style={{ color: '#64748b', marginRight: '6px' }}>{t.iban}:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>{invoice.payment?.iban}</span>
                </div>
                <div>
                    <span style={{ color: '#64748b', marginRight: '6px' }}>{t.bic}:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{invoice.payment?.bic}</span>
                </div>
                <div>
                    <span style={{ color: '#64748b', marginRight: '6px' }}>{t.variableSymbol}:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{invoice.payment?.variableSymbol}</span>
                </div>
            </div>

            {/* Thank you note */}
            <div style={{
                marginTop: '20px',
                color: '#94a3b8',
                fontSize: '11px',
                textAlign: 'center'
            }}>
                <p>{t.thankYou}</p>
            </div>
        </div>
    )
}
