import { useMemo, useState, type JSX } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { AnonymousNudge } from '@/features/auth/anonymous-nudge';
import { useAuth } from '@/features/auth/use-auth';
import { QuickNotes } from '@/features/dm-view/quick-notes';
import { SecretRollButton } from '@/features/dm-view/secret-roll-button';
import { Button } from '@/shared/components/button';
import { PageContainer } from '@/shared/components/page-container';
import { Chip } from '@/shared/components/chip';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { Splash } from '@/shared/components/splash';
import { t } from '@/shared/lib/i18n';
import type { Campaign, Membership } from '@/shared/types/campaign';

import { CampaignEventFeed } from './campaign-event-feed';
import { CampaignMemberItem } from './campaign-member-item';
import { CampaignSettingsModal } from './campaign-settings-modal';
import { CampaignStatusChip } from './campaign-status-chip';
import { InviteCodeReveal } from './invite-code-reveal';
import { LeaveCampaignModal } from './leave-campaign-modal';
import { MyCharacterLink } from './my-character-link';
import { PartyAggregateStrip } from './party-aggregate-strip';
import { PromoteToGmModal } from './promote-to-gm-modal';
import { useCampaign } from './use-campaign';
import { usePartyAggregate, type PartyMemberRef } from './use-party-aggregate';
import { useHandoutNotifications } from './use-handout-notifications';

interface PromoteTarget {
  uid: string;
  label: string;
}

/**
 * Route `/campaigns/:cid` — vue détail d'une campagne.
 *
 * Layout (mobile-first, élargi en desktop) :
 *   - Header retour + titre + chip rôle
 *   - Description (italic) si renseignée
 *   - Bloc invitation (visible uniquement aux MJ — un joueur n'a pas
 *     vocation à diffuser le code, c'est le rôle du meneur)
 *   - Section roster — liste plate de tous les membres (MJ d'abord puis
 *     joueurs). Chaque ligne : libellé UID (tronqué) + chip rôle + bouton
 *     « Promouvoir en MJ » si le viewer est MJ et la cible est joueur.
 *   - Bouton « Quitter la campagne » en pied de page → ouvre
 *     LeaveCampaignModal (réutilisé de 4.0.4).
 *
 * Décisions UX V1 :
 *  - Pas de displayName ni d'avatar — les rules Firestore n'autorisent pas la
 *    lecture cross-user de `/users/{uid}`. On affiche l'UID tronqué (8 chars +
 *    ellipsis). Quand un displayName partagé existera (V1.5), un denormalized
 *    `displayName` sur `members/{uid}` couvrira le besoin.
 *  - Pas de bouton « Kick » V1 — le service expose `kickMember` (4.0.3) mais
 *    aucun consommateur UI n'est mappé. Réservé à 4.0.6+ avec un flux de
 *    confirmation dédié (le kick est destructif et asymétrique de la promotion).
 *  - Section « Mon personnage » (JALON 4A.2) : visible pour le joueur (user qui
 *    possède un doc `members/{uid}`). Il y lie/délie sa fiche via le picker
 *    `MyCharacterLink` → `linkCharacterToMembership` (write owner-only). C'est la
 *    donnée que la rule de lecture MJ (A2, 4A.1) suit pour autoriser le meneur. Un
 *    second point d'entrée (wizard-in-campaign) pourra s'ajouter en 4C.
 *
 * Erreurs :
 *  - `kind === 'campaign-not-found'` → écran dédié (campagne supprimée ou ID
 *    invalide) avec retour à la liste.
 *  - `permission-denied` (l'utilisateur n'est ni MJ ni membre) → propage le
 *    message Firebase brut V1. Acceptable car le seul chemin d'arrivée légitime
 *    sur cet écran passe par la liste 4.0.4 (qui filtre déjà) ou par un join
 *    code (4.0.5 join screen, qui crée la membership AVANT d'arriver ici).
 */
