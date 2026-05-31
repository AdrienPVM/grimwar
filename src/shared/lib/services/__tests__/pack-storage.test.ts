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

beforeEach(() => {
  mockGetDoc.mockReset();
  mockGetDocs.mockReset();
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

  it('rejette un pack dont le payload sérialisé dépasse 1 MiB', async () => {
    // Construire un pack > 1 MiB via une description gargantuesque.
    const huge = 'x'.repeat(1_100_000);
    const oversizedPack: CustomContentPack = {
      ...validPack,
      entities: {
        spells: [
          {
            ...minimalSpell,
            description: { fr: huge, en: huge },
          },
        ],
      },
    };
    await expect(writePack(UID, oversizedPack)).rejects.toThrow(
      /trop volumineux/,
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
