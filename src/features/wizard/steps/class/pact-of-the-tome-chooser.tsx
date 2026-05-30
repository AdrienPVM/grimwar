import { useMemo, useState, type JSX } from 'react';

import { DetailModal } from '@/shared/components/detail-modal';
import { cn } from '@/shared/lib/cn';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';
import type { Spell } from '@/shared/types/content';

import { ChooserMissingDataBanner } from '../chooser-missing-data-banner';
import { HelpTriggerButton } from '../../help/help-trigger-button';

import { toggleBoundedSelection } from './chooser-utils';
import {
  WARLOCK_PACT_TOME_CANTRIPS_COUNT,
  WARLOCK_PACT_TOME_RITUALS_COUNT,
} from '@/shared/lib/rules/class-l1-sub-choices';

/**
 * D13e — Pact of the Tome chooser (SRD 5.2.1).
 *
 * « When the book appears, choose three cantrips, and choose two level 1
 *  spells that have the Ritual tag. The spells can be from any class's spell
 *  list… While the book is on your person, you have the chosen spells
 *  prepared, and they function as Warlock spells for you. »
 *
 * Implémentation :
 *   - 2 grilles de checkboxes : 3 cantrips (level=0) + 2 rituels L1 (level=1, ritual=true).
 *   - Toute classe (champ `classes[]` du sort) accepté — pas de filtre.
 *   - Persisté dans `classes[warlock].pactTomeCantrips` et `.pactTomeRituals`.
 *   - Le composant suppose que la classe Warlock est présente. Si l'invocation
 *     `pact-of-the-tome` n'est PAS dans `eldritchInvocations`, ce composant ne
 *     doit pas être monté (le parent garde la condition).
 *
 * Aligne le pattern visuel sur `WizardSpellbookChooser` : checkboxes carte
 * + bouton « ? » par sort qui ouvre une modale détail (mobile + desktop).
 */
