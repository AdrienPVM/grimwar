import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addItemToInventory,
  ensureContentExists,
  type CharacterInventoryShape,
} from '../inventory';
import * as loaderModule from '../content-loader';

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
