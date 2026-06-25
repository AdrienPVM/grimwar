import { useMemo, useState, type JSX } from 'react';

import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { canViewEvent } from '@/shared/lib/permissions';
import type { Membership } from '@/shared/types/campaign';
import type { GameEvent } from '@/shared/types/event';

import { EventDetailModal } from './event-detail-modal';
import { formatEventTime, summarizeEvent } from './event-line';
import { useLinkedCharacterNames } from './use-linked-character-names';
import { useSessionEvents } from './use-session-events';

interface SessionEventsTabProps {
  campaignId: string;
  sessionId: string;
  /** Le spectateur est-il MJ de cette campagne ? (contraint la query + `canViewEvent`) */
  isDM: boolean;
  /** UID du spectateur (filtrage `canViewEvent`). */
  viewerUid: string;
  /** IDs des persos que le spectateur possède dans cette campagne (filtre `self`). */
  myCharacterIds: readonly string[];
  /** Membres de la campagne — résolution des noms d'acteur/cible. */
  members: Membership[];
}

/** Filtre par type d'événement de l'onglet (audit). */
type KindFilter = 'all' | 'dm-edit';

/**
 * Onglet « Events » de l'écran de séance (plan 26 step 7) — premier rendu réel de
 * cet onglet (placeholder jusque-là). Affiche les événements de LA séance en
 * temps réel, avec un filtre par type orienté audit : « Tous » / « Éditions MJ »
 * (`dm-edit`). Newest-first (la query est chronologique ASC, on inverse à
 * l'affichage). Chaque ligne ouvre le détail (`EventDetailModal`).
 *
 * Le filtre `dm-edit` est appliqué CÔTÉ CLIENT (pas un index dédié) ; la query
 * reste contrainte à la visibilité « provably-read » du rôle (barrière =
 * rules + query, `canViewEvent` = affinage d'affichage).
 */
export function SessionEventsTab({
  campaignId,
  sessionId,
  isDM,
  viewerUid,
  myCharacterIds,
  members,
}: SessionEventsTabProps): JSX.Element {
  const { events, isLoading, error } = useSessionEvents(campaignId, sessionId, {
    isDM,
  });
  const characterNames = useLinkedCharacterNames(members);
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [detailEvent, setDetailEvent] = useState<GameEvent | null>(null);

  // Affinage d'affichage : visibilité (canViewEvent) + filtre de type. Newest-first.
  const shownEvents = useMemo(() => {
    const visible = events.filter((ev) =>
      canViewEvent(ev, { uid: viewerUid, isDM, myCharacterIds }),
    );
    const filtered =
      kindFilter === 'dm-edit'
        ? visible.filter((ev) => ev.kind === 'dm-edit')
        : visible;
    return [...filtered].reverse();
  }, [events, viewerUid, isDM, myCharacterIds, kindFilter]);

  return (
    <section aria-label={t('sessions.events.title')}>
      <div
        role="group"
        aria-label={t('sessions.events.filter.aria')}
        className="flex flex-wrap justify-center gap-2"
      >
        <FilterChip
          label={t('sessions.events.filter.all')}
          active={kindFilter === 'all'}
          onClick={() => setKindFilter('all')}
        />
        <FilterChip
          label={t('sessions.events.filter.dmEdits')}
          active={kindFilter === 'dm-edit'}
          onClick={() => setKindFilter('dm-edit')}
        />
      </div>

      <div className="mt-4">
        {isLoading ? (
          <p className="py-6 text-center font-serif text-body-sm text-text-tertiary">
            {t('sessions.events.loading')}
          </p>
        ) : error ? (
          <p className="py-6 text-center font-serif text-body-sm text-crimson">
            {t('sessions.events.error')}
          </p>
        ) : shownEvents.length === 0 ? (
          <p className="py-6 text-center font-serif text-body-sm italic text-text-tertiary">
            {t('sessions.events.empty')}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {shownEvents.map((ev) => (
              <EventRow key={ev.id} event={ev} onOpen={() => setDetailEvent(ev)} />
            ))}
          </ul>
        )}
      </div>

      <EventDetailModal
        event={detailEvent}
        characterNames={characterNames}
        onClose={() => setDetailEvent(null)}
      />
    </section>
  );
}

/** Pastille de filtre (toggle) — dorée quand active, sobre sinon. */
function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'max-w-[12rem] truncate rounded-full border px-3 py-1.5',
        'font-title text-meta uppercase tracking-[0.14em]',
        'transition-colors duration-200 ease-base',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40',
        active
          ? 'border-gold-bright/60 bg-gold-bright/15 text-gold-bright'
          : 'border-white-8 bg-bg-3/40 text-text-tertiary hover:border-soft hover:text-text-secondary',
      )}
    >
      {label}
    </button>
  );
}

function EventRow({
  event,
  onOpen,
}: {
  event: GameEvent;
  onOpen: () => void;
}): JSX.Element {
  const { kindLabel, detail } = summarizeEvent(event);
  const time = formatEventTime(event.createdAt);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${t('campaigns.detail.eventFeed.openDetail')} — ${kindLabel}`}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-card-sm border border-white-8 bg-bg-3/40 px-4 py-3 text-left',
          'transition-colors duration-200 ease-base',
          'hover:border-soft hover:bg-bg-3/70',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40',
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-title text-meta uppercase tracking-[0.14em] text-gold-bright">
            {kindLabel}
          </span>
          {detail !== null ? (
            <span className="truncate font-serif text-body-sm text-text-secondary">
              {detail}
            </span>
          ) : null}
        </span>
        {time !== '' ? (
          <time className="shrink-0 font-mono text-meta tracking-[0.12em] text-text-tertiary">
            {time}
          </time>
        ) : null}
      </button>
    </li>
  );
}
