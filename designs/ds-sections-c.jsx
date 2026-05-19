/* Fakturidias Design System — Sections part C.
   Layout, Invoice mockup, Dashboard, Motion. */

/* ============================================================
   LAYOUT
   ============================================================ */

function LayoutSection({ t }) {
  return (
    <section id="layout" className="ds-section">
      <SectionHead num="10 · Layout" title={t.layoutTitle} lead={t.layoutLead} meta="1.2fr / 0.8fr · max-width 1400" />

      <Pair t={t} snug>
        <div className="ds-layout-diagram">
          <div className="ds-layout-diagram__header">main grid · padding-top: calc(--header-h + 2rem)</div>
          <div className="ds-layout-diagram__body">
            <div className="ds-layout-diagram__col">{t.layoutForm}<br/><span style={{opacity:0.7}}>1.2fr</span></div>
            <div className="ds-layout-diagram__col ds-layout-diagram__col--sidebar">{t.layoutList}<br/><span style={{opacity:0.7}}>0.8fr</span></div>
          </div>
        </div>
      </Pair>

      <h3 style={{ fontSize: 14, fontWeight: 600, margin: "28px 0 6px" }}>{t.layoutSettings}</h3>
      <Pair t={t} snug>
        <div className="ds-layout-diagram ds-layout-diagram--settings">
          <div className="ds-layout-diagram__header">.settings-v3-layout · sidebar + content</div>
          <div className="ds-layout-diagram__body">
            <div className="ds-layout-diagram__col ds-layout-diagram__col--sidebar">{t.sectionForms}<br/><span style={{opacity:0.7}}>260px</span></div>
            <div className="ds-layout-diagram__col">{t.layoutSettingsContent}<br/><span style={{opacity:0.7}}>1fr</span></div>
          </div>
        </div>
      </Pair>

      <table className="ds-spec" style={{ marginTop: 20 }}>
        <thead><tr><th>Breakpoint</th><th>Behavior</th></tr></thead>
        <tbody>
          <tr><td>≤ 1024px</td><td>main collapses to 1 column</td></tr>
          <tr><td>≤ 768px</td><td>.grid.two / .grid.three collapse to 1 col · .view-switch appears · .mobile-hidden hides</td></tr>
        </tbody>
      </table>
    </section>
  );
}

/* ============================================================
   INVOICE MOCKUP
   ============================================================ */

