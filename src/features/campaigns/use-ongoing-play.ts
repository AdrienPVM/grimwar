import { useEffect, useState } from 'react';

import { getActiveEncounter } from '@/shared/lib/services/encounters';
import { getActiveSession } from '@/shared/lib/services/sessions';

import { selectOngoing, type OngoingCandidate } from './ongoing-play';
import { useMyCampaigns } from './use-my-campaigns';

/**
 * Nombre de campagnes sondées, les plus récemment touchées d'abord
 * (`listMyCampaigns` trie par `updatedAt` décroissant).
 *
 * POURQUOI une borne : le sondage coûte 2 lectures par campagne, à chaque
 * arrivée sur l'accueil. Un joueur a typiquement 1 à 5 campagnes ; au-delà, les
 * plus anciennes n'ont quasi aucune chance d'avoir une séance ouverte, et on
 * refuse de faire grossir le coût de l'écran d'accueil avec l'historique d'un
 * compte. Une table oubliée hors des 5 dernières reste accessible par
 * « Campagnes » — on perd le raccourci, pas l'accès.
 */
const SCANNED_CAMPAIGNS = 5;

interface UseOngoingPlayResult {
  ongoing: OngoingCandidate | null;
  isLoading: boolean;
}

/**
 * « Qu'est-ce qui se passe maintenant ? » — sonde les campagnes du user et
 * renvoie la table à reprendre (combat en cours prioritaire sur séance en
 * cours, cf. `selectOngoing`).
 *
 * Les deux lectures sont filtrées sur un seul champ (`where('status','==',
 * 'active')` + `limit(1)`) : index automatique Firestore, **aucun index
 * composite à déployer**.
 *
 * Mode de défaillance assumé : toute erreur (droits, réseau, hors ligne) donne
 * `ongoing: null`, donc pas de bandeau. C'est un RACCOURCI vers un écran qui
 * reste atteignable par la navigation normale — il ne doit jamais faire tomber
 * l'accueil ni afficher une erreur pour une commodité. Les écrans de campagne,
 * eux, remontent leurs erreurs.
 */
export function useOngoingPlay(): UseOngoingPlayResult {
  const { campaigns, isLoading: campaignsLoading } = useMyCampaigns();
  const [ongoing, setOngoing] = useState<OngoingCandidate | null>(null);
  const [isProbing, setIsProbing] = useState<boolean>(false);

  // `campaigns` est un tableau recréé à chaque fetch : on dépend de la liste
  // d'ids sérialisée, sinon l'effet se rejouerait à chaque rendu du parent.
  const scannedIds = campaigns
    .slice(0, SCANNED_CAMPAIGNS)
    .map((c) => c.id)
    .join(',');

  useEffect(() => {
    if (campaignsLoading) return;
    const scanned = campaigns.slice(0, SCANNED_CAMPAIGNS);
    if (scanned.length === 0) {
      setOngoing(null);
      return;
    }
    let cancelled = false;
    setIsProbing(true);
    void Promise.all(
      scanned.map(async (campaign): Promise<OngoingCandidate> => {
        const [session, encounter] = await Promise.all([
          getActiveSession(campaign.id).catch(() => null),
          getActiveEncounter(campaign.id).catch(() => null),
        ]);
        return { campaign, session, encounter };
      }),
    ).then((candidates) => {
      if (cancelled) return;
      setOngoing(selectOngoing(candidates));
      setIsProbing(false);
    });
    return () => {
      cancelled = true;
    };
    // `scannedIds` est la forme STABLE de `campaigns` : le tableau lui-même
    // change d'identité à chaque fetch et relancerait le sondage en boucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannedIds, campaignsLoading]);

  return { ongoing, isLoading: campaignsLoading || isProbing };
}
