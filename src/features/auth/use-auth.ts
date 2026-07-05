import { useCallback } from 'react';

import {
  linkAnonymousToEmail,
  linkAnonymousToGoogle,
  sendPasswordResetEmail,
  signInWithEmail,
  signInWithGoogle,
  signOutCurrentUser,
  signUpWithEmail,
  type User,
} from '@/shared/lib/firebase';
import { useAuthStore } from '@/shared/lib/slices/auth-slice';

/**
 * Pousse le user Firebase dans le store après une LIAISON de compte.
 *
 * Le listener global (`onAuthStateChanged`) ne se déclenche PAS de façon fiable
 * sur un `linkWithCredential`/`linkWithPopup` (l'uid ne change pas) — sans ça, le
 * store garderait `isAnonymous: true` et l'UI (carte « Sauvegarder ton compte »,
 * profil) ne refléterait la liaison qu'après un reload. On synchronise donc à la
 * main l'unique champ qui bouge côté produit : `isAnonymous` (+ e-mail/nom).
 */
function pushUserToStore(u: User): void {
  useAuthStore.getState().setUser({
    uid: u.uid,
    displayName: u.displayName,
    email: u.email,
    emailVerified: u.emailVerified,
    photoURL: u.photoURL,
    isAnonymous: u.isAnonymous,
  });
}

/**
 * Hook unique pour les composants : expose l'utilisateur courant + les actions
 * d'auth. Les helpers sont stables (useCallback) pour ne pas casser les
 * dépendances de useEffect/useMemo en aval.
 */
export function useAuth(): {
  user: ReturnType<typeof useAuthStore.getState>['user'];
  isAnonymous: boolean;
  isReady: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  linkToGoogle: () => Promise<void>;
  linkToEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
} {
  const user = useAuthStore((s) => s.user);
  const isAnonymous = useAuthStore((s) => s.isAnonymous);
  const isReady = useAuthStore((s) => s.isReady);

  return {
    user,
    isAnonymous,
    isReady,
    signInWithGoogle: useCallback(async () => {
      await signInWithGoogle();
    }, []),
    signInWithEmail: useCallback(async (email: string, password: string) => {
      await signInWithEmail(email, password);
    }, []),
    signUpWithEmail: useCallback(async (email: string, password: string) => {
      await signUpWithEmail(email, password);
    }, []),
    linkToGoogle: useCallback(async () => {
      pushUserToStore(await linkAnonymousToGoogle());
    }, []),
    linkToEmail: useCallback(async (email: string, password: string) => {
      pushUserToStore(await linkAnonymousToEmail(email, password));
    }, []),
    signOut: useCallback(async () => {
      await signOutCurrentUser();
    }, []),
    sendPasswordReset: useCallback(async (email: string) => {
      await sendPasswordResetEmail(email);
    }, []),
  };
}
