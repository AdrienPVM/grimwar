import { waitForPendingWrites, type Firestore } from 'firebase/firestore';

import { useSyncStore } from './slices/sync-slice';

/**
 * Suit une écriture Firestore pour le store `useSyncStore`.
 *
 * Le SDK avec `enableIndexedDbPersistence` résout `updateDoc` / `setDoc`
 * LOCALEMENT immédiatement, même hors ligne. La promesse principale n'est
 * donc pas un signal fiable de sync backend.
 *
 * Stratégie : on incrémente le compteur DÈS l'appel, on délègue l'écriture
 * réelle (qui résout normalement), puis en arrière-plan on observe
 * `waitForPendingWrites(firestore)` qui résout quand TOUTES les écritures
 * pendantes (donc au minimum celle-ci) sont acknowledgées par le backend.
 * Quand cette deuxième promesse résout (ou échoue), on décrémente.
 *
 * Conséquences :
 * - L'appelant N'EST PAS bloqué par l'attente de l'ack — le retour de
 *   `updateDoc` reste rapide pour ne pas dégrader l'UX.
 * - `pendingWrites > 0` est vrai tant qu'au moins une écriture initiée par
 *   l'app n'a pas été ack backend (ou tant qu'on est hors ligne avec
 *   modification en cache).
 * - Si l'écriture principale échoue, le compteur est quand même décrémenté
 *   (try/catch + endWrite dans finally).
 */
export function trackPendingWrite<T>(
  firestore: Firestore,
  writePromise: Promise<T>,
): Promise<T> {
  useSyncStore.getState().beginWrite();

  // L'ack backend est observé en arrière-plan : on ne le `await` pas pour
  // ne pas allonger artificiellement la promesse principale. Échec
  // silencieux (le SDK retentera, ou la déconnexion sera signalée par
  // OfflineBanner) — la garantie ici est juste de décrémenter le compteur.
  void waitForPendingWrites(firestore)
    .catch(() => undefined)
    .finally(() => {
      useSyncStore.getState().endWrite();
    });

  return writePromise;
}
