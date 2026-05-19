// Typography tokens matching the font stack and scale used in the app

export const typography = {
  fontPrimary: '"Outfit", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
  fontSecondary: '"Geist Variable", sans-serif',

  size: {
    xs: '0.75rem',    // 12px — labels, table headers, pills
    sm: '0.8125rem',  // 13px — secondary text
    base: '0.875rem', // 14px — body, inputs, buttons
    md: '1rem',       // 16px — larger body
    lg: '1.125rem',   // 18px — card headings (h2)
  },

  weight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    body: 1.6,
  },

  letterSpacing: {
    label: '0.025em',
    uppercase: '0.05em',
  },
} as const
