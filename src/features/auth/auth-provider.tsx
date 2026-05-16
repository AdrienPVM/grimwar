import { useEffect, useRef, type ReactNode } from 'react';

import {
  signInAnonymouslyAndPersist,
  subscribeToAuthChanges,
  type User,
} from '@/shared/lib/firebase';
import { useAuthStore, type AuthUser } from '@/shared/lib/slices/auth-slice';
import {
  subscribeToUserSettings,
  useUserSettingsStore,
} from '@/shared/lib/slices/user-settings-slice';

/**
 * Branche Firebase Auth sur le store Zustand et déclenche un sign-in anonyme
 * la première fois qu'aucun utilisateur n'est détecté. Place-le aussi haut que
 * possible dans l'arbre pour gate le rendu via `isReady`.
 *
 * Plan 12.5 : à chaque changement d'utilisateur authentifié, on hydrate les
 * settings (`users/{uid}.settings.*`) via `subscribeToUserSettings`. La
 * souscription précédente est démontée pour éviter les fuites sur swap de
 * compte (anon → google linké, par ex.).
 */
export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const setUser = useAuthStore((s) => s.setUser);
  const setReady = useAuthStore((s) => s.setReady);
  // Garde-fou contre un double sign-in anon en StrictMode.
  const anonSignInTriggered = useRef(false);
  // Cleanup de la souscription Firestore settings entre changements d'uid.
  const settingsUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((fbUser) => {
      setUser(fbUser ? toAuthUser(fbUser) : null);
      setReady(true);

      if (settingsUnsubRef.current) {
        settingsUnsubRef.current();
        settingsUnsubRef.current = null;
      }
      if (fbUser) {
        settingsUnsubRef.current = subscribeToUserSettings(fbUser.uid);
      } else {
        useUserSettingsStore.getState().reset();
      }

      if (!fbUser && !anonSignInTriggered.current) {
        anonSignInTriggered.current = true;
        signInAnonymouslyAndPersist().catch((err: unknown) => {
          console.error('[auth] Échec sign-in anonyme', err);
        });
      }
    });
    return () => {
      unsubscribe();
      if (settingsUnsubRef.current) {
        settingsUnsubRef.current();
        settingsUnsubRef.current = null;
      }
    };
  }, [setUser, setReady]);

  return <>{children}</>;
}

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    emailVerified: user.emailVerified,
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous,
  };
}
