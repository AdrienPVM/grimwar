import type { JSX } from 'react';

import {
  FormField,
  NumberInput,
  Select,
  TextInput,
} from '@/shared/components/form';
import { t, type StringKey } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { StepIntro } from '../help/help-panel';

// Valeur + clé i18n partagée (mêmes libellés que la fiche/recap via `alignment.*`).
const ALIGNMENT_VALUES: readonly { value: string; labelKey: StringKey }[] = [
  { value: 'LB', labelKey: 'alignment.LB' },
  { value: 'NB', labelKey: 'alignment.NB' },
  { value: 'CB', labelKey: 'alignment.CB' },
  { value: 'LN', labelKey: 'alignment.LN' },
  { value: 'N', labelKey: 'alignment.N' },
  { value: 'CN', labelKey: 'alignment.CN' },
  { value: 'LM', labelKey: 'alignment.LM' },
  { value: 'NM', labelKey: 'alignment.NM' },
  { value: 'CM', labelKey: 'alignment.CM' },
];

export function IdentityStep(): JSX.Element {
  const draft = useWizardStore((s) => s.draft);
  const setField = useWizardStore((s) => s.setField);
  // Libellés résolus au rendu (i18n-ready) plutôt qu'au chargement du module.
  const alignmentOptions = ALIGNMENT_VALUES.map(({ value, labelKey }) => ({
    value,
    label: t(labelKey),
  }));

  const nameError =
    draft.name.length > 0 && draft.name.trim().length === 0
      ? t('wizard.error.nameRequired')
      : undefined;

  return (
    <section className="flex flex-col gap-6">
      <StepIntro>{t('wizard.help.identity.intro')}</StepIntro>

      <FormField label={t('wizard.field.name')} error={nameError} required>
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            value={draft.name}
            placeholder={t('wizard.placeholder.name')}
            maxLength={60}
            onChange={(e) => setField('name', e.target.value)}
            autoComplete="off"
          />
        )}
      </FormField>

      <FormField
        label={t('wizard.field.level')}
        helper={t('wizard.help.identity.levelHelper')}
        required
      >
        {(fieldProps) => (
          <NumberInput
            {...fieldProps}
            value={draft.level}
            min={1}
            max={20}
            onValueChange={(v) => setField('level', v)}
            decrementLabel={t('wizard.aria.decrement')}
            incrementLabel={t('wizard.aria.increment')}
          />
        )}
      </FormField>

      <FormField
        label={t('wizard.field.alignment')}
        helper={t('wizard.help.identity.alignmentHelper')}
        required
      >
        {(fieldProps) => (
          <Select
            {...fieldProps}
            value={draft.alignment}
            onValueChange={(v) => setField('alignment', v)}
            options={alignmentOptions}
          />
        )}
      </FormField>
    </section>
  );
}
