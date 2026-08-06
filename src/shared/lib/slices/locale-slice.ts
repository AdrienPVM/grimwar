import { create } from 'zustand';

import { effectiveLocale } from '../rules/table-language';

export type Locale = 'fr' | 'en';

type LocaleState = {
  /**
   * Locale EFFECTIVE — la seule que lisent `t()` et `localize()`. Dérivée de
   * `userLocale` et `tableLocale` par `effectiveLocale` ; jamais posée à la
   * main hors des setters ci-dessous (sauf en test, où un `setState({locale})`
   * direct reste volontairement possible pour figer une langue).
   */
  locale: Locale;
  /** Choix explicite du compte (`users/{uid}.locale`). `null` = jamais tranché. */
  userLocale: Locale | null;
  /** Langue de la table active (`campaigns/{cid}.settings.language`). */
  tableLocale: Locale | null;
  /** Choix explicite de l'utilisateur — l'emporte sur la table, partout. */
  setLocale: (locale: Locale) => void;
  /** Hydratation depuis Firestore : `null` quand le champ est absent du doc. */
  setUserLocale: (locale: Locale | null) => void;
  /** Posée/libérée par la synchro de campagne active. */
  setTableLocale: (locale: Locale | null) => void;
};

/**
 * Locale globale. Défaut FR (cf. décision verrouillée dans CLAUDE.md).
 *
 * Deux sources depuis l'audit de malléabilité (M54) : le choix du compte et la
 * langue de la table. Le premier gagne quand il existe — un joueur qui a
 * délibérément mis son app en anglais ne se la voit pas rebasculer en français
 * parce qu'il rejoint une table francophone. Cf. `rules/table-language.ts`.
 */
export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: 'fr',
  userLocale: null,
  tableLocale: null,
  setLocale: (locale) => set({ userLocale: locale, locale }),
  setUserLocale: (userLocale) =>
    set({ userLocale, locale: effectiveLocale(userLocale, get().tableLocale) }),
  setTableLocale: (tableLocale) =>
    set({ tableLocale, locale: effectiveLocale(get().userLocale, tableLocale) }),
}));
