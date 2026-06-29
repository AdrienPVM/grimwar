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
import { trackPendingWrite } from '@/shared/lib/track-pending-write';
import {
  DEFAULT_USER_DICE_SETTINGS,
  type DiceMode,
  type DiceModeUserSettings,
} from '@/shared/lib/rules/dice-mode';
import { useLocaleStore, type Locale } from '@/shared/lib/slices/locale-slice';

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
  const firestore = getDb();
  const ref = doc(firestore, 'users', uid);
  // Changement de mode de dés : la persistance est asynchrone mais l'UI doit
  // signaler l'attente d'ack via OfflineBanner (JALON 1D.3).
  await trackPendingWrite(
    firestore,
    setDoc(ref, { settings: { diceMode: next } }, { merge: true }),
  );
}

/**
 * Setter `users/{uid}.settings.followCampaignDiceMode` — même chemin d'écriture
 * que `setDiceMode` (merge Firestore + maj optimiste). Détermine si le mode de
 * dés du joueur suit le défaut de table (`campaigns/{id}.settings.diceMode`)
 * ou reste forcé à sa préférence perso. Aucune nouvelle règle : la rule
 * `users/{userId}` autorise déjà l'écriture du propriétaire.
 */
export async function setFollowCampaignDiceMode(
  uid: string,
  next: boolean,
): Promise<void> {
  useUserSettingsStore.setState({ followCampaignDiceMode: next });
  const firestore = getDb();
  const ref = doc(firestore, 'users', uid);
  await trackPendingWrite(
    firestore,
    setDoc(ref, { settings: { followCampaignDiceMode: next } }, { merge: true }),
  );
}

/**
 * Setter `users/{uid}.locale` (champ top-level, cf. DATA-MODEL.md) — même
 * pattern que `setDiceMode` (merge Firestore + maj optimiste). La locale vit
 * dans `useLocaleStore` (slice dédié, lu par `t()`/`localize()`), pas dans le
 * store user-settings : on co-localise juste l'écriture ici avec les autres
 * writes `users/{uid}` pour réutiliser `trackPendingWrite` + le seul listener.
 * Aucune nouvelle règle : `users/{userId}` autorise déjà l'écriture du
 * propriétaire (seul `tier` est verrouillé).
 */
export async function setUserLocale(uid: string, next: Locale): Promise<void> {
  useLocaleStore.getState().setLocale(next);
  const firestore = getDb();
  const ref = doc(firestore, 'users', uid);
  await trackPendingWrite(
    firestore,
    setDoc(ref, { locale: next }, { merge: true }),
  );
}

/**
 * Souscrit aux settings `users/{uid}` au sign-in. À monter une fois (dans
 * auth-provider). Merge avec les défauts si fields absents → lazy migration.
 *
 * Hydrate aussi la locale (`users/{uid}.locale`, champ top-level) dans
 * `useLocaleStore` : un seul listener sur le doc utilisateur sert les deux
 * stores. Si le champ est absent (utilisateur d'avant le switch FR/EN), on
 * laisse la locale courante (défaut FR) — pas d'écriture spéculative.
 */
export function subscribeToUserSettings(uid: string): () => void {
  const ref = doc(getDb(), 'users', uid);
  const unsub = onSnapshot(
    ref,
    (snap) => {
      const data = snap.data() as
        | { settings?: Partial<DiceModeUserSettings>; locale?: Locale }
        | undefined;
      const settings = data?.settings ?? {};
      useUserSettingsStore.getState().setFromFirestore({
        diceMode: settings.diceMode ?? DEFAULT_USER_DICE_SETTINGS.diceMode,
        followCampaignDiceMode:
          settings.followCampaignDiceMode ?? DEFAULT_USER_DICE_SETTINGS.followCampaignDiceMode,
      });
      if (data?.locale === 'fr' || data?.locale === 'en') {
        useLocaleStore.getState().setLocale(data.locale);
      }
      useUserSettingsStore.getState().setHydrated(true);
    },
    (err) => {
      console.warn('[user-settings] snapshot error — fallback defaults', err);
      useUserSettingsStore.getState().setHydrated(true);
    },
  );
  return unsub;
}
