import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // mauve — secondary accent: links, active states, carousel dots
        accent: 'var(--accent)',
        'accent-light': 'var(--accent-light)',
        // darker mauve, readable on the light "paper" cards
        'accent-deep': 'var(--accent-deep)',
        // red — primary brand / CTA colour
        brand: 'var(--brand)',
        'brand-light': 'var(--brand-light)',
        // dark chrome (app background, nav rails, menus, bottom bar)
        'bg-primary': 'var(--bg-primary)',
        'bg-card': 'var(--bg-card)',
        'bg-elevated': 'var(--bg-elevated)',
        'text-primary': 'var(--text-primary)',
        'text-muted': 'var(--text-muted)',
        border: 'var(--border)',
        error: 'var(--error)',
        // light "paper" content cards floating on the dark chrome
        paper: 'var(--paper)',
        'paper-ink': 'var(--paper-ink)',
        'paper-muted': 'var(--paper-muted)',
        'paper-border': 'var(--paper-border)',
      },
      fontFamily: {
        // The old app used a Helvetica-Neue / system sans everywhere,
        // including headings. `serif` is kept as an alias so existing
        // `font-serif` usages render in the same family without churn.
        serif: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        sans: [
          '"Helvetica Neue"', '-apple-system', 'BlinkMacSystemFont',
          'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif',
        ],
      },
      borderRadius: {
        card: '8px',
        btn: '24px',   // pill buttons, like the old app
        input: '6px',
        pill: '9999px',
      },
    },
  },
  plugins: [],
};

export default config;
