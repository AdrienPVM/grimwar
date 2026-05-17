import { type JSX } from 'react';

import { t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { AncestryCastingAbilityChooser } from './ancestry-casting-ability-chooser';
import { AncestryExtraSkillChooser } from './ancestry-extra-skill-chooser';
import { AncestrySizeChooser } from './ancestry-size-chooser';
import { DragonAncestryChooser } from './dragon-ancestry-chooser';
import { ElfLineageChooser } from './elf-lineage-chooser';
import { GnomeLineageChooser } from './gnome-lineage-chooser';
import { GoliathAncestryChooser } from './goliath-ancestry-chooser';
import { TieflingLegacyChooser } from './tiefling-legacy-chooser';
import { getAncestrySubChoiceKeys } from './use-ancestry-sub-choices';

/**
 * Section ombrelle qui assemble les choosers requis pour l'ascendance
 * courante (plan 13.8 step 12). Rendue inline dans `AncestryStep` après le
 * picker d'ascendance.
 *
 * Ne rend rien si l'ascendance n'a aucun sous-choix imposé (Nain, Halfelin,
 * Orc) — pas de bruit UI sur les chemins simples.
 */
export function AncestrySubChoicesSection(): JSX.Element | null {
  const ancestryId = useWizardStore((s) => s.draft.ancestryId);
  const keys = getAncestrySubChoiceKeys(ancestryId);
  if (keys.length === 0) return null;

  return (
    <section
      className="flex flex-col gap-5 rounded-card border border-soft bg-bg-2/40 p-4 sm:p-5"
      aria-labelledby="ancestry-subchoice-section-title"
    >
      <header className="flex flex-col gap-1">
        <h3
          id="ancestry-subchoice-section-title"
          className="font-display text-[18px] text-gold-bright"
        >
          {t('wizard.subchoice.section.title')}
        </h3>
        <p className="font-serif text-[13px] text-text-tertiary">
          {t('wizard.subchoice.section.helper')}
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {ancestryId === 'dragonborn' ? <DragonAncestryChooser /> : null}
        {ancestryId === 'tiefling' ? (
          <>
            <TieflingLegacyChooser />
            <AncestryCastingAbilityChooser />
            <AncestrySizeChooser />
          </>
        ) : null}
        {ancestryId === 'elf' ? (
          <>
            <ElfLineageChooser />
            <AncestryCastingAbilityChooser />
            <AncestryExtraSkillChooser ancestryId="elf" />
          </>
        ) : null}
        {ancestryId === 'gnome' ? (
          <>
            <GnomeLineageChooser />
            <AncestryCastingAbilityChooser />
          </>
        ) : null}
        {ancestryId === 'goliath' ? <GoliathAncestryChooser /> : null}
        {ancestryId === 'human' ? (
          <>
            <AncestrySizeChooser />
            <AncestryExtraSkillChooser ancestryId="human" />
          </>
        ) : null}
      </div>
    </section>
  );
}
