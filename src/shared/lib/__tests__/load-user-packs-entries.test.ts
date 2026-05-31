import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((..._args: unknown[]) => ({ _kind: 'collection' })),
  getDocs: vi.fn(),
}));

vi.mock('../firebase', () => ({
  getDb: vi.fn(() => ({ _kind: 'db' })),
}));

import { collection, getDocs } from 'firebase/firestore';

import { loadUserPacksEntries } from '../load-user-packs-entries';

const mockedGetDocs = vi.mocked(getDocs);
const mockedCollection = vi.mocked(collection);

interface FakeDocSnap {
  id: string;
  data: () => unknown;
}

function makeSnapshot(docs: FakeDocSnap[]): { forEach: (cb: (d: FakeDocSnap) => void) => void } {
  return {
    forEach: (cb): void => {
      docs.forEach(cb);
    },
  };
}

function spell(id: string, name: string) {
  return {
    id,
    name: { fr: name, en: name },
    level: 1,
    school: 'evocation' as const,
    castingTime: { fr: '1 action', en: '1 action' },
    range: { fr: '30 mètres', en: '120 feet' },
    components: { v: true, s: true, m: false },
    duration: { fr: 'Instantanée', en: 'Instantaneous' },
    concentration: false,
    ritual: false,
    description: { fr: name, en: name },
    atHigherLevels: null,
    classes: ['wizard'],
    source: 'srd-5.2.1' as const,
  };
}

describe('loadUserPacksEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lit la sous-collection users/{uid}/customContentPacks', async () => {
    mockedGetDocs.mockResolvedValueOnce(makeSnapshot([]) as never);

    await loadUserPacksEntries('spells', 'user-42');

    expect(mockedCollection).toHaveBeenCalledWith(
      { _kind: 'db' },
      'users',
      'user-42',
      'customContentPacks',
    );
  });

  it('aplatit entities[type] depuis tous les packs', async () => {
    mockedGetDocs.mockResolvedValueOnce(
      makeSnapshot([
        {
          id: 'pack-a',
          data: () => ({ entities: { spells: [spell('fire-a', 'Feu A')] } }),
        },
        {
          id: 'pack-b',
          data: () => ({ entities: { spells: [spell('fire-b', 'Feu B')] } }),
        },
      ]) as never,
    );

    const result = await loadUserPacksEntries('spells', 'user-1');

    expect(result.map((s) => s.id)).toEqual(['fire-a', 'fire-b']);
  });

  it('ignore une entrée invalide sans casser le reste du pack + warn', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockedGetDocs.mockResolvedValueOnce(
      makeSnapshot([
        {
          id: 'pack-a',
          data: () => ({
            entities: {
              spells: [spell('ok', 'Sort valide'), { id: 'broken' } /* manque champs requis */],
            },
          }),
        },
      ]) as never,
    );

    const result = await loadUserPacksEntries('spells', 'user-1');

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('ok');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('retourne [] pour un type non-supporté par les packs (magic-items)', async () => {
    const result = await loadUserPacksEntries('magic-items', 'user-1');
    expect(result).toEqual([]);
    // Aucune query Firestore ne doit partir — économise un round-trip
    expect(mockedGetDocs).not.toHaveBeenCalled();
  });

  it('dédup in-flight : 30 appels parallèles → 1 seul getDocs', async () => {
    // Ce test garde le fix CI run 26717411652 — quand le wizard monte ~30
    // hooks `useContent` simultanés, chacun appelle `loadUserPacksEntries`
    // pour son type. Sans dédup, on faisait 30 round-trips Firestore
    // concurrents sur la MÊME collection — l'émulateur tombait en timeout
    // (CI emulator cancelled à 1h06).
    let resolveSnap: (snap: ReturnType<typeof makeSnapshot>) => void = () => undefined;
    const pending = new Promise<ReturnType<typeof makeSnapshot>>((res) => {
      resolveSnap = res;
    });
    mockedGetDocs.mockReturnValueOnce(pending as never);

    // 30 appels parallèles : ne resolve pas encore — laisse `getDocs` en vol.
    const callPromises = Array.from({ length: 30 }, () =>
      loadUserPacksEntries('spells', 'user-1'),
    );
    // Tous les appels partagent la même promesse en vol.
    expect(mockedGetDocs).toHaveBeenCalledTimes(1);

    resolveSnap(makeSnapshot([]));
    await Promise.all(callPromises);
  });

  it('appel séquentiel post-resolve : refetch (pas de cache persistant)', async () => {
    // La dédup est in-flight, pas un cache : après que la promesse résolve,
    // un nouvel appel doit refetch — cohérence post-import (un pack importé
    // doit être visible immédiatement, pas après TTL).
    mockedGetDocs.mockResolvedValue(makeSnapshot([]) as never);

    await loadUserPacksEntries('spells', 'user-1');
    await loadUserPacksEntries('spells', 'user-1');

    expect(mockedGetDocs).toHaveBeenCalledTimes(2);
  });

  it('pack sans la catégorie demandée : skip silencieusement', async () => {
    mockedGetDocs.mockResolvedValueOnce(
      makeSnapshot([
        {
          id: 'pack-a',
          data: () => ({ entities: { items: [] } }), // ce pack n'a pas de spells
        },
      ]) as never,
    );

    const result = await loadUserPacksEntries('spells', 'user-1');

    expect(result).toEqual([]);
  });

  it('dédup in-flight — userIds différents ne se partagent PAS le getDocs', async () => {
    // Sécurité : un appel pour user-A en vol ne doit pas servir les packs
    // à user-B (sinon fuite cross-user). La clé de dédup est l'userId.
    mockedGetDocs.mockResolvedValueOnce(makeSnapshot([]) as never);
    mockedGetDocs.mockResolvedValueOnce(makeSnapshot([]) as never);

    await Promise.all([
      loadUserPacksEntries('spells', 'user-a'),
      loadUserPacksEntries('spells', 'user-b'),
    ]);

    expect(mockedGetDocs).toHaveBeenCalledTimes(2);
  });
});
