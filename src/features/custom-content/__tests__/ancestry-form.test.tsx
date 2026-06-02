import { describe, expect, it } from 'vitest';

import {
  EMPTY_ANCESTRY_DRAFT,
  buildAncestryFromDraft,
  draftFromAncestry,
  validateAncestryDraft,
} from '../forms/ancestry-form';

/**
 * Tests pure-fonction du formulaire ancestry (JALON 3C.8). Le rendu React
 * (useContent('spells'), chips toggle) est couvert par le test d'intégration
 * de PackEditor + l'e2e. Ici on verrouille :
 *   - buildAncestryFromDraft : trim + dragon/giant options conditionnels
 *   - draftFromAncestry : roundtrip
 *   - validateAncestryDraft : 11 branches (id reservé, ASI partiel/doublon,
 *     trait incomplet, dragon/giant incomplet/doublon/slug, speed > 0).
 */

function minimalDraft() {
  return {
    ...EMPTY_ANCESTRY_DRAFT,
    id: 'peuple-des-brumes',
    nameFr: 'Peuple des brumes',
    descriptionFr: 'Ascendance test.',
  };
}

describe('buildAncestryFromDraft', () => {
  it('produit une Ancestry minimale + source aidedd-homebrew + options vide', () => {
    const ancestry = buildAncestryFromDraft(minimalDraft());
    expect(ancestry).toEqual({
      id: 'peuple-des-brumes',
      name: { fr: 'Peuple des brumes' },
      size: 'medium',
      speed: 9,
      description: { fr: 'Ascendance test.' },
      abilityScoreIncrease: [],
      traits: [],
      languages: [],
      options: {},
      source: 'aidedd-homebrew',
    });
  });

  it('mappe les ASI valides et filtre les lignes sans ability', () => {
    const ancestry = buildAncestryFromDraft({
      ...minimalDraft(),
      asis: [
        { ability: 'for', bonus: 2 },
        { ability: '', bonus: 1 },
        { ability: 'dex', bonus: 1 },
      ],
    });
    expect(ancestry.abilityScoreIncrease).toEqual([
      { ability: 'for', bonus: 2 },
      { ability: 'dex', bonus: 1 },
    ]);
  });

  it("mappe les traits avec i18n FR + EN optionnel", () => {
    const ancestry = buildAncestryFromDraft({
      ...minimalDraft(),
      traits: [
        {
          nameFr: 'Vision dans le noir',
          nameEn: 'Darkvision',
          descriptionFr: 'Voit dans l’obscurité.',
          descriptionEn: 'Sees in the dark.',
        },
      ],
    });
    expect(ancestry.traits).toEqual([
      {
        name: { fr: 'Vision dans le noir', en: 'Darkvision' },
        description: {
          fr: 'Voit dans l’obscurité.',
          en: 'Sees in the dark.',
        },
      },
    ]);
  });

  it('propage commonSpellIds uniquement si non vide', () => {
    const empty = buildAncestryFromDraft(minimalDraft());
    expect(empty.commonSpellIds).toBeUndefined();
    const filled = buildAncestryFromDraft({
      ...minimalDraft(),
      commonSpellIds: ['thaumaturgie'],
    });
    expect(filled.commonSpellIds).toEqual(['thaumaturgie']);
  });

  it('propage dragonAncestries si non vide', () => {
    const ancestry = buildAncestryFromDraft({
      ...minimalDraft(),
      dragonAncestries: [
        {
          id: 'frost-ancestor',
          nameFr: 'Ancêtre de givre',
          nameEn: 'Frost ancestor',
          damageType: 'cold',
          damageTypeLabelFr: 'froid',
          damageTypeLabelEn: 'cold',
        },
      ],
    });
    expect(ancestry.options.dragonAncestries).toEqual([
      {
        id: 'frost-ancestor',
        name: { fr: 'Ancêtre de givre', en: 'Frost ancestor' },
        damageType: 'cold',
        damageTypeLabel: { fr: 'froid', en: 'cold' },
      },
    ]);
    expect(ancestry.options.giantAncestries).toBeUndefined();
  });

  it('propage giantAncestries si non vide', () => {
    const ancestry = buildAncestryFromDraft({
      ...minimalDraft(),
      giantAncestries: [
        {
          id: 'stone-ancestor',
          nameFr: 'Ancêtre de pierre',
          nameEn: '',
          effectFr: 'Résistance aux dégâts contondants.',
          effectEn: '',
        },
      ],
    });
    expect(ancestry.options.giantAncestries).toEqual([
      {
        id: 'stone-ancestor',
        name: { fr: 'Ancêtre de pierre' },
        effect: { fr: 'Résistance aux dégâts contondants.' },
      },
    ]);
  });

  it('trim les whitespaces sur tous les champs', () => {
    const ancestry = buildAncestryFromDraft({
      ...minimalDraft(),
      id: '  peuple-des-brumes  ',
      nameFr: '  Peuple  ',
      descriptionFr: '  Descr  ',
      languages: ['  Commun  ', ''],
    });
    expect(ancestry.id).toBe('peuple-des-brumes');
    expect(ancestry.name.fr).toBe('Peuple');
    expect(ancestry.description.fr).toBe('Descr');
    expect(ancestry.languages).toEqual(['Commun']);
  });
});

