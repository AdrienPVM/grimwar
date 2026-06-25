import { useMemo, useState, type JSX } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useCampaign } from '@/features/campaigns/use-campaign';
import { useSessions } from '@/features/campaigns/use-sessions';
import { Button } from '@/shared/components/button';
import { PageContainer } from '@/shared/components/page-container';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { Splash } from '@/shared/components/splash';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import type { Session } from '@/shared/types/session';

import { buildJournalExport, journalExportFilename } from './build-journal-export';
import { JournalMarkdown } from './journal-markdown';

/**
 * Route `/campaigns/:cid/journal` — vue agrégée du journal de campagne (plan
 * 25.4, step 8). Liste les séances TERMINÉES dans l'ordre chronologique
 * (numéro croissant), chacune dépliable sur son journal compilé. Bouton
 * « Exporter (.md) » qui télécharge le récit complet.
 *
 * Lisible par tout membre (la rule de read sessions est `isMemberOf || isDMOf`)
 * — c'est la mémoire partagée de la campagne, pas un écran de gestion MJ.
 */
export function CampaignJournalScreen(): JSX.Element {
  const navigate = useNavigate();
  const { cid } = useParams<{ cid: string }>();
  const { campaign, isLoading: campaignLoading, error: campaignError } = useCampaign(cid);
  const {
    sessions,
    isLoading: sessionsLoading,
    error: sessionsError,
    refresh,
  } = useSessions(cid);

  // Séances terminées, ordre chronologique (numéro croissant). `useSessions`
  // trie décroissant (la plus récente en tête) — on inverse pour le récit.
  const completed = useMemo<Session[]>(
    () =>
      sessions
        .filter((s) => s.status === 'completed')
        .sort((a, b) => a.number - b.number),
    [sessions],
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const backToCampaign = (): void => navigate(cid ? `/campaigns/${cid}` : '/campaigns');

  function handleExport(): void {
    if (!campaign) return;
    const md = buildJournalExport(campaign.name, completed, {
      sessionPrefix: t('journal.aggregate.sessionNumberPrefix'),
      notCompiled: t('journal.aggregate.notCompiled'),
    });
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = journalExportFilename(campaign.name);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  if (campaignLoading || sessionsLoading) return <Splash />;

  const error = campaignError ?? sessionsError;
  if (error || !campaign || !cid) {
    return (
      <main className="relative z-10 mx-auto flex min-h-[60vh] max-w-[460px] flex-col items-center justify-center px-6 py-12">
        <GlassPanel className="w-full px-6 py-8 text-center">
          <h1 className="font-title text-body uppercase tracking-[0.18em] text-crimson">
            {t('journal.aggregate.error')}
          </h1>
          <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:justify-center">
            <Button variant="ghost" size="sm" onClick={backToCampaign}>
              {t('journal.aggregate.back')}
            </Button>
            <Button variant="secondary" size="sm" onClick={refresh}>
              {t('journal.aggregate.retry')}
            </Button>
          </div>
        </GlassPanel>
      </main>
    );
  }

  return (
    <PageContainer width="content">
      <nav className="flex">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={backToCampaign}
          aria-label={t('journal.aggregate.back')}
        >
          ← {t('journal.aggregate.back')}
        </Button>
      </nav>

      <header className="mt-4 text-center">
        <Divider className="mb-4" />
        <h1 className="font-display text-3xl font-bold uppercase tracking-[0.18em] text-gold-bright">
          {t('journal.aggregate.title')}
        </h1>
        <p className="mt-2 font-serif text-body-sm italic text-text-secondary">
          {t('journal.aggregate.subtitle')}
        </p>
        {completed.length > 0 ? (
          <div className="mt-5 flex justify-center">
            <Button variant="secondary" size="sm" onClick={handleExport}>
              {t('journal.aggregate.export')}
            </Button>
          </div>
        ) : null}
      </header>

      {completed.length === 0 ? (
        <GlassPanel className="mt-8 px-6 py-10 text-center">
          <p className="mx-auto max-w-[48ch] font-serif text-body italic text-text-secondary">
            {t('journal.aggregate.empty')}
          </p>
        </GlassPanel>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {completed.map((session) => {
            const isExpanded = expandedId === session.id;
            const hasJournal =
              session.journalCompiled !== null && session.journalCompiled.trim().length > 0;
            return (
              <li key={session.id}>
                <GlassPanel className="overflow-hidden">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedId(isExpanded ? null : session.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 px-5 py-4 text-left',
                      'transition-colors duration-150 ease-base hover:bg-white-4',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="font-title text-meta uppercase tracking-[0.16em] text-text-tertiary">
                        {t('journal.aggregate.sessionNumberPrefix')}
                        {session.number}
                      </span>
                      <span className="mt-0.5 block truncate font-display text-body uppercase tracking-[0.1em] text-gold-bright">
                        {session.title}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className="shrink-0 font-title text-meta uppercase tracking-[0.16em] text-text-tertiary"
                    >
                      {isExpanded
                        ? t('journal.aggregate.collapse')
                        : t('journal.aggregate.expand')}
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-white-8 px-5 py-5">
                      {hasJournal ? (
                        <JournalMarkdown markdown={session.journalCompiled!} />
                      ) : (
                        <p className="font-serif text-body-sm italic text-text-tertiary">
                          {t('journal.aggregate.notCompiled')}
                        </p>
                      )}
                    </div>
                  ) : null}
                </GlassPanel>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
