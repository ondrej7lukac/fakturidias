import { useState } from 'react'

export default function WelcomeScreen({ onLogin, onContinueAsGuest, lang = 'cs' }) {
    const [hoveredPlan, setHoveredPlan] = useState(null)

    const t = {
        cs: {
            welcome: 'Vítejte v Fakturidias',
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
            guest: 'Pokračovat jako host'
        },
        en: {
            welcome: 'Welcome to Fakturidias',
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
            guest: 'Continue as Guest'
        }
    }

    const text = t[lang] || t.cs

    const plans = [
        {
            id: 'free',
            name: text.free,
            price: text.freeDesc,
            features: [text.freeFeature1, text.freeFeature2],
            accent: false
        },
        {
            id: 'unlimited5',
            name: text.unlimited5,
            price: text.unlimited5Price,
            description: text.unlimited5Desc,
            features: [text.unlimited5Feature1, text.unlimited5Feature2, text.unlimited5Feature3],
            accent: true
        },
        {
            id: 'unlimited',
            name: text.unlimited,
            price: text.unlimitedPrice,
            description: text.unlimitedDesc,
            features: [text.unlimitedFeature1, text.unlimitedFeature2, text.unlimitedFeature3, text.unlimitedFeature4],
            accent: false
        }
    ]

    return (
        <div className="welcome-screen">
            <div className="welcome-container">
                {/* Hero Section */}
                <div className="welcome-hero">
                    <div className="welcome-logo-container">
                        <img
                            src="/GEMINI_LOGO_LONG.png"
                            alt="Fakturidias Logo"
                            className="welcome-logo"
                        />
                    </div>
                    <p className="welcome-tagline">{text.tagline}</p>
                </div>

                {/* Pricing Cards */}
                <div className="pricing-grid">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`pricing-card ${plan.accent ? 'pricing-card-accent' : ''} ${hoveredPlan === plan.id ? 'pricing-card-hovered' : ''}`}
                            onMouseEnter={() => setHoveredPlan(plan.id)}
                            onMouseLeave={() => setHoveredPlan(null)}
                        >
                            <div className="pricing-card-header">
                                <h3 className="pricing-card-title">{plan.name}</h3>
                                {plan.description && (
                                    <p className="pricing-card-description">{plan.description}</p>
                                )}
                                <div className="pricing-card-price">{plan.price}</div>
                            </div>
                            <ul className="pricing-card-features">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="pricing-card-feature">
                                        <span className="pricing-feature-icon">✓</span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* CTA Buttons */}
                <div className="welcome-actions">
                    <button onClick={onLogin} className="welcome-btn welcome-btn-primary">
                        <span className="welcome-btn-icon">G</span>
                        {text.login}
                    </button>
                    <button onClick={onContinueAsGuest} className="welcome-btn welcome-btn-secondary">
                        {text.guest}
                    </button>
                </div>

                {/* Footer Note */}
                <p className="welcome-footer">
                    {lang === 'cs' ? 'Začněte zdarma, žádná kreditní karta není nutná' : 'Start free, no credit card required'}
                </p>
            </div>
        </div>
    )
}

