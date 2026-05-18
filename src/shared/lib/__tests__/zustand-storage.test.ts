/**
 * Tests garde-fou pour `createSafeJSONStorage` (zustand-storage.ts).
 *
 * Bug à prévenir : sur Node 26, le `localStorage` global expérimental shadow
 * celui injecté par jsdom et retourne `undefined` à l'écriture. Le défaut de
 * zustand `persist` appelle `localStorage.setItem` directement → crash dur
 * (`TypeError: Cannot read properties of undefined`). Le helper doit retomber
 * sur un no-op storage silencieux dans tout environnement où `window` ou
 * `window.localStorage` est inaccessible.
 *
 * Rouge-avant-vert : sans le helper, importer puis muter `useWizardStore` ou
 * `useSheetModeStore` avec un `window.localStorage` cassé crashait avec
 * `Cannot read properties of undefined (reading 'setItem')`. Les 4 tests ci-
 * dessous échouent sur le code pré-fix (storage par défaut).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSafeJSONStorage } from '@/shared/lib/zustand-storage';

describe('createSafeJSONStorage', (): void => {
  const originalLocalStorage = window.localStorage;

  afterEach((): void => {
    // Restaure window.localStorage pour ne pas polluer les autres tests.
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: originalLocalStorage,
    });
    vi.restoreAllMocks();
  });

  it('utilise window.localStorage quand il est disponible', (): void => {
    const storage = createSafeJSONStorage<{ value: string }>();
    expect(storage).toBeDefined();
    storage?.setItem('grimwar-test-key', { state: { value: 'ok' }, version: 0 });
    const raw = window.localStorage.getItem('grimwar-test-key');
    expect(raw).toContain('"value":"ok"');
    window.localStorage.removeItem('grimwar-test-key');
  });

  it('ne crashe pas quand window.localStorage est undefined', async (): Promise<void> => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: undefined,
    });
    const storage = createSafeJSONStorage<{ value: string }>();
    expect(() => {
      storage?.setItem('any-key', { state: { value: 'x' }, version: 0 });
    }).not.toThrow();
    expect(await storage?.getItem('any-key')).toBeNull();
  });

  it("ne crashe pas quand l'accès à window.localStorage throw (Safari mode privé)", (): void => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: (): never => {
        throw new Error('SecurityError');
      },
    });
    const storage = createSafeJSONStorage<{ value: string }>();
    expect(() => {
      storage?.setItem('any-key', { state: { value: 'x' }, version: 0 });
    }).not.toThrow();
  });

  it('useWizardStore peut muter sans crasher quand localStorage est cassé', async (): Promise<void> => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: undefined,
    });
    // Import dynamique pour que zustand persist résolve son storage après
    // qu'on ait cassé window.localStorage. Un import statique aurait
    // capturé le storage avant la mutation.
    vi.resetModules();
    const mod = await import('@/shared/lib/slices/wizard-slice');
    expect(() => {
      mod.useWizardStore.getState().setField('name', 'Thalin');
    }).not.toThrow();
    expect(mod.useWizardStore.getState().draft.name).toBe('Thalin');
  });
});
