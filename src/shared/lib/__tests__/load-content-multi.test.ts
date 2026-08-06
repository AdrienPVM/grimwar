import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as ContentLoader from '../content-loader';
import {
  loadContentMulti,
  loadContentMultiScoped,
} from '../load-content-multi';
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
    vi.spyOn(PacksEntries, 'loadUserPacksEntriesScoped').mockResolvedValue([]);
  });

  it('SRD seul (no userId, no campaignId) : retourne loadPublicContent tel quel', async () => {
    vi.spyOn(ContentLoader, 'loadPublicContent').mockResolvedValue([
      fakeItem('sword', 'épée'),
      fakeItem('shield', 'bouclier'),
    ]);
    const packs = vi.spyOn(PacksEntries, 'loadUserPacksEntriesScoped');
    packs.mockResolvedValue([]);

    const result = await loadContentMulti('items');

    expect(result.map((i) => i.id)).toEqual(['sword', 'shield']);
    expect(packs).not.toHaveBeenCalled();
  });

  it('SRD + user-pack disjoint : union des deux (public puis user)', async () => {
    vi.spyOn(ContentLoader, 'loadPublicContent').mockResolvedValue([
      fakeItem('sword', 'épée'),
    ]);
    vi.spyOn(PacksEntries, 'loadUserPacksEntriesScoped').mockResolvedValue([
      { entity: fakeItem('homebrew-bow', 'arc maison') },
    ] as never);

    const result = await loadContentMulti('items', { userId: 'user-1' });

    expect(result.map((i) => i.id)).toEqual(['sword', 'homebrew-bow']);
  });

  it('SRD + user-pack en conflit : user remplace public + warn', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(ContentLoader, 'loadPublicContent').mockResolvedValue([
      fakeItem('sword', 'épée SRD'),
    ]);
    vi.spyOn(PacksEntries, 'loadUserPacksEntriesScoped').mockResolvedValue([
      { entity: fakeItem('sword', 'épée user') },
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
    const packs = vi.spyOn(PacksEntries, 'loadUserPacksEntriesScoped');

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
    vi.spyOn(PacksEntries, 'loadUserPacksEntriesScoped').mockRejectedValue(
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
    vi.spyOn(PacksEntries, 'loadUserPacksEntriesScoped').mockResolvedValue([
      { entity: fakeItem('pack-bow', 'arc pack') },
    ] as never);

    const result = await loadContentMulti('items', {
      userId: 'user-1',
      campaignId: 'camp-1',
    });

    expect(result.map((i) => i.id)).toEqual(['sword', 'pack-bow']);
  });
});

/**
 * La provenance de chaque entrée, telle qu'un écran qui PERSISTE une référence
 * doit la lire. `loadContentMulti` l'écrase en ne rendant que les entités —
 * c'était la cause du mur « l'objet du pack devient introuvable ».
 */
describe('loadContentMultiScoped — provenance conservée', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(PacksEntries, 'loadUserPacksEntriesScoped').mockResolvedValue([]);
  });

  it('marque « public » une entrée SRD et « user » une entrée de pack', async () => {
    vi.spyOn(ContentLoader, 'loadPublicContent').mockResolvedValue([
      fakeItem('sword', 'épée'),
    ]);
    vi.spyOn(PacksEntries, 'loadUserPacksEntriesScoped').mockResolvedValue([
      { entity: fakeItem('homebrew-bow', 'arc maison') },
    ] as never);

    const result = await loadContentMultiScoped('items', { userId: 'user-1' });

    expect(
      result.map((r) => [(r.entity as { id: string }).id, r.scope, r.scopeId]),
    ).toEqual([
      ['sword', 'public', undefined],
      ['homebrew-bow', 'user', 'user-1'],
    ]);
  });

  it('donne au pack qui écrase un id SRD la provenance du pack', async () => {
    vi.spyOn(ContentLoader, 'loadPublicContent').mockResolvedValue([
      fakeItem('sword', 'épée'),
    ]);
    vi.spyOn(PacksEntries, 'loadUserPacksEntriesScoped').mockResolvedValue([
      { entity: fakeItem('sword', 'épée maison') },
    ] as never);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = await loadContentMultiScoped('items', { userId: 'user-1' });

    expect(result).toHaveLength(1);
    expect(result[0]!.scope).toBe('user');
    expect(result[0]!.scopeId).toBe('user-1');
    warn.mockRestore();
  });

  // M53 — la provenance lisible du pack remonte jusqu'à l'écran. Sans elle,
  // une entrée maison est « maison » et rien d'autre : impossible de dire de
  // quel pack elle sort.
  it('remonte l’étiquette de provenance du pack d’origine', async () => {
    vi.spyOn(ContentLoader, 'loadPublicContent').mockResolvedValue([]);
    vi.spyOn(PacksEntries, 'loadUserPacksEntriesScoped').mockResolvedValue([
      { entity: fakeItem('homebrew-bow', 'arc maison'), originLabel: 'Xanathar' },
    ] as never);

    const result = await loadContentMultiScoped('items', { userId: 'user-1' });

    expect(result[0]!.originLabel).toBe('Xanathar');
  });

  it('laisse la provenance absente sur une entrée SRD', async () => {
    vi.spyOn(ContentLoader, 'loadPublicContent').mockResolvedValue([
      fakeItem('sword', 'épée'),
    ]);

    const result = await loadContentMultiScoped('items', { userId: 'user-1' });

    expect(result[0]!.originLabel).toBeUndefined();
  });
});
