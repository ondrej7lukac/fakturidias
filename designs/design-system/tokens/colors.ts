// Mirrors every color token in invoice-react/src/styles/utilities.css
// Use var(--token) in CSS. Use these values for JS-side needs (charts, PDF, dynamic styles).

export const colors = {
  light: {
    bg: '#f6f7ff',
    bg2: '#eef1ff',
    card: 'rgba(10, 18, 60, 0.06)',
    card2: 'rgba(10, 18, 60, 0.08)',
    text: '#0f1430',
    muted: 'rgba(15, 20, 48, 0.72)',
    muted2: 'rgba(15, 20, 48, 0.55)',
    border: 'rgba(10, 18, 60, 0.14)',
    accent: '#2dd7a6',
    accentLight: '#5869ff',
    accent2: '#5869ff',
    danger: '#e33d63',
    warn: '#d3921f',
    successBg: 'rgba(45, 215, 166, 0.1)',
    successBorder: '#2dd7a6',
    successText: '#0f1430',
  },
  dark: {
    bg: '#0b1022',
    bg2: '#070a14',
    card: 'rgba(255, 255, 255, 0.06)',
    card2: 'rgba(255, 255, 255, 0.08)',
    text: '#e9ecff',
    muted: 'rgba(233, 236, 255, 0.7)',
    muted2: 'rgba(233, 236, 255, 0.55)',
    border: 'rgba(255, 255, 255, 0.12)',
    accent: '#7cf7d4',
    accentLight: '#8aa4ff',
    accent2: '#8aa4ff',
    danger: '#ff5b7a',
    warn: '#ffcc66',
    successBg: 'rgba(124, 247, 212, 0.1)',
    successBorder: '#7cf7d4',
    successText: '#e9ecff',
  },
} as const

export type ColorMode = keyof typeof colors
export type ColorToken = keyof typeof colors.light
