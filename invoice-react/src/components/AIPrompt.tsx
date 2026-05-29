import { useState, useRef } from 'react'
import { Sparkles, Mic, MicOff, X, Camera, Upload, ScanLine, Loader2, ICON_MD, ICON_LG, ICON_SM, STROKE } from '@/lib/icons'

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

const SAMPLES = {
    cs: [
        'Faktura pro Novák s.r.o. za 3 hodiny konzultace po 2000 Kč, 21% DPH, splatnost 14 dní',
        'Webdesign pro e-shop, paušál 25 000 Kč, klient Jan Dvořák, splatnost konec měsíce',
        '5 hodin programování, 1500 Kč/h, bez DPH',
    ],
    en: [
        'Invoice Acme Studio for 3h UX consulting at 2000 CZK, 21% VAT, due in 14 days',
        'Monthly retainer for social media management, 15000 CZK, client John Smith',
        '5 hours of development work at 1500 CZK/h, no VAT',
    ],
}

interface AIPromptProps {
    lang: string
    onFillForm: (data: any) => void
    isGuest?: boolean
}

export default function AIPrompt({ lang, onFillForm, isGuest }: AIPromptProps) {
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

    const isCz = lang === 'cs'
    const samples = SAMPLES[lang as keyof typeof SAMPLES] || SAMPLES.en

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

                if (chunks.length === 0) return

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
                    return
                }

                setIsLoading(true)
                try {
                    const res = await fetch('/api/ai/invoice-audio', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ audio: base64, mimeType: baseMime, lang }),
                    })
                    const result = await res.json()
                    if (!res.ok) throw new Error(result.message || result.error)
                    onFillForm(result.data)
                } catch (err: any) {
                    setError(err?.message || (isCz ? 'Nepodařilo se zpracovat nahrávku.' : 'Failed to process recording.'))
                } finally {
                    setIsLoading(false)
                }
            }

            recorder.start()
            mediaRecorderRef.current = recorder
            setIsListening(true)
        } catch (err: any) {
            const denied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
            setError(denied
                ? (isCz ? 'Přístup k mikrofonu byl zamítnut.' : 'Microphone access was denied.')
                : (isCz ? 'Nelze získat přístup k mikrofonu.' : 'Cannot access microphone.'))
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
            onFillForm(result.data)
        } catch (err: any) {
            setError(err?.message || (isCz ? 'Nepodařilo se přečíst fakturu z obrázku.' : 'Failed to read invoice from image.'))
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
        try {
            const res = await fetch('/api/ai/invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text, lang }),
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.message || result.error)
            onFillForm(result.data)
        } catch (err: any) {
            setError(err.message || (isCz ? 'Chyba při zpracování.' : 'Processing failed.'))
        } finally {
            setIsLoading(false)
        }
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

    return (
        <div className="ap-ai">
            <div className="ap-ai__head">
                <h3>
                    <Sparkles size={ICON_MD} strokeWidth={STROKE} />
                    {isCz ? 'Vyplňte fakturu hlasem nebo textem' : 'Fill the invoice by voice or text'}
                </h3>
                <div className="ap-ai__sub">
                    {isCz
                        ? 'AI rozpozná klienta, položky a DPH. Co AI nepochopí, opravíte jedním klikem.'
                        : 'The AI extracts the client, line items and VAT. Whatever it misreads, fix in one click.'}
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
                        {isLoading ? (isCz ? 'Zpracovávám…' : 'Processing…') : (isCz ? 'Vyplnit formulář' : 'Fill form')}
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
                    ? 'AI vyplní formulář z fotografie. Fakturu si zkontrolujte před uložením.'
                    : 'AI fills the form from your photo. Review the fields before saving.'}
            </p>

            {scanPreview && (
                <div className="ap-ai__scan-preview">
                    <img className="ap-ai__scan-thumb" src={scanPreview.dataUrl} alt="" />
                    <div className="ap-ai__scan-meta">
                        <span className="ap-ai__scan-meta-name">{scanPreview.name}</span>
                        <span className="ap-ai__scan-meta-sub">
                            {isScanning
                                ? (isCz ? 'Zpracovávám obrázek…' : 'Processing image…')
                                : (isCz ? 'Pole byla vyplněna – zkontrolujte je.' : 'Fields filled — please review.')}
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

            <div className="ap-ai__hints">
                <div className="ap-ai__hints-title">{isCz ? 'Příklady:' : 'Examples:'}</div>
                {samples.map((s, i) => (
                    <button key={i} type="button" className="ap-ai__hint" onClick={() => setPrompt(s)}>
                        {s}
                    </button>
                ))}
            </div>
        </div>
    )
}
