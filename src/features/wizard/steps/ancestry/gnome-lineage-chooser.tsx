import { useMemo, type JSX } from 'react';

import { RadioCardGroup, type RadioCardOption } from '@/shared/components/form';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { asGnomeLineage, patchAncestrySubChoice } from './chooser-utils';

/**
 * Chooser Gnome — sélection du lignage (2 options SRD 5.2.1).
 *
 * Gnome des forêts / Gnome des roches. Cantrips fournis listés sur chaque
 * carte.
 */
export function GnomeLineageChooser(): JSX.Element | null {
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

  if (options.length === 0) return null;

  return (
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
  );
}
