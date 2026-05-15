/**
 * Design tokens miroir de `tailwind.config.ts` — voir `docs/DESIGN-SYSTEM.md`.
 * Utile hors classes Tailwind : SVG (`fill={tokens.color.gold}`), styles dynamiques,
 * canvas, calculs de couleur. Si tu modifies ici, modifie aussi `tailwind.config.ts`
 * et `src/styles/globals.css` (CSS vars).
 */
export const tokens = {
  color: {
    // Surfaces
    ink: '#050309',
    bg: '#08060e',
    bg2: '#100b18',
    bg3: '#181122',
    bgElev: '#221830',

    // Glass
    glass: 'rgba(16, 11, 24, 0.82)',
    glass2: 'rgba(24, 18, 36, 0.72)',

    // Gold (accent dominant)
    goldBright: '#fde9b4',
    gold: '#d4b25e',
    goldLite: '#f0d28a',
    goldText: '#e6c984',
    goldDim: '#8a7140',
    goldDeep: '#5e4d2c',
    goldGlow: 'rgba(220,184,108,0.45)',

    // Semantic
    crimson: '#e85a5a',
    teal: '#7ddcc0',
    amethyst: '#b5a8f5',
    amethystDeep: '#7c6cdb',
    ruby: '#ff5c8a',
    sapphire: '#5e8eb4',
    emerald: '#5dab86',

    // Text
    textDefault: '#f4ecd6',
    textSecondary: '#d4cbb1',
    textTertiary: '#a89e80',
    textFaint: '#8a8068',

    // Borders
    borderSoft: 'rgba(220,184,108,0.2)',
    borderGlow: 'rgba(220,184,108,0.45)',
    borderWhite: 'rgba(255,255,255,0.08)',
  },
  font: {
    display: '"Cinzel Decorative", Georgia, serif',
    title: 'Cinzel, Georgia, serif',
    serif: '"Cormorant Garamond", Georgia, serif',
    ui: 'Inter, system-ui, sans-serif',
  },
  radius: {
    card: '20px',
    cardSm: '14px',
    pill: '999px',
  },
  ease: {
    base: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  duration: {
    instant: 150,
    normal: 250,
    card: 350,
    panel: 500,
    toast: 700,
  },
} as const;

export type TokenColor = keyof typeof tokens.color;
export type TokenFont = keyof typeof tokens.font;
