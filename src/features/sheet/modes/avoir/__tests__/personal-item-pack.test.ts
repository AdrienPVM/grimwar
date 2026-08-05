import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CustomContentPackSchema } from '@/shared/types/custom-content-pack';
import type { CustomContentPack } from '@/shared/types/custom-content-pack';
import type { Item } from '@/shared/types/content';

/**
 * M27 — un objet forgé depuis la fiche doit EXISTER quelque part de lisible.
 *
 * L'ancien formulaire écrivait sous `users/{uid}/customContent/items/{id}` —
 * cinq segments, que `doc()` refuse : la création levait. Le pack personnel
 * est la seule source que `resolveContent(scope:'user')` interroge.
 */

const getPackMock = vi.fn(
  (_uid: string, _packId: string): Promise<CustomContentPack | null> =>
    Promise.resolve(null),
);
const writePackMock = vi.fn((..._args: unknown[]) => Promise.resolve());
vi.mock('@/shared/lib/services/pack-storage', () => ({
  getPack: (uid: string, packId: string) => getPackMock(uid, packId),
  writePack: (...args: unknown[]) => writePackMock(...args),
}));

const invalidateMock = vi.fn((..._args: unknown[]) => Promise.resolve());
vi.mock('@/shared/lib/content-loader', () => ({
  invalidateUserContent: (...args: unknown[]) => invalidateMock(...args),
}));

import { addItemToPersonalPack, PERSONAL_PACK_ID } from '../personal-item-pack';

const NOW = '2026-08-06T10:00:00Z';

function sword(overrides: Partial<Item> = {}): Item {
  return {
    id: 'epee-du-corbeau',
    name: { fr: 'Épée du Seigneur des Corbeaux' },
    category: 'weapon',
    cost: null,
    weight: 1.5,
    description: null,
    source: 'aidedd-homebrew',
    damage: {
      dice: '1d8',
      type: 'slashing',
      typeLabel: { fr: 'tranchant', en: 'slashing' },
    },
    ...overrides,
  } as Item;
}

beforeEach(() => {
  getPackMock.mockReset();
  getPackMock.mockResolvedValue(null);
  writePackMock.mockClear();
  invalidateMock.mockClear();
});

describe('addItemToPersonalPack', () => {
  it('crée le pack personnel au premier objet, avec une méta valide', async () => {
    await addItemToPersonalPack('uid-1', sword(), NOW);

    expect(writePackMock).toHaveBeenCalledTimes(1);
    const [uid, pack] = writePackMock.mock.calls[0] as [string, CustomContentPack];
    expect(uid).toBe('uid-1');
    expect(pack.meta.id).toBe(PERSONAL_PACK_ID);
    expect(pack.entities.items?.map((i) => i.id)).toEqual(['epee-du-corbeau']);
    // Le pack écrit doit satisfaire le même schéma qu'un pack importé —
    // sinon il serait rejeté à la relecture, donc invisible.
    expect(CustomContentPackSchema.safeParse(pack).success).toBe(true);
  });

  it('conserve les autres catégories d’un pack existant', async () => {
    getPackMock.mockResolvedValue({
      meta: {
        id: PERSONAL_PACK_ID,
        name: { fr: 'Mes objets' },
        version: '1.0.0',
        author: 'uid-1',
        createdAt: NOW,
      },
      entities: {
        items: [sword({ id: 'baton-tordu', name: { fr: 'Bâton tordu' } })],
        feats: [],
      },
    } as unknown as CustomContentPack);

    await addItemToPersonalPack('uid-1', sword(), NOW);

    const [, pack] = writePackMock.mock.calls[0] as [string, CustomContentPack];
    expect(pack.entities.items?.map((i) => i.id)).toEqual([
      'baton-tordu',
      'epee-du-corbeau',
    ]);
    expect(pack.entities.feats).toEqual([]);
  });

  it('remplace un objet de même id au lieu de le dupliquer', async () => {
    getPackMock.mockResolvedValue({
      meta: {
        id: PERSONAL_PACK_ID,
        name: { fr: 'Mes objets' },
        version: '1.0.0',
        author: 'uid-1',
        createdAt: NOW,
      },
      entities: { items: [sword({ weight: 99 })] },
    } as unknown as CustomContentPack);

    await addItemToPersonalPack('uid-1', sword({ weight: 1.5 }), NOW);

    const [, pack] = writePackMock.mock.calls[0] as [string, CustomContentPack];
    // Le schéma REJETTE deux entrées de même id dans une catégorie : un doublon
    // rendrait le pack entier illisible, pas seulement l'objet.
    expect(pack.entities.items).toHaveLength(1);
    expect(pack.entities.items?.[0]?.weight).toBe(1.5);
    expect(CustomContentPackSchema.safeParse(pack).success).toBe(true);
  });

  it('invalide le cache du contenu utilisateur, sinon l’objet reste introuvable', async () => {
    await addItemToPersonalPack('uid-1', sword(), NOW);
    expect(invalidateMock).toHaveBeenCalledWith('items', 'uid-1');
  });
});
