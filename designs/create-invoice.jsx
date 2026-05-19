/* Fakturidias — Create Invoice page. */

const { useState: useStateCI } = React;

const SAMPLE_ITEMS = [
  { desc: "Konzultace UX designu", qty: 12, unit: "h", price: 1500, vat: 21 },
  { desc: "Implementace komponent", qty: 1,  unit: "ks", price: 30000, vat: 21 },
];

function CreateInvoiceApp() {
  const shell = useAppShell("dark");
  const t = { ...window.LANDING_I18N[shell.lang], ...window.APP_I18N[shell.lang] };

  const [aiActive, setAiActive] = useStateCI(false);
  const [aiText, setAiText] = useStateCI("");
  const [items, setItems] = useStateCI(SAMPLE_ITEMS);

  const subtotal = items.reduce((sum, it) => sum + it.qty * it.price, 0);
  const vat21    = items.filter(i => i.vat === 21).reduce((s, it) => s + it.qty * it.price * 0.21, 0);
  const total    = subtotal + vat21;

  const fmt = (n) => n.toLocaleString(shell.lang === "cs" ? "cs-CZ" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const updateItem = (i, key, value) => {
    setItems(items.map((it, idx) => idx === i ? { ...it, [key]: value } : it));
  };
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const addItem = () => setItems([...items, { desc: "", qty: 1, unit: "h", price: 0, vat: 21 }]);

  return (
    <>
      <AppHeader activePage="create" {...shell} t={t} />

      <div className="ap-page">
        <div className="ap-page__head">
          <div>
            <h1 className="ap-page__title">{t.pageCreate}</h1>
            <p className="ap-page__sub">{t.pageCreateSub} <span style={{ color: "var(--muted-2)", fontFamily: "var(--font-mono)", fontSize: 12, marginLeft: 8 }}>· 2026/0142</span></p>
          </div>
        </div>

        <div className="ap-create">
          <div className="ap-create__main">
            {/* AI dictation */}
            <div className="ap-ai">
              <div className="ap-ai__head">
                <h3><Sparkles size={ICON_MD} strokeWidth={STROKE} /> {t.aiCardTitle}</h3>
                <div className="ap-ai__sub">{t.aiCardSub}</div>
              </div>
              <div className="ap-ai__row">
                <div className="ap-ai__input">
                  <textarea
                    className="ap-ai__textarea"
                    placeholder={t.aiInputPlaceholder}
                    rows="2"
                    value={aiText}
                    onChange={e => setAiText(e.target.value)}
                  />
                  <button
                    className={`ap-ai__mic${aiActive ? " ap-ai__mic--active" : ""}`}
                    onClick={() => setAiActive(!aiActive)}
                    aria-label={t.aiButtonMic}
                  >
                    {aiActive ? <Mic size={ICON_LG} strokeWidth={STROKE} /> : <Mic size={ICON_LG} strokeWidth={STROKE} />}
                  </button>
                </div>
                <div className="ap-ai__actions">
                  <button className="ap-btn ap-btn--primary">
                    <Sparkles size={ICON_SM} strokeWidth={STROKE} /> {t.aiButtonGenerate}
                  </button>
                  <button className="ap-btn ap-btn--ghost" onClick={() => setAiText("")}>
                    <X size={ICON_SM} strokeWidth={STROKE} /> {t.aiButtonClear}
                  </button>
                </div>
              </div>
              <div className="ap-ai__hints">
                <div className="ap-ai__hints-title">{t.aiHintsTitle}</div>
                <button className="ap-ai__hint" onClick={() => setAiText(t.aiHint1)}>{t.aiHint1}</button>
                <button className="ap-ai__hint" onClick={() => setAiText(t.aiHint2)}>{t.aiHint2}</button>
                <button className="ap-ai__hint" onClick={() => setAiText(t.aiHint3)}>{t.aiHint3}</button>
              </div>
            </div>

            {/* Basic */}
            <div className="ap-card">
              <h3 className="ap-card__title"><FileText size={ICON_MD} strokeWidth={STROKE} /> {t.sectionBasic}</h3>
              <div className="ap-grid ap-grid--3">
                <div className="ap-field"><label>{t.fldNumber}</label><input className="ap-input" defaultValue="2026/0142" /></div>
                <div className="ap-field"><label>{t.fldIssueDate}</label><input className="ap-input" type="date" defaultValue="2026-05-19" /></div>
                <div className="ap-field"><label>{t.fldDueDate}</label><input className="ap-input" type="date" defaultValue="2026-06-02" /></div>
                <div className="ap-field"><label>{t.fldTaxDate}</label><input className="ap-input" type="date" defaultValue="2026-05-19" /></div>
                <div className="ap-field"><label>{t.fldCurrency}</label>
                  <select className="ap-select" defaultValue="czk">
                    <option value="czk">CZK · Česká koruna</option>
                    <option value="eur">EUR · Euro</option>
                    <option value="usd">USD · US Dollar</option>
                  </select>
                </div>
                <div className="ap-field"><label>{t.fldCategory}</label>
                  <select className="ap-select" defaultValue="services">
                    <option value="services">{shell.lang === "cs" ? "Služby" : "Services"}</option>
                    <option value="goods">{shell.lang === "cs" ? "Zboží" : "Goods"}</option>
                    <option value="other">{shell.lang === "cs" ? "Ostatní" : "Other"}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Client (with ARES) */}
            <div className="ap-card">
              <h3 className="ap-card__title"><Contact size={ICON_MD} strokeWidth={STROKE} /> {t.sectionClient}</h3>

              <div className="ap-grid ap-grid--2" style={{ marginBottom: 14 }}>
                <div className="ap-field" style={{ gridColumn: "span 2" }}>
                  <label>{t.fldName}</label>
                  <div className="ap-input-wrap">
                    <Search size={ICON_SM} strokeWidth={STROKE} />
                    <input className="ap-input" defaultValue="Acme Design Studio" placeholder={t.fldClientPlaceholder} />
                  </div>
                </div>
              </div>

              <div className="ap-ares-banner">
                <Check size={ICON_SM} strokeWidth={STROKE} />
                <strong>ARES</strong> · {t.aresAutoFilled}
              </div>

              <div className="ap-grid ap-grid--2">
                <div className="ap-field"><label>{t.fldIco}</label><input className="ap-input" defaultValue="12345678" /></div>
                <div className="ap-field"><label>{t.fldDic}</label><input className="ap-input" defaultValue="CZ12345678" /></div>
                <div className="ap-field" style={{ gridColumn: "span 2" }}><label>{t.fldAddress}</label><input className="ap-input" defaultValue="Karlovo náměstí 17, 120 00 Praha 2" /></div>
                <div className="ap-field"><label>{t.fldEmail}</label><input className="ap-input" defaultValue="invoices@acme.studio" /></div>
                <div className="ap-field"><label>{t.fldPhone}</label><input className="ap-input" defaultValue="+420 777 123 456" /></div>
              </div>
            </div>

            {/* Items */}
            <div className="ap-card">
              <h3 className="ap-card__title"><Wallet size={ICON_MD} strokeWidth={STROKE} /> {t.sectionItems}</h3>
              <div className="ap-items">
                <div className="ap-items__row">
                  <div>{t.itemDescription}</div>
                  <div>{t.itemQty}</div>
                  <div>{t.itemUnit}</div>
                  <div style={{ textAlign: "right" }}>{t.itemPrice}</div>
                  <div style={{ textAlign: "right" }}>{t.itemVat}</div>
                  <div style={{ textAlign: "right" }}>{t.itemTotal}</div>
                  <div />
                </div>
                {items.map((it, i) => (
                  <div key={i} className="ap-items__row">
                    <input
                      className="ap-input"
                      placeholder={t.itemPlaceholder}
                      value={it.desc}
                      onChange={e => updateItem(i, "desc", e.target.value)}
                    />
                    <input
                      className="ap-input"
                      type="number"
                      value={it.qty}
                      onChange={e => updateItem(i, "qty", parseFloat(e.target.value) || 0)}
                    />
                    <select className="ap-select" value={it.unit} onChange={e => updateItem(i, "unit", e.target.value)}>
                      <option value="h">{t.unitHour}</option>
                      <option value="ks">{t.unitPiece}</option>
                      <option value="m">{t.unitMonth}</option>
                    </select>
                    <input
                      className="ap-input"
                      type="number"
                      value={it.price}
                      onChange={e => updateItem(i, "price", parseFloat(e.target.value) || 0)}
                      style={{ textAlign: "right" }}
                    />
                    <select className="ap-select" value={it.vat} onChange={e => updateItem(i, "vat", parseInt(e.target.value))}>
                      <option value="21">21</option>
                      <option value="15">15</option>
                      <option value="10">10</option>
                      <option value="0">0</option>
                    </select>
                    <div className="num">{fmt(it.qty * it.price)}</div>
                    <button className="ap-items__remove" onClick={() => removeItem(i)} aria-label="Remove">
                      <X size={ICON_SM} strokeWidth={STROKE} />
                    </button>
                  </div>
                ))}
              </div>
              <button className="ap-items__add" onClick={addItem}>{t.itemAdd}</button>

              <div className="ap-totals">
                <div className="ap-totals__row"><span className="label">{t.subtotal}</span><span className="num">{fmt(subtotal)}</span></div>
                <div className="ap-totals__row"><span className="label">{t.vat21}</span><span className="num">{fmt(vat21)}</span></div>
                <div className="ap-totals__row ap-totals__row--grand"><span>{t.total}</span><span className="num">{fmt(total)} CZK</span></div>
              </div>
            </div>

            {/* Payment */}
            <div className="ap-card">
              <h3 className="ap-card__title"><Wallet size={ICON_MD} strokeWidth={STROKE} /> {t.sectionPayment}</h3>
              <div className="ap-grid ap-grid--2">
                <div className="ap-field"><label>{t.fldIban}</label><input className="ap-input" defaultValue="CZ65 0800 0000 1920 0014 5399" /></div>
                <div className="ap-field"><label>{t.fldBic}</label><input className="ap-input" defaultValue="GIBACZPX" /></div>
                <div className="ap-field"><label>{t.fldVarSymbol}</label><input className="ap-input" defaultValue="20260142" /></div>
                <div className="ap-field"><label>{t.fldConstSymbol}</label><input className="ap-input" defaultValue="0308" /></div>
              </div>
            </div>

            <div className="ap-card">
              <h3 className="ap-card__title"><Pencil size={ICON_MD} strokeWidth={STROKE} /> {t.sectionNote}</h3>
              <textarea className="ap-textarea" placeholder={shell.lang === "cs" ? "Děkujeme za spolupráci..." : "Thank you for working with us..."} />
            </div>

            <div className="ap-action-bar ap-action-bar--mobile-stack">
              <button className="ap-btn ap-btn--ghost">{t.actionDraft}</button>
              <button className="ap-btn ap-btn--secondary">
                <Eye size={ICON_SM} strokeWidth={STROKE} /> {t.actionPreview}
              </button>
              <button className="ap-btn ap-btn--secondary">
                <Send size={ICON_SM} strokeWidth={STROKE} /> {t.actionSend}
              </button>
              <button className="ap-btn ap-btn--primary ap-btn--lg">
                <Save size={ICON_SM} strokeWidth={STROKE} /> {t.actionSave}
              </button>
            </div>
          </div>

          {/* Right rail: supplier + summary */}
          <div className="ap-create__side">
            <div className="ap-card">
              <h3 className="ap-card__title"><Contact size={ICON_MD} strokeWidth={STROKE} /> {t.sectionSupplier}</h3>
              <div className="ap-grid">
                <div className="ap-field"><label>{t.fldName}</label><input className="ap-input" defaultValue="Fakturidias s.r.o." /></div>
                <div className="ap-grid ap-grid--2">
                  <div className="ap-field"><label>{t.fldIco}</label><input className="ap-input" defaultValue="27082440" /></div>
                  <div className="ap-field"><label>{t.fldDic}</label><input className="ap-input" defaultValue="CZ27082440" /></div>
                </div>
                <div className="ap-field"><label>{t.fldAddress}</label><input className="ap-input" defaultValue="Václavské náměstí 1, 110 00 Praha 1" /></div>
              </div>
            </div>

            <div className="ap-card" style={{
              background: "radial-gradient(closest-side at 100% 0%, rgba(124, 247, 212, 0.08), transparent 60%), var(--card)"
            }}>
              <h3 className="ap-card__title"><FileText size={ICON_MD} strokeWidth={STROKE} /> {shell.lang === "cs" ? "Souhrn" : "Summary"}</h3>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--muted)" }}>{t.subtotal}</span>
                  <span style={{ fontFamily: "var(--font-secondary)", fontWeight: 500 }}>{fmt(subtotal)} CZK</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--muted)" }}>{t.vat21}</span>
                  <span style={{ fontFamily: "var(--font-secondary)", fontWeight: 500 }}>{fmt(vat21)} CZK</span>
                </div>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "baseline",
                  fontSize: 13, paddingTop: 12, marginTop: 4, borderTop: "1px solid var(--border)"
                }}>
                  <span style={{ fontWeight: 600 }}>{t.total}</span>
                  <span style={{ fontFamily: "var(--font-secondary)", fontWeight: 600, fontSize: 22, color: "var(--accent)" }}>{fmt(total)}</span>
                </div>
              </div>
              <div style={{
                marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)",
                display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12
              }}>
                <span className="ap-pill draft">{t.statusDraft}</span>
                <span style={{ color: "var(--muted)" }}>
                  {shell.lang === "cs" ? "Splatnost za 14 dní" : "Due in 14 days"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<CreateInvoiceApp />);
