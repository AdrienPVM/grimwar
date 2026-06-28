import { useMemo, useState, type JSX } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { Button } from '@/shared/components/button';
import { Card } from '@/shared/components/card';
import { Chip } from '@/shared/components/chip';
import { Divider } from '@/shared/components/divider';
import { PageContainer } from '@/shared/components/page-container';
import { Splash } from '@/shared/components/splash';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { archiveHandout } from '@/shared/lib/services/handouts';
import { HANDOUT_RECIPIENTS_ALL, type Handout } from '@/shared/types/handout';

import { formatUid } from './campaign-detail-screen';
import { HandoutCreateModal, type HandoutPlayer } from './handout-create-modal';
import { HandoutViewerModal } from './handout-viewer-modal';
import { useCampaign } from './use-campaign';
import { useHandouts } from './use-handouts';

/**
 * Route `/campaigns/:cid/handouts` — gestion et lecture des documents MJ→joueur
 * (plan 27). UN seul écran pour les deux rôles :
 *   - MJ : bouton « Nouveau document » + liste de TOUS les documents + section
 *     archivés + action « Archiver ». (La création vit ici plutôt que sur le
 *     prototype `/dm` — ce dernier n'a pas de contexte campagne, plan 27 note.)
 *   - Joueur : liste des documents qui lui sont destinés (archivés masqués) ;
 *     tap ouvre la visionneuse, qui le marque « lu ».
 *
 * Le toast « nouveau document » est porté par `useHandoutNotifications`, monté
 * sur le hub de campagne (`/campaigns/:cid`).
 */
export function CampaignHandoutsScreen(): JSX.Element {
  const navigate = useNavigate();
  const { cid } = useParams<{ cid: string }>();
  const { user } = useAuth();
  const { campaign, members, isLoading: campaignLoading } = useCampaign(cid);

  const isDM = useMemo<boolean>(
    () => !!campaign && !!user && campaign.gmIds.includes(user.uid),
    [campaign, user],
  );

  const { handouts, isLoading, error, refresh } = useHandouts(cid, isDM);

  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [viewing, setViewing] = useState<Handout | null>(null);

  // Joueurs destinataires possibles = membres hors MJ.
  const players = useMemo<HandoutPlayer[]>(() => {
    if (!campaign) return [];
    const gm = new Set(campaign.gmIds);
    return members
      .filter((m) => !gm.has(m.userId))
      .map((m) => ({ uid: m.userId, label: formatUid(m.userId) }));
  }, [campaign, members]);

  const active = useMemo(
    () => handouts.filter((h) => h.visibility !== 'archived'),
    [handouts],
  );
  const archived = useMemo(
    () => handouts.filter((h) => h.visibility === 'archived'),
    [handouts],
  );

  if (campaignLoading) return <Splash />;

  async function onArchive(handout: Handout): Promise<void> {
    if (!cid) return;
    await archiveHandout(cid, handout.id);
    refresh();
  }

  function recipientsSummary(handout: Handout): string {
    if (handout.recipients === HANDOUT_RECIPIENTS_ALL) {
      return t('handouts.card.recipientsAll');
    }
    return `${t('handouts.card.recipientsTargeted')} · ${handout.recipients.length}`;
  }

  function renderCard(handout: Handout): JSX.Element {
    const opened =
      !!user && !isDM ? handout.revealedTo.includes(user.uid) : false;
    const isArchived = handout.visibility === 'archived';
    return (
      <Card
        className={cn(
          'flex flex-col gap-3 transition-colors duration-200 ease-base',
          isArchived && 'opacity-60',
        )}
      >
        <button
          type="button"
          onClick={() => setViewing(handout)}
          className="flex flex-col gap-2 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-title text-body font-bold uppercase tracking-[0.12em] text-gold-bright">
              {handout.title}
            </h3>
            {isArchived ? (
              <Chip variant="default">{t('handouts.card.archivedBadge')}</Chip>
            ) : !isDM ? (
              <Chip variant={opened ? 'default' : 'gold'}>
                {opened ? t('handouts.card.openedBadge') : t('handouts.card.newBadge')}
              </Chip>
            ) : null}
          </div>
          {isDM ? (
            <span className="font-serif text-body-sm italic text-text-tertiary">
              {recipientsSummary(handout)}
            </span>
          ) : null}
        </button>
        <div className="flex items-center justify-between gap-3">
          <Button variant="secondary" size="sm" onClick={() => setViewing(handout)}>
            {t('handouts.card.open')}
          </Button>
          {isDM && !isArchived ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void onArchive(handout)}
              tooltip={t('campaigns.tip.archiveHandout')}
            >
              {t('handouts.card.archive')}
            </Button>
          ) : null}
        </div>
      </Card>
    );
  }

  return (
    <>
      <PageContainer width="content">
        <nav className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate(cid ? `/campaigns/${cid}` : '/campaigns')}
            aria-label={t('handouts.screen.back')}
          >
            ← {t('handouts.screen.back')}
          </Button>
          {isDM ? (
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
              {t('handouts.screen.newCta')}
            </Button>
          ) : null}
        </nav>

        <header className="mt-4 text-center">
          <Divider className="mb-4" />
          <h1 className="font-display text-3xl font-bold uppercase tracking-[0.18em] text-gold-bright">
            {t('handouts.screen.title')}
          </h1>
          <p className="mx-auto mt-3 max-w-[60ch] font-serif text-body italic text-text-secondary">
            {isDM ? t('handouts.screen.subtitleDm') : t('handouts.screen.subtitlePlayer')}
          </p>
        </header>

        {error ? (
          <p className="mt-10 text-center font-serif text-body-sm text-crimson">
            {t('handouts.screen.loadError')}
          </p>
        ) : isLoading ? (
          <p className="mt-10 text-center font-serif text-body-sm italic text-text-tertiary">
            …
          </p>
        ) : active.length === 0 && archived.length === 0 ? (
          <p className="mt-10 text-center font-serif text-body italic text-text-tertiary">
            {isDM ? t('handouts.screen.empty.dm') : t('handouts.screen.empty.player')}
          </p>
        ) : (
          <div className="mt-8 flex flex-col gap-8">
            <section aria-label={t('handouts.screen.activeHeading')}>
              <ul className="flex flex-col gap-3">
                {active.map((h) => (
                  <li key={h.id}>{renderCard(h)}</li>
                ))}
                {active.length === 0 ? (
                  <li className="font-serif text-body-sm italic text-text-tertiary">
                    {isDM ? t('handouts.screen.empty.dm') : t('handouts.screen.empty.player')}
                  </li>
                ) : null}
              </ul>
            </section>

            {isDM && archived.length > 0 ? (
              <section aria-label={t('handouts.screen.archivedHeading')}>
                <h2 className="mb-3 font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
                  {t('handouts.screen.archivedHeading')}
                </h2>
                <ul className="flex flex-col gap-3">
                  {archived.map((h) => (
                    <li key={h.id}>{renderCard(h)}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </PageContainer>

      {isDM && cid && user ? (
        <HandoutCreateModal
          open={createOpen}
          campaignId={cid}
          createdByUid={user.uid}
          players={players}
          onClose={() => setCreateOpen(false)}
          onSent={refresh}
        />
      ) : null}

      <HandoutViewerModal
        handout={viewing}
        campaignId={cid ?? ''}
        viewerUid={user?.uid ?? null}
        isDM={isDM}
        onClose={() => setViewing(null)}
        onRevealed={refresh}
      />
    </>
  );
}
