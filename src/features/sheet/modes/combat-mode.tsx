import { BENTO_GRID, BentoStack, BentoTile } from '@/shared/components/bento';
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
      {/*
        La bande de compagnons remonte AVANT les accessoires, et ce n'est pas un
        choix éditorial : c'est la seule position où elle ne fabrique pas de trou.
        Elle vaut 2/3 de rangée, donc elle ne peut jamais boucher un reste d'un
        tiers ; placée en fin de mosaïque, elle laissait la rangée d'accessoires
        qui la précédait s'arrêter à 4 pistes sur 6 — un trou EN PLEIN MILIEU de
        la fiche chez l'occultiste, mesuré par le garde-fou de
        `sheet-desktop-density-uat`. Devant les accessoires, elle capte au
        contraire une petite carte à sa droite via le remplissage dense, et la
        seule rangée qui peut rester incomplète est la toute dernière — la seule
        qu'aucune grille CSS ne sait combler.
      */}
      <BentoTile span="lg">
        <PartyStrip character={character} />
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
      {/*
        Les deux repos vivent dans la MÊME tuile : ce sont deux faces d'un même
        geste (« je récupère »), et les séparer les envoyait sur deux rangées
        différentes de la mosaïque — repos court en fin d'une rangée, repos long
        en tête de la suivante, chacun seul dans une carte à un bouton.
        En lecture seule les deux boutons rendent `null` : la pile se retire
        d'elle-même avec sa tuile (règle imbriquée de `globals.css`), ce parent
        n'a donc pas à redupliquer la condition.
      */}
      <BentoTile>
        <BentoStack>
          <ShortRestButton character={character} readOnly={readOnly} />
          <LongRestButton character={character} readOnly={readOnly} />
        </BentoStack>
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
        Modale plein écran (position fixed) : hors flux, donc jamais une tuile —
        l'envelopper ouvrirait une cellule fantôme dans la mosaïque.
      */}
      <DeathSavesModal character={character} />
    </section>
  );
}
