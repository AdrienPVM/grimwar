import { create } from 'zustand';

export type Locale = 'fr' | 'en';

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

/**
 * Locale globale. Défaut FR (cf. décision verrouillée dans CLAUDE.md).
 * EN sera ajouté en S5 ; le shape est prêt dès maintenant pour éviter une
 * migration plus tard.
 */
export const useLocaleStore = create<LocaleState>((set) => ({
  locale: 'fr',
  setLocale: (locale) => set({ locale }),
}));
