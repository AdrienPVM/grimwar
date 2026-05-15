import { useCallback } from 'react';

import {
  linkAnonymousToEmail,
  linkAnonymousToGoogle,
  sendPasswordResetEmail,
  signInWithEmail,
  signInWithGoogle,
  signOutCurrentUser,
  signUpWithEmail,
} from '@/shared/lib/firebase';
import { useAuthStore } from '@/shared/lib/slices/auth-slice';

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
      await linkAnonymousToGoogle();
    }, []),
    linkToEmail: useCallback(async (email: string, password: string) => {
      await linkAnonymousToEmail(email, password);
    }, []),
    signOut: useCallback(async () => {
      await signOutCurrentUser();
    }, []),
    sendPasswordReset: useCallback(async (email: string) => {
      await sendPasswordResetEmail(email);
    }, []),
  };
}
