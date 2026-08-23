import { useDevicePrefsStore } from './slices/device-prefs-slice';
import { showToast, type ToastEntry } from './slices/toast-slice';

/**
 * Notifications de partie — ce qui arrive SANS qu'on l'ait demandé.
 *
 * Distinction volontaire d'avec `showToast` : un toast de jet de dés est une
 * RÉPONSE à un geste du joueur, une notification est une INTERRUPTION décidée
 * par quelqu'un d'autre (le MJ envoie un document, le combat démarre, ton tour
 * arrive). Seules les secondes se coupent — couper les premières reviendrait à
 * cacher au joueur le résultat de son propre lancer.
 *
 * Le réglage est lu à l'appel et non capturé : un joueur qui coupe les
 * notifications en pleine partie doit être obéi tout de suite, sans que les
 * écouteurs déjà montés aient à se remonter.
 *
 * Ce qui n'est PAS coupé : le bandeau « c'est à toi » de la fiche. Il n'est pas
 * une sonnerie mais de l'état affiché — le taire rendrait le joueur aveugle à
 * son tour au lieu de le laisser tranquille.
 */
export function notifyPlayer(toast: Omit<ToastEntry, 'id'>): void {
  if (!useDevicePrefsStore.getState().gameNotifications) return;
  showToast(toast);
}

/** Lecture non souscrite, pour les tests et le code hors React. */
export function gameNotificationsEnabled(): boolean {
  return useDevicePrefsStore.getState().gameNotifications;
}