describe('draftFromAncestry', () => {
  it('reconstruit un draft depuis une Ancestry complète', () => {
    const draft = draftFromAncestry({
      id: 'peuple-des-brumes',
      name: { fr: 'Peuple', en: 'Mistfolk' },
      size: 'small',
      speed: 8,
      description: { fr: 'D' },
      abilityScoreIncrease: [{ ability: 'sag', bonus: 1 }],
      traits: [
        {
          name: { fr: 'Vision', en: 'DV' },
          description: { fr: 'noir' },
        },
      ],
      languages: ['Commun', 'Sylvain'],
      options: {
        dragonAncestries: [
          {
            id: 'frost-ancestor',
            name: { fr: 'Givre' },
            damageType: 'cold',
            damageTypeLabel: { fr: 'froid' },
          },
        ],
        giantAncestries: [
          {
            id: 'stone-ancestor',
            name: { fr: 'Pierre' },
            effect: { fr: 'Effet' },
          },
        ],
      },
      commonSpellIds: ['thaumaturgie'],
      source: 'aidedd-homebrew',
    });
    expect(draft.id).toBe('peuple-des-brumes');
    expect(draft.nameEn).toBe('Mistfolk');
    expect(draft.size).toBe('small');
    expect(draft.speed).toBe(8);
    expect(draft.asis).toEqual([{ ability: 'sag', bonus: 1 }]);
    expect(draft.languages).toEqual(['Commun', 'Sylvain']);
    expect(draft.commonSpellIds).toEqual(['thaumaturgie']);
    expect(draft.dragonAncestries[0]?.id).toBe('frost-ancestor');
    expect(draft.giantAncestries[0]?.id).toBe('stone-ancestor');
  });

  it('damageType inconnu → fallback fire', () => {
    const draft = draftFromAncestry({
      id: 'x',
      name: { fr: 'x' },
      size: 'medium',
      speed: 9,
      description: { fr: 'x' },
      abilityScoreIncrease: [],
      traits: [],
      languages: [],
      options: {
        dragonAncestries: [
          {
            id: 'weird',
            name: { fr: 'Bizarre' },
            damageType: 'love',
            damageTypeLabel: { fr: 'amour' },
          },
        ],
      },
      source: 'aidedd-homebrew',
    });
    expect(draft.dragonAncestries[0]?.damageType).toBe('fire');
  });

  it('roundtrip draft → Ancestry → draft équivalent (sans champs EN)', () => {
    const initial = {
      ...EMPTY_ANCESTRY_DRAFT,
      id: 'tracer',
      nameFr: 'Tracer',
      descriptionFr: 'D',
      asis: [{ ability: 'dex' as const, bonus: 1 }],
      languages: ['Commun'],
    };
    const ancestry = buildAncestryFromDraft(initial);
    const back = draftFromAncestry(ancestry);
    expect(back).toEqual(initial);
  });
});

