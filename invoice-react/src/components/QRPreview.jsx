import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { money } from '../utils/storage'
import { getCzechQrPayload } from '../utils/bank'

export default function QRPreview({ invoice, lang, t }) {
    const qrContainerRef = useRef(null)
    const qrPayload = getCzechQrPayload(invoice)

    return (
        <section className="card" style={{ marginTop: '20px' }}>
            <h2>{t.qrPreview}</h2>
            <p className="invoice-meta">
                {t.qrInstruction}
            </p>
            <div id="qr" ref={qrContainerRef} style={{ background: '#fff', padding: '10px', borderRadius: '8px', display: 'inline-block', marginBottom: '15px' }}>
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
