/* Fakturidias Design System — Main app shell.
   Mounts the page: header, sidebar nav, hero, sections, footer. */

const { useState: useStateApp, useEffect: useEffectApp, useRef: useRefApp } = React;

const SECTION_KEYS = [
  { id: "brand",     labelKey: "sectionBrand" },
  { id: "color",     labelKey: "sectionColor" },
  { id: "type",      labelKey: "sectionType" },
  { id: "space",     labelKey: "sectionSpace" },
  { id: "buttons",   labelKey: "sectionButtons" },
  { id: "forms",     labelKey: "sectionForms" },
  { id: "ai",        labelKey: "sectionAi" },
  { id: "badges",    labelKey: "sectionBadges" },
  { id: "icons",     labelKey: "sectionIcons" },
  { id: "layout",    labelKey: "sectionLayout" },
  { id: "invoice",   labelKey: "sectionInvoice" },
  { id: "dashboard", labelKey: "sectionDashboard" },
  { id: "motion",    labelKey: "sectionMotion" },
];

function useScrollSpy(ids) {
  const [active, setActive] = useStateApp(ids[0]);
  useEffectApp(() => {
    const opts = { rootMargin: "-30% 0px -60% 0px", threshold: 0 };
    const visible = new Set();
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) visible.add(e.target.id);
        else visible.delete(e.target.id);
      });
      // pick the topmost still visible
      const top = ids.find(id => visible.has(id));
      if (top) setActive(top);
    }, opts);
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [ids.join(",")]);
  return active;
}

function TopBar({ lang, setLang, t }) {
  const active = useScrollSpy(SECTION_KEYS.map(s => s.id));
  return (
    <header className="ds-topbar">
      <div className="ds-topbar__inner">
        <a className="ds-brand" href="#top" style={{ color: "inherit" }}>
          <div className="ds-brand__mark">F</div>
          <div>
            <div className="ds-brand__name">{t.productName}</div>
            <div className="ds-brand__tag">{t.productTag}</div>
          </div>
        </a>

        <nav className="ds-nav" aria-label="Sections">
          {SECTION_KEYS.slice(0, 8).map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`ds-nav__btn${active === s.id ? " ds-nav__btn--active" : ""}`}
            >
              {t[s.labelKey]}
            </a>
          ))}
        </nav>

        <div className="ds-toggle" role="tablist" aria-label="Language">
          <button
            className={`ds-toggle__btn${lang === "cs" ? " ds-toggle__btn--active" : ""}`}
            onClick={() => setLang("cs")}
          >
            CS
          </button>
          <button
            className={`ds-toggle__btn${lang === "en" ? " ds-toggle__btn--active" : ""}`}
            onClick={() => setLang("en")}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ t }) {
  const active = useScrollSpy(SECTION_KEYS.map(s => s.id));
  return (
    <aside className="ds-sidebar" aria-label="On-page navigation">
      <div className="ds-sidebar__group">
        <div className="ds-sidebar__label">Foundation</div>
        {SECTION_KEYS.slice(0, 4).map(s => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`ds-sidebar__link${active === s.id ? " ds-sidebar__link--active" : ""}`}
          >
            {t[s.labelKey]}
          </a>
        ))}
      </div>
      <div className="ds-sidebar__group">
        <div className="ds-sidebar__label">Components</div>
        {SECTION_KEYS.slice(4, 9).map(s => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`ds-sidebar__link${active === s.id ? " ds-sidebar__link--active" : ""}`}
          >
            {t[s.labelKey]}
          </a>
        ))}
      </div>
      <div className="ds-sidebar__group">
        <div className="ds-sidebar__label">Patterns</div>
        {SECTION_KEYS.slice(9).map(s => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`ds-sidebar__link${active === s.id ? " ds-sidebar__link--active" : ""}`}
          >
            {t[s.labelKey]}
          </a>
        ))}
      </div>
    </aside>
  );
}

function Hero({ t }) {
  return (
    <section className="ds-hero" id="top">
      <div className="ds-hero__eyebrow">
        {t.productTag} · {t.version}
      </div>
      <h1 className="ds-hero__title">{t.heroTitle}</h1>
      <p className="ds-hero__sub">{t.heroSub}</p>
      <div className="ds-hero__chips">
        <span className="ds-hero__chip">
          <FileText size={ICON_SM} strokeWidth={STROKE} />
          {t.heroChip1}
        </span>
        <span className="ds-hero__chip">
          <Eye size={ICON_SM} strokeWidth={STROKE} />
          {t.heroChip2}
        </span>
        <span className="ds-hero__chip">
          <Mic size={ICON_SM} strokeWidth={STROKE} />
          {t.heroChip3}
        </span>
        <span className="ds-hero__chip">
          <Sparkles size={ICON_SM} strokeWidth={STROKE} />
          {t.heroChip4}
        </span>
      </div>
    </section>
  );
}

function App() {
  const [lang, setLang] = useStateApp("cs");
  const t = window.DS_I18N[lang];

  useEffectApp(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <>
      <TopBar lang={lang} setLang={setLang} t={t} />

      <div className="ds-page">
        <Sidebar t={t} />
        <main>
          <Hero t={t} />
          <BrandSection     t={t} />
          <ColorSection     t={t} />
          <TypeSection      t={t} />
          <SpaceSection     t={t} />
          <ButtonsSection   t={t} />
          <FormsSection     t={t} />
          <AiSection        t={t} />
          <BadgesSection    t={t} />
          <IconsSection     t={t} />
          <LayoutSection    t={t} />
          <InvoiceSection   t={t} />
          <DashboardSection t={t} lang={lang} />
          <MotionSection    t={t} />

          <footer className="ds-footer">
            <div>
              <strong style={{ color: "var(--page-text)" }}>{t.productName}</strong> · {t.productTag} · {t.version}
            </div>
            <div>
              {lang === "cs"
                ? "Tokeny v invoice-react/src/styles/utilities.css · Komponenty postavené na shadcn/ui"
                : "Tokens in invoice-react/src/styles/utilities.css · Components built on shadcn/ui"}
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