describe('validateAncestryDraft', () => {
  it('accepte un draft minimal valide', () => {
    const result = validateAncestryDraft(minimalDraft());
    expect(result.ok).toBe(true);
  });

  it('rejette si id manque', () => {
    const result = validateAncestryDraft({
      ...EMPTY_ANCESTRY_DRAFT,
      nameFr: 'X',
      descriptionFr: 'D',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.id).toBeDefined();
    }
  });

  it('rejette si id ne respecte pas le slug', () => {
    const result = validateAncestryDraft({
      ...minimalDraft(),
      id: 'INVALID slug',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.id).toBeDefined();
    }
  });

  it('rejette si id est réservé (dragonborn, tiefling, elf, gnome, goliath, human)', () => {
    for (const reservedId of [
      'dragonborn',
      'tiefling',
      'elf',
      'gnome',
      'goliath',
      'human',
    ]) {
      const result = validateAncestryDraft({
        ...minimalDraft(),
        id: reservedId,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldErrors.id).toBeDefined();
      }
    }
  });

  it('rejette si descriptionFr manque', () => {
    const result = validateAncestryDraft({
      ...EMPTY_ANCESTRY_DRAFT,
      id: 'x',
      nameFr: 'X',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.descriptionFr).toBeDefined();
    }
  });

  it('rejette si speed <= 0', () => {
    const result = validateAncestryDraft({
      ...minimalDraft(),
      speed: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.speed).toBeDefined();
    }
  });

  it("rejette si une ligne ASI n'a pas d'ability", () => {
    const result = validateAncestryDraft({
      ...minimalDraft(),
      asis: [{ ability: '', bonus: 1 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.asis).toBeDefined();
    }
  });

  it('rejette si deux ASI partagent la même ability', () => {
    const result = validateAncestryDraft({
      ...minimalDraft(),
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

  it('rejette si un trait est incomplet (sans nom FR ou description FR)', () => {
    const result = validateAncestryDraft({
      ...minimalDraft(),
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

  it('rejette si une option draconique est incomplète (id ou nom ou label vide)', () => {
    const result = validateAncestryDraft({
      ...minimalDraft(),
      dragonAncestries: [
        {
          id: '',
          nameFr: 'X',
          nameEn: '',
          damageType: 'fire',
          damageTypeLabelFr: 'feu',
          damageTypeLabelEn: '',
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.dragonAncestries).toBeDefined();
    }
  });

  it('rejette si une option draconique a un id mal formé', () => {
    const result = validateAncestryDraft({
      ...minimalDraft(),
      dragonAncestries: [
        {
          id: 'BAD ID',
          nameFr: 'X',
          nameEn: '',
          damageType: 'fire',
          damageTypeLabelFr: 'feu',
          damageTypeLabelEn: '',
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.dragonAncestries).toBeDefined();
    }
  });

  it('rejette si deux options draconiques ont le même id', () => {
    const result = validateAncestryDraft({
      ...minimalDraft(),
      dragonAncestries: [
        {
          id: 'frost',
          nameFr: 'F',
          nameEn: '',
          damageType: 'cold',
          damageTypeLabelFr: 'froid',
          damageTypeLabelEn: '',
        },
        {
          id: 'frost',
          nameFr: 'F2',
          nameEn: '',
          damageType: 'cold',
          damageTypeLabelFr: 'froid',
          damageTypeLabelEn: '',
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.dragonAncestries).toBeDefined();
    }
  });

  it('rejette si une option géante est incomplète', () => {
    const result = validateAncestryDraft({
      ...minimalDraft(),
      giantAncestries: [
        {
          id: 'stone',
          nameFr: '',
          nameEn: '',
          effectFr: '',
          effectEn: '',
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.giantAncestries).toBeDefined();
    }
  });

  it('rejette si une option géante a un id mal formé', () => {
    const result = validateAncestryDraft({
      ...minimalDraft(),
      giantAncestries: [
        {
          id: 'BAD ID',
          nameFr: 'X',
          nameEn: '',
          effectFr: 'Effet',
          effectEn: '',
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.giantAncestries).toBeDefined();
    }
  });

  it('rejette si deux options géantes ont le même id', () => {
    const result = validateAncestryDraft({
      ...minimalDraft(),
      giantAncestries: [
        {
          id: 'stone',
          nameFr: 'S',
          nameEn: '',
          effectFr: 'E',
          effectEn: '',
        },
        {
          id: 'stone',
          nameFr: 'S2',
          nameEn: '',
          effectFr: 'E2',
          effectEn: '',
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.giantAncestries).toBeDefined();
    }
  });

  it('accepte un draft complet avec ASI + traits + dragon + giant', () => {
    const result = validateAncestryDraft({
      ...minimalDraft(),
      asis: [{ ability: 'for', bonus: 2 }],
      traits: [
        {
          nameFr: 'T1',
          nameEn: '',
          descriptionFr: 'd1',
          descriptionEn: '',
        },
      ],
      languages: ['Commun'],
      dragonAncestries: [
        {
          id: 'frost-ancestor',
          nameFr: 'Givre',
          nameEn: 'Frost',
          damageType: 'cold',
          damageTypeLabelFr: 'froid',
          damageTypeLabelEn: 'cold',
        },
      ],
      giantAncestries: [
        {
          id: 'stone-ancestor',
          nameFr: 'Pierre',
          nameEn: 'Stone',
          effectFr: 'Effet',
          effectEn: 'Effect',
        },
      ],
    });
    expect(result.ok).toBe(true);
  });
});
