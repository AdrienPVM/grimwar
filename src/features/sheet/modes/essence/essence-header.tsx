import { Chip } from '@/shared/components/chip';
import { Icon } from '@/shared/components/icon';
import { Tooltip } from '@/shared/components/tooltip';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Character } from '@/shared/types/character';

import { useUpdateCharacter } from '../../use-update-character';

interface EssenceHeaderProps {
  character: Character;
  readOnly: boolean;
}

/**
 * En-tête d'Essence : inspiration toggle + bandeau d'épuisement (5e 2024).
 *
 * Inspiration : booléen unique côté schema (you have it or you don't, 5e 2024).
 * Allumée = `rollWithFlags` posera advantage et consommera (bascule false) au
 * premier jet d20 d'aptitude/sauvegarde/skill.
 *
 * Épuisement : 5e 2024 = −2 par niveau aux jets d20 + niveau 6 = mort. Le
 * bandeau explicite la pénalité ; la pénalité est appliquée mécaniquement par
 * `rollWithFlags` — pas de réplication ici.
 */
export function EssenceHeader({ character, readOnly }: EssenceHeaderProps): JSX.Element {
  const { updateCharacter } = useUpdateCharacter(character);

  async function toggleInspiration(): Promise<void> {
    if (readOnly) return;
    const next = !character.inspiration;
    await updateCharacter({ inspiration: next });
    showToast({
      kind: next ? 'info' : 'grim',
      title: next
        ? t('sheet.essence.header.inspirationGranted')
        : t('sheet.essence.header.inspirationRemoved'),
      sub: next ? t('sheet.essence.header.inspirationGrantedSub') : '',
      durationMs: 1800,
    });
  }

  const exhPenalty = character.exhaustion * 2;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-title text-[10px] font-bold uppercase tracking-[0.22em] text-text-tertiary">
          {t('sheet.essence.header.aura')}
        </span>
        <Tooltip label={t('sheet.tip.toggleInspiration')} decorative>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => void toggleInspiration()}
            aria-pressed={character.inspiration}
            aria-label={
              character.inspiration
                ? t('sheet.essence.header.removeInspirationAria')
                : t('sheet.essence.header.grantInspirationAria')
            }
            className="disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Chip
              variant={character.inspiration ? 'inspiration' : 'default'}
              active={character.inspiration}
              className="gap-1.5"
            >
              <Icon
                name="i-flame"
                className={cn(
                  'h-3 w-3',
                  character.inspiration ? 'text-ink' : 'text-text-tertiary',
                )}
              />
              {t('sheet.essence.header.inspirationChip')}
            </Chip>
          </button>
        </Tooltip>
      </div>

      {character.exhaustion > 0 && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-card-sm border border-crimson/40 bg-crimson/10 px-3 py-2 backdrop-blur-md"
        >
          <Icon name="i-skull" className="h-4 w-4 shrink-0 text-crimson" />
          <div className="flex-1">
            <p className="font-title text-[10px] font-bold uppercase tracking-[0.18em] text-crimson">
              {t('sheet.essence.header.exhaustion').replace('{n}', String(character.exhaustion))}
            </p>
            <p className="font-serif text-body-sm italic text-text-secondary">
              {t('sheet.essence.header.exhaustionPenalty').replace('{n}', String(exhPenalty))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
