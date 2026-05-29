import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createEmptyClassSubChoices,
  type Character,
  type CharacterClassEntry,
} from '@/shared/types/character';
import type { ClassEntity } from '@/shared/types/content';

import { applyLevelUp } from '../apply-level-up';
import type { LevelUpDraft } from '../level-up-types';

/**
 * JALON 2B.3a — Tests TDD de `applyLevelUp` sur 3 classes échantillon :
 *   - Fighter (martial, L1→L2 — Action Surge, pas d'ASI à 2)
 *   - Wizard (full caster, L1→L2 — emplacements 1×L1 → 3×L1)
 *   - Rogue (skill-monkey, L1→L2 — Cunning Action, pas de cast)
 *
 * Couvre aussi :
 *   - L3→L4 = ASI level → application ASI ou feat
 *   - max level → no-op (refus)
 *   - subclassId requis à newClassLevel=3
 *
 * Cible explicite : test-vérité du contenu catégorie 4 — résultat chiffré
 * (HP, slots, classResources max) contre la table SRD 5.2.1.
 */

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

function loadClasses(): Record<string, ClassEntity> {
  const path = join(process.cwd(), 'public', 'data', 'classes.json');
  const arr = JSON.parse(readFileSync(path, 'utf8')) as ClassEntity[];
  return Object.fromEntries(arr.map((c) => [c.id, c]));
}

const ALL_CLASSES = loadClasses();

/** Crée une entrée `classes[]` minimale avec sentinelles v2. */
function mkClassEntry(classId: string, level: number): CharacterClassEntry {
  return {
    classId,
    subclassId: null,
    level,
    ...createEmptyClassSubChoices(),
  };
}

/**
 * Construit un Character L1 minimal pour la classe demandée. Seulement les
 * champs touchés par `applyLevelUp` sont représentés fidèlement ; le reste
 * vient de défauts stubs pour satisfaire le type. Le cast final `as Character`
 * est volontaire — l'objectif est de tester la transformation, pas la
 * validation Zod du Character entier (couvert ailleurs).
 */
function buildL1Character(args: {
  classId: string;
  hitDie: 'd6' | 'd8' | 'd10' | 'd12';
  abilities?: Partial<Character['abilities']>;
}): Character {
  const con = args.abilities?.con ?? 14;
  const conMod = Math.floor((con - 10) / 2);
  const base: Character['abilities'] = {
    for: 10,
    dex: 14,
    con,
    int: 14,
    sag: 10,
    cha: 10,
    ...args.abilities,
  };
  const l1Hp = ({ d6: 6, d8: 8, d10: 10, d12: 12 } as const)[args.hitDie] + conMod;
  return {
    id: 'pc-test',
    name: 'Test',
    status: 'alive',
    classes: [mkClassEntry(args.classId, 1)],
    totalLevel: 1,
    primaryClassId: args.classId,
    ancestryId: 'human',
    ancestrySubChoices: {
      dragonAncestry: null,
      tieflingLegacy: null,
      elfLineage: null,
      gnomeLineage: null,
      goliathAncestry: null,
      ancestryCastingAbility: null,
      ancestryExtraSkill: null,
      ancestrySize: null,
    },
    backgroundId: 'soldier',
    extraLanguages: [],
    experience: 0,
    alignment: 'N',
    abilities: base,
    saves: { for: false, dex: false, con: false, int: false, sag: false, cha: false },
    skills: {},
    hp: { current: l1Hp, max: l1Hp, temp: 0 },
    ac: 13,
    speed: 9,
    initiative: Math.floor((base.dex - 10) / 2),
    hitDice: [{ classId: args.classId, current: 1, max: 1, die: args.hitDie }],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    spellSlots: {},
    preparedSpells: {},
    knownSpells: {},
    spellcastingAbility: {},
    inventory: { items: [], coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 }, weightCache: 0 },
    personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
    featureUsage: {},
    extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    presentInCampaigns: [],
    homeCampaignId: null,
    stats: { totalRolls: 0, totalD20Sum: 0, crits: 0, fumbles: 0, skillUses: {} },
    portrait: { type: 'letter', value: 'T' },
    schemaVersion: 2,
    createdAt: null,
    updatedAt: null,
    updatedBy: 'test',
  };
}

