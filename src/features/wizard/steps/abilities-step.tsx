import { useMemo, useState, type JSX } from 'react';

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
  rollAbilities4d6,
  ROLLED_MAX,
  ROLLED_MIN,
  STANDARD_ARRAY,
  type Rolled4d6Result,
} from '@/shared/lib/rules/abilities';
import {
  useWizardStore,
  type AbilityMethod,
  type AbilityRollSource,
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

/**
 * Affichage du détail d'un jet 4d6 keep-3 : « 6 5 4 [2] = 15 » avec le dé
 * éliminé entre crochets et grisé. Pure helper rendu sous le NumberInput.
 */
function RolledBreakdown({ result }: { result: Rolled4d6Result }): JSX.Element {
  // On affiche les 4 faces dans l'ordre du tri ascendant pour que le dé éliminé
  // (le plus petit) soit visuellement isolé entre crochets en tête.
  const sorted = [...result.rawFaces].sort((a, b) => a - b);
  const dropped = sorted[0]!;
  const kept = sorted.slice(1);
  return (
    <span className="font-title text-meta tracking-[0.18em] text-text-tertiary">
      {t('wizard.label.rolledBreakdown')} : [
      <span aria-label="dé éliminé" className="line-through opacity-60">
        {dropped}
      </span>
      ] {kept.join(' ')} = <span className="text-text-secondary">{result.total}</span>
    </span>
  );
}

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

  // Détail des derniers jets 4d6 (mode rolled+app uniquement). UI-only : on ne
  // persiste pas le breakdown — un refresh de page ré-affiche juste la valeur
  // finale, ce qui est cohérent avec un perso « gravé » après création.
  const [rollBreakdown, setRollBreakdown] = useState<Record<AbilityCode, Rolled4d6Result> | null>(
    null,
  );

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

  const handleRollAll = (): void => {
    const result = rollAbilities4d6();
    setRollBreakdown(result);
    ABILITY_ORDER.forEach((code) => {
      setAbility(code, result[code].total);
    });
  };

  // Quand on change de méthode, on remet à zéro le breakdown : le détail des
  // derniers jets n'a de sens que pour la méthode en cours (« rolled+app »).
  const handleMethodChange = (next: AbilityMethod): void => {
    if (next !== draft.method) setRollBreakdown(null);
    setField('method', next);
  };

  return (
    <section className="flex flex-col gap-6">
      <StepIntro>{t('wizard.help.abilities.intro')}</StepIntro>

      <RadioGroup
        legend={t('wizard.field.method')}
        name="ability-method"
        value={draft.method}
        onValueChange={(v) => handleMethodChange(v as AbilityMethod)}
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
            value: 'rolled',
            label: t('wizard.method.rolled'),
            helper: t('wizard.help.abilities.method.rolled'),
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

      {draft.method === 'rolled' ? (
        <RadioGroup
          legend={t('wizard.label.rollSource')}
          name="ability-roll-source"
          value={draft.rollSource}
          onValueChange={(v) => setField('rollSource', v as AbilityRollSource)}
          layout="horizontal"
          options={[
            {
              value: 'app',
              label: t('wizard.method.rolled.source.app'),
              helper: t('wizard.help.abilities.rolled.app'),
            },
            {
              value: 'manual',
              label: t('wizard.method.rolled.source.manual'),
              helper: t('wizard.help.abilities.rolled.manual'),
            },
          ]}
        />
      ) : null}

      {draft.method === 'rolled' && draft.rollSource === 'app' ? (
        <div>
          <Button variant="secondary" size="md" onClick={handleRollAll}>
            🎲 {rollBreakdown ? t('wizard.action.reroll') : t('wizard.action.rollAbilities')}
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ABILITY_ORDER.map((code) => {
          const value = draft.abilities[code];
          const mod = abilityModifier(value);
          const isRecommended = recommendedAbility === code;
          const cost = draft.method === 'point-buy' ? pointBuyCost(value) : null;
          const breakdown = rollBreakdown?.[code] ?? null;

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
                  onValueChange={(v) =>
                    handleStandardArrayChange(code, Number(v))
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
              ) : draft.method === 'rolled' ? (
                draft.rollSource === 'app' ? (
                  // App-rolled : valeur figée par le bouton « Lancer » ;
                  // l'utilisateur ne peut pas la modifier ici (sinon ce n'est
                  // plus un tirage). Reroll = relancer pour TOUTES les stats.
                  <>
                    <div
                      role="status"
                      aria-label={ABILITY_LABEL[code]}
                      className="rounded-card-sm border border-soft bg-bg-3/40 px-3 py-2 text-center font-title text-body tabular-nums text-text"
                    >
                      {value}
                    </div>
                    {breakdown ? <RolledBreakdown result={breakdown} /> : null}
                  </>
                ) : (
                  // Manuel : le joueur lance IRL et saisit les 6 totaux.
                  <NumberInput
                    value={value}
                    min={ROLLED_MIN}
                    max={ROLLED_MAX}
                    onValueChange={(v) => setAbility(code, v)}
                    aria-label={ABILITY_LABEL[code]}
                    decrementLabel={t('wizard.aria.decrement')}
                    incrementLabel={t('wizard.aria.increment')}
                  />
                )
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

      {draft.method !== 'rolled' ? (
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
      ) : null}
    </section>
  );
}
