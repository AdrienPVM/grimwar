import { useMemo, type JSX } from 'react';

import { RadioCardGroup, type RadioCardOption } from '@/shared/components/form';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { asDragonAncestry, patchAncestrySubChoice } from './chooser-utils';

/**
 * Chooser Drakéide — sélection du type de dragon (10 options SRD 5.2.1).
 *
 * Source : `public/data/ancestries.json > dragonborn.options.dragonAncestries`
 * (extrait par `scripts/extract-srd-ancestries.ts`). Chaque carte affiche le
 * nom du dragon + son type de dégâts (= type de résistance accordée).
 */
export function DragonAncestryChooser(): JSX.Element | null {
  const value = useWizardStore((s) => s.draft.ancestrySubChoices.dragonAncestry);
  const subChoices = useWizardStore((s) => s.draft.ancestrySubChoices);
  const setField = useWizardStore((s) => s.setField);
  const ancestries = useContent('ancestries');

  const options = useMemo<ReadonlyArray<RadioCardOption<string>>>(() => {
    const dragon = ancestries.data.find((a) => a.id === 'dragonborn');
    const list = dragon?.options.dragonAncestries ?? [];
    const impactPrefix = t('wizard.subchoice.dragonAncestry.impactPrefix');
    return list.map((o) => ({
      value: o.id,
      title: localize(o.name),
      mechanicalImpact: `${impactPrefix} · ${localize(o.damageTypeLabel)}`,
    }));
  }, [ancestries.data]);

  if (options.length === 0) return null;

  return (
    <RadioCardGroup
      legend={t('wizard.subchoice.dragonAncestry.legend')}
      helper={t('wizard.subchoice.dragonAncestry.helper')}
      name="ancestrySubChoice-dragon"
      value={value}
      onValueChange={(next) => {
        const parsed = asDragonAncestry(next);
        if (!parsed) return;
        setField(
          'ancestrySubChoices',
          patchAncestrySubChoice(subChoices, 'dragonAncestry', parsed),
        );
      }}
      options={options}
    />
  );
}
