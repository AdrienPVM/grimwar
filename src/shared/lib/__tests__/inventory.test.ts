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
});
