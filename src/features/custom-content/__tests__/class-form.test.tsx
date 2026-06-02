import { describe, expect, it } from 'vitest';

import {
  EMPTY_CLASS_DRAFT,
  buildClassFromDraft,
  draftFromClass,
  validateClassDraft,
  type ClassFormDraft,
} from '../forms/class-form';

/**
 * Tests pure-fonction du formulaire class (JALON 3C.9). Le rendu React
 * (chips toggle aptitudes, fieldsets) est couvert par l'intégration
 * PackEditor + l'e2e. Ici on verrouille :
 *   - buildClassFromDraft : trim, défaults sains, coins optionnels, prereq nullable
 *   - draftFromClass : roundtrip
 *   - validateClassDraft : id réservé, primary/saves requis, skill choice from
 *     trop court, feature incomplète, multiclass prereq doublon / hors plage.
 */

function minimalDraft(): ClassFormDraft {
  return {
    ...EMPTY_CLASS_DRAFT,
    id: 'cendre-pacte',
    nameFr: 'Cendre-pacte',
    descriptionFr: 'Classe test.',
    primaryAbility: ['cha'],
    saveProficiencies: ['cha', 'sag'],
    skillChoiceCount: 0,
    skillChoiceFrom: [],
  };
}

describe('buildClassFromDraft', () => {
  it('produit une Class minimale + source aidedd-homebrew + 1 option starting equipment vide', () => {
    const cls = buildClassFromDraft(minimalDraft());
    expect(cls.id).toBe('cendre-pacte');
    expect(cls.source).toBe('aidedd-homebrew');
    expect(cls.hitDie).toBe('d8');
    expect(cls.primaryAbility).toEqual(['cha']);
    expect(cls.saveProficiencies).toEqual(['cha', 'sag']);
    expect(cls.spellcasting).toBeNull();
    expect(cls.startingEquipment.options).toEqual([
      { items: [], coins: null },
    ]);
    expect(cls.features).toEqual([]);
    expect(cls.weaponMasteryCount).toBe(0);
    expect(cls.weaponMasteryEligibility).toBeUndefined();
    expect(cls.multiclassPrerequisite).toBeNull();
    expect(cls.multiclassProficiencies).toEqual({
      armor: [],
      weapons: [],
      tools: [],
    });
  });

  it('trim id/name/description et propage le hitDie choisi', () => {
    const cls = buildClassFromDraft({
      ...minimalDraft(),
      id: '  cendre-pacte  ',
      nameFr: '  Cendre-pacte  ',
      descriptionFr: '  Classe test.  ',
      hitDie: 'd10',
    });
    expect(cls.id).toBe('cendre-pacte');
    expect(cls.name.fr).toBe('Cendre-pacte');
    expect(cls.description.fr).toBe('Classe test.');
    expect(cls.hitDie).toBe('d10');
  });

  it('ajoute le spellcasting quand le toggle est ON', () => {
    const cls = buildClassFromDraft({
      ...minimalDraft(),
      spellcastingEnabled: true,
      spellcastingAbility: 'cha',
      spellcastingProgression: 'pact',
    });
    expect(cls.spellcasting).toEqual({
      ability: 'cha',
      progression: 'pact',
    });
  });

  it('inclut coins uniquement quand le toggle est ON', () => {
    const without = buildClassFromDraft(minimalDraft());
    expect(without.startingEquipment.options[0]?.coins).toBeNull();
    const withCoins = buildClassFromDraft({
      ...minimalDraft(),
      startingEquipmentCoinsIncluded: true,
      startingEquipmentCoinsQty: 50,
      startingEquipmentCoinsUnit: 'gp',
    });
    expect(withCoins.startingEquipment.options[0]?.coins).toEqual({
      qty: 50,
      unit: 'gp',
    });
  });

  it('filtre les starting items vides puis trim les ids', () => {
    const cls = buildClassFromDraft({
      ...minimalDraft(),
      startingEquipmentItems: [
        { itemId: '  sword-longsword  ', qty: 1 },
        { itemId: '', qty: 1 },
        { itemId: 'kit-explorer', qty: 2 },
      ],
    });
    expect(cls.startingEquipment.options[0]?.items).toEqual([
      { itemId: 'sword-longsword', qty: 1 },
      { itemId: 'kit-explorer', qty: 2 },
    ]);
  });

  it('mappe les features avec niveau + i18n FR + EN optionnel', () => {
    const cls = buildClassFromDraft({
      ...minimalDraft(),
      features: [
        {
          level: 1,
          nameFr: 'Sens du givre',
          nameEn: 'Frost sense',
          descriptionFr: 'Détecte la chaleur.',
          descriptionEn: 'Senses heat.',
        },
        {
          level: 3,
          nameFr: 'Souffle gelé',
          nameEn: '',
          descriptionFr: 'Lance un souffle.',
          descriptionEn: '',
        },
      ],
    });
    expect(cls.features).toEqual([
      {
        level: 1,
        name: { fr: 'Sens du givre', en: 'Frost sense' },
        description: { fr: 'Détecte la chaleur.', en: 'Senses heat.' },
      },
      {
        level: 3,
        name: { fr: 'Souffle gelé' },
        description: { fr: 'Lance un souffle.' },
      },
    ]);
  });

  it('construit le multiclassPrerequisite quand le toggle est ON et filtre les minima sans ability', () => {
    const cls = buildClassFromDraft({
      ...minimalDraft(),
      multiclassPrerequisiteEnabled: true,
      multiclassCombinator: 'or',
      multiclassMinima: [
        { ability: 'for', minimum: 13 },
        { ability: '', minimum: 1 },
        { ability: 'dex', minimum: 13 },
      ],
    });
    expect(cls.multiclassPrerequisite).toEqual({
      combinator: 'or',
      scores: [
        { ability: 'for', minimum: 13 },
        { ability: 'dex', minimum: 13 },
      ],
    });
  });

  it('propage les multiclassProficiencies (armures/armes/outils)', () => {
    const cls = buildClassFromDraft({
      ...minimalDraft(),
      multiclassArmor: ['armures légères', 'boucliers'],
      multiclassWeapons: ['armes courantes'],
      multiclassTools: [],
    });
    expect(cls.multiclassProficiencies).toEqual({
      armor: ['armures légères', 'boucliers'],
      weapons: ['armes courantes'],
      tools: [],
    });
  });
});

