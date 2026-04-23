import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        science: '#1E40AF',
        action: '#059669',
        alert: '#F59E0B',
        surface: '#F9FAFB',
        ink: '#111827',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
    },
  },
  plugins: [],
};

export default config;
