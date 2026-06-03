import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { money } from '../utils/storage'
import { getCzechQrPayload } from '../utils/bank'
import type { Invoice } from '../types/invoice'

interface QRPreviewProps {
    invoice: Invoice
    lang: string
    t: Record<string, string>
}

export default function QRPreview({ invoice, lang, t }: QRPreviewProps) {
    const qrContainerRef = useRef<HTMLDivElement>(null)
    const qrPayload = getCzechQrPayload(invoice)

    return (
        <section className="card" style={{ marginTop: '20px' }}>
            <h2>{t.qrPreview}</h2>
            <p className="invoice-meta">
                {t.qrInstruction}
            </p>
            <div id="qr" ref={qrContainerRef} style={{ background: 'var(--card)', padding: '10px', borderRadius: '8px', display: 'inline-block', marginBottom: '15px' }}>
                {invoice ? (
                    <QRCodeCanvas
                        value={qrPayload}
                        size={180}
                        level="M"
                    />
                ) : (
                    <span className="empty">{t.qrEmpty}</span>
                )}
            </div>
            <div className="grid">
                <div>
                    <label htmlFor="qrText">{t.qrPayload}</label>
                    <textarea
                        id="qrText"
                        value={qrPayload}
                        readOnly
                        style={{ fontSize: '0.8rem', opacity: 0.7 }}
                    />
                </div>
            </div>
        </section>
    )
}
