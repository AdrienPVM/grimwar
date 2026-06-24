import { t } from '@/shared/lib/i18n';
import type { GameEvent } from '@/shared/types/event';

import type { JournalContext, JournalTemplate } from './context';
import { fillTemplate } from './fill';
import { payloadNumber, payloadString } from './payload';

/**
 * Templates des événements dérivés du diff de fiche (`character-diff.ts`) :
 * PV, PV temporaires, états, emplacements de sort, inventaire.
 */

function actorName(ctx: JournalContext, characterId: string | null): string {
  return ctx.resolveCharacterName(characterId) ?? t('journal.actor.someone');
}

export const hpChangeTemplate: JournalTemplate = (event: GameEvent, ctx) => {
  const p = event.payload;
  const actor = actorName(ctx, event.actorCharacterId);
  const before = payloadNumber(p, 'before');
  const after = payloadNumber(p, 'after');
  const delta = payloadNumber(p, 'delta');
  const amount = Math.abs(delta);
  // `reason` est posé par le diff ('damage' / 'heal') ; on retombe sur le signe
  // du delta si absent (payload legacy).
  const isDamage = payloadString(p, 'reason') === 'damage' || delta < 0;
  return fillTemplate(t(isDamage ? 'journal.tpl.hpDamage' : 'journal.tpl.hpHeal'), {
    actor,
    amount,
    before,
    after,
  });
};

export const tempHpTemplate: JournalTemplate = (event: GameEvent, ctx) => {
  const p = event.payload;
  const actor = actorName(ctx, event.actorCharacterId);
  const amount = payloadNumber(p, 'after') - payloadNumber(p, 'before');
  return fillTemplate(t('journal.tpl.tempHp'), { actor, amount });
};

export const conditionAddTemplate: JournalTemplate = (event: GameEvent, ctx) => {
  const actor = actorName(ctx, event.actorCharacterId);
  const condition = ctx.resolveConditionName(payloadString(event.payload, 'conditionId'));
  return fillTemplate(t('journal.tpl.conditionAdd'), { actor, condition });
};

export const conditionRemoveTemplate: JournalTemplate = (event: GameEvent, ctx) => {
  const actor = actorName(ctx, event.actorCharacterId);
  const condition = ctx.resolveConditionName(payloadString(event.payload, 'conditionId'));
  return fillTemplate(t('journal.tpl.conditionRemove'), { actor, condition });
};

export const slotConsumedTemplate: JournalTemplate = (event: GameEvent, ctx) => {
  const p = event.payload;
  const actor = actorName(ctx, event.actorCharacterId);
  const level = payloadNumber(p, 'slotLevel');
  const count = payloadNumber(p, 'count', 1);
  return fillTemplate(
    t(count <= 1 ? 'journal.tpl.slotConsumedOne' : 'journal.tpl.slotConsumedMany'),
    { actor, level, count },
  );
};

export const slotRestoredTemplate: JournalTemplate = (event: GameEvent, ctx) => {
  const p = event.payload;
  const actor = actorName(ctx, event.actorCharacterId);
  const level = payloadNumber(p, 'slotLevel');
  const count = payloadNumber(p, 'count', 1);
  return fillTemplate(
    t(count <= 1 ? 'journal.tpl.slotRestoredOne' : 'journal.tpl.slotRestoredMany'),
    { actor, level, count },
  );
};

export const itemAcquiredTemplate: JournalTemplate = (event: GameEvent, ctx) => {
  const p = event.payload;
  const actor = actorName(ctx, event.actorCharacterId);
  const item = ctx.resolveItemName(payloadString(p, 'itemRef'));
  const qty = payloadNumber(p, 'qty', 1);
  return fillTemplate(t(qty <= 1 ? 'journal.tpl.itemAcquiredOne' : 'journal.tpl.itemAcquiredMany'), {
    actor,
    item,
    qty,
  });
};

export const itemRemovedTemplate: JournalTemplate = (event: GameEvent, ctx) => {
  const p = event.payload;
  const actor = actorName(ctx, event.actorCharacterId);
  const item = ctx.resolveItemName(payloadString(p, 'itemRef'));
  const qty = payloadNumber(p, 'qty', 1);
  return fillTemplate(t(qty <= 1 ? 'journal.tpl.itemRemovedOne' : 'journal.tpl.itemRemovedMany'), {
    actor,
    item,
    qty,
  });
};
