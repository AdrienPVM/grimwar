import { type JSX } from 'react';
import { z } from 'zod';

import { RadioCardGroup, type RadioCardOption } from '@/shared/components/form';
import { t, type StringKey } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { ANCESTRY_CASTING_ABILITY_HELP } from '../../help/ancestry-casting-ability-help';

import { ChooserHelpPanel } from './chooser-help-panel';
import { patchAncestrySubChoice } from './chooser-utils';
import { ANCESTRY_CASTING_ABILITY_VALUES } from './use-ancestry-sub-choices';

const castingAbilitySchema = z.enum(ANCESTRY_CASTING_ABILITY_VALUES);
type CastingAbility = z.infer<typeof castingAbilitySchema>;

const DESCRIPTION_KEY: Record<CastingAbility, StringKey> = {
  int: 'wizard.subchoice.ancestryCastingAbility.int.description',
  sag: 'wizard.subchoice.ancestryCastingAbility.sag.description',
  cha: 'wizard.subchoice.ancestryCastingAbility.cha.description',
};

const ABILITY_LABEL_KEY: Record<CastingAbility, StringKey> = {
  int: 'ability.int',
  sag: 'ability.sag',
  cha: 'ability.cha',
};

/**
 * Chooser caractéristique d'incantation pour les traits d'ascendance qui
 * lancent des sorts (Tieffelin Héritage fiélon, Elfe lignage, Gnome lignage).
 *
 * SRD 5.2.1 : "L'Intelligence, la Sagesse ou le Charisme est votre
 * caractéristique d'incantation pour les sorts que vous lancez avec ce
 * trait". Une seule caractéristique pour TOUS les sorts d'ascendance — pas
 * une par sort.
 */
export function AncestryCastingAbilityChooser(): JSX.Element {
  const value = useWizardStore((s) => s.draft.ancestrySubChoices.ancestryCastingAbility);
  const subChoices = useWizardStore((s) => s.draft.ancestrySubChoices);
  const setField = useWizardStore((s) => s.setField);

  const options: ReadonlyArray<RadioCardOption<CastingAbility>> =
    ANCESTRY_CASTING_ABILITY_VALUES.map((code) => ({
      value: code,
      title: t(ABILITY_LABEL_KEY[code]),
      description: t(DESCRIPTION_KEY[code]),
    }));

  return (
    <div className="flex flex-col gap-4">
      <RadioCardGroup
        legend={t('wizard.subchoice.ancestryCastingAbility.legend')}
        helper={t('wizard.subchoice.ancestryCastingAbility.helper')}
        name="ancestrySubChoice-castingAbility"
        value={value}
        onValueChange={(next) => {
          const parsed = castingAbilitySchema.safeParse(next);
          if (!parsed.success) return;
          setField(
            'ancestrySubChoices',
            patchAncestrySubChoice(subChoices, 'ancestryCastingAbility', parsed.data),
          );
        }}
        options={options}
        columns={3}
      />
      <ChooserHelpPanel
        title={value ? t(ABILITY_LABEL_KEY[value]) : ''}
        entry={value ? ANCESTRY_CASTING_ABILITY_HELP[value] : undefined}
      />
    </div>
  );
}
