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
import { logSessionEnd, logSessionStart } from '@/shared/lib/event-logger';
import { t, type StringKey } from '@/shared/lib/i18n';
import {
  endSession,
  SessionServiceError,
  startSession,
} from '@/shared/lib/services/sessions';
import { useActiveCampaignStore } from '@/shared/lib/slices/active-campaign-slice';
import type { SessionStatus } from '@/shared/types/session';

import { compileSessionJournal } from '@/features/journal/compile-session-journal';
import { SessionJournalTab } from '@/features/journal/session-journal-tab';
import { useContent } from '@/shared/hooks/use-content';

import { buildRoster } from './roster';
import { SessionAttendanceTab } from './session-attendance-tab';
import { SessionEventsTab } from './session-events-tab';
import { SessionNotesTab } from './session-notes-tab';
import type { LinkedMember } from './use-encounter-party-draft';
import { useCampaign } from './use-campaign';
import { useSession } from './use-session';

const SESSION_TABS = ['notes', 'attendance', 'events', 'journal'] as const;
type SessionTab = (typeof SESSION_TABS)[number];

const TAB_LABEL: Record<SessionTab, StringKey> = {
  notes: 'sessions.tab.notes',
  attendance: 'sessions.tab.attendance',
  events: 'sessions.tab.events',
  journal: 'sessions.tab.journal',
};

const STATUS_CHIP: Record<
  SessionStatus,
  { variant: 'default' | 'gold' | 'heal' | 'damage'; labelKey: StringKey }
> = {
  planned: { variant: 'default', labelKey: 'sessions.status.planned' },
  active: { variant: 'gold', labelKey: 'sessions.status.active' },
  completed: { variant: 'heal', labelKey: 'sessions.status.completed' },
  cancelled: { variant: 'damage', labelKey: 'sessions.status.cancelled' },
};

/**
 * Route `/campaigns/:cid/sessions/:sid` — écran d'une séance (step 4 du plan 23,
 * livraison 23.3). Shell à 4 onglets : Notes / Présence / Events / Journal.
 *
 * Livré en 23.3 : Notes (auto-save 5 s, MJ-only édition) + Présence (toggles
 * MJ-only). Events + Journal sont des placeholders — l'onglet Events sera câblé
 * en 23.4 (lecture `where sessionId == sid` + wiring `activeSessionId`), le
 * Journal en plan 25 (compilateur).
 *
 * Permissions : la séance est lisible par tout membre (rule 23.1). L'ÉDITION
 * (notes, présence) est MJ-only — `canEdit = isGm`. La défense ultime reste la
 * rule Firestore (`create/update/delete : isDMOf`), `canEdit` n'est que l'UX.
 */
