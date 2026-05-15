import './WelcomeScreen.css'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from '@/lib/icons'

interface WelcomeScreenProps {
  onLogin: () => void
  onContinueAsGuest: () => void
  lang?: string
}

const translations = {
  cs: {
    tagline: 'Vytvořte fakturu nejrychleji jak to jde',
    free: 'Zdarma',
    freeDesc: 'Generovat faktury',
    freeFeature1: 'Uložit 5 faktur zdarma',
    freeFeature2: 'Základní funkce',
    unlimited5: 'Neomezené faktury',
    unlimited5Price: '65 CZK / měsíc',
    unlimited5Desc: 'Pro malé firmy',
    unlimited5Feature1: 'Neomezený počet faktur',
    unlimited5Feature2: 'Pokročilé funkce',
    unlimited5Feature3: 'Podpora emailem',
    unlimited: 'Neomezené funkce',
    unlimitedPrice: '120 CZK / měsíc',
    unlimitedDesc: 'Pro profesionály',
    unlimitedFeature1: 'Vše z předchozího plánu',
    unlimitedFeature2: 'API přístup',
    unlimitedFeature3: 'Prioritní podpora',
    unlimitedFeature4: 'Vlastní šablony',
    login: 'Přihlásit se & pokračovat',
    guest: 'Pokračovat jako host',
    footer: 'Začněte zdarma, žádná kreditní karta není nutná',
  },
  en: {
    tagline: 'Make your invoice the fastest way possible',
    free: 'Free',
    freeDesc: 'Generate invoices',
    freeFeature1: 'Save 5 invoices free',
    freeFeature2: 'Basic features',
    unlimited5: 'Unlimited Invoices',
    unlimited5Price: '65 CZK / month',
    unlimited5Desc: 'For small businesses',
    unlimited5Feature1: 'Unlimited invoices',
    unlimited5Feature2: 'Advanced features',
    unlimited5Feature3: 'Email support',
    unlimited: 'Unlimited Features',
    unlimitedPrice: '120 CZK / month',
    unlimitedDesc: 'For professionals',
    unlimitedFeature1: 'Everything from previous',
    unlimitedFeature2: 'API access',
    unlimitedFeature3: 'Priority support',
    unlimitedFeature4: 'Custom templates',
    login: 'Login & Continue',
    guest: 'Continue as Guest',
    footer: 'Start free, no credit card required',
  },
}

export default function WelcomeScreen({ onLogin, onContinueAsGuest, lang = 'cs' }: WelcomeScreenProps) {
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null)
  const text = translations[lang as keyof typeof translations] || translations.cs

  const plans = [
    { id: 'free', name: text.free, price: text.freeDesc, features: [text.freeFeature1, text.freeFeature2], accent: false },
    { id: 'unlimited5', name: text.unlimited5, price: text.unlimited5Price, description: text.unlimited5Desc, features: [text.unlimited5Feature1, text.unlimited5Feature2, text.unlimited5Feature3], accent: true },
    { id: 'unlimited', name: text.unlimited, price: text.unlimitedPrice, description: text.unlimitedDesc, features: [text.unlimitedFeature1, text.unlimitedFeature2, text.unlimitedFeature3, text.unlimitedFeature4], accent: false },
  ]

  return (
    <div className="welcome-screen">
      <div className="welcome-container">
        <div className="welcome-hero">
          <div className="welcome-logo-container">
            <img src="/GEMINI_LOGO_LONG.png" alt="Fakturidias Logo" className="welcome-logo" />
          </div>
          <p className="welcome-tagline">{text.tagline}</p>
        </div>

        <div className="pricing-grid">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`pricing-card ${plan.accent ? 'pricing-card-accent' : ''} ${hoveredPlan === plan.id ? 'pricing-card-hovered' : ''}`}
              onMouseEnter={() => setHoveredPlan(plan.id)}
              onMouseLeave={() => setHoveredPlan(null)}
            >
              <div className="pricing-card-header">
                <h3 className="pricing-card-title">{plan.name}</h3>
                {'description' in plan && <p className="pricing-card-description">{plan.description}</p>}
                <div className="pricing-card-price">{plan.price}</div>
              </div>
              <ul className="pricing-card-features">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="pricing-card-feature">
                    <CheckCircle2 size={16} strokeWidth={2} className="pricing-feature-icon" style={{ color: 'var(--accent-2)', flexShrink: 0 }} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="welcome-actions">
          <Button
            onClick={onLogin}
            className="welcome-btn welcome-btn-primary"
            style={{ background: 'var(--accent)', color: 'white', border: '2px solid var(--accent)', borderRadius: '50px', padding: '1rem 2.5rem', fontSize: '1.125rem', fontWeight: 700, height: 'auto' }}
          >
            <span className="welcome-btn-icon">G</span>
            {text.login}
          </Button>
          <Button
            onClick={onContinueAsGuest}
            variant="outline"
            className="welcome-btn welcome-btn-secondary"
            style={{ background: 'transparent', color: 'var(--text)', border: '2px solid var(--border)', borderRadius: '50px', padding: '1rem 2.5rem', fontSize: '1.125rem', fontWeight: 700, height: 'auto' }}
          >
            {text.guest}
          </Button>
        </div>

        <p className="welcome-footer">{text.footer}</p>
      </div>
    </div>
  )
}
