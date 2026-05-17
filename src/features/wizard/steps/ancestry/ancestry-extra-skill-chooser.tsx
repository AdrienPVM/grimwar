import { useMemo, type JSX } from 'react';

import { RadioCardGroup, type RadioCardOption } from '@/shared/components/form';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { getSkill } from '@/shared/lib/rules/skills';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { patchAncestrySubChoice } from './chooser-utils';
import { ELF_KEEN_SENSES_SKILLS } from './use-ancestry-sub-choices';

interface Props {
  /** 'elf' (Sens Aiguisés — 3 skills) ou 'human' (Compétent — 18 skills). */
  ancestryId: 'elf' | 'human';
}

/**
 * Chooser compétence supplémentaire d'ascendance.
 *
 * Elfe — Sens Aiguisés (SRD 5.2.1) : 1 skill parmi Perspicacité, Perception,
 * Survie. Liste courte → 3 cartes.
 *
 * Humain — Compétent (SRD 5.2.1) : 1 skill parmi les 18 du SRD. Liste lue
 * depuis `ancestries.json > human.options.skillfulOptions` (= 18 skills par
 * défaut). Layout 3 colonnes pour ne pas déborder.
 */
export function AncestryExtraSkillChooser({ ancestryId }: Props): JSX.Element | null {
  const value = useWizardStore((s) => s.draft.ancestrySubChoices.ancestryExtraSkill);
  const subChoices = useWizardStore((s) => s.draft.ancestrySubChoices);
  const setField = useWizardStore((s) => s.setField);
  const ancestries = useContent('ancestries');

  const { admissibleValues, helperKey } = useMemo(() => {
    if (ancestryId === 'human') {
      const human = ancestries.data.find((a) => a.id === 'human');
      const opts = human?.options.skillfulOptions ?? [];
      return {
        admissibleValues: opts,
        helperKey: 'wizard.subchoice.ancestryExtraSkill.humanHelper' as const,
      };
    }
    return {
      admissibleValues: ELF_KEEN_SENSES_SKILLS as readonly string[],
      helperKey: 'wizard.subchoice.ancestryExtraSkill.elfHelper' as const,
    };
  }, [ancestryId, ancestries.data]);

  const options = useMemo<ReadonlyArray<RadioCardOption<string>>>(() => {
    return admissibleValues.map((id) => {
      const skill = getSkill(id);
      return {
        value: id,
        title: skill ? localize(skill.name) : id,
      };
    });
  }, [admissibleValues]);

  if (options.length === 0) return null;

  return (
    <RadioCardGroup
      legend={t('wizard.subchoice.ancestryExtraSkill.legend')}
      helper={t(helperKey)}
      name="ancestrySubChoice-extraSkill"
      value={value}
      onValueChange={(next) => {
        if (!admissibleValues.includes(next)) return;
        setField(
          'ancestrySubChoices',
          patchAncestrySubChoice(subChoices, 'ancestryExtraSkill', next),
        );
      }}
      options={options}
      columns={3}
    />
  );
}
