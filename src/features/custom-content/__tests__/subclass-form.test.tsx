import { describe, expect, it } from 'vitest';

import {
  EMPTY_SUBCLASS_DRAFT,
  buildSubclassFromDraft,
  draftFromSubclass,
  validateSubclassDraft,
} from '../forms/subclass-form';

/**
 * Tests pure-fonction du formulaire subclass (JALON 3C.5). Le rendu React
 * dépend de `useContent('classes')` et est couvert par les tests UI dans
 * `pack-editor-screen.test.tsx`. Ici on verrouille les transformations draft
 * ↔ Subclass + les règles de validation (FR required, feature incomplète,
 * doublon level+name).
 */

describe('buildSubclassFromDraft', () => {
  it('produit une Subclass minimale + source aidedd-homebrew', () => {
    const sc = buildSubclassFromDraft({
      ...EMPTY_SUBCLASS_DRAFT,
      id: 'tracer',
      classId: 'guerrier',
      nameFr: 'Tracer',
      descriptionFr: 'Sous-classe test.',
    });
    expect(sc).toEqual({
      id: 'tracer',
      classId: 'guerrier',
      name: { fr: 'Tracer' },
      description: { fr: 'Sous-classe test.' },
      features: [],
      source: 'aidedd-homebrew',
    });
  });

  it('mappe les features avec niveau + i18n FR + EN optionnel', () => {
    const sc = buildSubclassFromDraft({
      ...EMPTY_SUBCLASS_DRAFT,
      id: 'tracer',
      classId: 'guerrier',
      nameFr: 'T',
      descriptionFr: 'D',
      features: [
        {
          level: 3,
          nameFr: 'Coup précis',
          nameEn: 'Precise Strike',
          descriptionFr: 'Inflige +2 dégâts.',
          descriptionEn: '+2 damage.',
        },
        {
          level: 7,
          nameFr: 'Reflex',
          nameEn: '',
          descriptionFr: 'Esquive +1.',
          descriptionEn: '',
        },
      ],
    });
    expect(sc.features).toEqual([
      {
        level: 3,
        name: { fr: 'Coup précis', en: 'Precise Strike' },
        description: { fr: 'Inflige +2 dégâts.', en: '+2 damage.' },
      },
      {
        level: 7,
        name: { fr: 'Reflex' },
        description: { fr: 'Esquive +1.' },
      },
    ]);
  });

  it('trim les whitespaces sur tous les champs scalaires', () => {
    const sc = buildSubclassFromDraft({
      ...EMPTY_SUBCLASS_DRAFT,
      id: '  tracer  ',
      classId: '  guerrier  ',
      nameFr: '  T  ',
      descriptionFr: '  D  ',
    });
    expect(sc.id).toBe('tracer');
    expect(sc.classId).toBe('guerrier');
    expect(sc.name.fr).toBe('T');
    expect(sc.description.fr).toBe('D');
  });
});

describe('draftFromSubclass', () => {
  it('reconstruit un draft depuis une Subclass complète', () => {
    const draft = draftFromSubclass({
      id: 'tracer',
      classId: 'guerrier',
      name: { fr: 'Tracer', en: 'Tracer' },
      description: { fr: 'D' },
      features: [
        {
          level: 3,
          name: { fr: 'F1', en: 'F1en' },
          description: { fr: 'D1' },
        },
      ],
      source: 'aidedd-homebrew',
    });
    expect(draft.id).toBe('tracer');
    expect(draft.classId).toBe('guerrier');
    expect(draft.nameEn).toBe('Tracer');
    const feature = draft.features[0]!;
    expect(feature.level).toBe(3);
    expect(feature.nameFr).toBe('F1');
    expect(feature.nameEn).toBe('F1en');
    expect(feature.descriptionFr).toBe('D1');
    expect(feature.descriptionEn).toBe('');
  });

  it('roundtrip draft → Subclass → draft équivalent (sans champs EN)', () => {
    const initial = {
      ...EMPTY_SUBCLASS_DRAFT,
      id: 'sc-tracer',
      classId: 'guerrier',
      nameFr: 'SC',
      descriptionFr: 'D',
      features: [
        {
          level: 3,
          nameFr: 'F1',
          nameEn: '',
          descriptionFr: 'D1',
          descriptionEn: '',
        },
      ],
    };
    const sc = buildSubclassFromDraft(initial);
    const back = draftFromSubclass(sc);
    expect(back).toEqual(initial);
  });
});

describe('validateSubclassDraft', () => {
  const baseValid = {
    ...EMPTY_SUBCLASS_DRAFT,
    id: 'sc-valid',
    classId: 'guerrier',
    nameFr: 'SC',
    descriptionFr: 'D',
  };

  it('accepte un draft minimal valide (sans features)', () => {
    const result = validateSubclassDraft(baseValid);
    expect(result.ok).toBe(true);
  });

  it('rejette si id manque', () => {
    const result = validateSubclassDraft({ ...baseValid, id: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.id).toBeDefined();
  });

  it("rejette si id n'est pas en kebab-case", () => {
    const result = validateSubclassDraft({ ...baseValid, id: 'Bad_ID' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.id).toBeDefined();
  });

  it('rejette si classId manque', () => {
    const result = validateSubclassDraft({ ...baseValid, classId: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.classId).toBeDefined();
  });

  it('rejette si nameFr manque', () => {
    const result = validateSubclassDraft({ ...baseValid, nameFr: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.nameFr).toBeDefined();
  });

  it('rejette si descriptionFr manque', () => {
    const result = validateSubclassDraft({ ...baseValid, descriptionFr: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.descriptionFr).toBeDefined();
  });

  it("rejette si une feature n'a pas de nom FR ou pas de description FR", () => {
    const resultNoName = validateSubclassDraft({
      ...baseValid,
      features: [
        {
          level: 3,
          nameFr: '',
          nameEn: '',
          descriptionFr: 'D',
          descriptionEn: '',
        },
      ],
    });
    expect(resultNoName.ok).toBe(false);
    if (!resultNoName.ok)
      expect(resultNoName.fieldErrors.features).toBeDefined();

    const resultNoDesc = validateSubclassDraft({
      ...baseValid,
      features: [
        {
          level: 3,
          nameFr: 'F',
          nameEn: '',
          descriptionFr: '',
          descriptionEn: '',
        },
      ],
    });
    expect(resultNoDesc.ok).toBe(false);
    if (!resultNoDesc.ok)
      expect(resultNoDesc.fieldErrors.features).toBeDefined();
  });

  it("rejette si deux features partagent le même couple (level, nameFr)", () => {
    const result = validateSubclassDraft({
      ...baseValid,
      features: [
        {
          level: 3,
          nameFr: 'Coup précis',
          nameEn: '',
          descriptionFr: 'D1',
          descriptionEn: '',
        },
        {
          level: 3,
          nameFr: 'Coup précis',
          nameEn: '',
          descriptionFr: 'D2',
          descriptionEn: '',
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.features).toBeDefined();
  });

  it("accepte deux features au même niveau si leurs noms diffèrent", () => {
    const result = validateSubclassDraft({
      ...baseValid,
      features: [
        {
          level: 3,
          nameFr: 'F1',
          nameEn: '',
          descriptionFr: 'D1',
          descriptionEn: '',
        },
        {
          level: 3,
          nameFr: 'F2',
          nameEn: '',
          descriptionFr: 'D2',
          descriptionEn: '',
        },
      ],
    });
    expect(result.ok).toBe(true);
  });
});
