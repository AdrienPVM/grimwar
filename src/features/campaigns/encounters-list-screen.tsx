import { useMemo, useState, type JSX } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { Button } from '@/shared/components/button';
import { PageContainer } from '@/shared/components/page-container';
import { Chip } from '@/shared/components/chip';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { Splash } from '@/shared/components/splash';
import { DetailModal } from '@/shared/components/detail-modal';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import {
  deleteEncounter,
  ENCOUNTER_NAME_MAX,
  renameEncounter,
} from '@/shared/lib/services/encounters';
import type { Encounter, EncounterStatus } from '@/shared/types/encounter';

import { EncounterCreateModal } from './encounter-create-modal';
import type { LinkedMember } from './use-encounter-party-draft';
import { useCampaign } from './use-campaign';
import { useEncounters } from './use-encounters';

/**
 * Route `/campaigns/:cid/encounters` — liste des rencontres d'une campagne
 * (steps 1-3 du plan 24, livraison 24.2). Mirror de `SessionsListScreen` (23.2).
 *
 * Permissions :
 *   - La LISTE est lisible par tout membre (rule `isMemberOf || isDMOf`, 24.1).
 *   - Le bouton « Créer une rencontre » est MJ-only (le create est `isDMOf`).
 *
 * 24.2 ne câble PAS l'ouverture du détail : la route `/campaigns/:cid/encounters/:eid`
 * (`<EncounterScreen>` — tracker de combat) arrive en 24.3. Les lignes sont donc
 * des cartes d'affichage statiques pour l'instant (nom + nb de participants +
 * statut), pas des boutons de navigation.
 */
export function EncountersListScreen(): JSX.Element {
  const navigate = useNavigate();
  const { cid } = useParams<{ cid: string }>();
  const { user } = useAuth();
  const {
    campaign,
    members,
    isLoading: campaignLoading,
    error: campaignError,
  } = useCampaign(cid);
  const {
    encounters,
    isLoading: encountersLoading,
    error: encountersError,
    refresh,
  } = useEncounters(cid);

  const [createOpen, setCreateOpen] = useState<boolean>(false);
  // Rencontre dont le panneau de gestion (renommer / supprimer) est ouvert (M7).
  const [manageTarget, setManageTarget] = useState<Encounter | null>(null);
  const [managePending, setManagePending] = useState<boolean>(false);

  const isGm = useMemo<boolean>(() => {
    if (!campaign || !user) return false;
    return campaign.gmIds.includes(user.uid);
  }, [campaign, user]);

  // Membres ayant lié une fiche — auto-inclus comme participants joueurs par la
  // modale de création (step 3 : « all players auto-added »).
  const linkedMembers = useMemo<LinkedMember[]>(
    () =>
      members
        .filter((m) => m.characterId !== null)
        .map((m) => ({ userId: m.userId, characterId: m.characterId as string })),
    [members],
  );

  // ─── Gestion d'une rencontre (M7) — renommer une hâte de saisie, supprimer
  // une rencontre créée par erreur. `allow delete: if isDMOf` était déployée
  // depuis l'origine sans le moindre appelant.
  async function handleRename(encounterId: string, name: string): Promise<void> {
    if (!cid || managePending) return;
    setManagePending(true);
    try {
      await renameEncounter(cid, encounterId, name);
      setManageTarget(null);
      refresh();
    } finally {
      setManagePending(false);
    }
  }

  async function handleDelete(encounterId: string): Promise<void> {
    if (!cid || managePending) return;
    setManagePending(true);
    try {
      await deleteEncounter(cid, encounterId);
      setManageTarget(null);
      refresh();
    } finally {
      setManagePending(false);
    }
  }

  if (campaignLoading || encountersLoading) return <Splash />;

  const error = campaignError ?? encountersError;
  if (error) {
    return (
      <main className="relative z-10 mx-auto flex min-h-[60vh] max-w-[460px] flex-col items-center justify-center px-6 py-12">
        <GlassPanel className="w-full px-6 py-8 text-center">
          <h1 className="font-title text-body uppercase tracking-[0.18em] text-crimson">
            {t('encounters.error.title')}
          </h1>
          <p className="mt-3 font-serif text-body-sm text-text-secondary">
            {t('encounters.error.body')}
          </p>
          <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(cid ? `/campaigns/${cid}` : '/campaigns')}
            >
              {t('encounters.back')}
            </Button>
            <Button variant="secondary" size="sm" onClick={refresh}>
              {t('encounters.error.retry')}
            </Button>
          </div>
        </GlassPanel>
      </main>
    );
  }

  if (!campaign || !cid) return <Splash />;

  const createCta = isGm ? (
    <Button variant="primary" size="lg" onClick={() => setCreateOpen(true)}>
      {t('encounters.cta.create')}
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
            aria-label={t('encounters.back')}
          >
            ← {t('encounters.back')}
          </Button>
        </nav>

        <header className="mt-4 text-center">
          <Divider className="mb-4" />
          <h1 className="font-display text-3xl font-bold uppercase tracking-[0.18em] text-gold-bright">
            {t('encounters.title')}
          </h1>
          <p className="mt-2 font-serif text-body italic text-text-secondary">
            {campaign.name}
          </p>
        </header>

        {encounters.length === 0 ? (
          <GlassPanel className="mt-8 px-7 py-10 text-center">
            <p className="mx-auto max-w-[40ch] font-serif text-body italic text-text-secondary">
              {isGm ? t('encounters.empty.gm') : t('encounters.empty.member')}
            </p>
            {createCta ? <div className="mt-7 flex justify-center">{createCta}</div> : null}
          </GlassPanel>
        ) : (
          <>
            <ul aria-label={t('encounters.list.aria')} className="mt-8 flex flex-col gap-3">
              {encounters.map((encounter) => (
                <EncounterRow
                  key={encounter.id}
                  encounter={encounter}
                  canManage={isGm}
                  onOpen={() => navigate(`/campaigns/${cid}/encounters/${encounter.id}`)}
                  onManage={() => setManageTarget(encounter)}
                />
              ))}
            </ul>
            {createCta ? <div className="mt-10 flex justify-center">{createCta}</div> : null}
          </>
        )}
      </PageContainer>

      <EncounterCreateModal
        campaignId={cid}
        open={createOpen}
        linkedMembers={linkedMembers}
        onClose={() => setCreateOpen(false)}
        onCreated={() => refresh()}
      />

      {manageTarget ? (
        <EncounterManageModal
          encounter={manageTarget}
          pending={managePending}
          onRename={(name) => void handleRename(manageTarget.id, name)}
          onDelete={() => void handleDelete(manageTarget.id)}
          onClose={() => setManageTarget(null)}
        />
      ) : null}
    </>
  );
}

