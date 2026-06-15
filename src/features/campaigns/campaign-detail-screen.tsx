import { useMemo, useState, type JSX } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { Splash } from '@/shared/components/splash';
import { t } from '@/shared/lib/i18n';
import type { Campaign, Membership } from '@/shared/types/campaign';

import { InviteCodeReveal } from './invite-code-reveal';
import { LeaveCampaignModal } from './leave-campaign-modal';
import { PromoteToGmModal } from './promote-to-gm-modal';
import { useCampaign } from './use-campaign';

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
 *  - Pas de gestion du `characterId` linké : le picker « lier un personnage »
 *    arrive avec le flux Wizard-in-campaign (4C).
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
  const [promoteTarget, setPromoteTarget] = useState<PromoteTarget | null>(null);

  const isGm = useMemo<boolean>(() => {
    if (!campaign || !user) return false;
    return campaign.gmIds.includes(user.uid);
  }, [campaign, user]);

  const roster = useMemo<RosterEntry[]>(() => {
    if (!campaign) return [];
    return buildRoster(campaign, members, user?.uid ?? null);
  }, [campaign, members, user]);

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
      <main className="relative z-10 mx-auto w-full max-w-[860px] px-4 py-8 sm:px-6 lg:px-8">
        <nav className="flex">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/campaigns')}
            aria-label={t('campaigns.detail.back')}
          >
            ← {t('campaigns.detail.back')}
          </Button>
        </nav>

        <header className="mt-4 text-center">
          <Divider className="mb-4" />
          <h1 className="font-display text-3xl font-bold uppercase tracking-[0.18em] text-gold-bright">
            {campaign.name}
          </h1>
          <div className="mt-3 flex justify-center">
            {isGm ? (
              <Chip variant="gold">{t('campaigns.card.roleGm')}</Chip>
            ) : (
              <Chip variant="magic">{t('campaigns.card.roleMember')}</Chip>
            )}
          </div>
          {campaign.description ? (
            <p className="mx-auto mt-4 max-w-[60ch] font-serif text-body italic text-text-secondary">
              {campaign.description}
            </p>
          ) : null}
        </header>

        {isGm ? (
          <section
            className="mt-10"
            aria-label={t('campaigns.detail.invite.aria')}
          >
            <h2 className="text-center font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
              {t('campaigns.detail.invite.title')}
            </h2>
            <InviteCodeReveal code={campaign.inviteCode} className="mt-4" />
          </section>
        ) : null}

        <section className="mt-10" aria-label={t('campaigns.detail.roster.aria')}>
          <h2 className="text-center font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {t('campaigns.detail.roster.title')}
          </h2>
          <ul className="mt-4 flex flex-col gap-2">
            {roster.map((entry) => (
              <RosterRow
                key={entry.uid}
                entry={entry}
                viewerIsGm={isGm}
                onPromote={() =>
                  setPromoteTarget({ uid: entry.uid, label: entry.label })
                }
              />
            ))}
          </ul>
        </section>

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
      </main>

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
    </>
  );
}

interface RosterEntry {
  uid: string;
  label: string;
  role: 'gm' | 'member';
  /** L'entrée correspond à l'utilisateur connecté. */
  isSelf: boolean;
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
function formatUid(uid: string): string {
  if (uid.length <= 10) return uid;
  return `${uid.slice(0, 8)}…`;
}

interface RosterRowProps {
  entry: RosterEntry;
  viewerIsGm: boolean;
  onPromote: () => void;
}

function RosterRow({ entry, viewerIsGm, onPromote }: RosterRowProps): JSX.Element {
  const canPromote = viewerIsGm && entry.role === 'member';
  return (
    <li className="flex items-center justify-between gap-3 rounded-card-sm border border-white-8 bg-bg-3/40 px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="truncate font-mono text-body tracking-[0.16em] text-text">
          {entry.label}
        </span>
        {entry.isSelf ? (
          <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {t('campaigns.detail.roster.youSuffix')}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {entry.role === 'gm' ? (
          <Chip variant="gold">{t('campaigns.card.roleGm')}</Chip>
        ) : (
          <Chip variant="magic">{t('campaigns.card.roleMember')}</Chip>
        )}
        {canPromote ? (
          <Button type="button" variant="secondary" size="sm" onClick={onPromote}>
            {t('campaigns.detail.roster.promote')}
          </Button>
        ) : null}
      </div>
    </li>
  );
}
