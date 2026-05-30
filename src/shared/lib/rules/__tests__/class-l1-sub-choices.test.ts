import { describe, expect, it } from 'vitest';

import type { ClassEntity } from '@/shared/types/content';

import {
  ROGUE_EXPERTISE_COUNT_L1,
  WARLOCK_INVOCATIONS_COUNT_L1,
  WARLOCK_PACT_TOME_CANTRIPS_COUNT,
  WARLOCK_PACT_TOME_RITUALS_COUNT,
  WIZARD_SPELLBOOK_INSCRIBED_COUNT_L1,
  getAddClassL1SubChoiceKeys,
  getClassSubChoiceKeys,
  getMissingAddClassL1SubChoiceKeys,
  getMissingClassSubChoiceKeys,
  getRequiredCount,
  type AddClassL1SubChoicesShape,
  type ClassEntryL1Shape,
  type ClassSubChoiceKey,
} from '../class-l1-sub-choices';

/**
 * JALON 2D.4a — Tests pin du contrat « sous-choix L1 d'une classe ».
 *
 * Couvre les deux périmètres servis par ce module :
 *   1. Le wizard de création (consommateur historique, plan 13.9).
 *   2. Le moteur de level-up multi-class — path « ajouter une classe »
 *      (`addClassSubChoices` du level-up draft, schéma livré 2D.3 — UI 2D.4b).
 *
 * Le test pin l'interprétation SRD 2024 LOCKED par
 * `plans/2D-MULTICLASS-AUDIT.md > Gap 5` : les sous-choix L1 d'une classe
 * ajoutée en multiclass sont IDENTIQUES à ceux d'un personnage primaire L1
 * de cette classe. Toute divergence future devra mettre à jour ce test.
 */

function makeClassFixture(
  id: string,
  overrides: Partial<ClassEntity> = {},
): ClassEntity {
  return {
    id,
    weaponMasteryCount: 0,
    weaponMasteryEligibility: undefined,
    ...overrides,
  } as ClassEntity;
}

const SRD_CLASSES: readonly ClassEntity[] = [
  makeClassFixture('barbarian', { weaponMasteryCount: 2 }),
  makeClassFixture('bard'),
  makeClassFixture('cleric'),
  makeClassFixture('druid'),
  makeClassFixture('fighter', { weaponMasteryCount: 3 }),
  makeClassFixture('monk'),
  makeClassFixture('paladin', { weaponMasteryCount: 2 }),
  makeClassFixture('ranger', { weaponMasteryCount: 2 }),
  makeClassFixture('rogue', { weaponMasteryCount: 2 }),
  makeClassFixture('sorcerer'),
  makeClassFixture('warlock'),
  makeClassFixture('wizard'),
];

function emptyEntry(classId: string): ClassEntryL1Shape {
  return {
    classId,
    clericDivineOrder: null,
    druidPrimalOrder: null,
    fighterFightingStyle: null,
    weaponMasteries: [],
    expertiseSkills: [],
    eldritchInvocations: [],
    wizardSpellbookL1: [],
  };
}

describe('getClassSubChoiceKeys — 12 classes SRD 2024', () => {
  // Pin la table de référence telle qu'attendue par le wizard ET par
  // l'ajout-classe multiclass (interprétation LOCKED audit 2D § Gap 5).
  const EXPECTED: Record<string, readonly ClassSubChoiceKey[]> = {
    barbarian: ['weaponMasteries'],
    bard: [],
    cleric: ['clericDivineOrder'],
    druid: ['druidPrimalOrder'],
    fighter: ['fighterFightingStyle', 'weaponMasteries'],
    monk: [],
    paladin: ['weaponMasteries'],
    ranger: ['weaponMasteries'],
    rogue: ['weaponMasteries', 'expertiseSkills'],
    sorcerer: [],
    warlock: [
      'eldritchInvocations',
      'pactBladeWeapon',
      'pactTomeCantrips',
      'pactTomeRituals',
    ],
    wizard: ['wizardSpellbookL1'],
  };

  for (const [classId, expected] of Object.entries(EXPECTED)) {
    it(`${classId} → ${expected.length === 0 ? 'aucun sous-choix' : expected.join(', ')}`, () => {
      expect(getClassSubChoiceKeys(classId)).toEqual(expected);
    });
  }

  it('classId inconnu → []', () => {
    expect(getClassSubChoiceKeys('unknown-class')).toEqual([]);
  });

  it('classId null → []', () => {
    expect(getClassSubChoiceKeys(null)).toEqual([]);
  });
});

