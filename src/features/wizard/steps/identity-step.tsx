import type { JSX } from 'react';

import {
  FormField,
  NumberInput,
  Select,
  TextInput,
} from '@/shared/components/form';
import { t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { StepIntro } from '../help/help-panel';

const ALIGNMENT_OPTIONS = [
  { value: 'LB', label: 'Loyal Bon' },
  { value: 'NB', label: 'Neutre Bon' },
  { value: 'CB', label: 'Chaotique Bon' },
  { value: 'LN', label: 'Loyal Neutre' },
  { value: 'N', label: 'Neutre' },
  { value: 'CN', label: 'Chaotique Neutre' },
  { value: 'LM', label: 'Loyal Mauvais' },
  { value: 'NM', label: 'Neutre Mauvais' },
  { value: 'CM', label: 'Chaotique Mauvais' },
];

export function IdentityStep(): JSX.Element {
  const draft = useWizardStore((s) => s.draft);
  const setField = useWizardStore((s) => s.setField);

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
            options={ALIGNMENT_OPTIONS}
          />
        )}
      </FormField>
    </section>
  );
}
