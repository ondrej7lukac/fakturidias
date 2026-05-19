/* Fakturidias — Dashboard page. */

const { useState: useStateD } = React;

const DASH_DATA = [22, 28, 31, 26, 34, 42, 38, 45, 51, 48, 56, 62];
const MONTHS_LIST = {
  cs: ["červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec", "leden", "únor", "březen", "duben", "květen"],
  en: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"],
};

const INVOICES = [
  { num: "2026/0142", client: "Acme Design Studio",      issued: "19. 05. 2026", due: "02. 06. 2026", amount: "58 080,00", status: "sent",    statusKey: "statusSent" },
  { num: "2026/0141", client: "Novák Consulting s.r.o.", issued: "15. 05. 2026", due: "29. 05. 2026", amount: "12 480,00", status: "paid",    statusKey: "statusPaid" },
  { num: "2026/0140", client: "Tektonic a.s.",           issued: "12. 05. 2026", due: "26. 05. 2026", amount: "94 200,00", status: "paid",    statusKey: "statusPaid" },
  { num: "2026/0139", client: "Pražský Sklep",           issued: "08. 05. 2026", due: "22. 05. 2026", amount: "8 900,00",  status: "overdue", statusKey: "statusOverdue" },
  { num: "2026/0138", client: "Studio Květinka",         issued: "05. 05. 2026", due: "19. 05. 2026", amount: "3 200,00",  status: "draft",   statusKey: "statusDraft" },
  { num: "2026/0137", client: "Modré Brýle s.r.o.",      issued: "02. 05. 2026", due: "16. 05. 2026", amount: "23 100,00", status: "paid",    statusKey: "statusPaid" },
  { num: "2026/0136", client: "Café Letná",              issued: "28. 04. 2026", due: "12. 05. 2026", amount: "6 750,00",  status: "sent",    statusKey: "statusSent" },
];

function DashRevenueChart({ lang }) {
  const W = 720, H = 220, PAD_L = 44, PAD_R = 16, PAD_T = 16, PAD_B = 40;
  const max = Math.max(...DASH_DATA) * 1.1;
  const months = MONTHS_LIST[lang];
  const xStep = (W - PAD_L - PAD_R) / (DASH_DATA.length - 1);
  const pts = DASH_DATA.map((v, i) => [PAD_L + i * xStep, PAD_T + (H - PAD_T - PAD_B) * (1 - v / max)]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = `${path} L${pts[pts.length-1][0]},${H - PAD_B} L${pts[0][0]},${H - PAD_B} Z`;
  const yTicks = [0, max/2, max];
  return (
    <svg className="ap-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="d-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="d-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      {yTicks.map((tk, i) => {
        const y = PAD_T + (H - PAD_T - PAD_B) * (1 - tk / max);
        return (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="var(--border)" strokeDasharray="3 4" />
            <text x={PAD_L - 10} y={y + 3.5} fontSize="10" textAnchor="end" fill="var(--muted-2)" fontFamily="var(--font-mono)">
              {Math.round(tk)}k
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#d-area)" />
      <path d={path} fill="none" stroke="url(#d-line)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--bg)" stroke="var(--accent)" strokeWidth="1.8" />
      ))}
      {months.map((m, i) => (
        <text key={i} x={PAD_L + i * xStep} y={H - 12} fontSize="10" textAnchor="middle" fill="var(--muted-2)">
          {m.length > 4 ? m.slice(0,3) : m}
        </text>
      ))}
    </svg>
  );
}

