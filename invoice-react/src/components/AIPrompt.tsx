import { useState, useRef } from 'react'
import { Sparkles, Mic, MicOff, X, ICON_MD, ICON_LG, ICON_SM, STROKE } from '@/lib/icons'

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
    onPreviewInvoice: (data: any) => void
}

export default function AIPrompt({ lang, onFillForm, onPreviewInvoice }: AIPromptProps) {
    const [prompt, setPrompt] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [error, setError] = useState('')
    const recognitionRef = useRef<any>(null)

    const isCz = lang === 'cs'
    const samples = SAMPLES[lang as keyof typeof SAMPLES] || SAMPLES.en

    const handleVoice = () => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SR) {
            setError(isCz ? 'Hlasový vstup není podporován ve vašem prohlížeči.' : 'Voice input is not supported in your browser.')
            return
        }
        if (isListening) {
            recognitionRef.current?.stop()
            setIsListening(false)
            return
        }
        const recognition = new SR()
        recognition.lang = isCz ? 'cs-CZ' : 'en-US'
        recognition.continuous = false
        recognition.interimResults = false
        recognition.onresult = (e: any) => {
            const transcript: string = e.results[0][0].transcript
            setPrompt(prev => prev ? `${prev} ${transcript}` : transcript)
        }
        recognition.onend = () => setIsListening(false)
        recognition.onerror = () => {
            setIsListening(false)
            setError(isCz ? 'Chyba rozpoznávání hlasu.' : 'Voice recognition error.')
        }
        recognitionRef.current = recognition
        recognition.start()
        setIsListening(true)
    }

    const processPrompt = async (mode: 'form' | 'preview') => {
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
            if (mode === 'form') onFillForm(result.data)
            else onPreviewInvoice(result.data)
        } catch (err: any) {
            setError(err.message || (isCz ? 'Chyba při zpracování.' : 'Processing failed.'))
        } finally {
            setIsLoading(false)
        }
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
                                processPrompt('form')
                            }
                        }}
                    />
                    <button
                        type="button"
                        className={`ap-ai__mic${isListening ? ' ap-ai__mic--active' : ''}`}
                        onClick={handleVoice}
                        aria-label={isCz ? 'Mikrofon' : 'Mic'}
                    >
                        {isListening
                            ? <MicOff size={ICON_LG} strokeWidth={STROKE} />
                            : <Mic size={ICON_LG} strokeWidth={STROKE} />}
                    </button>
                </div>

                <div className="ap-ai__actions">
                    <button
                        type="button"
                        className="ap-btn ap-btn--primary"
                        onClick={() => processPrompt('form')}
                        disabled={isLoading || !prompt.trim()}
                    >
                        <Sparkles size={ICON_SM} strokeWidth={STROKE} />
                        {isLoading ? (isCz ? 'Zpracovávám…' : 'Processing…') : (isCz ? 'Vygenerovat' : 'Generate')}
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
