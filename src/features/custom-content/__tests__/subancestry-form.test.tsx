import { describe, expect, it } from 'vitest';

import {
  EMPTY_SUBANCESTRY_DRAFT,
  buildSubancestryFromDraft,
  draftFromSubancestry,
  validateSubancestryDraft,
} from '../forms/subancestry-form';

/**
 * Tests pure-fonction du formulaire subancestry (JALON 3C.3). Le rendu React
 * dépend de `useContent('ancestries')` (chargement asynchrone Dexie + custom)
 * et est couvert par les tests UI dans `pack-editor-screen.test.tsx`. Ici on
 * verrouille les transformations draft ↔ Subancestry + les règles de
 * validation (ASI partiel, doublon, traits incomplets).
 */

describe('buildSubancestryFromDraft', () => {
  it('produit une Subancestry minimale + source aidedd-homebrew', () => {
    const sub = buildSubancestryFromDraft({
      ...EMPTY_SUBANCESTRY_DRAFT,
      id: 'human-vigilant',
      ancestryId: 'humain',
      nameFr: 'Humain vigilant',
      descriptionFr: 'Variante test.',
    });
    expect(sub).toEqual({
      id: 'human-vigilant',
      ancestryId: 'humain',
      name: { fr: 'Humain vigilant' },
      description: { fr: 'Variante test.' },
      traits: [],
      abilityScoreIncrease: [],
      source: 'aidedd-homebrew',
    });
  });

  it('mappe les ASI valides et filtre les lignes sans ability', () => {
    const sub = buildSubancestryFromDraft({
      ...EMPTY_SUBANCESTRY_DRAFT,
      id: 'a',
      ancestryId: 'humain',
      nameFr: 'A',
      descriptionFr: 'D',
      asis: [
        { ability: 'for', bonus: 2 },
        { ability: '', bonus: 1 },
        { ability: 'con', bonus: 1 },
      ],
    });
    expect(sub.abilityScoreIncrease).toEqual([
      { ability: 'for', bonus: 2 },
      { ability: 'con', bonus: 1 },
    ]);
  });

  it("mappe les traits avec i18n FR + EN optionnel", () => {
    const sub = buildSubancestryFromDraft({
      ...EMPTY_SUBANCESTRY_DRAFT,
      id: 'a',
      ancestryId: 'humain',
      nameFr: 'A',
      descriptionFr: 'D',
      traits: [
        {
          nameFr: 'Vision dans le noir',
          nameEn: 'Darkvision',
          descriptionFr: 'Voit dans l’obscurité.',
          descriptionEn: 'Sees in the dark.',
        },
      ],
    });
    expect(sub.traits).toEqual([
      {
        name: { fr: 'Vision dans le noir', en: 'Darkvision' },
        description: {
          fr: 'Voit dans l’obscurité.',
          en: 'Sees in the dark.',
        },
      },
    ]);
  });

  it('trim les whitespaces sur tous les champs', () => {
    const sub = buildSubancestryFromDraft({
      ...EMPTY_SUBANCESTRY_DRAFT,
      id: '  human-vigilant  ',
      ancestryId: '  humain  ',
      nameFr: '  Humain  ',
      descriptionFr: '  Descr  ',
    });
    expect(sub.id).toBe('human-vigilant');
    expect(sub.ancestryId).toBe('humain');
    expect(sub.name.fr).toBe('Humain');
    expect(sub.description.fr).toBe('Descr');
  });
});

