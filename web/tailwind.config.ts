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
        accent: 'var(--accent)',
        'accent-light': 'var(--accent-light)',
        'bg-primary': 'var(--bg-primary)',
        'bg-card': 'var(--bg-card)',
        'bg-elevated': 'var(--bg-elevated)',
        'text-primary': 'var(--text-primary)',
        'text-muted': 'var(--text-muted)',
        border: 'var(--border)',
        error: 'var(--error)',
      },
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'Segoe UI',
          'Roboto', 'Helvetica', 'Arial', 'sans-serif',
        ],
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
        input: '6px',
      },
    },
  },
  plugins: [],
};

export default config;
