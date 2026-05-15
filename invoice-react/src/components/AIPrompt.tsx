import './AIPrompt.css'
import { useState, useRef } from 'react'
import { Sparkles, Mic, MicOff, ICON_MD, STROKE } from '@/lib/icons'

const SAMPLES = {
    cs: [
        'Faktura pro Acme s.r.o., 5 hodin konzultace po 2 500 Kč, splatnost 14 dní',
        'Vyfakturuj TechStart a.s. (IČO 12345678) za vývoj webu 35 000 Kč a logo 8 000 Kč, splatnost 30 dní',
        'Jan Novák, jan@novak.cz, 3 měsíce hostingu po 990 Kč/měsíc, splatnost konec měsíce',
    ],
    en: [
        'Invoice Acme Corp for 5 hours consulting at 2500 CZK/hour, due in 14 days',
        'Bill TechStart s.r.o. (ICO 12345678) for website development 35000 CZK and logo 8000 CZK, due in 30 days',
        'John Smith, john@example.com, 3 months hosting at 990 CZK/month, due end of month',
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
        <div className="ai-prompt-panel">
            <div className="ai-prompt-header">
                <Sparkles size={ICON_MD} strokeWidth={STROKE} />
                <span>{isCz ? 'Vytvořit fakturu pomocí AI' : 'Create Invoice with AI'}</span>
            </div>

            <div className="ai-prompt-input-row">
                <textarea
                    className="ai-prompt-textarea"
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder={
                        isCz
                            ? 'Popište fakturu... např. "Faktura pro Acme s.r.o., 5 hodin konzultace po 2 500 Kč, splatnost 14 dní"'
                            : 'Describe your invoice... e.g. "Invoice Acme Corp for 5 hours consulting at 2500 CZK/hour, due in 14 days"'
                    }
                    rows={2}
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
                    className={`ai-mic-btn${isListening ? ' ai-mic-btn--active' : ''}`}
                    onClick={handleVoice}
                    title={isCz ? (isListening ? 'Zastavit nahrávání' : 'Mluvit') : (isListening ? 'Stop recording' : 'Speak')}
                >
                    {isListening
                        ? <MicOff size={ICON_MD} strokeWidth={STROKE} />
                        : <Mic size={ICON_MD} strokeWidth={STROKE} />
                    }
                </button>
            </div>

            <div className="ai-prompt-samples">
                {samples.map((s, i) => (
                    <button
                        key={i}
                        type="button"
                        className="ai-sample-chip"
                        onClick={() => setPrompt(s)}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {error && <p className="ai-prompt-error">{error}</p>}

            <div className="ai-prompt-actions">
                <button
                    type="button"
                    className="primary"
                    onClick={() => processPrompt('form')}
                    disabled={isLoading || !prompt.trim()}
                >
                    {isLoading
                        ? (isCz ? 'Zpracovávám…' : 'Processing…')
                        : (isCz ? 'Vyplnit formulář' : 'Fill Form')}
                </button>
                <button
                    type="button"
                    className="secondary"
                    onClick={() => processPrompt('preview')}
                    disabled={isLoading || !prompt.trim()}
                >
                    {isCz ? 'Náhled faktury' : 'Preview Invoice'}
                </button>
            </div>
        </div>
    )
}
