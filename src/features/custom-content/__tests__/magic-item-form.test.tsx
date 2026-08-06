import { describe, expect, it } from 'vitest';

import {
  EMPTY_MAGIC_ITEM_DRAFT,
  buildMagicItemFromDraft,
  draftFromMagicItem,
  validateMagicItemDraft,
} from '../forms/magic-item-form';

/**
 * Tests pure-fonction du formulaire objet magique (directive 2026-06-27). Le
 * rendu React est couvert en intégration (pack-editor) + e2e. Ici on verrouille
 * draft ↔ MagicItem et les règles de validation (id, name FR, catégorie,
 * rareté, effet magique requis ; description fluff optionnelle ; harmonisation).
 */

function flameTongueDraft() {
  return {
    ...EMPTY_MAGIC_ITEM_DRAFT,
    id: 'epee-des-flammes',
    nameFr: 'Épée des flammes',
    nameEn: 'Flame Tongue',
    category: 'weapon' as const,
    rarity: 'rare' as const,
    attunement: true,
    magicDescriptionFr: 'Sur commande, la lame s’embrase (+2d6 feu).',
    magicDescriptionEn: 'On command, the blade ignites (+2d6 fire).',
  };
}

describe('buildMagicItemFromDraft', () => {
  it('produit un MagicItem complet — attunement bool, description=null, source=aidedd-homebrew', () => {
    const item = buildMagicItemFromDraft(flameTongueDraft());
    expect(item).toEqual({
      id: 'epee-des-flammes',
      name: { fr: 'Épée des flammes', en: 'Flame Tongue' },
      category: 'weapon',
      rarity: 'rare',
      attunement: true,
      magicDescription: {
        fr: 'Sur commande, la lame s’embrase (+2d6 feu).',
        en: 'On command, the blade ignites (+2d6 fire).',
      },
      description: null,
      source: 'custom',
    });
  });

  it('inclut la description d’ambiance quand le toggle est actif', () => {
    const item = buildMagicItemFromDraft({
      ...flameTongueDraft(),
      hasDescription: true,
      descriptionFr: 'Une lame ancienne aux gravures runiques.',
    });
    expect(item.description).toEqual({
      fr: 'Une lame ancienne aux gravures runiques.',
    });
  });

  it('omet la description (null) si le toggle est actif mais le texte FR vide', () => {
    const item = buildMagicItemFromDraft({
      ...flameTongueDraft(),
      hasDescription: true,
      descriptionFr: '   ',
    });
    expect(item.description).toBeNull();
  });
});

describe('validateMagicItemDraft', () => {
  it('valide un objet magique complet', () => {
    const result = validateMagicItemDraft(flameTongueDraft());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.item.id).toBe('epee-des-flammes');
      expect(result.item.rarity).toBe('rare');
    }
  });

  it('refuse un id vide', () => {
    const result = validateMagicItemDraft({ ...flameTongueDraft(), id: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.id).toBeTruthy();
  });

  it('refuse un id non kebab-case', () => {
    const result = validateMagicItemDraft({
      ...flameTongueDraft(),
      id: 'Épée Flammes',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.id).toBeTruthy();
  });

  it('refuse une catégorie / rareté / effet magique manquants', () => {
    const result = validateMagicItemDraft({
      ...EMPTY_MAGIC_ITEM_DRAFT,
      id: 'truc',
      nameFr: 'Truc',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.category).toBeTruthy();
      expect(result.fieldErrors.rarity).toBeTruthy();
      expect(result.fieldErrors.magicDescriptionFr).toBeTruthy();
    }
  });
});

describe('draftFromMagicItem — round-trip', () => {
  it('reconstruit le draft à l’identique (build → draft → build)', () => {
    const item = buildMagicItemFromDraft({
      ...flameTongueDraft(),
      hasDescription: true,
      descriptionFr: 'Lame runique.',
    });
    const draft = draftFromMagicItem(item);
    expect(draft.id).toBe('epee-des-flammes');
    expect(draft.attunement).toBe(true);
    expect(draft.hasDescription).toBe(true);
    expect(draft.descriptionFr).toBe('Lame runique.');
    // Le rebuild produit le même objet.
    expect(buildMagicItemFromDraft(draft)).toEqual(item);
  });

  it('attunement i18n importé → aplati en booléen true', () => {
    const draft = draftFromMagicItem({
      id: 'anneau',
      name: { fr: 'Anneau' },
      category: 'gear',
      rarity: 'uncommon',
      attunement: { fr: 'par un lanceur de sorts' },
      magicDescription: { fr: 'Effet.' },
      description: null,
      source: 'srd-5.2.1',
    });
    expect(draft.attunement).toBe(true);
  });
});
