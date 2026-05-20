// Spacing, sizing, and shadow tokens matching utilities.css

export const spacing = {
  radius: '18px',
  radius2: '22px',
  radiusBtn: '12px',
  radiusIconBtn: '14px',
  headerH: '76px',
} as const

export const shadows = {
  default: '0 18px 50px rgba(12, 18, 60, 0.18)',
  lg: '0 10px 26px rgba(12, 18, 60, 0.14)',
  dark: {
    default: '0 18px 60px rgba(0, 0, 0, 0.42)',
    lg: '0 10px 30px rgba(0, 0, 0, 0.35)',
  },
} as const

export const breakpoints = {
  mobile: '768px',
  tablet: '1024px',
  maxWidth: '1400px',
} as const
