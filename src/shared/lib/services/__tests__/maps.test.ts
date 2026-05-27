import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit tests pour `src/shared/lib/services/maps.ts`.
 *
 * Pattern : mock complet de `firebase/firestore` + `@/shared/lib/firebase`
 * pour vérifier que chaque fonction du service appelle les bonnes APIs
 * Firestore avec les bons chemins de doc/collection + payload incluant
 * `updatedAt: serverTimestamp()` et `updatedBy: uid`.
 *
 * Les rules d'autorisation sont couvertes par `tests/firestore-rules.test.ts`
 * (qui tourne contre l'émulateur). Ici on garantit la signature contractuelle
 * du service (chemins + champs systématiques).
 */

const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockServerTimestamp = vi.fn(() => 'MOCK_SERVER_TS');

const mockDoc = vi.fn((_db, ...path: string[]) => ({ __type: 'doc', path: path.join('/') }));
const mockCollection = vi.fn((_db, ...path: string[]) => ({
  __type: 'collection',
  path: path.join('/'),
}));

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as Parameters<typeof mockDoc>)),
  collection: (...args: unknown[]) =>
    mockCollection(...(args as Parameters<typeof mockCollection>)),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({ __type: 'mock-db' }),
}));

import {
  addAoeTemplate,
  addFogPolygon,
  addLightSource,
  createMap,
  createToken,
  deleteMap,
  deleteToken,
  removeAoeTemplate,
  removeFogPolygon,
  removeLightSource,
  updateMap,
  updateToken,
} from '../maps';

import type {
  AoeTemplate,
  FogPolygon,
  LightSource,
  MapMeta,
  MapToken,
} from '@/shared/types/map';

const CAMPAIGN_ID = 'camp-001';
const MAP_ID = 'donjon-de-l-aube';
const UID = 'user-alice';

/** Helper : récupère le 1ᵉʳ payload (arg index 1) du mock — fail si vide. */
function firstPayload<T>(mockFn: { mock: { calls: unknown[][] } }): T {
  const calls = mockFn.mock.calls;
  if (calls.length === 0) throw new Error('mock not called');
  const call = calls[0];
  if (!call || call.length < 2) throw new Error('mock call missing payload');
  return call[1] as T;
}

beforeEach(() => {
  mockSetDoc.mockReset().mockResolvedValue(undefined);
  mockUpdateDoc.mockReset().mockResolvedValue(undefined);
  mockDeleteDoc.mockReset().mockResolvedValue(undefined);
  mockAddDoc.mockReset().mockResolvedValue({ id: 'generated-token-id' });
  mockServerTimestamp.mockClear();
  mockDoc.mockClear();
  mockCollection.mockClear();
});

describe('services/maps — createMap', () => {
  it('appelle setDoc sur campaigns/{cid}/maps/{mid} avec schemaVersion + timestamps', async () => {
    const input = {
      name: 'Donjon de l’Aube',
      imageUrl: 'https://example.com/donjon.jpg',
      gridSize: 70,
      feetPerSquare: 5,
      showGrid: true,
      fogEnabled: false,
      lightingEnabled: false,
      fogPolygons: [],
      lightSources: [],
      aoeTemplates: [],
    } satisfies Omit<MapMeta, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'schemaVersion'>;

    const mapId = await createMap(CAMPAIGN_ID, MAP_ID, input, UID);

    expect(mapId).toBe(MAP_ID);
    expect(mockDoc).toHaveBeenCalledWith(
      { __type: 'mock-db' },
      'campaigns',
      CAMPAIGN_ID,
      'maps',
      MAP_ID,
    );
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const payload = firstPayload<Record<string, unknown>>(mockSetDoc);
    expect(payload.schemaVersion).toBe(1);
    expect(payload.createdAt).toBe('MOCK_SERVER_TS');
    expect(payload.updatedAt).toBe('MOCK_SERVER_TS');
    expect(payload.updatedBy).toBe(UID);
    expect(payload.name).toBe('Donjon de l’Aube');
    expect(payload.gridSize).toBe(70);
  });
});

describe('services/maps — updateMap', () => {
  it('appelle updateDoc avec patch + updatedAt + updatedBy (préserve les autres champs)', async () => {
    await updateMap(CAMPAIGN_ID, MAP_ID, { showGrid: false, fogEnabled: true }, UID);

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const payload = firstPayload<Record<string, unknown>>(mockUpdateDoc);
    expect(payload.showGrid).toBe(false);
    expect(payload.fogEnabled).toBe(true);
    expect(payload.updatedAt).toBe('MOCK_SERVER_TS');
    expect(payload.updatedBy).toBe(UID);
    expect(payload.schemaVersion).toBeUndefined();
  });
});

