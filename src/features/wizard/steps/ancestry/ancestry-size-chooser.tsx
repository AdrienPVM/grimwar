import { type JSX } from 'react';

import { RadioCardGroup, type RadioCardOption } from '@/shared/components/form';
import { t } from '@/shared/lib/i18n';
import type { AncestrySize } from '@/shared/types/character';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { ANCESTRY_SIZE_HELP } from '../../help/ancestry-size-help';

import { ChooserHelpPanel } from './chooser-help-panel';
import { asAncestrySize, patchAncestrySubChoice } from './chooser-utils';

/**
 * Chooser taille pour Humain et Tieffelin (SRD 5.2.1 : Medium ou Small).
 * Effet mécanique vulgarisé (espace en combat, armes lourdes).
 */
export function AncestrySizeChooser(): JSX.Element {
  const value = useWizardStore((s) => s.draft.ancestrySubChoices.ancestrySize);
  const subChoices = useWizardStore((s) => s.draft.ancestrySubChoices);
  const setField = useWizardStore((s) => s.setField);

  const options: ReadonlyArray<RadioCardOption<AncestrySize>> = [
    {
      value: 'medium',
      title: t('wizard.subchoice.ancestrySize.medium.title'),
      mechanicalImpact: t('wizard.subchoice.ancestrySize.medium.impact'),
    },
    {
      value: 'small',
      title: t('wizard.subchoice.ancestrySize.small.title'),
      mechanicalImpact: t('wizard.subchoice.ancestrySize.small.impact'),
    },
  ];

  const selectedTitleKey =
    value === 'medium'
      ? 'wizard.subchoice.ancestrySize.medium.title'
      : value === 'small'
        ? 'wizard.subchoice.ancestrySize.small.title'
        : null;

  return (
    <div className="flex flex-col gap-4">
      <RadioCardGroup
        legend={t('wizard.subchoice.ancestrySize.legend')}
        helper={t('wizard.subchoice.ancestrySize.helper')}
        name="ancestrySubChoice-size"
        value={value}
        onValueChange={(next) => {
          const parsed = asAncestrySize(next);
          if (!parsed) return;
          setField(
            'ancestrySubChoices',
            patchAncestrySubChoice(subChoices, 'ancestrySize', parsed),
          );
        }}
        options={options}
        columns={2}
      />
      <ChooserHelpPanel
        title={selectedTitleKey ? t(selectedTitleKey) : ''}
        entry={value ? ANCESTRY_SIZE_HELP[value] : undefined}
      />
    </div>
  );
}
