import { useCallback } from 'react';

import { useUpdateCharacter } from '@/features/sheet/use-update-character';
import { useContent } from '@/shared/hooks/use-content';
import { applyLevelUp } from '@/shared/lib/level-up/apply-level-up';
import type { LevelUpDraft } from '@/shared/lib/level-up/level-up-types';
import type { Character } from '@/shared/types/character';
import type { ClassEntity } from '@/shared/types/content';

/**
 * JALON 2B.5 — Bridge entre la modale UI (2B.4c) et la couche Firestore.
 *
 * - applique le draft via `applyLevelUp` (pure, validée Zod) ;
 * - persiste les seuls champs mutés via `useUpdateCharacter` (Partial<Character>) ;
 *   le hook updateCharacter pose `updatedAt`/`updatedBy` côté serveur, on ne
 *   les inclut donc PAS dans le patch.
 *
 * `classDefinitions` est construit à partir de `useContent('classes')` —
 * `applyLevelUp` recompute les emplacements multi-classes (full/half/third)
 * en consommant la `spellcasting.progression` de CHAQUE classe du perso.
 *
 * Le patch est calculé en relevant l'ensemble des champs mutés par
 * `applyLevelUp` (totalLevel, classes, abilities, hp, hitDice, spellSlots,
 * classResources, knownSpells, preparedSpells, spellcastingAbility) plutôt que
 * d'envoyer le character entier — préserve `createdAt`/`schemaVersion` et
 * limite la bande passante.
 */

interface UseLevelUpResult {
  applyAndPersist: (draft: LevelUpDraft) => Promise<void>;
  isUpdating: boolean;
  error: Error | null;
}

/**
 * JALON 2D.4c — `extraProficiencies` ajoute le subset multiclass-armor/weapons
 * /tools quand `applyLevelUp` détecte un add-class path. Sans cette clé, les
 * proficiencies SRD 2024 du multiclass ne descendraient PAS jusqu'à Firestore.
 */
const PATCHED_KEYS = [
  'totalLevel',
  'classes',
  'abilities',
  'hp',
  'hitDice',
  'spellSlots',
  'classResources',
  'knownSpells',
  'preparedSpells',
  'spellcastingAbility',
  'extraProficiencies',
] as const satisfies readonly (keyof Character)[];

export function useLevelUp(character: Character): UseLevelUpResult {
  const { data: classes } = useContent('classes');
  const { updateCharacter, isUpdating, error } = useUpdateCharacter(character.id);

  const applyAndPersist = useCallback(
    async (draft: LevelUpDraft): Promise<void> => {
      const classDefinitions: Record<string, ClassEntity> = {};
      // Charge les classes déjà sur le perso (pour la recomputation slots
      // multi-class) + la classe ciblée par le draft (add-class L1 ou
      // level-up classique — `applyLevelUp` exige `classDefinitions[draft.classId]`).
      for (const c of character.classes) {
        const def = classes.find((cd) => cd.id === c.classId);
        if (def) classDefinitions[c.classId] = def;
      }
      if (!classDefinitions[draft.classId]) {
        const def = classes.find((cd) => cd.id === draft.classId);
        if (def) classDefinitions[draft.classId] = def;
      }
      const updated = applyLevelUp({ character, draft, classDefinitions });
      const patch: Partial<Character> = {};
      for (const key of PATCHED_KEYS) {
        (patch as Record<string, unknown>)[key] = updated[key];
      }
      await updateCharacter(patch);
    },
    [character, classes, updateCharacter],
  );

  return { applyAndPersist, isUpdating, error };
}
