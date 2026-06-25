import { useMemo, type JSX } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import type { Character, HitDicePool } from '@/shared/types/character';

interface HitDiceCardProps {
  character: Character;
}

interface ResolvedPool extends HitDicePool {
  className: string;
}

/**
 * Carte « Dés de vie » du mode Combat.
 *
 * Le pool de dés de vie (`character.hitDice[]`, un par classe) était stocké
 * (posé au wizard + montée de niveau) mais affiché NULLE PART. À une table en
 * présentiel, le MJ arbitre les repos courts à la main : il a besoin de VOIR le
 * pool disponible (`courant / max`) et le type de dé par classe. Lecture seule
 * pour l'instant — la dépense au repos court (jet du dé + mod CON → soin) et le
 * repos long (réinitialisations) relèvent d'un plan « repos » dédié.
 *
 * Le nom de classe est résolu depuis `classes.json` (jamais de constante
 * in-file). Disparaît (null) si le personnage n'a aucun dé de vie.
 */
export function HitDiceCard({ character }: HitDiceCardProps): JSX.Element | null {
  const { data: classes } = useContent('classes');

  const pools = useMemo<ResolvedPool[]>(
    () =>
      character.hitDice.map((pool) => {
        const cls = classes.find((c) => c.id === pool.classId);
        return { ...pool, className: cls ? localize(cls.name) : pool.classId };
      }),
    [classes, character.hitDice],
  );

  if (pools.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <h3>{t('sheet.combat.hitDice.title')}</h3>
      </CardHeader>
      <ul className="flex flex-col gap-2">
        {pools.map((pool) => (
          <li
            key={pool.classId}
            className="flex items-center justify-between gap-3 rounded-card-sm border border-white-8 bg-white/[0.02] px-4 py-3"
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-display text-[15px] text-gold-bright">
                {pool.className}
              </span>
              <span className="font-title text-[10px] font-bold uppercase tracking-[0.18em] text-text-tertiary">
                {pool.max}
                {pool.die}
              </span>
            </span>
            <span className="shrink-0 font-display text-[20px] font-black tracking-[-0.02em] text-text">
              {pool.current}
              <span className="text-text-tertiary"> / {pool.max}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