describe('services/maps — deleteMap', () => {
  it('appelle deleteDoc sur campaigns/{cid}/maps/{mid}', async () => {
    await deleteMap(CAMPAIGN_ID, MAP_ID);

    expect(mockDoc).toHaveBeenCalledWith(
      { __type: 'mock-db' },
      'campaigns',
      CAMPAIGN_ID,
      'maps',
      MAP_ID,
    );
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});

describe('services/maps — createToken', () => {
  it('appelle addDoc sur la sous-collection tokens et retourne l’ID généré', async () => {
    const input = {
      kind: 'pj' as const,
      label: 'Sigrid',
      position: { x: 100, y: 200 },
      color: '#cc3333',
      linkedCharacterId: 'char-sigrid',
      visionRadius: 60,
    } satisfies Omit<MapToken, 'id' | 'updatedAt' | 'updatedBy'>;

    const id = await createToken(CAMPAIGN_ID, MAP_ID, input, UID);

    expect(id).toBe('generated-token-id');
    expect(mockCollection).toHaveBeenCalledWith(
      { __type: 'mock-db' },
      'campaigns',
      CAMPAIGN_ID,
      'maps',
      MAP_ID,
      'tokens',
    );
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const payload = firstPayload<Record<string, unknown>>(mockAddDoc);
    expect(payload.label).toBe('Sigrid');
    expect(payload.updatedAt).toBe('MOCK_SERVER_TS');
    expect(payload.updatedBy).toBe(UID);
  });
});

describe('services/maps — updateToken (déplacement)', () => {
  it('appelle updateDoc avec position + timestamps', async () => {
    await updateToken(
      CAMPAIGN_ID,
      MAP_ID,
      'tok-001',
      { position: { x: 350, y: 210 } },
      UID,
    );

    expect(mockDoc).toHaveBeenCalledWith(
      { __type: 'mock-db' },
      'campaigns',
      CAMPAIGN_ID,
      'maps',
      MAP_ID,
      'tokens',
      'tok-001',
    );
    const payload = firstPayload<Record<string, unknown>>(mockUpdateDoc);
    expect(payload.position).toEqual({ x: 350, y: 210 });
    expect(payload.updatedAt).toBe('MOCK_SERVER_TS');
  });
});

describe('services/maps — deleteToken', () => {
  it('appelle deleteDoc sur le bon path token', async () => {
    await deleteToken(CAMPAIGN_ID, MAP_ID, 'tok-002');

    expect(mockDoc).toHaveBeenCalledWith(
      { __type: 'mock-db' },
      'campaigns',
      CAMPAIGN_ID,
      'maps',
      MAP_ID,
      'tokens',
      'tok-002',
    );
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});

describe('services/maps — addFogPolygon / removeFogPolygon', () => {
  const existing: FogPolygon[] = [
    {
      id: 'fog-a',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 100 },
      ],
      kind: 'reveal',
      createdAt: 'old-ts',
    },
  ];

  it('addFogPolygon append le polygone et réécrit fogPolygons via updateMap', async () => {
    const newPoly: FogPolygon = {
      id: 'fog-b',
      points: [
        { x: 200, y: 0 },
        { x: 300, y: 0 },
        { x: 250, y: 100 },
      ],
      kind: 'mask',
      createdAt: 'new-ts',
    };
    await addFogPolygon(CAMPAIGN_ID, MAP_ID, existing, newPoly, UID);

    const payload = firstPayload<{ fogPolygons: FogPolygon[] }>(mockUpdateDoc);
    expect(payload.fogPolygons).toHaveLength(2);
    expect(payload.fogPolygons[1]?.id).toBe('fog-b');
  });

  it('removeFogPolygon filtre l’ID demandé', async () => {
    await removeFogPolygon(CAMPAIGN_ID, MAP_ID, existing, 'fog-a', UID);

    const payload = firstPayload<{ fogPolygons: FogPolygon[] }>(mockUpdateDoc);
    expect(payload.fogPolygons).toEqual([]);
  });
});

describe('services/maps — addLightSource / removeLightSource', () => {
  const existing: LightSource[] = [
    {
      id: 'light-static-1',
      position: { x: 50, y: 50 },
      brightRadius: 20,
      dimRadius: 40,
      color: '#ffaa55',
      preset: 'torch',
    },
  ];

  it('addLightSource ajoute la source', async () => {
    const newLight: LightSource = {
      id: 'light-token-attached',
      attachedTokenId: 'tok-sigrid',
      brightRadius: 30,
      dimRadius: 60,
      preset: 'lantern',
    };
    await addLightSource(CAMPAIGN_ID, MAP_ID, existing, newLight, UID);

    const payload = firstPayload<{ lightSources: LightSource[] }>(mockUpdateDoc);
    expect(payload.lightSources).toHaveLength(2);
    expect(payload.lightSources[1]?.attachedTokenId).toBe('tok-sigrid');
  });

  it('removeLightSource filtre l’ID demandé', async () => {
    await removeLightSource(CAMPAIGN_ID, MAP_ID, existing, 'light-static-1', UID);

    const payload = firstPayload<{ lightSources: LightSource[] }>(mockUpdateDoc);
    expect(payload.lightSources).toEqual([]);
  });
});

describe('services/maps — addAoeTemplate / removeAoeTemplate', () => {
  const existing: AoeTemplate[] = [];

  it('addAoeTemplate ajoute le template sphere', async () => {
    const template: AoeTemplate = {
      id: 'aoe-fireball-1',
      shape: 'sphere',
      position: { x: 400, y: 300 },
      dimensions: { radius: 20 },
      spellSlug: 'boule-de-feu',
      sourceCharacterId: 'char-magicien',
      pinned: false,
    };
    await addAoeTemplate(CAMPAIGN_ID, MAP_ID, existing, template, UID);

    const payload = firstPayload<{ aoeTemplates: AoeTemplate[] }>(mockUpdateDoc);
    expect(payload.aoeTemplates).toHaveLength(1);
    const first = payload.aoeTemplates[0];
    expect(first?.shape).toBe('sphere');
    expect(first?.spellSlug).toBe('boule-de-feu');
  });

  it('removeAoeTemplate filtre l’ID demandé', async () => {
    const current: AoeTemplate[] = [
      {
        id: 'aoe-x',
        shape: 'cone',
        position: { x: 0, y: 0 },
        dimensions: { radius: 15 },
        pinned: false,
      },
    ];
    await removeAoeTemplate(CAMPAIGN_ID, MAP_ID, current, 'aoe-x', UID);

    const payload = firstPayload<{ aoeTemplates: AoeTemplate[] }>(mockUpdateDoc);
    expect(payload.aoeTemplates).toEqual([]);
  });
});
