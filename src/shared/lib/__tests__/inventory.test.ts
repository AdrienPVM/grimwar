import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addItemToInventory,
  ensureContentExists,
  type CharacterInventoryShape,
} from '../inventory';
import * as loaderModule from '../content-loader';
import * as packsModule from '../load-user-packs-entries';

const fakeMagicItem = {
  id: 'amulette-de-protection-physique',
  name: { fr: 'Amulette de protection physique' },
  category: 'gear' as const,
  rarity: 'rare' as const,
  attunement: false as const,
  magicDescription: { fr: 'Amulette merveilleuse.' },
  description: null,
  source: 'srd-5.2.1' as const,
};

function emptyCharacter(): CharacterInventoryShape {
  return {
    inventory: {
      items: [],
      coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 },
      weightCache: 0,
    },
  };
}

describe('inventory — strict items DB', () => {
  beforeEach(() => {
    // loadPublicContent('items') → empty (deferred this session)
    // loadPublicContent('magic-items') → fake set with one entry
    vi.spyOn(loaderModule, 'loadPublicContent').mockImplementation(async (type) => {
      if (type === 'magic-items') return [fakeMagicItem] as never;
      return [] as never;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ensureContentExists résout un magic-item connu', async () => {
    const resolved = await ensureContentExists(
      'amulette-de-protection-physique',
      'public',
    );
    expect(resolved.id).toBe('amulette-de-protection-physique');
  });

  it('ensureContentExists rejette un ID inconnu en scope public', async () => {
    await expect(ensureContentExists('hache-de-fortune', 'public')).rejects.toThrow(
      /introuvable dans public\/data/,
    );
  });

  it('addItemToInventory ajoute un item valide et incrémente sur doublon', async () => {
    const character = emptyCharacter();
    await addItemToInventory(
      character,
      'amulette-de-protection-physique',
      'public',
      { qty: 2 },
    );
    expect(character.inventory.items).toHaveLength(1);
    expect(character.inventory.items[0]?.qty).toBe(2);

    await addItemToInventory(
      character,
      'amulette-de-protection-physique',
      'public',
      { qty: 3 },
    );
    expect(character.inventory.items).toHaveLength(1);
    expect(character.inventory.items[0]?.qty).toBe(5);
  });

  it('addItemToInventory refuse un ID free-string en scope public', async () => {
    const character = emptyCharacter();
    await expect(
      addItemToInventory(character, 'epee-bricolee-par-le-joueur', 'public'),
    ).rejects.toThrow(/introuvable/);
    expect(character.inventory.items).toHaveLength(0);
  });

  it("addItemToInventory n'écrit PAS la clé contentSource quand scopeId est undefined (Firestore strict)", async () => {
    // Régression de plans/DEBT.md > D3 bug #1 : Firestore rejette les champs
    // `undefined` en mode strict. Pour scope='public' (cas du wizard 100% du
    // temps), scopeId est undefined et la clé doit être ABSENTE de l'objet,
    // pas posée à undefined. Sinon setDoc crash.
    const character = emptyCharacter();
    await addItemToInventory(
      character,
      'amulette-de-protection-physique',
      'public',
    );
    const item = character.inventory.items[0];
    expect(item).toBeDefined();
    expect('contentSource' in (item as object)).toBe(false);
  });

  it('addItemToInventory écrit contentSource quand scopeId est fourni (scope user/campaign)', async () => {
    const character = emptyCharacter();
    // On évite ensureContentExists pour ce cas en mockant resolveContent côté
    // user/campaign via le chemin direct : on vérifie juste le shape produit
    // sur un scope public + scopeId fourni explicitement (cas pathologique
    // toléré pour le test de shape).
    await addItemToInventory(
      character,
      'amulette-de-protection-physique',
      'public',
      undefined,
      'campaign-abc',
    );
    const item = character.inventory.items[0];
    expect(item?.contentSource).toBe('campaign-abc');
  });
});

/**
 * Un objet venu d'un pack maison doit être ajoutable À SA VRAIE PORTÉE. Le
 * chemin `user` visait `users/{uid}/customContent/{type}/{id}` — cinq segments,
 * refusés par `doc()` : la branche LEVAIT au lieu de résoudre. Personne ne s'en
 * apercevait faute d'appelant ; l'ajout d'objet en portée réelle en est le premier.
 */
describe('inventory — portée « user » (contenu de pack)', () => {
  const packBow = {
    id: 'arc-du-guetteur',
    name: { fr: 'Arc du guetteur' },
    category: 'weapon' as const,
    weight: 1,
    cost: { quantity: 25, unit: 'gp' as const },
    description: { fr: 'Arc maison.' },
    properties: [],
    source: 'homebrew' as const,
  };

  beforeEach(() => {
    vi.spyOn(loaderModule, 'loadPublicContent').mockResolvedValue([] as never);
    vi.spyOn(packsModule, 'loadUserPacksEntries').mockImplementation(
      async (type) => (type === 'items' ? ([packBow] as never) : ([] as never)),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('résout un objet de pack au lieu de lever sur un chemin invalide', async () => {
    await expect(
      ensureContentExists('arc-du-guetteur', 'user', 'user-1'),
    ).resolves.toMatchObject({ id: 'arc-du-guetteur' });
  });

  it('rejette clairement un id absent des packs', async () => {
    await expect(
      ensureContentExists('arc-inconnu', 'user', 'user-1'),
    ).rejects.toThrow(/introuvable dans user\/user-1/);
  });

  it('persiste la portée et sa source dans la ligne d’inventaire', async () => {
    const character = emptyCharacter();
    await addItemToInventory(
      character,
      'arc-du-guetteur',
      'user',
      { qty: 2 },
      'user-1',
    );
    expect(character.inventory.items[0]).toMatchObject({
      contentId: 'arc-du-guetteur',
      contentScope: 'user',
      contentSource: 'user-1',
      qty: 2,
    });
  });
});