export function PactOfTheTomeChooser(): JSX.Element {
  const spells = useContent('spells');
  const setClassSubChoice = useWizardStore((s) => s.setClassSubChoice);
  const entry = useWizardStore((s) =>
    s.draft.classes.find((c) => c.classId === 'warlock') ?? null,
  );

  // Sorts éligibles :
  //   - Cantrips = level 0, n'importe quelle classe
  //   - Rituels L1 = level 1 + ritual === true, n'importe quelle classe
  const eligibleCantrips = useMemo(
    () =>
      spells.data
        .filter((sp) => sp.level === 0)
        .sort((a, b) => localize(a.name).localeCompare(localize(b.name), 'fr')),
    [spells.data],
  );
  const eligibleRituals = useMemo(
    () =>
      spells.data
        .filter((sp) => sp.level === 1 && sp.ritual === true)
        .sort((a, b) => localize(a.name).localeCompare(localize(b.name), 'fr')),
    [spells.data],
  );

  const [modalSpellId, setModalSpellId] = useState<string | null>(null);
  const modalSpell = useMemo<Spell | null>(() => {
    if (!modalSpellId) return null;
    return (
      eligibleCantrips.find((s) => s.id === modalSpellId) ??
      eligibleRituals.find((s) => s.id === modalSpellId) ??
      null
    );
  }, [modalSpellId, eligibleCantrips, eligibleRituals]);

  if (eligibleCantrips.length === 0 || eligibleRituals.length === 0) {
    return (
      <ChooserMissingDataBanner
        chooserKey="pact-of-the-tome"
        contentType="spells"
      />
    );
  }

  const cantrips = entry?.pactTomeCantrips ?? [];
  const rituals = entry?.pactTomeRituals ?? [];
  const cantripCount = WARLOCK_PACT_TOME_CANTRIPS_COUNT;
  const ritualCount = WARLOCK_PACT_TOME_RITUALS_COUNT;
  const reachedCantripCap = cantrips.length >= cantripCount;
  const reachedRitualCap = rituals.length >= ritualCount;

  const onToggleCantrip = (id: string): void => {
    const next = toggleBoundedSelection(cantrips, id, cantripCount);
    setClassSubChoice('warlock', 'pactTomeCantrips', next);
  };

  const onToggleRitual = (id: string): void => {
    const next = toggleBoundedSelection(rituals, id, ritualCount);
    setClassSubChoice('warlock', 'pactTomeRituals', next);
  };

  return (
    <fieldset
      className="flex flex-col gap-5 border-0 p-0 m-0"
      data-testid="pact-of-the-tome-chooser"
    >
      {/* Bloc Cantrips */}
      <div className="flex flex-col gap-2">
        <legend className="font-title text-meta text-text-secondary uppercase tracking-[0.16em]">
          {t('wizard.subchoice.pactOfTheTome.cantripsLegend')}
        </legend>
        <p className="font-serif text-[13px] text-text-tertiary">
          {t('wizard.subchoice.pactOfTheTome.cantripsHelper').replace(
            '{count}',
            String(cantripCount),
          )}
        </p>
        <p
          className="font-serif text-[13px] text-text-secondary"
          aria-live="polite"
          data-testid="pact-tome-cantrips-counter"
        >
          {cantrips.length} / {cantripCount}
        </p>
      </div>
      <div
        role="group"
        aria-label={t('wizard.subchoice.pactOfTheTome.cantripsLegend')}
        className="grid gap-2 grid-cols-1 sm:grid-cols-2 max-h-[420px] overflow-y-auto pr-1"
      >
        {eligibleCantrips.map((sp) => {
          const checked = cantrips.includes(sp.id);
          const disabled = !checked && reachedCantripCap;
          const name = localize(sp.name);
          return (
            <div key={sp.id} className="relative">
              <label
                htmlFor={`pact-tome-cantrip-${sp.id}`}
                className={cn(
                  'group relative flex min-h-[44px] cursor-pointer items-center gap-2 rounded-card-sm border px-3 py-2 pr-12',
                  'transition-all duration-150 ease-base',
                  'focus-within:ring-2 focus-within:ring-gold-bright/40',
                  checked
                    ? 'border-gold-bright bg-gold-bright/10'
                    : 'border-soft bg-bg-3/30 hover:border-glow',
                  disabled && 'cursor-not-allowed opacity-40',
                )}
              >
                <input
                  id={`pact-tome-cantrip-${sp.id}`}
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onToggleCantrip(sp.id)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    'font-display text-[14px]',
                    checked ? 'text-gold-bright' : 'text-gold',
                  )}
                >
                  {name}
                </span>
              </label>
              <HelpTriggerButton
                ariaLabel={`${t('wizard.helpPanel.viewDetail')} · ${name}`}
                onClick={() => setModalSpellId(sp.id)}
                className="absolute top-1/2 right-1 -translate-y-1/2"
              />
            </div>
          );
        })}
      </div>

      {/* Bloc Rituels L1 */}
      <div className="flex flex-col gap-2 mt-2">
        <legend className="font-title text-meta text-text-secondary uppercase tracking-[0.16em]">
          {t('wizard.subchoice.pactOfTheTome.ritualsLegend')}
        </legend>
        <p className="font-serif text-[13px] text-text-tertiary">
          {t('wizard.subchoice.pactOfTheTome.ritualsHelper').replace(
            '{count}',
            String(ritualCount),
          )}
        </p>
        <p
          className="font-serif text-[13px] text-text-secondary"
          aria-live="polite"
          data-testid="pact-tome-rituals-counter"
        >
          {rituals.length} / {ritualCount}
        </p>
      </div>
      <div
        role="group"
        aria-label={t('wizard.subchoice.pactOfTheTome.ritualsLegend')}
        className="grid gap-2 grid-cols-1 sm:grid-cols-2"
      >
        {eligibleRituals.map((sp) => {
          const checked = rituals.includes(sp.id);
          const disabled = !checked && reachedRitualCap;
          const name = localize(sp.name);
          return (
            <div key={sp.id} className="relative">
              <label
                htmlFor={`pact-tome-ritual-${sp.id}`}
                className={cn(
                  'group relative flex min-h-[44px] cursor-pointer items-center gap-2 rounded-card-sm border px-3 py-2 pr-12',
                  'transition-all duration-150 ease-base',
                  'focus-within:ring-2 focus-within:ring-gold-bright/40',
                  checked
                    ? 'border-gold-bright bg-gold-bright/10'
                    : 'border-soft bg-bg-3/30 hover:border-glow',
                  disabled && 'cursor-not-allowed opacity-40',
                )}
              >
                <input
                  id={`pact-tome-ritual-${sp.id}`}
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onToggleRitual(sp.id)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    'font-display text-[14px]',
                    checked ? 'text-gold-bright' : 'text-gold',
                  )}
                >
                  {name}
                </span>
              </label>
              <HelpTriggerButton
                ariaLabel={`${t('wizard.helpPanel.viewDetail')} · ${name}`}
                onClick={() => setModalSpellId(sp.id)}
                className="absolute top-1/2 right-1 -translate-y-1/2"
              />
            </div>
          );
        })}
      </div>

      {modalSpell ? (
        <DetailModal
          open
          onClose={() => setModalSpellId(null)}
          titleId="pact-of-the-tome-modal-title"
        >
          <h2
            id="pact-of-the-tome-modal-title"
            className="mb-2 font-display text-[18px] text-gold-bright"
          >
            {localize(modalSpell.name)}
          </h2>
          <div className="font-serif text-[14px] text-text-secondary whitespace-pre-line">
            {localize(modalSpell.description)}
          </div>
        </DetailModal>
      ) : null}
    </fieldset>
  );
}
