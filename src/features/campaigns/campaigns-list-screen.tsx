import { useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/shared/components/button';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { Splash } from '@/shared/components/splash';
import { t } from '@/shared/lib/i18n';
import type { Campaign } from '@/shared/types/campaign';

import { CampaignCard } from './campaign-card';
import { CreateCampaignModal } from './create-campaign-modal';
import { LeaveCampaignModal } from './leave-campaign-modal';
import { useMyCampaigns } from './use-my-campaigns';

/**
 * Route `/campaigns` — premier écran utilisateur du JALON 4 (S2 campaigns).
 *
 * Liste les campagnes auxquelles le user participe (MJ ou joueur), avec :
 *  - empty state guidé (créer / rejoindre par code),
 *  - bouton « Créer une campagne » → ouvre CreateCampaignModal,
 *  - bouton « Rejoindre par code » — disabled en V1 4.0.4, plein en 4.0.5
 *    (la modale `join-by-code-modal.tsx` arrive avec le détail campagne),
 *  - une carte par campagne avec « Ouvrir » (disabled V1 4.0.4 → 4.0.5)
 *    et « Quitter » avec confirmation.
 *
 * État partagé : `useMyCampaigns()` expose `{ campaigns, isLoading, error,
 * refresh }`. Le `refresh` est appelé après create/leave réussis pour ré-aligner
 * la liste — voir choix one-shot vs onSnapshot documenté dans le hook.
 */
export function CampaignsListScreen(): JSX.Element {
  const navigate = useNavigate();
  const { campaigns, isLoading, error, refresh } = useMyCampaigns();
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [leaveTarget, setLeaveTarget] = useState<Campaign | null>(null);

  if (isLoading) return <Splash />;

  if (error) {
    return (
      <main className="relative z-10 mx-auto flex min-h-[60vh] max-w-[420px] flex-col items-center justify-center px-6 py-12">
        <GlassPanel className="w-full px-6 py-8 text-center">
          <h1 className="font-title text-body uppercase tracking-[0.18em] text-crimson">
            {t('campaigns.error.title')}
          </h1>
          <p className="mt-3 font-serif text-body-sm text-text-secondary">
            {t('campaigns.error.body')}
          </p>
          <Button variant="secondary" size="sm" onClick={refresh} className="mt-6">
            {t('campaigns.error.retry')}
          </Button>
        </GlassPanel>
      </main>
    );
  }

  if (campaigns.length === 0) {
    return (
      <>
        <main className="relative z-10 mx-auto flex min-h-[60vh] max-w-[520px] flex-col items-center justify-center px-6 py-12">
          <GlassPanel className="w-full px-7 py-10 text-center">
            <h1 className="font-display text-2xl uppercase tracking-[0.18em] text-gold-bright">
              {t('campaigns.empty.title')}
            </h1>
            <Divider className="my-5" />
            <p className="mx-auto max-w-[40ch] font-serif text-body italic text-text-secondary">
              {t('campaigns.empty.body')}
            </p>
            <div className="mt-7 flex flex-col items-stretch gap-3 sm:items-center">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setCreateOpen(true)}
              >
                {t('campaigns.cta.create')}
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate('/campaigns/join')}
              >
                {t('campaigns.cta.join')}
              </Button>
            </div>
          </GlassPanel>
        </main>

        <CreateCampaignModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => refresh()}
        />
      </>
    );
  }

  return (
    <>
      <main className="relative z-10 mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="text-center">
          <Divider className="mb-4" />
          <h1 className="font-display text-3xl font-bold uppercase tracking-[0.18em] text-gold-bright">
            {t('campaigns.title')}
          </h1>
          <p className="mt-2 font-serif text-body italic text-text-secondary">
            {t('campaigns.subtitle')}
          </p>
        </header>

        <section
          aria-label={t('campaigns.list.aria')}
          className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onLeaveClick={setLeaveTarget}
            />
          ))}
        </section>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
          <Button
            variant="primary"
            size="lg"
            onClick={() => setCreateOpen(true)}
          >
            {t('campaigns.cta.create')}
          </Button>
          <Button
            variant="secondary"
            size="md"
            disabled
            title={t('campaigns.cta.joinSoon')}
          >
            {t('campaigns.cta.join')}
          </Button>
        </div>
      </main>

      <CreateCampaignModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => refresh()}
      />

      <LeaveCampaignModal
        open={leaveTarget !== null}
        campaign={leaveTarget}
        onClose={() => setLeaveTarget(null)}
        onLeft={() => refresh()}
      />
    </>
  );
}
