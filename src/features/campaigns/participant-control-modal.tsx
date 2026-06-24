import { useMemo, useState, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { DetailModal } from '@/shared/components/detail-modal';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import type { Condition } from '@/shared/types/content';
import type { EncounterParticipant } from '@/shared/types/encounter';

import { hpBarColor, hpRatio } from './encounter-hp';

interface ParticipantControlModalProps {
  participant: EncounterParticipant;
  /** Catalogue des états SRD (∪ custom) — rendu en grille de bascule. */
  conditions: readonly Condition[];
  /** Action en cours (écriture Firestore) — désactive les contrôles. */
  pending: boolean;
  /** Applique un delta de PV (négatif = dégâts, positif = soin). */
  onApplyHp: (delta: number) => void;
  /** Pose/retire un état (slug de `conditions.json`). */
  onToggleCondition: (condition: string, action: 'add' | 'remove') => void;
  onClose: () => void;
}

/** Montants rapides proposés (dégâts/soin en un tap). */
const QUICK_AMOUNTS = [1, 5, 10] as const;

/**
 * Modale de contrôle MJ d'un participant non-joueur (monstre / PNJ) — JALON 24.4
 * step 7. Le MJ ajuste les PV (dégâts/soin, journalisés `monster-hp-change`,
 * visibilité `dm`) et pose/retire des états (persistés sur le doc partagé, sans
 * event dédié — aucun kind `monster-condition-change` n'existe).
 *
 * Réservée aux participants DM-contrôlés (`type !== 'player'`) : les PV d'un PJ
 * se gèrent sur sa fiche (event `hp-change` sur la fiche), pas ici. La défense
 * ultime reste la rule d'écriture `isDMOf` sur le doc rencontre.
 *
 * Le `participant` est dérivé en live du doc (`onSnapshot`) côté écran : les PV
 * et états affichés ici se mettent à jour après chaque application.
 */
export function ParticipantControlModal({
  participant,
  conditions,
  pending,
  onApplyHp,
  onToggleCondition,
  onClose,
}: ParticipantControlModalProps): JSX.Element {
  const [amount, setAmount] = useState<number>(1);

  const titleId = `participant-control-${participant.instanceId}`;
  const ratio = hpRatio(participant.currentHp, participant.maxHp);
  const hpPercent = Math.round(ratio * 100);
  const activeSet = useMemo(() => new Set(participant.conditions), [participant.conditions]);

  // Montant saisi borné > 0 (un montant ≤ 0 n'a pas de sens pour dégâts/soin).
  const safeAmount = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;

  return (
    <DetailModal
      open
      onClose={onClose}
      titleId={titleId}
      closeLabel={t('encounters.control.closeAria')}
      className="max-w-[440px]"
    >
      <div className="flex flex-col gap-6 px-5 py-6 pr-12">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Chip variant="damage">{t('encounters.participant.typeMonster')}</Chip>
          </div>
          <h2
            id={titleId}
            className="font-display text-xl font-bold uppercase tracking-[0.12em] text-gold-bright"
          >
            {participant.name}
          </h2>
        </header>

        {/* ─── PV ─────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h3 className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
              {t('encounters.control.hpTitle')}
            </h3>
            <span className="font-serif text-body tabular-nums text-text">
              {participant.currentHp}/{participant.maxHp}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-300 ease-base',
                hpBarColor(ratio),
              )}
              style={{ width: `${hpPercent}%` }}
            />
          </div>

          <div className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="font-title text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                {t('encounters.control.amount')}
              </span>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={Number.isFinite(amount) ? amount : ''}
                onChange={(e) => setAmount(e.target.valueAsNumber)}
                aria-label={t('encounters.control.amount')}
                className="w-full rounded-pill border border-white-8 bg-bg-3/60 px-4 py-2 font-serif text-body tabular-nums text-text outline-none transition-colors focus:border-gold"
              />
            </label>
            <Button
              variant="secondary"
              size="md"
              onClick={() => onApplyHp(-safeAmount)}
              disabled={pending || safeAmount === 0}
              className="border-crimson/50 text-crimson hover:border-crimson"
            >
              − {t('encounters.control.damage')}
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => onApplyHp(safeAmount)}
              disabled={pending || safeAmount === 0}
              className="border-teal/50 text-teal hover:border-teal"
            >
              + {t('encounters.control.heal')}
            </Button>
          </div>

          {/* Montants rapides : un tap = dégâts (−) ou soin (+). */}
          <div className="flex flex-wrap items-center gap-2">
            {QUICK_AMOUNTS.map((q) => (
              <button
                key={`dmg-${q}`}
                type="button"
                disabled={pending}
                onClick={() => onApplyHp(-q)}
                className="rounded-pill border border-crimson/30 bg-crimson/[0.06] px-3 py-1 font-title text-meta font-bold tabular-nums text-crimson transition-colors duration-200 ease-base hover:border-crimson hover:bg-crimson/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                −{q}
              </button>
            ))}
            {QUICK_AMOUNTS.map((q) => (
              <button
                key={`heal-${q}`}
                type="button"
                disabled={pending}
                onClick={() => onApplyHp(q)}
                className="rounded-pill border border-teal/30 bg-teal/[0.06] px-3 py-1 font-title text-meta font-bold tabular-nums text-teal transition-colors duration-200 ease-base hover:border-teal hover:bg-teal/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                +{q}
              </button>
            ))}
          </div>
        </section>

        {/* ─── États ──────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <h3 className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {t('encounters.control.conditionsTitle')}
          </h3>
          {conditions.length === 0 ? (
            <p className="font-serif text-body-sm italic text-text-tertiary">
              {t('encounters.control.noConditions')}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {conditions.map((c) => {
                const active = activeSet.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={pending}
                    aria-pressed={active}
                    onClick={() => onToggleCondition(c.id, active ? 'remove' : 'add')}
                    className={cn(
                      'rounded-pill border px-3 py-1 font-title text-[10px] font-bold uppercase tracking-[0.14em]',
                      'transition-colors duration-200 ease-base',
                      'disabled:cursor-not-allowed disabled:opacity-40',
                      active
                        ? 'border-crimson bg-crimson/15 text-crimson hover:bg-crimson/25'
                        : 'border-white-8 bg-white/[0.04] text-text-secondary hover:border-gold-bright hover:text-gold-bright',
                    )}
                  >
                    {localize(c.name)}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DetailModal>
  );
}
