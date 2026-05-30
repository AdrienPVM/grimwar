import { describe, it, expect } from 'vitest';

import { EMPTY_DRAFT, type WizardDraft } from '@/shared/lib/slices/wizard-slice';
import { EMPTY_ANCESTRY_SUB_CHOICES, createEmptyClassSubChoices } from '@/shared/types/character';
import type { ClassEntity } from '@/shared/types/content';

import { isClassValid } from '../wizard-validation';
import { areAllClassStepSubChoicesCompleted } from '@/shared/lib/rules/class-l1-sub-choices';

/**
 * Tests rouge-puis-vert pour la garde « sous-choix de classe niveau 1 requis »
 * (plan 13.9 — gating commit suffix).
 *
 * Avant le wiring de `isClassValid`, la fonction ne validait que la présence
 * d'une classId + somme des niveaux + classe primaire choisie. Conséquence :
 * un Guerrier sans Fighting Style, un Clerc sans Ordre divin, un Magicien
 * sans grimoire passaient la step Classe et atterrissaient incomplets en
 * fiche Firestore. Ces tests bloquent la régression.
 *
 * Périmètre : `isClassValid` valide les sous-choix portés à la Class-step.
 * Expertise du Roublard est rendue à la Skills-step (Option B, UAT 2026-05-18)
 * et reste validée par `isSkillsValid` — donc exclue de cette garde-ci.
 */

function buildWizardClassEntry(
  classId: string,
  patch: Partial<ReturnType<typeof createEmptyClassSubChoices>> = {},
): WizardDraft['classes'][number] {
  return {
    classId,
    level: 1,
    ...createEmptyClassSubChoices(),
    ...patch,
  };
}

function draftWithClass(
  classId: string,
  patch: Partial<ReturnType<typeof createEmptyClassSubChoices>> = {},
): WizardDraft {
  return {
    ...EMPTY_DRAFT,
    classes: [buildWizardClassEntry(classId, patch)],
    primaryClassId: classId,
    ancestrySubChoices: { ...EMPTY_ANCESTRY_SUB_CHOICES },
  };
}

const FIGHTER_BUNDLE: ClassEntity = {
  id: 'fighter',
  name: { fr: 'Guerrier', en: 'Fighter' },
  hitDie: 'd10',
  primaryAbility: ['for'],
  saveProficiencies: ['for', 'con'],
  armorProficiencies: [],
  weaponProficiencies: [],
  toolProficiencies: [],
  skillChoices: { count: 2, from: [] },
  spellcasting: null,
  startingEquipment: { options: [] },
  description: { fr: '.', en: '.' },
  features: [],
  weaponMasteryCount: 3,
  source: 'srd-5.2.1',
};

const BARBARIAN_BUNDLE: ClassEntity = {
  ...FIGHTER_BUNDLE,
  id: 'barbarian',
  name: { fr: 'Barbare', en: 'Barbarian' },
  weaponMasteryCount: 2,
};
const PALADIN_BUNDLE: ClassEntity = {
  ...FIGHTER_BUNDLE,
  id: 'paladin',
  name: { fr: 'Paladin', en: 'Paladin' },
  weaponMasteryCount: 2,
};
const RANGER_BUNDLE: ClassEntity = {
  ...FIGHTER_BUNDLE,
  id: 'ranger',
  name: { fr: 'Rôdeur', en: 'Ranger' },
  weaponMasteryCount: 2,
};
const ROGUE_BUNDLE: ClassEntity = {
  ...FIGHTER_BUNDLE,
  id: 'rogue',
  name: { fr: 'Roublard', en: 'Rogue' },
  weaponMasteryCount: 2,
};

const CLERIC_BUNDLE: ClassEntity = {
  ...FIGHTER_BUNDLE,
  id: 'cleric',
  name: { fr: 'Clerc', en: 'Cleric' },
  weaponMasteryCount: 0,
};
const DRUID_BUNDLE: ClassEntity = {
  ...FIGHTER_BUNDLE,
  id: 'druid',
  name: { fr: 'Druide', en: 'Druid' },
  weaponMasteryCount: 0,
};
const WARLOCK_BUNDLE: ClassEntity = {
  ...FIGHTER_BUNDLE,
  id: 'warlock',
  name: { fr: 'Occultiste', en: 'Warlock' },
  weaponMasteryCount: 0,
};
const WIZARD_BUNDLE: ClassEntity = {
  ...FIGHTER_BUNDLE,
  id: 'wizard',
  name: { fr: 'Magicien', en: 'Wizard' },
  weaponMasteryCount: 0,
};

