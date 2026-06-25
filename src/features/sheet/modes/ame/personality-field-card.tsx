import { cn } from '@/shared/lib/cn';
import { t, type StringKey } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';

import { EditButton, LockBadge } from './personality-controls';
import { PersonalityEditor } from './personality-editor';
import { usePersonalityEdit, type PersonalityField } from './use-personality-edit';

interface PersonalityFieldCardProps {
  character: Character;
  field: PersonalityField;
  /** Clé i18n du titre de la carte (trait / idéal / attache / défaut). */
  titleKey: StringKey;
  /** Clé i18n de l'invite de saisie (textarea vide). */
  placeholderKey: StringKey;
  /** Clé i18n du texte affiché quand le champ est vide en lecture. */
  emptyKey: StringKey;
}

/**
 * Carte intérieure d'un champ de personnalité (mode Âme) — une par
 * trait / idéal / attache / défaut, rangées en grille dans la section
 * « Personnalité ». Champ réservé au propriétaire : MJ → cadenas, PJ mort →
 * lecture seule, propriétaire vivant → édition inline (cf. `usePersonalityEdit`).
 */
export function PersonalityFieldCard({
  character,
  field,
  titleKey,
  placeholderKey,
  emptyKey,
}: PersonalityFieldCardProps): JSX.Element {
  const edit = usePersonalityEdit(character, field);
  const title = t(titleKey);

  return (
    <div className="rounded-card-sm border border-white-8 bg-white/[0.02] p-4 transition-colors duration-200 ease-base">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-title text-meta font-bold uppercase tracking-[0.2em] text-gold-bright">
          {title}
        </h3>
        {edit.locked ? (
          <LockBadge />
        ) : edit.canEdit && !edit.editing ? (
          <EditButton
            onClick={edit.start}
            ariaLabel={t('sheet.ame.personality.editLabel').replace('{field}', title)}
          />
        ) : null}
      </div>

      {edit.editing ? (
        <PersonalityEditor edit={edit} placeholder={t(placeholderKey)} ariaLabel={title} />
      ) : (
        <p
          className={cn(
            'whitespace-pre-wrap font-serif text-body-sm',
            edit.value ? 'text-text-secondary' : 'italic text-text-faint',
          )}
        >
          {edit.value || t(emptyKey)}
        </p>
      )}
    </div>
  );
}
