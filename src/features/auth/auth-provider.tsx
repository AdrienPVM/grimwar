import { useEffect, useRef, type ReactNode } from 'react';

import {
  signInAnonymouslyAndPersist,
  subscribeToAuthChanges,
  type User,
} from '@/shared/lib/firebase';
import { useAuthStore, type AuthUser } from '@/shared/lib/slices/auth-slice';

/**
 * Branche Firebase Auth sur le store Zustand et déclenche un sign-in anonyme
 * la première fois qu'aucun utilisateur n'est détecté. Place-le aussi haut que
 * possible dans l'arbre pour gate le rendu via `isReady`.
 */
export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const setUser = useAuthStore((s) => s.setUser);
  const setReady = useAuthStore((s) => s.setReady);
  // Garde-fou contre un double sign-in anon en StrictMode.
  const anonSignInTriggered = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((fbUser) => {
      setUser(fbUser ? toAuthUser(fbUser) : null);
      setReady(true);

      if (!fbUser && !anonSignInTriggered.current) {
        anonSignInTriggered.current = true;
        signInAnonymouslyAndPersist().catch((err: unknown) => {
          console.error('[auth] Échec sign-in anonyme', err);
        });
      }
    });
    return unsubscribe;
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
