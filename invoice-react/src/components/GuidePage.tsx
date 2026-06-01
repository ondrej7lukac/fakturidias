import './PolicyPage.css'
import './GuidePage.css'
import { useState } from 'react'
import {
    ArrowLeftRight, ChevronDown, Sparkles, Search, FileText, RefreshCw,
    Clock, CreditCard, Send, BarChart2, Wallet, UserCheck, Download,
    Webhook, Cloud, Settings2,
    ICON_SM, ICON_MD, STROKE,
} from '@/lib/icons'

interface GuidePageProps {
    lang: string
    onBack: () => void
    onGetStarted: () => void
}

interface QuickStep {
    title: string
    body: string
}

interface GuideSection {
    Icon: typeof Sparkles
    title: string
    items: string[]
}

interface GuideFaq {
    q: string
    a: string
}

interface GuideContent {
    back: string
    title: string
    intro: string
    quickStartTitle: string
    quickStart: QuickStep[]
    sectionsTitle: string
    sections: GuideSection[]
    faqTitle: string
    faqs: GuideFaq[]
    cta: string
}

const GUIDE: Record<'cs' | 'en', GuideContent> = {
    cs: {
        back: 'Zpět',
        title: 'Návod a časté otázky',
        intro: 'Kompletní průvodce Fakturidias — od první faktury po exporty pro účetní. Projděte rychlý start a podrobné návody k jednotlivým funkcím. Vespod najdete odpovědi na nejčastější otázky.',
        quickStartTitle: 'Rychlý start za 6 kroků',
        quickStart: [
            { title: 'Přihlaste se nebo pokračujte jako host', body: 'Tlačítko „Začít zdarma" vás pustí rovnou do aplikace. Přihlášením přes Google získáte 5 faktur zdarma a automatickou zálohu dat. Host vyzkouší aplikaci na 1 fakturu.' },
            { title: 'Vytvořte první fakturu', body: 'Klikněte na „Nová faktura". Diktujte ji mikrofonem nebo napište jednou větou — AI vyplní klienta, položky, hodinovou sazbu i DPH za méně než 15 sekund.' },
            { title: 'Doplňte odběratele přes ARES / RPO', body: 'Zadejte IČO a údaje firmy (název, adresa, DIČ) se načtou z rejstříku — v Česku přes ARES, na Slovensku přes RPO.' },
            { title: 'Zkontrolujte a upravte', body: 'V náhledu upravíte cokoliv jedním klikem: položky, sazby DPH (21 %, 15 %, 12 %, 0 %), datum splatnosti i číslo faktury.' },
            { title: 'Odešlete fakturu', body: 'Stáhněte PDF, pošlete klientovi e-mailem nebo sdílejte veřejným odkazem s QR kódem a tlačítkem „Zaplatit online".' },
            { title: 'Sledujte v přehledu', body: 'Dashboard ukáže obrat, zaplacené i čekající částky, stav každé faktury a stárnutí pohledávek.' },
        ],
        sectionsTitle: 'Podrobný návod podle funkcí',
        sections: [
            { Icon: Sparkles, title: 'AI a hlasový vstup', items: [
                'Stiskněte mikrofon a řekněte komu, co a za kolik fakturujete — česky nebo anglicky. Nebo napište jednu větu do textového pole.',
                'AI rozpozná klienta, položky, množství, hodinovou sazbu i sazbu DPH a vrátí strukturovaný náhled.',
                'Vše před uložením zkontrolujete a cokoliv opravíte jedním klikem.',
            ]},
            { Icon: Search, title: 'Vyhledání firmy (ARES / RPO)', items: [
                'Do pole odběratele zadejte IČO nebo název firmy.',
                'CZ firmy se doplní z rejstříku ARES, slovenské z RPO — název, adresa i DIČ.',
                'DIČ partnerů z EU lze ověřit přes VIES.',
            ]},
            { Icon: FileText, title: 'Typy dokladů', items: [
                'V editoru přepnete typ dokladu: běžná faktura, proforma, zálohová faktura nebo opravný daňový doklad (dobropis).',
                'Každý typ má správný název a náležitosti dle zákona o DPH č. 235/2004 Sb.',
                'Pro přeshraniční B2B podporujeme přenesenou daňovou povinnost (reverse charge).',
            ]},
            { Icon: RefreshCw, title: 'Opakované faktury', items: [
                'Vytvořte šablonu a nastavte interval — týdně, měsíčně nebo ročně.',
                'Fakturidias vystaví fakturu sám a odešle ji klientovi e-mailem bez vašeho zásahu.',
                'Funkce je součástí placených plánů.',
            ]},
            { Icon: Clock, title: 'Automatické upomínky', items: [
                'V Nastavení zapnete přepínač „Upomínky" (ve výchozím stavu vypnuto).',
                'Po splatnosti pošle aplikace klientovi zdvořilou upomínku — maximálně třikrát, týdně.',
            ]},
            { Icon: CreditCard, title: 'Online platby a QR', items: [
                'Na fakturu přidáte platební QR kód i odkaz „Zaplatit online".',
                'Jakmile klient zaplatí, faktura se sama označí jako uhrazená a stav uvidíte v přehledu.',
            ]},
            { Icon: Send, title: 'Odeslání a sdílení', items: [
                'Stáhněte profesionální PDF nebo ho pošlete přímo z aplikace e-mailem.',
                'Vygenerujte veřejný odkaz a pošlete fakturu klientovi bez příloh — můžete sledovat počet zobrazení.',
                'Každá faktura se automaticky zálohuje do Google Drive.',
            ]},
            { Icon: BarChart2, title: 'Přehledy a reporty', items: [
                'Dashboard zobrazí obrat, zaplacené i čekající částky a vývoj v čase.',
                'Graf stárnutí pohledávek rozdělí dlužné částky do skupin (do 30, 31–60, 61–90 a 90+ dnů).',
                'Faktury filtrujete podle stavu, klienta i období.',
            ]},
            { Icon: Wallet, title: 'Evidence výdajů', items: [
                'V sekci Výdaje vedete přijaté faktury a náklady na jednom místě.',
                'AI z dokladu vytáhne částky, takže máte přehled o výdajích i zisku.',
            ]},
            { Icon: Settings2, title: 'Nastavení — profily a banka', items: [
                'Uložte více firemních profilů (dodavatelů) a přepínejte mezi nimi podle toho, za koho fakturujete.',
                'Přidejte více bankovních účtů přes IBAN — při tvorbě faktury jen vyberete, kam má klient platit.',
                'Nastavte sazby DPH, údaje plátce DPH a integrace.',
            ]},
            { Icon: UserCheck, title: 'Přístup pro účetní', items: [
                'V Nastavení udělíte své účetní náhledový přístup k vašim fakturám.',
                'Přístup můžete kdykoliv odebrat; účetní v režimu náhledu nemůže data měnit.',
            ]},
            { Icon: Download, title: 'Exporty pro účetní', items: [
                'Jednotlivou fakturu exportujete do ISDOC 6.0.1 přímo z náhledu.',
                'Z přehledu hromadně exportujete do Pohoda XML a Money S3.',
                'Vygenerujete kontrolní hlášení (KH) za vybraný měsíc.',
            ]},
            { Icon: Webhook, title: 'API a webhooky (pro vývojáře)', items: [
                'V Nastavení → Integrace vytvoříte API klíč pro přístup k REST API (/api/v1/invoices).',
                'Nastavíte webhooky, které se spustí při vytvoření, úpravě nebo zaplacení faktury.',
            ]},
            { Icon: Cloud, title: 'Instalace jako aplikace (PWA)', items: [
                'Fakturidias lze nainstalovat jako aplikaci do mobilu i počítače.',
                'V prohlížeči zvolte „Přidat na plochu" / „Instalovat aplikaci" a budete mít fakturaci na jeden dotek.',
            ]},
        ],
        faqTitle: 'Časté otázky',
        faqs: [
            { q: 'Jak přesný je AI vstup česky?', a: 'AI je trénovaná na českou byznys terminologii — IČO, DIČ, sazby DPH i položkové popisky. Správně rozpozná přes 95 % polí na první pokus a cokoliv opravíte jedním klikem.' },
            { q: 'Umí to vystavovat opakované faktury?', a: 'Ano. Nastavíte šablonu a interval (týdně, měsíčně, ročně) a Fakturidias fakturu vystaví i odešle sám. Po splatnosti umí poslat až tři automatické upomínky.' },
            { q: 'Jak klienti fakturu zaplatí?', a: 'Na každou fakturu přidáme platební QR kód i odkaz „Zaplatit online". Po zaplacení se faktura sama označí jako uhrazená.' },
            { q: 'Může s tím pracovat moje účetní?', a: 'Ano. Účetní dáte náhledový přístup a data exportujete do ISDOC, Pohoda XML, Money S3 i jako kontrolní hlášení (KH).' },
            { q: 'Splňuje to české účetní předpisy?', a: 'Ano. Faktury obsahují všechny povinné náležitosti dle § 29 zákona o DPH č. 235/2004 Sb., podporujeme sazby 21/15/12/0 % i reverse charge pro přeshraniční B2B.' },
            { q: 'Mohu importovat faktury z jiné aplikace?', a: 'Ano — z CSV i standardů ISDOC a UBL 2.1. S migrací z Pohody nebo Fakturoidu vám pomůžeme osobně.' },
            { q: 'Funguje to bez připojení k internetu?', a: 'Faktury lze vystavovat offline; hlasové rozpoznání a ARES vyhledávání potřebují připojení. Data se synchronizují do 30 sekund po obnovení spojení.' },
            { q: 'Co se stane s mými daty, když přestanu platit?', a: 'Plán se vrátí na Zdarma a vy si zachováte přístup k posledním 5 fakturám. Ostatní kdykoliv exportujete jako PDF nebo CSV; data se nemažou.' },
        ],
        cta: 'Začít zdarma',
    },
    en: {
        back: 'Back',
        title: 'Guide & FAQ',
        intro: 'The complete guide to Fakturidias — from your first invoice to accountant exports. Start with the quick start, then dive into the per-feature how-tos. Frequently asked questions are at the bottom.',
        quickStartTitle: 'Quick start in 6 steps',
        quickStart: [
            { title: 'Sign in or continue as a guest', body: 'The "Start free" button drops you straight into the app. Signing in with Google gives you 5 free invoices and automatic data backup. Guests can try the app on 1 invoice.' },
            { title: 'Create your first invoice', body: 'Click "New invoice". Dictate it with the mic or type a single sentence — the AI fills in the client, line items, hourly rate and VAT in under 15 seconds.' },
            { title: 'Add the client via ARES / RPO', body: 'Type a business ID (IČO) and the company details (name, address, VAT number) load from the registry — ARES in Czechia, RPO in Slovakia.' },
            { title: 'Review and edit', body: 'In the preview, change anything in one click: line items, VAT rates (21%, 15%, 12%, 0%), due date and invoice number.' },
            { title: 'Send the invoice', body: 'Download the PDF, email it to the client, or share a public link with a QR code and a "Pay online" button.' },
            { title: 'Track it in the dashboard', body: 'The dashboard shows revenue, paid and pending amounts, each invoice\'s status, and receivables aging.' },
        ],
        sectionsTitle: 'Detailed how-to by feature',
        sections: [
            { Icon: Sparkles, title: 'AI & voice input', items: [
                'Hit the mic and say who you\'re billing, what for and how much — in Czech or English. Or type a single sentence into the text box.',
                'The AI extracts the client, line items, quantity, hourly rate and VAT rate and returns a structured draft.',
                'Review everything before saving and fix anything in one click.',
            ]},
            { Icon: Search, title: 'Company lookup (ARES / RPO)', items: [
                'Type a business ID (IČO) or company name into the client field.',
                'Czech companies fill from the ARES registry, Slovak ones from RPO — name, address and VAT number.',
                'EU partners\' VAT numbers can be validated via VIES.',
            ]},
            { Icon: FileText, title: 'Document types', items: [
                'In the editor you switch the document type: standard invoice, proforma, advance invoice or credit note.',
                'Each type carries the correct legal title and mandatory fields under Czech VAT Act No. 235/2004 Coll.',
                'Reverse charge is supported for cross-border B2B.',
            ]},
            { Icon: RefreshCw, title: 'Recurring invoices', items: [
                'Create a template and set an interval — weekly, monthly or yearly.',
                'Fakturidias issues the invoice on its own and emails it to the client without you lifting a finger.',
                'This feature is part of the paid plans.',
            ]},
            { Icon: Clock, title: 'Automatic reminders', items: [
                'Turn on the "Reminders" toggle in Settings (off by default).',
                'Once an invoice is overdue, the app emails the client a polite reminder — up to three times, weekly.',
            ]},
            { Icon: CreditCard, title: 'Online payments & QR', items: [
                'Add a payment QR code and a "Pay online" link to the invoice.',
                'The moment the client pays, the invoice marks itself as settled and you see it in the dashboard.',
            ]},
            { Icon: Send, title: 'Sending & sharing', items: [
                'Download a professional PDF or email it directly from the app.',
                'Generate a public link to send the invoice without attachments — you can track view counts.',
                'Every invoice auto-backs up to Google Drive.',
            ]},
            { Icon: BarChart2, title: 'Reports & dashboards', items: [
                'The dashboard shows revenue, paid and pending amounts, and the trend over time.',
                'The receivables-aging chart splits what you\'re owed into buckets (0–30, 31–60, 61–90 and 90+ days).',
                'Filter invoices by status, client and period.',
            ]},
            { Icon: Wallet, title: 'Expense ledger', items: [
                'In the Expenses section you keep received invoices and costs in one place.',
                'The AI reads amounts from each bill so you always see spending and profit.',
            ]},
            { Icon: Settings2, title: 'Settings — profiles & banks', items: [
                'Save multiple company (supplier) profiles and switch between them depending on who you\'re billing as.',
                'Add multiple bank accounts via IBAN — when creating an invoice you just pick where the client should pay.',
                'Configure VAT rates, payer details and integrations.',
            ]},
            { Icon: UserCheck, title: 'Accountant access', items: [
                'In Settings you grant your accountant read access to your invoices.',
                'You can revoke access at any time; in view mode the accountant cannot change data.',
            ]},
            { Icon: Download, title: 'Accountant exports', items: [
                'Export a single invoice to ISDOC 6.0.1 straight from the preview.',
                'Batch-export from the dashboard to Pohoda XML and Money S3.',
                'Generate the VAT control statement (kontrolní hlášení) for a chosen month.',
            ]},
            { Icon: Webhook, title: 'API & webhooks (for developers)', items: [
                'In Settings → Integrations create an API key for the REST API (/api/v1/invoices).',
                'Register webhooks that fire on invoice created, updated or paid.',
            ]},
            { Icon: Cloud, title: 'Install as an app (PWA)', items: [
                'Fakturidias can be installed as an app on mobile and desktop.',
                'In your browser choose "Add to Home Screen" / "Install app" and invoicing is one tap away.',
            ]},
        ],
        faqTitle: 'Frequently asked questions',
        faqs: [
            { q: 'How accurate is the Czech AI input?', a: 'The AI is trained on Czech business terminology — IČO, DIČ, VAT rates and line-item phrasing. It correctly identifies over 95% of fields on the first attempt, and anything misread is fixed in one click.' },
            { q: 'Can it send recurring invoices automatically?', a: 'Yes. Set a template and interval (weekly, monthly, yearly) and Fakturidias issues and emails the invoice on its own. It also sends up to three automatic reminders once overdue.' },
            { q: 'How do my clients pay?', a: 'Every invoice can carry a payment QR code and a "Pay online" link. Once the client pays, the invoice marks itself as settled.' },
            { q: 'Can my accountant use it too?', a: 'Yes. Grant your accountant read access and export data to ISDOC, Pohoda XML, Money S3 and the VAT control statement (kontrolní hlášení).' },
            { q: 'Is it compliant with Czech tax rules?', a: 'Yes. Invoices include all mandatory fields under Section 29 of Czech VAT Act No. 235/2004 Coll. We support rates 21/15/12/0% and reverse charge for cross-border B2B.' },
            { q: 'Can I import invoices from another app?', a: 'Yes — from CSV and the ISDOC and UBL 2.1 standards. For migrating from Pohoda or Fakturoid we\'ll assist you personally.' },
            { q: 'Does it work offline?', a: 'You can draft invoices offline; voice recognition and ARES lookup need a connection. Data syncs within 30 seconds of reconnection.' },
            { q: 'What happens to my data if I stop paying?', a: 'Your plan reverts to Free and you keep access to your last 5 invoices. You can export everything else as PDF or CSV at any time; data is never deleted.' },
        ],
        cta: 'Start free',
    },
}

