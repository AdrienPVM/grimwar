import { useMemo, useState, type JSX } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { Button } from '@/shared/components/button';
import { PageContainer } from '@/shared/components/page-container';
import { Chip } from '@/shared/components/chip';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { Splash } from '@/shared/components/splash';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import type { Session, SessionStatus } from '@/shared/types/session';

import { SessionCreateModal } from './session-create-modal';
import { useCampaign } from './use-campaign';
import { useSessions } from './use-sessions';

/**
 * Route `/campaigns/:cid/sessions` — liste des séances d'une campagne (steps
 * 1-3 du plan 23, livraison 23.2).
 *
 * Convention de route : on suit le préfixe `/campaigns/:cid/...` déjà en place
 * pour toute la feature campaigns (détail, members/sheet) — PAS le `/campaign/:id`
 * du texte du plan, plus ancien et jamais réalisé. Cohérence > littéralité.
 *
 * Permissions :
 *   - La LISTE est lisible par tout membre (rule `isMemberOf || isDMOf`, 23.1) —
 *     un joueur peut consulter le calendrier des séances.
 *   - Le bouton « Planifier une session » est MJ-only (le create est `isDMOf`).
 *
 * Le `useCampaign(cid)` fournit le nom + le statut MJ (`gmIds.includes(uid)`) ;
 * le `useSessions(cid)` fournit la liste triée. Deux hooks one-shot distincts
 * (chacun avec son refresh) — le create rafraîchit la liste sessions seule.
 *
 * 23.2 ne câble PAS l'ouverture du détail d'une séance : la route
 * `/campaigns/:cid/sessions/:sid` (`<SessionScreen>`) arrive en 23.3. Les lignes
 * sont donc des cartes d'affichage statiques pour l'instant.
 */
export function SessionsListScreen(): JSX.Element {
  const navigate = useNavigate();
  const { cid } = useParams<{ cid: string }>();
  const { user } = useAuth();
  const { campaign, isLoading: campaignLoading, error: campaignError } = useCampaign(cid);
  const {
    sessions,
    isLoading: sessionsLoading,
    error: sessionsError,
    refresh,
  } = useSessions(cid);

  const [createOpen, setCreateOpen] = useState<boolean>(false);

  const isGm = useMemo<boolean>(() => {
    if (!campaign || !user) return false;
    return campaign.gmIds.includes(user.uid);
  }, [campaign, user]);

  if (campaignLoading || sessionsLoading) return <Splash />;

  const error = campaignError ?? sessionsError;
  if (error) {
    return (
      <main className="relative z-10 mx-auto flex min-h-[60vh] max-w-[460px] flex-col items-center justify-center px-6 py-12">
        <GlassPanel className="w-full px-6 py-8 text-center">
          <h1 className="font-title text-body uppercase tracking-[0.18em] text-crimson">
            {t('sessions.error.title')}
          </h1>
          <p className="mt-3 font-serif text-body-sm text-text-secondary">
            {t('sessions.error.body')}
          </p>
          <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(cid ? `/campaigns/${cid}` : '/campaigns')}
            >
              {t('sessions.back')}
            </Button>
            <Button variant="secondary" size="sm" onClick={refresh}>
              {t('sessions.error.retry')}
            </Button>
          </div>
        </GlassPanel>
      </main>
    );
  }

  if (!campaign || !cid) return <Splash />;

  const planCta = isGm ? (
    <Button variant="primary" size="lg" onClick={() => setCreateOpen(true)}>
      {t('sessions.cta.plan')}
    </Button>
  ) : null;

  return (
    <>
      <PageContainer width="content">
        <nav className="flex">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/campaigns/${cid}`)}
            aria-label={t('sessions.back')}
          >
            ← {t('sessions.back')}
          </Button>
        </nav>

        <header className="mt-4 text-center">
          <Divider className="mb-4" />
          <h1 className="font-display text-3xl font-bold uppercase tracking-[0.18em] text-gold-bright">
            {t('sessions.title')}
          </h1>
          <p className="mt-2 font-serif text-body italic text-text-secondary">
            {campaign.name}
          </p>
        </header>

        {sessions.length === 0 ? (
          <GlassPanel className="mt-8 px-7 py-10 text-center">
            <p className="mx-auto max-w-[40ch] font-serif text-body italic text-text-secondary">
              {isGm ? t('sessions.empty.gm') : t('sessions.empty.member')}
            </p>
            {planCta ? <div className="mt-7 flex justify-center">{planCta}</div> : null}
          </GlassPanel>
        ) : (
          <>
            <ul
              aria-label={t('sessions.list.aria')}
              className="mt-8 flex flex-col gap-3"
            >
              {sessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  onOpen={() => navigate(`/campaigns/${cid}/sessions/${session.id}`)}
                />
              ))}
            </ul>
            {planCta ? <div className="mt-10 flex justify-center">{planCta}</div> : null}
          </>
        )}
      </PageContainer>

      <SessionCreateModal
        campaignId={cid}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => refresh()}
      />
    </>
  );
}

const STATUS_CHIP: Record<
  SessionStatus,
  { variant: 'default' | 'gold' | 'heal' | 'damage'; labelKey: Parameters<typeof t>[0] }
> = {
  planned: { variant: 'default', labelKey: 'sessions.status.planned' },
  active: { variant: 'gold', labelKey: 'sessions.status.active' },
  completed: { variant: 'heal', labelKey: 'sessions.status.completed' },
  cancelled: { variant: 'damage', labelKey: 'sessions.status.cancelled' },
};

interface SessionRowProps {
  session: Session;
  onOpen: () => void;
}

function SessionRow({ session, onOpen }: SessionRowProps): JSX.Element {
  const status = STATUS_CHIP[session.status];
  const dateLabel = formatPlannedDate(session.plannedDate);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-card-sm border border-white-8 bg-bg-3/40 px-4 py-3 text-left',
          'transition-colors duration-150 ease-base',
          'hover:border-glow hover:bg-white/[0.03]',
          'focus-visible:border-gold-bright focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-bright/40',
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span className="shrink-0 font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {t('sessions.row.numberPrefix')}
            {session.number}
          </span>
          <span className="truncate font-serif text-body text-text">{session.title}</span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {dateLabel ? (
            <span className="hidden font-serif text-body-sm text-text-secondary sm:inline">
              {dateLabel}
            </span>
          ) : null}
          <Chip variant={status.variant}>{t(status.labelKey)}</Chip>
        </span>
      </button>
    </li>
  );
}

/**
 * Formate `plannedDate` (Firestore `Timestamp`, `Date`, `{ seconds }` ou `null`)
 * en label FR court (« 10 juin »). Tolérant comme `formatTimestamp` de
 * `campaign-card.tsx` — Firestore renvoie un `Timestamp`, le seed/test un `Date`
 * ou `null`. Renvoie `null` si pas de date (séance non datée).
 */
function formatPlannedDate(ts: unknown): string | null {
  if (!ts) return null;
  let date: Date | null = null;
  if (typeof ts === 'object') {
    const candidate = ts as { toDate?: () => Date; seconds?: number };
    if (typeof candidate.toDate === 'function') {
      date = candidate.toDate();
    } else if (typeof candidate.seconds === 'number') {
      date = new Date(candidate.seconds * 1000);
    }
  }
  if (ts instanceof Date) date = ts;
  if (!date || Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date);
}
