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
] as const satisfies readonly (keyof Character)[];

export function useLevelUp(character: Character): UseLevelUpResult {
  const { data: classes } = useContent('classes');
  const { updateCharacter, isUpdating, error } = useUpdateCharacter(character.id);

  const applyAndPersist = useCallback(
    async (draft: LevelUpDraft): Promise<void> => {
      const classDefinitions: Record<string, ClassEntity> = {};
      for (const c of character.classes) {
        const def = classes.find((cd) => cd.id === c.classId);
        if (def) classDefinitions[c.classId] = def;
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
