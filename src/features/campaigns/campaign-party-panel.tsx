import { useMemo, type JSX } from 'react';

import { t } from '@/shared/lib/i18n';
import type { Membership } from '@/shared/types/campaign';

import { PartyMemberCard } from './party-member-card';

interface CampaignPartyPanelProps {
  campaignId: string;
  members: Membership[];
}

/**
 * Panneau « compagnie » de la vue MJ (JALON 4A.4) — l'état de combat LIVE de
 * chaque joueur ayant lié une fiche (PV, états, CA, niveau), en un coup d'œil.
 * Monté MJ-only par `campaign-detail-screen` (comme le feed d'événements 22.3).
 *
 * Complémentaire du roster (qui liste TOUS les membres + actions promote / voir
 * fiche) : ici on ne montre QUE les joueurs avec une fiche liée, et on en montre
 * l'état vivant — chaque carte s'abonne en temps réel à la fiche du joueur.
 *
 * Aucune nouvelle rule ni schéma : on réutilise la lecture cross-owner A2 (4A.1),
 * `useCharacter` cross-owner (4A.3) et la `PartyCard` du proto MJ.
 */
export function CampaignPartyPanel({
  campaignId,
  members,
}: CampaignPartyPanelProps): JSX.Element {
  // Seuls les membres ayant lié une fiche ont un état à afficher (rule A2 ne
  // s'ouvre qu'aux fiches liées). Un membre sans `characterId` apparaît déjà
  // dans le roster, inutile de doubler ici.
  const linked = useMemo(
    () => members.filter((m) => m.characterId !== null),
    [members],
  );

  return (
    <section className="mt-10" aria-label={t('campaigns.detail.party.aria')}>
      <h2 className="text-center font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
        {t('campaigns.detail.party.title')}
      </h2>

      {linked.length === 0 ? (
        <p className="mt-4 py-6 text-center font-serif text-body-sm italic text-text-tertiary">
          {t('campaigns.detail.party.empty')}
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {linked.map((m) => (
            <li key={m.userId}>
              <PartyMemberCard campaignId={campaignId} member={m} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
