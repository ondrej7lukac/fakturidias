/* Fakturidias Landing Page — React app. */

const { useState: useStateL, useEffect: useEffectL } = React;

function LandingHeader({ lang, setLang, theme, setTheme, t }) {
  return (
    <header className="lp-header">
      <div className="lp-header__inner">
        <a className="lp-brand" href="./Landing.html">
          <img src="fakturidias-logo.png" alt="Fakturidias" className="lp-logo" />
        </a>
        <nav className="lp-nav">
          <a className="lp-nav__link" href="#features">{t.navFeatures}</a>
          <a className="lp-nav__link" href="#showcase">{t.navProduct}</a>
          <a className="lp-nav__link" href="#pricing">{t.navPricing}</a>
          <a className="lp-nav__link" href="#faq">{t.navFaq}</a>
        </nav>
        <div className="lp-header__actions">
          <div className="lp-lang">
            <button className={`lp-lang__btn${lang === "cs" ? " lp-lang__btn--active" : ""}`} onClick={() => setLang("cs")}>CS</button>
            <button className={`lp-lang__btn${lang === "en" ? " lp-lang__btn--active" : ""}`} onClick={() => setLang("en")}>EN</button>
          </div>
          <button
            className="lp-icon-toggle"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark"
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>}
          </button>
          <a className="lp-btn lp-btn--ghost" href="./Dashboard.html">{t.signIn}</a>
          <a className="lp-btn lp-btn--primary" href="./Create Invoice.html">{t.getStarted}</a>
        </div>
      </div>
    </header>
  );
}

