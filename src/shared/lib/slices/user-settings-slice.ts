/**
 * Slice user-settings (plan 12.5).
 *
 * Choix : slice séparé plutôt que d'élargir `auth-slice`. Raison : l'auth slice
 * miroir uniquement l'état Firebase Auth (uid, providers, ready). Les settings
 * `users/{uid}.*` sont une autre couche (préférences applicatives) qui va
 * grossir (plan 35 ajoutera locale, theme, notifications, etc.). On garde une
 * frontière claire.
 *
 * Hydratation : `useUserSettingsHydrator` (auth-provider la monte) read une
 * fois le doc Firestore au sign-in, merge avec les défauts (lazy migration),
 * puis snapshote toute modif externe.
 *
 * Setter : `setDiceMode` patch Firestore (merge) — optimistic update côté store
 * pour que le toggle UI réagisse immédiatement.
 */
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { create } from 'zustand';

import { getDb } from '@/shared/lib/firebase';
import {
  DEFAULT_USER_DICE_SETTINGS,
  type DiceMode,
  type DiceModeUserSettings,
} from '@/shared/lib/rules/dice-mode';

interface UserSettingsState extends DiceModeUserSettings {
  hydrated: boolean;
  setFromFirestore: (partial: Partial<DiceModeUserSettings>) => void;
  setHydrated: (v: boolean) => void;
  reset: () => void;
}

export const useUserSettingsStore = create<UserSettingsState>((set) => ({
  ...DEFAULT_USER_DICE_SETTINGS,
  hydrated: false,
  setFromFirestore: (partial) =>
    set({
      diceMode: partial.diceMode ?? DEFAULT_USER_DICE_SETTINGS.diceMode,
      followCampaignDiceMode:
        partial.followCampaignDiceMode ?? DEFAULT_USER_DICE_SETTINGS.followCampaignDiceMode,
    }),
  setHydrated: (v) => set({ hydrated: v }),
  reset: () => set({ ...DEFAULT_USER_DICE_SETTINGS, hydrated: false }),
}));

/**
 * Setter qui patch `users/{uid}.settings.diceMode` côté Firestore + mise à jour
 * optimiste du store. Si Firestore plante (offline), on conserve la maj locale
 * — le SDK Firestore retentera l'écriture quand le réseau revient (queue
 * offline via IndexedDB persistence, activée dans `firebase.ts`).
 */
export async function setDiceMode(uid: string, next: DiceMode): Promise<void> {
  useUserSettingsStore.setState({ diceMode: next });
  const ref = doc(getDb(), 'users', uid);
  await setDoc(ref, { settings: { diceMode: next } }, { merge: true });
}

/**
 * Souscrit aux settings `users/{uid}` au sign-in. À monter une fois (dans
 * auth-provider). Merge avec les défauts si fields absents → lazy migration.
 */
export function subscribeToUserSettings(uid: string): () => void {
  const ref = doc(getDb(), 'users', uid);
  const unsub = onSnapshot(
    ref,
    (snap) => {
      const data = snap.data() as { settings?: Partial<DiceModeUserSettings> } | undefined;
      const settings = data?.settings ?? {};
      useUserSettingsStore.getState().setFromFirestore({
        diceMode: settings.diceMode ?? DEFAULT_USER_DICE_SETTINGS.diceMode,
        followCampaignDiceMode:
          settings.followCampaignDiceMode ?? DEFAULT_USER_DICE_SETTINGS.followCampaignDiceMode,
      });
      useUserSettingsStore.getState().setHydrated(true);
    },
    (err) => {
      console.warn('[user-settings] snapshot error — fallback defaults', err);
      useUserSettingsStore.getState().setHydrated(true);
    },
  );
  return unsub;
}
