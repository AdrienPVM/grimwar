import { describe, it, expect, vi } from 'vitest';

import type { Item } from '@/shared/types/content';
import type { InventoryItem } from '@/shared/lib/inventory';
import type { EquippedRow } from '@/features/sheet/modes/avoir/inventory-rules';
import { EMPTY_DRAFT, type WizardDraft } from '@/shared/lib/slices/wizard-slice';
import { EMPTY_ANCESTRY_SUB_CHOICES } from '@/shared/types/character';
import type { Ancestry, Background, ClassEntity } from '@/shared/types/content';

import {
  normalizeText,
  expectIdentityRender,
  expectAC,
  expectSaveDC,
  expectAttackMod,
  expectProfBonus,
  expectExpertise,
  submitWizardAndDeriveSheet,
} from '..';

// `submitWizardAndDeriveSheet` → `buildCharacterFromWizard` → `addItemToInventory`
// (Dexie). On stub la resolution comme les tests submit-from-wizard existants.
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

// ───────────────────────── cat. 2 — identite ─────────────────────────

describe('normalizeText', () => {
  it('collapse les espaces multiples, tabulations et retours ligne', () => {
    expect(normalizeText('Projectile   magique\n\tinfaillible')).toBe(
      'Projectile magique infaillible',
    );
  });

  it('collapse les espaces insecables U+00A0 et fines U+202F', () => {
    expect(normalizeText('1 d 4 degats')).toBe('1 d 4 degats');
  });

  it('preserve casse et accents (identite FR significative)', () => {
    expect(normalizeText('  Créature  Évocation ')).toBe('Créature Évocation');
  });
});

describe('expectIdentityRender', () => {
  it('passe quand le contenu rendu egale le bundle apres normalisation', () => {
    expectIdentityRender({
      slug: 'projectile-magique',
      fields: [
        { label: 'title', expected: 'Projectile magique', rendered: 'Projectile  magique' },
        {
          label: 'description',
          expected: 'Trois fleches de force.',
          rendered: 'Trois\n fleches  de force.',
        },
      ],
    });
  });

  it('ECHOUE quand la modale affiche le contenu d\'une AUTRE entree (vrai bug)', () => {
    expect(() =>
      expectIdentityRender({
        slug: 'projectile-magique',
        fields: [{ label: 'title', expected: 'Projectile magique', rendered: 'Boule de feu' }],
      }),
    ).toThrow();
  });

  it('ECHOUE si un marqueur de dette D14 fuit sur les 4 sorts ex-grandfathered (post-D14)', () => {
    // Apres D14 : statblocks injectes, marqueurs retires de srd-spells.ts.
    // La classe entiere « un marqueur de dette traine en prod » devient
    // structurellement impossible — l'allowlist est sans objet.
    expect(() =>
      expectIdentityRender({
        slug: 'animation-des-objets',
        fields: [
          {
            label: 'atHigherLevels',
            expected: '[Profil de la créature invoquée non inclus ici ; suivi en dette D14.]',
            rendered: '[Profil de la créature invoquée non inclus ici ; suivi en dette D14.]',
          },
        ],
      }),
    ).toThrow();
  });

  it('ECHOUE si un marqueur de dette fuit sur n\'importe quel slug (post-D14, sans exception)', () => {
    expect(() =>
      expectIdentityRender({
        slug: 'projectile-magique',
        fields: [
          {
            label: 'description',
            expected: '[dette D99] todo',
            rendered: '[dette D99] todo',
          },
        ],
      }),
    ).toThrow();
  });
});

// ───────────────────────── cat. 4 — calculs (bornee Q1) ─────────────────────────

function makeArmor(id: string, acBase: number, acDexMax: number | null = null): Item {
  return {
    id,
    name: { fr: id },
    category: 'armor',
    cost: null,
    weight: 8,
    description: null,
    acBase,
    acDexMax,
    source: 'srd-5.2.1',
  };
}

function equippedRow(item: Item): EquippedRow {
  const inventory: InventoryItem = {
    contentId: item.id,
    contentScope: 'public',
    qty: 1,
    equipped: true,
    attuned: false,
    notes: '',
  };
  return { item, inventory, isMagic: false };
}

