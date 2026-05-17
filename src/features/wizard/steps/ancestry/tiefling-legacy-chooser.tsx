import { useMemo, type JSX } from 'react';

import { RadioCardGroup, type RadioCardOption } from '@/shared/components/form';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { TIEFLING_LEGACY_HELP } from '../../help/tiefling-legacy-help';

import { ChooserHelpPanel } from './chooser-help-panel';
import { asTieflingLegacy, patchAncestrySubChoice } from './chooser-utils';

/**
 * Chooser Tieffelin — sélection de l'héritage (3 options SRD 5.2.1).
 *
 * Source : `tiefling.options.tieflingLegacies`. Chaque carte affiche le
 * cantrip de niveau 1 + le type de résistance. Les sorts L3/L5 sont
 * mentionnés en pédagogie mais débloqués par level-up (hors plan 13.8).
 */
export function TieflingLegacyChooser(): JSX.Element | null {
  const value = useWizardStore((s) => s.draft.ancestrySubChoices.tieflingLegacy);
  const subChoices = useWizardStore((s) => s.draft.ancestrySubChoices);
  const setField = useWizardStore((s) => s.setField);
  const ancestries = useContent('ancestries');
  const spells = useContent('spells');

  const options = useMemo<ReadonlyArray<RadioCardOption<string>>>(() => {
    const tiefling = ancestries.data.find((a) => a.id === 'tiefling');
    const list = tiefling?.options.tieflingLegacies ?? [];
    const resistancePrefix = t('wizard.subchoice.tieflingLegacy.resistancePrefix');
    return list.map((o) => {
      const cantrip = spells.data.find((s) => s.id === o.cantripSpellId);
      const cantripName = cantrip ? localize(cantrip.name) : o.cantripSpellId;
      return {
        value: o.id,
        title: localize(o.name),
        description: cantripName,
        mechanicalImpact: `${resistancePrefix} · ${localize(o.resistance)}`,
      };
    });
  }, [ancestries.data, spells.data]);

  if (options.length === 0) return null;

  const selectedOption = value ? options.find((o) => o.value === value) ?? null : null;
  const selectedTitle = selectedOption ? String(selectedOption.title) : '';

  return (
    <div className="flex flex-col gap-4">
      <RadioCardGroup
        legend={t('wizard.subchoice.tieflingLegacy.legend')}
        helper={t('wizard.subchoice.tieflingLegacy.helper')}
        name="ancestrySubChoice-tiefling-legacy"
        value={value}
        onValueChange={(next) => {
          const parsed = asTieflingLegacy(next);
          if (!parsed) return;
          setField(
            'ancestrySubChoices',
            patchAncestrySubChoice(subChoices, 'tieflingLegacy', parsed),
          );
        }}
        options={options}
      />
      <ChooserHelpPanel
        title={selectedTitle}
        entry={value ? TIEFLING_LEGACY_HELP[value] : undefined}
      />
    </div>
  );
}