const BARD_BUNDLE: ClassEntity = {
  ...FIGHTER_BUNDLE,
  id: 'bard',
  name: { fr: 'Barde', en: 'Bard' },
  weaponMasteryCount: 0,
};
const SORCERER_BUNDLE: ClassEntity = {
  ...FIGHTER_BUNDLE,
  id: 'sorcerer',
  name: { fr: 'Ensorceleur', en: 'Sorcerer' },
  weaponMasteryCount: 0,
};
const MONK_BUNDLE: ClassEntity = {
  ...FIGHTER_BUNDLE,
  id: 'monk',
  name: { fr: 'Moine', en: 'Monk' },
  weaponMasteryCount: 0,
};

const ALL_BUNDLES: ClassEntity[] = [
  FIGHTER_BUNDLE,
  BARBARIAN_BUNDLE,
  PALADIN_BUNDLE,
  RANGER_BUNDLE,
  ROGUE_BUNDLE,
  CLERIC_BUNDLE,
  DRUID_BUNDLE,
  WARLOCK_BUNDLE,
  WIZARD_BUNDLE,
  BARD_BUNDLE,
  SORCERER_BUNDLE,
  MONK_BUNDLE,
];

describe('isClassValid — gating des sous-choix de classe niveau 1 SRD', () => {
  it('Guerrier sans Fighting Style ni Weapon Masteries → INVALIDE', () => {
    const draft = draftWithClass('fighter');
    expect(isClassValid({ draft, classes: ALL_BUNDLES })).toBe(false);
  });

  it('Guerrier avec Fighting Style mais 0 Weapon Mastery → INVALIDE', () => {
    const draft = draftWithClass('fighter', { fighterFightingStyle: 'defense' });
    expect(isClassValid({ draft, classes: ALL_BUNDLES })).toBe(false);
  });

  it('Guerrier avec Fighting Style + 3 Weapon Masteries → valide', () => {
    const draft = draftWithClass('fighter', {
      fighterFightingStyle: 'defense',
      weaponMasteries: ['longsword', 'greatsword', 'battleaxe'],
    });
    expect(isClassValid({ draft, classes: ALL_BUNDLES })).toBe(true);
  });

  it('Guerrier avec Fighting Style + seulement 2 Weapon Masteries → INVALIDE', () => {
    const draft = draftWithClass('fighter', {
      fighterFightingStyle: 'defense',
      weaponMasteries: ['longsword', 'greatsword'],
    });
    expect(isClassValid({ draft, classes: ALL_BUNDLES })).toBe(false);
  });

  it('Clerc sans Divine Order → INVALIDE', () => {
    const draft = draftWithClass('cleric');
    expect(isClassValid({ draft, classes: ALL_BUNDLES })).toBe(false);
  });

  it('Clerc avec Divine Order = protector → valide', () => {
    const draft = draftWithClass('cleric', { clericDivineOrder: 'protector' });
    expect(isClassValid({ draft, classes: ALL_BUNDLES })).toBe(true);
  });

  it('Druide sans Primal Order → INVALIDE', () => {
    const draft = draftWithClass('druid');
    expect(isClassValid({ draft, classes: ALL_BUNDLES })).toBe(false);
  });

  it('Druide avec Primal Order = magician → valide', () => {
    const draft = draftWithClass('druid', { druidPrimalOrder: 'magician' });
    expect(isClassValid({ draft, classes: ALL_BUNDLES })).toBe(true);
  });

  it('Magicien sans grimoire L1 → INVALIDE', () => {
    const draft = draftWithClass('wizard');
    expect(isClassValid({ draft, classes: ALL_BUNDLES })).toBe(false);
  });

  it('Magicien avec 5 sorts inscrits (manque 1) → INVALIDE', () => {
    const draft = draftWithClass('wizard', {
      wizardSpellbookL1: ['burning-hands', 'mage-armor', 'magic-missile', 'shield', 'sleep'],
    });
    expect(isClassValid({ draft, classes: ALL_BUNDLES })).toBe(false);
  });

  it('Magicien avec 6 sorts inscrits → valide', () => {
    const draft = draftWithClass('wizard', {
      wizardSpellbookL1: [
        'burning-hands',
        'mage-armor',
        'magic-missile',
        'shield',
        'sleep',
        'detect-magic',
      ],
    });
    expect(isClassValid({ draft, classes: ALL_BUNDLES })).toBe(true);
  });

  it('Magicien avec 7 sorts inscrits (trop) → INVALIDE', () => {
    const draft = draftWithClass('wizard', {
      wizardSpellbookL1: [
        'burning-hands',
        'mage-armor',
        'magic-missile',
        'shield',
        'sleep',
        'detect-magic',
        'identify',
      ],
    });
    expect(isClassValid({ draft, classes: ALL_BUNDLES })).toBe(false);
  });

  it('Occultiste sans invocation → INVALIDE', () => {
    const draft = draftWithClass('warlock');
    expect(isClassValid({ draft, classes: ALL_BUNDLES })).toBe(false);
  });

  it('Occultiste avec 1 invocation → valide', () => {
    const draft = draftWithClass('warlock', {
      eldritchInvocations: ['armor-of-shadows'],
    });
    expect(isClassValid({ draft, classes: ALL_BUNDLES })).toBe(true);
  });

  it('Barbare sans Weapon Masteries → INVALIDE', () => {
    const draft = draftWithClass('barbarian');
    expect(isClassValid({ draft, classes: ALL_BUNDLES })).toBe(false);
  });

  it('Barbare avec 2 Weapon Masteries → valide', () => {
    const draft = draftWithClass('barbarian', {
      weaponMasteries: ['greataxe', 'handaxe'],
    });
    expect(isClassValid({ draft, classes: ALL_BUNDLES })).toBe(true);
  });

  it('Paladin avec 2 Weapon Masteries → valide ; sans → INVALIDE', () => {
    const empty = draftWithClass('paladin');
    expect(isClassValid({ draft: empty, classes: ALL_BUNDLES })).toBe(false);
    const full = draftWithClass('paladin', { weaponMasteries: ['longsword', 'shortsword'] });
    expect(isClassValid({ draft: full, classes: ALL_BUNDLES })).toBe(true);
  });

  it('Rôdeur avec 2 Weapon Masteries → valide ; sans → INVALIDE', () => {
    const empty = draftWithClass('ranger');
    expect(isClassValid({ draft: empty, classes: ALL_BUNDLES })).toBe(false);
    const full = draftWithClass('ranger', { weaponMasteries: ['longbow', 'shortbow'] });
    expect(isClassValid({ draft: full, classes: ALL_BUNDLES })).toBe(true);
  });

  it('Roublard avec 2 Weapon Masteries (Expertise vit à Skills) → valide à isClassValid', () => {
    // Expertise est portée à la step Skills (Option B). À la step Classe, on
    // ne valide QUE les sous-choix exposés ici : Weapon Masteries.
    const draft = draftWithClass('rogue', { weaponMasteries: ['dagger', 'rapier'] });
    expect(isClassValid({ draft, classes: ALL_BUNDLES })).toBe(true);
  });

  it('Roublard sans Weapon Masteries → INVALIDE même si Expertise posée', () => {
    const draft = draftWithClass('rogue', { expertiseSkills: ['stealth', 'sleight-of-hand'] });
    expect(isClassValid({ draft, classes: ALL_BUNDLES })).toBe(false);
  });

  it.each(['bard', 'sorcerer', 'monk'])(
    'classe sans sous-choix L1 SRD (%s) → valide sans rien poser',
    (id) => {
      const draft = draftWithClass(id);
      expect(isClassValid({ draft, classes: ALL_BUNDLES })).toBe(true);
    },
  );

  it('aucune classe choisie → INVALIDE', () => {
    const draft: WizardDraft = { ...EMPTY_DRAFT };
    expect(isClassValid({ draft, classes: ALL_BUNDLES })).toBe(false);
  });
});

describe('areAllClassStepSubChoicesCompleted — exclut expertiseSkills (rendue à Skills step)', () => {
  it('Roublard avec Weapon Masteries seulement → completed (Expertise filtrée)', () => {
    const entry = buildWizardClassEntry('rogue', { weaponMasteries: ['dagger', 'rapier'] });
    expect(areAllClassStepSubChoicesCompleted([entry], ALL_BUNDLES)).toBe(true);
  });

  it('Roublard avec Expertise seulement → NON completed (Weapon Mastery manquante)', () => {
    const entry = buildWizardClassEntry('rogue', {
      expertiseSkills: ['stealth', 'sleight-of-hand'],
    });
    expect(areAllClassStepSubChoicesCompleted([entry], ALL_BUNDLES)).toBe(false);
  });

  it('classe sans sous-choix → completed', () => {
    const entry = buildWizardClassEntry('bard');
    expect(areAllClassStepSubChoicesCompleted([entry], ALL_BUNDLES)).toBe(true);
  });
});
