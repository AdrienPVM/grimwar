import { describe, expect, it } from 'vitest';

import {
  EMPTY_BACKGROUND_DRAFT,
  buildBackgroundFromDraft,
  draftFromBackground,
  validateBackgroundDraft,
} from '../forms/background-form';

/**
 * Tests pure-fonction du formulaire background (JALON 3C.4). Le rendu React
 * dépend de `useContent('items')` (chargement asynchrone Dexie + custom) et
 * est couvert par les tests UI dans `pack-editor-screen.test.tsx`. Ici on
 * verrouille les transformations draft ↔ Background + les règles de
 * validation (FR required, equipment incomplet, doublon, qty invalide).
 */

describe('buildBackgroundFromDraft', () => {
  it('produit un Background minimal + source aidedd-homebrew', () => {
    const bg = buildBackgroundFromDraft({
      ...EMPTY_BACKGROUND_DRAFT,
      id: 'wanderer',
      nameFr: 'Vagabond',
      descriptionFr: 'Voyage sans cesse.',
      featureNameFr: 'Bénédiction du chemin',
      featureDescriptionFr: 'Voyage plus vite.',
    });
    expect(bg).toEqual({
      id: 'wanderer',
      name: { fr: 'Vagabond' },
      description: { fr: 'Voyage sans cesse.' },
      skillProficiencies: [],
      toolProficiencies: [],
      languages: 0,
      equipment: [],
      startingCoins: null,
      feature: {
        name: { fr: 'Bénédiction du chemin' },
        description: { fr: 'Voyage plus vite.' },
      },
      source: 'aidedd-homebrew',
    });
  });

  it('mappe skillProficiencies (EN PascalCase) et toolProficiencies', () => {
    const bg = buildBackgroundFromDraft({
      ...EMPTY_BACKGROUND_DRAFT,
      id: 'spy',
      nameFr: 'Espion',
      descriptionFr: 'D',
      skillProficiencies: ['Stealth', 'Deception'],
      toolProficiencies: ['thieves-tools', 'disguise-kit'],
      featureNameFr: 'Couverture',
      featureDescriptionFr: 'F',
    });
    expect(bg.skillProficiencies).toEqual(['Stealth', 'Deception']);
    expect(bg.toolProficiencies).toEqual(['thieves-tools', 'disguise-kit']);
  });

  it('filtre les tools vides après trim', () => {
    const bg = buildBackgroundFromDraft({
      ...EMPTY_BACKGROUND_DRAFT,
      id: 'x',
      nameFr: 'X',
      descriptionFr: 'D',
      toolProficiencies: ['thieves-tools', '   ', ''],
      featureNameFr: 'F',
      featureDescriptionFr: 'F',
    });
    expect(bg.toolProficiencies).toEqual(['thieves-tools']);
  });

  it('mappe les équipements valides et filtre les lignes sans itemId', () => {
    const bg = buildBackgroundFromDraft({
      ...EMPTY_BACKGROUND_DRAFT,
      id: 'x',
      nameFr: 'X',
      descriptionFr: 'D',
      equipment: [
        { itemId: 'rope', qty: 1 },
        { itemId: '', qty: 5 },
        { itemId: 'torch', qty: 10 },
      ],
      featureNameFr: 'F',
      featureDescriptionFr: 'F',
    });
    expect(bg.equipment).toEqual([
      { itemId: 'rope', qty: 1 },
      { itemId: 'torch', qty: 10 },
    ]);
  });

  it('expose startingCoins quand hasStartingCoins=true, null sinon', () => {
    const draftBase = {
      ...EMPTY_BACKGROUND_DRAFT,
      id: 'x',
      nameFr: 'X',
      descriptionFr: 'D',
      featureNameFr: 'F',
      featureDescriptionFr: 'F',
    };
    const without = buildBackgroundFromDraft(draftBase);
    expect(without.startingCoins).toBeNull();

    const withCoins = buildBackgroundFromDraft({
      ...draftBase,
      hasStartingCoins: true,
      startingCoinsQty: 15,
      startingCoinsUnit: 'gp',
    });
    expect(withCoins.startingCoins).toEqual({ qty: 15, unit: 'gp' });
  });

  it('feature i18n FR + EN optionnel pour name et description', () => {
    const bg = buildBackgroundFromDraft({
      ...EMPTY_BACKGROUND_DRAFT,
      id: 'x',
      nameFr: 'X',
      descriptionFr: 'D',
      featureNameFr: 'Talent',
      featureNameEn: 'Talent EN',
      featureDescriptionFr: 'Description',
      featureDescriptionEn: 'Description EN',
    });
    expect(bg.feature).toEqual({
      name: { fr: 'Talent', en: 'Talent EN' },
      description: { fr: 'Description', en: 'Description EN' },
    });
  });

  it('trim les whitespaces sur tous les champs scalaires', () => {
    const bg = buildBackgroundFromDraft({
      ...EMPTY_BACKGROUND_DRAFT,
      id: '  wanderer  ',
      nameFr: '  Vagabond  ',
      descriptionFr: '  D  ',
      featureNameFr: '  F  ',
      featureDescriptionFr: '  DF  ',
    });
    expect(bg.id).toBe('wanderer');
    expect(bg.name.fr).toBe('Vagabond');
    expect(bg.description.fr).toBe('D');
    expect(bg.feature.name.fr).toBe('F');
    expect(bg.feature.description.fr).toBe('DF');
  });
});

