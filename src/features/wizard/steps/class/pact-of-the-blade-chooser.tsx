import { useMemo, useState, type JSX } from 'react';

import { DetailModal } from '@/shared/components/detail-modal';
import { cn } from '@/shared/lib/cn';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';
import type { Item } from '@/shared/types/content';

import { HelpTriggerButton } from '../../help/help-trigger-button';
import { ChooserMissingDataBanner } from '../chooser-missing-data-banner';

/**
 * D13c — Pact of the Blade chooser (SRD 5.2.1).
 *
 * « As a Bonus Action, you can conjure a pact weapon in your hand — a Simple
 *  or Martial Melee weapon of your choice with which you bond… »
 *
 * Le SRD permet de choisir l'arme à l'invocation in-game. Le chooser au L1
 * sert à pré-bonder une arme par défaut — pratique pour les joueurs débutants
 * et utile au futur câblage Combat mode (différé D24 / D13c-followup-attacks-
 * list). Le joueur peut toujours changer en jeu (action bonus + contact 1 min,
 * cf. SRD).
 *
 * Implémentation :
 *   - Single-select radio (single value persistée dans
 *     `classes[warlock].pactBladeWeapon`).
 *   - Source : `items.json` filtré sur `category === 'weapon'` ET
 *     `properties` contient `simple-melee` OU `martial-melee`.
 *   - Tri alphabétique FR.
 *   - Modale détail par arme (poids, dégâts, propriétés).
 *
 * Comme `WarlockInvocationChooser`, le composant suppose que l'entrée Warlock
 * est présente dans `draft.classes[]`. Si l'invocation `pact-of-the-blade`
 * n'est PAS dans `eldritchInvocations`, ce composant ne doit pas être monté
 * (le parent garde la condition via `WarlockPactSubChoosers`).
 */
export function PactOfTheBladeChooser(): JSX.Element {
  const items = useContent('items');
  const setClassSubChoice = useWizardStore((s) => s.setClassSubChoice);
  const entry = useWizardStore((s) =>
    s.draft.classes.find((c) => c.classId === 'warlock') ?? null,
  );

  const eligible = useMemo(
    () =>
      items.data
        .filter(
          (it) =>
            it.category === 'weapon' &&
            Array.isArray(it.properties) &&
            (it.properties.includes('simple-melee') ||
              it.properties.includes('martial-melee')),
        )
        .sort((a, b) => localize(a.name).localeCompare(localize(b.name), 'fr')),
    [items.data],
  );

  const [modalItemId, setModalItemId] = useState<string | null>(null);
  const modalItem = useMemo<Item | null>(() => {
    if (!modalItemId) return null;
    return eligible.find((it) => it.id === modalItemId) ?? null;
  }, [modalItemId, eligible]);

  if (eligible.length === 0) {
    return (
      <ChooserMissingDataBanner
        chooserKey="pact-of-the-blade"
        contentType="items"
      />
    );
  }

  const selected = entry?.pactBladeWeapon ?? null;

  return (
    <fieldset
      className="flex flex-col gap-3 border-0 p-0 m-0"
      data-testid="pact-of-the-blade-chooser"
    >
      <legend className="font-title text-meta text-text-secondary uppercase tracking-[0.16em]">
        {t('wizard.subchoice.pactOfTheBlade.legend')}
      </legend>
      <p className="font-serif text-[13px] text-text-tertiary -mt-1">
        {t('wizard.subchoice.pactOfTheBlade.helper')}
      </p>
      <p
        className="font-serif text-[13px] text-text-secondary"
        aria-live="polite"
        data-testid="pact-blade-selection"
      >
        {selected ? localize(eligible.find((it) => it.id === selected)?.name ?? { fr: selected, en: selected }) : '—'}
      </p>
      <div
        role="radiogroup"
        aria-label={t('wizard.subchoice.pactOfTheBlade.legend')}
        className="grid gap-2 grid-cols-1 sm:grid-cols-2 max-h-[420px] overflow-y-auto pr-1"
      >
        {eligible.map((it) => {
          const checked = selected === it.id;
          const name = localize(it.name);
          const category = it.properties?.includes('martial-melee')
            ? 'Corps-à-corps de guerre'
            : 'Corps-à-corps simple';
          return (
            <div key={it.id} className="relative">
              <label
                htmlFor={`pact-blade-${it.id}`}
                className={cn(
                  'group relative flex min-h-[56px] cursor-pointer flex-col gap-0.5 rounded-card border px-3 py-2 pr-12',
                  'transition-all duration-150 ease-base',
                  'focus-within:ring-2 focus-within:ring-gold-bright/40',
                  checked
                    ? 'border-gold-bright bg-gold-bright/10 shadow-gold-glow'
                    : 'border-soft bg-bg-3/30 hover:border-glow',
                )}
              >
                <input
                  id={`pact-blade-${it.id}`}
                  type="radio"
                  name="pact-blade-weapon"
                  checked={checked}
                  onChange={() => setClassSubChoice('warlock', 'pactBladeWeapon', it.id)}
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
                <span className="font-serif text-[12px] text-text-tertiary">
                  {category}
                </span>
              </label>
              <HelpTriggerButton
                ariaLabel={`${t('wizard.helpPanel.viewDetail')} · ${name}`}
                onClick={() => setModalItemId(it.id)}
                className="absolute top-1/2 right-1 -translate-y-1/2"
              />
            </div>
          );
        })}
      </div>

      {modalItem ? (
        <DetailModal
          open
          onClose={() => setModalItemId(null)}
          titleId="pact-of-the-blade-modal-title"
          closeLabel={t('wizard.helpPanel.close')}
        >
          <div className="p-4 sm:p-5">
            <h2
              id="pact-of-the-blade-modal-title"
              className="mb-2 font-display text-[18px] text-gold-bright"
            >
              {localize(modalItem.name)}
            </h2>
            <dl className="grid grid-cols-2 gap-2 font-serif text-[13px] text-text-secondary">
              {modalItem.damage ? (
                <>
                  <dt className="text-text-tertiary">Dégâts</dt>
                  <dd>
                    {modalItem.damage.dice} {localize(modalItem.damage.typeLabel)}
                  </dd>
                </>
              ) : null}
              {typeof modalItem.weight === 'number' ? (
                <>
                  <dt className="text-text-tertiary">Poids</dt>
                  <dd>{modalItem.weight} lb</dd>
                </>
              ) : null}
              {Array.isArray(modalItem.properties) && modalItem.properties.length ? (
                <>
                  <dt className="text-text-tertiary col-span-2 mt-2">Propriétés</dt>
                  <dd className="col-span-2">{modalItem.properties.join(' · ')}</dd>
                </>
              ) : null}
            </dl>
          </div>
        </DetailModal>
      ) : null}
    </fieldset>
  );
}
