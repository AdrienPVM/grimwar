import { useMemo, type JSX } from 'react';

import { t } from '@/shared/lib/i18n';
import { canViewEvent } from '@/shared/lib/permissions';

import { formatEventTime, summarizeEvent } from './event-line';
import { useCampaignEvents } from './use-campaign-events';

interface CampaignEventFeedProps {
  campaignId: string;
  /** UID du spectateur (pour le filtrage `canViewEvent`). */
  viewerUid: string;
  /** Le spectateur est-il MJ de cette campagne ? */
  isDM: boolean;
  /** IDs des persos que le spectateur possède dans cette campagne (filtre `self`). */
  myCharacterIds: readonly string[];
}

/**
 * Feed d'activité d'une campagne (JALON 22.3) — le premier LECTEUR du journal
 * d'événements écrit par 22.1/22.2. Affiche les derniers événements en temps
 * réel (`onSnapshot`) : quand un joueur joue sur sa fiche liée, l'événement
 * apparaît ici sans refresh.
 *
 * Monté MJ-only par `campaign-detail-screen` (le feed est un outil de meneur en
 * V1 ; un feed joueur public est un suivi trivial ultérieur). La query est déjà
 * contrainte côté hook à la visibilité « provably-read » du rôle ; on applique en
 * plus `canViewEvent` (plan 22 step 10) comme affinage d'affichage — barrière de
 * sécurité = rules + query, filtre = `canViewEvent`.
 *
 * Rendu léger (libellé de `kind` + détail de payload + heure). La prose narrative
 * groupée par session est le compilateur de journal (plan 25).
 */
export function CampaignEventFeed({
  campaignId,
  viewerUid,
  isDM,
  myCharacterIds,
}: CampaignEventFeedProps): JSX.Element {
  const { events, isLoading, error } = useCampaignEvents(campaignId, { isDM });

  const visibleEvents = useMemo(
    () =>
      events.filter((ev) =>
        canViewEvent(ev, { uid: viewerUid, isDM, myCharacterIds }),
      ),
    [events, viewerUid, isDM, myCharacterIds],
  );

  return (
    <section className="mt-10" aria-label={t('campaigns.detail.eventFeed.aria')}>
      <h2 className="text-center font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
        {t('campaigns.detail.eventFeed.title')}
      </h2>
      <p className="mt-1 text-center font-serif text-body-sm italic text-text-tertiary">
        {t('campaigns.detail.eventFeed.dmOnlyHint')}
      </p>

      <div className="mt-4">
        {isLoading ? (
          <p className="py-6 text-center font-serif text-body-sm text-text-tertiary">
            {t('campaigns.detail.eventFeed.loading')}
          </p>
        ) : error ? (
          <p className="py-6 text-center font-serif text-body-sm text-crimson">
            {t('campaigns.detail.eventFeed.error')}
          </p>
        ) : visibleEvents.length === 0 ? (
          <p className="py-6 text-center font-serif text-body-sm italic text-text-tertiary">
            {t('campaigns.detail.eventFeed.empty')}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {visibleEvents.map((ev) => (
              <EventRow key={ev.id} event={ev} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function EventRow({
  event,
}: {
  event: Parameters<typeof summarizeEvent>[0] & { id: string; createdAt: unknown };
}): JSX.Element {
  const { kindLabel, detail } = summarizeEvent(event);
  const time = formatEventTime(event.createdAt);
  return (
    <li className="flex items-center justify-between gap-3 rounded-card-sm border border-white-8 bg-bg-3/40 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-title text-meta uppercase tracking-[0.14em] text-gold-bright">
          {kindLabel}
        </span>
        {detail !== null ? (
          <span className="truncate font-serif text-body-sm text-text-secondary">
            {detail}
          </span>
        ) : null}
      </div>
      {time !== '' ? (
        <time className="shrink-0 font-mono text-meta tracking-[0.12em] text-text-tertiary">
          {time}
        </time>
      ) : null}
    </li>
  );
}
