import { t } from '@/shared/lib/i18n';
import type { GameEvent } from '@/shared/types/event';

import type { JournalTemplate } from './context';
import { fillTemplate } from './fill';
import { payloadNumber, payloadString } from './payload';

/**
 * Templates des événements de rencontre (plan 24). `encounter-start` /
 * `encounter-end` sont STRUCTURELS : le compilateur (plan 25.1) les consomme
 * pour ouvrir/fermer une section « ## Combat — {nom} » et n'émet PAS de ligne
 * inline pour eux (template → `null`). `turn-start` et `monster-hp-change`
 * produisent des lignes dans la section de combat.
 */

/** Structurel — consommé par le groupage du compilateur, pas rendu en ligne. */
export const encounterStartTemplate: JournalTemplate = () => null;

/** Structurel — l'issue est rendue comme pied de section par le compilateur. */
export const encounterEndTemplate: JournalTemplate = () => null;

export const turnStartTemplate: JournalTemplate = (event: GameEvent) => {
  const p = event.payload;
  return fillTemplate(t('journal.tpl.turnStart'), {
    name: payloadString(p, 'participantName', '—'),
    round: payloadNumber(p, 'round', 1),
  });
};

export const monsterHpChangeTemplate: JournalTemplate = (event: GameEvent) => {
  const p = event.payload;
  const name = payloadString(p, 'monsterName', '—');
  const before = payloadNumber(p, 'before');
  const after = payloadNumber(p, 'after');
  const delta = payloadNumber(p, 'delta');
  const amount = Math.abs(delta);
  const key = delta < 0 ? 'journal.tpl.monsterHpChangeDamage' : 'journal.tpl.monsterHpChangeHeal';
  return fillTemplate(t(key), { name, amount, before, after });
};
