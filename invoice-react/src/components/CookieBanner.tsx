import { useState, useEffect } from 'react'
import Clarity from '@microsoft/clarity'
import './CookieBanner.css'

const CLARITY_ID = import.meta.env.VITE_CLARITY_ID as string
const STORAGE_KEY = 'cookie_consent' // 'accepted' | 'declined'

function grantGA4Consent() {
    if (typeof (window as any).gtag === 'function') {
        ;(window as any).gtag('consent', 'update', {
            analytics_storage: 'granted',
            ad_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted',
        })
    }
}

// Loaded only after the user accepts the cookie banner — keeps the GDPR
// promise in CookieBanner/PolicyPage that Clarity stays off until consent.
function loadClarity() {
    if (!CLARITY_ID || (window as any).__clarityLoaded) return
    ;(window as any).__clarityLoaded = true
    Clarity.init(CLARITY_ID)
}

interface CookieBannerProps {
    lang: string
}

export default function CookieBanner({ lang }: CookieBannerProps) {
    const [visible, setVisible] = useState(false)
    const isCz = lang === 'cs'

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === 'accepted') {
            grantGA4Consent()
            loadClarity()
        } else if (!stored) {
            setVisible(true)
        }
    }, [])

    const handleAccept = () => {
        localStorage.setItem(STORAGE_KEY, 'accepted')
        grantGA4Consent()
        loadClarity()
        setVisible(false)
    }

    const handleDecline = () => {
        localStorage.setItem(STORAGE_KEY, 'declined')
        setVisible(false)
    }

    if (!visible) return null

    return (
        <div className="cb-root" role="dialog" aria-label={isCz ? 'Souhlas s cookies' : 'Cookie consent'}>
            <div className="cb-inner">
                <div className="cb-text">
                    <span className="cb-icon">🍪</span>
                    <div className="cb-copy">
                        <p className="cb-copy__primary">
                            {isCz
                                ? 'Používáme cookies a analytické nástroje (Google Analytics, Microsoft Clarity) ke zlepšení vaší zkušenosti. Pokud odmítnete, Google Analytics bude fungovat v anonymním režimu bez cookies. Clarity nebude načtena.'
                                : 'We use cookies and analytics tools (Google Analytics, Microsoft Clarity) to improve your experience. If you decline, Google Analytics runs in cookieless anonymised mode. Clarity will not be loaded.'}
                        </p>
                    </div>
                </div>
                <div className="cb-actions">
                    <button className="cb-btn cb-btn--accept" onClick={handleAccept}>
                        {isCz ? 'Přijmout vše' : 'Accept all'}
                    </button>
                    <button className="cb-btn cb-btn--decline" onClick={handleDecline}>
                        {isCz ? 'Odmítnout' : 'Decline'}
                    </button>
                </div>
            </div>
        </div>
    )
}
