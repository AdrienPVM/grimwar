import { useEffect, useMemo, type JSX, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { CharacterSheet } from '@/features/sheet/character-sheet';
import {
  DM_LOCKED_FIELDS,
  PermissionProvider,
} from '@/features/sheet/permissions-context';
import { useCharacter } from '@/features/sheet/use-character';
import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { GlassPanel } from '@/shared/components/glass-panel';
import { Splash } from '@/shared/components/splash';
import { t } from '@/shared/lib/i18n';
import { useActiveCampaignStore } from '@/shared/lib/slices/active-campaign-slice';

import { formatUid } from './campaign-detail-screen';
import { useCampaign } from './use-campaign';

/**
 * Route `/campaigns/:cid/members/:memberUid/sheet` — lecture MJ (lecture seule)
 * de la fiche d'un joueur lié (JALON 4A.3). Premier consommateur UI de la rule
 * de lecture cross-owner `gmCanReadLinkedCharacter` (4A.1) + de la donnée de lien
 * posée par le picker « Mon personnage » (4A.2).
 *
 * Chaîne d'autorisation (défense en profondeur — la rule Firestore reste l'arbitre) :
 *  1. le viewer doit être MJ de la campagne (`campaign.gmIds`) — sinon écran réservé ;
 *  2. le `memberUid` doit avoir un doc `members/{uid}` — sinon membre introuvable ;
 *  3. ce membre doit avoir une fiche liée (`characterId`) — sinon aucune fiche ;
 *  4. la lecture `users/{memberUid}/characters/{characterId}` passe par la rule A2,
 *     qui re-vérifie le triplet (MJ ∈ gmIds, membre encore présent, fiche encore
 *     liée). Un `permission-denied` ici ⇒ lien rompu entre l'affichage du roster et
 *     l'ouverture, OU rules A2 pas encore déployées en prod → écran « inaccessible ».
 *
 * La fiche est rendue en OMNI-EDIT MJ (plan 26) : `PermissionProvider` pose
 * `canEdit: true` + `isDMEdit: true` + `ownerUid: memberUid` + `lockedFields`
 * (champs réservés au propriétaire). `useUpdateCharacter` route alors l'écriture
 * vers `users/{memberUid}/...` et journalise un `dm-edit` ; la barrière réelle est
 * `firestore.rules > dmOmniEditLockedFieldsUnchanged` + `gmCanReadLinkedCharacter`.
 * `showRollHistory={false}` reste : la sous-collection de jets vit sous le sous-arbre
 * du joueur, hors périmètre de la rule cross-owner (l'ouvrir ferait un `permission-denied`).
 *
 * ⚠ SUPERSEDE la décision plan 16 « omni-edit via Cloud Function » (Voie B
 * rules-only — cf. firestore.rules + docs/PERMISSIONS.md, acté 2026-06-25).
 */
export function CampaignMemberSheetScreen(): JSX.Element {
  const navigate = useNavigate();
  const { cid, memberUid } = useParams<{ cid: string; memberUid: string }>();
  const { user } = useAuth();
  const { campaign, members, isLoading, error } = useCampaign(cid);

  const isGm = useMemo<boolean>(() => {
    if (!campaign || !user) return false;
    return campaign.gmIds.includes(user.uid);
  }, [campaign, user]);

  const member = useMemo(
    () => members.find((m) => m.userId === memberUid) ?? null,
    [members, memberUid],
  );
  const linkedCharacterId = member?.characterId ?? undefined;

  // La souscription cross-owner ne démarre que lorsqu'on a une fiche liée — sinon
  // `useCharacter(undefined, …)` reste inerte (character: null, isLoading: false).
  const {
    character,
    isLoading: charLoading,
    error: charError,
  } = useCharacter(linkedCharacterId, memberUid);

  // Pose la campagne active pour que les éditions MJ journalisent `dm-edit` dans
  // la bonne campagne (l'event-logger lit `useActiveCampaignStore`). Préserve une
  // séance déjà active sur CETTE campagne (le MJ peut arriver depuis l'écran de
  // séance) → les éditions faites pendant une séance restent taguées `sessionId`.
  // Synchro d'un store EXTERNE (effet de bord légitime, pas du state dérivé).
  useEffect(() => {
    if (!cid) return;
    const store = useActiveCampaignStore.getState();
    const inheritsSession =
      store.activeCampaignId === cid && store.activeSessionId !== null;
    if (!inheritsSession) store.setActiveCampaign(cid);
    return () => {
      // Ne nettoie QUE si aucune séance n'est en cours — sinon on casserait le
      // tagging de séance d'un écran de séance encore monté ailleurs.
      const s = useActiveCampaignStore.getState();
      if (s.activeSessionId === null) s.clearActiveCampaign();
    };
  }, [cid]);

  const backToCampaign = (): void => navigate(`/campaigns/${cid ?? ''}`);

  if (isLoading) return <Splash />;

  // Erreur de chargement campagne (not-found / permission-denied) : on ne distingue
  // pas finement ici — l'arrivée légitime sur cet écran passe par le roster MJ.
  if (error || !campaign) {
    return (
      <MessagePanel
        title={t('campaigns.memberSheet.forbidden.title')}
        body={t('campaigns.memberSheet.forbidden.body')}
        onBack={backToCampaign}
      />
    );
  }

  if (!isGm) {
    return (
      <MessagePanel
        title={t('campaigns.memberSheet.forbidden.title')}
        body={t('campaigns.memberSheet.forbidden.body')}
        onBack={backToCampaign}
      />
    );
  }

  if (!member) {
    return (
      <MessagePanel
        title={t('campaigns.memberSheet.memberNotFound.title')}
        body={t('campaigns.memberSheet.memberNotFound.body')}
        onBack={backToCampaign}
      />
    );
  }

  if (!linkedCharacterId) {
    return (
      <MessagePanel
        title={t('campaigns.memberSheet.noCharacter.title')}
        body={t('campaigns.memberSheet.noCharacter.body')}
        onBack={backToCampaign}
      />
    );
  }

  if (charLoading) return <Splash />;

  if (charError || !character) {
    return (
      <MessagePanel
        title={t('campaigns.memberSheet.error.title')}
        body={t('campaigns.memberSheet.error.body')}
        onBack={backToCampaign}
      />
    );
  }

  return (
    <>
      <header className="relative z-20 mx-auto flex w-full max-w-[860px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={backToCampaign}
          aria-label={t('campaigns.memberSheet.back')}
        >
          ← {t('campaigns.memberSheet.back')}
        </Button>
        <div className="flex items-center gap-2">
          <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {t('campaigns.memberSheet.viewingPrefix')}
          </span>
          <span className="font-mono text-body-sm tracking-[0.16em] text-text">
            {formatUid(member.userId)}
          </span>
          <Chip variant="gold">{t('campaigns.memberSheet.dmEditBadge')}</Chip>
        </div>
      </header>
      <PermissionProvider
        value={{
          canEdit: true,
          isDM: true,
          isDMEdit: true,
          ownerUid: member.userId,
          lockedFields: DM_LOCKED_FIELDS,
        }}
      >
        <CharacterSheet character={character} showRollHistory={false} />
      </PermissionProvider>
    </>
  );
}

interface MessagePanelProps {
  title: string;
  body: ReactNode;
  onBack: () => void;
}

/** État terminal centré (réservé / introuvable / inaccessible) avec retour campagne. */
function MessagePanel({ title, body, onBack }: MessagePanelProps): JSX.Element {
  return (
    <main className="relative z-10 mx-auto flex min-h-[60vh] max-w-[460px] flex-col items-center justify-center px-6 py-12">
      <GlassPanel className="w-full px-6 py-8 text-center">
        <h1 className="font-display text-xl uppercase tracking-[0.18em] text-gold-bright">
          {title}
        </h1>
        <p className="mt-3 font-serif text-body-sm text-text-secondary">{body}</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={onBack}
          className="mt-6"
        >
          {t('campaigns.memberSheet.back')}
        </Button>
      </GlassPanel>
    </main>
  );
}
