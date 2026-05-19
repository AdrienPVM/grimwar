import { describe, it, expect, vi } from 'vitest';

import { EMPTY_DRAFT, type WizardDraft } from '@/shared/lib/slices/wizard-slice';
import {
  EMPTY_ANCESTRY_SUB_CHOICES,
  createEmptyClassSubChoices,
} from '@/shared/types/character';
import type {
  Ancestry,
  Background,
  ClassEntity,
  Item,
  Spell,
} from '@/shared/types/content';

import { buildCharacterFromWizard } from '../submit-from-wizard';

/**
 * Tests rouge-puis-vert pour la garde + propagation des sous-choix de classe
 * au submit Firestore (plan 13.9 — gating commit suffix).
 *
 * Deux invariants couverts :
 *   1. `buildCharacterFromWizard` throw si un sous-choix de classe niveau 1
 *      SRD requis n'est pas posé dans le draft (parade contre bypass UI).
 *   2. Les sous-choix posés dans `draft.classes[i]` sont propagés tels quels
 *      dans `character.classes[i]` (pas écrasés par les sentinelles vides
 *      `createEmptyClassSubChoices()`). Pour le Roublard, l'agrégation
 *      `expertiseSkills → character.skills[skillId] = 2` doit se produire.
 *
 * Sans le wiring, le draft passe (le gating UI est absent) MAIS le submit
 * écrasait silencieusement les sous-choix → fiche v2 incomplète en Firestore.
 */

vi.mock('@/shared/lib/inventory', () => ({
  addItemToInventory: vi.fn(
    async (shape: { inventory: { items: unknown[] } }, itemId: string) => {
      shape.inventory.items.push({
        contentId: itemId,
        contentScope: 'public',
        qty: 1,
        equipped: false,
        attuned: false,
        notes: '',
      });
    },
  ),
}));

// Nain plutôt qu'Humain : aucun sous-choix d'ancestry SRD requis (l'Humain
// exigerait `ancestrySize` + `ancestryExtraSkill`, hors-périmètre du test).
const DWARF: Ancestry = {
  id: 'dwarf',
  name: { fr: 'Nain', en: 'Dwarf' },
  size: 'medium',
  speed: 30,
  description: { fr: '', en: '' },
  abilityScoreIncrease: [],
  traits: [],
  languages: ['common'],
  source: 'srd-5.2.1',
  options: {},
};

const ACOLYTE: Background = {
  id: 'acolyte',
  name: { fr: 'Acolyte', en: 'Acolyte' },
  description: { fr: '.', en: '.' },
  skillProficiencies: ['Insight', 'Religion'],
  toolProficiencies: [],
  languages: 0,
  equipment: [],
  startingCoins: null,
  feature: { name: { fr: '.', en: '.' }, description: { fr: '.', en: '.' } },
  source: 'srd-5.2.1',
};

const baseClassMeta = {
  hitDie: 'd8' as const,
  primaryAbility: ['for' as const],
  saveProficiencies: ['for' as const, 'con' as const],
  armorProficiencies: [],
  weaponProficiencies: [],
  toolProficiencies: [],
  skillChoices: { count: 2, from: ['Stealth', 'Sleight of Hand', 'Acrobatics'] },
  spellcasting: null,
  startingEquipment: { options: [{ items: [], coins: null }] },
  description: { fr: '.', en: '.' },
  features: [],
  source: 'srd-5.2.1' as const,
};

const FIGHTER: ClassEntity = {
  ...baseClassMeta,
  id: 'fighter',
  name: { fr: 'Guerrier', en: 'Fighter' },
  hitDie: 'd10',
  weaponMasteryCount: 3,
};
const ROGUE: ClassEntity = {
  ...baseClassMeta,
  id: 'rogue',
  name: { fr: 'Roublard', en: 'Rogue' },
  hitDie: 'd8',
  weaponMasteryCount: 2,
  skillChoices: {
    count: 2,
    from: ['Stealth', 'Sleight of Hand', 'Acrobatics', 'Perception'],
  },
};
const WIZARD: ClassEntity = {
  ...baseClassMeta,
  id: 'wizard',
  name: { fr: 'Magicien', en: 'Wizard' },
  hitDie: 'd6',
  weaponMasteryCount: 0,
  spellcasting: { ability: 'int', progression: 'full' },
};
const WARLOCK: ClassEntity = {
  ...baseClassMeta,
  id: 'warlock',
  name: { fr: 'Occultiste', en: 'Warlock' },
  hitDie: 'd8',
  weaponMasteryCount: 0,
  spellcasting: { ability: 'cha', progression: 'half' },
};
const CLERIC: ClassEntity = {
  ...baseClassMeta,
  id: 'cleric',
  name: { fr: 'Clerc', en: 'Cleric' },
  weaponMasteryCount: 0,
};

