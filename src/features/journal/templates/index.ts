import type { EventKind, GameEvent } from '@/shared/types/event';

import type { JournalContext, JournalTemplate } from './context';
import {
  conditionAddTemplate,
  conditionRemoveTemplate,
  dmEditTemplate,
  hpChangeTemplate,
  itemAcquiredTemplate,
  itemRemovedTemplate,
  slotConsumedTemplate,
  slotRestoredTemplate,
  tempHpTemplate,
} from './character';
import {
  encounterEndTemplate,
  encounterStartTemplate,
  monsterHpChangeTemplate,
  turnStartTemplate,
} from './combat';
import { sessionEndTemplate, sessionStartTemplate } from './lifecycle';
import { rollTemplate, spellCastTemplate } from './rolls';

export type { JournalContext, JournalTemplate } from './context';

/**
 * Registre des templates par `EventKind` (plan 25.1, step 1).
 *
 * PARTIEL À DESSEIN : seuls les kinds réellement écrits par `event-logger.ts`
 * aujourd'hui ont un template (cf. audit du payload réel). Les ~24 kinds encore
 * non journalisés (level-up, death, xp-gain, revival, treasure-drop, note…)
 * n'ont pas d'entrée — `renderEventLine` retourne alors `null`
 * (aucune ligne) plutôt que de planter ou d'inventer de la prose. Ajouter un
 * logger pour un de ces kinds = ajouter sa clé i18n + son template ici, sans
 * toucher au compilateur.
 *
 * NB : `encounter-start` / `encounter-end` ont un template qui renvoie `null`
 * (structurels — consommés par le groupage du compilateur, pas rendus en ligne).
 * Ils figurent ici pour documenter qu'ils sont CONNUS et volontairement muets,
 * pas oubliés.
 */
export const EVENT_TEMPLATES: Partial<Record<EventKind, JournalTemplate>> = {
  // Jets + sorts
  roll: rollTemplate,
  'spell-cast': spellCastTemplate,
  // Diff de fiche
  'hp-change': hpChangeTemplate,
  'temp-hp': tempHpTemplate,
  'condition-add': conditionAddTemplate,
  'condition-remove': conditionRemoveTemplate,
  'slot-consumed': slotConsumedTemplate,
  'slot-restored': slotRestoredTemplate,
  'item-acquired': itemAcquiredTemplate,
  'item-removed': itemRemovedTemplate,
  // Rencontre (plan 24)
  'encounter-start': encounterStartTemplate,
  'encounter-end': encounterEndTemplate,
  'turn-start': turnStartTemplate,
  'monster-hp-change': monsterHpChangeTemplate,
  // Cycle de vie de séance (plan 23)
  'session-start': sessionStartTemplate,
  'session-end': sessionEndTemplate,
  // Audit d'édition MJ (plan 26)
  'dm-edit': dmEditTemplate,
};

/**
 * Rend une ligne de prose FR pour un événement, ou `null` si le kind n'a pas de
 * template (non encore journalisé) ou si le template est volontairement muet
 * (kind structurel). Le compilateur ignore les `null`.
 */
export function renderEventLine(event: GameEvent, ctx: JournalContext): string | null {
  const template = EVENT_TEMPLATES[event.kind];
  if (!template) return null;
  return template(event, ctx);
}