function InvoiceMockup({ t }) {
  return (
    <div className="ds-invoice">
      <div className="ds-invoice__head">
        <div>
          <div className="ds-invoice__num">
            <small>{t.invoiceNumber}</small>
            2026/0142
          </div>
        </div>
        <div style={{ display: "flex", gap: 18, fontSize: 12 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-2)", marginBottom: 4 }}>{t.invoiceDate}</div>
            <div>19. 05. 2026</div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-2)", marginBottom: 4 }}>{t.invoiceDue}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              02. 06. 2026
              <span className="pill due-soon" style={{ padding: "2px 8px", fontSize: 10.5 }}>{t.badgeDueIn}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ds-invoice__parties">
        <div>
          <div className="ds-invoice__party-label">{t.invoiceSupplier}</div>
          <div className="ds-invoice__party-name">Fakturidias s.r.o.</div>
          <div className="ds-invoice__party-addr">
            Václavské náměstí 1<br />
            110 00 Praha 1<br />
            IČO: 27082440 · DIČ: CZ27082440
          </div>
        </div>
        <div>
          <div className="ds-invoice__party-label">{t.invoiceClient}</div>
          <div className="ds-invoice__party-name">Acme Design Studio</div>
          <div className="ds-invoice__party-addr">
            Karlovo náměstí 17<br />
            120 00 Praha 2<br />
            IČO: 12345678
          </div>
        </div>
      </div>

      <table className="ds-invoice__table">
        <thead>
          <tr>
            <th>{t.invoiceItems}</th>
            <th>{t.invoiceQty}</th>
            <th>{t.invoiceUnit}</th>
            <th>{t.invoiceVatRate}</th>
            <th>{t.invoiceLineTotal}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t.invoiceItemDesc}</td>
            <td>12,0 h</td>
            <td>1 500,00</td>
            <td>21 %</td>
            <td>18 000,00</td>
          </tr>
          <tr>
            <td>{t.invoiceItemDesc2}</td>
            <td>1,0</td>
            <td>30 000,00</td>
            <td>21 %</td>
            <td>30 000,00</td>
          </tr>
        </tbody>
      </table>

      <div className="ds-invoice__totals">
        <div className="ds-invoice__totals-row">
          <span style={{ color: "var(--muted)" }}>{t.invoiceSubtotal}</span>
          <span className="num">48 000,00</span>
        </div>
        <div className="ds-invoice__totals-row">
          <span style={{ color: "var(--muted)" }}>{t.invoiceVat}</span>
          <span className="num">10 080,00</span>
        </div>
        <div className="ds-invoice__totals-row ds-invoice__totals-row--grand">
          <span>{t.invoiceTotal}</span>
          <span className="num" style={{ color: "var(--accent)" }}>58 080,00 CZK</span>
        </div>
      </div>

      <div className="ds-invoice__footer">
        <span className="pill sent">{t.badgeSent}</span>
        <div className="ds-invoice__footer-actions">
          <button className="secondary">
            <Eye size={ICON_SM} strokeWidth={STROKE} /> {t.invoicePreview}
          </button>
          <button className="secondary">
            <Send size={ICON_SM} strokeWidth={STROKE} /> {t.invoiceSend}
          </button>
          <button className="primary">
            <Save size={ICON_SM} strokeWidth={STROKE} /> {t.invoiceSaveBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

function InvoiceSection({ t }) {
  return (
    <section id="invoice" className="ds-section">
      <SectionHead num="11 · Invoice" title={t.invoiceTitle} lead={t.invoiceLead} meta="end-to-end composition" />

      <div className="ds-pair">
        <div className="ds-sample theme-light">
          <span className="ds-sample__label">{t.light}</span>
          <div className="ds-sample__inner ds-sample__inner--snug" style={{ padding: 20 }}>
            <InvoiceMockup t={t} />
          </div>
        </div>
        <div className="ds-sample theme-dark">
          <span className="ds-sample__label">{t.dark}</span>
          <div className="ds-sample__inner ds-sample__inner--snug" style={{ padding: 20 }}>
            <InvoiceMockup t={t} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   DASHBOARD — matches the user's current screenshot layout
   ============================================================ */

const MONTHS_CS = ["červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec", "leden", "únor", "březen", "duben", "květen"];
const MONTHS_EN = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];
const CHART_DATA = [22, 28, 31, 26, 34, 42, 38, 45, 51, 48, 56, 62]; // thousands CZK

function RevenueChart({ lang }) {
  const W = 540, H = 180, PAD_L = 36, PAD_R = 12, PAD_T = 12, PAD_B = 32;
  const max = Math.max(...CHART_DATA) * 1.1;
  const months = lang === "cs" ? MONTHS_CS : MONTHS_EN;
  const xStep = (W - PAD_L - PAD_R) / (CHART_DATA.length - 1);
  const points = CHART_DATA.map((v, i) => [
    PAD_L + i * xStep,
    PAD_T + (H - PAD_T - PAD_B) * (1 - v / max),
  ]);
  const path = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = `${path} L${points[points.length - 1][0]},${H - PAD_B} L${points[0][0]},${H - PAD_B} Z`;
  const yTicks = [0, max / 2, max];
  return (
    <svg className="ds-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      {yTicks.map((tk, i) => {
        const y = PAD_T + (H - PAD_T - PAD_B) * (1 - tk / max);
        return (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="var(--border)" strokeDasharray="3 4" />
            <text x={PAD_L - 8} y={y + 3.5} fontSize="9.5" textAnchor="end" fill="var(--muted-2)" fontFamily="var(--font-mono)">
              {Math.round(tk)}k
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#area-grad)" />
      <path d={path} fill="none" stroke="url(#line-grad)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="2.6" fill="var(--bg)" stroke="var(--accent)" strokeWidth="1.6" />
      ))}
      {months.map((m, i) => (
        <text
          key={i}
          x={PAD_L + i * xStep}
          y={H - 10}
          fontSize="9.5"
          textAnchor="middle"
          fill="var(--muted-2)"
        >
          {m.length > 4 ? m.slice(0, 3) : m}
        </text>
      ))}
    </svg>
  );
}

function StatusDonut() {
  const data = [
    { label: "paid",    value: 42, color: "var(--accent)" },
    { label: "sent",    value: 18, color: "var(--accent-2)" },
    { label: "draft",   value: 12, color: "var(--muted-2)" },
    { label: "overdue", value: 6,  color: "var(--danger)" },
  ];
  const total = data.reduce((a, b) => a + b.value, 0);
  const R = 60, CX = 80, CY = 80;
  let cum = 0;
  const arcs = data.map(d => {
    const start = (cum / total) * Math.PI * 2 - Math.PI / 2;
    cum += d.value;
    const end = (cum / total) * Math.PI * 2 - Math.PI / 2;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = CX + R * Math.cos(start), y1 = CY + R * Math.sin(start);
    const x2 = CX + R * Math.cos(end),   y2 = CY + R * Math.sin(end);
    return { ...d, d: `M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} Z` };
  });
  return (
    <>
      <svg className="ds-donut" viewBox="0 0 160 160">
        {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} opacity={0.92} />)}
        <circle cx={CX} cy={CY} r={36} fill="var(--bg)" />
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize="11" fill="var(--muted)" letterSpacing="0.04em">TOTAL</text>
        <text x={CX} y={CY + 14} textAnchor="middle" fontSize="18" fontWeight="600" fill="var(--text)" fontFamily="var(--font-secondary)">{total}</text>
      </svg>
      <div className="ds-legend">
        {data.map((d, i) => (
          <div key={i} className="ds-legend__row">
            <span className="left">
              <span className="ds-legend__dot" style={{ background: d.color }} />
              <span style={{ color: "var(--muted)", textTransform: "capitalize" }}>{d.label}</span>
            </span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text)" }}>{d.value}</span>
          </div>
        ))}
      </div>
    </>
  );
}

