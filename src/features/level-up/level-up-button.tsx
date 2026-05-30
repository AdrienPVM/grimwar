import { useMemo, useState, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { useContent } from '@/shared/hooks/use-content';
import type { LevelUpDraft } from '@/shared/lib/level-up/level-up-types';
import type { Character } from '@/shared/types/character';

import { LevelUpModal } from './level-up-modal';

/**
 * JALON 2B.4c — Bouton « Monter de niveau » + ouverture de la modale.
 *
 * Visible uniquement quand le perso n'est pas déjà au cap SRD (L20) et que
 * la définition de classe primaire est chargée depuis `useContent('classes')`.
 * Le bouton reste inerte (mais visible) pendant le chargement initial du
 * bundle pour éviter un flash de disparition.
 *
 * Pour 2B.4c le `onConfirm` n'est PAS branché à Firestore — c'est le
 * périmètre de 2B.5. La modale se ferme simplement au confirm (no-op de
 * persistance), ce qui permet de livrer la coquille UI testable de bout
 * en bout sans tirer la couche persistance.
 */

interface LevelUpButtonProps {
  character: Character;
  /**
   * Optionnel — handler de submit. Branché à Firestore au plan 2B.5.
   * Pour 2B.4c, l'appelant peut passer un no-op et la modale se ferme.
   */
  onConfirm?: (draft: LevelUpDraft) => void;
}

export function LevelUpButton({ character, onConfirm }: LevelUpButtonProps): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const { data: classes } = useContent('classes');

  const classDefinition = useMemo(
    () => classes.find((c) => c.id === character.primaryClassId) ?? null,
    [classes, character.primaryClassId],
  );

  const primaryEntry = character.classes.find((c) => c.classId === character.primaryClassId);
  // Décision JALON 2B : la modale ne couvre que mono-class et n'augmente que
  // la classe primaire. Multi-class repoussé à JALON 2D. Du coup on cache le
  // bouton si la classe primaire est déjà à 20 — peu importe les autres
  // classes (qui n'existent que pour les fiches d'avant 2D, et le cas est
  // borderline ici).
  if (!primaryEntry || primaryEntry.level >= 20) return null;
  if (!classDefinition) return null;

  function handleConfirm(draft: LevelUpDraft): void {
    onConfirm?.(draft);
    setOpen(false);
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
        onClose={() => setOpen(false)}
        character={character}
        classDefinition={classDefinition}
        onConfirm={handleConfirm}
      />
    </>
  );
}
