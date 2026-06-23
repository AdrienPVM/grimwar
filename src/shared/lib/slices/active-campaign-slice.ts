/**
 * Slice « campagne active » — quelle campagne est le CONTEXTE DE JEU courant.
 *
 * Pourquoi : l'event-logger (plan 22) doit savoir DANS QUELLE campagne écrire un
 * événement, mais les call sites de jeu (pivot de dés, patch de fiche) ne
 * portent que le `characterId`. Ce store fournit le pointeur de façon
 * SYNCHRONE (`getState()`) — même motif que `useUserSettingsStore` pour le mode
 * de dés, qui se lit hors React dans le pivot.
 *
 * Qui le renseigne : l'écran de fiche du PROPRIÉTAIRE, à partir de
 * `character.homeCampaignId` (le pointeur de routage posé au lien fiche↔membre,
 * JALON 4A). Une fiche sans campagne d'attache ⇒ `null` ⇒ logger no-op. La
 * lecture MJ (lecture seule, JALON 4A.3) NE renseigne PAS ce store : le MJ ne
 * joue pas à la place du joueur.
 *
 * `activeSessionId` reste `null` jusqu'au plan 23 (sessions). Les événements
 * hors-session portent `sessionId: null` et n'apparaissent dans aucun journal
 * de session compilé (plan 25 groupe par `sessionId`) — comportement voulu : on
 * journalise tout dans la campagne, la session découpe la narration plus tard.
 */
import { create } from 'zustand';

type ActiveCampaignState = {
  activeCampaignId: string | null;
  activeSessionId: string | null;
  setActiveCampaign: (campaignId: string | null, sessionId?: string | null) => void;
  clearActiveCampaign: () => void;
};

export const useActiveCampaignStore = create<ActiveCampaignState>((set) => ({
  activeCampaignId: null,
  activeSessionId: null,
  setActiveCampaign: (campaignId, sessionId = null) =>
    set({ activeCampaignId: campaignId, activeSessionId: sessionId }),
  clearActiveCampaign: () => set({ activeCampaignId: null, activeSessionId: null }),
}));
