import { createJSONStorage, type PersistStorage } from 'zustand/middleware';

/**
 * Stockage zustand `persist` durci.
 *
 * Pourquoi : le runtime peut ne pas exposer `window.localStorage` (SSR, Node
 * 26 où `localStorage` global est expérimental et retourne `undefined`, tests
 * unitaires hors jsdom). Le défaut de `persist` appelle `localStorage.setItem`
 * directement → crash dur. On préfère un no-op storage silencieux : la session
 * courante fonctionne en mémoire, et l'utilisateur perd seulement la
 * persistance entre rechargements — comportement non-bloquant et observable
 * en dev via DevTools, jamais en prod (window.localStorage existe partout
 * dans les navigateurs supportés).
 */
const noopStorage = {
  getItem: (): null => null,
  setItem: (): void => undefined,
  removeItem: (): void => undefined,
};

function pickStorage(): Storage | typeof noopStorage {
  if (typeof window === 'undefined') return noopStorage;
  try {
    // Accès en lecture peut throw sur Safari mode privé / sandboxes restrictifs.
    const candidate = window.localStorage;
    if (!candidate) return noopStorage;
    return candidate;
  } catch {
    return noopStorage;
  }
}

/**
 * À passer à `persist(...).storage`. Résout `window.localStorage` à la
 * demande avec fallback no-op. Une instance partagée suffit (le storage n'a
 * pas d'état propre).
 */
export function createSafeJSONStorage<T>(): PersistStorage<T> | undefined {
  return createJSONStorage<T>(() => pickStorage());
}
