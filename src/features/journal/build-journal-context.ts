import { localize, type I18nString } from '@/shared/lib/i18n';

import type { JournalContext } from './templates';
import { capitalizeSlug } from './templates/payload';

/** Entrée de contenu minimale pour résoudre un libellé (sort / objet / état). */
interface NamedContent {
  id: string;
  name: I18nString;
}

export interface JournalContextSources {
  /** `characterId → nom de personnage` (cross-owner, plan 25.2). */
  characterNames: ReadonlyMap<string, string>;
  spells: readonly NamedContent[];
  items: readonly NamedContent[];
  conditions: readonly NamedContent[];
}

/**
 * Construit le `JournalContext` (resolvers d'identité) à partir des données déjà
 * chargées par l'écran (plan 25.2). PUR : aucune lecture Firestore/contenu ici —
 * les sources sont fournies. Les libellés de contenu passent par `localize`
 * (FR par défaut) ; un id introuvable retombe sur le slug capitalisé (jamais
 * l'id machine cru).
 */
export function buildJournalContext(sources: JournalContextSources): JournalContext {
  const spellById = new Map(sources.spells.map((s) => [s.id, s.name]));
  const itemById = new Map(sources.items.map((i) => [i.id, i.name]));
  const conditionById = new Map(sources.conditions.map((c) => [c.id, c.name]));

  return {
    resolveCharacterName: (characterId) =>
      characterId === null ? null : (sources.characterNames.get(characterId) ?? null),
    resolveSpellName: (spellId) => {
      const name = spellById.get(spellId);
      return name ? localize(name) : capitalizeSlug(spellId);
    },
    resolveItemName: (itemRef) => {
      const name = itemById.get(itemRef);
      return name ? localize(name) : capitalizeSlug(itemRef);
    },
    resolveConditionName: (conditionId) => {
      const name = conditionById.get(conditionId);
      return name ? localize(name) : capitalizeSlug(conditionId);
    },
  };
}