describe('cat. 4 — calculs chiffres contre la regle SRD', () => {
  it('expectProfBonus : niveau 1 → +2 ; rejette une valeur fausse', () => {
    expectProfBonus(1, 2);
    expectProfBonus(5, 3);
    expect(() => expectProfBonus(1, 3)).toThrow();
  });

  it('expectAC : cuir cloute (base 12) + DEX 12 → CA 13', () => {
    const rows = [equippedRow(makeArmor('cuir-cloute', 12, null))];
    expectAC(rows, 12, 13);
    expect(() => expectAC(rows, 12, 99)).toThrow();
  });

  it('expectAC : cotte de mailles (base 16, dexMax 0) → CA 16 quelle que soit la DEX', () => {
    const rows = [equippedRow(makeArmor('cotte-de-mailles', 16, 0))];
    expectAC(rows, 18, 16);
  });

  it('expectAC : aucune armure → null', () => {
    expectAC([], 14, null);
  });

  it('expectSaveDC : carac 16 (+3) au niveau 1 (PB 2) → DD 13', () => {
    expectSaveDC({ abilityScore: 16, totalLevel: 1 }, 13);
    expect(() => expectSaveDC({ abilityScore: 16, totalLevel: 1 }, 14)).toThrow();
  });

  it('expectAttackMod : carac 16 (+3) maitrise au niveau 1 → +5 ; non maitrise → +3', () => {
    expectAttackMod({ abilityScore: 16, totalLevel: 1, proficient: true }, 5);
    expectAttackMod({ abilityScore: 16, totalLevel: 1, proficient: false }, 3);
  });

  it('expectExpertise : carac 14 (+2) niveau 1 (PB 2) — expertise ×2 = +6, PAS ×3 (+8)', () => {
    expectExpertise({ abilityScore: 14, totalLevel: 1, proficiencyLevel: 2 }, 6);
    expectExpertise({ abilityScore: 14, totalLevel: 1, proficiencyLevel: 1 }, 4);
    // Garde cas-limite cat. 6 : si l'expertise triplait le PB par erreur (×3),
    // on obtiendrait +8 — ce test doit alors echouer.
    expect(() =>
      expectExpertise({ abilityScore: 14, totalLevel: 1, proficiencyLevel: 2 }, 8),
    ).toThrow();
  });
});

// ───────────────────────── cat. 5 — wizard → fiche ─────────────────────────

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

const FIGHTER_CLASS: ClassEntity = {
  id: 'fighter',
  name: { fr: 'Guerrier', en: 'Fighter' },
  hitDie: 'd10',
  primaryAbility: ['for'],
  saveProficiencies: ['for', 'con'],
  armorProficiencies: [],
  weaponProficiencies: [],
  toolProficiencies: [],
  skillChoices: { count: 2, from: ['Athletics', 'Intimidation', 'Perception', 'Survival'] },
  spellcasting: null,
  startingEquipment: { options: [{ items: [], coins: null }] },
  description: { fr: '.', en: '.' },
  features: [],
  weaponMasteryCount: 2,
  source: 'srd-5.2.1',
};

function fighterDraft(patch: Partial<WizardDraft> = {}): WizardDraft {
  return {
    ...EMPTY_DRAFT,
    name: 'Test',
    level: 1,
    alignment: 'NB',
    classes: [
      {
        classId: 'fighter',
        level: 1,
        clericDivineOrder: null,
        druidPrimalOrder: null,
        fighterFightingStyle: 'defense',
        weaponMasteries: ['epee-longue', 'hache-darmes'],
        expertiseSkills: [],
        eldritchInvocations: [],
        wizardSpellbookL1: [],
      },
    ],
    primaryClassId: 'fighter',
    ancestryId: 'human',
    ancestrySubChoices: {
      ...EMPTY_ANCESTRY_SUB_CHOICES,
      ancestrySize: 'medium',
      ancestryExtraSkill: 'arcana',
    },
    backgroundId: 'acolyte',
    pickedSkills: ['athletics', 'perception'],
    equipmentChoices: [{ classId: 'fighter', optionIndex: 0 }],
    ...patch,
  };
}

describe('submitWizardAndDeriveSheet — drive la fonction de prod (B3)', () => {
  it('Guerrier humain L1 valide → snapshot coherent', async () => {
    const snap = await submitWizardAndDeriveSheet({
      uid: 'uid-test',
      draft: fighterDraft(),
      classes: [FIGHTER_CLASS],
      ancestry: HUMAN,
      background: ACOLYTE,
      items: [],
      spells: [],
    });
    expect(snap.valid).toBe(true);
    expect(snap.errors).toEqual([]);
    expect(snap.totalLevel).toBe(1);
    expect(snap.profBonus).toBe(2);
    expect(snap.knownSpellsCount).toBe(0); // guerrier non lanceur
  });

  it('draft invalide (aucune classe) → snapshot valid:false avec errors peuple, pas de crash', async () => {
    const snap = await submitWizardAndDeriveSheet({
      uid: 'uid-test',
      draft: fighterDraft({ classes: [], primaryClassId: null }),
      classes: [FIGHTER_CLASS],
      ancestry: HUMAN,
      background: ACOLYTE,
      items: [],
      spells: [],
    });
    expect(snap.valid).toBe(false);
    expect(snap.errors.length).toBeGreaterThan(0);
  });
});
