/**
 * Slice Zustand d'authentification : exposé à l'app via useAuthStore.
 * Pas de logique Firebase ici — uniquement le miroir de l'état utilisateur
 * et le flag de readiness pour gate le splash initial.
 */
import { create } from 'zustand';

export type AuthUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  emailVerified: boolean;
  photoURL: string | null;
  isAnonymous: boolean;
};

type AuthState = {
  user: AuthUser | null;
  isAnonymous: boolean;
  isReady: boolean;
  setUser: (user: AuthUser | null) => void;
  setReady: (ready: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAnonymous: false,
  isReady: false,
  setUser: (user) =>
    set({
      user,
      isAnonymous: user?.isAnonymous ?? false,
    }),
  setReady: (ready) => set({ isReady: ready }),
}));
