import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests JALON 3B.2 — service `pack-storage.ts`.
 *
 * Pattern miroir de `campaigns.test.ts` : mock complet de `firebase/firestore`
 * + de `@/shared/lib/firebase`. Vérifie que chaque helper appelle l'API SDK
 * avec le bon path, le bon payload, et propage les bonnes erreurs.
 */

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockSetDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockServerTimestamp = vi.fn(() => 'MOCK_SERVER_TS');
const mockDoc = vi.fn((_db, ...path: string[]) => ({
  __type: 'doc',
  path: path.join('/'),
}));
const mockCollection = vi.fn((_db, ...path: string[]) => ({
  __type: 'collection',
  path: path.join('/'),
}));

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) =>
    mockCollection(...(args as Parameters<typeof mockCollection>)),
  doc: (...args: unknown[]) => mockDoc(...(args as Parameters<typeof mockDoc>)),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
  waitForPendingWrites: () => Promise.resolve(),
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({ __type: 'mock-db' }),
}));

import {
  deletePack,
  getPack,
  listPacks,
  logicalPackId,
  writePack,
} from '../pack-storage';
import type { CustomContentPack } from '@/shared/types/custom-content-pack';

const UID = 'user-alice';

const minimalSpell = {
  id: 'feu-magique',
  name: { fr: 'Feu magique', en: 'Magic fire' },
  level: 1,
  school: 'evocation' as const,
  castingTime: { fr: '1 action', en: '1 action' },
  range: { fr: '30 mètres', en: '120 feet' },
  components: { v: true, s: true, m: false },
  duration: { fr: 'Instantanée', en: 'Instantaneous' },
  concentration: false,
  ritual: false,
  description: {
    fr: 'Un trait de feu jaillit de ta main.',
    en: 'A bolt of fire shoots from your hand.',
  },
  atHigherLevels: null,
  classes: ['wizard'],
  source: 'srd-5.2.1' as const,
};

const validPack: CustomContentPack = {
  meta: {
    id: 'pack-test',
    name: { fr: 'Pack de test', en: 'Test pack' },
    version: '1.0.0',
    author: 'MJ Adrien',
    createdAt: '2026-05-31T12:00:00Z',
  },
  entities: { spells: [minimalSpell] },
};

/** Snapshot Firestore minimal — `forEach` est la seule API consommée. */
function snapshotOf(
  docs: { id: string; data: () => unknown }[],
): { forEach: (cb: (d: { id: string; data: () => unknown }) => void) => void } {
  return { forEach: (cb) => docs.forEach(cb) };
}

beforeEach(() => {
  mockGetDoc.mockReset();
  // Depuis M52, `writePack`/`deletePack`/`getPack` lisent la collection pour
  // retrouver les tranches d'un pack. Défaut : collection vide.
  mockGetDocs.mockReset().mockResolvedValue(snapshotOf([]));
  mockSetDoc.mockReset().mockResolvedValue(undefined);
  mockDeleteDoc.mockReset().mockResolvedValue(undefined);
  mockDoc.mockClear();
  mockCollection.mockClear();
});

