import { Card, CardHeader } from '@/shared/components/card';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';

import { EditButton, LockBadge } from './personality-controls';
import { PersonalityEditor } from './personality-editor';
import { usePersonalityEdit } from './use-personality-edit';

interface BackstoryCardProps {
  character: Character;
}

/**
 * Carte « Histoire » (mode Âme) — l'historique personnel narratif du personnage
 * (`personality.backstory`). Rendue au niveau section (Card + CardHeader ✦) avec
 * le contrôle d'édition / le cadenas dans l'en-tête, le texte long en corps.
 * Mêmes permissions que la personnalité (réservé au propriétaire, plan 26).
 */
export function BackstoryCard({ character }: BackstoryCardProps): JSX.Element {
  const edit = usePersonalityEdit(character, 'backstory');
  const title = t('sheet.ame.backstory.title');

  return (
    <Card>
      <CardHeader>
        <h3>{title}</h3>
        {edit.locked ? (
          <LockBadge />
        ) : edit.canEdit && !edit.editing ? (
          <EditButton
            onClick={edit.start}
            ariaLabel={t('sheet.ame.personality.editLabel').replace('{field}', title)}
          />
        ) : null}
      </CardHeader>

      {edit.editing ? (
        <PersonalityEditor
          edit={edit}
          placeholder={t('sheet.ame.backstory.placeholder')}
          ariaLabel={title}
          rows={6}
        />
      ) : (
        <p
          className={cn(
            'whitespace-pre-wrap font-serif text-body',
            edit.value ? 'text-text-secondary' : 'italic text-text-faint',
          )}
        >
          {edit.value || t('sheet.ame.backstory.empty')}
        </p>
      )}
    </Card>
  );
}
