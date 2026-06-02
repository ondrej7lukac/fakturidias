import { useState, useRef } from 'react'
import { Sparkles, Mic, MicOff, X, Camera, Upload, ScanLine, Loader2, Pencil, CheckCircle2, ICON_MD, ICON_LG, ICON_SM, STROKE } from '@/lib/icons'
import { money } from '@/utils/storage'
import type { LiveActivity } from '@/types/activity'

const PREFERRED_AUDIO_TYPES = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
]

const MAX_IMAGE_DIM = 1800
const JPEG_QUALITY = 0.78
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

async function resizeImage(file: File): Promise<{ base64: string; mimeType: string; dataUrl: string }> {
    const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('read-failed'))
        reader.readAsDataURL(file)
    })

    const img: HTMLImageElement = await new Promise((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = () => reject(new Error('image-decode-failed'))
        el.src = dataUrl
    })

    const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas-unavailable')
    ctx.drawImage(img, 0, 0, w, h)

    const outUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    const base64 = outUrl.split(',')[1] || ''
    return { base64, mimeType: 'image/jpeg', dataUrl: outUrl }
}

type PreviewSource = 'text' | 'voice' | 'image'

interface PreviewState {
    data: any
    source: PreviewSource
    text?: string
    imageUrl?: string
}

interface PreviewLine {
    name: string
    qty: number
    price: number
    taxRate: number
}

function summarizeItems(data: any, vatPayer: boolean): { rows: PreviewLine[]; subtotal: number; tax: number; total: number } {
    const items = Array.isArray(data?.items) ? data.items : []
    let subtotal = 0
    let tax = 0
    const rows: PreviewLine[] = items.map((item: any) => {
        const qty = Number(item.qty) || 1
        const price = Number(item.price) || 0
        const taxRate = item.taxRate != null ? Number(item.taxRate) : vatPayer ? 21 : 0
        const lineSubtotal = qty * price
        subtotal += lineSubtotal
        tax += lineSubtotal * (taxRate / 100)
        return { name: String(item.name || ''), qty, price, taxRate }
    })
    return { rows, subtotal, tax, total: subtotal + tax }
}

interface AIPromptProps {
    lang: string
    onFillForm: (data: any) => void
    isGuest?: boolean
    isVatPayer?: boolean
    onActivity?: (activity: LiveActivity | null) => void
}

