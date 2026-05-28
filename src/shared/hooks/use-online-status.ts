import { useEffect, useState } from 'react';

/**
 * Expose l'état de connectivité courant du navigateur.
 *
 * Pourquoi : l'infrastructure offline est déjà fonctionnelle (Firestore SDK
 * `enableIndexedDbPersistence` met les écritures en file et les rejoue à la
 * reconnexion ; Dexie cache les bundles publics ; le SW Workbox sert les
 * assets et `/data/*.json` en SWR/NetworkFirst). Mais rien ne le RENDAIT
 * visible à l'utilisateur. Ce hook expose le signal qu'une bannière, un
 * indicateur de sync ou un test e2e peut consommer.
 *
 * Implémentation : `navigator.onLine` + écoute des events `online` /
 * `offline` sur `window`. Pas de polling — les events sont émis par le
 * navigateur dès qu'un changement d'état réseau est détecté.
 *
 * SSR / Node : `typeof navigator === 'undefined'` → on suppose `true`
 * (lecture, pas d'illusion d'offline pendant l'hydratation).
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = (): void => setIsOnline(true);
    const handleOffline = (): void => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
