import { t } from '@/shared/lib/i18n';
import type { GameEvent } from '@/shared/types/event';

import type { JournalContext, JournalTemplate } from './context';
import { fillTemplate } from './fill';
import { payloadBool, payloadNumber, payloadString } from './payload';

/**
 * Templates des jets de dés (`roll`) et lancements de sort (`spell-cast`).
 * Source de vérité du payload : `event-logger.ts` (`logRoll`, `logSpellCast`).
 */

/** Repli d'acteur : nom résolu, sinon « Quelqu'un » (un jet vient d'un joueur). */
function actorName(ctx: JournalContext, characterId: string | null): string {
  return ctx.resolveCharacterName(characterId) ?? t('journal.actor.someone');
}

export const rollTemplate: JournalTemplate = (event: GameEvent, ctx) => {
  const p = event.payload;
  const actor = actorName(ctx, event.actorCharacterId);
  const label = payloadString(p, 'label', '—');
  const total = payloadNumber(p, 'total');
  const rollKind = payloadString(p, 'rollKind', 'custom');
  const vars = { actor, label, total };

  // L'attaque distingue crit / fumble / normal — la couleur narrative la plus
  // forte du journal (cf. table EVENT-LOG.md).
  if (rollKind === 'attack' || rollKind === 'cantrip-attack') {
    if (payloadBool(p, 'crit')) return fillTemplate(t('journal.tpl.rollAttackCrit'), vars);
    if (payloadBool(p, 'fumble')) return fillTemplate(t('journal.tpl.rollAttackFumble'), vars);
    return fillTemplate(t('journal.tpl.rollAttack'), vars);
  }
  if (rollKind === 'damage') return fillTemplate(t('journal.tpl.rollDamage'), vars);
  if (rollKind === 'save') return fillTemplate(t('journal.tpl.rollSave'), vars);
  if (rollKind === 'check') return fillTemplate(t('journal.tpl.rollCheck'), vars);
  if (rollKind === 'death-save') return fillTemplate(t('journal.tpl.rollDeathSave'), vars);
  // init / custom et tout kind futur non spécialisé.
  return fillTemplate(t('journal.tpl.rollGeneric'), vars);
};

export const spellCastTemplate: JournalTemplate = (event: GameEvent, ctx) => {
  const p = event.payload;
  const actor = actorName(ctx, event.actorCharacterId);
  const spell = ctx.resolveSpellName(payloadString(p, 'spellId'));
  const level = payloadNumber(p, 'level');
  const slotConsumed = p['slotConsumed'];

  // Sort mineur (cantrip) : pas d'emplacement consommé (`slotConsumed: null`).
  if (slotConsumed === null || level === 0) {
    return fillTemplate(t('journal.tpl.spellCantrip'), { actor, spell });
  }
  return fillTemplate(t('journal.tpl.spellCast'), {
    actor,
    spell,
    level,
    slot: payloadNumber(p, 'slotConsumed'),
  });
};
