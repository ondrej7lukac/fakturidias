/* Fakturidias Design System — Section components (part A).
   Brand, Color, Type, Space.
   Exported to window for consumption by ds-app.jsx */

const { useState } = React;

/* ----- Shared building blocks ----- */

function Pair({ children, snug, t }) {
  return (
    <div className="ds-pair">
      <div className="ds-sample theme-light">
        <span className="ds-sample__label">{t.light}</span>
        <div className={`ds-sample__inner${snug ? " ds-sample__inner--snug" : ""}`}>{children}</div>
      </div>
      <div className="ds-sample theme-dark">
        <span className="ds-sample__label">{t.dark}</span>
        <div className={`ds-sample__inner${snug ? " ds-sample__inner--snug" : ""}`}>{children}</div>
      </div>
    </div>
  );
}

function SectionHead({ num, title, lead, meta }) {
  return (
    <div className="ds-section__head">
      <div>
        <div className="ds-section__num">{num}</div>
        <h2 className="ds-section__title">{title}</h2>
        <p className="ds-section__lead">{lead}</p>
      </div>
      {meta && <div className="ds-section__meta">{meta}</div>}
    </div>
  );
}

/* ============================================================
   BRAND — Logo / wordmark concepts
   ============================================================ */

function LogoMonogram({ size = 64, theme = "dark" }) {
  // Geometric F — angular, matching the existing app's mark
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lg-mono" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7cf7d4" />
          <stop offset="100%" stopColor="#8aa4ff" />
        </linearGradient>
        <radialGradient id="lg-mono-hi" cx="22%" cy="22%" r="30%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#lg-mono)" />
      <rect width="64" height="64" rx="16" fill="url(#lg-mono-hi)" />
      <path d="M21 16 H46 V23 H28 V30 H42 V37 H28 V48 H21 Z" fill="#061022" />
    </svg>
  );
}

function LogoWordmark({ theme }) {
  const txt = theme === "dark" ? "#e9ecff" : "#0f1430";
  const accent = theme === "dark" ? "#7cf7d4" : "#2dd7a6";
  return (
    <svg width="200" height="44" viewBox="0 0 200 44" xmlns="http://www.w3.org/2000/svg">
      <text
        x="0" y="32"
        fontFamily="Outfit, system-ui, sans-serif"
        fontSize="28"
        fontWeight="600"
        letterSpacing="-0.5"
        fill={txt}
      >
        fakturidias
      </text>
      <circle cx="71" cy="9" r="2.5" fill={accent} />
    </svg>
  );
}

