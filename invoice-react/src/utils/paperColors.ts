// Shared color palette for the printed/downloaded invoice "paper" — used by
// both the on-screen preview (InvoicePreview.tsx) and the generated PDF
// (pdf.tsx), so what you see in the preview always matches exactly what gets
// downloaded or printed. Deliberately independent of the app's theme tokens
// (src/styles/utilities.css) — a printed invoice never has a dark mode.
export const PAPER = {
  indigo: '#6366f1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  gray900: '#111827',
  gray700: '#374151',
  gray500: '#6b7280',
  gray200: '#e5e7eb',
  greenBg: '#f0fdf4',
  greenBorder: '#86efac',
  green700: '#15803d',
  green800: '#166534',
  slate50: '#f8fafc',
  slate200: '#e2e8f0',
  white: '#ffffff',
  danger: '#dc2626',
} as const;
