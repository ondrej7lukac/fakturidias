// Shared color palette for the printed/downloaded invoice "paper" — used by
// both the on-screen preview (InvoicePreview.tsx) and the generated PDF
// (pdf.tsx), so what you see in the preview always matches exactly what gets
// downloaded or printed. Deliberately independent of the app's theme tokens
// (src/styles/utilities.css) — a printed invoice never has a dark mode.
export const PAPER = {
  ink: '#14161B',
  inkSoft: '#3E4352',
  muted: '#5A6072',
  accent: '#2549D9',
  dotted: '#A3ADC6',
  qrBorder: '#A3ADC6',
  noteBg: '#F6F7FB',
  noteBorder: '#C9D0E2',
  white: '#ffffff',
  danger: '#dc2626',
} as const;