function LogoVoice({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lg-voice" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7cf7d4" />
          <stop offset="100%" stopColor="#8aa4ff" />
        </linearGradient>
        <radialGradient id="lg-voice-hi" cx="22%" cy="22%" r="30%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#lg-voice)" />
      <rect width="64" height="64" rx="16" fill="url(#lg-voice-hi)" />
      <path d="M19 16 H38 V22 H25 V29 H35 V35 H25 V48 H19 Z" fill="#061022" />
      <rect x="42" y="24" width="8" height="16" rx="4" fill="#061022" />
      <path d="M40 32 V34 a6 6 0 0 0 12 0 V32" stroke="#061022" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <line x1="46" y1="42" x2="46" y2="48" stroke="#061022" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function BrandSection({ t }) {
  return (
    <section id="brand" className="ds-section">
      <SectionHead num="01 · Brand" title={t.brandTitle} lead={t.brandLead} meta="3 concepts" />

      <div className="ds-brand-grid">
        <div className="ds-brand-card">
          <div className="ds-brand-card__preview ds-brand-card__preview--dark">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <LogoMonogram size={64} />
              <div style={{ lineHeight: 1.1 }}>
                <div style={{ color: "#e9ecff", fontWeight: 600, fontSize: 18, letterSpacing: "-0.01em" }}>Fakturidias</div>
                <div style={{ color: "rgba(233,236,255,0.6)", fontSize: 12, marginTop: 4 }}>{t.invoicesAndProforma}</div>
              </div>
            </div>
          </div>
          <div className="ds-brand-card__body">
            <div className="ds-brand-card__title">A · {t.brandConcept1}</div>
            <div className="ds-brand-card__sub">{t.brandConcept1Sub}</div>
          </div>
        </div>

        <div className="ds-brand-card">
          <div className="ds-brand-card__preview">
            <LogoWordmark theme="light" />
          </div>
          <div className="ds-brand-card__body">
            <div className="ds-brand-card__title">B · {t.brandConcept2}</div>
            <div className="ds-brand-card__sub">{t.brandConcept2Sub}</div>
          </div>
        </div>

        <div className="ds-brand-card">
          <div className="ds-brand-card__preview ds-brand-card__preview--dark">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <LogoVoice size={64} />
              <div style={{ lineHeight: 1.1 }}>
                <div style={{ color: "#e9ecff", fontWeight: 600, fontSize: 18, letterSpacing: "-0.01em" }}>Fakturidias</div>
                <div style={{ color: "rgba(124,247,212,0.85)", fontSize: 11, marginTop: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>Voice AI</div>
              </div>
            </div>
          </div>
          <div className="ds-brand-card__body">
            <div className="ds-brand-card__title">C · {t.brandConcept3}</div>
            <div className="ds-brand-card__sub">{t.brandConcept3Sub}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   COLOR
   ============================================================ */

const COLOR_GROUPS = [
  {
    titleKey: "colorSurface",
    items: [
      { name: "bg",     css: "--bg",     js: "colors.*.bg",     light: "#f6f7ff",                 dark: "#0b1022" },
      { name: "bg2",    css: "--bg-2",   js: "colors.*.bg2",    light: "#eef1ff",                 dark: "#070a14" },
      { name: "card",   css: "--card",   js: "colors.*.card",   light: "rgba(10,18,60,.06)",      dark: "rgba(255,255,255,.06)" },
      { name: "card-2", css: "--card-2", js: "colors.*.card2",  light: "rgba(10,18,60,.08)",      dark: "rgba(255,255,255,.08)" },
    ],
  },
  {
    titleKey: "colorText",
    items: [
      { name: "text",    css: "--text",    js: "colors.*.text",   light: "#0f1430",                 dark: "#e9ecff" },
      { name: "muted",   css: "--muted",   js: "colors.*.muted",  light: "rgba(15,20,48,.72)",      dark: "rgba(233,236,255,.7)" },
      { name: "muted-2", css: "--muted-2", js: "colors.*.muted2", light: "rgba(15,20,48,.55)",      dark: "rgba(233,236,255,.55)" },
    ],
  },
  {
    titleKey: "colorBorder",
    items: [
      { name: "border", css: "--border", js: "colors.*.border", light: "rgba(10,18,60,.14)", dark: "rgba(255,255,255,.12)" },
    ],
  },
  {
    titleKey: "colorAccent",
    items: [
      { name: "accent",   css: "--accent",   js: "colors.*.accent",   light: "#2dd7a6", dark: "#7cf7d4" },
      { name: "accent-2", css: "--accent-2", js: "colors.*.accent2",  light: "#5869ff", dark: "#8aa4ff" },
      { name: "danger",   css: "--danger",   js: "colors.*.danger",   light: "#e33d63", dark: "#ff5b7a" },
      { name: "warn",     css: "--warn",     js: "colors.*.warn",     light: "#d3921f", dark: "#ffcc66" },
    ],
  },
];

function isDarkColor(c) {
  // crude — accept hex; anything with low light reads dark
  if (!c.startsWith("#")) {
    // rgba with low alpha — treat as light overlay
    const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
    if (!m) return false;
    const [r, g, b] = m.slice(1).map(Number);
    return (r * 0.299 + g * 0.587 + b * 0.114) < 128;
  }
  const hex = c.slice(1);
  const v = hex.length === 3 ? hex.split("").map(x => parseInt(x + x, 16)) :
                                [0,2,4].map(i => parseInt(hex.slice(i,i+2),16));
  return (v[0] * 0.299 + v[1] * 0.587 + v[2] * 0.114) < 128;
}

function ColorCard({ item }) {
  const lightTextDark = !isDarkColor(item.light);
  const darkTextDark  = !isDarkColor(item.dark);
  return (
    <div className="ds-color-card">
      <div className="ds-color-card__swatches">
        <div
          className="ds-color-card__swatch"
          style={{ background: item.light, color: lightTextDark ? "rgba(15,20,48,0.7)" : "rgba(255,255,255,0.85)" }}
        >
          <span className="ds-color-card__swatch-label">L</span>
        </div>
        <div
          className="ds-color-card__swatch"
          style={{ background: item.dark, color: darkTextDark ? "rgba(15,20,48,0.7)" : "rgba(255,255,255,0.85)" }}
        >
          <span className="ds-color-card__swatch-label">D</span>
        </div>
      </div>
      <div className="ds-color-card__meta">
        <div className="ds-color-card__name">{item.name}</div>
        <div className="ds-color-card__token">{item.css}</div>
        <div className="ds-color-card__values">
          <span style={{ color: "#1d9c78" }}>L · {item.light}</span>
          <span style={{ color: "#5869ff" }}>D · {item.dark}</span>
        </div>
      </div>
    </div>
  );
}

function ColorSection({ t }) {
  return (
    <section id="color" className="ds-section">
      <SectionHead num="02 · Color" title={t.colorTitle} lead={t.colorLead} meta="15 tokens × 2 themes" />
      {COLOR_GROUPS.map(group => (
        <div key={group.titleKey} style={{ marginBottom: 28 }}>
          <h3 style={{
            fontSize: 12, fontWeight: 600, textTransform: "uppercase",
            letterSpacing: "0.08em", color: "var(--page-muted)", margin: "0 0 12px"
          }}>
            {t[group.titleKey]}
          </h3>
          <div className="ds-color-grid">
            {group.items.map(it => <ColorCard key={it.name} item={it} />)}
          </div>
        </div>
      ))}
    </section>
  );
}

/* ============================================================
   TYPOGRAPHY
   ============================================================ */

const TYPE_SAMPLES = [
  { sample: "Aa", note: "Outfit",        cssVar: "--font-primary",   weight: "300–700", style: { fontFamily: "var(--font-primary)", fontSize: 64, fontWeight: 600 } },
  { sample: "Aa", note: "Geist",         cssVar: "--font-secondary", weight: "400–700", style: { fontFamily: "var(--font-secondary)", fontSize: 64, fontWeight: 600 } },
];

const TYPE_SCALE = [
  { key: "lg",   px: 18, role: "Card heading (h2)",       font: "Outfit · 600", style: { fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" } },
  { key: "md",   px: 16, role: "Body large",              font: "Outfit · 500", style: { fontSize: 16, fontWeight: 500 } },
  { key: "base", px: 14, role: "Body · inputs · buttons", font: "Outfit · 400", style: { fontSize: 14 } },
  { key: "sm",   px: 13, role: "Secondary text",          font: "Outfit · 400", style: { fontSize: 13 } },
  { key: "xs",   px: 12, role: "Labels · pills",          font: "Outfit · 600", style: { fontSize: 12, fontWeight: 600, letterSpacing: "0.025em", textTransform: "uppercase" } },
];

function TypeSection({ t }) {
  return (
    <section id="type" className="ds-section">
      <SectionHead num="03 · Type" title={t.typeTitle} lead={t.typeLead} meta="2 families · 5 sizes" />

      <div className="ds-pair" style={{ marginBottom: 24 }}>
        {TYPE_SAMPLES.map((s, i) => (
          <div key={i} className="ds-sample theme-light" style={{ background: "var(--page-card)" }}>
            <span className="ds-sample__label">{s.note}</span>
            <div className="ds-sample__inner" style={{ background: "var(--page-card)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "30px 28px", minHeight: 130 }}>
              <div style={{ ...s.style, color: "var(--page-text)", lineHeight: 1 }}>{s.sample}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--page-muted)", textAlign: "right", display: "grid", gap: 2 }}>
                <strong style={{ color: "var(--page-text)", fontWeight: 600 }}>{s.note}</strong>
                <span>{s.cssVar}</span>
                <span>{s.weight}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {TYPE_SCALE.map(s => (
        <div key={s.key} className="ds-type-card">
          <div className="ds-type-card__sample" style={s.style}>
            {s.key === "xs" ? t.typeSampleHead.slice(0, 28) : t.typeSampleHead}
          </div>
          <div className="ds-type-card__meta">
            <strong>{s.key}</strong>
            <span>{s.px}px</span>
            <span>{s.font}</span>
            <span style={{ opacity: 0.7 }}>{s.role}</span>
          </div>
        </div>
      ))}

      <Pair t={t} snug>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>{t.typeSampleHead}</div>
          <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>{t.typeSampleBody}</div>
          <div style={{ fontFamily: "var(--font-secondary)", fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--accent)" }}>
            {t.typeSampleNumber}
          </div>
        </div>
      </Pair>
    </section>
  );
}

/* ============================================================
   SPACE — Radius, header, shadow
   ============================================================ */

function SpaceSection({ t }) {
  const radii = [
    { name: "--radius-btn",      px: 12, role: "Buttons, inputs" },
    { name: "--radius-icon-btn", px: 14, role: "Icon buttons" },
    { name: "--radius",          px: 18, role: "Cards, panels" },
    { name: "--radius-2",        px: 22, role: "Invoice card, modals" },
  ];

  return (
    <section id="space" className="ds-section">
      <SectionHead num="04 · Space" title={t.spaceTitle} lead={t.spaceLead} meta="--radius · --shadow · --header-h" />

      <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--page-muted)", margin: "8px 0 12px" }}>
        {t.spaceRadius}
      </h3>
      <Pair t={t} snug>
        <div className="ds-specimen-row">
          {radii.map(r => (
            <div key={r.name} className="ds-radius-card" style={{ borderRadius: `${r.px}px` }}>
              {r.name}<br/>· {r.px}px
            </div>
          ))}
        </div>
      </Pair>

      <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--page-muted)", margin: "24px 0 12px" }}>
        {t.spaceShadow}
      </h3>
      <Pair t={t} snug>
        <div className="ds-specimen-row">
          <div className="ds-shadow-card" style={{ boxShadow: "var(--shadow)" }}>--shadow</div>
          <div className="ds-shadow-card" style={{ boxShadow: "var(--shadow-lg)" }}>--shadow-lg</div>
          <div className="ds-shadow-card" style={{ boxShadow: "var(--shadow-sm)" }}>--shadow-sm</div>
        </div>
      </Pair>

      <table className="ds-spec" style={{ marginTop: 24 }}>
        <thead>
          <tr><th>Token</th><th>{t.value}</th><th>{t.inUse}</th></tr>
        </thead>
        <tbody>
          <tr><td>--radius-btn</td><td className="ds-spec__val">12px</td><td>button, input, select, textarea</td></tr>
          <tr><td>--radius-icon-btn</td><td className="ds-spec__val">14px</td><td>.iconBtn (42×42)</td></tr>
          <tr><td>--radius</td><td className="ds-spec__val">18px</td><td>.card, .panel, sections</td></tr>
          <tr><td>--radius-2</td><td className="ds-spec__val">22px</td><td>invoice card, modal surface</td></tr>
          <tr><td>--header-h</td><td className="ds-spec__val">76px</td><td>fixed header offset</td></tr>
          <tr><td>--shadow</td><td className="ds-spec__val">L: 0 18px 50px rgba(12,18,60,.18) <br/>D: 0 18px 60px rgba(0,0,0,.42)</td><td>raised panels</td></tr>
          <tr><td>--shadow-lg</td><td className="ds-spec__val">L: 0 10px 26px rgba(12,18,60,.14) <br/>D: 0 10px 30px rgba(0,0,0,.35)</td><td>button hover</td></tr>
        </tbody>
      </table>
    </section>
  );
}

Object.assign(window, { Pair, SectionHead, BrandSection, ColorSection, TypeSection, SpaceSection,
  LogoMonogram, LogoWordmark, LogoVoice });
