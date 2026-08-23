import { useId, useMemo, type JSX } from 'react';

import { DetailModal } from '@/shared/components/detail-modal';
import { t } from '@/shared/lib/i18n';
import type { Campaign, Membership } from '@/shared/types/campaign';

import { CampaignMemberItem } from './campaign-member-item';
import { buildRoster, type RosterEntry } from './roster';

/**
 * La compagnie, consultable par-dessus l'écran où l'on se trouve — réponse à E7
 * de l'audit UX (scénario M5).
 *
 * En plein combat, le meneur qui voulait la fiche d'un joueur devait faire
 * rencontre → retour aux rencontres → retour à la campagne → La compagnie →
 * Voir la fiche : quatre gestes, en plein tour de jeu, en perdant le tracker.
 *
 * Le besoin fréquent — « où en est son personnage ? » — est servi SANS quitter
 * l'écran : le MJ voit les cartes live (PV, CA, états) des fiches liées qu'il a
 * le droit de lire (rule A2). Le besoin rare — la fiche entière — reste une
 * navigation, mais depuis ici plutôt que depuis quatre écrans plus loin.
 *
 * « Promouvoir MJ » est masqué : c'est de l'administration de table, pas un
 * geste de partie, et sa place n'est pas à côté des points de vie.
 */

interface RosterOverlayProps {
  open: boolean;
  onClose: () => void;
  campaign: Campaign;
  members: readonly Membership[];
  /** Le spectateur est MJ — débloque les cartes live et l'accès aux fiches. */
  viewerIsGm: boolean;
  myUid: string | null;
  myDisplayName: string | null;
  /** Ouvre la fiche du membre (navigation — ferme donc la superposition). */
  onViewSheet: (entry: RosterEntry) => void;
}

export function RosterOverlay({
  open,
  onClose,
  campaign,
  members,
  viewerIsGm,
  myUid,
  myDisplayName,
  onViewSheet,
}: RosterOverlayProps): JSX.Element {
  const titleId = useId();

  const roster = useMemo<RosterEntry[]>(
    () => buildRoster(campaign, [...members], myUid, myDisplayName),
    [campaign, members, myUid, myDisplayName],
  );

  return (
    <DetailModal
      open={open}
      onClose={onClose}
      titleId={titleId}
      size="lg"
      closeLabel={t('campaigns.roster.overlay.close')}
    >
      <div className="px-4 py-4 sm:px-6">
        <header className="pr-14">
          <h2
            id={titleId}
            className="font-display text-[20px] font-black uppercase tracking-[0.18em] text-gold-bright"
          >
            {t('campaigns.detail.roster.title')}
          </h2>
          <p className="mt-1 font-serif text-body-sm italic text-text-tertiary">
            {t('campaigns.roster.overlay.subtitle')}
          </p>
        </header>

        {roster.length === 0 ? (
          <p className="mt-4 font-serif text-body-sm italic text-text-tertiary">
            {t('campaigns.roster.overlay.empty')}
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {roster.map((entry) => (
              <li key={entry.uid}>
                <CampaignMemberItem
                  entry={entry}
                  viewerIsGm={viewerIsGm}
                  showPromote={false}
                  onPromote={() => {}}
                  onViewSheet={() => onViewSheet(entry)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </DetailModal>
  );
}
