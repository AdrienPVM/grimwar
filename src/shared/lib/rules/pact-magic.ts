import type { Character } from '@/shared/types/character';
import type { ClassEntity } from '@/shared/types/content';

/**
 * Magie de pacte de l'Occultiste (SRD 5.2.1).
 *
 * Distincte de la table d'incantateur unifiée (`multiclass.ts`) : la magie de
 * pacte n'expose qu'UN niveau d'emplacement à la fois (tous les emplacements
 * sont de ce niveau), qui monte avec le niveau d'Occultiste, et ses
 * emplacements se rechargent au **repos court** (pas long). Ce module dérive
 * l'état des emplacements de pacte du NIVEAU d'Occultiste — il ne dépend pas
 * d'un champ stocké, donc il reste juste même sur une fiche dont les
 * `classResources` ne sont pas initialisés (à la création : `{}`).
 *
 * La table count est la copie runtime de la progression de pacte SRD (même
 * rôle que `spellSlotsForCasterLevel` pour la table unifiée). Le `current`
 * (emplacements dépensés) est le seul état lu sur la fiche.
 */

/**
 * Nombre d'emplacements de pacte par niveau d'Occultiste (index = niveau − 1).
 * SRD 5.2.1, bloc « Magie de pacte » : 1 à L1, 2 à L2-10, 3 à L11-16, 4 à L17-20.
 */
const PACT_SLOT_COUNT: readonly number[] = [
  1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4,
];

/** Clé de ressource des emplacements de pacte (partagée level-up / repos court). */
export const PACT_SLOTS_RESOURCE = 'pact-magic-slots';

export interface PactMagic {
  /** Niveau de chaque emplacement de pacte (1-5). */
  slotLevel: number;
  /** Nombre total d'emplacements de pacte. */
  count: number;
}

/**
 * Magie de pacte pour un niveau d'Occultiste donné, ou `null` si `level ≤ 0`.
 * Niveau d'emplacement = `min(5, plafond(level / 2))` (SRD : L1-2 → 1, L3-4 → 2,
 * L5-6 → 3, L7-8 → 4, L9+ → 5).
 */
export function pactMagicForLevel(warlockLevel: number): PactMagic | null {
  if (warlockLevel <= 0) return null;
  const idx = Math.min(warlockLevel, PACT_SLOT_COUNT.length) - 1;
  return {
    slotLevel: Math.min(5, Math.ceil(warlockLevel / 2)),
    count: PACT_SLOT_COUNT[idx]!,
  };
}

/**
 * Somme des niveaux des classes à progression `pact` (Occultiste) du perso.
 * 0 s'il n'en a aucune. En multiclasse, la magie de pacte ne dépend QUE du
 * niveau d'Occultiste (indépendante de la table unifiée — SRD).
 */
export function pactClassLevel(
  character: Character,
  classCatalog: readonly ClassEntity[],
): number {
  const byId = new Map(classCatalog.map((c) => [c.id, c]));
  let level = 0;
  for (const entry of character.classes) {
    const def = byId.get(entry.classId);
    if (def?.spellcasting?.progression === 'pact') level += entry.level;
  }
  return level;
}

/**
 * Magie de pacte du personnage (count + slotLevel) ou `null` s'il n'a pas de
 * classe à pacte. Dérivée du niveau — voir note de module.
 */
export function characterPactMagic(
  character: Character,
  classCatalog: readonly ClassEntity[],
): PactMagic | null {
  return pactMagicForLevel(pactClassLevel(character, classCatalog));
}

export interface PactSlotState {
  /** Emplacements restants (clampé à [0, max]). */
  current: number;
  /** Emplacements totaux (dérivés du niveau d'Occultiste). */
  max: number;
  /** Niveau de chaque emplacement de pacte (1-5). */
  slotLevel: number;
}

/**
 * État affichable des emplacements de pacte, ou `null` si pas de classe à pacte.
 *
 * `max` et `slotLevel` sont DÉRIVÉS du niveau (autorité), `current` est lu de
 * `classResources['pact-magic-slots']` quand présent (sinon plein). Le `current`
 * stocké est clampé à `[0, max]` pour absorber une fiche dont le `max` stocké
 * aurait divergé (level-up partiel, ancienne donnée).
 */
export function readPactSlotState(
  character: Character,
  classCatalog: readonly ClassEntity[],
): PactSlotState | null {
  const pact = characterPactMagic(character, classCatalog);
  if (!pact) return null;
  const stored = character.classResources[PACT_SLOTS_RESOURCE];
  const current = stored
    ? Math.min(Math.max(stored.current, 0), pact.count)
    : pact.count;
  return { current, max: pact.count, slotLevel: pact.slotLevel };
}
