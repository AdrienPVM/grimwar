import { computeDisplayedSaveBonus } from '@/shared/lib/rules/active-effects';
import type { Character } from '@/shared/types/character';

import { useInventoryDerived } from './avoir/use-inventory-derived';
import { isSheetReadOnly } from './combat/hp-combat';
import { DivineOrderCard } from './essence/divine-order-card';
import { EssenceHeader } from './essence/essence-header';
import { Hexagram } from './essence/hexagram';
import { InvocationsCard } from './essence/invocations-card';
import { PrimalOrderCard } from './essence/primal-order-card';
import { SavesRow } from './essence/saves-row';
import { SkillsList } from './essence/skills-list';

interface EssenceModeProps {
  character: Character;
}

/**
 * Mode Essence : hexagramme des 6 aptitudes + sauvegardes + compétences. Tap =
 * jet d20 ; long-press = menu avantage/désav. (hexagramme + sauvegardes). Le
 * mode partage le rideau read-only de Combat (`status === 'dead'` → toutes les
 * interactions sont désactivées).
 *
 * Inspiration et épuisement vivent dans `EssenceHeader` ; la pénalité d'exhaust
 * et l'avantage d'inspiration sont appliqués par `rollWithFlags` à chaque jet.
 */
export function EssenceMode({ character }: EssenceModeProps): JSX.Element {
  const readOnly = isSheetReadOnly(character);
  // JALON 1B.2 — bonus de sauvegarde issus des magic items équipés (Cloak /
  // Ring of Protection). Le hook est ré-évalué ici plutôt que de propager
  // depuis sheet-screen pour ne pas faire enfler les props ; useInventoryDerived
  // est conçu pour être appelé de plusieurs sites (useMemos internes stables).
  const inv = useInventoryDerived(character);
  const extraSaveBonus = computeDisplayedSaveBonus(inv.activeMagicEffects);
  return (
    <section
      role="tabpanel"
      id="sheet-mode-panel-essence"
      aria-labelledby="sheet-mode-tab-essence"
      className="mx-auto mt-4 flex w-full max-w-[420px] flex-col gap-3 px-4 lg:max-w-[680px] lg:px-0 xl:max-w-none xl:grid xl:grid-cols-2 xl:gap-4"
    >
      {/*
        xl : 2 colonnes. Header + Hexagram + Saves + Skills (la longue
        liste interactive) gardent toute la largeur ; les cartes Ordre
        divin / Primal / Invocations se rangent en grille pour profiter
        de la largeur sans étirer leurs contenus textuels.
      */}
      <div className="xl:col-span-2">
        <EssenceHeader character={character} readOnly={readOnly} />
      </div>
      <div className="xl:col-span-2">
        <Hexagram character={character} readOnly={readOnly} />
      </div>
      <div className="xl:col-span-2">
        <SavesRow
          character={character}
          readOnly={readOnly}
          extraSaveBonus={extraSaveBonus}
        />
      </div>
      <DivineOrderCard character={character} />
      <PrimalOrderCard character={character} />
      <InvocationsCard character={character} />
      <div className="xl:col-span-2">
        <SkillsList character={character} readOnly={readOnly} />
      </div>
    </section>
  );
}