describe('getRequiredCount — counts SRD 2024', () => {
  it('Roublard expertiseSkills = 2', () => {
    expect(getRequiredCount('rogue', 'expertiseSkills', SRD_CLASSES)).toBe(
      ROGUE_EXPERTISE_COUNT_L1,
    );
  });

  it('Warlock eldritchInvocations = 1', () => {
    expect(getRequiredCount('warlock', 'eldritchInvocations', SRD_CLASSES)).toBe(
      WARLOCK_INVOCATIONS_COUNT_L1,
    );
  });

  it('Magicien wizardSpellbookL1 = 6', () => {
    expect(getRequiredCount('wizard', 'wizardSpellbookL1', SRD_CLASSES)).toBe(
      WIZARD_SPELLBOOK_INSCRIBED_COUNT_L1,
    );
  });

  it('Guerrier weaponMasteries = 3 (bundle)', () => {
    expect(getRequiredCount('fighter', 'weaponMasteries', SRD_CLASSES)).toBe(3);
  });

  it('Barbare weaponMasteries = 2 (bundle)', () => {
    expect(getRequiredCount('barbarian', 'weaponMasteries', SRD_CLASSES)).toBe(2);
  });

  it('Warlock pactTomeCantrips = 3', () => {
    expect(getRequiredCount('warlock', 'pactTomeCantrips', SRD_CLASSES)).toBe(
      WARLOCK_PACT_TOME_CANTRIPS_COUNT,
    );
  });

  it('Warlock pactTomeRituals = 2', () => {
    expect(getRequiredCount('warlock', 'pactTomeRituals', SRD_CLASSES)).toBe(
      WARLOCK_PACT_TOME_RITUALS_COUNT,
    );
  });

  it('single-value (Cleric divineOrder) = 1 par convention', () => {
    expect(getRequiredCount('cleric', 'clericDivineOrder', SRD_CLASSES)).toBe(1);
  });
});

describe('getMissingClassSubChoiceKeys — validation entrée complète', () => {
  it('Bard sans sous-choix → aucun manquant', () => {
    expect(getMissingClassSubChoiceKeys(emptyEntry('bard'), SRD_CLASSES)).toEqual([]);
  });

  it('Cleric sans Divine Order → manquant', () => {
    expect(
      getMissingClassSubChoiceKeys(emptyEntry('cleric'), SRD_CLASSES),
    ).toEqual(['clericDivineOrder']);
  });

  it('Cleric avec Divine Order posé → aucun manquant', () => {
    expect(
      getMissingClassSubChoiceKeys(
        { ...emptyEntry('cleric'), clericDivineOrder: 'protector' },
        SRD_CLASSES,
      ),
    ).toEqual([]);
  });

  it('Roublard sans Weapon Mastery ni Expertise → 2 manquants', () => {
    const missing = getMissingClassSubChoiceKeys(emptyEntry('rogue'), SRD_CLASSES);
    expect(missing).toEqual(['weaponMasteries', 'expertiseSkills']);
  });

  it('Roublard avec 1 Expertise sur 2 → expertiseSkills toujours manquant', () => {
    const missing = getMissingClassSubChoiceKeys(
      {
        ...emptyEntry('rogue'),
        weaponMasteries: ['shortsword', 'rapier'],
        expertiseSkills: ['acrobatics'],
      },
      SRD_CLASSES,
    );
    expect(missing).toEqual(['expertiseSkills']);
  });

  it('Warlock sans invocation → manque eldritchInvocations (les Pact dépendants restent satisfaits car le pact n\'est pas pris)', () => {
    const missing = getMissingClassSubChoiceKeys(
      emptyEntry('warlock'),
      SRD_CLASSES,
    );
    expect(missing).toEqual(['eldritchInvocations']);
  });

  it('Warlock avec Pact of the Blade choisi mais sans arme → pactBladeWeapon manquant', () => {
    const missing = getMissingClassSubChoiceKeys(
      {
        ...emptyEntry('warlock'),
        eldritchInvocations: ['pact-of-the-blade'],
        pactBladeWeapon: null,
      },
      SRD_CLASSES,
    );
    expect(missing).toEqual(['pactBladeWeapon']);
  });

  it('Warlock avec Pact of the Tome mais 0 cantrip / 0 rituel → 2 manquants', () => {
    const missing = getMissingClassSubChoiceKeys(
      {
        ...emptyEntry('warlock'),
        eldritchInvocations: ['pact-of-the-tome'],
        pactTomeCantrips: [],
        pactTomeRituals: [],
      },
      SRD_CLASSES,
    );
    expect(missing).toEqual(['pactTomeCantrips', 'pactTomeRituals']);
  });
});

