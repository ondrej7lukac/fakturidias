/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        input: 'var(--border)',
        ring: 'var(--accent-light)',
        background: 'var(--bg)',
        foreground: 'var(--text)',
        primary: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--selection-text)',
        },
        secondary: {
          DEFAULT: 'var(--card2)',
          foreground: 'var(--text)',
        },
        muted: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--muted)',
        },
        accent: {
          DEFAULT: 'var(--accent-light)',
          foreground: 'var(--selection-text)',
        },
        destructive: {
          DEFAULT: 'var(--danger)',
          foreground: 'var(--selection-text)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};
