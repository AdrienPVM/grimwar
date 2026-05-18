import { useMemo, type JSX } from 'react';

import { RadioCardGroup, type RadioCardOption } from '@/shared/components/form';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { GNOME_LINEAGE_HELP } from '../../help/gnome-lineage-help';

import { ChooserMissingDataBanner } from '../chooser-missing-data-banner';

import { ChooserHelpPanel } from './chooser-help-panel';
import { asGnomeLineage, patchAncestrySubChoice } from './chooser-utils';

/**
 * Chooser Gnome — sélection du lignage (2 options SRD 5.2.1).
 *
 * Gnome des forêts / Gnome des roches. Cantrips fournis listés sur chaque
 * carte.
 */
export function GnomeLineageChooser(): JSX.Element {
  const value = useWizardStore((s) => s.draft.ancestrySubChoices.gnomeLineage);
  const subChoices = useWizardStore((s) => s.draft.ancestrySubChoices);
  const setField = useWizardStore((s) => s.setField);
  const ancestries = useContent('ancestries');
  const spells = useContent('spells');

  const options = useMemo<ReadonlyArray<RadioCardOption<string>>>(() => {
    const gnome = ancestries.data.find((a) => a.id === 'gnome');
    const list = gnome?.options.gnomeLineages ?? [];
    return list.map((o) => {
      const cantripNames = o.cantripSpellIds
        .map((id) => {
          const sp = spells.data.find((s) => s.id === id);
          return sp ? localize(sp.name) : id;
        })
        .join(' · ');
      return {
        value: o.id,
        title: localize(o.name),
        description: localize(o.benefit),
        mechanicalImpact: cantripNames,
      };
    });
  }, [ancestries.data, spells.data]);

  if (options.length === 0)
    return <ChooserMissingDataBanner chooserKey="gnome-lineage" contentType="ancestries" />;

  const selectedOption = value ? options.find((o) => o.value === value) ?? null : null;
  const selectedTitle = selectedOption ? String(selectedOption.title) : '';

  return (
    <div className="flex flex-col gap-4">
      <RadioCardGroup
        legend={t('wizard.subchoice.gnomeLineage.legend')}
        helper={t('wizard.subchoice.gnomeLineage.helper')}
        name="ancestrySubChoice-gnome-lineage"
        value={value}
        onValueChange={(next) => {
          const parsed = asGnomeLineage(next);
          if (!parsed) return;
          setField(
            'ancestrySubChoices',
            patchAncestrySubChoice(subChoices, 'gnomeLineage', parsed),
          );
        }}
        options={options}
      />
      <ChooserHelpPanel
        title={selectedTitle}
        entry={value ? GNOME_LINEAGE_HELP[value] : undefined}
      />
    </div>
  );
}
