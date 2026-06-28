import { useMemo, type JSX } from 'react';

import { Card, CardAction, CardHeader } from '@/shared/components/card';
import { Tooltip } from '@/shared/components/tooltip';
import { useContent } from '@/shared/hooks/use-content';
import { useLongPress } from '@/shared/hooks/use-long-press';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { PACT_SLOTS_RESOURCE, readPactSlotState } from '@/shared/lib/rules/pact-magic';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Character } from '@/shared/types/character';

import { useUpdateCharacter } from '../../use-update-character';

interface PactSlotsCardProps {
  character: Character;
  readOnly: boolean;
}

/**
 * Carte « Magie de pacte » de l'Occultiste — emplacements de pacte SRD 5.2.1.
 *
 * Distincte du `MagicCircle` (table unifiée) : les emplacements de pacte sont
 * tous du MÊME niveau (qui monte avec le niveau d'Occultiste) et se rechargent
 * au **repos court**. L'état est dérivé du niveau via `readPactSlotState` —
 * donc juste même sur une fiche fraîchement créée (`classResources: {}`). Seul
 * le `current` (dépensé) est persisté, sous la clé `pact-magic-slots`.
 *
 * UX alignée sur le cercle d'invocation : tap un emplacement plein → consomme ;
 * long-press un emplacement vide → restaure ; « Restaurer » en header → tout
 * (équivalent repos court). Pas de modal de confirmation (mobile-first).
 *
 * Rend `null` si le perso n'a aucune classe à pacte — l'appelant peut le poser
 * inconditionnellement.
 */
export function PactSlotsCard({ character, readOnly }: PactSlotsCardProps): JSX.Element | null {
  const { updateCharacter } = useUpdateCharacter(character);
  const { data: classCatalog } = useContent('classes');
  const state = useMemo(
    () => readPactSlotState(character, classCatalog),
    [character, classCatalog],
  );

  if (!state) return null;
  const { current, max, slotLevel } = state;

  async function writeCurrent(next: number): Promise<void> {
    if (readOnly || !state) return;
    const clamped = Math.min(Math.max(next, 0), state.max);
    if (clamped === state.current) return;
    await updateCharacter({
      classResources: {
        ...character.classResources,
        [PACT_SLOTS_RESOURCE]: {
          current: clamped,
          max: state.max,
          restoresOn: 'short',
        },
      },
    });
  }

  async function handleConsume(): Promise<void> {
    if (readOnly || current <= 0) {
      if (current <= 0) {
        showToast({
          kind: 'info',
          title: t('sheet.magie.pact.title'),
          sub: t('sheet.magie.noSlotToConsume'),
        });
      }
      return;
    }
    await writeCurrent(current - 1);
    showToast({
      kind: 'roll',
      title: t('sheet.magie.pact.consumed'),
      big: `${current - 1}/${max}`,
      sub: t('sheet.magie.longPressRestore'),
    });
  }

  async function handleRestoreOne(): Promise<void> {
    if (readOnly || current >= max) return;
    await writeCurrent(current + 1);
    showToast({
      kind: 'heal',
      title: t('sheet.magie.pact.restored'),
      big: `${current + 1}/${max}`,
    });
  }

  async function handleRestoreAll(): Promise<void> {
    if (readOnly || current >= max) return;
    await writeCurrent(max);
    showToast({
      kind: 'heal',
      title: t('sheet.magie.pact.shortRestTitle'),
      sub: t('sheet.magie.pact.shortRestSub'),
    });
  }

  return (
    <Card>
      <CardHeader>
        <h3>{t('sheet.magie.pact.title')}</h3>
        <Tooltip label={t('sheet.tip.restorePactSlots')} decorative>
          <CardAction onClick={() => void handleRestoreAll()} disabled={readOnly || current >= max}>
            {t('sheet.magie.restore')}
          </CardAction>
        </Tooltip>
      </CardHeader>

      <div className="flex flex-col gap-3">
        <p className="font-serif text-body-sm italic text-text-secondary">
          {t('sheet.magie.pact.slotsInfo').replace('{n}', String(slotLevel))}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <div
            data-testid="pact-slots-row"
            className="flex flex-wrap items-center gap-2"
          >
            {Array.from({ length: max }).map((_, idx) => (
              <PactSlotDot
                key={idx}
                slotLevel={slotLevel}
                filled={idx < current}
                disabled={readOnly}
                onConsume={() => void handleConsume()}
                onRestore={() => void handleRestoreOne()}
              />
            ))}
          </div>
          <span
            data-testid="pact-slots-readout"
            className="font-display text-[15px] font-black tabular-nums text-gold-bright"
          >
            {current}/{max}
          </span>
        </div>
      </div>
    </Card>
  );
}

interface PactSlotDotProps {
  slotLevel: number;
  filled: boolean;
  disabled: boolean;
  onConsume: () => void;
  onRestore: () => void;
}

/**
 * Emplacement de pacte individuel : disque gold plein (consommable au tap) ou
 * contour ambre dim vide (restaurable au long-press). Porte le niveau
 * d'emplacement au centre quand plein.
 */
function PactSlotDot({
  slotLevel,
  filled,
  disabled,
  onConsume,
  onRestore,
}: PactSlotDotProps): JSX.Element {
  const handlers = useLongPress(onConsume, onRestore);
  return (
    <Tooltip
      label={filled ? t('sheet.tip.consumeSlot') : t('sheet.tip.restoreSlot')}
      decorative
    >
      <button
        type="button"
        disabled={disabled}
        aria-label={
          filled
            ? t('sheet.magie.pact.dotConsume').replace('{n}', String(slotLevel))
            : t('sheet.magie.pact.dotRestore').replace('{n}', String(slotLevel))
        }
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-all',
          filled
            ? 'border-gold-bright bg-gradient-to-br from-gold-bright/80 to-gold/30 shadow-[0_0_12px_rgba(220,184,108,0.55)]'
            : 'border-gold-dim/50 bg-ink/40',
          'hover:scale-110 active:scale-90',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        {...handlers}
      >
        <span className="block font-display text-[12px] font-black leading-none tracking-[-0.02em] text-ink">
          {filled ? slotLevel : ''}
        </span>
      </button>
    </Tooltip>
  );
}
