import { Card, CardHeader } from '@/shared/components/card';
import { t } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';

import { BackstoryCard } from './ame/backstory-card';
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
  return (
    <section
      role="tabpanel"
      id="sheet-mode-panel-ame"
      aria-labelledby="sheet-mode-tab-ame"
      className="mx-auto mt-4 flex w-full max-w-[420px] flex-col gap-3 px-4 lg:max-w-[680px] lg:px-0 xl:max-w-none xl:grid xl:grid-cols-2 xl:gap-4"
    >
      <div className="xl:col-span-2">
        <Card>
          <CardHeader>
            <h3>{t('sheet.ame.personality.title')}</h3>
          </CardHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      </div>

      <div className="xl:col-span-2">
        <BackstoryCard character={character} />
      </div>

      <div className="xl:col-span-2">
        <StatsDashboard character={character} />
      </div>
    </section>
  );
}