describe('writePack', () => {
  it('écrit sous users/{uid}/customContentPacks/{packId} avec meta+entities+importedAt', async () => {
    await writePack(UID, validPack);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [docRef, payload] = mockSetDoc.mock.calls[0]!;
    expect((docRef as { path: string }).path).toBe(
      `users/${UID}/customContentPacks/pack-test`,
    );
    expect(payload).toMatchObject({
      meta: validPack.meta,
      entities: validPack.entities,
      importedAt: 'MOCK_SERVER_TS',
    });
  });

  // M52 — un bestiaire de plusieurs centaines de créatures dépassait la limite
  // Firestore et le service refusait net, avec pour seul conseil « splitte à la
  // main » : N fichiers donnaient alors N packs distincts dans la liste.
  it('découpe un pack volumineux en tranches --00, --01… sous le même meta.id', async () => {
    // ~600 sorts de ~4 Kio : largement au-dessus de la limite d'un document.
    const filler = 'x'.repeat(4_000);
    const bigPack: CustomContentPack = {
      ...validPack,
      entities: {
        spells: Array.from({ length: 600 }, (_, i) => ({
          ...minimalSpell,
          id: `sort-${i}`,
          description: { fr: filler, en: filler },
        })),
      },
    };

    await writePack(UID, bigPack);

    expect(mockSetDoc.mock.calls.length).toBeGreaterThan(1);
    const paths = mockSetDoc.mock.calls.map(
      ([ref]) => (ref as { path: string }).path,
    );
    expect(paths[0]).toBe(`users/${UID}/customContentPacks/pack-test--00`);
    expect(paths[1]).toBe(`users/${UID}/customContentPacks/pack-test--01`);
    // Toutes les tranches portent le MÊME meta : c'est ce qui en fait un pack.
    for (const [, payload] of mockSetDoc.mock.calls) {
      expect((payload as { meta: { id: string } }).meta.id).toBe('pack-test');
    }
    // Et aucune entité n'est perdue en route.
    const total = mockSetDoc.mock.calls.reduce(
      (n, [, payload]) =>
        n + ((payload as { entities: { spells?: unknown[] } }).entities.spells?.length ?? 0),
      0,
    );
    expect(total).toBe(600);
  });

  it('supprime les tranches devenues inutiles quand le pack maigrit', async () => {
    mockGetDocs.mockResolvedValue(
      snapshotOf([
        { id: 'pack-test--00', data: () => ({ meta: validPack.meta }) },
        { id: 'pack-test--01', data: () => ({ meta: validPack.meta }) },
        { id: 'autre-pack', data: () => ({ meta: validPack.meta }) },
      ]),
    );

    await writePack(UID, validPack);

    // Le pack tient maintenant dans un document nu : les 2 tranches partent…
    const deleted = mockDeleteDoc.mock.calls.map(
      ([ref]) => (ref as { path: string }).path,
    );
    expect(deleted).toContain(`users/${UID}/customContentPacks/pack-test--00`);
    expect(deleted).toContain(`users/${UID}/customContentPacks/pack-test--01`);
    // …et le pack d'à côté n'est pas touché.
    expect(deleted).not.toContain(`users/${UID}/customContentPacks/autre-pack`);
  });

  it('refuse une entité seule plus lourde qu’un document — elle est indécoupable', async () => {
    const huge = 'x'.repeat(1_100_000);
    const oversizedPack: CustomContentPack = {
      ...validPack,
      entities: {
        spells: [{ ...minimalSpell, description: { fr: huge, en: huge } }],
      },
    };
    await expect(writePack(UID, oversizedPack)).rejects.toThrow(
      /trop volumineuse/,
    );
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});

describe('listPacks', () => {
  it('retourne un résumé par pack avec meta + importedAt en ms', async () => {
    const importedAtFor = (ms: number) => ({ toMillis: () => ms });
    mockGetDocs.mockResolvedValue({
      forEach(cb: (s: unknown) => void) {
        cb({
          id: 'pack-a',
          data: () => ({
            meta: { ...validPack.meta, id: 'pack-a' },
            importedAt: importedAtFor(1_700_000_000_000),
          }),
        });
        cb({
          id: 'pack-b',
          data: () => ({
            meta: { ...validPack.meta, id: 'pack-b' },
            importedAt: importedAtFor(1_700_000_001_000),
          }),
        });
      },
    });
    const summaries = await listPacks(UID);
    expect(summaries).toHaveLength(2);
    expect(summaries[0]).toMatchObject({
      packId: 'pack-a',
      importedAt: 1_700_000_000_000,
    });
    expect(summaries[0]?.meta.id).toBe('pack-a');
    expect(mockCollection).toHaveBeenCalledTimes(1);
    const [, ...path] = mockCollection.mock.calls[0]!;
    expect(path.join('/')).toBe(`users/${UID}/customContentPacks`);
  });

  it('ignore les docs sans meta (corruption silencieuse)', async () => {
    mockGetDocs.mockResolvedValue({
      forEach(cb: (s: unknown) => void) {
        cb({ id: 'orphan', data: () => ({}) });
        cb({
          id: 'ok',
          data: () => ({ meta: { ...validPack.meta, id: 'ok' } }),
        });
      },
    });
    const summaries = await listPacks(UID);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.packId).toBe('ok');
  });

  it('importedAt = null quand le champ est absent', async () => {
    mockGetDocs.mockResolvedValue({
      forEach(cb: (s: unknown) => void) {
        cb({ id: 'pack-x', data: () => ({ meta: validPack.meta }) });
      },
    });
    const [first] = await listPacks(UID);
    expect(first?.importedAt).toBeNull();
  });
});

describe('getPack', () => {
  it('hydrate un pack complet quand le doc existe', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ meta: validPack.meta, entities: validPack.entities }),
    });
    const pack = await getPack(UID, 'pack-test');
    expect(pack).toEqual({
      meta: validPack.meta,
      entities: validPack.entities,
    });
    const [docRef] = mockGetDoc.mock.calls[0]!;
    expect((docRef as { path: string }).path).toBe(
      `users/${UID}/customContentPacks/pack-test`,
    );
  });

  it('retourne null quand le doc n\'existe pas', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    const pack = await getPack(UID, 'pack-test');
    expect(pack).toBeNull();
  });

  it('retourne null quand le doc existe mais meta/entities manquent', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ /* corrupted */ }),
    });
    const pack = await getPack(UID, 'pack-test');
    expect(pack).toBeNull();
  });
});

