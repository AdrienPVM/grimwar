import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createSafeJSONStorage } from '../zustand-storage';

/**
 * Préférences liées à l'APPAREIL, pas au compte.
 *
 * POURQUOI PAS DANS `users/{uid}.settings` : le retour haptique n'a de sens que
 * là où il existe un moteur de vibration. Le même joueur ouvre sa fiche sur son
 * téléphone à la table et sur un portable chez lui ; un réglage synchronisé
 * ferait voyager un choix qui ne veut rien dire sur l'un des deux. Et le stocker
 * dans Firestore serait un changement de schéma pour une préférence qui n'a
 * aucune raison de quitter la machine.
 *
 * Persisté en `localStorage` via le stockage durci du projet (no-op silencieux
 * quand `localStorage` est indisponible — Safari privé, tests hors jsdom).
 */

interface DevicePrefsState {
  /** Vibrer sur les jets et leurs issues remarquables. Défaut : activé. */
  haptics: boolean;
  setHaptics: (v: boolean) => void;
}

export const useDevicePrefsStore = create<DevicePrefsState>()(
  persist(
    (set) => ({
      haptics: true,
      setHaptics: (v) => set({ haptics: v }),
    }),
    {
      name: 'grimwar.device-prefs',
      storage: createSafeJSONStorage<DevicePrefsState>(),
      // Les setters ne se persistent pas : seul l'état sérialisable voyage.
      partialize: (s) => ({ haptics: s.haptics }) as DevicePrefsState,
    },
  ),
);

/** Lecture non souscrite, pour le code hors React (moteur de dés, toasts). */
export function hapticsEnabled(): boolean {
  return useDevicePrefsStore.getState().haptics;
}
