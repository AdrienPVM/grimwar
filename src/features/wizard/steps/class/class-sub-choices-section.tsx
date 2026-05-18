import { type JSX } from 'react';

import { t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { ChooserDependencyHint } from '../chooser-dependency-hint';

import { ClericDivineOrderChooser } from './cleric-divine-order-chooser';
import { DruidPrimalOrderChooser } from './druid-primal-order-chooser';
import { ExtraLanguagesChooser } from './extra-languages-chooser';
import { FighterFightingStyleChooser } from './fighter-fighting-style-chooser';
import { WarlockInvocationChooser } from './warlock-invocation-chooser';
import { WeaponMasteryChooser } from './weapon-mastery-chooser';
import { WizardSpellbookChooser } from './wizard-spellbook-chooser';
import {
  ROGUE_EXTRA_LANGUAGES_COUNT_L1,
  getClassSubChoiceKeys,
} from './use-class-sub-choices';

/**
 * Section ombrelle qui assemble les choosers requis pour la classe primaire
 * mono-class à L1 (plan 13.9 step 9). Rendue inline dans `ClassStep` après le
 * picker de classe.
 *
 * Cas mono-class S1 : seule la première entrée `classes[]` est exposée — multi-
 * class à la création reste exceptionnel et sera traité au plan 18 level-up
 * (cf. plan 13.9 Notes for next plan).
 *
 * Ne rend rien si la classe n'a aucun sous-choix imposé (Bard, Sorcerer, Monk).
 */
export function ClassSubChoicesSection(): JSX.Element | null {
  const primaryClassId = useWizardStore((s) => s.draft.primaryClassId);
  const classId = primaryClassId;
  if (!classId) return null;

  const keys = getClassSubChoiceKeys(classId);
  if (keys.length === 0) return null;

  return (
    <section
      className="flex flex-col gap-6 rounded-card border border-soft bg-bg-2/40 p-4 sm:p-5"
      aria-labelledby="class-subchoice-section-title"
    >
      <header className="flex flex-col gap-1">
        <h3
          id="class-subchoice-section-title"
          className="font-display text-[18px] text-gold-bright"
        >
          {t('wizard.subchoice.class.section.title')}
        </h3>
        <p className="font-serif text-[13px] text-text-tertiary">
          {t('wizard.subchoice.class.section.helper')}
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {classId === 'cleric' ? <ClericDivineOrderChooser /> : null}
        {classId === 'druid' ? <DruidPrimalOrderChooser /> : null}
        {classId === 'fighter' ? (
          <>
            <FighterFightingStyleChooser />
            <WeaponMasteryChooser classId="fighter" />
          </>
        ) : null}
        {classId === 'barbarian' ? <WeaponMasteryChooser classId="barbarian" /> : null}
        {classId === 'paladin' ? <WeaponMasteryChooser classId="paladin" /> : null}
        {classId === 'ranger' ? <WeaponMasteryChooser classId="ranger" /> : null}
        {classId === 'rogue' ? (
          <>
            <WeaponMasteryChooser classId="rogue" />
            {/* Expertise vit à l'étape Compétences (Option B, plan 13.9 UAT
                2026-05-18) — son pool dépend des picks de classe, qui sont
                cochés là-bas. Un simple hint d'attente neutre ici, pas de
                bannière "panne". */}
            <ChooserDependencyHint
              chooserKey="rogue-expertise-at-class"
              messageKey="wizard.subchoice.pending.expertiseAtClassStep"
            />
            <ExtraLanguagesChooser count={ROGUE_EXTRA_LANGUAGES_COUNT_L1} />
          </>
        ) : null}
        {classId === 'warlock' ? <WarlockInvocationChooser /> : null}
        {classId === 'wizard' ? <WizardSpellbookChooser /> : null}
      </div>
    </section>
  );
}