export function CampaignDetailScreen(): JSX.Element {
  const navigate = useNavigate();
  const { cid } = useParams<{ cid: string }>();
  const { user } = useAuth();
  const { campaign, members, isLoading, error, refresh } = useCampaign(cid);

  const [leaveOpen, setLeaveOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [promoteTarget, setPromoteTarget] = useState<PromoteTarget | null>(null);

  const isGm = useMemo<boolean>(() => {
    if (!campaign || !user) return false;
    return campaign.gmIds.includes(user.uid);
  }, [campaign, user]);

  // Toast « le MJ vous a transmis un document » sur tout nouveau handout reçu
  // (plan 27 step 7-8). Désactivé pour le MJ (cf. `useHandoutNotifications`).
  // Appelé avant les early-returns pour respecter les règles des hooks.
  useHandoutNotifications(cid, user?.uid, !isGm);

  const roster = useMemo<RosterEntry[]>(() => {
    if (!campaign) return [];
    return buildRoster(campaign, members, user?.uid ?? null);
  }, [campaign, members, user]);

  // Aucun joueur n'a encore rejoint : le roster ne contient que des MJ. Sert à
  // basculer le bloc invitation en mode « premier pas » (le MJ vient de créer
  // la campagne et atterrit ici → on l'oriente vers l'invitation des joueurs).
  const hasPlayers = useMemo<boolean>(
    () => roster.some((entry) => entry.role === 'member'),
    [roster],
  );

  // Fiches liées que le meneur peut lire (rule A2 cross-owner) — source de
  // l'agrégat « compagnie ». Vide pour un non-MJ : il ne peut pas lire les
  // fiches d'autrui, donc pas d'abonnements inutiles voués au permission-denied.
  const partyRefs = useMemo<PartyMemberRef[]>(() => {
    if (!isGm) return [];
    return roster
      .filter((entry) => entry.characterId !== null)
      .map((entry) => ({ characterId: entry.characterId!, ownerUid: entry.uid }));
  }, [isGm, roster]);
  const partyAggregate = usePartyAggregate(partyRefs);

  // Membership du joueur courant — présente uniquement s'il a rejoint en tant
  // que joueur (doc `members/{uid}`). Un MJ pur (gmIds seul) n'en a pas et ne
  // lie pas de fiche : il LIT celles des joueurs (rule A2, 4A.1).
  const myMembership = useMemo<Membership | null>(() => {
    if (!user) return null;
    return members.find((m) => m.userId === user.uid) ?? null;
  }, [members, user]);

  // Personnages que le spectateur possède dans cette campagne — pour le filtrage
  // `self` du feed d'événements. Un MJ pur n'a pas de membership → liste vide.
  const myCharacterIds = useMemo<string[]>(
    () => (myMembership?.characterId ? [myMembership.characterId] : []),
    [myMembership],
  );

  if (isLoading) return <Splash />;

  if (error) {
    const isNotFound =
      error.name === 'CampaignServiceError' &&
      'kind' in error &&
      (error as { kind: string }).kind === 'campaign-not-found';
    return (
      <main className="relative z-10 mx-auto flex min-h-[60vh] max-w-[460px] flex-col items-center justify-center px-6 py-12">
        <GlassPanel className="w-full px-6 py-8 text-center">
          <h1 className="font-title text-body uppercase tracking-[0.18em] text-crimson">
            {isNotFound
              ? t('campaigns.detail.error.notFoundTitle')
              : t('campaigns.detail.error.title')}
          </h1>
          <p className="mt-3 font-serif text-body-sm text-text-secondary">
            {isNotFound
              ? t('campaigns.detail.error.notFoundBody')
              : t('campaigns.detail.error.body')}
          </p>
          <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/campaigns')}
            >
              {t('campaigns.detail.back')}
            </Button>
            {!isNotFound ? (
              <Button variant="secondary" size="sm" onClick={refresh}>
                {t('campaigns.detail.error.retry')}
              </Button>
            ) : null}
          </div>
        </GlassPanel>
      </main>
    );
  }

  if (!campaign) return <Splash />;

  return (
    <>
      <PageContainer width="content">
        <nav className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/campaigns')}
            aria-label={t('campaigns.detail.back')}
          >
            ← {t('campaigns.detail.back')}
          </Button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Journal de campagne — lisible par tout membre (mémoire partagée). */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/campaigns/${campaign.id}/journal`)}
              tooltip={t('campaigns.tip.openJournal')}
            >
              {t('campaigns.detail.journalCta')}
            </Button>
            {/* Documents — accessible à tout membre (le MJ crée, le joueur
                consulte ceux qui lui sont destinés). */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/campaigns/${campaign.id}/handouts`)}
              tooltip={t('campaigns.tip.openHandouts')}
            >
              {t('campaigns.detail.handoutsCta')}
            </Button>
            {/* PNJ — annuaire accessible à tout membre (le MJ gère, le joueur
                consulte les PNJ publics). */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/campaigns/${campaign.id}/npcs`)}
              tooltip={t('campaigns.tip.openNpcs')}
            >
              {t('campaigns.detail.npcsCta')}
            </Button>
            {isGm ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setSettingsOpen(true)}
                  tooltip={t('campaigns.tip.openSettings')}
                >
                  {t('campaigns.detail.settingsCta')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/campaigns/${campaign.id}/sessions`)}
                  tooltip={t('campaigns.tip.openSessions')}
                >
                  {t('campaigns.detail.sessionsCta')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/campaigns/${campaign.id}/encounters`)}
                  tooltip={t('campaigns.tip.openEncounters')}
                >
                  {t('campaigns.detail.encountersCta')}
                </Button>
                {/* Cartes — prototype mode carte (import .dd2vtt, fog, LOS, TV).
                    Réutilise le cid de la campagne réelle. MJ-only. */}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/map-proto/cloud/${campaign.id}`)}
                  tooltip={t('campaigns.tip.openMaps')}
                >
                  {t('campaigns.detail.mapsCta')}
                </Button>
              </>
            ) : null}
          </div>
        </nav>

        <header className="mt-4 text-center">
          <Divider className="mb-4" />
          <h1 className="font-display text-3xl font-bold uppercase tracking-[0.18em] text-gold-bright">
            {campaign.name}
          </h1>
          <div className="mt-3 flex justify-center gap-2">
            {isGm ? (
              <Chip variant="gold">{t('campaigns.card.roleGm')}</Chip>
            ) : (
              <Chip variant="magic">{t('campaigns.card.roleMember')}</Chip>
            )}
            <CampaignStatusChip status={campaign.status} />
          </div>
          {campaign.description ? (
            <p className="mx-auto mt-4 max-w-[60ch] font-serif text-body italic text-text-secondary">
              {campaign.description}
            </p>
          ) : null}
        </header>

        {/* Bannière d'état — donne un sens fonctionnel au statut (au-delà de la
            puce) : une campagne en pause / archivée n'est plus « en cours ». Rôle-
            neutre (le MJ change l'état via les réglages ; le joueur en est informé).
            Rendue seulement hors état nominal `active`. */}
        {campaign.status !== 'active' ? (
          <div
            role="status"
            className="mt-6 rounded-card-sm border border-white-8 bg-bg-3/40 px-4 py-3 text-center"
          >
            <p className="font-serif text-body-sm italic text-text-secondary">
              {campaign.status === 'archived'
                ? t('campaigns.detail.statusBanner.archived')
                : t('campaigns.detail.statusBanner.paused')}
            </p>
          </div>
        ) : null}

        {/* Rappel compte anonyme — un joueur qui vient de rejoindre (ou un MJ
            qui vient de créer) sur un compte invité risque de tout perdre. Le
            bandeau ne s'affiche que pour les comptes anonymes. */}
        <AnonymousNudge className="mt-8" />

        {isGm ? (
          <section
            className="mt-10"
            aria-label={t('campaigns.detail.invite.aria')}
          >
            {!hasPlayers && campaign.status === 'active' ? (
              // Premier pas : la campagne ACTIVE vient d'être créée, aucun joueur
              // n'a rejoint. On met l'invitation en avant comme prochaine action
              // évidente, avec un cadre chaleureux plutôt qu'un simple titre. On
              // ne célèbre pas l'invitation sur une campagne en pause / archivée
              // (l'appel « Invite tes joueurs ! » y serait incongru).
              <div className="rounded-card border border-gold-dim/40 bg-gradient-to-b from-gold-bright/[0.06] to-transparent p-6 text-center">
                <h2 className="font-display text-xl uppercase tracking-[0.18em] text-gold-bright">
                  {t('campaigns.detail.invite.firstStepTitle')}
                </h2>
                <p className="mx-auto mt-3 max-w-[44ch] font-serif text-body-sm italic text-text-secondary">
                  {t('campaigns.detail.invite.firstStepBody')}
                </p>
                <InviteCodeReveal code={campaign.inviteCode} className="mt-5" />
              </div>
            ) : (
              <>
                <h2 className="text-center font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
                  {t('campaigns.detail.invite.title')}
                </h2>
                <InviteCodeReveal code={campaign.inviteCode} className="mt-4" />
              </>
            )}
          </section>
        ) : null}

        {myMembership ? (
          <MyCharacterLink
            campaignId={campaign.id}
            uid={myMembership.userId}
            currentCharacterId={myMembership.characterId}
            onChanged={refresh}
          />
        ) : null}

        {/* Section UNIQUE « La compagnie » (plan 27) — fusion de l'ancien roster
            (UID + rôle + actions) et de l'ancien « État de la compagnie » (PV/CA
            live). Chaque membre apparaît une seule fois, dans sa représentation
            la plus riche : carte live pour les joueurs liés que le MJ peut lire,
            ligne compacte sinon. Fini la duplication « deux sections, mêmes gens ». */}
        <section className="mt-10" aria-label={t('campaigns.detail.roster.aria')}>
          <h2 className="text-center font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {t('campaigns.detail.roster.title')}
          </h2>
          {/* Résumé compagnie (MJ) — effectif / niveau moyen / éventail, au-dessus
              des cartes. Se masque de lui-même tant qu'aucune fiche n'est chargée. */}
          {isGm ? <PartyAggregateStrip aggregate={partyAggregate} /> : null}
          <ul className="mt-4 flex flex-col gap-3">
            {roster.map((entry) => (
              <li key={entry.uid}>
                <CampaignMemberItem
                  entry={entry}
                  viewerIsGm={isGm}
                  onPromote={() =>
                    setPromoteTarget({ uid: entry.uid, label: entry.label })
                  }
                  onViewSheet={() =>
                    navigate(`/campaigns/${campaign.id}/members/${entry.uid}/sheet`)
                  }
                />
              </li>
            ))}
          </ul>
        </section>

        {/* Outils du meneur — jet secret (d20 sous le paravent) + bloc-notes
            volatil, cloisonné par campagne. MJ-only : ces outils n'ont de sens
            que côté meneur, et le jet secret ne doit jamais fuiter aux joueurs.
            Réutilise les composants de la vue MJ (autrefois seulement à `/dm`). */}
        {isGm ? (
          <section
            className="mt-10"
            aria-label={t('campaigns.detail.dmTools.aria')}
          >
            <h2 className="text-center font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
              {t('campaigns.detail.dmTools.title')}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SecretRollButton />
              <QuickNotes scopeKey={campaign.id} />
            </div>
          </section>
        ) : null}

        {isGm && user ? (
          <CampaignEventFeed
            campaignId={campaign.id}
            viewerUid={user.uid}
            isDM={isGm}
            myCharacterIds={myCharacterIds}
            members={members}
          />
        ) : null}

        <div className="mt-10 flex justify-center">
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={() => setLeaveOpen(true)}
          >
            {t('campaigns.detail.leaveCta')}
          </Button>
        </div>
      </PageContainer>

      <LeaveCampaignModal
        open={leaveOpen}
        campaign={campaign}
        onClose={() => setLeaveOpen(false)}
        onLeft={() => {
          // Après leave réussi : retour à la liste, qui rafraîchira d'elle-même.
          navigate('/campaigns');
        }}
      />

      <PromoteToGmModal
        open={promoteTarget !== null}
        campaignId={campaign.id}
        targetUid={promoteTarget?.uid ?? null}
        targetLabel={promoteTarget?.label ?? null}
        onClose={() => setPromoteTarget(null)}
        onPromoted={() => {
          refresh();
        }}
      />

      {settingsOpen && isGm ? (
        <CampaignSettingsModal
          campaign={campaign}
          onClose={() => setSettingsOpen(false)}
          onSaved={refresh}
        />
      ) : null}
    </>
  );
}