export function SessionScreen(): JSX.Element {
  const navigate = useNavigate();
  const { cid, sid } = useParams<{ cid: string; sid: string }>();
  const { user } = useAuth();
  const { campaign, members, isLoading: campaignLoading } = useCampaign(cid);
  const {
    session,
    isLoading: sessionLoading,
    error: sessionError,
    refresh,
  } = useSession(cid, sid);

  const [tab, setTab] = useState<SessionTab>('notes');
  const [actionPending, setActionPending] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const setActiveCampaign = useActiveCampaignStore((s) => s.setActiveCampaign);

  // Contenu chargé au niveau écran (caché Dexie) : sert au journal (libellés de
  // sorts / objets / états) à la clôture ET dans l'onglet Journal.
  const { data: spells } = useContent('spells');
  const { data: magicItems } = useContent('magic-items');
  const { data: conditions } = useContent('conditions');

  const isGm = useMemo<boolean>(() => {
    if (!campaign || !user) return false;
    return campaign.gmIds.includes(user.uid);
  }, [campaign, user]);

  const roster = useMemo(
    () =>
      campaign
        ? buildRoster(campaign, members, user?.uid ?? null, user?.displayName ?? null)
        : [],
    [campaign, members, user],
  );

  // Membres ayant lié une fiche (characterId → userId) — pour résoudre les noms
  // de personnages dans le journal (cross-owner, plan 25.2).
  const linkedMembers = useMemo<LinkedMember[]>(
    () =>
      roster
        .filter((r): r is typeof r & { characterId: string } => r.characterId !== null)
        .map((r) => ({ userId: r.uid, characterId: r.characterId })),
    [roster],
  );

  // Personnages que le spectateur possède dans cette campagne — filtre `self`
  // de `canViewEvent` pour l'onglet Events (plan 26 step 7).
  const myCharacterIds = useMemo<string[]>(
    () =>
      user
        ? linkedMembers.filter((m) => m.userId === user.uid).map((m) => m.characterId)
        : [],
    [linkedMembers, user],
  );

  const backToSessions = (): void =>
    navigate(cid ? `/campaigns/${cid}/sessions` : '/campaigns');

  // Démarre la séance (planned → active). Le pointeur de campagne active est posé
  // APRÈS la transition réussie pour que `logSessionStart` écrive dans la bonne
  // campagne (et que les events de jeu de CE client soient tagués `sessionId`).
  // Garde-fou « une seule active » : porté par le service (`another-session-active`).
  async function handleStart(): Promise<void> {
    if (!session || !cid || !sid || actionPending) return;
    setActionPending(true);
    setActionError(null);
    try {
      await startSession(cid, sid);
      setActiveCampaign(cid, sid);
      await logSessionStart(sid, { sessionNumber: session.number, title: session.title });
      refresh();
    } catch (err) {
      setActionError(
        err instanceof SessionServiceError && err.kind === 'another-session-active'
          ? t('sessions.action.error.anotherActive')
          : t('sessions.action.error.generic'),
      );
    } finally {
      setActionPending(false);
    }
  }

  // Clôt la séance (active → completed). On (re)pose le pointeur avant de logguer
  // pour être robuste à un reload en cours de séance (Zustand repart à null), puis
  // on nettoie le pointeur de session (la campagne reste active).
  async function handleEnd(): Promise<void> {
    if (!session || !cid || !sid || actionPending) return;
    setActionPending(true);
    setActionError(null);
    try {
      setActiveCampaign(cid, sid);
      await endSession(cid, sid);
      await logSessionEnd(sid, { sessionNumber: session.number, title: session.title });
      // Compilation auto du journal (plan 25.2, step 4) — APRÈS l'event
      // `session-end` pour qu'il figure dans la narration. Best-effort : un échec
      // de compilation ne doit PAS faire échouer la clôture (le MJ pourra
      // re-compiler depuis l'onglet Journal). On ne libère le pointeur de session
      // qu'ensuite, pour que la compilation lise bien les events tagués `sessionId`.
      try {
        await compileSessionJournal({
          campaignId: cid,
          sessionId: sid,
          linkedMembers,
          spells: spells ?? [],
          items: magicItems ?? [],
          conditions: conditions ?? [],
        });
      } catch (err) {
        console.warn('[journal] compilation auto à la clôture échouée', err);
      }
      setActiveCampaign(cid, null);
      refresh();
    } catch {
      setActionError(t('sessions.action.error.generic'));
    } finally {
      setActionPending(false);
    }
  }

  if (campaignLoading || sessionLoading) return <Splash />;

  if (sessionError || !session || !cid || !sid) {
    const isNotFound =
      sessionError?.name === 'SessionServiceError' &&
      'kind' in sessionError &&
      (sessionError as { kind: string }).kind === 'session-not-found';
    return (
      <main className="relative z-10 mx-auto flex min-h-[60vh] max-w-[460px] flex-col items-center justify-center px-6 py-12">
        <GlassPanel className="w-full px-6 py-8 text-center">
          <h1 className="font-title text-body uppercase tracking-[0.18em] text-crimson">
            {isNotFound
              ? t('sessions.detail.error.notFoundTitle')
              : t('sessions.detail.error.title')}
          </h1>
          <p className="mt-3 font-serif text-body-sm text-text-secondary">
            {isNotFound
              ? t('sessions.detail.error.notFoundBody')
              : t('sessions.detail.error.body')}
          </p>
          <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:justify-center">
            <Button variant="ghost" size="sm" onClick={backToSessions}>
              {t('sessions.detail.back')}
            </Button>
            {!isNotFound ? (
              <Button variant="secondary" size="sm" onClick={refresh}>
                {t('sessions.error.retry')}
              </Button>
            ) : null}
          </div>
        </GlassPanel>
      </main>
    );
  }

  const statusChip = STATUS_CHIP[session.status];

  return (
    <PageContainer width="content">
      <nav className="flex">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={backToSessions}
          aria-label={t('sessions.detail.back')}
        >
          ← {t('sessions.detail.back')}
        </Button>
      </nav>

      <header className="mt-4 text-center">
        <Divider className="mb-4" />
        <p className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
          {t('sessions.row.numberPrefix')}
          {session.number}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold uppercase tracking-[0.18em] text-gold-bright">
          {session.title}
        </h1>
        <div className="mt-3 flex justify-center">
          <Chip variant={statusChip.variant}>{t(statusChip.labelKey)}</Chip>
        </div>

        {isGm && (session.status === 'planned' || session.status === 'active') ? (
          <div className="mt-5 flex flex-col items-center gap-3">
            {session.status === 'planned' ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleStart}
                disabled={actionPending}
                tooltip={t('campaigns.tip.startSession')}
              >
                {actionPending ? t('sessions.action.starting') : t('sessions.action.start')}
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="md"
                onClick={handleEnd}
                disabled={actionPending}
                tooltip={t('campaigns.tip.endSession')}
              >
                {actionPending ? t('sessions.action.ending') : t('sessions.action.end')}
              </Button>
            )}
            {actionError ? (
              <p
                role="alert"
                className="rounded-card-sm border border-crimson/40 bg-crimson/[0.08] px-3 py-2 font-serif text-body-sm text-crimson"
              >
                {actionError}
              </p>
            ) : null}
          </div>
        ) : null}
      </header>

      <nav
        role="tablist"
        aria-label={t('sessions.tabs.aria')}
        className="mx-auto mt-8 flex w-full max-w-[520px] gap-1"
      >
        {SESSION_TABS.map((key) => {
          const isActive = key === tab;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`session-panel-${key}`}
              id={`session-tab-${key}`}
              onClick={() => setTab(key)}
              className={cn(
                'flex flex-1 items-center justify-center py-3',
                'border-b-2 transition-colors duration-150',
                'font-title text-[11px] font-bold uppercase tracking-[0.16em]',
                isActive
                  ? 'border-gold text-gold-bright drop-shadow-[0_0_8px_var(--gold-glow)]'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary',
              )}
            >
              {t(TAB_LABEL[key])}
            </button>
          );
        })}
      </nav>

      <section
        id={`session-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`session-tab-${tab}`}
        className="mt-6"
      >
        {tab === 'notes' ? (
          <SessionNotesTab
            // Remonte le composant quand la séance change pour ré-initialiser
            // l'éditeur sur les notes du nouveau doc (et flusher l'ancien).
            key={session.id}
            campaignId={cid}
            sessionId={sid}
            initialNotes={session.notes}
            canEdit={isGm}
          />
        ) : null}

        {tab === 'attendance' ? (
          <SessionAttendanceTab
            key={session.id}
            campaignId={cid}
            sessionId={sid}
            roster={roster}
            initialAttendance={session.attendance}
            canEdit={isGm}
          />
        ) : null}

        {tab === 'events' ? (
          <SessionEventsTab
            key={session.id}
            campaignId={cid}
            sessionId={sid}
            isDM={isGm}
            viewerUid={user?.uid ?? ''}
            myCharacterIds={myCharacterIds}
            members={members}
          />
        ) : null}

        {tab === 'journal' ? (
          <SessionJournalTab
            key={session.id}
            campaignId={cid}
            sessionId={sid}
            journalCompiled={session.journalCompiled}
            canEdit={isGm}
            linkedMembers={linkedMembers}
            spells={spells ?? []}
            items={magicItems ?? []}
            conditions={conditions ?? []}
            onCompiled={refresh}
          />
        ) : null}
      </section>
    </PageContainer>
  );
}
