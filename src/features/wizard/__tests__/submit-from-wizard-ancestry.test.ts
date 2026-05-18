import { describe, it, expect, vi } from 'vitest';

import { EMPTY_DRAFT, type WizardDraft } from '@/shared/lib/slices/wizard-slice';
import { EMPTY_ANCESTRY_SUB_CHOICES } from '@/shared/types/character';
import type {
  Ancestry,
  Background,
  ClassEntity,
  Item,
  Spell,
} from '@/shared/types/content';

import { buildAncestrySpellIds, buildCharacterFromWizard } from '../submit-from-wizard';

// `buildCharacterFromWizard` finit par appeler `addItemToInventory` qui résout
// les items via `loadPublicContent`. Pour des tests purs (zéro Dexie / Firestore)
// on stub la résolution : tout itemId fourni en seed est considéré valide et
// poussé à plat dans l'inventaire.
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

/**
 * Tests purs sur buildAncestrySpellIds (plan 13.8 step 25).
 *
 * Le submit-from-wizard.ts complet n'est pas testé unitairement
 * (Firestore + content loading rendraient le test fragile) — les e2e
 * commit 6 exercent ce chemin. Ici on prouve la résolution de la
 * source AncestrySubChoices → liste de spellIds via les options du
 * bundle.
 */

const TIEFLING: Ancestry = {
  id: 'tiefling',
  name: { fr: 'Tieffelin', en: 'Tiefling' },
  size: 'small',
  speed: 30,
  description: { fr: '', en: '' },
  abilityScoreIncrease: [],
  traits: [],
  languages: ['common'],
  source: 'srd-5.2.1',
  options: {
    tieflingLegacies: [
      {
        id: 'abyssal',
        name: { fr: 'Abyssal', en: 'Abyssal' },
        resistance: { fr: 'Poison', en: 'Poison' },
        cantripSpellId: 'poison-spray',
        level3SpellId: 'ray-of-sickness',
        level5SpellId: 'hold-person',
      },
      {
        id: 'infernal',
        name: { fr: 'Infernal', en: 'Infernal' },
        resistance: { fr: 'Feu', en: 'Fire' },
        cantripSpellId: 'fire-bolt',
        level3SpellId: 'hellish-rebuke',
        level5SpellId: 'darkness',
      },
    ],
  },
};

const ELF: Ancestry = {
  id: 'elf',
  name: { fr: 'Elfe', en: 'Elf' },
  size: 'medium',
  speed: 30,
  description: { fr: '', en: '' },
  abilityScoreIncrease: [],
  traits: [],
  languages: ['common'],
  source: 'srd-5.2.1',
  options: {
    elfLineages: [
      {
        id: 'drow',
        name: { fr: 'Drow', en: 'Drow' },
        benefit: { fr: '', en: '' },
        cantripSpellId: 'dancing-lights',
        level3SpellId: 'faerie-fire',
        level5SpellId: 'darkness',
      },
    ],
  },
};

const GNOME: Ancestry = {
  id: 'gnome',
  name: { fr: 'Gnome', en: 'Gnome' },
  size: 'small',
  speed: 30,
  description: { fr: '', en: '' },
  abilityScoreIncrease: [],
  traits: [],
  languages: ['common'],
  source: 'srd-5.2.1',
  options: {
    gnomeLineages: [
      {
        id: 'forest',
        name: { fr: 'Forêts', en: 'Forest' },
        benefit: { fr: '', en: '' },
        cantripSpellIds: ['minor-illusion'],
      },
      {
        id: 'rock',
        name: { fr: 'Roches', en: 'Rock' },
        benefit: { fr: '', en: '' },
        cantripSpellIds: ['mending', 'prestidigitation'],
      },
    ],
  },
};

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

function draftWith(patch: Partial<WizardDraft['ancestrySubChoices']>): WizardDraft {
  return {
    ...EMPTY_DRAFT,
    ancestrySubChoices: { ...EMPTY_ANCESTRY_SUB_CHOICES, ...patch },
  };
}

