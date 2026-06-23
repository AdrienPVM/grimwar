import { useEffect } from 'react';

import { useActiveCampaignStore } from '@/shared/lib/slices/active-campaign-slice';

/**
 * Synchronise le store « campagne active » avec la campagne d'attache de la
 * fiche affichée. Effet de bord de montage/changement de fiche (synchro d'un
 * store EXTERNE, pas du state dérivé — usage légitime de `useEffect`).
 *
 * Conséquence : tant que la fiche du propriétaire est à l'écran et qu'elle est
 * liée à une campagne, le pivot de dés journalise les jets dans cette campagne.
 * Au démontage (ou fiche non liée), on nettoie → plus aucun event écrit hors
 * contexte de jeu. La lecture MJ (lecture seule) N'appelle PAS ce hook.
 */
export function useSyncActiveCampaign(homeCampaignId: string | null): void {
  useEffect(() => {
    const { setActiveCampaign, clearActiveCampaign } = useActiveCampaignStore.getState();
    if (homeCampaignId) setActiveCampaign(homeCampaignId);
    else clearActiveCampaign();
    return () => clearActiveCampaign();
  }, [homeCampaignId]);
}