export interface RosterEntry {
  uid: string;
  label: string;
  role: 'gm' | 'member';
  /** L'entrée correspond à l'utilisateur connecté. */
  isSelf: boolean;
  /**
   * Fiche liée du joueur (`members/{uid}.characterId`), ou `null`. Sert au MJ à
   * ouvrir la fiche en lecture seule (4A.3). Les entrées MJ (issues de `gmIds`)
   * n'ont jamais de fiche liée par cette UI → toujours `null`.
   */
  characterId: string | null;
}

/**
 * Construit la liste affichée du roster :
 *  - tous les UIDs de `gmIds` (rôle 'gm'),
 *  - puis tous les `members[]` qui ne sont PAS dans `gmIds` (rôle 'member').
 *
 * Le dédoublonnage est nécessaire : `promoteToGm` (4.0.3) garde le doc member
 * et lui passe `role: 'gm'`, donc un MJ peut apparaître DOUBLE (dans `gmIds`
 * ET dans `members`). On garde la priorité gmIds (source de vérité côté rules).
 */
export function buildRoster(
  campaign: Campaign,
  members: Membership[],
  myUid: string | null,
): RosterEntry[] {
  const seen = new Set<string>();
  const result: RosterEntry[] = [];
  for (const uid of campaign.gmIds) {
    if (seen.has(uid)) continue;
    seen.add(uid);
    result.push({
      uid,
      label: formatUid(uid),
      role: 'gm',
      isSelf: myUid !== null && uid === myUid,
      characterId: null,
    });
  }
  for (const m of members) {
    if (seen.has(m.userId)) continue;
    seen.add(m.userId);
    result.push({
      uid: m.userId,
      label: formatUid(m.userId),
      role: m.role,
      isSelf: myUid !== null && m.userId === myUid,
      characterId: m.characterId,
    });
  }
  return result;
}

/**
 * Tronquage UID — V1 on n'a pas de displayName partagé (cf. décision UI),
 * donc on affiche un préfixe lisible suivi d'une ellipsis pour rappeler que
 * c'est un identifiant technique. Tronqué à 8 chars (assez pour distinguer
 * 99 % des paires d'UIDs Firebase).
 */
export function formatUid(uid: string): string {
  if (uid.length <= 10) return uid;
  return `${uid.slice(0, 8)}…`;
}
