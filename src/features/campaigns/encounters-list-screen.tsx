import { useMemo, useState, type JSX } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { Splash } from '@/shared/components/splash';
import { t } from '@/shared/lib/i18n';
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
      <main className="relative z-10 mx-auto w-full max-w-[860px] px-4 py-8 sm:px-6 lg:px-8">
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
                <EncounterRow key={encounter.id} encounter={encounter} />
              ))}
            </ul>
            {createCta ? <div className="mt-10 flex justify-center">{createCta}</div> : null}
          </>
        )}
      </main>

      <EncounterCreateModal
        campaignId={cid}
        open={createOpen}
        linkedMembers={linkedMembers}
        onClose={() => setCreateOpen(false)}
        onCreated={() => refresh()}
      />
    </>
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
}

/**
 * Carte d'affichage d'une rencontre — statique en 24.2 (pas de navigation : le
 * tracker `EncounterScreen` arrive en 24.3). Montre nom + nb de participants +
 * statut.
 */
function EncounterRow({ encounter }: EncounterRowProps): JSX.Element {
  const status = STATUS_CHIP[encounter.status];
  return (
    <li className="flex items-center justify-between gap-3 rounded-card-sm border border-white-8 bg-bg-3/40 px-4 py-3">
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
    </li>
  );
}
