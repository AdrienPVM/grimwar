import { t } from '@/shared/lib/i18n';
import type { GameEvent } from '@/shared/types/event';

import type { JournalTemplate } from './context';
import { fillTemplate } from './fill';
import { payloadNumber, payloadString } from './payload';

/**
 * Templates des événements de cycle de vie de séance (`session-start` /
 * `session-end`, plan 23). Rendus en ligne d'ouverture / clôture de la section
 * Exploration (le compilateur ne crée pas de section dédiée pour eux).
 */

export const sessionStartTemplate: JournalTemplate = (event: GameEvent) => {
  const p = event.payload;
  return fillTemplate(t('journal.tpl.sessionStart'), {
    number: payloadNumber(p, 'sessionNumber'),
    title: payloadString(p, 'title', '—'),
  });
};

export const sessionEndTemplate: JournalTemplate = (event: GameEvent) => {
  const p = event.payload;
  return fillTemplate(t('journal.tpl.sessionEnd'), {
    number: payloadNumber(p, 'sessionNumber'),
    title: payloadString(p, 'title', '—'),
  });
};
