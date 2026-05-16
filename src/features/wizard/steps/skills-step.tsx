import { useMemo, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { Checkbox } from '@/shared/components/form';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { SKILLS } from '@/shared/lib/rules/skills';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { applyReferenceSkills } from '../reference-builds/builds';
import { StepIntro } from '../help/help-panel';

import { resolveSkillIds } from './skill-resolver';

export function SkillsStep(): JSX.Element {
  const draft = useWizardStore((s) => s.draft);
  const setField = useWizardStore((s) => s.setField);

  const classes = useContent('classes');
  const backgrounds = useContent('backgrounds');

  const primaryClass = useMemo(
    () => classes.data.find((c) => c.id === draft.primaryClassId) ?? null,
    [classes.data, draft.primaryClassId],
  );
  const background = useMemo(
    () => backgrounds.data.find((b) => b.id === draft.backgroundId) ?? null,
    [backgrounds.data, draft.backgroundId],
  );

  // Skills auto-grantées par la classe primaire (read-only) — souvent vide,
  // mais certaines sous-classes/historiques 5e 2024 en accordent.
  // Pour le SRD 5.2.1 « base » : aucune grant automatique côté classe.
  const grantedFromBackground = useMemo(
    () => resolveSkillIds(background?.skillProficiencies ?? []),
    [background],
  );

  const allowed = useMemo(
    () => resolveSkillIds(primaryClass?.skillChoices.from ?? []),
    [primaryClass],
  );

  const count = primaryClass?.skillChoices.count ?? 0;
  const pickedCount = draft.pickedSkills.length;

  const togglePick = (skillId: string): void => {
    if (grantedFromBackground.includes(skillId)) return; // verrouillé
    if (!allowed.includes(skillId)) return;
    const currentlyPicked = draft.pickedSkills.includes(skillId);
    if (currentlyPicked) {
      setField(
        'pickedSkills',
        draft.pickedSkills.filter((s) => s !== skillId),
      );
    } else if (pickedCount < count) {
      setField('pickedSkills', [...draft.pickedSkills, skillId]);
    }
  };

  const handleAutoFill = (): void => {
    if (!primaryClass) return;
    const picks = applyReferenceSkills(primaryClass.id, allowed, count);
    setField('pickedSkills', picks);
  };

  return (
    <section className="flex flex-col gap-6">
      <StepIntro>{t('wizard.help.skills.intro')}</StepIntro>

      <p className="font-title text-meta uppercase tracking-[0.18em] text-gold-bright">
        {t('wizard.skills.toPick')} : {pickedCount} / {count}
      </p>

      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {SKILLS.map((s) => {
          const isGranted = grantedFromBackground.includes(s.id);
          const isAllowedByClass = allowed.includes(s.id);
          const isPicked = draft.pickedSkills.includes(s.id) || isGranted;
          const disabled = isGranted || !isAllowedByClass;
          return (
            <Checkbox
              key={s.id}
              checked={isPicked}
              disabled={disabled}
              onChange={() => togglePick(s.id)}
              label={
                <span>
                  {localize(s.name)}{' '}
                  {isGranted ? (
                    <span className="font-title text-meta text-gold-bright tracking-[0.18em]">
                      ({t('wizard.skills.fromBackground')})
                    </span>
                  ) : !isAllowedByClass ? (
                    <span className="font-title text-meta text-text-faint tracking-[0.18em]">
                      ({t('wizard.skills.notAllowed')})
                    </span>
                  ) : null}
                </span>
              }
            />
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
