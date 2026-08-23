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

/** Paliers de repli quand la créature n'a pas de `maxHp` exploitable. */
const DEFAULT_QUICK_AMOUNTS = [1, 5, 10] as const;

/** Fractions de PV max visées par les trois boutons rapides. */
const QUICK_FRACTIONS = [0.05, 0.15, 0.3] as const;

/**
 * Arrondit à un montant « annonçable à voix haute » : on ne propose pas
 * « −37 » à une table, on propose « −40 ».
 */
function roundToNice(value: number): number {
  if (value <= 1) return 1;
  if (value < 5) return Math.round(value);
  if (value < 20) return Math.round(value / 5) * 5;
  if (value < 100) return Math.round(value / 10) * 10;
  return Math.round(value / 25) * 25;
}

/**
 * Paliers de dégâts/soin rapides dérivés des PV max de la créature (M6/M37 de
 * l'audit de malléabilité).
 *
 * Le mur d'origine : `[1, 5, 10]` pour tout le monde. Un rat à 7 PV n'a que
 * faire d'un bouton « −10 », et un dragon à 250 PV obligeait le MJ à cliquer
 * vingt-cinq fois. Les paliers suivent donc la créature (≈ 5 % / 15 % / 30 %).
 *
 * Toujours trois montants distincts et croissants : quand la dérivation en
 * produit moins (petites créatures, où 5 % et 15 % retombent sur 1), on complète
 * avec l'échelle par défaut.
 */
export function quickHpAmounts(maxHp: number): number[] {
  if (!Number.isFinite(maxHp) || maxHp <= 0) return [...DEFAULT_QUICK_AMOUNTS];
  const derived = QUICK_FRACTIONS.map((f) => roundToNice(maxHp * f));
  const unique = [...new Set(derived)].sort((a, b) => a - b);
  for (const fallback of DEFAULT_QUICK_AMOUNTS) {
    if (unique.length >= DEFAULT_QUICK_AMOUNTS.length) break;
    if (!unique.includes(fallback)) unique.push(fallback);
  }
  return unique.sort((a, b) => a - b).slice(0, DEFAULT_QUICK_AMOUNTS.length);
}
