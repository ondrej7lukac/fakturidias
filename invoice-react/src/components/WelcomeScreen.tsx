import './WelcomeScreen.css'
import { useState, useEffect } from 'react'
import PolicyPage from './PolicyPage'
import CookieBanner from './CookieBanner'
import {
    Sparkles, Mic, Pencil, CheckCircle2, Search, Send, Cloud,
    ArrowLeftRight, FileText, BarChart2, Check, ChevronDown,
    ICON_SM, ICON_MD, ICON_LG, STROKE,
} from '@/lib/icons'

const I18N = {
    cs: {
        navFeatures: 'Funkce', navProduct: 'Produkt', navPricing: 'Cena', navFaq: 'Časté otázky',
        signIn: 'Přihlásit se', getStarted: 'Vyzkoušet zdarma',
        heroBadge: 'Postaveno v Praze · pro české firmy',
        heroHeadline1: 'Vystavte fakturu', heroHeadline2: 'hlasem za 12 sekund.',
        heroSub: 'Diktujte fakturu nebo ji napište česky. AI rozpozná klienta, hodiny, sazby i 21 % DPH — a vyplní pole za méně než 15 sekund. ARES, PDF a e-mail jedním klikem. Plně v souladu se zákonem o DPH č. 235/2004 Sb.',
        heroCtaPrimary: 'Začít zdarma', heroCtaSecondary: 'Pokračovat jako host',
        heroNote: 'Žádná kreditní karta · 5 faktur zdarma navždy',
        demoTitle: 'AI vstup',
        demoTranscript: '...vyfakturuj dvanáct hodin práce Acme Design Studio za patnáct set korun na hodinu s DPH...',
        demoClient: 'Klient', demoHours: 'Hodin', demoRate: 'Sazba', demoTotal: 'Celkem',
        demoConfirm: 'Vytvořit fakturu', demoListening: 'Posloucháme', aiEdit: 'Upravit',
        metricsV1: '12 s', metricsL1: 'průměrná faktura',
        metricsV2: '1,1 mil.', metricsL2: 'OSVČ v České republice',
        metricsV3: '97 %', metricsL3: 'úspora času vs. Excel',
        trustLine: 'Firmy, které fakturují rychleji',
        featuresEyebrow: 'Funkce', featuresTitle: 'Vše, co potřebujete k fakturaci v Česku.',
        featuresLead: 'Žádné šablony, žádné výpočty DPH ručně. Diktujte, AI vyplní, ARES zkontroluje.',
        feature1Title: 'Hlasový a textový AI vstup', feature1Body: 'Mluvte česky nebo anglicky. AI parsuje klienta, položky, hodinovou sazbu i DPH — a vrátí strukturovaný náhled průměrně za méně než 15 sekund s přesností přes 95 %.',
        feature2Title: 'ARES integrace', feature2Body: 'Zadáte IČO a Fakturidias automaticky doplní název, adresu a DIČ z českého obchodního rejstříku (ARES) za méně než 1 sekundu.',
        feature3Title: 'PDF a e-mail jedním klikem', feature3Body: 'Generujte profesionální PDF splňující zákon o DPH č. 235/2004 Sb., posílejte klientům přímo z aplikace a sledujte stav platby.',
        feature4Title: 'Bezpečné v cloudu', feature4Body: 'Faktury jsou zálohované na serverech v EU, synchronizované v reálném čase a dostupné z mobilu i webu. Šifrovaný přenos (TLS).',
        feature5Title: 'Dvojjazyčné prostředí', feature5Body: 'Aplikace v češtině i angličtině. Faktury vystavujete v obou jazycích — ideální pro OSVČ fakturující zahraničním klientům v EU.',
        feature6Title: 'Tmavý režim', feature6Body: 'Světlý i tmavý motiv reaguje na nastavení systému. Komfortní práce ráno i pozdě v noci.',
        showcaseEyebrow: 'Náhled', showcaseTitle: 'Faktura, kterou opravdu chcete vidět.',
        showcaseLead: 'Čistý PDF výstup, přehledný seznam, smysluplné metriky. Žádná tabulková nuda 90. let.',
        showcaseTab1: 'Faktura', showcaseTab2: 'Přehled',
        howEyebrow: 'Jak to funguje', howTitle: 'Tři kroky k odeslané faktuře.',
        howStep1Title: 'Diktujte nebo napište', howStep1Body: 'Stiskněte mikrofon a řekněte, komu fakturujete, co a za kolik — česky nebo anglicky. Nebo napište jednu větu. Celý krok trvá průměrně 8 sekund.',
        howStep2Title: 'AI vyplní pole automaticky', howStep2Body: 'Klient, položky, sazby DPH (21 %, 15 %, 12 %, 0 %) a IČO se vyplní samy. ARES doplní firemní profil z rejstříku za méně než 1 sekundu. Cokoliv jedním klikem upravíte.',
        howStep3Title: 'Odešlete PDF', howStep3Body: 'Stáhněte PDF nebo pošlete klientovi e-mailem. Faktura se uloží do přehledu, sleduje stav platby a automaticky se zálohuje do Google Drive.',
        pricingEyebrow: 'Cena', pricingTitle: 'Jednoduchý plán, žádné překvapení.',
        pricingLead: 'Začněte zdarma. Když budete chtít víc, zaplatíte měsíčně nebo ročně.',
        pricingFreeName: 'Zdarma', pricingFreeTagline: 'Generovat faktury', pricingFreePrice: '0 Kč',
        pricingFreeNote: 'navždy', pricingFreeF1: 'Uložit 5 faktur', pricingFreeF2: 'Základní funkce',
        pricingFreeF3: 'ARES vyhledávání', pricingFreeF4: 'PDF export', pricingFreeCta: 'Začít zdarma',
        pricingProName: 'Neomezené faktury', pricingProTag: 'Pro malé firmy', pricingProPrice: '65 Kč',
        pricingProNote: '/ měsíc', pricingProBadge: 'Nejoblíbenější', pricingProF1: 'Neomezený počet faktur',
        pricingProF2: 'Hlasový AI vstup', pricingProF3: 'Pokročilé funkce', pricingProF4: 'Podpora e-mailem',
        pricingProF5: 'Automatické zálohy', pricingProCta: 'Vyzkoušet 14 dní zdarma',
        pricingMaxName: 'Neomezené funkce', pricingMaxTag: 'Pro profesionály', pricingMaxPrice: '120 Kč',
        pricingMaxNote: '/ měsíc', pricingMaxF1: 'Vše z plánu Pro', pricingMaxF2: 'API přístup',
        pricingMaxF3: 'Prioritní podpora', pricingMaxF4: 'Vlastní šablony', pricingMaxF5: 'Vlastní doména PDF',
        pricingMaxCta: 'Začít s Max',
        faqEyebrow: 'Časté otázky', faqTitle: 'Vše, co byste mohli chtít vědět.',
        faq1Q: 'Jak přesný je AI vstup česky?', faq1A: 'Fakturidias AI je trénovaná na českou byznys terminologii — IČO, DIČ, sazby DPH (21 %, 15 %, 12 %, 0 %) a položkové popisky. AI správně rozpozná více než 95 % vstupních polí při prvním pokusu. Cokoliv lze opravit jedním klikem před uložením.',
        faq2Q: 'Funguje to bez připojení k internetu?', faq2A: 'Faktury lze vystavovat offline. Hlasové rozpoznání (Gemini Vertex AI) a ARES vyhledávání potřebují připojení. Faktury se synchronizují automaticky do 30 sekund po obnovení spojení.',
        faq3Q: 'Splňuje to české účetní předpisy?', faq3A: 'Ano. Faktury splňují všechny povinné náležitosti dle § 29 zákona o DPH č. 235/2004 Sb. Podporujeme sazby 21 %, 15 %, 12 % i 0 %, včetně přenesené daňové povinnosti (reverse charge) pro přeshraniční B2B plnění.',
        faq4Q: 'Mohu importovat faktury z jiné aplikace?', faq4A: 'Ano. Podporujeme import z CSV a ze standardizovaných formátů ISDOC (český standard e-faktur) a UBL 2.1. Z velkých systémů jako Pohoda nebo Fakturoid vám pomůžeme s migrací osobně.',
        faq5Q: 'Co se stane s mými daty, když přestanu platit?', faq5A: 'Plán se vrátí na Zdarma a vy si zachováte plný přístup k posledním 5 fakturám. Všechny ostatní si můžete kdykoliv exportovat jako PDF nebo CSV. Data se nemazají — uchováváme je 7 let dle české legislativy.',
        faq6Q: 'Mohu nastavit vlastní šablonu faktury?', faq6A: 'V plánu Neomezené funkce (120 Kč/měsíc) ano — změníte logo, barvy, písmo i rozložení. Plán Neomezené faktury používá výchozí profesionální šablonu Fakturidias.',
        finalTitle: 'Začněte fakturovat hlasem.', finalSub: 'Zdarma navždy pro prvních 5 faktur. Bez kreditní karty.',
        finalCta1: 'Začít zdarma', finalCta2: 'Pokračovat jako host',
        footerTagline: 'Fakturace nové generace · postaveno v Praze',
        footerProduct: 'Produkt', footerCompany: 'Společnost', footerLegal: 'Právní',
        footerFeat1: 'Funkce', footerFeat2: 'Cena',
        footerComp1: 'O nás', footerComp2: 'Blog', footerComp3: 'Kontakt',
        footerLegal1: 'Podmínky a ochrana soukromí', footerLegal3: 'Cookies', footerLegal4: 'GDPR',
        footerRights: '© 2026 Fakturidias s.r.o. · Václavské náměstí 1, Praha',
    },
    en: {
        navFeatures: 'Features', navProduct: 'Product', navPricing: 'Pricing', navFaq: 'FAQ',
        signIn: 'Sign in', getStarted: 'Try it free',
        heroBadge: 'Built in Prague · for Czech businesses',
        heroHeadline1: 'Issue an invoice', heroHeadline2: 'by voice in 12 seconds.',
        heroSub: 'Dictate the invoice in Czech or English. The AI extracts client, hours, rate and 21% VAT in under 15 seconds. ARES lookup, PDF and email — all in one click. Fully compliant with Czech VAT Act No. 235/2004 Coll.',
        heroCtaPrimary: 'Start free', heroCtaSecondary: 'Continue as guest',
        heroNote: 'No credit card · 5 invoices free forever',
        demoTitle: 'AI input',
        demoTranscript: '...bill Acme Design Studio for twelve hours at fifteen hundred crowns per hour plus VAT...',
        demoClient: 'Client', demoHours: 'Hours', demoRate: 'Rate', demoTotal: 'Total',
        demoConfirm: 'Create invoice', demoListening: 'Listening', aiEdit: 'Edit',
        metricsV1: '12 s', metricsL1: 'average invoice',
        metricsV2: '1.1M', metricsL2: 'Czech freelancers (OSVČ)',
        metricsV3: '97 %', metricsL3: 'time saved vs. spreadsheet',
        trustLine: 'Companies billing faster with Fakturidias',
        featuresEyebrow: 'Features', featuresTitle: 'Everything you need to invoice in the Czech Republic.',
        featuresLead: 'No templates, no manual VAT math. Dictate it, the AI fills it, ARES verifies it.',
        feature1Title: 'Voice & text AI input', feature1Body: 'Speak Czech or English. The AI parses client, line items, hourly rate and VAT — returning a structured draft in under 15 seconds with over 95% field accuracy.',
        feature2Title: 'ARES integration', feature2Body: 'Type a business ID (IČO) and Fakturidias auto-fills name, address and VAT number from the Czech business registry (ARES) in under 1 second.',
        feature3Title: 'PDF & email in one click', feature3Body: 'Generate compliant PDFs meeting Czech VAT Act No. 235/2004 Coll., send directly from the app, and track payment status on every invoice.',
        feature4Title: 'Secure cloud sync', feature4Body: 'All invoices are backed up on EU servers, synced in real time, and accessible from mobile or web. Encrypted transit (TLS).',
        feature5Title: 'Bilingual UI', feature5Body: 'Full Czech and English interface. Issue invoices in either language — ideal for freelancers billing international clients across the EU.',
        feature6Title: 'Dark mode', feature6Body: 'Light and dark themes follow the system preference. Comfortable to use morning or late at night.',
        showcaseEyebrow: 'Preview', showcaseTitle: 'An invoice you actually want to look at.',
        showcaseLead: 'Clean PDF output, a list that scans in three seconds, dashboards that mean something.',
        showcaseTab1: 'Invoice', showcaseTab2: 'Dashboard',
        howEyebrow: 'How it works', howTitle: 'Three steps to a sent invoice.',
        howStep1Title: 'Dictate or type', howStep1Body: 'Hit the mic, say who you\'re billing, what for and how much — in Czech or English. Or write a single sentence. The whole step takes about 8 seconds.',
        howStep2Title: 'AI fills the fields', howStep2Body: 'Client, line items, VAT rates (21%, 15%, 12%, 0%) and business IDs populate themselves. ARES fills the company profile in under 1 second. Edit anything with one click.',
        howStep3Title: 'Send the PDF', howStep3Body: 'Download the PDF or email the client directly. The invoice lands in your dashboard with live payment status and auto-backs up to Google Drive.',
        pricingEyebrow: 'Pricing', pricingTitle: 'Simple plans, no surprises.',
        pricingLead: 'Start free. Upgrade monthly or annually when you need more.',
        pricingFreeName: 'Free', pricingFreeTagline: 'Generate invoices', pricingFreePrice: '0 CZK',
        pricingFreeNote: 'forever', pricingFreeF1: 'Save 5 invoices', pricingFreeF2: 'Core features',
        pricingFreeF3: 'ARES lookup', pricingFreeF4: 'PDF export', pricingFreeCta: 'Start free',
        pricingProName: 'Unlimited invoices', pricingProTag: 'For small businesses', pricingProPrice: '65 CZK',
        pricingProNote: '/ month', pricingProBadge: 'Most popular', pricingProF1: 'Unlimited invoices',
        pricingProF2: 'Voice AI input', pricingProF3: 'Advanced features', pricingProF4: 'Email support',
        pricingProF5: 'Automatic backups', pricingProCta: 'Try 14 days free',
        pricingMaxName: 'Unlimited features', pricingMaxTag: 'For professionals', pricingMaxPrice: '120 CZK',
        pricingMaxNote: '/ month', pricingMaxF1: 'Everything in Pro', pricingMaxF2: 'API access',
        pricingMaxF3: 'Priority support', pricingMaxF4: 'Custom templates', pricingMaxF5: 'Custom PDF domain',
        pricingMaxCta: 'Go Max',
        faqEyebrow: 'FAQ', faqTitle: 'Everything you might want to know.',
        faq1Q: 'How accurate is the Czech AI input?', faq1A: 'Fakturidias AI is trained on Czech business terminology — IČO, DIČ, VAT rates (21%, 15%, 12%, 0%), and line-item phrasing. The AI correctly identifies over 95% of input fields on the first attempt. Anything misread can be fixed in one click before saving.',
        faq2Q: 'Does it work offline?', faq2A: 'You can draft invoices offline; voice recognition (Gemini Vertex AI) and ARES lookup need an internet connection. Drafts sync automatically within 30 seconds of reconnection.',
        faq3Q: 'Is it compliant with Czech tax rules?', faq3A: 'Yes. Invoices include all mandatory fields under Section 29 of Czech VAT Act No. 235/2004 Coll. We support rates 21%, 15%, 12% and 0%, including reverse charge for cross-border EU B2B transactions.',
        faq4Q: 'Can I import invoices from another app?', faq4A: 'Yes — CSV, ISDOC (Czech e-invoice standard) and UBL 2.1 formats. For large systems like Pohoda or Fakturoid we\'ll assist with the migration personally.',
        faq5Q: 'What happens to my data if I stop paying?', faq5A: 'Your plan reverts to Free and you keep full access to your last 5 invoices. You can export anything else at any time as PDF or CSV. Data is never deleted — we retain it for 7 years per Czech law.',
        faq6Q: 'Can I customize the invoice template?', faq6A: 'On the Unlimited features plan (120 CZK/month) — change logo, colors, font and layout. The Unlimited invoices plan uses the default Fakturidias professional template.',
        finalTitle: 'Start invoicing by voice.', finalSub: 'Free forever for the first 5 invoices. No credit card.',
        finalCta1: 'Start free', finalCta2: 'Continue as guest',
        footerTagline: 'Next-generation invoicing · built in Prague',
        footerProduct: 'Product', footerCompany: 'Company', footerLegal: 'Legal',
        footerFeat1: 'Features', footerFeat2: 'Pricing',
        footerComp1: 'About', footerComp2: 'Blog', footerComp3: 'Contact',
        footerLegal1: 'Terms & Privacy', footerLegal3: 'Cookies', footerLegal4: 'GDPR',
        footerRights: '© 2026 Fakturidias s.r.o. · Václavské náměstí 1, Prague',
    },
}

