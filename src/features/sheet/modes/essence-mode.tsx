import { BENTO_GRID, BentoCluster, BentoStack, BentoTile } from '@/shared/components/bento';
import { computeDisplayedSaveBonus } from '@/shared/lib/rules/active-effects';
import type { Character } from '@/shared/types/character';

import { useSheetReadOnly } from '../permissions-context';
import { useInventoryDerived } from './avoir/use-inventory-derived';
import { AncestryTraitsCard } from './essence/ancestry-traits-card';
import { ClassFeaturesCard } from './essence/class-features-card';
import { DivineOrderCard } from './essence/divine-order-card';
import { EssenceHeader } from './essence/essence-header';
import { Hexagram } from './essence/hexagram';
import { InvocationsCard } from './essence/invocations-card';
import { LanguagesCard } from './essence/languages-card';
import { OriginFeatCard } from './essence/origin-feat-card';
import { PrimalOrderCard } from './essence/primal-order-card';
import { ProficienciesCard } from './essence/proficiencies-card';
import { SavesRow } from './essence/saves-row';
import { SkillsList } from './essence/skills-list';

interface EssenceModeProps {
  character: Character;
}

/**
 * Mode Essence : hexagramme des 6 aptitudes + sauvegardes + compétences. Tap =
 * jet d20 ; long-press = menu avantage/désav. (hexagramme + sauvegardes). Le
 * mode partage le rideau read-only de Combat (`status === 'dead'` OU lecture MJ
 * `!canEdit` → toutes les interactions sont désactivées).
 *
 * Inspiration et épuisement vivent dans `EssenceHeader` ; la pénalité d'exhaust
 * et l'avantage d'inspiration sont appliqués par `rollWithFlags` à chaque jet.
 */
export function EssenceMode({ character }: EssenceModeProps): JSX.Element {
  const readOnly = useSheetReadOnly(character);
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
      className={BENTO_GRID}
    >
      {/*
        Bento (cf. `shared/components/bento.tsx`). Ordre : ce qu'on LANCE
        d'abord (hexagramme, sauvegardes, compétences), la matière de référence
        ensuite (aptitudes, traits, ordres, langues). L'hexagramme est plafonné
        à 460 px par construction — une demi-rangée (~500 px en desktop) le
        cadre au plus juste, là où 2/3 de rangée le laissaient nager dans du
        vide. Les sauvegardes se posent en face : leur grille interne de 6
        cases tient confortablement dans la même demie.
      */}
      <BentoTile span="full">
        <EssenceHeader character={character} readOnly={readOnly} />
      </BentoTile>
      <BentoTile span="md">
        <Hexagram character={character} readOnly={readOnly} />
      </BentoTile>
      {/*
        Pile face à l'hexagramme : les sauvegardes seules laissaient une colonne
        vide de plusieurs centaines de pixels sous elles (la rangée fait la
        hauteur du carré de l'hexagramme). Maîtrises et langues comblent ce vide.
        Les sauvegardes sont toujours rendues — la pile n'est donc jamais vide,
        condition d'emploi de `BentoStack`.
      */}
      <BentoTile span="md">
        <BentoStack>
          <SavesRow
            character={character}
            readOnly={readOnly}
            extraSaveBonus={extraSaveBonus}
          />
          <ProficienciesCard character={character} />
          <LanguagesCard character={character} />
        </BentoStack>
      </BentoTile>
      <BentoTile span="full">
        <SkillsList character={character} readOnly={readOnly} />
      </BentoTile>
      <BentoTile span="lg">
        <ClassFeaturesCard character={character} />
      </BentoTile>
      <BentoTile>
        <AncestryTraitsCard character={character} />
      </BentoTile>
      {/*
        Queue d'accessoires en groupe plutôt qu'en tuiles d'un tiers : combien
        d'entre elles se rendent dépend entièrement du personnage (un occultiste
        n'a que les invocations, un clerc que l'ordre divin). En tuiles d'un
        tiers, la carte solitaire finissait la page avec deux tiers de vide à sa
        droite ; le groupe la fait occuper toute la largeur.
      */}
      <BentoTile span="full">
        <BentoCluster>
          <DivineOrderCard character={character} />
          <PrimalOrderCard character={character} />
          <InvocationsCard character={character} />
          <OriginFeatCard character={character} />
        </BentoCluster>
      </BentoTile>
    </section>
  );
}
