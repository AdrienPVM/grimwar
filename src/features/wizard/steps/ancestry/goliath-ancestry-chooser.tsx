import { useMemo, type JSX } from 'react';

import { RadioCardGroup, type RadioCardOption } from '@/shared/components/form';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { GOLIATH_ANCESTRY_HELP } from '../../help/goliath-ancestry-help';

import { ChooserHelpPanel } from './chooser-help-panel';
import { asGoliathAncestry, patchAncestrySubChoice } from './chooser-utils';

/**
 * Chooser Goliath — sélection de l'ascendance gigante (6 options SRD 5.2.1).
 *
 * Cloud / Fire / Frost / Hill / Stone / Storm. Chaque carte affiche l'effet
 * mécanique court — cadence d'utilisation = PB fois par repos long
 * (mentionné dans la pédagogie commit 3).
 */
export function GoliathAncestryChooser(): JSX.Element | null {
  const value = useWizardStore((s) => s.draft.ancestrySubChoices.goliathAncestry);
  const subChoices = useWizardStore((s) => s.draft.ancestrySubChoices);
  const setField = useWizardStore((s) => s.setField);
  const ancestries = useContent('ancestries');

  const options = useMemo<ReadonlyArray<RadioCardOption<string>>>(() => {
    const goliath = ancestries.data.find((a) => a.id === 'goliath');
    const list = goliath?.options.giantAncestries ?? [];
    return list.map((o) => ({
      value: o.id,
      title: localize(o.name),
      mechanicalImpact: localize(o.effect),
    }));
  }, [ancestries.data]);

  if (options.length === 0) return null;

  const selectedOption = value ? options.find((o) => o.value === value) ?? null : null;
  const selectedTitle = selectedOption ? String(selectedOption.title) : '';

  return (
    <div className="flex flex-col gap-4">
      <RadioCardGroup
        legend={t('wizard.subchoice.goliathAncestry.legend')}
        helper={t('wizard.subchoice.goliathAncestry.helper')}
        name="ancestrySubChoice-goliath"
        value={value}
        onValueChange={(next) => {
          const parsed = asGoliathAncestry(next);
          if (!parsed) return;
          setField(
            'ancestrySubChoices',
            patchAncestrySubChoice(subChoices, 'goliathAncestry', parsed),
          );
        }}
        options={options}
      />
      <ChooserHelpPanel
        title={selectedTitle}
        entry={value ? GOLIATH_ANCESTRY_HELP[value] : undefined}
      />
    </div>
  );
}
