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

export interface ShortRestResult {
  /** Patch à appliquer via `updateCharacter` (réserves court-repos réinitialisées). */
  patch: Pick<Character, 'classResources'>;
  /** Résumé pour le toast / journal. */
  summary: {
    /** Nombre de réserves de classe (court-repos) réinitialisées à leur max. */
    resourcesReset: number;
    /** Vrai si au moins une réserve « emplacements de pacte » a été rechargée. */
    pactSlotsRestored: boolean;
  };
}

/**
 * Applique un REPOS COURT (SRD 5.2.1), partie « réinitialisation des réserves ».
 *
 * Règle 5e : un repos court (~1 h) ne rend AUCUN PV automatiquement — le joueur
 * dépense des dés de vie (carte « Dés de vie », `applyHitDieSpend`). Il ne
 * réinitialise QUE les réserves de classe `restoresOn: 'short'` :
 *   - Second souffle, Fougue (Guerrier) ;
 *   - Conduit divin (Clerc / Paladin) ;
 *   - Forme sauvage (Druide) ;
 *   - Points de focalisation (Moine) ;
 *   - **Emplacements de pacte du Occultiste** (`pact-magic-slots`) — la seule
 *     magie qui recharge au repos court, encodée dans `classResources` et non
 *     dans `spellSlots` (cf. `apply-level-up.ts > inferRestoresOn`).
 *
 * Ne touche PAS : les PV (dés de vie à part), les emplacements de sort standard
 * (`spellSlots`), l'épuisement, ni les réserves `restoresOn: 'long'` (Rage,
 * Imposition des mains, Points de sorcellerie…). Un repos long fait tout cela
 * en plus via `applyLongRest`.
 *
 * Fonction PURE : on lit l'état courant de `character.classResources` et on
 * remet chaque entrée short-rest à `max`. Aucun contenu requis — le `restoresOn`
 * vit déjà sur chaque entrée. Retourne `summary.resourcesReset === 0` si rien
 * n'était à recharger (l'appelant peut alors ne pas patcher).
 */
export function applyShortRest(character: Character): ShortRestResult {
  const classResources: Character['classResources'] = { ...character.classResources };
  let resourcesReset = 0;
  let pactSlotsRestored = false;

  for (const [key, pool] of Object.entries(character.classResources)) {
    if (pool.restoresOn !== 'short') continue;
    // Déjà pleine → ne compte pas comme « rechargée » (évite un toast trompeur).
    if (pool.current >= pool.max) continue;
    classResources[key] = { ...pool, current: pool.max };
    resourcesReset += 1;
    if (key === 'pact-magic-slots') pactSlotsRestored = true;
  }

  return { patch: { classResources }, summary: { resourcesReset, pactSlotsRestored } };
}
