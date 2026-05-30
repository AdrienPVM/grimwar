import { useMemo, useState, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { useContent } from '@/shared/hooks/use-content';
import type { LevelUpMode } from '@/shared/lib/level-up/level-up-flow';
import type { LevelUpDraft } from '@/shared/lib/level-up/level-up-types';
import { computeMulticlassEligibility } from '@/shared/lib/rules/multiclass-eligibility';
import type { Character } from '@/shared/types/character';

import { LevelUpModal } from './level-up-modal';
import { useLevelUp } from './use-level-up';

/**
 * JALON 2B.4c → 2B.5 → 2D.4c — Boutons d'entrée du flow de niveau.
 *
 * Deux entrées séparées (audit 2D § Gap 5) :
 *  - « Monter de niveau » — path classique (level-up de la classe primaire),
 *    visible tant que `primaryClass.level < 20`. Conserve l'aria-label
 *    historique « Monter au niveau N+1 ».
 *  - « Ajouter une classe » — path multiclass (JALON 2D.4c), visible quand :
 *      (a) `character.classes.length < 4` (borne schéma) ;
 *      (b) au moins une classe SRD passe le filtre
 *          `computeMulticlassEligibility(character, def.multiclassPrerequisite)`
 *          ET n'est pas déjà possédée.
 *    Sinon le bouton est caché — un bouton qui ouvrirait une modale vide
 *    (« 0 classes éligibles ») serait un piège UX.
 *
 * Comportement de submit (inchangé depuis 2B.5) :
 *  - sans `onConfirm` fourni : délègue à `useLevelUp(character)` qui applique
 *    la transformation pure puis patche Firestore (Partial<Character>).
 *  - avec `onConfirm` fourni : escape hatch pour tests + futurs callers qui
 *    veulent inspecter le draft avant de persister eux-mêmes.
 *
 * La modale reste ouverte tant que l'écriture n'a pas acquitté ; au succès
 * elle se referme ; sur rejet (offline / permission denied / draft invalide),
 * l'erreur est rendue dans le footer pour permettre correction ou retry.
 */

interface LevelUpButtonProps {
  character: Character;
  onConfirm?: (draft: LevelUpDraft) => void | Promise<void>;
}

export function LevelUpButton({ character, onConfirm }: LevelUpButtonProps): JSX.Element | null {
  const [openMode, setOpenMode] = useState<LevelUpMode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { data: classes } = useContent('classes');
  const { applyAndPersist } = useLevelUp(character);

  const classDefinition = useMemo(
    () => classes.find((c) => c.id === character.primaryClassId) ?? null,
    [classes, character.primaryClassId],
  );

  // 2D.4c — Add-class disponible si (a) slot libre ET (b) au moins une classe
  // SRD éligible non déjà possédée. Pré-calcule pour ne pas afficher un bouton
  // qui mènerait à une modale vide.
  const canAddClass = useMemo(() => {
    if (character.classes.length >= 4) return false;
    if (classes.length === 0) return false;
    const ownedIds = new Set(character.classes.map((c) => c.classId));
    return classes.some((def) => {
      if (ownedIds.has(def.id)) return false;
      const eligibility = computeMulticlassEligibility(
        character,
        def.multiclassPrerequisite ?? null,
      );
      return eligibility.eligible;
    });
  }, [character, classes]);

  const primaryEntry = character.classes.find((c) => c.classId === character.primaryClassId);
  const canLevelUp = !!primaryEntry && primaryEntry.level < 20 && classDefinition !== null;
  if (!canLevelUp && !canAddClass) return null;

  async function handleConfirm(draft: LevelUpDraft): Promise<void> {
    if (isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      if (onConfirm) {
        await onConfirm(draft);
      } else {
        await applyAndPersist(draft);
      }
      setOpenMode(null);
    } catch (err) {
      const wrapped = err instanceof Error ? err.message : String(err);
      setSubmitError(wrapped);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose(): void {
    if (isSubmitting) return;
    setOpenMode(null);
    setSubmitError(null);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {canLevelUp && primaryEntry ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setOpenMode('level-up')}
            aria-label={`Monter au niveau ${primaryEntry.level + 1}`}
          >
            Monter de niveau
          </Button>
        ) : null}
        {canAddClass ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpenMode('add-class')}
            aria-label="Ajouter une classe en multiclass"
          >
            Ajouter une classe
          </Button>
        ) : null}
      </div>
      {openMode !== null && classDefinition !== null ? (
        <LevelUpModal
          open
          onClose={handleClose}
          character={character}
          classDefinition={classDefinition}
          onConfirm={handleConfirm}
          isSubmitting={isSubmitting}
          submitError={submitError}
          initialMode={openMode}
        />
      ) : null}
    </>
  );
}
