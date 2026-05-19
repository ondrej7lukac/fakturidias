/* Fakturidias Design System — Sections part B.
   Buttons, Forms, ARES, AI input, Badges, Icons. */

const { useState: useStateB, useEffect: useEffectB } = React;

/* ============================================================
   BUTTONS
   ============================================================ */

function ButtonsSection({ t }) {
  return (
    <section id="buttons" className="ds-section">
      <SectionHead num="05 · Buttons" title={t.buttonsTitle} lead={t.buttonsLead} meta="6 variants · open-closed system" />

      <Pair t={t}>
        <div className="ds-btn-row">
          <button className="primary">
            <Save size={ICON_MD} strokeWidth={STROKE} /> {t.btnPrimary}
          </button>
          <button className="secondary">{t.btnSecondary}</button>
          <button className="success">
            <CheckCircle2 size={ICON_MD} strokeWidth={STROKE} /> {t.btnSuccess}
          </button>
          <button className="danger">
            <Trash size={ICON_MD} strokeWidth={STROKE} /> {t.btnDanger}
          </button>
          <button className="pill">
            <Eye size={ICON_MD} strokeWidth={STROKE} /> {t.btnPill}
          </button>
          <button className="iconBtn" aria-label="Edit">
            <Pencil size={ICON_MD} strokeWidth={STROKE} />
          </button>
          <button className="iconBtn" aria-label="Refresh">
            <RefreshCw size={ICON_MD} strokeWidth={STROKE} />
          </button>
        </div>
      </Pair>

      <table className="ds-spec">
        <thead><tr><th>Class</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td>button.primary · [type="submit"] · .btn--primary</td><td>Teal→indigo gradient, dark text, glow on hover</td></tr>
          <tr><td>button.secondary · .btn--soft</td><td>Transparent with --border outline</td></tr>
          <tr><td>button.success</td><td>Indigo→teal gradient, dark text</td></tr>
          <tr><td>button.danger</td><td>On hover: fills with --danger, white text</td></tr>
          <tr><td>button.pill</td><td>Pill-shaped, inherits base font</td></tr>
          <tr><td>.iconBtn</td><td>42×42, radius 14px, grid-centered icon</td></tr>
        </tbody>
      </table>

      <div className="ds-rules">
        <div className="ds-rule ds-rule--do">
          <div className="ds-rule__icon">✓</div>
          <div>
            <strong>{t.do}</strong>
            Override only <span className="ds-mono">--btn-*</span> custom props to make a new variant. The base rule handles hover, active and transitions for you.
          </div>
        </div>
        <div className="ds-rule ds-rule--dont">
          <div className="ds-rule__icon">✕</div>
          <div>
            <strong>{t.dont}</strong>
            Modify the <span className="ds-mono">button, .btn</span> base rule or add inline padding overrides per variant. Always go through the token layer.
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FORMS + ARES pattern
   ============================================================ */

function FormsSection({ t }) {
  return (
    <section id="forms" className="ds-section">
      <SectionHead num="06 · Forms" title={t.formsTitle} lead={t.formsLead} meta=".field wrapper · 12px radius · teal focus ring" />

      <Pair t={t}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="field">
            <label>{t.formCompanyName}</label>
            <input type="text" defaultValue="Fakturidias s.r.o." />
          </div>
          <div className="field">
            <label>{t.formIco}</label>
            <input type="text" placeholder="12345678" />
          </div>
          <div className="field">
            <label>{t.formVat}</label>
            <input type="text" placeholder="CZ12345678" />
          </div>
          <div className="field">
            <label>Region</label>
            <select defaultValue="cz">
              <option value="cz">Czech Republic (CZ)</option>
              <option value="sk">Slovakia (SK)</option>
              <option value="at">Austria (AT)</option>
            </select>
          </div>
          <div className="field" style={{ gridColumn: "span 2" }}>
            <label>{t.formAddress}</label>
            <input type="text" defaultValue="Václavské náměstí 1, 110 00 Praha 1" />
          </div>
        </div>
      </Pair>

      {/* ARES search pattern */}
      <h3 style={{ fontSize: 14, fontWeight: 600, margin: "32px 0 6px" }}>{t.aresTitle}</h3>
      <p style={{ fontSize: 13.5, color: "var(--page-muted)", maxWidth: 580, marginTop: 0, marginBottom: 14 }}>{t.aresLead}</p>

      <Pair t={t}>
        <div className="ds-ares">
          <div className="ds-ares__input">
            <input type="text" placeholder={t.aresInput} defaultValue="27082440" />
            <button className="primary" type="button">
              <Search size={ICON_MD} strokeWidth={STROKE} /> ARES
            </button>
          </div>
          <div className="ds-ares__result">
            <span className="ds-ares__result-tag">
              <Check size={ICON_SM} strokeWidth={STROKE} /> {t.aresAutoFill}
            </span>
            <div className="ds-ares__result-name">{t.aresResultName}</div>
            <div className="ds-ares__result-addr">{t.aresResultAddr}</div>
            <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>
              <span>IČO 27082440</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>DIČ CZ27082440</span>
            </div>
          </div>
        </div>
      </Pair>
    </section>
  );
}

/* ============================================================
   AI INPUT — the signature pattern (idle / listening / processing / result)
   ============================================================ */

function AiPanel({ state, t, theme }) {
  return (
    <div className="ds-ai">
      <div className="ds-ai__head">
        <Sparkles size={ICON_MD} strokeWidth={STROKE} style={{ color: "var(--accent)" }} />
        <div>
          <div className="ds-ai__title">
            {state === "idle" && t.aiIdle}
            {state === "listening" && t.aiListening}
            {state === "processing" && t.aiProcessing}
            {state === "result" && t.aiResult}
          </div>
          <div className="ds-ai__sub">
            {state === "idle" && t.aiIdleSub}
            {state === "listening" && t.aiListeningSub}
            {state === "processing" && t.aiProcessingSub}
            {state === "result" && t.aiResultSub}
          </div>
        </div>
      </div>

      <div className="ds-ai__field">
        <button className={`ds-ai__mic${state === "listening" ? " ds-ai__mic--active" : ""}`} aria-label="Mic">
          {state === "idle" || state === "result"
            ? <Mic size={ICON_LG} strokeWidth={STROKE} />
            : state === "listening"
            ? <Mic size={ICON_LG} strokeWidth={STROKE} />
            : <Sparkles size={ICON_LG} strokeWidth={STROKE} />
          }
        </button>

        {state === "idle" && (
          <div className="ds-ai__placeholder">{t.aiPlaceholder}</div>
        )}
        {state === "listening" && (
          <>
            <div className="ds-ai__transcript">
              <em>{t.aiTranscript}</em>
            </div>
            <div className="ds-ai__wave" aria-hidden>
              <span /><span /><span /><span /><span /><span />
            </div>
          </>
        )}
        {state === "processing" && (
          <div style={{ flex: 1, display: "grid", gap: 6 }}>
            <div className="ds-ai__shimmer" />
            <div className="ds-ai__shimmer" style={{ width: "70%" }} />
          </div>
        )}
        {state === "result" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={ICON_MD} strokeWidth={STROKE} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 13.5, color: "var(--text)" }}>{t.aiTranscript}</span>
          </div>
        )}
      </div>

      {state === "result" && (
        <>
          <div className="ds-ai__chips">
            <div className="ds-ai__chip">
              <div className="ds-ai__chip-label">{t.aiParsedClient}</div>
              <div className="ds-ai__chip-value">Mr. Novák</div>
            </div>
            <div className="ds-ai__chip">
              <div className="ds-ai__chip-label">{t.aiParsedHours}</div>
              <div className="ds-ai__chip-value">12,0 h</div>
            </div>
            <div className="ds-ai__chip">
              <div className="ds-ai__chip-label">{t.aiParsedRate}</div>
              <div className="ds-ai__chip-value">1 500 / h</div>
            </div>
            <div className="ds-ai__chip">
              <div className="ds-ai__chip-label">{t.aiParsedTotal}</div>
              <div className="ds-ai__chip-value ds-ai__chip-value--accent">21 780 CZK</div>
            </div>
          </div>
          <div className="ds-ai__actions">
            <button className="secondary">
              <Pencil size={ICON_SM} strokeWidth={STROKE} /> {t.aiEdit}
            </button>
            <button className="primary">
              <CheckCircle2 size={ICON_SM} strokeWidth={STROKE} /> {t.aiConfirm}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AiSection({ t }) {
  return (
    <section id="ai" className="ds-section">
      <SectionHead num="07 · AI input" title={t.aiTitle} lead={t.aiLead} meta="4 states · signature pattern" />

      <div className="ds-sample theme-light" style={{ marginBottom: 16 }}>
        <span className="ds-sample__label">{t.light}</span>
        <div className="ds-sample__inner ds-sample__inner--snug" style={{ padding: 22 }}>
          <div className="ds-ai-grid">
            <AiPanel state="idle"       t={t} />
            <AiPanel state="listening"  t={t} />
            <AiPanel state="processing" t={t} />
            <AiPanel state="result"     t={t} />
          </div>
        </div>
      </div>

      <div className="ds-sample theme-dark">
        <span className="ds-sample__label">{t.dark}</span>
        <div className="ds-sample__inner ds-sample__inner--snug" style={{ padding: 22 }}>
          <div className="ds-ai-grid">
            <AiPanel state="idle"       t={t} />
            <AiPanel state="listening"  t={t} />
            <AiPanel state="processing" t={t} />
            <AiPanel state="result"     t={t} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   BADGES
   ============================================================ */

function BadgesSection({ t }) {
  return (
    <section id="badges" className="ds-section">
      <SectionHead num="08 · Badges" title={t.badgesTitle} lead={t.badgesLead} meta="4 states + due-soon variant" />

      <Pair t={t}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <span className="pill draft">{t.badgeDraft}</span>
          <span className="pill sent">{t.badgeSent}</span>
          <span className="pill paid">{t.badgePaid}</span>
          <span className="pill overdue">{t.badgeOverdue}</span>
          <span className="pill due-soon">{t.badgeDueIn}</span>
        </div>
      </Pair>

      <table className="ds-spec">
        <thead>
          <tr>
            <th>Class</th>
            <th>Background</th>
            <th>Text</th>
            <th>Border</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>.pill.draft</td><td className="ds-spec__val">rgba(255,255,255,.08)</td><td className="ds-spec__val">var(--text)</td><td className="ds-spec__val">var(--border)</td></tr>
          <tr><td>.pill.sent</td><td className="ds-spec__val">rgba(138,164,255,.15)</td><td className="ds-spec__val">var(--accent-2)</td><td className="ds-spec__val">rgba(138,164,255,.3)</td></tr>
          <tr><td>.pill.paid</td><td className="ds-spec__val">var(--success-bg)</td><td className="ds-spec__val">var(--success-border)</td><td className="ds-spec__val">rgba(45,215,166,.3)</td></tr>
          <tr><td>.pill.overdue</td><td className="ds-spec__val">rgba(255,91,122,.15)</td><td className="ds-spec__val">var(--danger)</td><td className="ds-spec__val">rgba(255,91,122,.3)</td></tr>
          <tr><td>.pill.due-soon</td><td className="ds-spec__val">rgba(211,146,31,.15)</td><td className="ds-spec__val">var(--warn)</td><td className="ds-spec__val">rgba(211,146,31,.3)</td></tr>
        </tbody>
      </table>
    </section>
  );
}

/* ============================================================
   ICONS
   ============================================================ */

const ICON_LIST = [
  ["Settings2", Settings2], ["Contact", Contact], ["Wallet", Wallet], ["Plug", Plug],
  ["Save", Save], ["BarChart2", BarChart2], ["FileText", FileText], ["Check", Check],
  ["CheckCircle2", CheckCircle2], ["X", X], ["Menu", Menu], ["Pencil", Pencil],
  ["Eye", Eye], ["AlertTriangle", AlertTriangle], ["Cloud", Cloud], ["Mail", Mail],
  ["RefreshCw", RefreshCw], ["ArrowLeftRight", ArrowLeftRight], ["Sparkles", Sparkles],
  ["Mic", Mic], ["MicOff", MicOff], ["Search", Search], ["Calendar", Calendar],
  ["Send", Send], ["Plus", Plus], ["Trash", Trash], ["ChevronDown", ChevronDown],
];

function IconsSection({ t }) {
  return (
    <section id="icons" className="ds-section">
      <SectionHead num="09 · Icons" title={t.iconsTitle} lead={t.iconsLead} meta={`${ICON_LIST.length} icons · stroke 2`} />

      <Pair t={t} snug>
        <div className="ds-icon-grid">
          {ICON_LIST.map(([name, C]) => (
            <div key={name} className="ds-icon-cell">
              <C size={20} strokeWidth={STROKE} />
              <span className="ds-icon-cell__label">{name}</span>
            </div>
          ))}
        </div>
      </Pair>

      <div style={{ display: "flex", gap: 14, marginTop: 16, flexWrap: "wrap" }}>
        {[
          { c: "ICON_SM", v: 14 },
          { c: "ICON_MD", v: 16 },
          { c: "ICON_LG", v: 18 },
        ].map(s => (
          <div key={s.c} style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "var(--page-card)", border: "1px solid var(--page-border)",
            borderRadius: 12, padding: "10px 14px"
          }}>
            <Pencil size={s.v} strokeWidth={STROKE} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{s.c} · {s.v}px</span>
          </div>
        ))}
      </div>
    </section>
  );
}

Object.assign(window, { ButtonsSection, FormsSection, AiSection, BadgesSection, IconsSection, AiPanel });
