import { type JSX } from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { campaignIdFromPath } from '@/shared/lib/campaign-route';
import { useActiveCampaignStore } from '@/shared/lib/slices/active-campaign-slice';

import { useHandoutNotifications } from './use-handout-notifications';

/**
 * Point de montage UNIQUE des notifications de campagne (E13, étape 1).
 *
 * POURQUOI : `useHandoutNotifications` faisait déjà le bon travail — écoute
 * temps réel, premier snapshot marqué « vu » sans bruit — mais il n'était monté
 * que sur `campaign-detail-screen`. Le joueur ne recevait donc le toast que s'il
 * regardait déjà le hub de sa campagne, jamais depuis sa fiche : c'est-à-dire
 * jamais pendant la partie, le seul moment où le MJ envoie un document.
 * L'app est temps réel (`onSnapshot`) mais ne s'en servait que pour rafraîchir
 * l'écran qu'on regardait déjà.
 *
 * QUELLE CAMPAGNE : deux sources, dans cet ordre.
 *  1. L'URL — toutes les routes `/campaigns/:cid/**` et `/map-proto/cloud/:cid/**`.
 *  2. À défaut, la campagne active du store, posée par la fiche du propriétaire
 *     à partir de son `homeCampaignId` (`use-sync-active-campaign.ts`).
 * La réunion des deux couvre exactement les surfaces de JEU. L'accueil, le Codex
 * et le compte n'en font pas partie : on n'y joue pas, et écouter sans contexte
 * demanderait de choisir arbitrairement une campagne parmi celles du joueur.
 *
 * Rendu `null` — c'est un montage d'écouteurs, pas un élément visuel ; les
 * toasts sortent par le `ToastHost` global.
 *
 * Extension prévue (E13 étapes suivantes) : combat démarré, tour du joueur, PNJ
 * révélé. Ils se branchent ICI, sur le même identifiant de campagne, et non dans
 * l'écran qui les concerne — c'est tout l'objet de ce composant.
 */
export function CampaignNotifications(): JSX.Element | null {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const activeCampaignId = useActiveCampaignStore((s) => s.activeCampaignId);

  const campaignId = campaignIdFromPath(pathname) ?? activeCampaignId ?? undefined;

  useHandoutNotifications(campaignId, user?.uid);

  return null;
}
