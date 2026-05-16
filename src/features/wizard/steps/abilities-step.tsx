import { useMemo, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { NumberInput, RadioGroup, Select } from '@/shared/components/form';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import {
  abilityModifier,
  ABILITY_ORDER,
  pointBuyCost,
  pointBuyRemaining,
  POINT_BUY_MAX,
  POINT_BUY_MIN,
  STANDARD_ARRAY,
} from '@/shared/lib/rules/abilities';
import {
  useWizardStore,
  type AbilityMethod,
} from '@/shared/lib/slices/wizard-slice';
import type { AbilityCode } from '@/shared/types/character';

import { applyReferenceAbilities } from '../reference-builds/builds';
import { StepIntro } from '../help/help-panel';

const ABILITY_LABEL: Record<AbilityCode, string> = {
  for: 'Force',
  dex: 'Dextérité',
  con: 'Constitution',
  int: 'Intelligence',
  sag: 'Sagesse',
  cha: 'Charisme',
};

export function AbilitiesStep(): JSX.Element {
  const draft = useWizardStore((s) => s.draft);
  const setField = useWizardStore((s) => s.setField);
  const setAbility = useWizardStore((s) => s.setAbility);

  const classes = useContent('classes');
  const primaryClass = useMemo(
    () => classes.data.find((c) => c.id === draft.primaryClassId) ?? null,
    [classes.data, draft.primaryClassId],
  );
  const recommendedAbility = primaryClass?.primaryAbility?.[0] ?? null;

  const remaining = pointBuyRemaining(draft.abilities);

  // Pour Standard Array : on présente une matrice <ability> → <valeur du tableau>.
  // L'utilisateur affecte chaque case ; on détecte les doublons par diff.
  const handleStandardArrayChange = (
    ability: AbilityCode,
    value: number,
  ): void => {
    setAbility(ability, value);
  };

  const handleAutoFill = (): void => {
    if (!primaryClass) return;
    const next = applyReferenceAbilities(primaryClass.id, draft.method);
    Object.entries(next).forEach(([code, val]) => {
      setAbility(code as AbilityCode, val);
    });
  };

  return (
    <section className="flex flex-col gap-6">
      <StepIntro>{t('wizard.help.abilities.intro')}</StepIntro>

      <RadioGroup
        legend={t('wizard.field.method')}
        name="ability-method"
        value={draft.method}
        onValueChange={(v) => setField('method', v as AbilityMethod)}
        layout="horizontal"
        options={[
          {
            value: 'standard-array',
            label: t('wizard.method.standard-array'),
            helper: t('wizard.help.abilities.method.standard-array'),
          },
          {
            value: 'point-buy',
            label: t('wizard.method.point-buy'),
            helper: t('wizard.help.abilities.method.point-buy'),
          },
          {
            value: 'manual',
            label: t('wizard.method.manual'),
            helper: t('wizard.help.abilities.method.manual'),
          },
        ]}
      />

      {draft.method === 'point-buy' ? (
        <p
          className={cn(
            'font-title text-meta uppercase tracking-[0.18em]',
            remaining === 0
              ? 'text-emerald'
              : remaining < 0
                ? 'text-crimson'
                : 'text-text-secondary',
          )}
        >
          {t('wizard.label.pointsRemaining')} : {remaining}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ABILITY_ORDER.map((code) => {
          const value = draft.abilities[code];
          const mod = abilityModifier(value);
          const isRecommended = recommendedAbility === code;
          const cost = draft.method === 'point-buy' ? pointBuyCost(value) : null;

          return (
            <div
              key={code}
              className={cn(
                'flex flex-col gap-2 rounded-card border p-3',
                isRecommended
                  ? 'border-gold-bright/60 bg-gold-bright/[0.04]'
                  : 'border-soft bg-bg-3/30',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-title text-meta uppercase tracking-[0.18em] text-gold-bright">
                  {ABILITY_LABEL[code]}
                  {isRecommended ? (
                    <span
                      className="ml-1 text-gold-bright"
                      aria-label={t('wizard.help.abilities.recommended')}
                    >
                      ★
                    </span>
                  ) : null}
                </span>
                <span className="font-display text-[15px] text-text">
                  {mod >= 0 ? `+${mod}` : mod}
                </span>
              </div>

              {draft.method === 'standard-array' ? (
                <Select
                  value={String(value)}
                  onChange={(e) =>
                    handleStandardArrayChange(code, Number(e.target.value))
                  }
                  options={STANDARD_ARRAY.map((v) => ({
                    value: String(v),
                    label: String(v),
                  }))}
                  aria-label={ABILITY_LABEL[code]}
                />
              ) : draft.method === 'point-buy' ? (
                <>
                  <NumberInput
                    value={value}
                    min={POINT_BUY_MIN}
                    max={POINT_BUY_MAX}
                    onValueChange={(v) => setAbility(code, v)}
                    aria-label={ABILITY_LABEL[code]}
                    decrementLabel={t('wizard.aria.decrement')}
                    incrementLabel={t('wizard.aria.increment')}
                  />
                  {cost !== null ? (
                    <span className="font-title text-meta text-text-tertiary tracking-[0.18em]">
                      {t('wizard.label.cost')} : {cost}
                    </span>
                  ) : null}
                </>
              ) : (
                <NumberInput
                  value={value}
                  min={3}
                  max={20}
                  onValueChange={(v) => setAbility(code, v)}
                  aria-label={ABILITY_LABEL[code]}
                  decrementLabel={t('wizard.aria.decrement')}
                  incrementLabel={t('wizard.aria.increment')}
                />
              )}
            </div>
          );
        })}
      </div>

      <div>
        <Button
          variant="secondary"
          size="md"
          onClick={handleAutoFill}
          disabled={!primaryClass}
        >
          ✨ {t('wizard.action.autofill')}
        </Button>
      </div>
    </section>
  );
}