const RECENT = [
  { num: "2026/0142", client: "Acme Design Studio",        amount: "58 080,00", status: "sent",    statusKey: "badgeSent" },
  { num: "2026/0141", client: "Novák Consulting s.r.o.",   amount: "12 480,00", status: "paid",    statusKey: "badgePaid" },
  { num: "2026/0140", client: "Tektonic a.s.",             amount: "94 200,00", status: "paid",    statusKey: "badgePaid" },
  { num: "2026/0139", client: "Pražský Sklep",             amount: "8 900,00",  status: "overdue", statusKey: "badgeOverdue" },
  { num: "2026/0138", client: "Studio Květinka",           amount: "3 200,00",  status: "draft",   statusKey: "badgeDraft" },
];

function DashboardMockup({ t, lang }) {
  return (
    <div className="ds-dash">
      <div className="ds-dash__metrics">
        <div className="ds-metric">
          <div className="ds-metric__label">{t.metricRevenue}</div>
          <div className="ds-metric__value">62 480 <span style={{ fontSize: 12, color: "var(--muted)" }}>CZK</span></div>
          <div className="ds-metric__delta ds-metric__delta--up">
            <ArrowUp size={11} strokeWidth={STROKE} /> +14,2 %
          </div>
        </div>
        <div className="ds-metric">
          <div className="ds-metric__label">{t.metricInvoices}</div>
          <div className="ds-metric__value">78</div>
          <div className="ds-metric__delta ds-metric__delta--up">
            <ArrowUp size={11} strokeWidth={STROKE} /> +6
          </div>
        </div>
        <div className="ds-metric ds-metric--danger">
          <div className="ds-metric__label">{t.metricOverdue}</div>
          <div className="ds-metric__value">6</div>
          <div className="ds-metric__delta ds-metric__delta--down">
            <ArrowDown size={11} strokeWidth={STROKE} /> −2
          </div>
        </div>
        <div className="ds-metric">
          <div className="ds-metric__label">{t.metricAvg}</div>
          <div className="ds-metric__value">12 840</div>
          <div className="ds-metric__delta" style={{ color: "var(--muted)" }}>
            <ArrowLeftRight size={11} strokeWidth={STROKE} /> 0 %
          </div>
        </div>
      </div>

      <div className="ds-dash__filters">
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 6 }}>
          <Search size={ICON_MD} strokeWidth={STROKE} style={{ color: "var(--muted)" }} />
          <input type="text" placeholder={lang === "cs" ? "Hledat (číslo, klient, položka, oblast...)" : "Search (number, client, line item, area...)"} />
        </div>
        <select defaultValue="">
          <option value="">{lang === "cs" ? "Všechny stavy" : "All statuses"}</option>
        </select>
        <select defaultValue="">
          <option value="">{lang === "cs" ? "Všechny kategorie" : "All categories"}</option>
        </select>
        <input type="text" placeholder={lang === "cs" ? "Od · dd.mm.yyyy" : "From · dd.mm.yyyy"} />
        <input type="text" placeholder={lang === "cs" ? "Do · dd.mm.yyyy" : "To · dd.mm.yyyy"} />
      </div>

      <div className="ds-dash__split">
        <div className="ds-dash__panel">
          <h4 className="ds-dash__panel-title">{t.chartTitle}</h4>
          <RevenueChart lang={lang} />
        </div>
        <div className="ds-dash__panel">
          <h4 className="ds-dash__panel-title">{lang === "cs" ? "Přehled stavů" : "Status overview"}</h4>
          <StatusDonut />
        </div>
      </div>

      <div className="ds-recent">
        <div className="ds-recent__row">
          <span>{t.recentClient}</span>
          <span style={{ textAlign: "right" }}>{t.recentAmount}</span>
          <span>{t.recentStatus}</span>
          <span />
        </div>
        {RECENT.map(r => (
          <div key={r.num} className="ds-recent__row">
            <div>
              <div className="ds-recent__num">{r.num}</div>
              <div style={{ fontWeight: 500 }}>{r.client}</div>
            </div>
            <div className="ds-recent__amount">{r.amount} <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--muted)", marginLeft: 4 }}>CZK</span></div>
            <div><span className={`pill ${r.status}`}>{t[r.statusKey]}</span></div>
            <button className="iconBtn" aria-label="View" style={{ width: 32, height: 32 }}>
              <ChevronRight size={ICON_SM} strokeWidth={STROKE} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardSection({ t, lang }) {
  return (
    <section id="dashboard" className="ds-section">
      <SectionHead num="12 · Dashboard" title={t.dashboardTitle} lead={t.dashboardLead} meta="metrics · chart · donut · table" />

      <div className="ds-pair">
        <div className="ds-sample theme-light">
          <span className="ds-sample__label">{t.light}</span>
          <div className="ds-sample__inner ds-sample__inner--snug" style={{ padding: 18 }}>
            <DashboardMockup t={t} lang={lang} />
          </div>
        </div>
        <div className="ds-sample theme-dark">
          <span className="ds-sample__label">{t.dark}</span>
          <div className="ds-sample__inner ds-sample__inner--snug" style={{ padding: 18 }}>
            <DashboardMockup t={t} lang={lang} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   MOTION
   ============================================================ */

function MotionSection({ t }) {
  return (
    <section id="motion" className="ds-section">
      <SectionHead num="13 · Motion" title={t.motionTitle} lead={t.motionLead} meta="3 keyframes · functional only" />
      <div className="ds-motion-row">
        <div className="ds-motion-card">
          <div className="ds-motion-card__stage">
            <div className="ds-motion-card__dot" style={{ animation: "ds-pulse 1.6s ease-in-out infinite" }} />
          </div>
          <div className="ds-motion-card__name">pulse</div>
          <div className="ds-motion-card__desc">{t.motionPulse}</div>
        </div>
        <div className="ds-motion-card">
          <div className="ds-motion-card__stage">
            <div className="ds-motion-card__dot" style={{ animation: "ds-fadeIn 1.4s ease infinite alternate" }} />
          </div>
          <div className="ds-motion-card__name">fadeIn</div>
          <div className="ds-motion-card__desc">{t.motionFadeIn}</div>
        </div>
        <div className="ds-motion-card">
          <div className="ds-motion-card__stage">
            <div className="ds-motion-card__dot" style={{ animation: "ds-scale-up 1.4s ease infinite alternate" }} />
          </div>
          <div className="ds-motion-card__name">scale-up</div>
          <div className="ds-motion-card__desc">{t.motionScale}</div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, {
  LayoutSection, InvoiceSection, DashboardSection, MotionSection,
  InvoiceMockup, DashboardMockup,
});
