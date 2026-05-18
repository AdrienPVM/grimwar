import { useMemo, type JSX } from 'react';

import { RadioCardGroup, type RadioCardOption } from '@/shared/components/form';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { ELF_LINEAGE_HELP } from '../../help/elf-lineage-help';

import { ChooserMissingDataBanner } from '../chooser-missing-data-banner';

import { ChooserHelpPanel } from './chooser-help-panel';
import { asElfLineage, patchAncestrySubChoice } from './chooser-utils';

/**
 * Chooser Elfe — sélection du lignage (3 options SRD 5.2.1).
 *
 * Drow / Haut-elfe / Elfe sylvestre. Chaque carte montre le cantrip lié
 * + le bénéfice de niveau 1.
 */
export function ElfLineageChooser(): JSX.Element {
  const value = useWizardStore((s) => s.draft.ancestrySubChoices.elfLineage);
  const subChoices = useWizardStore((s) => s.draft.ancestrySubChoices);
  const setField = useWizardStore((s) => s.setField);
  const ancestries = useContent('ancestries');
  const spells = useContent('spells');

  const options = useMemo<ReadonlyArray<RadioCardOption<string>>>(() => {
    const elf = ancestries.data.find((a) => a.id === 'elf');
    const list = elf?.options.elfLineages ?? [];
    return list.map((o) => {
      const cantrip = spells.data.find((s) => s.id === o.cantripSpellId);
      const cantripName = cantrip ? localize(cantrip.name) : o.cantripSpellId;
      return {
        value: o.id,
        title: localize(o.name),
        description: localize(o.benefit),
        mechanicalImpact: cantripName,
      };
    });
  }, [ancestries.data, spells.data]);

  if (options.length === 0)
    return <ChooserMissingDataBanner chooserKey="elf-lineage" contentType="ancestries" />;

  const selectedOption = value ? options.find((o) => o.value === value) ?? null : null;
  const selectedTitle = selectedOption ? String(selectedOption.title) : '';

  return (
    <div className="flex flex-col gap-4">
      <RadioCardGroup
        legend={t('wizard.subchoice.elfLineage.legend')}
        helper={t('wizard.subchoice.elfLineage.helper')}
        name="ancestrySubChoice-elf-lineage"
        value={value}
        onValueChange={(next) => {
          const parsed = asElfLineage(next);
          if (!parsed) return;
          setField(
            'ancestrySubChoices',
            patchAncestrySubChoice(subChoices, 'elfLineage', parsed),
          );
        }}
        options={options}
      />
      <ChooserHelpPanel
        title={selectedTitle}
        entry={value ? ELF_LINEAGE_HELP[value] : undefined}
      />
    </div>
  );
}