describe('draftFromClass', () => {
  it('reconstruit un draft depuis une Class complète', () => {
    const built = buildClassFromDraft({
      ...minimalDraft(),
      spellcastingEnabled: true,
      spellcastingAbility: 'cha',
      spellcastingProgression: 'pact',
      armorProficiencies: ['armures légères'],
      weaponProficiencies: ['armes courantes'],
      toolProficiencies: ['outils de voleur'],
      skillChoiceCount: 2,
      skillChoiceFrom: ['athlétisme', 'perception'],
      startingEquipmentItems: [{ itemId: 'sword-longsword', qty: 1 }],
      startingEquipmentCoinsIncluded: true,
      startingEquipmentCoinsQty: 20,
      startingEquipmentCoinsUnit: 'gp',
      features: [
        {
          level: 1,
          nameFr: 'Apt',
          nameEn: 'Apt',
          descriptionFr: 'D',
          descriptionEn: 'D',
        },
      ],
      multiclassPrerequisiteEnabled: true,
      multiclassCombinator: 'and',
      multiclassMinima: [{ ability: 'cha', minimum: 13 }],
      multiclassArmor: ['armures légères'],
    });
    const roundTrip = draftFromClass(built);
    expect(roundTrip.id).toBe('cendre-pacte');
    expect(roundTrip.spellcastingEnabled).toBe(true);
    expect(roundTrip.spellcastingAbility).toBe('cha');
    expect(roundTrip.startingEquipmentCoinsIncluded).toBe(true);
    expect(roundTrip.startingEquipmentCoinsQty).toBe(20);
    expect(roundTrip.startingEquipmentItems).toEqual([
      { itemId: 'sword-longsword', qty: 1 },
    ]);
    expect(roundTrip.features).toHaveLength(1);
    expect(roundTrip.multiclassPrerequisiteEnabled).toBe(true);
    expect(roundTrip.multiclassMinima).toEqual([
      { ability: 'cha', minimum: 13 },
    ]);
    expect(roundTrip.multiclassArmor).toEqual(['armures légères']);
  });
});

