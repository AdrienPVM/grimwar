import { useMemo, useState, type JSX, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { Button } from '@/shared/components/button';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import {
  abilityModifier,
  ABILITY_ORDER,
} from '@/shared/lib/rules/abilities';
import { proficiencyBonus } from '@/shared/lib/rules/multiclass';
import { showToast } from '@/shared/lib/slices/toast-slice';
import {
  useWizardStore,
  type WizardStepId,
} from '@/shared/lib/slices/wizard-slice';
import type { AbilityCode } from '@/shared/types/character';
import type { ClassEntity } from '@/shared/types/content';

import { submitFromWizard } from '../submit-from-wizard';
import { StepIntro } from '../help/help-panel';

const ABILITY_LABEL: Record<AbilityCode, string> = {
  for: 'Force',
  dex: 'Dextérité',
  con: 'Constitution',
  int: 'Intelligence',
  sag: 'Sagesse',
  cha: 'Charisme',
};

export function RecapStep(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const draft = useWizardStore((s) => s.draft);
  const goToStep = useWizardStore((s) => s.goToStep);
  const reset = useWizardStore((s) => s.reset);

  const classes = useContent('classes');
  const ancestries = useContent('ancestries');
  const backgrounds = useContent('backgrounds');
  const items = useContent('items');
  const spells = useContent('spells');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const primary = useMemo<ClassEntity | null>(
    () => classes.data.find((c) => c.id === draft.primaryClassId) ?? null,
    [classes.data, draft.primaryClassId],
  );
  const ancestry = useMemo(
    () => ancestries.data.find((a) => a.id === draft.ancestryId) ?? null,
    [ancestries.data, draft.ancestryId],
  );
  const background = useMemo(
    () => backgrounds.data.find((b) => b.id === draft.backgroundId) ?? null,
    [backgrounds.data, draft.backgroundId],
  );

  const totalLevel = draft.classes.reduce((a, c) => a + c.level, 0);
  const profBonus = proficiencyBonus(totalLevel);
  const conMod = abilityModifier(draft.abilities.con);
  const dexMod = abilityModifier(draft.abilities.dex);

  const handleSubmit = async (): Promise<void> => {
    setSubmitError(null);
    if (!user) {
      setSubmitError(t('wizard.error.authNotReady'));
      return;
    }
    if (!primary || !ancestry || !background) {
      setSubmitError(t('wizard.error.incompleteDraft'));
      return;
    }
    setSubmitting(true);
    try {
      const { id } = await submitFromWizard({
        uid: user.uid,
        draft,
        classes: classes.data,
        ancestry,
        background,
        items: items.data,
        spells: spells.data,
      });
      reset();
      showToast({
        kind: 'info',
        title: t('wizard.toast.created.title'),
        sub: draft.name,
      });
      navigate(`/character/${id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!primary || !ancestry || !background) {
    return (
      <section className="flex flex-col gap-4">
        <p className="font-serif text-body text-crimson">
          {t('wizard.error.incompleteDraft')}
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <StepIntro>{t('wizard.help.recap.intro')}</StepIntro>

      <Block step="identity" onJump={goToStep} title={t('wizard.recap.identity')}>
        <p>
          {draft.name}, {t('wizard.recap.level').toLowerCase()} {totalLevel},{' '}
          {alignmentLabel(draft.alignment)}.
        </p>
      </Block>

      <Block step="class" onJump={goToStep} title={t('wizard.recap.class')}>
        {draft.classes.length === 1 ? (
          <p>
            {t('wizard.recap.classSingular', undefined)} {localize(primary.name)}.
          </p>
        ) : (
          <p>
            {t('wizard.recap.classMulti')}
            {' '}
            {draft.classes
              .map((c) => {
                const cls = classes.data.find((cc) => cc.id === c.classId);
                return cls ? `${localize(cls.name)} ${c.level}` : '';
              })
              .filter(Boolean)
              .join(', ')}
            .
          </p>
        )}
      </Block>

      <Block step="ancestry" onJump={goToStep} title={t('wizard.recap.ancestry')}>
        <p>
          {t('wizard.recap.ancestryYou')} {localize(ancestry.name)}.
        </p>
        <p>
          {t('wizard.recap.speed')} : {ancestry.speed}m.
        </p>
      </Block>

      <Block step="abilities" onJump={goToStep} title={t('wizard.recap.abilities')}>
        <p>{t('wizard.recap.abilitiesIntro')}</p>
        <ul className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3 font-title text-meta uppercase tracking-[0.16em]">
          {ABILITY_ORDER.map((code) => {
            const v = draft.abilities[code];
            const m = abilityModifier(v);
            return (
              <li key={code} className="flex items-center justify-between gap-2 text-text">
                <span className="text-text-tertiary">{ABILITY_LABEL[code]}</span>
                <span className="text-text">{v} ({m >= 0 ? `+${m}` : m})</span>
              </li>
            );
          })}
        </ul>
      </Block>

      <Block step="background" onJump={goToStep} title={t('wizard.recap.background')}>
        <p>
          {t('wizard.recap.backgroundIntro')} {localize(background.name)}.
        </p>
      </Block>

      <Block step="skills" onJump={goToStep} title={t('wizard.recap.skills')}>
        <p>{t('wizard.recap.skillsIntro')}</p>
        <p className="font-serif text-body text-text">
          {draft.pickedSkills.length === 0
            ? t('wizard.recap.skillsNone')
            : draft.pickedSkills.join(', ')}
        </p>
      </Block>

      <Block step="equipment" onJump={goToStep} title={t('wizard.recap.equipment')}>
        <p>{t('wizard.recap.equipmentIntro')}</p>
      </Block>

      <Block step="recap" onJump={goToStep} title={t('wizard.recap.combat')}>
        <p>
          {t('wizard.recap.combatHp')} {hpAtLevel1(primary, conMod, totalLevel)}{' '}
          {t('wizard.recap.hpExplanation')}
        </p>
        <p>
          {t('wizard.recap.combatAc')} {10 + dexMod}{' '}
          {t('wizard.recap.acExplanation')}
        </p>
        <p>
          {t('wizard.recap.combatProf')} +{profBonus}{' '}
          {t('wizard.recap.profExplanation')}
        </p>
      </Block>

      {submitError ? (
        <p role="alert" className="font-serif text-body text-crimson">
          {submitError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSubmit}
          disabled={submitting || !user}
        >
          {submitting ? t('wizard.button.creating') : t('wizard.button.create')}
        </Button>
      </div>
    </section>
  );
}

function Block({
  step,
  onJump,
  title,
  children,
}: {
  step: WizardStepId;
  onJump: (id: WizardStepId) => void;
  title: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-soft bg-bg-3/30 p-4">
      <header className="flex items-center justify-between gap-2">
        <h3 className="font-title text-meta uppercase tracking-[0.18em] text-gold-bright">
          {title}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onJump(step)}
          aria-label={`${t('wizard.recap.editAria')} — ${title}`}
        >
          ✎ {t('wizard.recap.edit')}
        </Button>
      </header>
      <div className={cn('font-serif text-body text-text', 'flex flex-col gap-1')}>
        {children}
      </div>
    </div>
  );
}

function hpAtLevel1(cls: ClassEntity, conMod: number, _totalLevel: number): number {
  const dieValue = { d6: 6, d8: 8, d10: 10, d12: 12 }[cls.hitDie];
  return Math.max(1, dieValue + conMod);
}

function alignmentLabel(a: string): string {
  const map: Record<string, string> = {
    LB: 'loyal bon',
    NB: 'neutre bon',
    CB: 'chaotique bon',
    LN: 'loyal neutre',
    N: 'neutre',
    CN: 'chaotique neutre',
    LM: 'loyal mauvais',
    NM: 'neutre mauvais',
    CM: 'chaotique mauvais',
  };
  return map[a] ?? a;
}