describe('buildAncestrySpellIds — résolution sous-choix → liste de spellIds', () => {
  it('Tieffelin Infernal → fire-bolt + hellish-rebuke + darkness (cantrip + L3 + L5)', () => {
    const draft = draftWith({ tieflingLegacy: 'infernal' });
    expect(buildAncestrySpellIds(draft, TIEFLING)).toEqual([
      'fire-bolt',
      'hellish-rebuke',
      'darkness',
    ]);
  });

  it('Tieffelin Abyssal → poison-spray + ray-of-sickness + hold-person', () => {
    const draft = draftWith({ tieflingLegacy: 'abyssal' });
    expect(buildAncestrySpellIds(draft, TIEFLING)).toEqual([
      'poison-spray',
      'ray-of-sickness',
      'hold-person',
    ]);
  });

  it('Tieffelin sans tieflingLegacy → [] (sentinelle nullable acceptée)', () => {
    const draft = draftWith({});
    expect(buildAncestrySpellIds(draft, TIEFLING)).toEqual([]);
  });

  it('Elfe Drow → dancing-lights + faerie-fire + darkness', () => {
    const draft = draftWith({ elfLineage: 'drow' });
    expect(buildAncestrySpellIds(draft, ELF)).toEqual([
      'dancing-lights',
      'faerie-fire',
      'darkness',
    ]);
  });

  it('Gnome des roches → mending + prestidigitation (cantrips seulement, pas de L3/L5)', () => {
    const draft = draftWith({ gnomeLineage: 'rock' });
    expect(buildAncestrySpellIds(draft, GNOME)).toEqual(['mending', 'prestidigitation']);
  });

  it('Gnome des forêts → minor-illusion (1 cantrip)', () => {
    const draft = draftWith({ gnomeLineage: 'forest' });
    expect(buildAncestrySpellIds(draft, GNOME)).toEqual(['minor-illusion']);
  });

  it('Nain → [] (aucune ascendance avec sort)', () => {
    const draft = draftWith({});
    expect(buildAncestrySpellIds(draft, DWARF)).toEqual([]);
  });

  it('Tieffelin avec un héritage inconnu (custom pack mal aligné) → [] safe', () => {
    const draft = draftWith({
      tieflingLegacy: 'abyssal' as never, // type system safe ; bundle mismatch
    });
    const bundleWithoutAbyssal: Ancestry = {
      ...TIEFLING,
      options: { tieflingLegacies: [TIEFLING.options.tieflingLegacies![1]!] }, // infernal only
    };
    expect(buildAncestrySpellIds(draft, bundleWithoutAbyssal)).toEqual([]);
  });
});

/**
 * Anti-régression UAT 13.8 (2026-05-18) — agrégation des sources de
 * maîtrise au submit Firestore.
 *
 * Avant le fix, `submit-from-wizard.ts` écrivait dans `character.skills`
 * uniquement les `draft.pickedSkills`. Les grants suivants étaient
 * silencieusement perdus :
 *   - Background (Acolyte → Insight + Religion) — bug latent, jamais
 *     remonté en UAT parce qu'aucune fiche ne montrait la lacune.
 *   - Ancestry (Humain Compétent → 1 skill, Elfe Sens Aiguisés → 1 skill) —
 *     bug détecté en UAT visible : la skill choisie au step ascendance
 *     n'apparaissait nulle part sur la fiche.
 *
 * Ces tests doivent être rouges sur le code pré-fix de `submit-from-wizard.ts`
 * (qui n'agrège pas via `buildSkillProficiencies`).
 */

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

const HUMAN: Ancestry = {
  id: 'human',
  name: { fr: 'Humain', en: 'Human' },
  size: 'medium',
  speed: 30,
  description: { fr: '', en: '' },
  abilityScoreIncrease: [],
  traits: [],
  languages: ['common'],
  source: 'srd-5.2.1',
  options: { skillfulOptions: ['arcana', 'history', 'investigation'] },
};

const WIZARD_CLASS: ClassEntity = {
  id: 'wizard',
  name: { fr: 'Magicien', en: 'Wizard' },
  hitDie: 'd6',
  primaryAbility: ['int'],
  saveProficiencies: ['int', 'sag'],
  armorProficiencies: [],
  weaponProficiencies: [],
  toolProficiencies: [],
  skillChoices: {
    count: 2,
    from: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Nature', 'Religion'],
  },
  spellcasting: { ability: 'int', progression: 'full' },
  startingEquipment: { options: [{ items: [], coins: null }] },
  description: { fr: '.', en: '.' },
  features: [],
  weaponMasteryCount: 0,
  source: 'srd-5.2.1',
};

