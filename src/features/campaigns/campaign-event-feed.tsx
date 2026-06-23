import { useMemo, useState, type JSX } from 'react';

import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { canViewEvent } from '@/shared/lib/permissions';
import type { Membership } from '@/shared/types/campaign';
import type { GameEvent } from '@/shared/types/event';

import { formatUid } from './campaign-detail-screen';
import { EventDetailModal } from './event-detail-modal';
import { formatEventTime, summarizeEvent } from './event-line';
import { useCampaignEvents } from './use-campaign-events';
import { useLinkedCharacterNames } from './use-linked-character-names';

interface CampaignEventFeedProps {
  campaignId: string;
  /** UID du spectateur (pour le filtrage `canViewEvent`). */
  viewerUid: string;
  /** Le spectateur est-il MJ de cette campagne ? */
  isDM: boolean;
  /** IDs des persos que le spectateur possède dans cette campagne (filtre `self`). */
  myCharacterIds: readonly string[];
  /** Membres de la campagne — alimente le filtre par joueur + les noms d'acteur. */
  members: Membership[];
}

/** Une option du filtre par joueur (un personnage lié + son libellé résolu). */
interface PlayerFilterOption {
  characterId: string;
  label: string;
}

/**
 * Feed d'activité d'une campagne (JALON 22.3, enrichi 22.4) — le premier LECTEUR
 * du journal d'événements écrit par 22.1/22.2. Affiche les derniers événements en
 * temps réel (`onSnapshot`) : quand un joueur joue sur sa fiche liée, l'événement
 * apparaît ici sans refresh.
 *
 * Monté MJ-only par `campaign-detail-screen`. La query est déjà contrainte côté
 * hook à la visibilité « provably-read » du rôle ; on applique en plus
 * `canViewEvent` (plan 22 step 10) comme affinage d'affichage — barrière de
 * sécurité = rules + query, filtre = `canViewEvent`.
 *
 * JALON 22.4 (reste du plan 21 step 4) : filtre par joueur (chips « Tous » +
 * un par personnage lié) + détail au tap (chaque ligne ouvre `EventDetailModal`).
 * Les noms d'acteur/de joueur sont résolus par `useLinkedCharacterNames` (lecture
 * cross-owner A2). Rendu de ligne toujours léger (libellé + détail + heure) ; le
 * détail complet vit dans la modale. La prose narrative groupée par session reste
 * le compilateur de journal (plan 25).
 */
export function CampaignEventFeed({
  campaignId,
  viewerUid,
  isDM,
  myCharacterIds,
  members,
}: CampaignEventFeedProps): JSX.Element {
  const { events, isLoading, error } = useCampaignEvents(campaignId, { isDM });
  const characterNames = useLinkedCharacterNames(members);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null,
  );
  const [detailEvent, setDetailEvent] = useState<GameEvent | null>(null);

  // Options du filtre : un personnage lié par joueur (libellé = nom résolu, sinon
  // UID tronqué — cohérent avec le roster qui n'a pas non plus de displayName V1).
  const playerOptions = useMemo<PlayerFilterOption[]>(
    () =>
      members
        .filter((m) => m.characterId !== null)
        .map((m) => ({
          characterId: m.characterId as string,
          label: characterNames[m.characterId as string] ?? formatUid(m.userId),
        })),
    [members, characterNames],
  );

  const visibleEvents = useMemo(
    () =>
      events.filter((ev) =>
        canViewEvent(ev, { uid: viewerUid, isDM, myCharacterIds }),
      ),
    [events, viewerUid, isDM, myCharacterIds],
  );

  // Si le filtre actif pointe un joueur qui n'a plus d'option (délié pendant la
  // session), on ignore le filtre plutôt que d'afficher un vide trompeur.
  const filterIsActive =
    selectedCharacterId !== null &&
    playerOptions.some((o) => o.characterId === selectedCharacterId);

  const shownEvents = useMemo(
    () =>
      filterIsActive
        ? visibleEvents.filter(
            (ev) => ev.actorCharacterId === selectedCharacterId,
          )
        : visibleEvents,
    [visibleEvents, filterIsActive, selectedCharacterId],
  );

  return (
    <section className="mt-10" aria-label={t('campaigns.detail.eventFeed.aria')}>
      <h2 className="text-center font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
        {t('campaigns.detail.eventFeed.title')}
      </h2>
      <p className="mt-1 text-center font-serif text-body-sm italic text-text-tertiary">
        {t('campaigns.detail.eventFeed.dmOnlyHint')}
      </p>

      {playerOptions.length > 0 ? (
        <div
          role="group"
          aria-label={t('campaigns.detail.eventFeed.filter.aria')}
          className="mt-4 flex flex-wrap justify-center gap-2"
        >
          <FilterChip
            label={t('campaigns.detail.eventFeed.filter.all')}
            active={!filterIsActive}
            onClick={() => setSelectedCharacterId(null)}
          />
          {playerOptions.map((opt) => (
            <FilterChip
              key={opt.characterId}
              label={opt.label}
              active={filterIsActive && selectedCharacterId === opt.characterId}
              onClick={() => setSelectedCharacterId(opt.characterId)}
            />
          ))}
        </div>
      ) : null}

      <div className="mt-4">
        {isLoading ? (
          <p className="py-6 text-center font-serif text-body-sm text-text-tertiary">
            {t('campaigns.detail.eventFeed.loading')}
          </p>
        ) : error ? (
          <p className="py-6 text-center font-serif text-body-sm text-crimson">
            {t('campaigns.detail.eventFeed.error')}
          </p>
        ) : shownEvents.length === 0 ? (
          <p className="py-6 text-center font-serif text-body-sm italic text-text-tertiary">
            {filterIsActive
              ? t('campaigns.detail.eventFeed.filter.emptyForPlayer')
              : t('campaigns.detail.eventFeed.empty')}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {shownEvents.map((ev) => (
              <EventRow
                key={ev.id}
                event={ev}
                onOpen={() => setDetailEvent(ev)}
              />
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
