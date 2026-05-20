import type { Character } from '@/shared/types/character';

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
  return (
    <section
      role="tabpanel"
      id="sheet-mode-panel-essence"
      aria-labelledby="sheet-mode-tab-essence"
      className="mx-auto mt-4 flex w-full max-w-[460px] flex-col gap-3 px-4"
    >
      <EssenceHeader character={character} readOnly={readOnly} />
      <Hexagram character={character} readOnly={readOnly} />
      <SavesRow character={character} readOnly={readOnly} />
      <DivineOrderCard character={character} />
      <PrimalOrderCard character={character} />
      <InvocationsCard character={character} />
      <SkillsList character={character} readOnly={readOnly} />
    </section>
  );
}
