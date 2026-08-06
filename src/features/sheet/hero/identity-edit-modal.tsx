import { useEffect, useId, useState, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { DetailModal } from '@/shared/components/detail-modal';
import { FormField, Select, TextInput } from '@/shared/components/form';
import { Icon } from '@/shared/components/icon';
import { t } from '@/shared/lib/i18n';
import { alignmentOptions } from '@/shared/lib/rules/alignment';
import type { Character } from '@/shared/types/character';

import { useFieldLocked } from '../permissions-context';
import { useUpdateCharacter } from '../use-update-character';

interface IdentityEditModalProps {
  character: Character;
  open: boolean;
  onClose: () => void;
}

/**
 * Édition de l'identité du personnage : nom et alignement.
 *
 * Ces deux champs étaient posés une fois au wizard puis rendus en texte mort —
 * or un personnage change de nom (« il se fait appeler Corvus ») et vire
 * d'alignement en cours de campagne. Le schéma les portait déjà, aucune UI ne
 * les écrivait (M18 de l'audit de malléabilité).
 *
 * Le nom reste RÉSERVÉ au propriétaire même quand un meneur édite la fiche
 * (`DM_LOCKED_FIELDS`, plan 26) : en omni-edit le champ est désactivé et le
 * patch ne l'embarque pas — `useUpdateCharacter` refuserait de toute façon, et
 * la rule Firestore est la barrière réelle. L'alignement, lui, est éditable des
 * deux côtés : c'est un fait de fiction que la table arbitre.
 */
export function IdentityEditModal({
  character,
  open,
  onClose,
}: IdentityEditModalProps): JSX.Element {
  const titleId = useId();
  const nameLocked = useFieldLocked('name');
  const { updateCharacter, isUpdating } = useUpdateCharacter(character);
  const [name, setName] = useState<string>(character.name);
  const [alignment, setAlignment] = useState<string>(character.alignment);

  // Re-synchronise le brouillon à chaque ouverture : la modale reste montée
  // entre deux ouvertures, et une valeur abandonnée ne doit pas revenir.
  useEffect(() => {
    if (!open) return;
    setName(character.name);
    setAlignment(character.alignment);
  }, [open, character.name, character.alignment]);

  const trimmed = name.trim();
  const nameError = trimmed.length === 0;

  async function save(): Promise<void> {
    if (nameError && !nameLocked) return;
    const patch: Partial<Character> = { alignment };
    if (!nameLocked && trimmed !== character.name) patch.name = trimmed;
    await updateCharacter(patch);
    onClose();
  }

  return (
    <DetailModal open={open} onClose={onClose} titleId={titleId} size="sm">
      <div className="flex flex-col gap-5 p-6">
        <h2
          id={titleId}
          // `pr-10` : le ✕ de la primitive est en absolu à droite — sans
          // dégagement, un titre long passerait dessous.
          className="pr-10 font-display text-[18px] font-black uppercase tracking-[0.12em] text-gold-bright"
        >
          {t('sheet.identity.title')}
        </h2>

        <FormField
          label={t('sheet.identity.name')}
          error={nameError && !nameLocked ? t('sheet.identity.nameRequired') : undefined}
        >
          {(fieldProps) => (
            <TextInput
              {...fieldProps}
              value={name}
              maxLength={60}
              disabled={nameLocked}
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </FormField>

        {nameLocked ? (
          <p className="-mt-3 inline-flex items-center gap-1.5 font-title text-meta uppercase tracking-[0.14em] text-text-tertiary">
            <Icon name="i-shield" className="h-3 w-3 text-gold-bright/70" />
            {t('sheet.dmEdit.fieldLocked')}
          </p>
        ) : null}

        <FormField label={t('sheet.identity.alignment')}>
          {(fieldProps) => (
            <Select
              {...fieldProps}
              value={alignment}
              onValueChange={setAlignment}
              options={alignmentOptions()}
            />
          )}
        </FormField>

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isUpdating}>
            {t('sheet.identity.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void save()}
            disabled={isUpdating || (nameError && !nameLocked)}
          >
            {t('sheet.identity.save')}
          </Button>
        </div>
      </div>
    </DetailModal>
  );
}