function Hero({ t }) {
  return (
    <section className="lp-hero">
      <div className="lp-container">
        <div className="lp-eyebrow">{t.heroBadge}</div>
        <h1>
          {t.heroHeadline1}
          <br />
          <span className="accent">{t.heroHeadline2}</span>
        </h1>
        <p className="lp-hero__sub">{t.heroSub}</p>
        <div className="lp-hero__ctas">
          <a className="lp-btn lp-btn--primary lp-btn--lg" href="./Create Invoice.html">
            <Sparkles size={ICON_MD} strokeWidth={STROKE} />
            {t.heroCtaPrimary}
          </a>
          <a className="lp-btn lp-btn--secondary lp-btn--lg" href="./Dashboard.html">
            {t.heroCtaSecondary}
          </a>
        </div>
        <div className="lp-hero__note">{t.heroNote}</div>

        {/* Animated AI demo */}
        <div className="lp-demo">
          <div className="lp-demo__halo" aria-hidden />
          <div className="lp-demo__card">
            <div className="lp-demo__head">
              <Sparkles size={ICON_MD} strokeWidth={STROKE} style={{ color: "var(--accent)" }} />
              <span style={{ fontWeight: 600, color: "var(--text)" }}>{t.demoTitle}</span>
              <span className="badge">{t.demoListening}</span>
            </div>
            <div className="lp-demo__field">
              <div className="lp-demo__mic"><Mic size={ICON_LG} strokeWidth={STROKE} /></div>
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
                <div className="lp-demo__chip-value">21 780 CZK</div>
              </div>
            </div>
            <div className="lp-demo__action">
              <button className="lp-btn lp-btn--secondary">
                <Pencil size={ICON_SM} strokeWidth={STROKE} /> {t.aiEdit || "Edit"}
              </button>
              <button className="lp-btn lp-btn--primary">
                <CheckCircle2 size={ICON_SM} strokeWidth={STROKE} /> {t.demoConfirm}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip({ t }) {
  return (
    <section className="lp-trust">
      <div className="lp-container">
        <div className="lp-trust__line">{t.trustLine}</div>
        <div className="lp-trust__logos">
          <span className="lp-trust__logo">acme<span style={{ color: "var(--accent)" }}>·</span>studio</span>
          <span className="lp-trust__logo">Tektonic</span>
          <span className="lp-trust__logo">Pražský Sklep</span>
          <span className="lp-trust__logo">Novák Consulting</span>
          <span className="lp-trust__logo">studio květinka</span>
        </div>
      </div>
    </section>
  );
}

function SectionHead2({ eyebrow, title, lead }) {
  return (
    <div className="lp-section__head">
      <div className="lp-section__eyebrow">{eyebrow}</div>
      <h2 className="lp-section__title">{title}</h2>
      <p className="lp-section__lead">{lead}</p>
    </div>
  );
}

function Features({ t }) {
  const items = [
    { Icon: Mic,            title: t.feature1Title, body: t.feature1Body, alt: false },
    { Icon: Search,         title: t.feature2Title, body: t.feature2Body, alt: true  },
    { Icon: Send,           title: t.feature3Title, body: t.feature3Body, alt: false },
    { Icon: Cloud,          title: t.feature4Title, body: t.feature4Body, alt: true  },
    { Icon: ArrowLeftRight, title: t.feature5Title, body: t.feature5Body, alt: false },
    { Icon: Sparkles,       title: t.feature6Title, body: t.feature6Body, alt: true  },
  ];
  return (
    <section className="lp-section" id="features">
      <div className="lp-container">
        <SectionHead2 eyebrow={t.featuresEyebrow} title={t.featuresTitle} lead={t.featuresLead} />
        <div className="lp-features">
          {items.map((it, i) => (
            <div key={i} className="lp-feature">
              <div className={`lp-feature__icon${it.alt ? " lp-feature__icon--alt" : ""}`}>
                <it.Icon size={20} strokeWidth={STROKE} />
              </div>
              <h3 className="lp-feature__title">{it.title}</h3>
              <p className="lp-feature__body">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Showcase({ t, lang }) {
  const [tab, setTab] = useStateL("invoice");
  const src = tab === "invoice" ? "./Create Invoice.html" : "./Dashboard.html";
  const url = tab === "invoice" ? "app.fakturidias.cz / faktura/2026-0142" : "app.fakturidias.cz / prehled";
  return (
    <section className="lp-section" id="showcase">
      <div className="lp-container">
        <SectionHead2 eyebrow={t.showcaseEyebrow} title={t.showcaseTitle} lead={t.showcaseLead} />
        <div className="lp-showcase">
          <div className="lp-showcase__tabs" role="tablist">
            <div className="lp-showcase__tabs-seg">
              <button
                className={`lp-showcase__tab${tab === "invoice" ? " lp-showcase__tab--active" : ""}`}
                onClick={() => setTab("invoice")}
              >
                <FileText size={ICON_SM} strokeWidth={STROKE} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                {t.showcaseTab1}
              </button>
              <button
                className={`lp-showcase__tab${tab === "dashboard" ? " lp-showcase__tab--active" : ""}`}
                onClick={() => setTab("dashboard")}
              >
                <BarChart2 size={ICON_SM} strokeWidth={STROKE} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                {t.showcaseTab2}
              </button>
            </div>
            <a className="lp-showcase__open" href={src} target="_blank" rel="noopener">
              {lang === "cs" ? "Otevřít" : "Open"} ↗
            </a>
          </div>
          <div className="lp-showcase__viewport">
            <div className="lp-mockup__chrome">
              <span className="lp-mockup__dot" /><span className="lp-mockup__dot" /><span className="lp-mockup__dot" />
              <span className="lp-mockup__url">{url}</span>
              <span style={{ width: 26 }} />
            </div>
            <iframe
              key={src}
              src={src}
              className="lp-showcase__iframe"
              title={tab === "invoice" ? t.showcaseTab1 : t.showcaseTab2}
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks({ t }) {
  const steps = [
    { num: "01", title: t.howStep1Title, body: t.howStep1Body },
    { num: "02", title: t.howStep2Title, body: t.howStep2Body },
    { num: "03", title: t.howStep3Title, body: t.howStep3Body },
  ];
  return (
    <section className="lp-section" id="how">
      <div className="lp-container">
        <SectionHead2 eyebrow={t.howEyebrow} title={t.howTitle} />
        <div className="lp-steps">
          {steps.map((s, i) => (
            <div key={i} className="lp-step">
              <span className="lp-step__num">{s.num}</span>
              <h3 className="lp-step__title">{s.title}</h3>
              <p className="lp-step__body">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing({ t }) {
  const tiers = [
    {
      name: t.pricingFreeName, tag: t.pricingFreeTagline, price: t.pricingFreePrice, note: t.pricingFreeNote,
      features: [t.pricingFreeF1, t.pricingFreeF2, t.pricingFreeF3, t.pricingFreeF4],
      cta: t.pricingFreeCta, ctaClass: "lp-btn--secondary", featured: false,
    },
    {
      name: t.pricingProName, tag: t.pricingProTag, price: t.pricingProPrice, note: t.pricingProNote,
      features: [t.pricingProF1, t.pricingProF2, t.pricingProF3, t.pricingProF4, t.pricingProF5],
      cta: t.pricingProCta, ctaClass: "lp-btn--primary", featured: true, badge: t.pricingProBadge,
    },
    {
      name: t.pricingMaxName, tag: t.pricingMaxTag, price: t.pricingMaxPrice, note: t.pricingMaxNote,
      features: [t.pricingMaxF1, t.pricingMaxF2, t.pricingMaxF3, t.pricingMaxF4, t.pricingMaxF5],
      cta: t.pricingMaxCta, ctaClass: "lp-btn--secondary", featured: false,
    },
  ];
  return (
    <section className="lp-section" id="pricing">
      <div className="lp-container">
        <SectionHead2 eyebrow={t.pricingEyebrow} title={t.pricingTitle} lead={t.pricingLead} />
        <div className="lp-pricing">
          {tiers.map((tier, i) => (
            <div key={i} className={`lp-price-card${tier.featured ? " lp-price-card--featured" : ""}`}>
              {tier.badge && <span className="lp-price-card__badge">{tier.badge}</span>}
              <h3 className="lp-price-card__name">{tier.name}</h3>
              <p className="lp-price-card__tag">{tier.tag}</p>
              <div className="lp-price-card__price">
                {tier.price}<span className="lp-price-card__price-note">{tier.note}</span>
              </div>
              <ul className="lp-price-card__list">
                {tier.features.map((f, j) => (
                  <li key={j}>
                    <Check size={ICON_SM} strokeWidth={2.4} />
                    {f}
                  </li>
                ))}
              </ul>
              <a className={`lp-btn ${tier.ctaClass} lp-btn--lg`} href="./Create Invoice.html">{tier.cta}</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq({ t }) {
  const items = [
    { q: t.faq1Q, a: t.faq1A },
    { q: t.faq2Q, a: t.faq2A },
    { q: t.faq3Q, a: t.faq3A },
    { q: t.faq4Q, a: t.faq4A },
    { q: t.faq5Q, a: t.faq5A },
    { q: t.faq6Q, a: t.faq6A },
  ];
  const [open, setOpen] = useStateL(0);
  return (
    <section className="lp-section" id="faq">
      <div className="lp-container">
        <SectionHead2 eyebrow={t.faqEyebrow} title={t.faqTitle} />
        <div className="lp-faq">
          {items.map((it, i) => (
            <div key={i} className="lp-faq__item" data-open={open === i}>
              <button className="lp-faq__q" onClick={() => setOpen(open === i ? -1 : i)}>
                {it.q}
                <ChevronDown size={ICON_MD} strokeWidth={STROKE} className="lp-faq__chev" />
              </button>
              <div className="lp-faq__a">{it.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ t }) {
  return (
    <section className="lp-container">
      <div className="lp-final">
        <h2 className="lp-final__title">{t.finalTitle}</h2>
        <p className="lp-final__sub">{t.finalSub}</p>
        <div className="lp-final__ctas">
          <a className="lp-btn lp-btn--primary lp-btn--lg" href="./Create Invoice.html">
            <Sparkles size={ICON_MD} strokeWidth={STROKE} />
            {t.finalCta1}
          </a>
          <a className="lp-btn lp-btn--secondary lp-btn--lg" href="./Dashboard.html">{t.finalCta2}</a>
        </div>
      </div>
    </section>
  );
}

function Footer({ t }) {
  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer__grid">
          <div>
            <div className="lp-footer__brand-line">
              <img src="fakturidias-logo.png" alt="Fakturidias" className="lp-logo lp-logo--footer" />
            </div>
            <p className="lp-footer__tag">{t.footerTagline}</p>
          </div>
          <div>
            <h4 className="lp-footer__col-title">{t.footerProduct}</h4>
            <ul className="lp-footer__links">
              <li><a href="#features">{t.footerFeat1}</a></li>
              <li><a href="#pricing">{t.footerFeat2}</a></li>
              <li><a href="./Fakturidias Design System.html">{t.footerFeat3}</a></li>
              <li><a href="#">{t.footerFeat4}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="lp-footer__col-title">{t.footerCompany}</h4>
            <ul className="lp-footer__links">
              <li><a href="#">{t.footerComp1}</a></li>
              <li><a href="#">{t.footerComp2}</a></li>
              <li><a href="#">{t.footerComp3}</a></li>
              <li><a href="#">{t.footerComp4}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="lp-footer__col-title">{t.footerLegal}</h4>
            <ul className="lp-footer__links">
              <li><a href="#">{t.footerLegal1}</a></li>
              <li><a href="#">{t.footerLegal2}</a></li>
              <li><a href="#">{t.footerLegal3}</a></li>
              <li><a href="#">{t.footerLegal4}</a></li>
            </ul>
          </div>
        </div>
        <div className="lp-footer__bottom">
          <span>{t.footerRights}</span>
          <span>Made in <span style={{ color: "var(--accent)" }}>Praha</span></span>
        </div>
      </div>
    </footer>
  );
}

function LandingApp() {
  const [lang, setLang] = useStateL("cs");
  const [theme, setTheme] = useStateL("dark");
  const t = window.LANDING_I18N[lang];

  useEffectL(() => {
    document.documentElement.classList.remove("theme-light", "theme-dark");
    document.documentElement.classList.add(`theme-${theme}`);
    document.documentElement.lang = lang;
  }, [theme, lang]);

  return (
    <>
      <LandingHeader lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} t={t} />
      <Hero t={t} />
      <TrustStrip t={t} />
      <Features t={t} />
      <Showcase t={t} lang={lang} />
      <HowItWorks t={t} />
      <Pricing t={t} />
      <Faq t={t} />
      <FinalCta t={t} />
      <Footer t={t} />
    </>
  );
}

const landingRoot = ReactDOM.createRoot(document.getElementById("root"));
landingRoot.render(<LandingApp />);