const EMPTY_SPELLS_BUNDLE: Spell[] = [];
const EMPTY_ITEMS_BUNDLE: Item[] = [];

function draftReady(patch: Partial<WizardDraft> = {}): WizardDraft {
  return {
    ...EMPTY_DRAFT,
    name: 'Test',
    level: 1,
    alignment: 'NB',
    classes: [
      {
        classId: 'wizard',
        level: 1,
        clericDivineOrder: null,
        druidPrimalOrder: null,
        fighterFightingStyle: null,
        weaponMasteries: [],
        expertiseSkills: [],
        eldritchInvocations: [],
        wizardSpellbookL1: [],
      },
    ],
    primaryClassId: 'wizard',
    ancestryId: 'human',
    ancestrySubChoices: {
      ...EMPTY_ANCESTRY_SUB_CHOICES,
      ancestrySize: 'medium',
      ancestryExtraSkill: 'arcana',
    },
    backgroundId: 'acolyte',
    pickedSkills: ['history', 'investigation'],
    equipmentChoices: [{ classId: 'wizard', optionIndex: 0 }],
    ...patch,
  };
}

describe('submit-from-wizard → character.skills agrège background + ancestry + picks', () => {
  it('Acolyte → character.skills.insight === 1 && character.skills.religion === 1', async () => {
    const character = await buildCharacterFromWizard({
      uid: 'uid-test',
      draft: draftReady(),
      classes: [WIZARD_CLASS],
      ancestry: HUMAN,
      background: ACOLYTE,
      items: EMPTY_ITEMS_BUNDLE,
      spells: EMPTY_SPELLS_BUNDLE,
    });
    expect(character.skills.insight).toBe(1);
    expect(character.skills.religion).toBe(1);
  });

  it('Humain Compétent (Arcanes) → character.skills.arcana === 1', async () => {
    const character = await buildCharacterFromWizard({
      uid: 'uid-test',
      draft: draftReady(),
      classes: [WIZARD_CLASS],
      ancestry: HUMAN,
      background: ACOLYTE,
      items: EMPTY_ITEMS_BUNDLE,
      spells: EMPTY_SPELLS_BUNDLE,
    });
    expect(character.skills.arcana).toBe(1);
  });

  it('picks de classe (History, Investigation) restent à 1 sur la fiche', async () => {
    const character = await buildCharacterFromWizard({
      uid: 'uid-test',
      draft: draftReady(),
      classes: [WIZARD_CLASS],
      ancestry: HUMAN,
      background: ACOLYTE,
      items: EMPTY_ITEMS_BUNDLE,
      spells: EMPTY_SPELLS_BUNDLE,
    });
    expect(character.skills.history).toBe(1);
    expect(character.skills.investigation).toBe(1);
  });

  it('ancestry+class doublon : Humain Arcanes + classe pick Arcanes → 1 seule entrée à 1', async () => {
    const character = await buildCharacterFromWizard({
      uid: 'uid-test',
      draft: draftReady({
        pickedSkills: ['arcana', 'history'],
        ancestrySubChoices: {
          ...EMPTY_ANCESTRY_SUB_CHOICES,
          ancestrySize: 'medium',
          ancestryExtraSkill: 'arcana',
        },
      }),
      classes: [WIZARD_CLASS],
      ancestry: HUMAN,
      background: ACOLYTE,
      items: EMPTY_ITEMS_BUNDLE,
      spells: EMPTY_SPELLS_BUNDLE,
    });
    expect(character.skills.arcana).toBe(1);
    // Acolyte + ancestry Arcanes + picks {arcana, history} → 4 entrées
    // distinctes (insight, religion, arcana, history) avec max=1 partout.
    expect(Object.keys(character.skills).sort()).toEqual(
      ['arcana', 'history', 'insight', 'religion'].sort(),
    );
  });
});