describe('validateClassDraft', () => {
  it('rejette un id vide', () => {
    const result = validateClassDraft({ ...minimalDraft(), id: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.id).toBeDefined();
  });

  it('rejette un id avec majuscule', () => {
    const result = validateClassDraft({
      ...minimalDraft(),
      id: 'Cendre-Pacte',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.id).toBeDefined();
  });

  it('rejette les 12 ids SRD réservés', () => {
    for (const reserved of [
      'barbarian',
      'bard',
      'cleric',
      'druid',
      'fighter',
      'monk',
      'paladin',
      'ranger',
      'rogue',
      'sorcerer',
      'warlock',
      'wizard',
    ]) {
      const result = validateClassDraft({ ...minimalDraft(), id: reserved });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.fieldErrors.id).toBeDefined();
    }
  });

  it('rejette nameFr/descriptionFr vide', () => {
    const r1 = validateClassDraft({ ...minimalDraft(), nameFr: '' });
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.fieldErrors.nameFr).toBeDefined();
    const r2 = validateClassDraft({ ...minimalDraft(), descriptionFr: '' });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.fieldErrors.descriptionFr).toBeDefined();
  });

  it('rejette primary/saves vide', () => {
    const r1 = validateClassDraft({ ...minimalDraft(), primaryAbility: [] });
    expect(r1.ok).toBe(false);
    if (!r1.ok)
      expect(r1.fieldErrors.primaryAbility).toBeDefined();
    const r2 = validateClassDraft({
      ...minimalDraft(),
      saveProficiencies: [],
    });
    expect(r2.ok).toBe(false);
    if (!r2.ok)
      expect(r2.fieldErrors.saveProficiencies).toBeDefined();
  });

  it('rejette skillChoiceFrom plus court que skillChoiceCount', () => {
    const result = validateClassDraft({
      ...minimalDraft(),
      skillChoiceCount: 3,
      skillChoiceFrom: ['athlétisme', 'perception'],
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.fieldErrors.skillChoiceFrom).toBeDefined();
  });

  it('rejette une feature incomplète (description vide)', () => {
    const result = validateClassDraft({
      ...minimalDraft(),
      features: [
        {
          level: 1,
          nameFr: 'F',
          nameEn: '',
          descriptionFr: '',
          descriptionEn: '',
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.features).toBeDefined();
  });

  it('rejette une feature avec niveau hors plage 1-20', () => {
    const result = validateClassDraft({
      ...minimalDraft(),
      features: [
        {
          level: 21,
          nameFr: 'F',
          nameEn: '',
          descriptionFr: 'D',
          descriptionEn: '',
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.features).toBeDefined();
  });

  it('rejette starting item au slug invalide', () => {
    const result = validateClassDraft({
      ...minimalDraft(),
      startingEquipmentItems: [{ itemId: 'Sword Longsword', qty: 1 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.fieldErrors.startingEquipmentItems).toBeDefined();
  });

  it('rejette starting item avec qty 0', () => {
    const result = validateClassDraft({
      ...minimalDraft(),
      startingEquipmentItems: [{ itemId: 'sword-longsword', qty: 0 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.fieldErrors.startingEquipmentItems).toBeDefined();
  });

  it('rejette multiclass minima sans ability quand toggle ON', () => {
    const result = validateClassDraft({
      ...minimalDraft(),
      multiclassPrerequisiteEnabled: true,
      multiclassMinima: [{ ability: '', minimum: 13 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.fieldErrors.multiclassMinima).toBeDefined();
  });

  it('rejette multiclass minima doublon d’ability', () => {
    const result = validateClassDraft({
      ...minimalDraft(),
      multiclassPrerequisiteEnabled: true,
      multiclassMinima: [
        { ability: 'for', minimum: 13 },
        { ability: 'for', minimum: 15 },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.fieldErrors.multiclassMinima).toBeDefined();
  });

  it('rejette multiclass minimum hors plage 1-20', () => {
    const result = validateClassDraft({
      ...minimalDraft(),
      multiclassPrerequisiteEnabled: true,
      multiclassMinima: [{ ability: 'for', minimum: 21 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.fieldErrors.multiclassMinima).toBeDefined();
  });

  it('rejette multiclass prereq sans minimum quand toggle ON', () => {
    const result = validateClassDraft({
      ...minimalDraft(),
      multiclassPrerequisiteEnabled: true,
      multiclassMinima: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.fieldErrors.multiclassMinima).toBeDefined();
  });

  it('accepte un draft minimal valide', () => {
    const result = validateClassDraft(minimalDraft());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cls.id).toBe('cendre-pacte');
      expect(result.cls.source).toBe('aidedd-homebrew');
    }
  });

  it('accepte un draft complet (sorts, équipement, features, multi-classe)', () => {
    const result = validateClassDraft({
      ...minimalDraft(),
      spellcastingEnabled: true,
      spellcastingAbility: 'cha',
      spellcastingProgression: 'pact',
      armorProficiencies: ['armures légères'],
      weaponProficiencies: ['armes courantes', 'armes de guerre'],
      toolProficiencies: ['outils de voleur'],
      skillChoiceCount: 2,
      skillChoiceFrom: ['athlétisme', 'perception', 'intimidation'],
      startingEquipmentItems: [{ itemId: 'sword-longsword', qty: 1 }],
      startingEquipmentCoinsIncluded: true,
      startingEquipmentCoinsQty: 10,
      startingEquipmentCoinsUnit: 'gp',
      features: [
        {
          level: 1,
          nameFr: 'Apt L1',
          nameEn: 'L1 feat',
          descriptionFr: 'Description.',
          descriptionEn: 'Description.',
        },
      ],
      multiclassPrerequisiteEnabled: true,
      multiclassCombinator: 'and',
      multiclassMinima: [{ ability: 'cha', minimum: 13 }],
      multiclassArmor: ['armures légères'],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cls.spellcasting).toEqual({
        ability: 'cha',
        progression: 'pact',
      });
      expect(result.cls.multiclassPrerequisite).toEqual({
        combinator: 'and',
        scores: [{ ability: 'cha', minimum: 13 }],
      });
    }
  });
});