const ALL_CLASSES: ClassEntity[] = [FIGHTER, ROGUE, WIZARD, WARLOCK, CLERIC];
const EMPTY_SPELLS: Spell[] = [];
const EMPTY_ITEMS: Item[] = [];

function draftFor(
  classId: string,
  patch: Partial<ReturnType<typeof createEmptyClassSubChoices>> = {},
  override: Partial<WizardDraft> = {},
): WizardDraft {
  return {
    ...EMPTY_DRAFT,
    name: 'Test',
    level: 1,
    alignment: 'NB',
    classes: [
      {
        classId,
        level: 1,
        ...createEmptyClassSubChoices(),
        ...patch,
      },
    ],
    primaryClassId: classId,
    ancestryId: 'dwarf',
    ancestrySubChoices: { ...EMPTY_ANCESTRY_SUB_CHOICES },
    backgroundId: 'acolyte',
    pickedSkills: [],
    equipmentChoices: [{ classId, optionIndex: 0 }],
    ...override,
  };
}

const buildArgs = (draft: WizardDraft) => ({
  uid: 'uid-test',
  draft,
  classes: ALL_CLASSES,
  ancestry: DWARF,
  background: ACOLYTE,
  items: EMPTY_ITEMS,
  spells: EMPTY_SPELLS,
});

describe('buildCharacterFromWizard — garde sous-choix de classe niveau 1 SRD', () => {
  it('Guerrier sans Fighting Style → throw [wizard] sous-choix de classe manquant', async () => {
    await expect(buildCharacterFromWizard(buildArgs(draftFor('fighter')))).rejects.toThrow(
      /sous-choix de classe manquant/,
    );
  });

  it('Guerrier avec Fighting Style mais pas de Weapon Masteries → throw', async () => {
    await expect(
      buildCharacterFromWizard(
        buildArgs(draftFor('fighter', { fighterFightingStyle: 'defense' })),
      ),
    ).rejects.toThrow(/sous-choix de classe manquant/);
  });

  it('Roublard sans Expertise → throw (Expertise reste un sous-choix de classe)', async () => {
    await expect(
      buildCharacterFromWizard(
        buildArgs(
          draftFor(
            'rogue',
            { weaponMasteries: ['dagger', 'rapier'] },
            { pickedSkills: ['stealth', 'sleight-of-hand'] },
          ),
        ),
      ),
    ).rejects.toThrow(/sous-choix de classe manquant/);
  });

  it('Magicien avec 0 sort inscrit → throw', async () => {
    await expect(
      buildCharacterFromWizard(
        buildArgs(draftFor('wizard', {}, { pickedSkills: ['arcana', 'history'] })),
      ),
    ).rejects.toThrow(/sous-choix de classe manquant/);
  });

  it('Magicien avec 5 sorts inscrits (manque 1) → throw', async () => {
    await expect(
      buildCharacterFromWizard(
        buildArgs(
          draftFor(
            'wizard',
            {
              wizardSpellbookL1: ['burning-hands', 'mage-armor', 'magic-missile', 'shield', 'sleep'],
            },
            { pickedSkills: ['arcana', 'history'] },
          ),
        ),
      ),
    ).rejects.toThrow(/sous-choix de classe manquant/);
  });

  it('Occultiste sans invocation → throw', async () => {
    await expect(
      buildCharacterFromWizard(
        buildArgs(draftFor('warlock', {}, { pickedSkills: ['arcana', 'deception'] })),
      ),
    ).rejects.toThrow(/sous-choix de classe manquant/);
  });

  it('Clerc sans Divine Order → throw', async () => {
    await expect(
      buildCharacterFromWizard(
        buildArgs(draftFor('cleric', {}, { pickedSkills: ['insight', 'religion'] })),
      ),
    ).rejects.toThrow(/sous-choix de classe manquant/);
  });
});

