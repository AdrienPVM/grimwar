import { useMemo, useState, type JSX } from 'react';

import { useDice } from '@/features/dice/use-dice';
import { Card, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { abilityModifier } from '@/shared/lib/rules/abilities';
import { applyHitDieSpend } from '@/shared/lib/rules/short-rest';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Character, HitDicePool } from '@/shared/types/character';

import { useUpdateCharacter } from '../../use-update-character';

interface HitDiceCardProps {
  character: Character;
  readOnly?: boolean;
}

interface ResolvedPool extends HitDicePool {
  className: string;
}

/** Formule de soin d'un dé de vie : `1dX` + mod CON signé (ex. `1d10+2`). */
function hitDieFormula(die: string, conMod: number): string {
  if (conMod > 0) return `1${die}+${conMod}`;
  if (conMod < 0) return `1${die}${conMod}`;
  return `1${die}`;
}

/**
 * Carte « Dés de vie » du mode Combat.
 *
 * Affiche le pool de dés de vie par classe (`character.hitDice[]`, posé au
 * wizard / montée de niveau) — invisible jusqu'ici. Chaque pool propose un
 * **repos court** : dépenser un dé pour regagner `1dX + mod CON` PV.
 *
 * Le tirage passe par `useDice().rollExpression` → respecte le mode de dés du
 * joueur (digital = l'app lance ; physique = saisie des faces, « Passer »
 * possible → null). L'application (PV capés + décrément du dé) est déléguée à
 * `applyHitDieSpend` (pur, testable). Aucun nouveau type d'événement : le jet
 * est journalisé par le moteur de dés et le gain de PV par le diff auto de
 * `updateCharacter` (`hp-change`).
 *
 * Périmètre : repos COURT uniquement. Le repos long (réinitialisations +
 * variantes slowHealing / grittyRealism) relève d'un plan dédié. Lecture seule
 * (PJ mort / lecture MJ) ⇒ pas de dépense. Bouton masqué à PV pleins (un dé
 * dépensé pour +0 serait un gaspillage).
 *
 * Disparaît (null) si le personnage n'a aucun dé de vie.
 */
export function HitDiceCard({ character, readOnly = false }: HitDiceCardProps): JSX.Element | null {
  const { data: classes } = useContent('classes');
  const { rollExpression } = useDice();
  const { updateCharacter, isUpdating } = useUpdateCharacter(character);
  const [spendingClassId, setSpendingClassId] = useState<string | null>(null);

  const pools = useMemo<ResolvedPool[]>(
    () =>
      character.hitDice.map((pool) => {
        const cls = classes.find((c) => c.id === pool.classId);
        return { ...pool, className: cls ? localize(cls.name) : pool.classId };
      }),
    [classes, character.hitDice],
  );

  if (pools.length === 0) return null;

  const conMod = abilityModifier(character.abilities.con);
  const atFullHp = character.hp.current >= character.hp.max;

  async function spendHitDie(pool: ResolvedPool): Promise<void> {
    if (readOnly || isUpdating) return;
    setSpendingClassId(pool.classId);
    try {
      const formula = hitDieFormula(pool.die, conMod);
      const result = await rollExpression(formula, {
        label: t('sheet.combat.hitDice.restToast'),
        characterId: character.id,
        kind: 'custom',
        silent: true,
      });
      // Mode physique : le joueur a « Passé » → on ne dépense rien.
      if (!result) return;
      const applied = applyHitDieSpend(character, pool.classId, result.total);
      if (!applied) return;
      await updateCharacter(applied.patch);
      showToast({
        kind: 'heal',
        title: t('sheet.combat.hitDice.restToast'),
        big: `+${applied.healedBy}`,
        sub: `${pool.className} · ${formula} = ${result.total}`,
      });
    } finally {
      setSpendingClassId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h3>{t('sheet.combat.hitDice.title')}</h3>
      </CardHeader>
      <ul className="flex flex-col gap-2">
        {pools.map((pool) => {
          const canSpend = !readOnly && pool.current > 0 && !atFullHp;
          return (
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
              <span className="flex shrink-0 items-center gap-3">
                <span className="font-display text-[20px] font-black tracking-[-0.02em] text-text">
                  {pool.current}
                  <span className="text-text-tertiary"> / {pool.max}</span>
                </span>
                {canSpend && (
                  <button
                    type="button"
                    onClick={() => void spendHitDie(pool)}
                    disabled={isUpdating}
                    aria-label={t('sheet.combat.hitDice.spendLabel').replace(
                      '{class}',
                      pool.className,
                    )}
                    className="rounded-pill border border-teal/40 bg-teal/10 px-3 py-1.5 font-title text-[10px] font-bold uppercase tracking-[0.16em] text-teal transition-all duration-200 ease-base hover:border-teal hover:bg-teal/20 disabled:opacity-50"
                  >
                    {spendingClassId === pool.classId
                      ? t('sheet.combat.hitDice.spending')
                      : t('sheet.combat.hitDice.spend')}
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
