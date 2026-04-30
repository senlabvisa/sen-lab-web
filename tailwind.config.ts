import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette principale historique (Design_System.md) — conservée pour pages legacy
        science: {
          DEFAULT: '#1E40AF',
          50: '#EEF4FF',
          100: '#DBE7FE',
          200: '#BFD3FD',
          300: '#93B4FA',
          400: '#608BF5',
          500: '#3B66EE',
          600: '#2549DB',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#1B306E',
        },
        action: {
          DEFAULT: '#059669',
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          700: '#059669',
        },
        alert: {
          DEFAULT: '#F59E0B',
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          700: '#B45309',
        },
        danger: {
          DEFAULT: '#DC2626',
          50: '#FEF2F2',
          100: '#FEE2E2',
        },
        maths: '#7C3AED',
        physique: '#2563EB',
        svt: '#059669',
        surface: '#F4F6FB',
        ink: '#0F172A',

        // === Palette LAB (skillzone-like) — nouveau design system ===
        // Primary: violet/lavender
        lab: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
          DEFAULT: '#8B5CF6',
        },
        // Sidebar / cards sombres
        night: {
          50: '#F4F4F5',
          100: '#E4E4E7',
          200: '#D4D4D8',
          300: '#A1A1AA',
          400: '#71717A',
          500: '#52525B',
          600: '#3F3F46',
          700: '#27272A',
          800: '#18181B',
          900: '#0F0F11',
          DEFAULT: '#0F0F11',
        },
        // Accents bookings/calendar (skillzone palette douce)
        peach: '#FED7AA',
        peachInk: '#9A3412',
        lilac: '#DDD6FE',
        lilacInk: '#5B21B6',
        sky: '#BFDBFE',
        skyInk: '#1E40AF',
        mint: '#BBF7D0',
        mintInk: '#166534',
        rose: '#FECACA',
        roseInk: '#9F1239',

        // Stars / rating
        gold: '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)',
        card: '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 8px 24px -8px rgba(15, 23, 42, 0.08)',
        glow: '0 8px 32px -8px rgba(30, 64, 175, 0.35)',
        // Lab tokens
        'lab-card': '0 1px 2px rgba(15, 15, 17, 0.04), 0 4px 16px -4px rgba(124, 58, 237, 0.08)',
        'lab-glow': '0 10px 40px -10px rgba(139, 92, 246, 0.45)',
        'lab-soft': '0 1px 2px rgba(15, 15, 17, 0.05)',
      },
      backgroundImage: {
        'hero-blue': 'linear-gradient(135deg, #EEF4FF 0%, #DBE7FE 60%, #BFD3FD 100%)',
        'hero-emerald': 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 60%, #A7F3D0 100%)',
        'hero-violet': 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 60%, #DDD6FE 100%)',
        'hero-amber': 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 60%, #FDE68A 100%)',
        'science-gradient': 'linear-gradient(135deg, #1E40AF 0%, #3B66EE 100%)',
        // Lab gradients (skillzone-like)
        'lab-gradient': 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
        'lab-mesh': 'radial-gradient(at 20% 20%, #DDD6FE 0%, transparent 40%), radial-gradient(at 80% 0%, #C4B5FD 0%, transparent 40%), radial-gradient(at 80% 80%, #EDE9FE 0%, transparent 50%)',
        'lab-page': 'linear-gradient(180deg, #FAF5FF 0%, #F5F3FF 100%)',
      },
      animation: {
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'pulse-ring': 'pulseRing 2s ease-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'flip': 'flip 0.6s ease-in-out',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.15)', opacity: '0.85' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.6)', opacity: '0.7' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          from: { transform: 'translateX(12px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        flip: {
          '0%': { transform: 'rotateX(0deg)' },
          '50%': { transform: 'rotateX(-90deg)' },
          '100%': { transform: 'rotateX(0deg)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