type T = typeof I18N['cs']

interface WelcomeScreenProps {
    onLogin: () => void
    onContinueAsGuest: () => void
    lang?: string
}

function SectionHead({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
    return (
        <div className="lp-section__head">
            <div className="lp-section__eyebrow">{eyebrow}</div>
            <h2 className="lp-section__title">{title}</h2>
            {lead && <p className="lp-section__lead">{lead}</p>}
        </div>
    )
}

function InvoiceMock({ t }: { t: T }) {
    const isCz = t === I18N.cs
    return (
        <div className="lp-showcase__mock">
            <div className="lp-mock-topbar">
                <span className="lp-mock-title">{isCz ? 'Faktura 2026-0142' : 'Invoice 2026-0142'}</span>
                <span className="lp-mock-pill">{isCz ? 'Odeslaná' : 'Sent'}</span>
            </div>
            <div className="lp-mock-grid">
                <div className="lp-mock-field">
                    <div className="lp-mock-label">{isCz ? 'Dodavatel' : 'Supplier'}</div>
                    <div className="lp-mock-value">Jan Novák</div>
                    <div className="lp-mock-sub">IČO 12345678</div>
                </div>
                <div className="lp-mock-field">
                    <div className="lp-mock-label">{isCz ? 'Odběratel' : 'Client'}</div>
                    <div className="lp-mock-value">Acme Design Studio</div>
                    <div className="lp-mock-sub">IČO 87654321</div>
                </div>
            </div>
            <div className="lp-mock-items">
                <div className="lp-mock-items-head">
                    <span>{isCz ? 'Popis' : 'Description'}</span>
                    <span>{isCz ? 'Množ.' : 'Qty'}</span>
                    <span>{isCz ? 'Cena/j' : 'Rate'}</span>
                    <span>{isCz ? 'Celkem' : 'Total'}</span>
                </div>
                <div className="lp-mock-items-row">
                    <span>{isCz ? 'Vývoj webu' : 'Web development'}</span>
                    <span>12 h</span>
                    <span>1 500 {isCz ? 'Kč' : 'CZK'}</span>
                    <span>18 000 {isCz ? 'Kč' : 'CZK'}</span>
                </div>
            </div>
            <div className="lp-mock-total">
                <span className="lp-mock-total-label">{isCz ? 'Celkem k úhradě' : 'Total due'}</span>
                <span className="lp-mock-total-value">21 780 {isCz ? 'Kč' : 'CZK'}</span>
            </div>
        </div>
    )
}

function DashboardMock({ t }: { t: T }) {
    const isCz = t === I18N.cs
    const rows = isCz
        ? [
            { name: 'Acme Design Studio', date: '10. 5. 2026', amount: '21 780 Kč', status: 'Zaplaceno' },
            { name: 'Tektonic s.r.o.', date: '4. 5. 2026', amount: '36 000 Kč', status: 'Odeslaná', warn: true },
            { name: 'Pražský Sklep', date: '1. 4. 2026', amount: '30 000 Kč', status: 'Zaplaceno' },
        ]
        : [
            { name: 'Acme Design Studio', date: 'May 10, 2026', amount: '21,780 CZK', status: 'Paid' },
            { name: 'Tektonic s.r.o.', date: 'May 4, 2026', amount: '36,000 CZK', status: 'Sent', warn: true },
            { name: 'Pražský Sklep', date: 'Apr 1, 2026', amount: '30,000 CZK', status: 'Paid' },
        ]
    return (
        <div className="lp-showcase__mock">
            <div className="lp-mock-stats">
                <div className="lp-mock-stat">
                    <div className="lp-mock-stat-label">{isCz ? 'Fakturováno' : 'Invoiced'}</div>
                    <div className="lp-mock-stat-value">{isCz ? '142 300 Kč' : '142,300 CZK'}</div>
                </div>
                <div className="lp-mock-stat lp-mock-stat--accent">
                    <div className="lp-mock-stat-label">{isCz ? 'Zaplaceno' : 'Paid'}</div>
                    <div className="lp-mock-stat-value">{isCz ? '98 500 Kč' : '98,500 CZK'}</div>
                </div>
                <div className="lp-mock-stat">
                    <div className="lp-mock-stat-label">{isCz ? 'Čeká' : 'Pending'}</div>
                    <div className="lp-mock-stat-value">{isCz ? '43 800 Kč' : '43,800 CZK'}</div>
                </div>
            </div>
            <div className="lp-mock-rows">
                {rows.map((r, i) => (
                    <div key={i} className="lp-mock-row">
                        <div>
                            <div>{r.name}</div>
                            <div className="lp-mock-row-meta">{r.date}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span className={`lp-mock-pill${r.warn ? ' lp-mock-pill--warn' : ''}`}>{r.status}</span>
                            <span className="lp-mock-row-amount">{r.amount}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function WelcomeScreen({ onLogin, onContinueAsGuest, lang: initialLang = 'cs' }: WelcomeScreenProps) {
    const [lang, setLang] = useState(initialLang)
    const [theme, setTheme] = useState<'dark' | 'light'>(() =>
        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    )
    const [faqOpen, setFaqOpen] = useState(-1)
    const [showcaseTab, setShowcaseTab] = useState<'invoice' | 'dashboard'>('invoice')
    const [policyPage, setPolicyPage] = useState<'terms-privacy' | 'cookies' | 'gdpr' | null>(null)

    const t = I18N[lang as keyof typeof I18N] ?? I18N.cs

    useEffect(() => {
        document.documentElement.classList.remove('theme-light', 'theme-dark')
        document.documentElement.classList.add(`theme-${theme}`)
        return () => {
            document.documentElement.classList.remove('theme-light', 'theme-dark')
        }
    }, [theme])

    const isCz = lang === 'cs'

    const features = [
        { Icon: Mic,            title: t.feature1Title, body: t.feature1Body, alt: false },
        { Icon: Search,         title: t.feature2Title, body: t.feature2Body, alt: true  },
        { Icon: Send,           title: t.feature3Title, body: t.feature3Body, alt: false },
        { Icon: Cloud,          title: t.feature4Title, body: t.feature4Body, alt: true  },
        { Icon: ArrowLeftRight, title: t.feature5Title, body: t.feature5Body, alt: false },
        { Icon: Sparkles,       title: t.feature6Title, body: t.feature6Body, alt: true  },
    ]

    const pricingTiers = [
        {
            name: t.pricingFreeName, tag: t.pricingFreeTagline, price: t.pricingFreePrice, note: t.pricingFreeNote,
            features: [t.pricingFreeF1, t.pricingFreeF2, t.pricingFreeF3, t.pricingFreeF4],
            cta: t.pricingFreeCta, ctaClass: 'lp-btn--secondary', featured: false, badge: undefined,
        },
        {
            name: t.pricingProName, tag: t.pricingProTag, price: t.pricingProPrice, note: t.pricingProNote,
            features: [t.pricingProF1, t.pricingProF2, t.pricingProF3, t.pricingProF4, t.pricingProF5],
            cta: t.pricingProCta, ctaClass: 'lp-btn--primary', featured: true, badge: t.pricingProBadge,
        },
        {
            name: t.pricingMaxName, tag: t.pricingMaxTag, price: t.pricingMaxPrice, note: t.pricingMaxNote,
            features: [t.pricingMaxF1, t.pricingMaxF2, t.pricingMaxF3, t.pricingMaxF4, t.pricingMaxF5],
            cta: t.pricingMaxCta, ctaClass: 'lp-btn--secondary', featured: false, badge: undefined,
        },
    ]

    const faqItems = [
        { q: t.faq1Q, a: t.faq1A },
        { q: t.faq2Q, a: t.faq2A },
        { q: t.faq3Q, a: t.faq3A },
        { q: t.faq4Q, a: t.faq4A },
        { q: t.faq5Q, a: t.faq5A },
        { q: t.faq6Q, a: t.faq6A },
    ]

    const toggleFaq = (i: number) => setFaqOpen(prev => prev === i ? -1 : i)

    if (policyPage) {
        return (
            <>
                <CookieBanner lang={lang} />
                <PolicyPage page={policyPage} lang={lang} onBack={() => { setPolicyPage(null); window.scrollTo(0, 0) }} />
            </>
        )
    }

    return (
        <>
        <CookieBanner lang={lang} />
        <div className="welcome-screen">

            {/* ── Header ── */}
            <header className="lp-header">
                <div className="lp-header__inner">
                    <a className="lp-brand" href="#" onClick={e => e.preventDefault()}>
                        <img src="/GEMINI_LOGO_LONG.png" alt="Fakturidias" className="lp-logo" />
                    </a>
                    <nav className="lp-nav">
                        <a className="lp-nav__link" href="#features">{t.navFeatures}</a>
                        <a className="lp-nav__link" href="#showcase">{t.navProduct}</a>
                        <a className="lp-nav__link" href="#pricing">{t.navPricing}</a>
                        <a className="lp-nav__link" href="#faq">{t.navFaq}</a>
                    </nav>
                    <div className="lp-header__actions">
                        <div className="lp-lang">
                            <button className={`lp-lang__btn${lang === 'cs' ? ' lp-lang__btn--active' : ''}`} onClick={() => setLang('cs')}>CS</button>
                            <button className={`lp-lang__btn${lang === 'en' ? ' lp-lang__btn--active' : ''}`} onClick={() => setLang('en')}>EN</button>
                        </div>
                        <button
                            className="lp-icon-toggle"
                            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                        >
                            {theme === 'dark'
                                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>}
                        </button>
                        <button className="lp-btn lp-btn--ghost" onClick={onLogin}>{t.signIn}</button>
                        <button className="lp-btn lp-btn--primary" onClick={onContinueAsGuest}>{t.getStarted}</button>
                    </div>
                </div>
            </header>

            {/* ── Hero ── */}
            <section className="lp-hero">
                <div className="lp-container">
                    <div className="lp-eyebrow">{t.heroBadge}</div>
                    <h1>
                        {t.heroHeadline1}<br />
                        <span className="accent">{t.heroHeadline2}</span>
                    </h1>
                    <p className="lp-hero__sub">{t.heroSub}</p>
                    <div className="lp-hero__ctas">
                        <button className="lp-btn lp-btn--primary lp-btn--lg" onClick={onContinueAsGuest}>
                            <Sparkles size={ICON_MD} strokeWidth={STROKE} />
                            {t.heroCtaPrimary}
                        </button>
                        <button className="lp-btn lp-btn--secondary lp-btn--lg" onClick={onContinueAsGuest}>
                            {t.heroCtaSecondary}
                        </button>
                    </div>
                    <div className="lp-hero__note">{t.heroNote}</div>

                    {/* Animated AI demo card */}
                    <div className="lp-demo">
                        <div className="lp-demo__halo" aria-hidden />
                        <div className="lp-demo__card">
                            <div className="lp-demo__head">
                                <Sparkles size={ICON_MD} strokeWidth={STROKE} style={{ color: 'var(--accent)' }} />
                                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{t.demoTitle}</span>
                                <span className="badge">{t.demoListening}</span>
                            </div>
                            <div className="lp-demo__field">
                                <div className="lp-demo__mic">
                                    <Mic size={ICON_LG} strokeWidth={STROKE} />
                                </div>
                                <div className="lp-demo__text"><em>{t.demoTranscript}</em></div>
                                <div className="lp-demo__wave" aria-hidden>
                                    <span /><span /><span /><span /><span /><span />
                                </div>
                            </div>
                            <div className="lp-demo__chips">
                                <div className="lp-demo__chip">
                                    <div className="lp-demo__chip-label">{t.demoClient}</div>
                                    <div className="lp-demo__chip-value">Acme Design Studio</div>
                                </div>
                                <div className="lp-demo__chip">
                                    <div className="lp-demo__chip-label">{t.demoHours}</div>
                                    <div className="lp-demo__chip-value">12,0 h</div>
                                </div>
                                <div className="lp-demo__chip">
                                    <div className="lp-demo__chip-label">{t.demoRate}</div>
                                    <div className="lp-demo__chip-value">1 500 / h</div>
                                </div>
                                <div className="lp-demo__chip lp-demo__chip--accent">
                                    <div className="lp-demo__chip-label">{t.demoTotal}</div>
                                    <div className="lp-demo__chip-value">21 780 {isCz ? 'Kč' : 'CZK'}</div>
                                </div>
                            </div>
                            <div className="lp-demo__action">
                                <button className="lp-btn lp-btn--secondary" onClick={onContinueAsGuest}>
                                    <Pencil size={ICON_SM} strokeWidth={STROKE} /> {t.aiEdit}
                                </button>
                                <button className="lp-btn lp-btn--primary" onClick={onContinueAsGuest}>
                                    <CheckCircle2 size={ICON_SM} strokeWidth={STROKE} /> {t.demoConfirm}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Trust strip ── */}
            <section className="lp-trust">
                <div className="lp-container">
                    <div className="lp-trust__line">{t.trustLine}</div>
                    <div className="lp-trust__logos">
                        <span className="lp-trust__logo">acme<span style={{ color: 'var(--accent)' }}>·</span>studio</span>
                        <span className="lp-trust__logo">Tektonic</span>
                        <span className="lp-trust__logo">Pražský Sklep</span>
                        <span className="lp-trust__logo">Novák Consulting</span>
                        <span className="lp-trust__logo">studio květinka</span>
                    </div>
                </div>
            </section>

            {/* ── Metrics bar ── */}
            <div className="lp-container">
                <div className="lp-metrics">
                    <div className="lp-metrics__item">
                        <div className="lp-metrics__value">{t.metricsV1}</div>
                        <div className="lp-metrics__label">{t.metricsL1}</div>
                    </div>
                    <div className="lp-metrics__item">
                        <div className="lp-metrics__value">{t.metricsV2}</div>
                        <div className="lp-metrics__label">{t.metricsL2}</div>
                    </div>
                    <div className="lp-metrics__item">
                        <div className="lp-metrics__value">{t.metricsV3}</div>
                        <div className="lp-metrics__label">{t.metricsL3}</div>
                    </div>
                </div>
            </div>

            {/* ── Features ── */}
            <section className="lp-section" id="features">
                <div className="lp-container">
                    <SectionHead eyebrow={t.featuresEyebrow} title={t.featuresTitle} lead={t.featuresLead} />
                    <div className="lp-features">
                        {features.map((f, i) => (
                            <div key={i} className="lp-feature">
                                <div className={`lp-feature__icon${f.alt ? ' lp-feature__icon--alt' : ''}`}>
                                    <f.Icon size={20} strokeWidth={STROKE} />
                                </div>
                                <h3 className="lp-feature__title">{f.title}</h3>
                                <p className="lp-feature__body">{f.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Showcase ── */}
            <section className="lp-section" id="showcase">
                <div className="lp-container">
                    <SectionHead eyebrow={t.showcaseEyebrow} title={t.showcaseTitle} lead={t.showcaseLead} />
                    <div className="lp-showcase">
                        <div className="lp-showcase__tabs" role="tablist">
                            <div className="lp-showcase__tabs-seg">
                                <button
                                    className={`lp-showcase__tab${showcaseTab === 'invoice' ? ' lp-showcase__tab--active' : ''}`}
                                    onClick={() => setShowcaseTab('invoice')}
                                >
                                    <FileText size={ICON_SM} strokeWidth={STROKE} style={{ marginRight: 6, verticalAlign: '-2px' }} />
                                    {t.showcaseTab1}
                                </button>
                                <button
                                    className={`lp-showcase__tab${showcaseTab === 'dashboard' ? ' lp-showcase__tab--active' : ''}`}
                                    onClick={() => setShowcaseTab('dashboard')}
                                >
                                    <BarChart2 size={ICON_SM} strokeWidth={STROKE} style={{ marginRight: 6, verticalAlign: '-2px' }} />
                                    {t.showcaseTab2}
                                </button>
                            </div>
                            <button className="lp-showcase__open" onClick={onContinueAsGuest}>
                                {isCz ? 'Otevřít aplikaci' : 'Open app'} ↗
                            </button>
                        </div>
                        <div className="lp-showcase__viewport">
                            <div className="lp-mockup__chrome">
                                <span className="lp-mockup__dot" /><span className="lp-mockup__dot" /><span className="lp-mockup__dot" />
                                <span className="lp-mockup__url">
                                    {showcaseTab === 'invoice'
                                        ? 'app.fakturidias.cz / faktura/2026-0142'
                                        : 'app.fakturidias.cz / přehled'}
                                </span>
                                <span style={{ width: 26 }} />
                            </div>
                            {showcaseTab === 'invoice'
                                ? <InvoiceMock t={t} />
                                : <DashboardMock t={t} />}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── How it works ── */}
            <section className="lp-section" id="how">
                <div className="lp-container">
                    <SectionHead eyebrow={t.howEyebrow} title={t.howTitle} />
                    <div className="lp-steps">
                        {[
                            { num: '01', title: t.howStep1Title, body: t.howStep1Body },
                            { num: '02', title: t.howStep2Title, body: t.howStep2Body },
                            { num: '03', title: t.howStep3Title, body: t.howStep3Body },
                        ].map((s, i) => (
                            <div key={i} className="lp-step">
                                <span className="lp-step__num">{s.num}</span>
                                <h3 className="lp-step__title">{s.title}</h3>
                                <p className="lp-step__body">{s.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Pricing ── */}
            <section className="lp-section" id="pricing">
                <div className="lp-container">
                    <SectionHead eyebrow={t.pricingEyebrow} title={t.pricingTitle} lead={t.pricingLead} />
                    <div className="lp-pricing">
                        {pricingTiers.map((tier, i) => (
                            <div key={i} className={`lp-price-card${tier.featured ? ' lp-price-card--featured' : ''}`}>
                                {tier.badge && <span className="lp-price-card__badge">{tier.badge}</span>}
                                <h3 className="lp-price-card__name">{tier.name}</h3>
                                <p className="lp-price-card__tag">{tier.tag}</p>
                                <div className="lp-price-card__price">
                                    {tier.price}
                                    <span className="lp-price-card__price-note">{tier.note}</span>
                                </div>
                                <ul className="lp-price-card__list">
                                    {tier.features.map((f, j) => (
                                        <li key={j}>
                                            <Check size={ICON_SM} strokeWidth={2.4} />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <button className={`lp-btn ${tier.ctaClass} lp-btn--lg`} onClick={onContinueAsGuest}>
                                    {tier.cta}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FAQ ── */}
            <section className="lp-section" id="faq">
                <div className="lp-container">
                    <SectionHead eyebrow={t.faqEyebrow} title={t.faqTitle} />
                    <div className="lp-faq">
                        {faqItems.map((item, i) => (
                            <div key={i} className="lp-faq__item" data-open={String(faqOpen === i)}>
                                <button className="lp-faq__q" onClick={() => toggleFaq(i)}>
                                    {item.q}
                                    <ChevronDown size={ICON_MD} strokeWidth={STROKE} className="lp-faq__chev" />
                                </button>
                                <div className="lp-faq__a">{item.a}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Final CTA ── */}
            <div className="lp-container">
                <div className="lp-final">
                    <h2 className="lp-final__title">{t.finalTitle}</h2>
                    <p className="lp-final__sub">{t.finalSub}</p>
                    <div className="lp-final__ctas">
                        <button className="lp-btn lp-btn--primary lp-btn--lg" onClick={onContinueAsGuest}>
                            <Sparkles size={ICON_MD} strokeWidth={STROKE} />
                            {t.finalCta1}
                        </button>
                        <button className="lp-btn lp-btn--secondary lp-btn--lg" onClick={onContinueAsGuest}>
                            {t.finalCta2}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Footer ── */}
            <footer className="lp-footer">
                <div className="lp-container">
                    <div className="lp-footer__grid">
                        <div>
                            <div className="lp-footer__brand-line">
                                <img src="/GEMINI_LOGO_LONG.png" alt="Fakturidias" className="lp-logo lp-logo--footer" />
                            </div>
                            <p className="lp-footer__tag">{t.footerTagline}</p>
                        </div>
                        <div>
                            <h4 className="lp-footer__col-title">{t.footerProduct}</h4>
                            <ul className="lp-footer__links">
                                <li><a href="#features">{t.footerFeat1}</a></li>
                                <li><a href="#pricing">{t.footerFeat2}</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="lp-footer__col-title">{t.footerCompany}</h4>
                            <ul className="lp-footer__links">
                                <li><a href="#">{t.footerComp1}</a></li>
                                <li><a href="#">{t.footerComp2}</a></li>
                                <li><a href="#">{t.footerComp3}</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="lp-footer__col-title">{t.footerLegal}</h4>
                            <ul className="lp-footer__links">
                                <li><button className="lp-footer__link-btn" onClick={() => { setPolicyPage('terms-privacy'); window.scrollTo(0, 0) }}>{t.footerLegal1}</button></li>
                                <li><button className="lp-footer__link-btn" onClick={() => { setPolicyPage('cookies'); window.scrollTo(0, 0) }}>{t.footerLegal3}</button></li>
                                <li><button className="lp-footer__link-btn" onClick={() => { setPolicyPage('gdpr'); window.scrollTo(0, 0) }}>{t.footerLegal4}</button></li>
                            </ul>
                        </div>
                    </div>
                    <div className="lp-footer__bottom">
                        <span>{t.footerRights}</span>
                        <span>Made in <span style={{ color: 'var(--accent)' }}>Praha</span></span>
                    </div>
                </div>
            </footer>

        </div>
        </>
    )
}
