import { QRCodeCanvas } from 'qrcode.react'
import { getCzechQrPayload } from '../utils/bank'

export default function InvoicePreview({ invoice, t, lang }) {
    return (
        <div style={{
            maxWidth: '210mm',
            margin: '0 auto',
            padding: '20mm',
            background: '#ffffff',
            color: '#111827',
            fontFamily: 'Inter, sans-serif',
            minHeight: '297mm',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderRadius: '4px'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '50px',
                borderBottom: '2px solid #6366f1',
                paddingBottom: '20px'
            }}>
                <div>
                    <h1 style={{
                        margin: 0,
                        color: '#6366f1',
                        fontSize: '32px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '-0.025em'
                    }}>{t.invoice}</h1>
                    <p style={{
                        margin: '5px 0',
                        color: '#64748b',
                        fontSize: '16px',
                        fontWeight: 500
                    }}># {invoice.invoiceNumber}</p>
                </div>
                <div style={{ textAlign: 'right', color: '#1f2937' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                        {t.issueDate}: <span style={{ fontWeight: 400 }}>{invoice.issueDate}</span>
                    </p>
                    <p style={{ margin: '5px 0', fontWeight: 600 }}>
                        {t.dueDate}: <span style={{
                            fontWeight: 400,
                            color: new Date(invoice.dueDate) < new Date() ? '#ef4444' : 'inherit'
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
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '60px',
                marginBottom: '50px'
            }}>
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
                        color: '#111827'
                    }}>{invoice.supplier?.name || '---'}</p>
                    <p style={{
                        margin: '6px 0',
                        lineHeight: 1.5,
                        color: '#374151'
                    }}>{invoice.supplier?.address || ''}</p>
                    <div style={{ fontSize: '14px', color: '#4b5563' }}>
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
                            padding: '8px',
                            background: '#fef3c7',
                            border: '1px solid #fbbf24',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600
                        }}>⚠️ Nejsem plátce DPH</p>
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
                        color: '#111827'
                    }}>{invoice.client.name}</p>
                    <p style={{
                        margin: '6px 0',
                        lineHeight: 1.5,
                        color: '#374151'
                    }}>{invoice.client.address || ''}</p>
                    <div style={{ fontSize: '14px', color: '#4b5563' }}>
                        {invoice.client.ico && (
                            <p style={{ margin: '2px 0' }}>
                                <strong>{t.ico}:</strong> {invoice.client.ico}
                            </p>
                        )}
                        {invoice.client.vat && (
                            <p style={{ margin: '2px 0' }}>
                                <strong>{t.vat}:</strong> {invoice.client.vat}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment Details */}
            <div style={{
                marginBottom: '50px',
                background: '#f8fafc',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
            }}>
                <h3 style={{
                    margin: '0 0 12px',
                    fontSize: '13px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#64748b',
                    letterSpacing: '0.05em'
                }}>{t.paymentDetails}</h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '20px'
                }}>
                    <div>
                        <p style={{
                            margin: 0,
                            fontSize: '12px',
                            color: '#64748b',
                            textTransform: 'uppercase'
                        }}>{t.iban}</p>
                        <p style={{
                            margin: '4px 0',
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            fontSize: '14px'
                        }}>{invoice.payment.iban || 'N/A'}</p>
                    </div>
                    <div>
                        <p style={{
                            margin: 0,
                            fontSize: '12px',
                            color: '#64748b',
                            textTransform: 'uppercase'
                        }}>{t.bic}</p>
                        <p style={{
                            margin: '4px 0',
                            fontWeight: 600
                        }}>{invoice.payment.bic || 'N/A'}</p>
                    </div>
                    <div>
                        <p style={{
                            margin: 0,
                            fontSize: '12px',
                            color: '#64748b',
                            textTransform: 'uppercase'
                        }}>{t.paymentNote}</p>
                        <p style={{
                            margin: '4px 0',
                            fontWeight: 600
                        }}>{invoice.payment.note || invoice.invoiceNumber}</p>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: '40px'
            }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{
                            textAlign: 'left',
                            padding: '10px 0',
                            color: '#64748b',
                            fontSize: '12px',
                            textTransform: 'uppercase'
                        }}>{t.itemDescription}</th>
                        <th style={{
                            textAlign: 'center',
                            padding: '10px 0',
                            color: '#64748b',
                            fontSize: '12px',
                            textTransform: 'uppercase'
                        }}>{t.qty}</th>
                        <th style={{
                            textAlign: 'right',
                            padding: '10px 0',
                            color: '#64748b',
                            fontSize: '12px',
                            textTransform: 'uppercase'
                        }}>{t.price}</th>
                        <th style={{
                            textAlign: 'right',
                            padding: '10px 0',
                            color: '#64748b',
                            fontSize: '12px',
                            textTransform: 'uppercase'
                        }}>{t.total}</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.items.map((item, idx) => (
                        <tr key={idx}>
                            <td style={{
                                padding: '12px 0',
                                borderBottom: '1px solid #e5e7eb'
                            }}>{item.name}</td>
                            <td style={{
                                padding: '12px 0',
                                borderBottom: '1px solid #e5e7eb',
                                textAlign: 'center'
                            }}>{item.qty}</td>
                            <td style={{
                                padding: '12px 0',
                                borderBottom: '1px solid #e5e7eb',
                                textAlign: 'right'
                            }}>{invoice.currency} {item.price.toFixed(2)}</td>
                            <td style={{
                                padding: '12px 0',
                                borderBottom: '1px solid #e5e7eb',
                                textAlign: 'right'
                            }}>{invoice.currency} {item.total.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* VAT Section */}
            {invoice.isVatPayer && (
                <div style={{
                    marginBottom: '30px',
                    padding: '15px',
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
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
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '15px',
                        fontSize: '14px'
                    }}>
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
                                color: '#15803d'
                            }}>{invoice.currency} {parseFloat(invoice.taxBase || 0).toFixed(2)}</p>
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
                                color: '#15803d'
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
                                color: '#15803d'
                            }}>{invoice.currency} {parseFloat(invoice.taxAmount || 0).toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer with QR and Total */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end'
            }}>
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
                        border: '1px solid #e5e7eb',
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
                        <span style={{ fontWeight: 600 }}>{invoice.currency} {invoice.amount.toFixed(2)}</span>
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: '10px',
                        borderTop: '2px solid #6366f1'
                    }}>
                        <span style={{ fontWeight: 700, fontSize: '18px' }}>{t.total}:</span>
                        <span style={{
                            fontWeight: 700,
                            fontSize: '18px',
                            color: '#6366f1'
                        }}>{invoice.currency} {invoice.amount.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Thank you note */}
            <div style={{
                marginTop: '60px',
                paddingTop: '20px',
                borderTop: '1px solid #e5e7eb',
                color: '#64748b',
                fontSize: '12px',
                textAlign: 'center'
            }}>
                <p>{t.thankYou}</p>
            </div>
        </div>
    )
}
