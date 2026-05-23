import { describe, expect, it } from 'vitest';

import {
  computeAcFromArmor,
  hasEquippedBodyArmor,
  type EquippedRow,
} from '@/features/sheet/modes/avoir/inventory-rules';
import type {
  Character,
  CharacterClassEntry,
  FightingStyle,
} from '@/shared/types/character';
import type { Item } from '@/shared/types/content';
import type { InventoryItem } from '@/shared/lib/inventory';

import { computeDisplayedAc } from '../ac';

/**
 * Plan 13.14b — D19 + D20, intégration sans React.
 *
 * `ac.test.ts` couvre la pure-function en isolation (acFromArmor + Defense).
 * Ce fichier branche les 3 maillons réels — inventaire équipé → `computeAc-
 * FromArmor` + `hasEquippedBodyArmor` → `computeDisplayedAc` — pour figer la
 * VALEUR affichée à l'écran sur les 3 cas du plan, sans monter de React.
 *
 * Pourquoi cette couche en plus d'`ac.test.ts` : une dérive de `inventory-
 * rules.ts` (catégorie ignorée, dex cap, magic ignoré, etc.) ne ferait PAS
 * échouer `ac.test.ts` (qui prend `acFromArmor` en entrée pré-calculée), mais
 * elle casserait la CA réellement affichée. On veut le bug à 1 commit, pas 2.
 */

