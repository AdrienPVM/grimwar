import { useMemo, useState, type JSX } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { t } from '@/shared/lib/i18n';
import {
  currentResourceValue,
  deriveClassResourcePools,
  type ClassResourcePool,
} from '@/shared/lib/rules/class-resources';
import { cn } from '@/shared/lib/cn';
import type { Character } from '@/shared/types/character';

import { useUpdateCharacter } from '../../use-update-character';

interface ClassResourcesCardProps {
  character: Character;
  readOnly?: boolean;
}

interface ResolvedPool extends ClassResourcePool {
  /** Libellé FR résolu. */
  label: string;
  /** Valeur courante (lue dans `classResources`, défaut = max). */
  current: number;
}

/**
 * Carte « Réserves de classe » du mode Combat.
 *
 * Surface les réserves CONSOMMABLES de classe (Rage, Second souffle, Conduit
 * divin, Imposition des mains, Points de sorcellerie…) dérivées de
 * `classResourceProgression` + niveau, via `deriveClassResourcePools`. Le
 * wizard pose `classResources: {}` — ces réserves n'étaient donc jamais
 * affichées ni jouables.
 *
 * Chaque réserve est un compteur `current / max` avec deux boutons :
 * « Dépenser » (−1, désactivé à 0) et « Récupérer » (+1, désactivé au max).
 * L'écriture passe par `updateCharacter` (diff auto, pas de nouveau type
 * d'événement) ; la clé de stockage `classId:resourceKey` est multiclasse-safe.
 *
 * Le bouton « Récupérer » permet aussi de corriger une dépense manuelle ; la
 * réinitialisation automatique au repos (court/long) relève d'un plan dédié
 * (repos long = variant-dépendant). Le badge court/long sous le nom indique
 * quel repos rend la réserve.
 *
 * Lecture seule (PJ mort / lecture MJ) ⇒ pas de boutons. Disparaît (null) si le
 * personnage n'a aucune réserve consommable.
 */
export function ClassResourcesCard({
  character,
  readOnly = false,
}: ClassResourcesCardProps): JSX.Element | null {
  const { data: classes } = useContent('classes');
  const { updateCharacter, isUpdating } = useUpdateCharacter(character);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const pools = useMemo<ResolvedPool[]>(
    () =>
      deriveClassResourcePools(character, classes).map((pool) => ({
        ...pool,
        label: t(pool.labelKey),
        current: currentResourceValue(character, pool),
      })),
    [character, classes],
  );

  if (pools.length === 0) return null;

  async function setResource(pool: ResolvedPool, next: number): Promise<void> {
    if (readOnly || isUpdating) return;
    const clamped = Math.max(0, Math.min(pool.max, next));
    if (clamped === pool.current) return;
    setBusyKey(pool.storageKey);
    try {
      await updateCharacter({
        classResources: {
          ...character.classResources,
          [pool.storageKey]: { current: clamped, max: pool.max, restoresOn: pool.restoresOn },
        },
      });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h3>{t('sheet.combat.resources.title')}</h3>
      </CardHeader>
      <ul className="flex flex-col gap-2">
        {pools.map((pool) => {
          const busy = busyKey === pool.storageKey;
          const canSpend = !readOnly && pool.current > 0;
          const canRestore = !readOnly && pool.current < pool.max;
          return (
            <li
              key={pool.storageKey}
              className="flex items-center justify-between gap-3 rounded-card-sm border border-white-8 bg-white/[0.02] px-4 py-3"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-display text-[15px] text-gold-bright">
                  {pool.label}
                </span>
                <span className="font-title text-[10px] font-bold uppercase tracking-[0.18em] text-text-tertiary">
                  {pool.restoresOn === 'short'
                    ? t('sheet.combat.resources.restoresShort')
                    : t('sheet.combat.resources.restoresLong')}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => void setResource(pool, pool.current - 1)}
                    disabled={isUpdating || !canSpend}
                    aria-label={t('sheet.combat.resources.spendLabel').replace(
                      '{resource}',
                      pool.label,
                    )}
                    className="grid size-8 place-items-center rounded-pill border border-rose/40 bg-rose/10 font-display text-[18px] font-black text-rose transition-all duration-200 ease-base hover:border-rose hover:bg-rose/20 disabled:opacity-30"
                  >
                    −
                  </button>
                )}
                <span
                  className={cn(
                    'min-w-[3.2rem] text-center font-display text-[20px] font-black tracking-[-0.02em] text-text',
                    busy && 'opacity-50',
                  )}
                >
                  {pool.current}
                  <span className="text-text-tertiary"> / {pool.max}</span>
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => void setResource(pool, pool.current + 1)}
                    disabled={isUpdating || !canRestore}
                    aria-label={t('sheet.combat.resources.restoreLabel').replace(
                      '{resource}',
                      pool.label,
                    )}
                    className="grid size-8 place-items-center rounded-pill border border-teal/40 bg-teal/10 font-display text-[18px] font-black text-teal transition-all duration-200 ease-base hover:border-teal hover:bg-teal/20 disabled:opacity-30"
                  >
                    +
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
