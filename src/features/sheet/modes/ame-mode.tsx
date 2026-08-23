import { BENTO_GRID, BentoTile } from '@/shared/components/bento';
import { Card, CardHeader } from '@/shared/components/card';
import { t } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';

import { useSheetReadOnly } from '../permissions-context';

import { BackstoryCard } from './ame/backstory-card';
import { ExperienceCard } from './ame/experience-card';
import { PersonalityFieldCard } from './ame/personality-field-card';
import { StatsDashboard } from './ame/stats-dashboard';

interface AmeModeProps {
  character: Character;
}

/**
 * Mode Âme — l'onglet contemplatif (plan 20).
 *
 * v1 : Personnalité (trait / idéal / attache / défaut), Histoire, et tableau de
 * bord des statistiques de jeu. La personnalité + l'histoire sont des champs
 * RÉSERVÉS AU PROPRIÉTAIRE (un MJ en omni-edit les voit verrouillés, cf.
 * `DM_LOCKED_FIELDS`) ; chaque carte gère elle-même son rideau read-only /
 * cadenas.
 *
 * Hors v1 (plan 20 reliquat) : aptitudes regroupées par source, journal de
 * session manuel (sous-collection `journalEntries` → nécessite de nouvelles
 * security rules, à porter dans un plan dédié). Non grafté ici pour rester
 * « client + rules » sans nouvelle collection non déployée.
 */
export function AmeMode({ character }: AmeModeProps): JSX.Element {
  const readOnly = useSheetReadOnly(character);

  return (
    <section
      role="tabpanel"
      id="sheet-mode-panel-ame"
      aria-labelledby="sheet-mode-tab-ame"
      className={BENTO_GRID}
    >
      {/*
        Bento (cf. `shared/components/bento.tsx`). L'histoire est de la prose :
        elle prend 2/3 de rangée (~70 caractères par ligne en desktop) et NON la
        pleine largeur, qui la pousserait au-delà de 110 caractères — au-dessus
        de la mesure confortable de lecture. Le tableau de bord se pose dans le
        tiers restant : c'est une pile de statistiques, il lit bien en étroit et
        il ferme la rangée sans laisser de trou.
      */}
      <BentoTile span="full">
        <Card>
          <CardHeader>
            <h3>{t('sheet.ame.personality.title')}</h3>
          </CardHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <PersonalityFieldCard
              character={character}
              field="trait"
              titleKey="wizard.field.trait"
              placeholderKey="sheet.ame.personality.placeholder.trait"
              emptyKey="sheet.ame.personality.empty"
            />
            <PersonalityFieldCard
              character={character}
              field="ideal"
              titleKey="wizard.field.ideal"
              placeholderKey="sheet.ame.personality.placeholder.ideal"
              emptyKey="sheet.ame.personality.empty"
            />
            <PersonalityFieldCard
              character={character}
              field="bond"
              titleKey="wizard.field.bond"
              placeholderKey="sheet.ame.personality.placeholder.bond"
              emptyKey="sheet.ame.personality.empty"
            />
            <PersonalityFieldCard
              character={character}
              field="flaw"
              titleKey="wizard.field.flaw"
              placeholderKey="sheet.ame.personality.placeholder.flaw"
              emptyKey="sheet.ame.personality.empty"
            />
          </div>
        </Card>
      </BentoTile>

      <BentoTile span="lg">
        <BackstoryCard character={character} />
      </BentoTile>

      <BentoTile span="sm">
        <StatsDashboard character={character} />
      </BentoTile>

      {/* L'XP ferme la rangée : c'est une pile de chiffres, elle lit bien en
          étroit — même raisonnement que le tableau de bord au-dessus. */}
      <BentoTile span="sm">
        <ExperienceCard character={character} readOnly={readOnly} />
      </BentoTile>
    </section>
  );
}
