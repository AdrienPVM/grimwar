import type { Character } from '@/shared/types/character';

import { AttacksList } from './combat/attacks-list';
import { BattleHud } from './combat/battle-hud';
import { BreathWeaponCard } from './combat/breath-weapon-card';
import { ConditionsRow } from './combat/conditions-row';
import { DeathSavesModal } from './combat/death-saves-modal';
import { FightingStyleCard } from './combat/fighting-style-card';
import { GiantAncestryCard } from './combat/giant-ancestry-card';
import { HpMegaCard } from './combat/hp-mega-card';
import { isSheetReadOnly } from './combat/hp-combat';
import { PartyStrip } from './combat/party-strip';
import { SlotsCompact } from './combat/slots-compact';

interface CombatModeProps {
  character: Character;
}

/**
 * Mode Combat : HP mega-card + battle HUD + conditions + emplacements
 * (si spellcaster) + attaques + compagnons. La modale Death Saves s'auto-monte
 * dès `hp.current === 0` ou `status === 'dead'`.
 *
 * Read-only : déclenché sur `status === 'dead'`. Les contrôles sont désactivés
 * via `disabled` côté props ET via la règle CSS `[data-readonly="true"]` sur
 * <main>, double rideau pour empêcher les patches Firestore tant que le PJ
 * n'est pas ressuscité.
 */
export function CombatMode({ character }: CombatModeProps): JSX.Element {
  const readOnly = isSheetReadOnly(character);
  const hasSpellSlots = Object.keys(character.spellSlots).length > 0;
  return (
    <section
      role="tabpanel"
      id="sheet-mode-panel-combat"
      aria-labelledby="sheet-mode-tab-combat"
      className="mx-auto mt-4 flex w-full max-w-[420px] flex-col gap-3 px-4 lg:max-w-[680px] lg:px-0 xl:max-w-none xl:grid xl:grid-cols-2 xl:gap-4"
    >
      {/*
        xl: grid 2-col. Focal HUD/HP/Attacks/Party gardent col-span-2 ;
        les petits panneaux (conditions / slots / style / breath / giant)
        flottent dans la grille pour profiter de la largeur.
      */}
      <div className="xl:col-span-2">
        <BattleHud character={character} readOnly={readOnly} />
      </div>
      <div className="xl:col-span-2">
        <HpMegaCard character={character} readOnly={readOnly} />
      </div>
      <ConditionsRow character={character} readOnly={readOnly} />
      {hasSpellSlots && <SlotsCompact character={character} readOnly={readOnly} />}
      <div className="xl:col-span-2">
        <AttacksList character={character} readOnly={readOnly} />
      </div>
      <FightingStyleCard character={character} readOnly={readOnly} />
      <BreathWeaponCard character={character} readOnly={readOnly} />
      <GiantAncestryCard character={character} readOnly={readOnly} />
      <div className="xl:col-span-2">
        <PartyStrip character={character} />
      </div>
      <DeathSavesModal character={character} />
    </section>
  );
}