/* ----------------------------------------------------------------------------
 * JALON 2D.4a — Helpers add-class (level-up multiclass).
 * -------------------------------------------------------------------------- */

describe('getAddClassL1SubChoiceKeys — mirror SRD 2024 (audit 2D § Gap 5)', () => {
  // L'interprétation MVP V1 LOCKED : multiclass-add L1 sub-choices ≡ primary L1.
  // Toute divergence future SRD devra modifier ce test (et la fonction).
  const SAMPLES: readonly string[] = [
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
  ];

  for (const classId of SAMPLES) {
    it(`${classId} : add-class L1 ≡ primary L1`, () => {
      expect(getAddClassL1SubChoiceKeys(classId)).toEqual(
        getClassSubChoiceKeys(classId),
      );
    });
  }
});

describe('getMissingAddClassL1SubChoiceKeys — validation bloc partiel', () => {
  it('Fighter sans Fighting Style ni Weapon Masteries → 2 manquants', () => {
    expect(
      getMissingAddClassL1SubChoiceKeys('fighter', undefined, SRD_CLASSES),
    ).toEqual(['fighterFightingStyle', 'weaponMasteries']);
  });

  it('Fighter avec Fighting Style mais sans Weapon Masteries → 1 manquant', () => {
    const partial: AddClassL1SubChoicesShape = {
      fighterFightingStyle: 'defense',
    };
    expect(
      getMissingAddClassL1SubChoiceKeys('fighter', partial, SRD_CLASSES),
    ).toEqual(['weaponMasteries']);
  });

  it('Fighter complet → aucun manquant', () => {
    const complete: AddClassL1SubChoicesShape = {
      fighterFightingStyle: 'defense',
      weaponMasteries: ['shortsword', 'rapier', 'longsword'],
    };
    expect(
      getMissingAddClassL1SubChoiceKeys('fighter', complete, SRD_CLASSES),
    ).toEqual([]);
  });

  it('Wizard sans grimoire → wizardSpellbookL1 manquant', () => {
    expect(
      getMissingAddClassL1SubChoiceKeys('wizard', undefined, SRD_CLASSES),
    ).toEqual(['wizardSpellbookL1']);
  });

  it('Wizard avec 5 sorts sur 6 → wizardSpellbookL1 toujours manquant', () => {
    expect(
      getMissingAddClassL1SubChoiceKeys(
        'wizard',
        { wizardSpellbookL1: ['s1', 's2', 's3', 's4', 's5'] },
        SRD_CLASSES,
      ),
    ).toEqual(['wizardSpellbookL1']);
  });

  it('Wizard avec 6 sorts → aucun manquant', () => {
    expect(
      getMissingAddClassL1SubChoiceKeys(
        'wizard',
        { wizardSpellbookL1: ['s1', 's2', 's3', 's4', 's5', 's6'] },
        SRD_CLASSES,
      ),
    ).toEqual([]);
  });

  it('Bard sans rien → aucun manquant (Bard L1 SRD 2024 n\'impose pas de sous-choix)', () => {
    expect(
      getMissingAddClassL1SubChoiceKeys('bard', undefined, SRD_CLASSES),
    ).toEqual([]);
  });

  it('Warlock avec Pact of the Tome mais 2 cantrips sur 3 → pactTomeCantrips manquant', () => {
    const partial: AddClassL1SubChoicesShape = {
      eldritchInvocations: ['pact-of-the-tome'],
      pactTomeCantrips: ['light', 'mage-hand'],
      pactTomeRituals: ['detect-magic', 'identify'],
    };
    expect(
      getMissingAddClassL1SubChoiceKeys('warlock', partial, SRD_CLASSES),
    ).toEqual(['pactTomeCantrips']);
  });

  it('Warlock complet (Pact of the Blade) → aucun manquant', () => {
    const partial: AddClassL1SubChoicesShape = {
      eldritchInvocations: ['pact-of-the-blade'],
      pactBladeWeapon: 'longsword',
    };
    expect(
      getMissingAddClassL1SubChoiceKeys('warlock', partial, SRD_CLASSES),
    ).toEqual([]);
  });
});