export default function GuidePage({ lang, onBack, onGetStarted }: GuidePageProps) {
    const l = lang === 'cs' ? 'cs' : 'en'
    const g = GUIDE[l]
    const [faqOpen, setFaqOpen] = useState(-1)
    const toggleFaq = (i: number) => setFaqOpen(prev => (prev === i ? -1 : i))

    return (
        <div className="pp-root">
            <div className="pp-container guide-container">
                <button className="pp-back" onClick={onBack}>
                    <ArrowLeftRight size={ICON_SM} strokeWidth={STROKE} style={{ transform: 'scaleX(-1)' }} />
                    {g.back}
                </button>

                <h1 className="pp-title">{g.title}</h1>
                <p className="guide-intro">{g.intro}</p>

                {/* ── Quick start ── */}
                <h2 className="guide-h2">{g.quickStartTitle}</h2>
                <div className="guide-steps">
                    {g.quickStart.map((s, i) => (
                        <div key={i} className="guide-step">
                            <span className="guide-step__num">{String(i + 1).padStart(2, '0')}</span>
                            <div>
                                <h3 className="guide-step__title">{s.title}</h3>
                                <p className="guide-step__body">{s.body}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Per-feature how-to ── */}
                <h2 className="guide-h2">{g.sectionsTitle}</h2>
                <div className="guide-sections">
                    {g.sections.map((sec, i) => (
                        <section key={i} className="guide-card">
                            <div className="guide-card__head">
                                <span className="guide-card__icon">
                                    <sec.Icon size={ICON_MD} strokeWidth={STROKE} />
                                </span>
                                <h3 className="guide-card__title">{sec.title}</h3>
                            </div>
                            <ul className="guide-card__list">
                                {sec.items.map((it, j) => <li key={j}>{it}</li>)}
                            </ul>
                        </section>
                    ))}
                </div>

                {/* ── FAQ ── */}
                <h2 className="guide-h2">{g.faqTitle}</h2>
                <div className="guide-faq">
                    {g.faqs.map((item, i) => (
                        <div key={i} className="guide-faq__item" data-open={String(faqOpen === i)}>
                            <button className="guide-faq__q" onClick={() => toggleFaq(i)}>
                                {item.q}
                                <ChevronDown size={ICON_MD} strokeWidth={STROKE} className="guide-faq__chev" />
                            </button>
                            <div className="guide-faq__a">{item.a}</div>
                        </div>
                    ))}
                </div>

                {/* ── CTA ── */}
                <div className="guide-cta">
                    <button className="lp-btn lp-btn--primary lp-btn--lg" onClick={onGetStarted}>
                        <Sparkles size={ICON_MD} strokeWidth={STROKE} />
                        {g.cta}
                    </button>
                </div>
            </div>
        </div>
    )
}
