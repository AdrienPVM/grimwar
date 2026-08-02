import { BENTO_GRID, BentoTile } from '@/shared/components/bento';
import type { Character } from '@/shared/types/character';

import { AttacksList } from './combat/attacks-list';
import { BattleHud } from './combat/battle-hud';
import { BreathWeaponCard } from './combat/breath-weapon-card';
import { ClassResourcesCard } from './combat/class-resources-card';
import { ConcentrationCard } from './combat/concentration-card';
import { ConditionsRow } from './combat/conditions-row';
import { ExhaustionCard } from './combat/exhaustion-card';
import { DeathSavesModal } from './combat/death-saves-modal';
import { FightingStyleCard } from './combat/fighting-style-card';
import { GiantAncestryCard } from './combat/giant-ancestry-card';
import { HitDiceCard } from './combat/hit-dice-card';
import { HpMegaCard } from './combat/hp-mega-card';
import { LongRestButton } from './combat/long-rest-button';
import { PartyStrip } from './combat/party-strip';
import { ShortRestButton } from './combat/short-rest-button';
import { SlotsCompact } from './combat/slots-compact';
import { useSheetReadOnly } from '../permissions-context';

interface CombatModeProps {
  character: Character;
}

/**
 * Mode Combat : HP mega-card + battle HUD + conditions + emplacements
 * (si spellcaster) + attaques + compagnons. La modale Death Saves s'auto-monte
 * dès `hp.current === 0` ou `status === 'dead'`.
 *
 * Read-only : déclenché sur `status === 'dead'` OU lecture MJ (`!canEdit`, JALON
 * 4A.3 — le meneur consulte sans pouvoir écrire). Les contrôles sont désactivés
 * via `disabled` côté props ET via la règle CSS `[data-readonly="true"]` sur
 * <main>, double rideau pour empêcher les patches Firestore.
 */
export function CombatMode({ character }: CombatModeProps): JSX.Element {
  const readOnly = useSheetReadOnly(character);
  const hasSpellSlots = Object.keys(character.spellSlots).length > 0;
  return (
    <section
      role="tabpanel"
      id="sheet-mode-panel-combat"
      aria-labelledby="sheet-mode-tab-combat"
      className={BENTO_GRID}
    >
      {/*
        Bento (cf. `shared/components/bento.tsx`). Ordre de lecture calé sur le
        geste réel d'un joueur en combat : d'abord son état vital, puis ce qui
        le modifie (états), puis ce qu'il DÉCLENCHE (attaques, emplacements),
        puis ses réserves, enfin le repos et la table.
        Les PV forment la pièce maîtresse (2/3) et le HUD d'initiative se loge
        à leur droite ; les deux sont toujours rendus, donc la rangée d'en-tête
        ne laisse jamais de trou.
      */}
      <BentoTile span="lg">
        <HpMegaCard character={character} readOnly={readOnly} />
      </BentoTile>
      <BentoTile span="sm">
        <BattleHud character={character} readOnly={readOnly} />
      </BentoTile>
      <BentoTile span="full">
        <ConditionsRow character={character} readOnly={readOnly} />
      </BentoTile>
      <BentoTile span="lg">
        <AttacksList character={character} readOnly={readOnly} />
      </BentoTile>
      {hasSpellSlots && (
        <BentoTile span="sm">
          <SlotsCompact character={character} readOnly={readOnly} />
        </BentoTile>
      )}
      <BentoTile>
        <ConcentrationCard character={character} readOnly={readOnly} />
      </BentoTile>
      <BentoTile>
        <ClassResourcesCard character={character} readOnly={readOnly} />
      </BentoTile>
      <BentoTile>
        <HitDiceCard character={character} readOnly={readOnly} />
      </BentoTile>
      <BentoTile>
        <ExhaustionCard character={character} readOnly={readOnly} />
      </BentoTile>
      <BentoTile>
        <ShortRestButton character={character} readOnly={readOnly} />
      </BentoTile>
      <BentoTile>
        <LongRestButton character={character} readOnly={readOnly} />
      </BentoTile>
      <BentoTile>
        <FightingStyleCard character={character} readOnly={readOnly} />
      </BentoTile>
      <BentoTile>
        <BreathWeaponCard character={character} readOnly={readOnly} />
      </BentoTile>
      <BentoTile>
        <GiantAncestryCard character={character} readOnly={readOnly} />
      </BentoTile>
      {/*
        2/3 et non pleine largeur : la bande de compagnons est le dernier bloc
        de la mosaïque, et une empreinte de 2/3 laisse le tiers restant
        disponible pour le dernier accessoire de repos — sinon il finissait seul
        sur sa rangée, avec les deux tiers vides à sa droite.
      */}
      <BentoTile span="lg">
        <PartyStrip character={character} />
      </BentoTile>
      {/*
        Modale plein écran (position fixed) : hors flux, donc jamais une tuile —
        l'envelopper ouvrirait une cellule fantôme dans la mosaïque.
      */}
      <DeathSavesModal character={character} />
    </section>
  );
}
