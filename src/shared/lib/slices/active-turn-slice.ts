/**
 * Slice « tour en cours » — le combat actif de la campagne courante, et
 * surtout : est-ce à MOI de jouer ?
 *
 * POURQUOI un store plutôt qu'un second listener : le toast « c'est à vous de
 * jouer » est éphémère par nature (6 s). Un joueur qui repose son téléphone rate
 * son tour. Il faut donc aussi un signal PERSISTANT sur la fiche — et les deux
 * doivent lire la même chose. Ce store est alimenté par l'UNIQUE listener de
 * `use-encounter-notifications.ts` : le hook toaste sur les TRANSITIONS, la
 * fiche affiche l'ÉTAT. Ouvrir un second `onSnapshot` pour le bandeau
 * dupliquerait l'abonnement et, pire, laisserait les deux diverger.
 *
 * Toujours nettoyé au démontage de l'écouteur (changement de campagne, sortie
 * de contexte de jeu) : un bandeau « à vous de jouer » qui survivrait à la fin
 * d'un combat serait pire que pas de bandeau du tout.
 */
import { create } from 'zustand';

interface ActiveTurn {
  campaignId: string;
  encounterId: string;
  encounterName: string;
  round: number;
  /** `true` quand le participant dont c'est le tour est le personnage du joueur. */
  isMyTurn: boolean;
}

interface ActiveTurnState {
  turn: ActiveTurn | null;
  setTurn: (turn: ActiveTurn) => void;
  clearTurn: () => void;
}

export const useActiveTurnStore = create<ActiveTurnState>((set) => ({
  turn: null,
  setTurn: (turn) => set({ turn }),
  clearTurn: () => set({ turn: null }),
}));
