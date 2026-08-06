import { t } from '@/shared/lib/i18n';
import type { GameEvent } from '@/shared/types/event';

import type { JournalContext, JournalTemplate } from './context';
import { fillTemplate } from './fill';
import { payloadBool, payloadNumber, payloadString } from './payload';

/**
 * Templates des jalons de vie d'un personnage (M44) : montée de niveau, mort,
 * retour à la vie, repos.
 *
 * Ces quatre kinds étaient déclarés au schéma sans template ni logger — le
 * journal savait raconter chaque point de vie perdu et rien de ce qu'on relit
 * six mois plus tard. Ils forment une catégorie à part des templates de diff de
 * fiche (`character.ts`) : ils ne décrivent pas un changement de valeur mais un
 * événement de récit.
 */

function actorName(ctx: JournalContext, characterId: string | null): string {
  return ctx.resolveCharacterName(characterId) ?? t('journal.actor.someone');
}

export const levelUpTemplate: JournalTemplate = (event: GameEvent, ctx) => {
  const p = event.payload;
  const actor = actorName(ctx, event.actorCharacterId);
  const className = payloadString(p, 'className');
  const level = payloadNumber(p, 'newLevel');
  // Payload partiel (event antérieur à M44, ou logger futur incomplet) : mieux
  // vaut une phrase courte et vraie qu'une parenthèse « (— 1) » qui n'informe
  // de rien. Même principe que le repli d'acteur non résolu.
  if (className === '') {
    return fillTemplate(t('journal.tpl.levelUpNoClass'), { actor, level });
  }
  // Ouvrir une nouvelle classe et progresser dans une classe existante ne se
  // racontent pas pareil — « devient aussi Roublard » vs « passe Roublard 3 ».
  const isNewClass = payloadBool(p, 'isNewClass');
  return fillTemplate(t(isNewClass ? 'journal.tpl.levelUpNewClass' : 'journal.tpl.levelUp'), {
    actor,
    level,
    className,
    classLevel: payloadNumber(p, 'classLevel', 1),
  });
};

export const xpGainTemplate: JournalTemplate = (event: GameEvent, ctx) => {
  const p = event.payload;
  const actor = actorName(ctx, event.actorCharacterId);
  const delta = payloadNumber(p, 'delta');
  const total = payloadNumber(p, 'total');
  // Un delta négatif est une CORRECTION du meneur, pas un gain : le raconter
  // comme un gain de « −200 PX » serait illisible.
  if (delta < 0) {
    return fillTemplate(t('journal.tpl.xpLoss'), { actor, amount: Math.abs(delta), total });
  }
  return fillTemplate(t('journal.tpl.xpGain'), { actor, amount: delta, total });
};

export const deathTemplate: JournalTemplate = (event: GameEvent, ctx) => {
  const actor = actorName(ctx, event.actorCharacterId);
  const byDm = payloadString(event.payload, 'cause') === 'dm';
  return fillTemplate(t(byDm ? 'journal.tpl.deathByDm' : 'journal.tpl.death'), { actor });
};

export const revivalTemplate: JournalTemplate = (event: GameEvent, ctx) => {
  const actor = actorName(ctx, event.actorCharacterId);
  // Se relever sur un 20 naturel est un moment de table ; être ressuscité par
  // le meneur en est un autre. Les confondre appauvrirait le récit.
  const nat20 = payloadString(event.payload, 'source') === 'nat20';
  return fillTemplate(t(nat20 ? 'journal.tpl.revivalNat20' : 'journal.tpl.revivalDm'), {
    actor,
  });
};

export const restTemplate: JournalTemplate = (event: GameEvent, ctx) => {
  const p = event.payload;
  const actor = actorName(ctx, event.actorCharacterId);
  const isLong = payloadString(p, 'type') === 'long';
  const hpHealed = payloadNumber(p, 'hpHealed', 0);
  // Le bilan chiffré n'est ajouté que s'il dit quelque chose : « récupère 0 PV »
  // est du bruit, et un repos court n'en soigne jamais.
  if (isLong && hpHealed > 0) {
    return fillTemplate(t('journal.tpl.restLongHealed'), { actor, hp: hpHealed });
  }
  return fillTemplate(t(isLong ? 'journal.tpl.restLong' : 'journal.tpl.restShort'), {
    actor,
  });
};
