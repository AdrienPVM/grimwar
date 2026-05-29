import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { ContentScope } from '../content-loader';

/**
 * On mock `content-loader` au niveau module pour pouvoir contrôler les
 * retours de `resolveContent` par scope. Si on faisait `vi.spyOn` sur le
 * module réel, les types génériques de la fonction se résoudraient en
 * `unknown` pour TypeScript — pénible à typer dans les mockImplementation.
 * `vi.mock` + cast explicite donne un mock typé propre.
 */
vi.mock('../content-loader', async () => {
  const actual = await vi.importActual<typeof import('../content-loader')>(
    '../content-loader',
  );
  return {
    ...actual,
    resolveContent: vi.fn(),
  };
});

import { resolveContent } from '../content-loader';
import { resolveContentMulti } from '../resolve-content-multi';

const resolveContentMock = resolveContent as unknown as ReturnType<typeof vi.fn>;

function makeFakeItem(id: string, tag: string) {
  return {
    id,
    name: { fr: tag, en: tag },
    type: 'gear',
    weight: 0,
    cost: { quantity: 0, unit: 'sp' },
    description: { fr: tag, en: tag },
    properties: [],
    source: 'srd-5.2.1',
  };
}

describe('resolveContentMulti — priorité campaign > user > public', () => {
  beforeEach(() => {
    resolveContentMock.mockReset();
  });

  it('retourne public seul quand ni campaignId ni userId', async () => {
    resolveContentMock.mockImplementation(
      async (_type: string, id: string, opts: { scope: ContentScope }) => {
        if (opts.scope === 'public') return makeFakeItem(id, 'public-version');
        return null;
      },
    );
    const result = await resolveContentMulti('items', 'sword');
    expect(result).not.toBeNull();
    expect(result!.source).toBe('public');
    expect(resolveContentMock).toHaveBeenCalledTimes(1);
    expect(resolveContentMock).toHaveBeenCalledWith('items', 'sword', {
      scope: 'public',
    });
  });

  it('priorise campaign sur public quand campaignId fourni et entrée custom existe', async () => {
    resolveContentMock.mockImplementation(
      async (_type: string, id: string, opts: { scope: ContentScope }) => {
        if (opts.scope === 'campaign')
          return makeFakeItem(id, 'campaign-version');
        if (opts.scope === 'public') return makeFakeItem(id, 'public-version');
        return null;
      },
    );
    const result = await resolveContentMulti('items', 'sword', {
      campaignId: 'camp-1',
    });
    expect(result).not.toBeNull();
    expect(result!.source).toBe('campaign');
    expect(resolveContentMock).toHaveBeenCalledTimes(1);
    expect(resolveContentMock).toHaveBeenCalledWith('items', 'sword', {
      scope: 'campaign',
      scopeId: 'camp-1',
    });
  });

  it('fallback campaign → user → public quand campaign vide', async () => {
    resolveContentMock.mockImplementation(
      async (_type: string, id: string, opts: { scope: ContentScope }) => {
        if (opts.scope === 'user') return makeFakeItem(id, 'user-version');
        if (opts.scope === 'public') return makeFakeItem(id, 'public-version');
        return null;
      },
    );
    const result = await resolveContentMulti('items', 'sword', {
      campaignId: 'camp-1',
      userId: 'user-1',
    });
    expect(result).not.toBeNull();
    expect(result!.source).toBe('user');
    expect(resolveContentMock).toHaveBeenCalledTimes(2);
  });

  it('fallback ultime sur public quand campaign + user vides', async () => {
    resolveContentMock.mockImplementation(
      async (_type: string, id: string, opts: { scope: ContentScope }) => {
        if (opts.scope === 'public') return makeFakeItem(id, 'public-version');
        return null;
      },
    );
    const result = await resolveContentMulti('items', 'sword', {
      campaignId: 'camp-1',
      userId: 'user-1',
    });
    expect(result).not.toBeNull();
    expect(result!.source).toBe('public');
    expect(resolveContentMock).toHaveBeenCalledTimes(3);
  });

  it('retourne null quand toutes les sources sont vides', async () => {
    resolveContentMock.mockResolvedValue(null);
    const result = await resolveContentMulti('items', 'ghost', {
      campaignId: 'camp-1',
      userId: 'user-1',
    });
    expect(result).toBeNull();
    expect(resolveContentMock).toHaveBeenCalledTimes(3);
  });

  it('skippe campaign quand campaignId est null', async () => {
    resolveContentMock.mockImplementation(
      async (_type: string, id: string, opts: { scope: ContentScope }) => {
        if (opts.scope === 'public') return makeFakeItem(id, 'public-version');
        return null;
      },
    );
    await resolveContentMulti('items', 'sword', {
      campaignId: null,
      userId: 'user-1',
    });
    // user + public seulement, pas de campaign
    expect(resolveContentMock).toHaveBeenCalledTimes(2);
    expect(resolveContentMock).not.toHaveBeenCalledWith(
      'items',
      'sword',
      expect.objectContaining({ scope: 'campaign' }),
    );
  });

  it('skippe user quand userId est null', async () => {
    resolveContentMock.mockImplementation(
      async (_type: string, id: string, opts: { scope: ContentScope }) => {
        if (opts.scope === 'public') return makeFakeItem(id, 'public-version');
        return null;
      },
    );
    await resolveContentMulti('items', 'sword', { userId: null });
    expect(resolveContentMock).toHaveBeenCalledTimes(1); // public seul
    expect(resolveContentMock).toHaveBeenCalledWith('items', 'sword', {
      scope: 'public',
    });
  });
});