function DashDonut({ t }) {
  const data = [
    { labelKey: "statusPaid",    value: 42, color: "var(--accent)" },
    { labelKey: "statusSent",    value: 18, color: "var(--accent-2)" },
    { labelKey: "statusDraft",   value: 12, color: "var(--muted-2)" },
    { labelKey: "statusOverdue", value: 6,  color: "var(--danger)" },
  ];
  const total = data.reduce((a, b) => a + b.value, 0);
  const R = 70, CX = 90, CY = 90;
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
      <svg className="ap-donut" viewBox="0 0 180 180">
        {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} opacity={0.92} />)}
        <circle cx={CX} cy={CY} r={42} fill="var(--bg)" />
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize="11" fill="var(--muted)" letterSpacing="0.04em">TOTAL</text>
        <text x={CX} y={CY + 16} textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--text)" fontFamily="var(--font-secondary)">{total}</text>
      </svg>
      <div className="ap-legend">
        {data.map((d, i) => (
          <div key={i} className="ap-legend__row">
            <span className="left">
              <span className="ap-legend__dot" style={{ background: d.color }} />
              {t[d.labelKey]}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text)" }}>{d.value}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function DashboardApp() {
  const shell = useAppShell("dark");
  const t = { ...window.LANDING_I18N[shell.lang], ...window.APP_I18N[shell.lang] };
  const [filter, setFilter] = useStateD({ q: "", status: "", category: "" });
  const filtered = INVOICES.filter(inv => {
    if (filter.q && !`${inv.num} ${inv.client}`.toLowerCase().includes(filter.q.toLowerCase())) return false;
    if (filter.status && inv.status !== filter.status) return false;
    return true;
  });
  const totalFiltered = filtered.reduce((sum, inv) => sum + parseFloat(inv.amount.replace(/\s/g, "").replace(",", ".")), 0)
    .toLocaleString(shell.lang === "cs" ? "cs-CZ" : "en-US", { minimumFractionDigits: 2 });

  return (
    <>
      <AppHeader activePage="dashboard" {...shell} t={t} />

      <div className="ap-page">
        <div className="ap-page__head">
          <div>
            <h1 className="ap-page__title">{t.pageDashboard}</h1>
            <p className="ap-page__sub">{t.pageDashboardSub}</p>
          </div>
          <a className="ap-btn ap-btn--primary ap-btn--lg" href="./Create Invoice.html">
            <Plus size={ICON_SM} strokeWidth={STROKE} /> {shell.lang === "cs" ? "Nová faktura" : "New invoice"}
          </a>
        </div>

        {/* Metrics */}
        <div className="ap-metrics">
          <div className="ap-metric">
            <div className="ap-metric__label">{t.metricRevenue}</div>
            <div className="ap-metric__value">62 480 <span style={{ fontSize: 12, color: "var(--muted)" }}>CZK</span></div>
            <div className="ap-metric__delta ap-metric__delta--up"><ArrowUp size={11} strokeWidth={STROKE} /> +14,2 %</div>
          </div>
          <div className="ap-metric">
            <div className="ap-metric__label">{t.metricInvoices}</div>
            <div className="ap-metric__value">78</div>
            <div className="ap-metric__delta ap-metric__delta--up"><ArrowUp size={11} strokeWidth={STROKE} /> +6</div>
          </div>
          <div className="ap-metric ap-metric--danger">
            <div className="ap-metric__label">{t.metricOverdue}</div>
            <div className="ap-metric__value">6</div>
            <div className="ap-metric__delta ap-metric__delta--down"><ArrowDown size={11} strokeWidth={STROKE} /> −2</div>
          </div>
          <div className="ap-metric">
            <div className="ap-metric__label">{t.metricAvg}</div>
            <div className="ap-metric__value">12 840</div>
            <div className="ap-metric__delta" style={{ color: "var(--muted)" }}>
              <ArrowLeftRight size={11} strokeWidth={STROKE} /> 0 %
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="ap-filters">
          <div className="ap-input-wrap">
            <Search size={ICON_SM} strokeWidth={STROKE} />
            <input
              className="ap-input"
              placeholder={t.dashSearch}
              value={filter.q}
              onChange={e => setFilter({ ...filter, q: e.target.value })}
            />
          </div>
          <select className="ap-select" value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
            <option value="">{t.dashAllStatus}</option>
            <option value="draft">{t.statusDraft}</option>
            <option value="sent">{t.statusSent}</option>
            <option value="paid">{t.statusPaid}</option>
            <option value="overdue">{t.statusOverdue}</option>
          </select>
          <select className="ap-select" value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })}>
            <option value="">{t.dashAllCat}</option>
            <option value="services">{shell.lang === "cs" ? "Služby" : "Services"}</option>
            <option value="goods">{shell.lang === "cs" ? "Zboží" : "Goods"}</option>
          </select>
          <div className="ap-input-wrap">
            <Calendar size={ICON_SM} strokeWidth={STROKE} />
            <input className="ap-input" placeholder={`${t.dashFrom} · dd.mm.yyyy`} />
          </div>
          <div className="ap-input-wrap">
            <Calendar size={ICON_SM} strokeWidth={STROKE} />
            <input className="ap-input" placeholder={`${t.dashTo} · dd.mm.yyyy`} />
          </div>
        </div>

        <div style={{ marginBottom: 14, fontSize: 13, color: "var(--muted)" }}>
          {filtered.length} {t.dashFiltered} <strong style={{ color: "var(--text)", fontFamily: "var(--font-secondary)" }}>{totalFiltered} CZK</strong>
        </div>

        {/* Chart split */}
        <div className="ap-split">
          <div className="ap-card">
            <h3 className="ap-card__title">
              <BarChart2 size={ICON_MD} strokeWidth={STROKE} /> {t.dashRevenue}
            </h3>
            <DashRevenueChart lang={shell.lang} />
          </div>
          <div className="ap-card">
            <h3 className="ap-card__title">
              <FileText size={ICON_MD} strokeWidth={STROKE} /> {t.dashStatusOverview}
            </h3>
            <DashDonut t={t} />
          </div>
        </div>

        {/* List */}
        <div className="ap-card">
          <h3 className="ap-card__title">
            {t.dashRecent}
            <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>· {filtered.length}</span>
          </h3>
          {filtered.length === 0 ? (
            <div className="ap-empty">
              <div className="ap-empty__icon">
                <FileText size={26} strokeWidth={1.6} />
              </div>
              <p style={{ marginBottom: 16 }}>{t.dashEmpty}</p>
              <a className="ap-btn ap-btn--primary" href="./Create Invoice.html">
                <Plus size={ICON_SM} strokeWidth={STROKE} /> {t.dashCreateFirst}
              </a>
            </div>
          ) : (
            <div className="ap-list">
              <div className="ap-list__row">
                <span>{t.colNumber}</span>
                <span>{t.colClient}</span>
                <span>{t.colIssueDate}</span>
                <span>{t.colDueDate}</span>
                <span style={{ textAlign: "right" }}>{t.colAmount}</span>
                <span>{t.colStatus}</span>
                <span />
              </div>
              {filtered.map(inv => (
                <div key={inv.num} className="ap-list__row">
                  <span className="ap-list__num">{inv.num}</span>
                  <span style={{ fontWeight: 500 }}>{inv.client}</span>
                  <span style={{ color: "var(--muted)" }}>{inv.issued}</span>
                  <span style={{ color: "var(--muted)" }}>{inv.due}</span>
                  <span className="ap-list__amount" style={{ textAlign: "right" }}>{inv.amount} CZK</span>
                  <span><span className={`ap-pill ${inv.status}`}>{t[inv.statusKey]}</span></span>
                  <button className="ap-btn ap-btn--icon ap-btn--ghost" aria-label="Open" style={{ width: 32, height: 32 }}>
                    <ChevronRight size={ICON_SM} strokeWidth={STROKE} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<DashboardApp />);
