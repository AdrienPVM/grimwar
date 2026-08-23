import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { getCampaign } from '@/shared/lib/services/campaigns';

/**
 * L'utilisateur courant est-il meneur de cette campagne ? Lecture ponctuelle du
 * seul champ qui décide : `campaigns/{cid}.gmIds`.
 *
 * Sert au mode carte, ouvert aux joueurs depuis M34 : les rules autorisent la
 * LECTURE des cartes et des jetons à tout membre (`firestore.rules:348,366`),
 * mais l'écriture reste au meneur — donc l'écran doit savoir s'il rend une
 * console d'édition ou une liste de consultation.
 *
 * Ce n'est PAS une frontière de sécurité : celle-ci est côté Firestore. Une
 * réponse fausse ici afficherait au pire un bouton qui échoue proprement.
 * D'où le repli volontaire sur `false` en cas d'erreur (campagne absente,
 * permission refusée) : on ne propose jamais un geste qu'on ne sait pas permis.
 */
export function useIsMapGm(campaignId: string | undefined): {
  readonly isGm: boolean;
  readonly isResolved: boolean;
} {
  const { user } = useAuth();
  const [isGm, setIsGm] = useState<boolean>(false);
  const [isResolved, setIsResolved] = useState<boolean>(false);

  useEffect(() => {
    if (!user || !campaignId) {
      setIsGm(false);
      setIsResolved(false);
      return;
    }
    let cancelled = false;
    // `Promise.resolve().then(...)` plutôt qu'un appel direct : une erreur
    // SYNCHRONE du service (Firestore non initialisé, par exemple) remonterait
    // sinon depuis l'effet et casserait le rendu de l'écran entier.
    Promise.resolve()
      .then(() => getCampaign(campaignId))
      .then((campaign) => {
        if (cancelled) return;
        setIsGm(campaign.gmIds.includes(user.uid));
        setIsResolved(true);
      })
      .catch(() => {
        if (cancelled) return;
        setIsGm(false);
        setIsResolved(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, campaignId]);

  return { isGm, isResolved };
}
