import { type JSX } from 'react';

import { GlassPanel } from '@/shared/components/glass-panel';
import { t } from '@/shared/lib/i18n';

import type { PartyAggregate } from './use-party-aggregate';

interface PartyAggregateStripProps {
  aggregate: PartyAggregate;
}

/**
 * Bande « compagnie en un coup d'œil » affichée au meneur, au-dessus des cartes
 * de membres. Résume l'effectif, le niveau moyen et l'éventail de niveaux — les
 * métriques que le MJ regarde pour jauger le groupe et budgéter une rencontre
 * (SRD 5.2.1, difficulté dérivée de l'effectif × niveaux). Une puce d'alerte
 * signale les personnages à terre.
 *
 * Rendu conditionnel : rien à afficher tant qu'aucune fiche liée n'est chargée
 * (`count === 0`) — le bloc « premier pas » d'invitation couvre déjà le cas
 * « aucun joueur ». Les valeurs se mettent à jour en direct (fiches live).
 */
export function PartyAggregateStrip({
  aggregate,
}: PartyAggregateStripProps): JSX.Element | null {
  if (aggregate.count === 0) return null;

  // Éventail : un seul chiffre si toute la compagnie est au même niveau, sinon
  // « min–max » (tiret demi-cadratin, pas un trait d'union).
  const levelRange =
    aggregate.minLevel === aggregate.maxLevel
      ? `${aggregate.minLevel}`
      : `${aggregate.minLevel}–${aggregate.maxLevel}`;

  return (
    <GlassPanel
      className="mt-4 flex flex-wrap items-center justify-center gap-2.5 px-4 py-3"
      aria-label={t('campaigns.detail.partyAggregate.aria')}
    >
      <AggStat
        label={t('campaigns.detail.partyAggregate.size')}
        value={`${aggregate.count}`}
      />
      <AggStat
        label={t('campaigns.detail.partyAggregate.avgLevel')}
        value={aggregate.averageLevel === null ? '—' : `${aggregate.averageLevel}`}
      />
      <AggStat
        label={t('campaigns.detail.partyAggregate.levelRange')}
        value={levelRange}
      />
      {aggregate.downedCount > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-pill border border-crimson/40 bg-crimson/10 px-3 py-1.5 font-title text-[10px] font-bold uppercase tracking-[0.14em] text-crimson">
          {t('campaigns.detail.partyAggregate.downed')} · {aggregate.downedCount}
        </span>
      ) : null}
    </GlassPanel>
  );
}

/** Bloc statistique compact — même langage visuel que `PartyStat` des cartes. */
function AggStat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex min-w-[64px] flex-col items-center rounded-card-sm border border-white-8 bg-ink/40 px-3 py-1.5">
      <span className="font-title text-[9px] font-bold uppercase tracking-[0.14em] text-text-tertiary">
        {label}
      </span>
      <span className="font-display text-lg font-semibold leading-tight text-gold-bright">
        {value}
      </span>
    </div>
  );
}
