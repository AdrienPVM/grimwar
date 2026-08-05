import { useEffect, useMemo, useState, type JSX, type ReactNode } from 'react';
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
import { t, type StringKey } from '@/shared/lib/i18n';
import { healOwnMemberIdentity } from '@/shared/lib/services/campaigns';
import type { Membership } from '@/shared/types/campaign';

import { CampaignEventFeed } from './campaign-event-feed';
import { CampaignMemberItem } from './campaign-member-item';
import { CampaignSettingsModal } from './campaign-settings-modal';
import { CampaignStatusChip } from './campaign-status-chip';
import { InviteCodeReveal } from './invite-code-reveal';
import { LeaveCampaignModal } from './leave-campaign-modal';
import { MemberActionModal, type MemberAction } from './member-action-modal';
import { MyCharacterLink } from './my-character-link';
import { PartyAggregateStrip } from './party-aggregate-strip';
import { PromoteToGmModal } from './promote-to-gm-modal';
import { buildRoster, type RosterEntry } from './roster';
import { useCampaign } from './use-campaign';
import { usePartyAggregate, type PartyMemberRef } from './use-party-aggregate';

interface PromoteTarget {
  uid: string;
  label: string;
}

/** Cible d'un geste d'autorité destructif — rétrogradation ou exclusion (M11). */
interface MemberActionTarget extends PromoteTarget {
  action: MemberAction;
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
 *     joueurs). Chaque ligne : nom d'affichage (ou UID tronqué en repli) + chip
 *     rôle + bouton « Promouvoir en MJ » si le viewer est MJ et la cible est joueur.
 *   - Bouton « Quitter la campagne » en pied de page → ouvre
 *     LeaveCampaignModal (réutilisé de 4.0.4).
 *
 * Décisions UX V1 :
 *  - Nom d'affichage DÉNORMALISÉ sur `members/{uid}.displayName` (les rules
 *    interdisent la lecture cross-user de `/users/{uid}`, donc le nom doit vivre
 *    sur le doc member que le lecteur a déjà le droit de lire). Copié du profil
 *    Auth au join ; le propriétaire auto-soigne son propre doc au chargement
 *    (`healOwnMemberIdentity`). Repli UID tronqué tant qu'aucun nom n'est posé
 *    (compte anonyme, doc legacy). Avatar (`photoURL`) stocké mais non rendu V1.
 *  - Trois gestes d'autorité sur le roster (M11, audit de malléabilité) :
 *    promouvoir (4.0.3), rétrograder et exclure. Les deux derniers passent par
 *    `MemberActionModal` — ils sont destructifs et asymétriques de la promotion,
 *    donc confirmés et rendus en `danger`. `kickMember` existait depuis 4.0.3
 *    sans aucun appelant ; `demoteGm` manquait alors que la modale de promotion
 *    promettait la révocation. La rule `allow delete: if isDMOf` (members) et
 *    l'invariant `gmIds.size() >= 1` (campaign) couvraient déjà les deux.
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
  const [actionTarget, setActionTarget] = useState<MemberActionTarget | null>(null);

  const isGm = useMemo<boolean>(() => {
    if (!campaign || !user) return false;
    return campaign.gmIds.includes(user.uid);
  }, [campaign, user]);

  // Les toasts « le MJ vous a transmis un document » ne sont plus montés ici :
  // `CampaignNotifications` (E13/1) les écoute au-dessus des routes, donc aussi
  // depuis la fiche du joueur. Les monter des deux côtés doublerait le toast.

  const roster = useMemo<RosterEntry[]>(() => {
    if (!campaign) return [];
    return buildRoster(campaign, members, user?.uid ?? null, user?.displayName ?? null);
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

  // Self-heal du nom dénormalisé : si le doc member de l'utilisateur courant
  // n'a pas (ou plus) le displayName/photoURL de son profil Auth, on le corrige.
  // Effet légitime (write Firestore, pas un état dérivé). Idempotent et gardé
  // par un diff pré-calculé côté client — quand l'écriture propage via le
  // listener, `myMembership` se met à jour, le diff devient faux, l'effet ne
  // réécrit plus (convergence, pas de boucle). Non couvert : le MJ pur (sans
  // doc member) — `healOwnMemberIdentity` no-op alors (getDoc absent).
  useEffect(() => {
    if (!cid || !user || !myMembership) return;
    const nameDrift = (myMembership.displayName ?? null) !== (user.displayName ?? null);
    const photoDrift = (myMembership.photoURL ?? null) !== (user.photoURL ?? null);
    if (!nameDrift && !photoDrift) return;
    void healOwnMemberIdentity(cid, user.uid, {
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
    });
  }, [
    cid,
    user,
    myMembership,
  ]);

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
          {/* Réglages seuls restent dans la barre du haut : c'est de
              l'administration, pas du jeu. Le reste descend sous le titre, en
              groupes (cf. `plans/UX-AUDIT-2026-08.md > M2`). */}
          {isGm ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              tooltip={t('campaigns.tip.openSettings')}
            >
              {t('campaigns.detail.settingsCta')}
            </Button>
          ) : null}
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

        {/*
          Espaces de la campagne — remplace la barre de 7 boutons identiques qui
          régnait AU-DESSUS du titre (cf. `plans/UX-AUDIT-2026-08.md > M2`).
          Trois défauts corrigés d'un coup :
          (a) les actions passent SOUS le titre — on lit d'abord où on est ;
          (b) elles sont groupées par nature — « jouer ce soir » d'un côté, la
              mémoire de la table de l'autre — au lieu de sept puces de même
              poids qui se replient en pavé illisible sur mobile ;
          (c) Séances et Rencontres ne sont PLUS réservées au meneur. Les deux
              écrans étaient déjà écrits pour les joueurs (états vides dédiés
              `sessions.empty.member` / `encounters.empty.member`) et les rules
              Firestore les autorisent depuis 23.1 / 24.1 — seul le point
              d'entrée manquait, ce qui rendait le suivi de combat inaccessible
              aux joueurs autrement qu'en s'échangeant une URL.
          « Cartes » reste MJ : c'est un outil de préparation et de projection.
        */}
        <nav
          aria-label={t('campaigns.detail.spaces.aria')}
          className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2"
        >
          <SpaceGroup titleKey="campaigns.detail.spaces.play">
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
            {isGm ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/map-proto/cloud/${campaign.id}`)}
                tooltip={t('campaigns.tip.openMaps')}
              >
                {t('campaigns.detail.mapsCta')}
              </Button>
            ) : null}
          </SpaceGroup>
          <SpaceGroup titleKey="campaigns.detail.spaces.memory">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/campaigns/${campaign.id}/journal`)}
              tooltip={t('campaigns.tip.openJournal')}
            >
              {t('campaigns.detail.journalCta')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/campaigns/${campaign.id}/handouts`)}
              tooltip={t('campaigns.tip.openHandouts')}
            >
              {t('campaigns.detail.handoutsCta')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/campaigns/${campaign.id}/npcs`)}
              tooltip={t('campaigns.tip.openNpcs')}
            >
              {t('campaigns.detail.npcsCta')}
            </Button>
          </SpaceGroup>
        </nav>

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
                <InviteCodeReveal
                  code={campaign.inviteCode}
                  campaignId={campaign.id}
                  uid={user?.uid}
                  onRotated={refresh}
                  className="mt-5"
                />
              </div>
            ) : (
              <>
                <h2 className="text-center font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
                  {t('campaigns.detail.invite.title')}
                </h2>
                <InviteCodeReveal
                  code={campaign.inviteCode}
                  campaignId={campaign.id}
                  uid={user?.uid}
                  onRotated={refresh}
                  className="mt-4"
                />
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
                  onDemote={() =>
                    setActionTarget({
                      uid: entry.uid,
                      label: entry.label,
                      action: 'demote',
                    })
                  }
                  onKick={() =>
                    setActionTarget({
                      uid: entry.uid,
                      label: entry.label,
                      action: 'kick',
                    })
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
              <SecretRollButton campaignId={campaign.id} />
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

      <MemberActionModal
        action={actionTarget?.action ?? null}
        campaignId={campaign.id}
        targetUid={actionTarget?.uid ?? null}
        targetLabel={actionTarget?.label ?? null}
        onClose={() => setActionTarget(null)}
        onDone={() => {
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

/**
 * Groupe d'espaces de la campagne — un intitulé discret suivi de ses entrées.
 *
 * L'intitulé porte la hiérarchie que sept boutons identiques ne pouvaient pas
 * porter : il dit à quoi sert la rangée. Il reste volontairement en méta
 * (petite capitale, texte tertiaire) pour ne pas rivaliser avec le nom de la
 * campagne juste au-dessus.
 */
function SpaceGroup({
  titleKey,
  children,
}: {
  titleKey: StringKey;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="rounded-card-sm border border-white-8 bg-white/[0.02] px-4 py-3">
      <h2 className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
        {t(titleKey)}
      </h2>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">{children}</div>
    </section>
  );
}