const averageRoll = { kind: 'average' as const };

// ─────────────────────────────────────────────────────────────────────
// Fighter — L1 → L2
// ─────────────────────────────────────────────────────────────────────

describe('applyLevelUp · Fighter L1→L2', () => {
  const fighter = buildL1Character({ classId: 'fighter', hitDie: 'd10' });

  it('bumps class level + totalLevel', () => {
    const next = applyLevelUp({
      character: fighter,
      draft: { classId: 'fighter', newClassLevel: 2, hpRoll: averageRoll },
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classes[0]!.level).toBe(2);
    expect(next.totalLevel).toBe(2);
  });

  it('adds 6 + CON-mod HP on average (d10 → 6, CON 14 → +2) → +8', () => {
    const next = applyLevelUp({
      character: fighter,
      draft: { classId: 'fighter', newClassLevel: 2, hpRoll: averageRoll },
      classDefinitions: ALL_CLASSES,
    });
    expect(next.hp.max).toBe(fighter.hp.max + 8);
    expect(next.hp.current).toBe(fighter.hp.current + 8);
  });

  it('bumps Fighter hit dice pool to 2/2', () => {
    const next = applyLevelUp({
      character: fighter,
      draft: { classId: 'fighter', newClassLevel: 2, hpRoll: averageRoll },
      classDefinitions: ALL_CLASSES,
    });
    expect(next.hitDice[0]!.max).toBe(2);
    expect(next.hitDice[0]!.current).toBe(2);
  });

  it('Fighter L2 gagne action-surge (1 use, classResourceProgression)', () => {
    const next = applyLevelUp({
      character: fighter,
      draft: { classId: 'fighter', newClassLevel: 2, hpRoll: averageRoll },
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classResources['action-surge']).toEqual({
      current: 1,
      max: 1,
      restoresOn: 'short',
    });
  });

  it('uses rolled HP if provided', () => {
    const next = applyLevelUp({
      character: fighter,
      draft: {
        classId: 'fighter',
        newClassLevel: 2,
        hpRoll: { kind: 'rolled', rolled: 9 },
      },
      classDefinitions: ALL_CLASSES,
    });
    // rolled 9 + CON 14 (+2) = 11 HP added
    expect(next.hp.max).toBe(fighter.hp.max + 11);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Wizard — L1 → L2 (full caster slot recompute)
// ─────────────────────────────────────────────────────────────────────

describe('applyLevelUp · Wizard L1→L2', () => {
  const wizard = buildL1Character({ classId: 'wizard', hitDie: 'd6' });
  const draft: LevelUpDraft = {
    classId: 'wizard',
    newClassLevel: 2,
    hpRoll: averageRoll,
  };

  it('recompute spellSlots à L2 wizard : 3×L1', () => {
    const next = applyLevelUp({
      character: wizard,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.spellSlots['1']).toEqual({ current: 3, max: 3 });
    expect(next.spellSlots['2']).toBeUndefined();
  });

  it('preserves les emplacements consommés au mieux (delta only)', () => {
    const wizardWithCast = {
      ...wizard,
      spellSlots: { '1': { current: 1, max: 2 } } satisfies Character['spellSlots'],
    };
    const next = applyLevelUp({
      character: wizardWithCast,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    // Delta = 3 - 2 = 1, donc current passe de 1 à 2 (l'utilisateur garde l'emplacement consommé)
    expect(next.spellSlots['1']).toEqual({ current: 2, max: 3 });
  });

  it('Wizard L2 expose arcane-recovery-slot-level = 1 (long rest, threshold)', () => {
    // L'`arcane-recovery-slot-level` du bundle SRD 5.2.1 encode le NIVEAU
    // d'emplacement maximum récupérable (ceil(level/2)) — pas un compteur de
    // pool. À L2 wizard la valeur est 1 (1×L1 récupérable une fois par jour).
    const next = applyLevelUp({
      character: wizard,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classResources['arcane-recovery-slot-level']).toEqual({
      current: 1,
      max: 1,
      restoresOn: 'long',
    });
  });

  it('adds 4 + CON-mod HP en moyenne (d6 → 4, CON +2) → +6', () => {
    const next = applyLevelUp({
      character: wizard,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.hp.max).toBe(wizard.hp.max + 6);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Rogue — L1 → L2 + L3 (subclass) + L4 (ASI)
// ─────────────────────────────────────────────────────────────────────

describe('applyLevelUp · Rogue progression', () => {
  const rogue = buildL1Character({ classId: 'rogue', hitDie: 'd8' });

  it('L1→L2 : sneak-attack-dice reste à 1 (table SRD : L1=1, L2=1, L3=2)', () => {
    const next = applyLevelUp({
      character: rogue,
      draft: { classId: 'rogue', newClassLevel: 2, hpRoll: averageRoll },
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classResources['sneak-attack-dice']).toBeUndefined();
    // Note : sneak-attack-dice est encodé en string "1d6" / "2d6" — pas
    // matérialisé en pool. Ce test vérifie que la table textuelle n'entre pas
    // dans classResources (pas de pollution).
  });

  it("L2→L3 exige subclassId (sinon throw)", () => {
    const rogueL2 = applyLevelUp({
      character: rogue,
      draft: { classId: 'rogue', newClassLevel: 2, hpRoll: averageRoll },
      classDefinitions: ALL_CLASSES,
    });
    expect(() =>
      applyLevelUp({
        character: rogueL2,
        draft: { classId: 'rogue', newClassLevel: 3, hpRoll: averageRoll },
        classDefinitions: ALL_CLASSES,
      }),
    ).toThrow(/subclassId requis/);
  });

  it('L2→L3 avec subclassId pose subclass sur la classe entry', () => {
    const rogueL2 = applyLevelUp({
      character: rogue,
      draft: { classId: 'rogue', newClassLevel: 2, hpRoll: averageRoll },
      classDefinitions: ALL_CLASSES,
    });
    const rogueL3 = applyLevelUp({
      character: rogueL2,
      draft: {
        classId: 'rogue',
        newClassLevel: 3,
        hpRoll: averageRoll,
        subclassId: 'thief',
      },
      classDefinitions: ALL_CLASSES,
    });
    expect(rogueL3.classes[0]!.subclassId).toBe('thief');
  });

  it('L3→L4 applique ASI (+2 sur DEX)', () => {
    const rogueL3 = applyLevelUp({
      character: applyLevelUp({
        character: rogue,
        draft: { classId: 'rogue', newClassLevel: 2, hpRoll: averageRoll },
        classDefinitions: ALL_CLASSES,
      }),
      draft: {
        classId: 'rogue',
        newClassLevel: 3,
        hpRoll: averageRoll,
        subclassId: 'thief',
      },
      classDefinitions: ALL_CLASSES,
    });
    const rogueL4 = applyLevelUp({
      character: rogueL3,
      draft: {
        classId: 'rogue',
        newClassLevel: 4,
        hpRoll: averageRoll,
        asiOrFeat: {
          kind: 'asi',
          abilityIncreases: [{ ability: 'dex', bonus: 2 }],
        },
      },
      classDefinitions: ALL_CLASSES,
    });
    expect(rogueL4.abilities.dex).toBe(rogue.abilities.dex + 2);
  });

  it("L3→L4 accepte ASI répartie 1/1 sur 2 stats", () => {
    const rogueL3 = applyLevelUp({
      character: applyLevelUp({
        character: rogue,
        draft: { classId: 'rogue', newClassLevel: 2, hpRoll: averageRoll },
        classDefinitions: ALL_CLASSES,
      }),
      draft: {
        classId: 'rogue',
        newClassLevel: 3,
        hpRoll: averageRoll,
        subclassId: 'thief',
      },
      classDefinitions: ALL_CLASSES,
    });
    const rogueL4 = applyLevelUp({
      character: rogueL3,
      draft: {
        classId: 'rogue',
        newClassLevel: 4,
        hpRoll: averageRoll,
        asiOrFeat: {
          kind: 'asi',
          abilityIncreases: [
            { ability: 'dex', bonus: 1 },
            { ability: 'con', bonus: 1 },
          ],
        },
      },
      classDefinitions: ALL_CLASSES,
    });
    expect(rogueL4.abilities.dex).toBe(rogue.abilities.dex + 1);
    expect(rogueL4.abilities.con).toBe(rogue.abilities.con + 1);
  });

  it("ASI plafonne à 20 et throw si tentative au-delà", () => {
    const maxStrFighter = buildL1Character({
      classId: 'fighter',
      hitDie: 'd10',
      abilities: { for: 19 },
    });
    expect(() =>
      applyLevelUp({
        character: maxStrFighter,
        draft: {
          classId: 'fighter',
          newClassLevel: 2,
          hpRoll: averageRoll,
          asiOrFeat: {
            kind: 'asi',
            abilityIncreases: [{ ability: 'for', bonus: 2 }],
          },
        },
        classDefinitions: ALL_CLASSES,
      }),
    ).toThrow(/dépasse 20/);
  });

  it("Feat choice accepté sans muter les stats", () => {
    const rogueL3 = applyLevelUp({
      character: applyLevelUp({
        character: rogue,
        draft: { classId: 'rogue', newClassLevel: 2, hpRoll: averageRoll },
        classDefinitions: ALL_CLASSES,
      }),
      draft: {
        classId: 'rogue',
        newClassLevel: 3,
        hpRoll: averageRoll,
        subclassId: 'thief',
      },
      classDefinitions: ALL_CLASSES,
    });
    const rogueL4 = applyLevelUp({
      character: rogueL3,
      draft: {
        classId: 'rogue',
        newClassLevel: 4,
        hpRoll: averageRoll,
        asiOrFeat: { kind: 'feat', featId: 'alert' },
      },
      classDefinitions: ALL_CLASSES,
    });
    expect(rogueL4.abilities).toEqual(rogueL3.abilities);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Cas-limites
// ─────────────────────────────────────────────────────────────────────

describe('applyLevelUp · cas-limites', () => {
  const fighter = buildL1Character({ classId: 'fighter', hitDie: 'd10' });

  it("throw si classId absent des classes[]", () => {
    expect(() =>
      applyLevelUp({
        character: fighter,
        draft: { classId: 'wizard', newClassLevel: 2, hpRoll: averageRoll },
        classDefinitions: ALL_CLASSES,
      }),
    ).toThrow(/introuvable/);
  });

  it("throw si newClassLevel ≠ current + 1", () => {
    expect(() =>
      applyLevelUp({
        character: fighter,
        draft: { classId: 'fighter', newClassLevel: 3, hpRoll: averageRoll },
        classDefinitions: ALL_CLASSES,
      }),
    ).toThrow(/attendu 2/);
  });

  it("throw si totalLevel === 20 (refus avant parse Zod)", () => {
    // Multi-class fictif : fighter L19 + wizard L1 → total 20. On tente de
    // bumper wizard à L2 — valide côté Zod (newClassLevel ≤ 20) mais refusé
    // par la garde plafond SRD avant tout calcul.
    const fighterPlusWizardL20: Character = {
      ...fighter,
      classes: [
        { ...fighter.classes[0]!, level: 19 },
        mkClassEntry('wizard', 1),
      ],
      totalLevel: 20,
    };
    expect(() =>
      applyLevelUp({
        character: fighterPlusWizardL20,
        draft: { classId: 'wizard', newClassLevel: 2, hpRoll: averageRoll },
        classDefinitions: ALL_CLASSES,
      }),
    ).toThrow(/totalLevel déjà à 20/);
  });

  it("throw si ASI total ≠ 2 points", () => {
    expect(() =>
      applyLevelUp({
        character: fighter,
        draft: {
          classId: 'fighter',
          newClassLevel: 2,
          hpRoll: averageRoll,
          asiOrFeat: {
            kind: 'asi',
            // 2 + 2 = 4 points → la transformation refuse (total > 2). Le
            // schéma Zod ne capture pas la somme (chaque bonus est ∈ {1,2}).
            abilityIncreases: [{ ability: 'for', bonus: 2 }, { ability: 'dex', bonus: 2 }],
          },
        },
        classDefinitions: ALL_CLASSES,
      }),
    ).toThrow(/2 points/);
  });
});
