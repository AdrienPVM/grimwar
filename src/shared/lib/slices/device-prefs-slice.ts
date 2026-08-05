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
  /**
   * Faire tomber des dés 3D sur les jets numériques. Défaut : activé.
   *
   * Réglage d'APPAREIL au même titre que l'haptique : la culbute coûte quelques
   * images de composition, ce qui se sent sur un vieux téléphone alors que ça ne
   * se voit pas sur un portable. Le joueur peut l'éteindre là où ça rame sans
   * l'éteindre partout.
   */
  dice3d: boolean;
  setDice3d: (v: boolean) => void;
}

export const useDevicePrefsStore = create<DevicePrefsState>()(
  persist(
    (set) => ({
      haptics: true,
      setHaptics: (v) => set({ haptics: v }),
      dice3d: true,
      setDice3d: (v) => set({ dice3d: v }),
    }),
    {
      name: 'grimwar.device-prefs',
      storage: createSafeJSONStorage<DevicePrefsState>(),
      // Les setters ne se persistent pas : seul l'état sérialisable voyage.
      partialize: (s) =>
        ({ haptics: s.haptics, dice3d: s.dice3d }) as DevicePrefsState,
    },
  ),
);

/** Lecture non souscrite, pour le code hors React (moteur de dés, toasts). */
export function hapticsEnabled(): boolean {
  return useDevicePrefsStore.getState().haptics;
}

/** Idem pour le plateau de dés 3D. */
export function dice3dEnabled(): boolean {
  return useDevicePrefsStore.getState().dice3d;
}
