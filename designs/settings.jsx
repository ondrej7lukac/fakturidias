/* Fakturidias — Settings page. */

const { useState: useStateS } = React;

function SettingsApp() {
  const shell = useAppShell("dark");
  const t = { ...window.LANDING_I18N[shell.lang], ...window.APP_I18N[shell.lang] };
  const [tab, setTab] = useStateS(1);
  const [integrations, setIntegrations] = useStateS({
    ares: true, google: false, email: true, api: false,
  });
  const toggle = (key) => setIntegrations({ ...integrations, [key]: !integrations[key] });

  return (
    <>
      <AppHeader activePage="settings" {...shell} t={t} />

      <div className="ap-page">
        <div className="ap-page__head">
          <div>
            <h1 className="ap-page__title">{t.pageSettings}</h1>
            <p className="ap-page__sub">
              {tab === 1 && t.settingsTab1Sub}
              {tab === 2 && t.settingsTab2Sub}
              {tab === 3 && t.settingsTab3Sub}
            </p>
          </div>
        </div>

        <div className="ap-tabs" role="tablist">
          <button className={`ap-tabs__btn${tab === 1 ? " ap-tabs__btn--active" : ""}`} onClick={() => setTab(1)}>
            <Contact size={ICON_SM} strokeWidth={STROKE} /> {t.settingsTab1}
          </button>
          <button className={`ap-tabs__btn${tab === 2 ? " ap-tabs__btn--active" : ""}`} onClick={() => setTab(2)}>
            <Wallet size={ICON_SM} strokeWidth={STROKE} /> {t.settingsTab2}
          </button>
          <button className={`ap-tabs__btn${tab === 3 ? " ap-tabs__btn--active" : ""}`} onClick={() => setTab(3)}>
            <Plug size={ICON_SM} strokeWidth={STROKE} /> {t.settingsTab3}
          </button>
        </div>

        {/* TAB 1: IDENTITY */}
        {tab === 1 && (
          <div style={{ display: "grid", gap: 18 }}>
            <div className="ap-card">
              <h3 className="ap-card__title">
                <Contact size={ICON_MD} strokeWidth={STROKE} /> {t.settingsTab1}
              </h3>
              <div className="ap-grid ap-grid--2">
                <div className="ap-field"><label>{t.fldName}</label>
                  <div className="ap-input-wrap">
                    <Search size={ICON_SM} strokeWidth={STROKE} />
                    <input className="ap-input" defaultValue="Fakturidias s.r.o." placeholder={t.fldClientPlaceholder} />
                  </div>
                </div>
                <div className="ap-field"><label>{t.fldIco}</label><input className="ap-input" defaultValue="27082440" /></div>
              </div>

              <div className="ap-section-label">{shell.lang === "cs" ? "Fakturační údaje" : "Billing details"}</div>

              <div className="ap-grid ap-grid--2">
                <div className="ap-field"><label>{t.fldHomeRegion}</label>
                  <select className="ap-select" defaultValue="cz">
                    <option value="cz">Czech Republic (CZ)</option>
                    <option value="sk">Slovakia (SK)</option>
                    <option value="at">Austria (AT)</option>
                    <option value="de">Germany (DE)</option>
                  </select>
                </div>
                <div className="ap-field"><label>{t.fldYourName} <span className="req">*</span></label><input className="ap-input" defaultValue="Fakturidias s.r.o." /></div>
                <div className="ap-field"><label>{t.fldYourIco} <span className="req">*</span></label><input className="ap-input" defaultValue="27082440" /></div>
                <div className="ap-field"><label>{t.fldVatTaxId}</label><input className="ap-input" defaultValue="CZ27082440" /></div>
                <div className="ap-field" style={{ gridColumn: "span 2" }}>
                  <label>{t.fldYourAddress} <span className="req">*</span></label>
                  <input className="ap-input" defaultValue="Václavské náměstí 1, 110 00 Praha 1" />
                </div>
                <div className="ap-field" style={{ gridColumn: "span 2" }}>
                  <label>{t.fldRegistration}</label>
                  <input className="ap-input" defaultValue="Městský soud v Praze, oddíl C, vložka 42179" />
                </div>
              </div>
            </div>

            <div className="ap-card">
              <h3 className="ap-card__title"><Mail size={ICON_MD} strokeWidth={STROKE} /> {shell.lang === "cs" ? "Kontakt" : "Contact"}</h3>
              <div className="ap-grid ap-grid--2">
                <div className="ap-field"><label>{t.fldEmail}</label><input className="ap-input" defaultValue="hello@fakturidias.cz" /></div>
                <div className="ap-field"><label>{t.fldPhone}</label><input className="ap-input" defaultValue="+420 222 333 444" /></div>
                <div className="ap-field" style={{ gridColumn: "span 2" }}>
                  <label>{t.fldWeb}</label><input className="ap-input" defaultValue="fakturidias.cz" />
                </div>
              </div>
            </div>

            <div className="ap-save-bar">
              <button className="ap-btn ap-btn--ghost">{t.actionCancel}</button>
              <button className="ap-btn ap-btn--primary">
                <Save size={ICON_SM} strokeWidth={STROKE} /> {t.saveAll}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: TAX & BANK */}
        {tab === 2 && (
          <div style={{ display: "grid", gap: 18 }}>
            <div className="ap-card">
              <h3 className="ap-card__title"><Wallet size={ICON_MD} strokeWidth={STROKE} /> {shell.lang === "cs" ? "Daňové údaje" : "Tax details"}</h3>

              <div className="ap-integration" style={{ paddingTop: 4, paddingBottom: 20 }}>
                <div className="ap-integration__icon"><Check size={ICON_MD} strokeWidth={STROKE} /></div>
                <div className="ap-integration__body">
                  <div className="ap-integration__title">{t.fldVatPayer}</div>
                  <div className="ap-integration__desc">{shell.lang === "cs" ? "Vystavujete faktury s DPH a podáváte přiznání." : "You issue invoices with VAT and file returns."}</div>
                </div>
                <div className="ap-integration__action">
                  <button className="ap-toggle" data-on="true" aria-label="Toggle" />
                </div>
              </div>

              <div className="ap-grid ap-grid--3">
                <div className="ap-field"><label>{t.fldVatRate}</label>
                  <select className="ap-select" defaultValue="21">
                    <option value="21">21 %</option>
                    <option value="15">15 %</option>
                    <option value="10">10 %</option>
                    <option value="0">0 %</option>
                  </select>
                </div>
                <div className="ap-field"><label>{t.fldDefaultCurrency}</label>
                  <select className="ap-select" defaultValue="czk">
                    <option value="czk">CZK</option>
                    <option value="eur">EUR</option>
                    <option value="usd">USD</option>
                  </select>
                </div>
                <div className="ap-field"><label>{t.fldDefaultDue} ({t.fldDefaultDueUnit})</label>
                  <input className="ap-input" type="number" defaultValue="14" />
                </div>
              </div>
            </div>

            <div className="ap-card">
              <h3 className="ap-card__title"><Wallet size={ICON_MD} strokeWidth={STROKE} /> {shell.lang === "cs" ? "Bankovní účet" : "Bank account"}</h3>
              <div className="ap-grid ap-grid--2">
                <div className="ap-field"><label>{t.fldBankName}</label>
                  <select className="ap-select" defaultValue="csob">
                    <option value="csob">ČSOB</option>
                    <option value="kb">Komerční banka</option>
                    <option value="csas">Česká spořitelna</option>
                    <option value="rb">Raiffeisenbank</option>
                    <option value="fio">Fio banka</option>
                  </select>
                </div>
                <div className="ap-field"><label>{t.fldAccountNumber}</label><input className="ap-input" defaultValue="1920 0014 5399 / 0300" /></div>
                <div className="ap-field"><label>{t.fldIban}</label><input className="ap-input" defaultValue="CZ65 0800 0000 1920 0014 5399" /></div>
                <div className="ap-field"><label>{t.fldBic}</label><input className="ap-input" defaultValue="GIBACZPX" /></div>
              </div>
            </div>

            <div className="ap-save-bar">
              <button className="ap-btn ap-btn--ghost">{t.actionCancel}</button>
              <button className="ap-btn ap-btn--primary">
                <Save size={ICON_SM} strokeWidth={STROKE} /> {t.saveAll}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: INTEGRATIONS */}
        {tab === 3 && (
          <div style={{ display: "grid", gap: 18 }}>
            <div className="ap-card">
              <h3 className="ap-card__title"><Plug size={ICON_MD} strokeWidth={STROKE} /> {t.settingsTab3}</h3>

              <div className="ap-integration">
                <div className="ap-integration__icon"><Search size={ICON_LG} strokeWidth={STROKE} /></div>
                <div className="ap-integration__body">
                  <div className="ap-integration__title">
                    {t.integAres}
                    {integrations.ares && <span className="ap-pill paid" style={{ fontSize: 10.5, padding: "2px 8px" }}>{t.integConnected}</span>}
                  </div>
                  <div className="ap-integration__desc">{t.integAresDesc}</div>
                </div>
                <div className="ap-integration__action">
                  <button className="ap-toggle" data-on={integrations.ares} onClick={() => toggle("ares")} />
                </div>
              </div>

              <div className="ap-integration">
                <div className="ap-integration__icon ap-integration__icon--alt"><Cloud size={ICON_LG} strokeWidth={STROKE} /></div>
                <div className="ap-integration__body">
                  <div className="ap-integration__title">
                    {t.integGoogle}
                    {integrations.google && <span className="ap-pill paid" style={{ fontSize: 10.5, padding: "2px 8px" }}>{t.integConnected}</span>}
                  </div>
                  <div className="ap-integration__desc">{t.integGoogleDesc}</div>
                </div>
                <div className="ap-integration__action">
                  {integrations.google
                    ? <button className="ap-btn ap-btn--secondary" onClick={() => toggle("google")}>{t.integManage}</button>
                    : <button className="ap-btn ap-btn--primary" onClick={() => toggle("google")}>
                        <Cloud size={ICON_SM} strokeWidth={STROKE} /> {t.integConnect}
                      </button>
                  }
                </div>
              </div>

              <div className="ap-integration">
                <div className="ap-integration__icon"><Mail size={ICON_LG} strokeWidth={STROKE} /></div>
                <div className="ap-integration__body">
                  <div className="ap-integration__title">
                    {t.integEmail}
                    {integrations.email && <span className="ap-pill paid" style={{ fontSize: 10.5, padding: "2px 8px" }}>{t.integConnected}</span>}
                  </div>
                  <div className="ap-integration__desc">{t.integEmailDesc}</div>
                </div>
                <div className="ap-integration__action">
                  <button className="ap-toggle" data-on={integrations.email} onClick={() => toggle("email")} />
                </div>
              </div>

              <div className="ap-integration">
                <div className="ap-integration__icon ap-integration__icon--alt"><Plug size={ICON_LG} strokeWidth={STROKE} /></div>
                <div className="ap-integration__body">
                  <div className="ap-integration__title">{t.integApi}</div>
                  <div className="ap-integration__desc">{t.integApiDesc}</div>
                </div>
                <div className="ap-integration__action">
                  {integrations.api
                    ? <button className="ap-btn ap-btn--secondary" onClick={() => toggle("api")}>{t.integManage}</button>
                    : <button className="ap-btn ap-btn--secondary" onClick={() => toggle("api")}>{t.integConnect}</button>
                  }
                </div>
              </div>
            </div>

            <div className="ap-card">
              <h3 className="ap-card__title"><RefreshCw size={ICON_MD} strokeWidth={STROKE} /> {shell.lang === "cs" ? "Synchronizace" : "Sync"}</h3>
              <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 12px" }}>
                {shell.lang === "cs"
                  ? "Poslední synchronizace: před 4 minutami · 78 faktur, 12 klientů."
                  : "Last sync: 4 minutes ago · 78 invoices, 12 clients."}
              </p>
              <button className="ap-btn ap-btn--secondary">
                <RefreshCw size={ICON_SM} strokeWidth={STROKE} /> {shell.lang === "cs" ? "Synchronizovat nyní" : "Sync now"}
              </button>
            </div>

            <div className="ap-save-bar">
              <button className="ap-btn ap-btn--primary">
                <Save size={ICON_SM} strokeWidth={STROKE} /> {t.saveAll}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<SettingsApp />);