describe('draftFromBackground', () => {
  it('reconstruit un draft depuis un Background complet (sans coins)', () => {
    const draft = draftFromBackground({
      id: 'acolyte',
      name: { fr: 'Acolyte', en: 'Acolyte' },
      description: { fr: 'D' },
      skillProficiencies: ['Insight', 'Religion'],
      toolProficiencies: ['calligraphers-supplies'],
      languages: 2,
      equipment: [{ itemId: 'book', qty: 1 }],
      startingCoins: null,
      feature: {
        name: { fr: 'Don', en: 'Feat' },
        description: { fr: 'D' },
      },
      source: 'aidedd-homebrew',
    });
    expect(draft.id).toBe('acolyte');
    expect(draft.nameEn).toBe('Acolyte');
    expect(draft.skillProficiencies).toEqual(['Insight', 'Religion']);
    expect(draft.languages).toBe(2);
    expect(draft.equipment).toEqual([{ itemId: 'book', qty: 1 }]);
    expect(draft.hasStartingCoins).toBe(false);
    expect(draft.startingCoinsQty).toBe(0);
    expect(draft.startingCoinsUnit).toBe('gp');
    expect(draft.featureNameEn).toBe('Feat');
  });

  it('hasStartingCoins=true quand le background expose un montant', () => {
    const draft = draftFromBackground({
      id: 'x',
      name: { fr: 'X' },
      description: { fr: 'D' },
      skillProficiencies: [],
      toolProficiencies: [],
      languages: 0,
      equipment: [],
      startingCoins: { qty: 8, unit: 'gp' },
      feature: {
        name: { fr: 'F' },
        description: { fr: 'D' },
      },
      source: 'aidedd-homebrew',
    });
    expect(draft.hasStartingCoins).toBe(true);
    expect(draft.startingCoinsQty).toBe(8);
    expect(draft.startingCoinsUnit).toBe('gp');
  });

  it('roundtrip draft → Background → draft équivalent (sans champs EN)', () => {
    const initial = {
      ...EMPTY_BACKGROUND_DRAFT,
      id: 'bg-tracer',
      nameFr: 'Tracer',
      descriptionFr: 'D',
      skillProficiencies: ['Athletics'],
      toolProficiencies: ['thieves-tools'],
      languages: 1,
      equipment: [{ itemId: 'rope', qty: 2 }],
      hasStartingCoins: true,
      startingCoinsQty: 10,
      startingCoinsUnit: 'gp' as const,
      featureNameFr: 'Talent',
      featureDescriptionFr: 'D',
    };
    const bg = buildBackgroundFromDraft(initial);
    const back = draftFromBackground(bg);
    expect(back).toEqual(initial);
  });
});

describe('validateBackgroundDraft', () => {
  const baseValid = {
    ...EMPTY_BACKGROUND_DRAFT,
    id: 'bg-valid',
    nameFr: 'Nom',
    descriptionFr: 'Description',
    featureNameFr: 'Don',
    featureDescriptionFr: 'Description',
  };

  it('accepte un draft minimal valide', () => {
    const result = validateBackgroundDraft(baseValid);
    expect(result.ok).toBe(true);
  });

  it('rejette si id manque', () => {
    const result = validateBackgroundDraft({ ...baseValid, id: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.id).toBeDefined();
  });

  it("rejette si id n'est pas en kebab-case", () => {
    const result = validateBackgroundDraft({ ...baseValid, id: 'Bad_ID' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.id).toBeDefined();
  });

  it('rejette si nameFr manque', () => {
    const result = validateBackgroundDraft({ ...baseValid, nameFr: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.nameFr).toBeDefined();
  });

  it('rejette si descriptionFr manque', () => {
    const result = validateBackgroundDraft({ ...baseValid, descriptionFr: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.descriptionFr).toBeDefined();
  });

  it('rejette si featureNameFr manque', () => {
    const result = validateBackgroundDraft({ ...baseValid, featureNameFr: '' });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.fieldErrors.featureNameFr).toBeDefined();
  });

  it('rejette si featureDescriptionFr manque', () => {
    const result = validateBackgroundDraft({
      ...baseValid,
      featureDescriptionFr: '',
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.fieldErrors.featureDescriptionFr).toBeDefined();
  });

  it("rejette si une ligne d'équipement n'a pas d'itemId", () => {
    const result = validateBackgroundDraft({
      ...baseValid,
      equipment: [{ itemId: '', qty: 1 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.equipment).toBeDefined();
  });

  it("rejette si deux équipements partagent le même itemId", () => {
    const result = validateBackgroundDraft({
      ...baseValid,
      equipment: [
        { itemId: 'rope', qty: 1 },
        { itemId: 'rope', qty: 1 },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.equipment).toBeDefined();
  });

  it("rejette si une quantité est < 1 ou non finie", () => {
    const resultZero = validateBackgroundDraft({
      ...baseValid,
      equipment: [{ itemId: 'rope', qty: 0 }],
    });
    expect(resultZero.ok).toBe(false);

    const resultNeg = validateBackgroundDraft({
      ...baseValid,
      equipment: [{ itemId: 'rope', qty: -1 }],
    });
    expect(resultNeg.ok).toBe(false);
  });

  it('accepte un draft complet avec skills + tools + equipment + coins + feature', () => {
    const result = validateBackgroundDraft({
      ...baseValid,
      skillProficiencies: ['Athletics', 'Intimidation'],
      toolProficiencies: ['thieves-tools'],
      languages: 1,
      equipment: [{ itemId: 'rope', qty: 1 }],
      hasStartingCoins: true,
      startingCoinsQty: 10,
      startingCoinsUnit: 'gp',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.background.skillProficiencies).toEqual([
        'Athletics',
        'Intimidation',
      ]);
      expect(result.background.startingCoins).toEqual({ qty: 10, unit: 'gp' });
    }
  });
});