describe('buildCharacterFromWizard — propagation draft → character.classes[i]', () => {
  it('Guerrier complet : fighterFightingStyle + weaponMasteries propagés', async () => {
    const character = await buildCharacterFromWizard(
      buildArgs(
        draftFor(
          'fighter',
          {
            fighterFightingStyle: 'defense',
            weaponMasteries: ['longsword', 'greatsword', 'battleaxe'],
          },
          { pickedSkills: ['athletics', 'intimidation'] },
        ),
      ),
    );
    const cls = character.classes[0];
    expect(cls).toBeDefined();
    expect(cls?.fighterFightingStyle).toBe('defense');
    expect(cls?.weaponMasteries).toEqual(['longsword', 'greatsword', 'battleaxe']);
  });

  it('Roublard complet : weaponMasteries + expertiseSkills propagés ; skills[skill] = 2', async () => {
    const character = await buildCharacterFromWizard(
      buildArgs(
        draftFor(
          'rogue',
          {
            weaponMasteries: ['dagger', 'rapier'],
            expertiseSkills: ['stealth', 'sleight-of-hand'],
          },
          { pickedSkills: ['stealth', 'sleight-of-hand'] },
        ),
      ),
    );
    const cls = character.classes[0];
    expect(cls?.expertiseSkills).toEqual(['stealth', 'sleight-of-hand']);
    expect(cls?.weaponMasteries).toEqual(['dagger', 'rapier']);
    // L'agrégateur écrit 2 (expertise) sur skill aussi présente dans pickedSkills (= 1).
    expect(character.skills.stealth).toBe(2);
    expect(character.skills['sleight-of-hand']).toBe(2);
  });

  it('Magicien complet : wizardSpellbookL1 (6 sorts) propagé dans classes[0]', async () => {
    const inscribed = [
      'burning-hands',
      'mage-armor',
      'magic-missile',
      'shield',
      'sleep',
      'detect-magic',
    ];
    const character = await buildCharacterFromWizard(
      buildArgs(
        draftFor(
          'wizard',
          { wizardSpellbookL1: inscribed },
          { pickedSkills: ['arcana', 'history'] },
        ),
      ),
    );
    const cls = character.classes[0];
    expect(cls?.wizardSpellbookL1).toEqual(inscribed);
    expect(cls?.wizardSpellbookL1.length).toBe(6);
  });

  it('Occultiste complet : eldritchInvocations propagé', async () => {
    const character = await buildCharacterFromWizard(
      buildArgs(
        draftFor(
          'warlock',
          { eldritchInvocations: ['armor-of-shadows'] },
          { pickedSkills: ['arcana', 'deception'] },
        ),
      ),
    );
    expect(character.classes[0]?.eldritchInvocations).toEqual(['armor-of-shadows']);
  });

  it('Clerc complet : clericDivineOrder propagé', async () => {
    const character = await buildCharacterFromWizard(
      buildArgs(
        draftFor(
          'cleric',
          { clericDivineOrder: 'protector' },
          { pickedSkills: ['insight', 'religion'] },
        ),
      ),
    );
    expect(character.classes[0]?.clericDivineOrder).toBe('protector');
  });
});

describe('buildCharacterFromWizard — knownSpells.wizard reflète le grimoire inscrit', () => {
  /**
   * Bug audité plan 13.9 commit 4 prep (2026-05-19) :
   *   `submit-from-wizard.ts:274` mettait `knownSpells.wizard =
   *   [...cantrips, ...picks.level1]` (= cantrips + 4 préparés). Les 2 sorts
   *   inscrits-non-préparés du grimoire étaient absents de `knownSpells`
   *   ET de `preparedSpells` → invisibles dans le SpellList côté Sheet, qui
   *   filtre sur `knownSet = knownSpells[classId] ∪ preparedSpells[classId]`.
   *
   * Conséquence directe pour commit 4b : la section « Grimoire » prévue
   * (sorts inscrits mais non préparés) n'avait rien à afficher car les 2
   * sorts orphelins n'arrivaient pas en Firestore.
   *
   * Fix : pour le Magicien, unionner `knownSpells.wizard` avec
   * `classes[i].wizardSpellbookL1` (les 6 inscrits). `preparedSpells.wizard`
   * reste les 4 préparés.
   */
  it('Magicien L1 : knownSpells.wizard contient les 6 inscrits + les cantrips, preparedSpells les 4 préparés', async () => {
    const cantrips = ['light', 'mage-hand'];
    const inscribed = [
      'burning-hands',
      'mage-armor',
      'magic-missile',
      'shield',
      'sleep',
      'detect-magic',
    ];
    const prepared = ['shield', 'sleep', 'magic-missile', 'detect-magic'];

    const character = await buildCharacterFromWizard(
      buildArgs(
        draftFor(
          'wizard',
          { wizardSpellbookL1: inscribed },
          {
            pickedSkills: ['arcana', 'history'],
            spellsByClass: [{ classId: 'wizard', cantrips, level1: prepared }],
          },
        ),
      ),
    );

    expect(character.knownSpells.wizard).toBeDefined();
    expect(character.preparedSpells.wizard).toBeDefined();

    // Les 4 préparés sont dans preparedSpells (jouables aujourd'hui).
    expect(character.preparedSpells.wizard).toEqual(prepared);

    // knownSpells.wizard doit contenir les cantrips + les 6 inscrits — pas
    // seulement les 4 préparés. Les 2 sorts inscrits-non-préparés
    // (`burning-hands`, `mage-armor`) DOIVENT être présents.
    const known = new Set(character.knownSpells.wizard);
    for (const c of cantrips) expect(known.has(c)).toBe(true);
    for (const i of inscribed) expect(known.has(i)).toBe(true);
    // Les 2 orphelins explicitement présents.
    expect(known.has('burning-hands')).toBe(true);
    expect(known.has('mage-armor')).toBe(true);
  });
});