function makeArmor(
  id: string,
  acBase: number,
  acDexMax: number | null = null,
): Item {
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

function makeShield(): Item {
  return {
    id: 'shield',
    name: { fr: 'shield' },
    category: 'shield',
    cost: null,
    weight: 3,
    description: null,
    source: 'srd-5.2.1',
  };
}

function makeInventoryItem(
  contentId: string,
  overrides: Partial<InventoryItem> = {},
): InventoryItem {
  return {
    contentId,
    contentScope: 'public',
    qty: 1,
    equipped: false,
    attuned: false,
    notes: '',
    ...overrides,
  };
}

function makeClass(opts: {
  classId: string;
  fightingStyle?: FightingStyle | null;
}): CharacterClassEntry {
  return {
    classId: opts.classId,
    subclassId: null,
    level: 1,
    clericDivineOrder: null,
    druidPrimalOrder: null,
    fighterFightingStyle: opts.fightingStyle ?? null,
    weaponMasteries: [],
    expertiseSkills: [],
    eldritchInvocations: [],
    wizardSpellbookL1: [],
  };
}

/**
 * Pipeline réutilisé par tous les cas : prend un perso partiel + un set d'items
 * équipés et calcule la CA affichée comme le ferait `CharacterSheet`. On ne
 * monte pas React — c'est volontaire (rapide + zéro IndexedDB).
 */
function runAcPipeline(opts: {
  character: Pick<Character, 'ac' | 'classes' | 'abilities'>;
  equipped: readonly { item: Item; equipped: boolean }[];
}): number {
  const rows: EquippedRow[] = opts.equipped.map((e) => ({
    item: e.item,
    inventory: makeInventoryItem(e.item.id, { equipped: e.equipped }),
    isMagic: false,
  }));
  const acFromArmor = computeAcFromArmor(rows, opts.character.abilities.dex);
  const bodyArmor = hasEquippedBodyArmor(rows);
  return computeDisplayedAc({
    character: opts.character,
    acFromArmor,
    hasEquippedBodyArmor: bodyArmor,
  });
}

describe('AC pipeline (inventory + Defense) — D19/D20', () => {
  it('Cas 1 du plan : Guerrier·defense + cotte de mailles équipée → 17', () => {
    // Cotte de mailles SRD 5.2.1 : acBase 16, acDexMax 0 → DEX ignoré.
    // Defense +1 actif (armure portée + fighterFightingStyle === 'defense').
    const ac = runAcPipeline({
      character: {
        ac: 11, // valeur wizard (10 + DEX +1) — ignorée car armure équipée
        classes: [makeClass({ classId: 'fighter', fightingStyle: 'defense' })],
        abilities: { for: 16, dex: 12, con: 14, int: 10, sag: 10, cha: 10 },
      },
      equipped: [{ item: makeArmor('chain-mail', 16, 0), equipped: true }],
    });
    expect(ac).toBe(17);
  });

  it('Cas 2 du plan : Guerrier·defense sans armure équipée → CA désarmée brute, zéro bonus', () => {
    // DEX 14 → mod +2 → la valeur wizard.ac qu'on aurait posée serait 12.
    // Aucune armure équipée → `acFromArmor` null → fallback `character.ac`.
    // Defense ne s'applique pas (gate `hasEquippedBodyArmor === false`).
    const ac = runAcPipeline({
      character: {
        ac: 12,
        classes: [makeClass({ classId: 'fighter', fightingStyle: 'defense' })],
        abilities: { for: 16, dex: 14, con: 14, int: 10, sag: 10, cha: 10 },
      },
      equipped: [],
    });
    expect(ac).toBe(12);
  });

  it('Cas 3 du plan : Magicien + cotte de mailles équipée → 16 (pas de Defense)', () => {
    // Le Magicien n'a évidemment pas la maîtrise d'armure lourde — peu importe,
    // la règle Defense vétée parce qu'AUCUNE entrée de `classes[]` n'a
    // `fighterFightingStyle === 'defense'`.
    const ac = runAcPipeline({
      character: {
        ac: 12,
        classes: [makeClass({ classId: 'wizard', fightingStyle: null })],
        abilities: { for: 10, dex: 14, con: 14, int: 16, sag: 10, cha: 10 },
      },
      equipped: [{ item: makeArmor('chain-mail', 16, 0), equipped: true }],
    });
    expect(ac).toBe(16);
  });

  // ─────────────────────────────────────────────────────────────────────
  // Cas-pièges qui auraient pu casser silencieusement (cat. 6 du test-vérité)
  // ─────────────────────────────────────────────────────────────────────

  it('Cas-piège : Guerrier·defense + bouclier seul (pas d\'armure portée) → 14, pas 15', () => {
    // Règle SRD « while wearing armor » : un bouclier ne suffit pas à activer
    // Defense. `computeAcFromArmor` gonfle bien à 10+DEX+2 mais le gate
    // `hasEquippedBodyArmor=false` doit veto le +1.
    const ac = runAcPipeline({
      character: {
        ac: 12,
        classes: [makeClass({ classId: 'fighter', fightingStyle: 'defense' })],
        abilities: { for: 16, dex: 14, con: 14, int: 10, sag: 10, cha: 10 },
      },
      equipped: [{ item: makeShield(), equipped: true }],
    });
    expect(ac).toBe(14); // 10 + DEX +2 + shield +2, ZÉRO Defense
  });

  it('Cas-piège : Guerrier·defense + cuir + bouclier → 16 (Defense cumule avec shield)', () => {
    // Cuir = acBase 11, dex sans cap → 11 + 2 = 13, shield +2 = 15, Defense +1 = 16.
    const ac = runAcPipeline({
      character: {
        ac: 12,
        classes: [makeClass({ classId: 'fighter', fightingStyle: 'defense' })],
        abilities: { for: 16, dex: 14, con: 14, int: 10, sag: 10, cha: 10 },
      },
      equipped: [
        { item: makeArmor('leather', 11, null), equipped: true },
        { item: makeShield(), equipped: true },
      ],
    });
    expect(ac).toBe(16);
  });

  it('Cas-piège : Guerrier·archery + cotte → 16, pas 17 (Defense ≠ Archery)', () => {
    // Confond style ≠ style : seul `defense` accorde le +1.
    const ac = runAcPipeline({
      character: {
        ac: 11,
        classes: [makeClass({ classId: 'fighter', fightingStyle: 'archery' })],
        abilities: { for: 16, dex: 12, con: 14, int: 10, sag: 10, cha: 10 },
      },
      equipped: [{ item: makeArmor('chain-mail', 16, 0), equipped: true }],
    });
    expect(ac).toBe(16);
  });

  it('Cas-piège : armure équipée=false dans l\'inventaire → ignorée (CA désarmée)', () => {
    // L'utilisateur a la cotte dans son sac mais ne la porte pas. Pas de bonus
    // d'armure et pas de Defense (gate body-armor false).
    const ac = runAcPipeline({
      character: {
        ac: 12,
        classes: [makeClass({ classId: 'fighter', fightingStyle: 'defense' })],
        abilities: { for: 16, dex: 14, con: 14, int: 10, sag: 10, cha: 10 },
      },
      equipped: [{ item: makeArmor('chain-mail', 16, 0), equipped: false }],
    });
    expect(ac).toBe(12);
  });
});