interface EncounterManageModalProps {
  encounter: Encounter;
  pending: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * Renommer / supprimer une rencontre (M7). Ni l'un ni l'autre n'existait : une
 * rencontre mal nommée le restait, une rencontre créée par erreur encombrait la
 * liste pour toujours — alors que `firestore.rules:338` autorisait déjà tout.
 */
function EncounterManageModal({
  encounter,
  pending,
  onRename,
  onDelete,
  onClose,
}: EncounterManageModalProps): JSX.Element {
  const titleId = `encounter-manage-${encounter.id}`;
  const [name, setName] = useState<string>(encounter.name);
  const [confirming, setConfirming] = useState<boolean>(false);
  const trimmed = name.trim();

  return (
    <DetailModal
      open
      onClose={onClose}
      titleId={titleId}
      closeLabel={t('encounters.row.manageCloseAria')}
      size="sm"
    >
      <div className="flex flex-col gap-5 px-5 py-6 pr-12">
        <h2
          id={titleId}
          className="font-display text-xl font-bold uppercase tracking-[0.12em] text-gold-bright"
        >
          {t('encounters.row.manageTitle')}
        </h2>

        <label className="flex flex-col gap-1">
          <span className="font-title text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
            {t('encounters.row.renameLabel')}
          </span>
          <input
            type="text"
            value={name}
            maxLength={ENCOUNTER_NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            aria-label={t('encounters.row.renameLabel')}
            className="w-full rounded-pill border border-white-8 bg-bg-3/60 px-4 py-2 font-serif text-body text-text outline-none transition-colors duration-200 ease-base focus:border-gold"
          />
        </label>

        <div className="flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onRename(name)}
            disabled={pending || trimmed.length === 0 || trimmed === encounter.name}
          >
            {t('encounters.row.renameSave')}
          </Button>
        </div>

        <div className="border-t border-white-8 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (confirming ? onDelete() : setConfirming(true))}
            disabled={pending}
            className={cn(
              'text-crimson',
              confirming && 'border border-crimson/50 bg-crimson/[0.08]',
            )}
          >
            {confirming ? t('encounters.row.deleteConfirm') : t('encounters.row.delete')}
          </Button>
        </div>
      </div>
    </DetailModal>
  );
}

const STATUS_CHIP: Record<
  EncounterStatus,
  { variant: 'default' | 'gold' | 'heal' | 'damage'; labelKey: Parameters<typeof t>[0] }
> = {
  planned: { variant: 'default', labelKey: 'encounters.status.planned' },
  active: { variant: 'gold', labelKey: 'encounters.status.active' },
  completed: { variant: 'heal', labelKey: 'encounters.status.completed' },
  aborted: { variant: 'damage', labelKey: 'encounters.status.aborted' },
};

interface EncounterRowProps {
  encounter: Encounter;
  /** Le MJ dispose du geste « Gérer » (renommer / supprimer, M7). */
  canManage: boolean;
  onOpen: () => void;
  onManage: () => void;
}

/**
 * Ligne cliquable d'une rencontre — navigue vers le tracker de combat
 * `EncounterScreen` (24.3). Montre nom + nb de participants + statut. Mirror de
 * `SessionRow`.
 *
 * Le geste de gestion (M7) est un bouton VISIBLE et non un appui long : un
 * appui long serait invisible au clavier et indécouvrable, et la ligne porte
 * déjà la navigation au tap.
 */
function EncounterRow({
  encounter,
  canManage,
  onOpen,
  onManage,
}: EncounterRowProps): JSX.Element {
  const status = STATUS_CHIP[encounter.status];
  return (
    <li
      className={cn(
        'flex items-stretch gap-1 rounded-card-sm border border-white-8 bg-bg-3/40',
        'transition-colors duration-150 ease-base hover:border-glow hover:bg-white/[0.03]',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'flex min-w-0 flex-1 items-center justify-between gap-3 rounded-card-sm px-4 py-3 text-left',
          'focus-visible:border-gold-bright focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-bright/40',
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span className="truncate font-serif text-body text-text">{encounter.name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <span className="hidden font-serif text-body-sm text-text-secondary sm:inline">
            {encounter.participants.length}{' '}
            {encounter.participants.length <= 1
              ? t('encounters.row.participantsSuffixOne')
              : t('encounters.row.participantsSuffix')}
          </span>
          <Chip variant={status.variant}>{t(status.labelKey)}</Chip>
        </span>
      </button>

      {canManage ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onManage}
          aria-label={`${t('encounters.row.actions')} — ${encounter.name}`}
          tooltip={t('campaigns.tip.manageEncounter')}
          className="shrink-0 self-center"
        >
          ⋯
        </Button>
      ) : null}
    </li>
  );
}
