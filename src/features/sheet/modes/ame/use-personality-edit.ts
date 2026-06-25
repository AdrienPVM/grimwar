import { useEffect, useState } from 'react';

import type { Character } from '@/shared/types/character';

import { useFieldLocked, useSheetReadOnly } from '../../permissions-context';
import { useUpdateCharacter } from '../../use-update-character';

/** Clés de `character.personality` éditables (trait / idéal / attache / défaut / histoire). */
export type PersonalityField = 'trait' | 'ideal' | 'bond' | 'flaw' | 'backstory';

export interface PersonalityEdit {
  /** Valeur persistée courante (snapshot serveur). */
  value: string;
  /** Le viewer peut-il éditer ce champ ? (propriétaire vivant, hors lecture MJ). */
  canEdit: boolean;
  /** Champ verrouillé pour le viewer (MJ en omni-edit) → cadenas. */
  locked: boolean;
  editing: boolean;
  draft: string;
  setDraft: (next: string) => void;
  /** Passe en édition (no-op si non éditable). */
  start: () => void;
  /** Abandonne, restaure le brouillon. */
  cancel: () => void;
  /** Persiste si modifié, sort de l'édition. */
  save: () => Promise<void>;
  isUpdating: boolean;
}

/**
 * Logique partagée d'édition d'un champ de `character.personality` (mode Âme),
 * réutilisée par la carte de personnalité (trait/idéal/attache/défaut) et la
 * carte Histoire. Centralise : permissions (réservé au propriétaire, plan 26),
 * synchro brouillon ↔ snapshot, et écriture Firestore.
 *
 * L'écriture envoie l'objet `personality` COMPLET (sinon `updateDoc` écraserait
 * les autres champs de personnalité). Hors campagne, le diff est journalisé en
 * no-op silencieux ; c'est toujours une édition propriétaire (jamais `dm-edit`,
 * le MJ n'ayant pas accès au champ).
 */
export function usePersonalityEdit(
  character: Character,
  field: PersonalityField,
): PersonalityEdit {
  const readOnly = useSheetReadOnly(character);
  const locked = useFieldLocked('personality');
  const { updateCharacter, isUpdating } = useUpdateCharacter(character);

  const value = character.personality[field];
  const [editing, setEditing] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>(value);

  // Re-synchronise le brouillon quand le snapshot serveur change la valeur
  // (autre device) — uniquement hors édition, pour ne pas écraser une saisie.
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const canEdit = !readOnly && !locked;

  function start(): void {
    if (canEdit) setEditing(true);
  }

  function cancel(): void {
    setDraft(value);
    setEditing(false);
  }

  async function save(): Promise<void> {
    const next = draft.trim();
    if (next !== value) {
      await updateCharacter({
        personality: { ...character.personality, [field]: next },
      });
    }
    setEditing(false);
  }

  return {
    value,
    canEdit,
    locked,
    editing,
    draft,
    setDraft,
    start,
    cancel,
    save,
    isUpdating,
  };
}
