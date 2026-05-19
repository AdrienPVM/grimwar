import { useMemo, type JSX } from 'react';

import { RadioCardGroup, type RadioCardOption } from '@/shared/components/form';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';
import { fightingStyleSchema } from '@/shared/types/character';

import { FIGHTING_STYLE_HELP } from '../../help/fighting-style-help';
import { ChooserMissingDataBanner } from '../chooser-missing-data-banner';

import { ClassChooserHelpPanel } from './class-chooser-help-panel';
import { asFightingStyle } from './chooser-utils';

/**
 * Chooser Guerrier — Style de combat (4 options SRD 5.2.1 CC).
 *
 * Source : `public/data/feats.json` filtré sur `category === 'fighting-style'`
 * (4 feats : Archery / Defense / Great Weapon Fighting / Two-Weapon Fighting).
 * Hors SRD CC : Dueling / Protection / Blind Fighting — pas dans le bundle.
 *
 * On filtre aussi sur les 4 ids du `fightingStyleSchema` côté character pour
 * garantir la cohérence (un feat hors-enum serait silencieusement ignoré).
 */
const FIGHTING_STYLE_IDS = fightingStyleSchema.options;

export function FighterFightingStyleChooser(): JSX.Element {
  const feats = useContent('feats');
  const setClassSubChoice = useWizardStore((s) => s.setClassSubChoice);
  const entry = useWizardStore((s) =>
    s.draft.classes.find((c) => c.classId === 'fighter') ?? null,
  );

  const options = useMemo<ReadonlyArray<RadioCardOption<string>>>(() => {
    return feats.data
      .filter(
        (f) =>
          f.category === 'fighting-style' &&
          FIGHTING_STYLE_IDS.includes(f.id as (typeof FIGHTING_STYLE_IDS)[number]),
      )
      .map((f) => ({
        value: f.id,
        title: localize(f.name),
        description: f.summary ? localize(f.summary) : undefined,
      }));
  }, [feats.data]);

  if (options.length === 0)
    return <ChooserMissingDataBanner chooserKey="fighter-fighting-style" contentType="feats" />;

  const value = entry?.fighterFightingStyle ?? null;
  const selectedOption = value ? options.find((o) => o.value === value) ?? null : null;
  const selectedTitle = selectedOption ? String(selectedOption.title) : '';

  return (
    <div className="flex flex-col gap-4">
      <RadioCardGroup
        legend={t('wizard.subchoice.fightingStyle.legend')}
        helper={t('wizard.subchoice.fightingStyle.helper')}
        name="classSubChoice-fighter-fighting-style"
        value={value}
        onValueChange={(next) => {
          const parsed = asFightingStyle(next);
          if (!parsed) return;
          setClassSubChoice('fighter', 'fighterFightingStyle', parsed);
        }}
        options={options}
        columns={2}
      />
      <ClassChooserHelpPanel
        title={selectedTitle}
        entry={value ? FIGHTING_STYLE_HELP[value] : undefined}
      />
    </div>
  );
}
