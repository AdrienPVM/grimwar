import type { Character } from '../../types/character';

export interface HitDieSpendResult {
  /** Patch à appliquer via `updateCharacter` (PV + pool de dés). */
  patch: Pick<Character, 'hp' | 'hitDice'>;
  /** PV réellement rendus (capés à `hp.max`). */
  healedBy: number;
}

/**
 * Applique la dépense d'UN dé de vie au repos court (SRD 5e).
 *
 * Règle : on regagne `jet du dé + mod CON` PV (déjà résolu en amont par le
 * moteur de dés → `healRoll`, capé à 0). Les PV ne dépassent pas `hp.max`, et le
 * pool de la classe concernée perd un dé. Fonction PURE (pas de Math.random, pas
 * d'I/O) — le tirage du dé est injecté, ce qui la rend testable au chiffre près.
 *
 * Retourne `null` si la classe n'a pas de pool ou si son pool est déjà vide
 * (aucun dé à dépenser) — l'appelant ne patche alors rien.
 */
export function applyHitDieSpend(
  character: Character,
  classId: string,
  healRoll: number,
): HitDieSpendResult | null {
  const idx = character.hitDice.findIndex((p) => p.classId === classId);
  if (idx === -1) return null;
  const pool = character.hitDice[idx];
  if (!pool || pool.current <= 0) return null;

  const newCurrentHp = Math.min(character.hp.max, character.hp.current + Math.max(0, healRoll));
  const healedBy = newCurrentHp - character.hp.current;
  const newHitDice = character.hitDice.map((p, i) =>
    i === idx ? { ...p, current: p.current - 1 } : p,
  );

  return {
    patch: { hp: { ...character.hp, current: newCurrentHp }, hitDice: newHitDice },
    healedBy,
  };
}
