import { useState, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { GlassPanel } from '@/shared/components/glass-panel';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';

import type { HandoffRow } from './encounter-handoff';

/** Cible applicable d'un jet de dégâts (monstre / PNJ — jamais un PJ). */
export interface HandoffTarget {
  instanceId: string;
  name: string;
}

interface EncounterHandoffPanelProps {
  /** Jets physiques récents (damage applicable, attack informatif). */
  rows: HandoffRow[];
  /** Participants non-joueurs : cibles possibles d'une application de dégâts. */
  targets: HandoffTarget[];
  /** Écriture Firestore en cours — désactive les actions. */
  pending: boolean;
  /** Applique `total` PV de dégâts à `targetInstanceId` puis ignore l'event. */
  onApply: (eventId: string, total: number, targetInstanceId: string) => void;
  /** Retire l'event du panneau (sans appliquer). */
  onDismiss: (eventId: string) => void;
}

/**
 * Panneau de hand-off des dégâts physiques (JALON 24.4, step 7b) — MJ-only,
 * affiché en combat quand des jets physiques récents existent.
 *
 * Chaque ligne `damage` propose « Appliquer à… » → une grille de cibles
 * (monstres / PNJ) ; un tap applique le total aux PV de la cible (le MJ choisit,
 * jamais le joueur) puis l'event quitte le panneau. Les lignes `attack` sont
 * informatives (le total se compare à la CA de mémoire — pas de champ `ac` sur
 * le participant) et se ferment via « Ignorer ».
 */
export function EncounterHandoffPanel({
  rows,
  targets,
  pending,
  onApply,
  onDismiss,
}: EncounterHandoffPanelProps): JSX.Element {
  // eventId de la ligne dont le sélecteur de cible est déplié (une à la fois).
  const [pickingForId, setPickingForId] = useState<string | null>(null);

  return (
    <GlassPanel
      as="section"
      aria-label={t('encounters.handoff.aria')}
      className="mt-6 w-full px-5 py-4"
    >
      <header className="flex flex-col gap-1">
        <h2 className="font-title text-meta uppercase tracking-[0.18em] text-gold-bright">
          {t('encounters.handoff.title')}
        </h2>
        <p className="font-serif text-body-sm text-text-secondary">
          {t('encounters.handoff.help')}
        </p>
      </header>

      <ul className="mt-4 flex flex-col gap-3">
        {rows.map((row) => {
          const actor = row.actorName ?? t('encounters.handoff.unknownActor');
          const isPicking = pickingForId === row.eventId;
          const isDamage = row.rollKind === 'damage';
          return (
            <li
              key={row.eventId}
              className="rounded-card-sm border border-white-8 bg-bg-3/40 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="font-serif text-body text-text">{actor}</span>
                  {row.weaponLabel ? (
                    <span className="truncate font-serif text-body-sm text-text-secondary">
                      · {row.weaponLabel}
                    </span>
                  ) : null}
                  <Chip variant="damage">
                    {isDamage
                      ? `${row.total} ${t('encounters.handoff.damageSuffix')}`
                      : `${t('encounters.handoff.attackPrefix')} ${row.total}`}
                  </Chip>
                </div>

                <div className="flex items-center gap-2">
                  {isDamage ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        setPickingForId((cur) => (cur === row.eventId ? null : row.eventId))
                      }
                      aria-expanded={isPicking}
                    >
                      {t('encounters.handoff.apply')}
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      setPickingForId((cur) => (cur === row.eventId ? null : cur));
                      onDismiss(row.eventId);
                    }}
                    aria-label={`${t('encounters.handoff.dismiss')} — ${actor}`}
                  >
                    {t('encounters.handoff.dismiss')}
                  </Button>
                </div>
              </div>

              {!isDamage ? (
                <p className="mt-2 font-serif text-body-sm italic text-text-tertiary">
                  {t('encounters.handoff.attackInfo')}
                </p>
              ) : null}

              {isDamage && isPicking ? (
                <div className="mt-3 flex flex-col gap-2">
                  <span className="font-title text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                    {t('encounters.handoff.chooseTarget')}
                  </span>
                  {targets.length === 0 ? (
                    <p className="font-serif text-body-sm italic text-text-tertiary">
                      {t('encounters.handoff.noTargets')}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {targets.map((target) => (
                        <button
                          key={target.instanceId}
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            onApply(row.eventId, row.total, target.instanceId);
                            setPickingForId(null);
                          }}
                          className={cn(
                            'rounded-pill border border-crimson/40 bg-crimson/[0.06] px-3 py-1',
                            'font-title text-[10px] font-bold uppercase tracking-[0.12em] text-crimson',
                            'transition-colors duration-200 ease-base hover:border-crimson hover:bg-crimson/15',
                            'disabled:cursor-not-allowed disabled:opacity-40',
                          )}
                        >
                          {target.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </GlassPanel>
  );
}
