/**
 * Cartographie ratio HP → classe CSS. Utilisé pour ajuster l'intensité aurora
 * et activer la pulsation crimson critique sur la fiche.
 *
 * Seuils alignés sur plan 06 step 11 :
 *   ratio > 0.75 → hp-healthy   (aurora normale)
 *   0.25 < ratio ≤ 0.75 → hp-wounded  (légère désaturation)
 *   0 < ratio ≤ 0.25 → hp-critical (border pulse crimson)
 *   ratio = 0 → hp-down (border crimson fixe, ambiance assombrie)
 */
export type HpState = 'hp-healthy' | 'hp-wounded' | 'hp-critical' | 'hp-down';

export function hpStateFor(current: number, max: number): HpState {
  if (max <= 0) return 'hp-down';
  if (current <= 0) return 'hp-down';
  const ratio = current / max;
  if (ratio > 0.75) return 'hp-healthy';
  if (ratio > 0.25) return 'hp-wounded';
  return 'hp-critical';
}
