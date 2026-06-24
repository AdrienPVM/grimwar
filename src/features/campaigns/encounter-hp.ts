/**
 * Helpers d'affichage des PV au combat (JALON 24.x). Partagés par la carte de
 * participant (`encounter-screen`), la modale de contrôle MJ (24.4 step 7) et la
 * party view joueur (24.4 step 8) — d'où l'extraction dans un module dédié.
 */

// Seuils de couleur de la barre de PV (ratio courant/max).
export const HP_BAR_HEALTHY = 0.5;
export const HP_BAR_WOUNDED = 0.25;

/** Classe de couleur de la barre selon le ratio PV : teal > 50 % > gold > 25 % > crimson. */
export function hpBarColor(ratio: number): string {
  if (ratio > HP_BAR_HEALTHY) return 'bg-teal';
  if (ratio > HP_BAR_WOUNDED) return 'bg-gold';
  return 'bg-crimson';
}

/** Ratio PV borné 0..1 (0 si `maxHp` ≤ 0, pour éviter une division par zéro). */
export function hpRatio(currentHp: number, maxHp: number): number {
  if (maxHp <= 0) return 0;
  return Math.max(0, Math.min(1, currentHp / maxHp));
}
