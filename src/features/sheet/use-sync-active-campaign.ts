import { useEffect } from 'react';

import { getCampaign } from '@/shared/lib/services/campaigns';
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
 *
 * TROIS ÉTATS d'entrée (cf. `docs/plans/DEBT.md > D27`) :
 *  - `undefined` ⇒ fiche pas encore chargée OU re-sync transitoire pendant la
 *    migration v1→v2 (le doc est réécrit, `useCharacter` re-render). ON NE
 *    TOUCHE PAS le store : on préserve la dernière campagne active connue. Sans
 *    ça, une action de jeu (jet, patch de fiche) tombant dans cette fenêtre
 *    verrait `activeCampaignId === null` et `writeEvent` no-op silencieusement.
 *  - `null` ⇒ fiche CHARGÉE mais sans campagne d'attache ⇒ on efface (le pivot
 *    de dés ne doit journaliser nulle part).
 *  - `string` ⇒ campagne d'attache connue ⇒ on la pose comme active.
 *
 * Le nettoyage au DÉMONTAGE est un effet séparé (`[]`), pour ne l'exécuter qu'à
 * la sortie réelle de l'écran (route quittée) — jamais sur un simple changement
 * transitoire de `homeCampaignId`. C'est le cœur du fix D27 : l'ancien cleanup
 * couplé au keyed-effect s'exécutait à chaque re-run de dépendance ET au
 * double-invoke StrictMode, ouvrant une fenêtre `null` transitoire.
 */
export function useSyncActiveCampaign(homeCampaignId: string | null | undefined): void {
  // Pose du pointeur — ne s'exécute que quand l'état d'attache est CONNU.
  useEffect(() => {
    if (homeCampaignId === undefined) return; // inconnu : préserver l'état courant
    const { setActiveCampaign, clearActiveCampaign } = useActiveCampaignStore.getState();
    if (homeCampaignId) setActiveCampaign(homeCampaignId);
    else clearActiveCampaign();
  }, [homeCampaignId]);

  // Chargement des RÉGLAGES de la table (variantes 5e + mode de dés). Effet
  // séparé de la pose du pointeur parce qu'il est asynchrone : le pointeur doit
  // rester synchrone pour l'event-logger, les réglages arrivent après.
  //
  // Un échec (permission, campagne supprimée, hors ligne) laisse
  // `activeCampaignSettings` à `null` : la fiche joue alors en règles standard.
  // C'est le comportement d'avant ce plumbing — on ne bloque JAMAIS une fiche
  // parce que sa campagne est illisible.
  useEffect(() => {
    if (!homeCampaignId) return;
    let cancelled = false;
    void getCampaign(homeCampaignId)
      .then((campaign) => {
        if (cancelled) return;
        // La campagne active a pu changer pendant le fetch — ne pas écraser
        // les réglages d'une autre table avec une réponse en retard.
        if (useActiveCampaignStore.getState().activeCampaignId !== homeCampaignId) return;
        useActiveCampaignStore.getState().setActiveCampaignSettings(campaign.settings);
      })
      .catch(() => {
        /* réglages indisponibles ⇒ règles standard, cf. commentaire ci-dessus */
      });
    return () => {
      cancelled = true;
    };
  }, [homeCampaignId]);

  // Nettoyage au démontage réel uniquement — l'écran de fiche est quitté, plus
  // aucun contexte de jeu ne doit subsister pour le pivot de dés.
  useEffect(() => {
    return () => {
      useActiveCampaignStore.getState().clearActiveCampaign();
    };
  }, []);
}