describe('deletePack', () => {
  it('supprime users/{uid}/customContentPacks/{packId}', async () => {
    await deletePack(UID, 'pack-test');
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    const [docRef] = mockDeleteDoc.mock.calls[0]!;
    expect((docRef as { path: string }).path).toBe(
      `users/${UID}/customContentPacks/pack-test`,
    );
  });
});

/**
 * M52 — un pack découpé doit se présenter comme UN pack : une ligne dans la
 * liste, un pack recollé à l'édition, une suppression qui emporte tout.
 */
describe('packs découpés — regroupement logique', () => {
  const chunkMeta = { ...validPack.meta, id: 'bestiaire' };

  it('listPacks regroupe les tranches en une seule entrée', async () => {
    mockGetDocs.mockResolvedValue(
      snapshotOf([
        {
          id: 'bestiaire--00',
          data: () => ({ meta: chunkMeta, importedAt: { toMillis: () => 100 } }),
        },
        {
          id: 'bestiaire--01',
          data: () => ({ meta: chunkMeta, importedAt: { toMillis: () => 200 } }),
        },
      ]),
    );

    const summaries = await listPacks(UID);

    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.packId).toBe('bestiaire');
    expect(summaries[0]?.docIds).toEqual(['bestiaire--00', 'bestiaire--01']);
    // La date affichée est celle de la tranche la plus récente.
    expect(summaries[0]?.importedAt).toBe(200);
  });

  it('getPack recolle les tranches dans l’ordre des documents', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockGetDocs.mockResolvedValue(
      snapshotOf([
        // Volontairement en désordre : l'itération Firestore ne garantit rien.
        {
          id: 'bestiaire--01',
          data: () => ({
            meta: chunkMeta,
            entities: { spells: [{ ...minimalSpell, id: 'sort-b' }] },
          }),
        },
        {
          id: 'bestiaire--00',
          data: () => ({
            meta: chunkMeta,
            entities: { spells: [{ ...minimalSpell, id: 'sort-a' }] },
          }),
        },
      ]),
    );

    const pack = await getPack(UID, 'bestiaire');

    expect(pack?.meta.id).toBe('bestiaire');
    expect(pack?.entities.spells?.map((s) => s.id)).toEqual([
      'sort-a',
      'sort-b',
    ]);
  });

  it('deletePack emporte toutes les tranches', async () => {
    mockGetDocs.mockResolvedValue(
      snapshotOf([
        { id: 'bestiaire--00', data: () => ({ meta: chunkMeta }) },
        { id: 'bestiaire--01', data: () => ({ meta: chunkMeta }) },
        { id: 'autre', data: () => ({ meta: validPack.meta }) },
      ]),
    );

    await deletePack(UID, 'bestiaire');

    const deleted = mockDeleteDoc.mock.calls.map(
      ([ref]) => (ref as { path: string }).path,
    );
    expect(deleted).toContain(`users/${UID}/customContentPacks/bestiaire--00`);
    expect(deleted).toContain(`users/${UID}/customContentPacks/bestiaire--01`);
    expect(deleted).not.toContain(`users/${UID}/customContentPacks/autre`);
  });

  it('un id de pack contenant des tirets n’est pas confondu avec une tranche', () => {
    expect(logicalPackId('mon-pack-01')).toBe('mon-pack-01');
    expect(logicalPackId('mon-pack--01')).toBe('mon-pack');
  });
});
