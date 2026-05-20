/* Shared app chrome — header + theme/lang hook. Used across Create / Dashboard / Settings. */

const { useState: useStateApp2, useEffect: useEffectApp2 } = React;

// activePage: "dashboard" | "create" | "settings"
function AppHeader({ activePage, lang, setLang, theme, setTheme, t }) {
  return (
    <header className="ap-header">
      <div className="ap-header__inner">
        <a className="ap-brand" href="./Landing.html">
          <img src="fakturidias-logo.png" alt="Fakturidias" className="ap-logo" />
        </a>

        <div className="ap-seg" style={{ marginLeft: "auto" }}>
          <a
            href="./Dashboard.html"
            className={`ap-seg__btn${activePage === "dashboard" ? " ap-seg__btn--active" : ""}`}
          >
            <BarChart2 size={ICON_SM} strokeWidth={STROKE} />
            <span>{t.appNav1}</span>
          </a>
          <a
            href="./Create Invoice.html"
            className={`ap-seg__btn${activePage === "create" ? " ap-seg__btn--primary" : ""}`}
          >
            <Plus size={ICON_SM} strokeWidth={STROKE} />
            <span className="long">{activePage === "create" ? (lang === "cs" ? "Faktura" : "Invoice") : t.appNav2.replace("+ ", "")}</span>
          </a>
        </div>

        <div className="ap-header__trail">
          <div className="ap-lang">
            <button
              className={`ap-lang__btn${lang === "cs" ? " ap-lang__btn--active" : ""}`}
              onClick={() => setLang("cs")}
            >CS</button>
            <button
              className={`ap-lang__btn${lang === "en" ? " ap-lang__btn--active" : ""}`}
              onClick={() => setLang("en")}
            >EN</button>
          </div>
          <button
            className="ap-btn ap-btn--icon ap-btn--ghost"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark"
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>}
          </button>
          <a href="./Settings.html" className="ap-avatar" aria-label="Settings"
             style={activePage === "settings" ? { borderColor: "var(--accent)", color: "var(--accent)" } : {}}>
            G
          </a>
        </div>
      </div>
    </header>
  );
}

// Shared hook for theme + lang state, syncing the <html> class.
function useAppShell(defaultTheme = "dark") {
  const [lang, setLang] = useStateApp2("cs");
  const [theme, setTheme] = useStateApp2(defaultTheme);
  useEffectApp2(() => {
    document.documentElement.classList.remove("theme-light", "theme-dark");
    document.documentElement.classList.add(`theme-${theme}`);
    document.documentElement.lang = lang;
  }, [theme, lang]);
  return { lang, setLang, theme, setTheme };
}

Object.assign(window, { AppHeader, useAppShell });