export default function AIPrompt({ lang, onFillForm, isGuest, isVatPayer = true, onActivity }: AIPromptProps) {
    const [prompt, setPrompt] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [error, setError] = useState('')
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [scanPreview, setScanPreview] = useState<{ dataUrl: string; name: string } | null>(null)
    const [preview, setPreview] = useState<PreviewState | null>(null)

    const isCz = lang === 'cs'

    const handleVoice = async () => {
        if (isListening) {
            mediaRecorderRef.current?.stop()
            setIsListening(false)
            return
        }

        setError('')
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            streamRef.current = stream

            const mimeType = PREFERRED_AUDIO_TYPES.find(t => MediaRecorder.isTypeSupported(t)) || ''
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
            const chunks: Blob[] = []

            recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

            recorder.onstop = async () => {
                streamRef.current?.getTracks().forEach(t => t.stop())
                streamRef.current = null

                if (chunks.length === 0) { onActivity?.(null); return }

                const blob = new Blob(chunks, { type: recorder.mimeType })
                const baseMime = recorder.mimeType.split(';')[0]

                let base64 = ''
                try {
                    base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader()
                        reader.onload = () => resolve((reader.result as string).split(',')[1] || '')
                        reader.onerror = () => reject(new Error('read-failed'))
                        reader.readAsDataURL(blob)
                    })
                } catch {
                    setError(isCz ? 'Chyba při čtení nahrávky.' : 'Failed to read recording.')
                    onActivity?.({ kind: 'error', label: isCz ? 'Nepovedlo se' : 'Couldn’t read it' })
                    return
                }

                setIsLoading(true)
                onActivity?.({ kind: 'processing', label: isCz ? 'Zpracovávám hlas…' : 'Processing your voice…' })
                try {
                    const res = await fetch('/api/ai/invoice-audio', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ audio: base64, mimeType: baseMime, lang }),
                    })
                    const result = await res.json()
                    if (!res.ok) throw new Error(result.message || result.error)
                    setPreview({ data: result.data, source: 'voice', text: result.transcript })
                    onActivity?.({ kind: 'done', label: isCz ? 'Náhled připraven' : 'Preview ready' })
                } catch (err: any) {
                    setError(err?.message || (isCz ? 'Nepodařilo se zpracovat nahrávku.' : 'Failed to process recording.'))
                    onActivity?.({ kind: 'error', label: isCz ? 'Nepovedlo se' : 'Couldn’t read it' })
                } finally {
                    setIsLoading(false)
                }
            }

            recorder.start()
            mediaRecorderRef.current = recorder
            setIsListening(true)
            onActivity?.({ kind: 'listening', label: isCz ? 'Posloucháme…' : 'Listening…' })
        } catch (err: any) {
            const denied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
            setError(denied
                ? (isCz ? 'Přístup k mikrofonu byl zamítnut.' : 'Microphone access was denied.')
                : (isCz ? 'Nelze získat přístup k mikrofonu.' : 'Cannot access microphone.'))
            onActivity?.(null)
        }
    }

    const handleImageFile = async (file: File | undefined | null) => {
        if (!file) return
        setError('')
        if (file.size > 20 * 1024 * 1024) {
            setError(isCz ? 'Soubor je příliš velký (max 20 MB).' : 'File is too large (max 20 MB).')
            return
        }
        if (file.type && !ALLOWED_TYPES.includes(file.type)) {
            setError(isCz ? 'Nepodporovaný formát obrázku.' : 'Unsupported image format.')
            return
        }

        setIsScanning(true)
        onActivity?.({ kind: 'scanning', label: isCz ? 'Skenuji fakturu…' : 'Scanning your invoice…' })
        try {
            const { base64, mimeType, dataUrl } = await resizeImage(file)
            setScanPreview({ dataUrl, name: file.name || (isCz ? 'fotografie' : 'photo') })

            const res = await fetch('/api/ai/invoice-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64, mimeType, lang }),
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.message || result.error)
            setPreview({ data: result.data, source: 'image', imageUrl: dataUrl })
            onActivity?.({ kind: 'done', label: isCz ? 'Náhled připraven' : 'Preview ready' })
        } catch (err: any) {
            setError(err?.message || (isCz ? 'Nepodařilo se přečíst fakturu z obrázku.' : 'Failed to read invoice from image.'))
            onActivity?.({ kind: 'error', label: isCz ? 'Nepovedlo se' : 'Couldn’t read it' })
        } finally {
            setIsScanning(false)
        }
    }

    const onCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        e.target.value = ''
        handleImageFile(f)
    }

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        e.target.value = ''
        handleImageFile(f)
    }

    const processPrompt = async () => {
        const text = prompt.trim()
        if (!text) return
        setIsLoading(true)
        setError('')
        onActivity?.({ kind: 'processing', label: isCz ? 'Čtu vaše zadání…' : 'Reading your prompt…' })
        try {
            const res = await fetch('/api/ai/invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text, lang }),
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.message || result.error)
            setPreview({ data: result.data, source: 'text', text })
            onActivity?.({ kind: 'done', label: isCz ? 'Náhled připraven' : 'Preview ready' })
        } catch (err: any) {
            setError(err.message || (isCz ? 'Chyba při zpracování.' : 'Processing failed.'))
            onActivity?.({ kind: 'error', label: isCz ? 'Nepovedlo se' : 'Couldn’t read it' })
        } finally {
            setIsLoading(false)
        }
    }

    const confirmPreview = () => {
        if (!preview) return
        onFillForm(preview.data)
        setPreview(null)
        setPrompt('')
        setScanPreview(null)
        setError('')
    }

    const editPreview = () => {
        if (preview?.source === 'text' && preview.text) {
            setPrompt(preview.text)
        }
        setPreview(null)
        setScanPreview(null)
    }

    if (isGuest) {
        return (
            <div className="ap-ai">
                <div className="ap-ai__head">
                    <h3>
                        <Sparkles size={ICON_MD} strokeWidth={STROKE} />
                        {isCz ? 'AI asistent' : 'AI assistant'}
                    </h3>
                    <div className="ap-ai__sub" style={{ color: 'var(--muted)' }}>
                        {isCz
                            ? 'AI funkce jsou dostupné pouze pro přihlášené uživatele. Přihlaste se pro přístup.'
                            : 'AI features are available for logged-in users only. Sign in to access.'}
                    </div>
                </div>
            </div>
        )
    }

    if (preview) {
        const summary = summarizeItems(preview.data, isVatPayer)
        const currency = preview.data?.currency || 'CZK'
        const itemCount = summary.rows.length
        const itemsValue = `${itemCount} ${itemCount === 1
            ? (isCz ? 'položka' : 'item')
            : (isCz ? 'položek' : 'items')}`
        const FieldIcon = preview.source === 'image' ? ScanLine : preview.source === 'text' ? Pencil : Mic

        return (
            <div className="lp-demo ap-ai-preview">
                <div className="lp-demo__halo" aria-hidden />
                <div className="lp-demo__card">
                    <div className="lp-demo__head">
                        <Sparkles size={ICON_MD} strokeWidth={STROKE} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                            {isCz ? 'AI vstup' : 'AI input'}
                        </span>
                        <span className="badge">{isCz ? 'Náhled' : 'Preview'}</span>
                    </div>

                    <div className="lp-demo__field">
                        {preview.imageUrl ? (
                            <img className="lp-demo__thumb" src={preview.imageUrl} alt="" />
                        ) : (
                            <div className="lp-demo__mic">
                                <FieldIcon size={ICON_LG} strokeWidth={STROKE} />
                            </div>
                        )}
                        <div className="lp-demo__text">
                            {preview.text
                                ? <em>{preview.text}</em>
                                : (isCz ? 'Naskenovaná faktura' : 'Scanned invoice')}
                        </div>
                        {!preview.imageUrl && (
                            <div className="lp-demo__wave" aria-hidden>
                                <span /><span /><span /><span /><span /><span />
                            </div>
                        )}
                    </div>

                    <div className="lp-demo__chips">
                        <div className="lp-demo__chip">
                            <div className="lp-demo__chip-label">{isCz ? 'Klient' : 'Client'}</div>
                            <div className="lp-demo__chip-value">{preview.data?.clientName || '—'}</div>
                        </div>
                        <div className="lp-demo__chip">
                            <div className="lp-demo__chip-label">{isCz ? 'Položky' : 'Items'}</div>
                            <div className="lp-demo__chip-value">{itemsValue}</div>
                        </div>
                        <div className="lp-demo__chip">
                            <div className="lp-demo__chip-label">{isCz ? 'Bez DPH' : 'Subtotal'}</div>
                            <div className="lp-demo__chip-value">{money(summary.subtotal)} {currency}</div>
                        </div>
                        <div className="lp-demo__chip lp-demo__chip--accent">
                            <div className="lp-demo__chip-label">{isCz ? 'Celkem' : 'Total'}</div>
                            <div className="lp-demo__chip-value">{money(summary.total)} {currency}</div>
                        </div>
                    </div>

                    {error && <p style={{ fontSize: 12, color: 'var(--danger)', margin: '14px 0 0' }}>{error}</p>}

                    <div className="lp-demo__action">
                        <button type="button" className="lp-btn lp-btn--secondary" onClick={editPreview}>
                            <Pencil size={ICON_SM} strokeWidth={STROKE} /> {isCz ? 'Upravit' : 'Edit'}
                        </button>
                        <button type="button" className="lp-btn lp-btn--primary" onClick={confirmPreview}>
                            <CheckCircle2 size={ICON_SM} strokeWidth={STROKE} /> {isCz ? 'Vytvořit fakturu' : 'Create invoice'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="ap-ai">
            <div className="ap-ai__head">
                <h3>
                    <Sparkles size={ICON_MD} strokeWidth={STROKE} />
                    {isCz ? 'Vyplňte fakturu hlasem nebo textem' : 'Fill the invoice by voice or text'}
                </h3>
                <div className="ap-ai__sub">
                    {isCz
                        ? 'AI rozpozná klienta, položky a DPH. Před vytvořením faktury vše zkontrolujete.'
                        : 'The AI extracts the client, line items and VAT. You review everything before the invoice is created.'}
                </div>
            </div>

            <div className="ap-ai__row">
                <div className="ap-ai__input">
                    <textarea
                        className="ap-ai__textarea"
                        placeholder={isCz
                            ? 'Diktujte nebo napište, např. „Vyfakturuj 12 hodin práce Acme Studio za 1500 Kč s 21% DPH..."'
                            : 'Dictate or type, e.g. "Bill 12 hours of work for Acme Studio at 1500 CZK with 21% VAT..."'}
                        rows={2}
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        disabled={isLoading}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                processPrompt()
                            }
                        }}
                    />
                    <button
                        type="button"
                        className={`ap-ai__mic${isListening ? ' ap-ai__mic--active' : ''}`}
                        onClick={handleVoice}
                        disabled={isLoading}
                        aria-label={isCz ? 'Mikrofon' : 'Mic'}
                    >
                        {isLoading
                            ? <Loader2 size={ICON_LG} strokeWidth={STROKE} className="ap-ai__scan-spin" />
                            : isListening
                                ? <MicOff size={ICON_LG} strokeWidth={STROKE} />
                                : <Mic size={ICON_LG} strokeWidth={STROKE} />}
                    </button>
                </div>

                <div className="ap-ai__actions">
                    <button
                        type="button"
                        className="ap-btn ap-btn--primary"
                        onClick={() => processPrompt()}
                        disabled={isLoading || !prompt.trim()}
                    >
                        <Sparkles size={ICON_SM} strokeWidth={STROKE} />
                        {isLoading ? (isCz ? 'Zpracovávám…' : 'Processing…') : (isCz ? 'Náhled faktury' : 'Preview invoice')}
                    </button>
                    <button
                        type="button"
                        className="ap-btn ap-btn--ghost"
                        onClick={() => { setPrompt(''); setError('') }}
                    >
                        <X size={ICON_SM} strokeWidth={STROKE} />
                        {isCz ? 'Smazat' : 'Clear'}
                    </button>
                </div>
            </div>

            {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8, marginBottom: 0 }}>{error}</p>}

            <div className="ap-ai__divider">{isCz ? 'nebo naskenujte fakturu' : 'or scan an invoice'}</div>

            <div className="ap-ai__scan">
                <button
                    type="button"
                    className="ap-ai__scan-btn"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isScanning || isLoading}
                >
                    {isScanning
                        ? <Loader2 size={ICON_MD} strokeWidth={STROKE} className="ap-ai__scan-spin" />
                        : <Camera size={ICON_MD} strokeWidth={STROKE} />}
                    {isCz ? 'Vyfotit fakturu' : 'Take photo'}
                </button>
                <button
                    type="button"
                    className="ap-ai__scan-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning || isLoading}
                >
                    <Upload size={ICON_MD} strokeWidth={STROKE} />
                    {isCz ? 'Nahrát obrázek' : 'Upload image'}
                </button>
            </div>

            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={onCameraChange}
            />
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                hidden
                onChange={onFileChange}
            />

            <p className="ap-ai__scan-hint">
                <ScanLine size={ICON_SM} strokeWidth={STROKE} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                {isCz
                    ? 'AI přečte fakturu z fotografie a zobrazí náhled ke kontrole.'
                    : 'AI reads the invoice from your photo and shows a preview to review.'}
            </p>

            {scanPreview && (
                <div className="ap-ai__scan-preview">
                    <img className="ap-ai__scan-thumb" src={scanPreview.dataUrl} alt="" />
                    <div className="ap-ai__scan-meta">
                        <span className="ap-ai__scan-meta-name">{scanPreview.name}</span>
                        <span className="ap-ai__scan-meta-sub">
                            {isScanning
                                ? (isCz ? 'Zpracovávám obrázek…' : 'Processing image…')
                                : (isCz ? 'Připraveno k náhledu.' : 'Ready for preview.')}
                        </span>
                    </div>
                    <button
                        type="button"
                        className="ap-btn ap-btn--ghost"
                        onClick={() => setScanPreview(null)}
                        aria-label={isCz ? 'Zavřít' : 'Dismiss'}
                    >
                        <X size={ICON_SM} strokeWidth={STROKE} />
                    </button>
                </div>
            )}
        </div>
    )
}
