import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces
        ink: '#050309',
        bg: { DEFAULT: '#08060e', 2: '#100b18', 3: '#181122', elev: '#221830' },

        // Gold palette
        gold: {
          DEFAULT: '#d4b25e',
          bright: '#fde9b4',
          lite: '#f0d28a',
          text: '#e6c984',
          dim: '#8a7140', // borders only — never text
          deep: '#5e4d2c',
        },

        // Semantic
        crimson: '#e85a5a',
        teal: '#7ddcc0',
        amethyst: { DEFAULT: '#b5a8f5', deep: '#7c6cdb' },
        ruby: '#ff5c8a',
        sapphire: '#5e8eb4',
        emerald: '#5dab86',

        // Text (WCAG AA on dark glass)
        text: {
          DEFAULT: '#f4ecd6', // ~15:1
          secondary: '#d4cbb1', // ~11:1
          tertiary: '#a89e80', // ~6.5:1
          faint: '#8a8068', // ~4.5:1
        },
      },
      backgroundColor: {
        glass: 'rgba(16, 11, 24, 0.82)',
        'glass-2': 'rgba(24, 18, 36, 0.72)',
      },
      borderColor: {
        soft: 'rgba(220,184,108,0.2)',
        glow: 'rgba(220,184,108,0.45)',
        white: { 8: 'rgba(255,255,255,0.08)' },
      },
      boxShadow: {
        'gold-glow': '0 0 24px rgba(220,184,108,0.45)',
        'gold-glow-lg': '0 0 48px rgba(220,184,108,0.3)',
        card: '0 12px 36px rgba(0,0,0,0.35)',
        'card-lg': '0 30px 80px rgba(0,0,0,0.5)',
        tray: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(220,184,108,0.06), inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      fontFamily: {
        display: ['"Cinzel Decorative"', 'Georgia', 'serif'],
        title: ['Cinzel', 'Georgia', 'serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        ui: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
        'card-sm': '14px',
        pill: '999px',
      },
      transitionTimingFunction: {
        base: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        drift1: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(100px,80px) scale(1.2)' },
          '66%': { transform: 'translate(-50px,150px) scale(0.9)' },
        },
        drift2: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(-120px,-80px) scale(1.3)' },
          '66%': { transform: 'translate(60px,-100px) scale(0.95)' },
        },
        drift3: {
          '0%, 100%': { transform: 'translate(-50%,-50%) scale(1)' },
          '50%': { transform: 'translate(-30%,-60%) scale(1.4)' },
        },
        float: {
          '0%': { opacity: '0', transform: 'translateY(100vh) translateX(0)' },
          '10%': { opacity: '0.6' },
          '90%': { opacity: '0.6' },
          '100%': { opacity: '0', transform: 'translateY(-100px) translateX(50px)' },
        },
        pulse: {
          '0%': { transform: 'scale(1)', opacity: '0.5' },
          '100%': { transform: 'scale(3.5)', opacity: '0' },
        },
        raysRotate: {
          from: { transform: 'translateX(-50%) rotate(0)' },
          to: { transform: 'translateX(-50%) rotate(360deg)' },
        },
        slowDrift: {
          '0%': { transform: 'rotate(0)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        runeBreath: {
          '0%, 100%': { filter: 'drop-shadow(0 0 0 transparent)' },
          '50%': { filter: 'drop-shadow(0 0 14px rgba(220,184,108,0.45))' },
        },
      },
      animation: {
        drift1: 'drift1 25s ease-in-out infinite',
        drift2: 'drift2 30s ease-in-out infinite',
        drift3: 'drift3 35s ease-in-out infinite',
        float: 'float linear infinite',
        pulse: 'pulse 2.5s ease-out infinite',
        rays: 'raysRotate 60s linear infinite',
        slowDrift: 'slowDrift 180s linear infinite',
        runeBreath: 'runeBreath 3.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
