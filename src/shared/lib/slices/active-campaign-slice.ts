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
 *
 * `activeEncounterId` (plan 24) suit la rencontre de combat en cours : posé par
 * l'écran de rencontre MJ au `startEncounter`, libéré à la clôture. Les events
 * de jeu produits pendant un combat (jets, dégâts) sont alors tagués
 * `encounterId` → le journal (plan 25) peut découper les sections « Combat ».
 * `setActiveEncounter` est volontairement distinct de `setActiveCampaign` : on
 * peut changer de rencontre sans toucher au pointeur de campagne/session.
 */
import { create } from 'zustand';

import type { DiceMode } from '@/shared/lib/dice/types';
import { NO_VARIANTS } from '@/shared/lib/rules/long-rest';
import type { CampaignSettings, CampaignVariants } from '@/shared/types/campaign';

type ActiveCampaignState = {
  activeCampaignId: string | null;
  activeSessionId: string | null;
  activeEncounterId: string | null;
  /**
   * Réglages de la campagne active (variantes 5e + mode de dés de table).
   * `null` tant qu'ils ne sont pas chargés, ou hors campagne — les
   * consommateurs retombent alors sur les règles standard / le mode
   * utilisateur, ce qui est exactement le comportement d'avant ce plumbing.
   *
   * Séparé de `setActiveCampaign` parce que les deux n'arrivent PAS en même
   * temps : l'id est connu de façon synchrone (`character.homeCampaignId`),
   * les settings demandent une lecture Firestore. Une action de jeu tombant
   * dans cette fenêtre voit `null` et joue en RAW — jamais avec les réglages
   * d'une AUTRE campagne, puisque changer d'id remet les settings à `null`.
   */
  activeCampaignSettings: CampaignSettings | null;
  setActiveCampaign: (campaignId: string | null, sessionId?: string | null) => void;
  setActiveCampaignSettings: (settings: CampaignSettings | null) => void;
  setActiveEncounter: (encounterId: string | null) => void;
  clearActiveCampaign: () => void;
};

export const useActiveCampaignStore = create<ActiveCampaignState>((set, get) => ({
  activeCampaignId: null,
  activeSessionId: null,
  activeEncounterId: null,
  activeCampaignSettings: null,
  setActiveCampaign: (campaignId, sessionId = null) =>
    set({
      activeCampaignId: campaignId,
      activeSessionId: sessionId,
      // Changer de campagne invalide les réglages chargés : sans ça, une
      // seconde fiche héritée d'une autre table jouerait avec les variantes
      // de la première jusqu'à la fin du fetch.
      activeCampaignSettings:
        campaignId === get().activeCampaignId ? get().activeCampaignSettings : null,
    }),
  setActiveCampaignSettings: (settings) => set({ activeCampaignSettings: settings }),
  setActiveEncounter: (encounterId) => set({ activeEncounterId: encounterId }),
  clearActiveCampaign: () =>
    set({
      activeCampaignId: null,
      activeSessionId: null,
      activeEncounterId: null,
      activeCampaignSettings: null,
    }),
}));

/**
 * Mode de dés de la table, sous la forme attendue par `effectiveDiceMode`.
 * Lecture SYNCHRONE (hors React) : le pivot de dés s'exécute dans un handler,
 * pas dans un render. `null` ⇒ pas de table ⇒ le mode utilisateur l'emporte.
 */
export function activeCampaignDiceSettings(): { diceMode: DiceMode } | null {
  const settings = useActiveCampaignStore.getState().activeCampaignSettings;
  return settings ? { diceMode: settings.diceMode } : null;
}

/**
 * Variantes 5e de la table active, pour les composants de fiche (repos…).
 * Hors campagne — ou avant l'arrivée des réglages — on rend `NO_VARIANTS` :
 * les règles standard sont le défaut, jamais une variante par accident.
 */
export function useActiveCampaignVariants(): CampaignVariants {
  return useActiveCampaignStore((s) => s.activeCampaignSettings?.variants ?? NO_VARIANTS);
}
