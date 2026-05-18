import { useMemo, type JSX } from 'react';

import { cn } from '@/shared/lib/cn';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { getEligibleWeaponMasteryIds } from '@/shared/lib/rules/weapon-mastery';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';
import type { WeaponMasteryProperty } from '@/shared/types/content';

import { ChooserMissingDataBanner } from '../chooser-missing-data-banner';

import { toggleBoundedSelection } from './chooser-utils';
import { getRequiredCount } from './use-class-sub-choices';

/**
 * Chooser Weapon Mastery — composant générique partagé par Barbare, Guerrier,
 * Paladin, Rôdeur, Roublard (SRD 5.2.1).
 *
 * Le `count` exact vient de `class.weaponMasteryCount` du bundle (2 ou 3).
 * Les armes éligibles viennent de `getEligibleWeaponMasteryIds(classId)` qui
 * filtre les armes SRD selon les maîtrises de classe.
 *
 * Multi-sélection bornée : tap sur une carte cochée → décoche ; tap sur une
 * carte non cochée → coche si on a encore de la place, sinon refuse (UX :
 * grise visuellement les cartes restantes quand on a atteint la borne).
 */
interface Props {
  /** classId concerné (présent dans `draft.classes[]`). */
  classId: string;
}

/** Petits labels FR pour les 8 propriétés Mastery. Source : SRD 5.2.1 §C.1. */
const MASTERY_LABELS_FR: Record<WeaponMasteryProperty, string> = {
  cleave: 'Cisaille',
  graze: 'Égratignure',
  nick: 'Encoche',
  push: 'Repoussée',
  sap: 'Sape',
  slow: 'Ralentie',
  topple: 'Renverse',
  vex: 'Tourment',
};

export function WeaponMasteryChooser({ classId }: Props): JSX.Element {
  const items = useContent('items');
  const classes = useContent('classes');
  const setClassSubChoice = useWizardStore((s) => s.setClassSubChoice);
  const entry = useWizardStore((s) =>
    s.draft.classes.find((c) => c.classId === classId) ?? null,
  );

  const count = useMemo(
    () => getRequiredCount(classId, 'weaponMasteries', classes.data),
    [classId, classes.data],
  );

  const eligible = useMemo(
    () => getEligibleWeaponMasteryIds(classId, items.data, 'fr'),
    [classId, items.data],
  );

  const selected = entry?.weaponMasteries ?? [];

  if (eligible.length === 0 || count === 0)
    return (
      <ChooserMissingDataBanner
        chooserKey={`weapon-mastery-${classId}`}
        contentType="items"
      />
    );

  const remaining = count - selected.length;
  const reachedCap = selected.length >= count;

  return (
    <fieldset className="flex flex-col gap-3 border-0 p-0 m-0">
      <legend className="font-title text-meta text-text-secondary uppercase tracking-[0.16em]">
        {t('wizard.subchoice.weaponMastery.legend')}
      </legend>
      <p className="font-serif text-[13px] text-text-tertiary -mt-1">
        {t('wizard.subchoice.weaponMastery.helper').replace('{count}', String(count))}
      </p>
      <p
        className="font-serif text-[13px] text-text-secondary"
        aria-live="polite"
      >
        {selected.length} / {count}
        {remaining > 0 ? (
          <span className="ml-2 text-text-tertiary">
            {t('wizard.subchoice.weaponMastery.remaining').replace(
              '{n}',
              String(remaining),
            )}
          </span>
        ) : null}
      </p>
      <div
        role="group"
        aria-label={t('wizard.subchoice.weaponMastery.legend')}
        className="grid gap-2.5 grid-cols-1 sm:grid-cols-2"
      >
        {eligible.map((it) => {
          const checked = selected.includes(it.id);
          const disabled = !checked && reachedCap;
          const property = it.masteryProperty as WeaponMasteryProperty;
          const label = MASTERY_LABELS_FR[property];
          return (
            <label
              key={it.id}
              htmlFor={`weapon-mastery-${classId}-${it.id}`}
              className={cn(
                'group relative flex min-h-[68px] cursor-pointer flex-col gap-1 rounded-card border p-3',
                'transition-all duration-150 ease-base',
                'focus-within:ring-2 focus-within:ring-gold-bright/40',
                checked
                  ? 'border-gold-bright bg-gold-bright/10 shadow-gold-glow'
                  : 'border-soft bg-bg-3/30 hover:border-glow hover:bg-bg-3/50',
                disabled && 'cursor-not-allowed opacity-40',
              )}
            >
              <input
                id={`weapon-mastery-${classId}-${it.id}`}
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => {
                  const next = toggleBoundedSelection(selected, it.id, count);
                  setClassSubChoice(classId, 'weaponMasteries', next);
                }}
                className="peer sr-only"
              />
              <span
                className={cn(
                  'font-display text-[15px]',
                  checked ? 'text-gold-bright' : 'text-gold',
                )}
              >
                {localize(it.name)}
              </span>
              <span className="font-serif text-[13px] text-text">
                {t('wizard.subchoice.weaponMastery.propertyPrefix')} · {label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