describe('draftFromSubancestry', () => {
  it('reconstruit un draft depuis une Subancestry complète', () => {
    const draft = draftFromSubancestry({
      id: 'human-vigilant',
      ancestryId: 'humain',
      name: { fr: 'Humain', en: 'Human' },
      description: { fr: 'D' },
      traits: [
        {
          name: { fr: 'Vision', en: 'DV' },
          description: { fr: 'noir' },
        },
      ],
      abilityScoreIncrease: [{ ability: 'for', bonus: 2 }],
      source: 'aidedd-homebrew',
    });
    expect(draft.id).toBe('human-vigilant');
    expect(draft.ancestryId).toBe('humain');
    expect(draft.nameEn).toBe('Human');
    expect(draft.asis).toEqual([{ ability: 'for', bonus: 2 }]);
    const trait = draft.traits[0]!;
    expect(trait.nameFr).toBe('Vision');
    expect(trait.nameEn).toBe('DV');
    expect(trait.descriptionFr).toBe('noir');
    expect(trait.descriptionEn).toBe('');
  });

  it("roundtrip draft → Subancestry → draft équivalent (sans champs EN)", () => {
    const initial = {
      ...EMPTY_SUBANCESTRY_DRAFT,
      id: 'sub-tracer',
      ancestryId: 'humain',
      nameFr: 'Sub',
      descriptionFr: 'D',
      asis: [{ ability: 'dex' as const, bonus: 1 }],
      traits: [
        {
          nameFr: 'T1',
          nameEn: '',
          descriptionFr: 'd1',
          descriptionEn: '',
        },
      ],
    };
    const sub = buildSubancestryFromDraft(initial);
    const back = draftFromSubancestry(sub);
    expect(back).toEqual(initial);
  });
});

describe('validateSubancestryDraft', () => {
  it('accepte un draft minimal valide (sans ASI ni traits)', () => {
    const result = validateSubancestryDraft({
      ...EMPTY_SUBANCESTRY_DRAFT,
      id: 'sub-a',
      ancestryId: 'humain',
      nameFr: 'Sub A',
      descriptionFr: 'Test',
    });
    expect(result.ok).toBe(true);
  });

  it('rejette si ancestryId manque', () => {
    const result = validateSubancestryDraft({
      ...EMPTY_SUBANCESTRY_DRAFT,
      id: 'sub-a',
      nameFr: 'Sub',
      descriptionFr: 'D',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.ancestryId).toBeDefined();
    }
  });

  it('rejette si descriptionFr manque (description requise pour subancestry)', () => {
    const result = validateSubancestryDraft({
      ...EMPTY_SUBANCESTRY_DRAFT,
      id: 'sub-a',
      ancestryId: 'humain',
      nameFr: 'Sub',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.descriptionFr).toBeDefined();
    }
  });

  it("rejette si une ligne ASI n'a pas d'ability sélectionnée", () => {
    const result = validateSubancestryDraft({
      ...EMPTY_SUBANCESTRY_DRAFT,
      id: 'a',
      ancestryId: 'humain',
      nameFr: 'A',
      descriptionFr: 'D',
      asis: [{ ability: '', bonus: 1 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.asis).toBeDefined();
    }
  });

  it("rejette si deux ASI partagent la même ability", () => {
    const result = validateSubancestryDraft({
      ...EMPTY_SUBANCESTRY_DRAFT,
      id: 'a',
      ancestryId: 'humain',
      nameFr: 'A',
      descriptionFr: 'D',
      asis: [
        { ability: 'for', bonus: 1 },
        { ability: 'for', bonus: 1 },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.asis).toBeDefined();
    }
  });

  it("rejette si un trait n'a ni nom FR ni description FR", () => {
    const result = validateSubancestryDraft({
      ...EMPTY_SUBANCESTRY_DRAFT,
      id: 'a',
      ancestryId: 'humain',
      nameFr: 'A',
      descriptionFr: 'D',
      traits: [
        {
          nameFr: '',
          nameEn: '',
          descriptionFr: '',
          descriptionEn: '',
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.traits).toBeDefined();
    }
  });

  it("accepte un draft avec ASI valide + trait complet", () => {
    const result = validateSubancestryDraft({
      ...EMPTY_SUBANCESTRY_DRAFT,
      id: 'a',
      ancestryId: 'humain',
      nameFr: 'A',
      descriptionFr: 'D',
      asis: [{ ability: 'for', bonus: 2 }],
      traits: [
        {
          nameFr: 'T1',
          nameEn: '',
          descriptionFr: 'd1',
          descriptionEn: '',
        },
      ],
    });
    expect(result.ok).toBe(true);
  });
});
