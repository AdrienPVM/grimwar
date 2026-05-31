import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as ContentLoader from '../content-loader';
import { loadContentMulti } from '../load-content-multi';
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
  });

  it('SRD seul (no userId, no campaignId) : retourne loadPublicContent tel quel', async () => {
    vi.spyOn(ContentLoader, 'loadPublicContent').mockResolvedValue([
      fakeItem('sword', 'épée'),
      fakeItem('shield', 'bouclier'),
    ]);
    const loadUser = vi.spyOn(ContentLoader, 'loadUserContent');
    const loadCamp = vi.spyOn(ContentLoader, 'loadCampaignContent');

    const result = await loadContentMulti('items');

    expect(result.map((i) => i.id)).toEqual(['sword', 'shield']);
    expect(loadUser).not.toHaveBeenCalled();
    expect(loadCamp).not.toHaveBeenCalled();
  });

  it('SRD + user disjoint : union des deux, ordre stable (public puis user)', async () => {
    vi.spyOn(ContentLoader, 'loadPublicContent').mockResolvedValue([
      fakeItem('sword', 'épée'),
    ]);
    vi.spyOn(ContentLoader, 'loadUserContent').mockResolvedValue([
      fakeItem('homebrew-bow', 'arc maison'),
    ]);

    const result = await loadContentMulti('items', { userId: 'user-1' });

    expect(result.map((i) => i.id)).toEqual(['sword', 'homebrew-bow']);
  });

  it('SRD + user en conflit : user remplace public + warn', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(ContentLoader, 'loadPublicContent').mockResolvedValue([
      fakeItem('sword', 'épée SRD'),
    ]);
    vi.spyOn(ContentLoader, 'loadUserContent').mockResolvedValue([
      fakeItem('sword', 'épée user'),
    ]);

    const result = await loadContentMulti('items', { userId: 'user-1' });

    expect(result).toHaveLength(1);
    expect(result[0]?.name.fr).toBe('épée user');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('collision id "sword"'),
    );
    warn.mockRestore();
  });

  it('campaign > user > public : priorité campaign sur user sur public', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(ContentLoader, 'loadPublicContent').mockResolvedValue([
      fakeItem('sword', 'épée SRD'),
    ]);
    vi.spyOn(ContentLoader, 'loadUserContent').mockResolvedValue([
      fakeItem('sword', 'épée user'),
    ]);
    vi.spyOn(ContentLoader, 'loadCampaignContent').mockResolvedValue([
      fakeItem('sword', 'épée campaign'),
    ]);

    const result = await loadContentMulti('items', {
      userId: 'user-1',
      campaignId: 'camp-1',
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.name.fr).toBe('épée campaign');
    // 2 collisions : user→public puis campaign→user
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it("campaignId sans userId : charge public + campaign, pas user", async () => {
    vi.spyOn(ContentLoader, 'loadPublicContent').mockResolvedValue([
      fakeItem('sword', 'épée'),
    ]);
    const loadUser = vi.spyOn(ContentLoader, 'loadUserContent');
    vi.spyOn(ContentLoader, 'loadCampaignContent').mockResolvedValue([
      fakeItem('homebrew', 'maison'),
    ]);

    const result = await loadContentMulti('items', { campaignId: 'camp-1' });

    expect(result.map((i) => i.id)).toEqual(['sword', 'homebrew']);
    expect(loadUser).not.toHaveBeenCalled();
  });
});
