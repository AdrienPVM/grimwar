import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as ContentLoader from '../content-loader';
import { loadContentMulti } from '../load-content-multi';
import * as PacksEntries from '../load-user-packs-entries';
import type { Item } from '../../types/content';

/**
 * Fixtures minimales d'items SRD. Le contenu importe peu — on teste la
 * politique de merge multi-scope, pas le schéma.
 */
function fakeItem(id: string, label: string): Item {
  return {
    id,
    name: { fr: label, en: label },
    category: 'gear',
    weight: 0,
    cost: { quantity: 0, unit: 'sp' },
    description: { fr: label, en: label },
    properties: [],
    source: 'srd-5.2.1',
  } as unknown as Item;
}

describe('loadContentMulti', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Par défaut, les packs user ne contribuent rien — chaque test surcharge
    // si besoin.
    vi.spyOn(PacksEntries, 'loadUserPacksEntries').mockResolvedValue([]);
  });

  it('SRD seul (no userId, no campaignId) : retourne loadPublicContent tel quel', async () => {
    vi.spyOn(ContentLoader, 'loadPublicContent').mockResolvedValue([
      fakeItem('sword', 'épée'),
      fakeItem('shield', 'bouclier'),
    ]);
    const packs = vi.spyOn(PacksEntries, 'loadUserPacksEntries');
    packs.mockResolvedValue([]);

    const result = await loadContentMulti('items');

    expect(result.map((i) => i.id)).toEqual(['sword', 'shield']);
    expect(packs).not.toHaveBeenCalled();
  });

  it('SRD + user-pack disjoint : union des deux (public puis user)', async () => {
    vi.spyOn(ContentLoader, 'loadPublicContent').mockResolvedValue([
      fakeItem('sword', 'épée'),
    ]);
    vi.spyOn(PacksEntries, 'loadUserPacksEntries').mockResolvedValue([
      fakeItem('homebrew-bow', 'arc maison'),
    ] as never);

    const result = await loadContentMulti('items', { userId: 'user-1' });

    expect(result.map((i) => i.id)).toEqual(['sword', 'homebrew-bow']);
  });

  it('SRD + user-pack en conflit : user remplace public + warn', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(ContentLoader, 'loadPublicContent').mockResolvedValue([
      fakeItem('sword', 'épée SRD'),
    ]);
    vi.spyOn(PacksEntries, 'loadUserPacksEntries').mockResolvedValue([
      fakeItem('sword', 'épée user'),
    ] as never);

    const result = await loadContentMulti('items', { userId: 'user-1' });

    expect(result).toHaveLength(1);
    expect(result[0]?.name.fr).toBe('épée user');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('collision id "sword"'),
    );
    warn.mockRestore();
  });

  it("campaignId sans userId : aucun appel pack (campaign sans source 3D)", async () => {
    vi.spyOn(ContentLoader, 'loadPublicContent').mockResolvedValue([
      fakeItem('sword', 'épée'),
    ]);
    const packs = vi.spyOn(PacksEntries, 'loadUserPacksEntries');

    const result = await loadContentMulti('items', { campaignId: 'camp-1' });

    expect(result.map((i) => i.id)).toEqual(['sword']);
    expect(packs).not.toHaveBeenCalled();
  });

  it('échec lecture packs user : SRD seul servi + console.error (l\'overlay ne doit pas anéantir la base)', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(ContentLoader, 'loadPublicContent').mockResolvedValue([
      fakeItem('sword', 'épée'),
      fakeItem('shield', 'bouclier'),
    ]);
    vi.spyOn(PacksEntries, 'loadUserPacksEntries').mockRejectedValue(
      Object.assign(new Error('Missing or insufficient permissions.'), {
        code: 'permission-denied',
      }),
    );

    const result = await loadContentMulti('items', { userId: 'user-1' });

    expect(result.map((i) => i.id)).toEqual(['sword', 'shield']);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('permission-denied'),
    );
    error.mockRestore();
  });

  it('userId + campaignId : packs user lus, campaign reste no-op tant que 3D pas livré', async () => {
    vi.spyOn(ContentLoader, 'loadPublicContent').mockResolvedValue([
      fakeItem('sword', 'épée'),
    ]);
    vi.spyOn(PacksEntries, 'loadUserPacksEntries').mockResolvedValue([
      fakeItem('pack-bow', 'arc pack'),
    ] as never);

    const result = await loadContentMulti('items', {
      userId: 'user-1',
      campaignId: 'camp-1',
    });

    expect(result.map((i) => i.id)).toEqual(['sword', 'pack-bow']);
  });
});
