import { useMemo, useState, type JSX } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { t } from '@/shared/lib/i18n';
import {
  currentResourceValue,
  deriveClassResourcePools,
  effectiveResourceMax,
  type ClassResourcePool,
} from '@/shared/lib/rules/class-resources';
import { cn } from '@/shared/lib/cn';
import type { Character } from '@/shared/types/character';

import { useUpdateCharacter } from '../../use-update-character';

/**
 * Plafond de saisie d'un maximum de réserve. Généreux — une table maison peut
 * accorder beaucoup — mais fini : c'est un garde-fou contre la faute de frappe,
 * pas une règle.
 */
const MAX_RESOURCE_CEILING = 99;

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
  const [editingMax, setEditingMax] = useState<string | null>(null);

  const pools = useMemo<ResolvedPool[]>(
    () =>
      deriveClassResourcePools(character, classes).map((pool) => ({
        ...pool,
        label: t(pool.labelKey),
        // Le max AFFICHÉ est l'effectif (progression ∪ accordé), pas le dérivé :
        // sinon une Rage supplémentaire accordée par le MJ resterait invisible.
        max: effectiveResourceMax(character, pool),
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
          // `pool.max` est ici l'EFFECTIF : réécrire le max dérivé effaçait à
          // chaque dépense le maximum accordé à la table.
          [pool.storageKey]: { current: clamped, max: pool.max, restoresOn: pool.restoresOn },
        },
      });
    } finally {
      setBusyKey(null);
    }
  }

  /** Édite le MAXIMUM d'une réserve — le plafond n'appartient pas qu'aux règles. */
  async function setResourceMax(pool: ResolvedPool, nextMax: number): Promise<void> {
    if (readOnly || isUpdating) return;
    const clamped = Math.max(0, Math.min(MAX_RESOURCE_CEILING, nextMax));
    if (clamped === pool.max) return;
    setBusyKey(pool.storageKey);
    try {
      await updateCharacter({
        classResources: {
          ...character.classResources,
          [pool.storageKey]: {
            // Baisser le plafond sous la valeur courante rabat celle-ci : une
            // réserve à 5/3 n'a aucun sens.
            current: Math.min(pool.current, clamped),
            max: clamped,
            restoresOn: pool.restoresOn,
          },
        },
      });
    } finally {
      setBusyKey(null);
      setEditingMax(null);
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
                {editingMax === pool.storageKey ? (
                  <input
                    type="number"
                    min={0}
                    max={MAX_RESOURCE_CEILING}
                    autoFocus
                    defaultValue={pool.max}
                    aria-label={t('sheet.combat.resources.editMaxLabel').replace(
                      '{resource}',
                      pool.label,
                    )}
                    data-testid={`resource-max-input-${pool.storageKey}`}
                    onBlur={(e) => void setResourceMax(pool, Number(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                      if (e.key === 'Escape') setEditingMax(null);
                    }}
                    className="w-[3.4rem] rounded-card-sm border border-gold-dim bg-ink/40 px-1 py-0.5 text-center font-display text-[18px] font-black text-gold-bright focus:outline-none"
                  />
                ) : readOnly ? (
                  // En lecture seule, le compteur redevient un simple texte :
                  // un bouton désactivé promet une action qui n'existe pas.
                  <span
                    className={cn(
                      'min-w-[3.2rem] text-center font-display text-[20px] font-black tracking-[-0.02em] text-text',
                      busy && 'opacity-50',
                    )}
                  >
                    {pool.current}
                    <span className="text-text-tertiary"> / {pool.max}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingMax(pool.storageKey)}
                    aria-label={t('sheet.combat.resources.editMaxLabel').replace(
                      '{resource}',
                      pool.label,
                    )}
                    data-testid={`resource-max-${pool.storageKey}`}
                    className={cn(
                      'min-w-[3.2rem] rounded-card-sm text-center font-display text-[20px] font-black tracking-[-0.02em] text-text transition-colors duration-200 ease-base hover:text-gold-bright',
                      busy && 'opacity-50',
                    )}
                  >
                    {pool.current}
                    <span className="text-text-tertiary"> / {pool.max}</span>
                  </button>
                )}
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
