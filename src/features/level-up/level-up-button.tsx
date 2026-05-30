import { useMemo, useState, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { useContent } from '@/shared/hooks/use-content';
import type { LevelUpDraft } from '@/shared/lib/level-up/level-up-types';
import type { Character } from '@/shared/types/character';

import { LevelUpModal } from './level-up-modal';
import { useLevelUp } from './use-level-up';

/**
 * JALON 2B.4c → 2B.5 — Bouton « Monter de niveau » + persistance Firestore.
 *
 * Visible uniquement quand la classe primaire n'est pas déjà au cap SRD (L20)
 * et que la définition de classe est chargée depuis `useContent('classes')`.
 *
 * Comportement de submit (2B.5) :
 *  - sans `onConfirm` fourni : délègue à `useLevelUp(character)` qui applique
 *    la transformation pure puis patche Firestore (Partial<Character>).
 *  - avec `onConfirm` fourni : escape hatch pour tests + futurs callers qui
 *    veulent inspecter le draft avant de persister eux-mêmes.
 *
 * La modale reste ouverte tant que l'écriture n'a pas acquitté ; au succès
 * elle se referme ; sur rejet (offline / permission denied / draft invalide),
 * l'erreur est rendue dans le footer pour permettre correction ou retry.
 *
 * Mono-class only ; multi-class repoussé à JALON 2D (le reducer + le builder
 * de draft acceptent déjà un `classId` paramétrable sans changement).
 */

interface LevelUpButtonProps {
  character: Character;
  onConfirm?: (draft: LevelUpDraft) => void | Promise<void>;
}

export function LevelUpButton({ character, onConfirm }: LevelUpButtonProps): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { data: classes } = useContent('classes');
  const { applyAndPersist } = useLevelUp(character);

  const classDefinition = useMemo(
    () => classes.find((c) => c.id === character.primaryClassId) ?? null,
    [classes, character.primaryClassId],
  );

  const primaryEntry = character.classes.find((c) => c.classId === character.primaryClassId);
  if (!primaryEntry || primaryEntry.level >= 20) return null;
  if (!classDefinition) return null;

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
      setOpen(false);
    } catch (err) {
      const wrapped = err instanceof Error ? err.message : String(err);
      setSubmitError(wrapped);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose(): void {
    if (isSubmitting) return;
    setOpen(false);
    setSubmitError(null);
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={`Monter au niveau ${primaryEntry.level + 1}`}
      >
        Monter de niveau
      </Button>
      <LevelUpModal
        open={open}
        onClose={handleClose}
        character={character}
        classDefinition={classDefinition}
        onConfirm={handleConfirm}
        isSubmitting={isSubmitting}
        submitError={submitError}
      />
    </>
  );
}
