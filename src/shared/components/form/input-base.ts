/**
 * Classes Tailwind partagées par tous les inputs natifs du form-kit.
 *
 * Garantie a11y minimale (plan 05 §B) :
 * - Lisibilité texte/fond : `text-text` (#f4ecd6) sur `bg-bg-3/40` (#181122).
 *   → Empêche structurellement le bug "blanc/blanc" qui a tué le plan 05 v1.
 * - Touch target 44px : `min-h-[44px]`.
 * - Focus-visible : double anneau or au clavier, pas d'outline-none nu.
 *
 * Toute déviation visuelle doit passer via `className` prop côté composant,
 * jamais en redéfinissant la base ici.
 */
export const inputBaseClasses = [
  'w-full min-h-[44px] rounded-card-sm px-3 py-2',
  'bg-bg-3/40 text-text placeholder:text-text-faint',
  'border border-soft transition-colors duration-150 ease-base',
  'hover:border-glow',
  'focus:outline-none focus:border-glow',
  'focus-visible:ring-2 focus-visible:ring-gold-bright/40 focus-visible:ring-offset-0',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  'aria-[invalid=true]:border-crimson aria-[invalid=true]:focus-visible:ring-crimson/40',
].join(' ');
