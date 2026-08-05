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
import {
  archiveHandout,
  deleteHandout,
  unarchiveHandout,
} from '@/shared/lib/services/handouts';
import { HANDOUT_RECIPIENTS_ALL, type Handout } from '@/shared/types/handout';

import { buildRoster, formatUid } from './roster';
import { HandoutEditorModal, type HandoutPlayer } from './handout-editor-modal';
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
  const [editing, setEditing] = useState<Handout | null>(null);
  const [viewing, setViewing] = useState<Handout | null>(null);
  // Suppression confirmée en deux temps, par document — même patron que le
  // retrait d'un objet d'inventaire ou d'un événement du journal.
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  // Joueurs destinataires possibles = membres hors MJ. Le libellé vient de
  // `buildRoster`, qui résout le `displayName` DÉNORMALISÉ sur le doc member —
  // l'écran construisait auparavant sa propre liste avec `formatUid`, si bien
  // que le meneur choisissait ses destinataires parmi des « aBc12dEf… ».
  const players = useMemo<HandoutPlayer[]>(() => {
    if (!campaign) return [];
    return buildRoster(campaign, members, user?.uid ?? null, user?.displayName ?? null)
      .filter((entry) => entry.role === 'member')
      .map((entry) => ({ uid: entry.uid, label: entry.label }));
  }, [campaign, members, user]);

  /** Nom d'affichage d'un destinataire, par UID — repli sur l'UID tronqué. */
  const labelByUid = useMemo<Map<string, string>>(
    () => new Map(players.map((p) => [p.uid, p.label])),
    [players],
  );

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

  async function onUnarchive(handout: Handout): Promise<void> {
    if (!cid) return;
    await unarchiveHandout(cid, handout.id);
    refresh();
  }

  async function onDelete(handout: Handout): Promise<void> {
    if (!cid) return;
    await deleteHandout(cid, handout.id);
    setConfirmingDelete(null);
    refresh();
  }

  /**
   * Résumé des destinataires pour la carte MJ. Nomme les joueurs plutôt que de
   * les compter : « Bob, Marie » se relit d'un coup d'œil, « Ciblé · 2 »
   * obligeait à rouvrir le document pour savoir QUI l'avait reçu.
   */
  function recipientsSummary(handout: Handout): string {
    if (handout.recipients === HANDOUT_RECIPIENTS_ALL) {
      return t('handouts.card.recipientsAll');
    }
    if (handout.recipients.length === 0) {
      return t('handouts.card.recipientsNone');
    }
    const names = handout.recipients.map((uid) => labelByUid.get(uid) ?? formatUid(uid));
    return `${t('handouts.card.recipientsTargeted')} · ${names.join(', ')}`;
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="secondary" size="sm" onClick={() => setViewing(handout)}>
            {t('handouts.card.open')}
          </Button>
          {isDM ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(handout)}
                tooltip={t('campaigns.tip.editHandout')}
              >
                {t('handouts.card.edit')}
              </Button>
              {isArchived ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void onUnarchive(handout)}
                  tooltip={t('campaigns.tip.unarchiveHandout')}
                >
                  {t('handouts.card.unarchive')}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void onArchive(handout)}
                  tooltip={t('campaigns.tip.archiveHandout')}
                >
                  {t('handouts.card.archive')}
                </Button>
              )}
              {confirmingDelete === handout.id ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => void onDelete(handout)}
                >
                  {t('handouts.card.deleteConfirm')}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingDelete(handout.id)}
                  tooltip={t('campaigns.tip.deleteHandout')}
                >
                  {t('handouts.card.delete')}
                </Button>
              )}
            </div>
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
        <HandoutEditorModal
          open={createOpen || editing !== null}
          campaignId={cid}
          createdByUid={user.uid}
          players={players}
          editing={editing}
          onClose={() => {
            setCreateOpen(false);
            setEditing(null);
          }}
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
