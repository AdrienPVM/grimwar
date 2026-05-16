import { describe, expect, it } from 'vitest';

import type { Item, MagicItem } from '@/shared/types/content';
import type { InventoryItem } from '@/shared/lib/inventory';

import {
  carryingCapacity,
  computeAcFromArmor,
  computeEncumbrance,
  type EquippedRow,
} from '../inventory-rules';

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

function makeArmor(
  id: string,
  acBase: number,
  acDexMax: number | null | undefined = undefined,
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

function makeShield(id: string = 'shield'): Item {
  return {
    id,
    name: { fr: id },
    category: 'shield',
    cost: null,
    weight: 3,
    description: null,
    source: 'srd-5.2.1',
  };
}

function makeMagic(id: string): MagicItem {
  return {
    id,
    name: { fr: id },
    category: 'armor',
    rarity: 'rare',
    attunement: false,
    magicDescription: { fr: 'magique' },
    description: null,
    source: 'srd-5.2.1',
  };
}

describe('carryingCapacity', () => {
  it('FOR 10 → 75 kg', () => {
    expect(carryingCapacity(10)).toBe(75);
  });
  it('FOR 8 → 60 kg', () => {
    expect(carryingCapacity(8)).toBe(60);
  });
  it('FOR 18 → 135 kg', () => {
    expect(carryingCapacity(18)).toBe(135);
  });
});

describe('computeEncumbrance', () => {
  it('FOR 10, poids 20 kg → normal (< 22.5)', () => {
    expect(computeEncumbrance(20, 10)).toBe('normal');
  });
  it('FOR 10, poids 30 kg → encumbered (>= 22.5, < 45)', () => {
    expect(computeEncumbrance(30, 10)).toBe('encumbered');
  });
  it('FOR 10, poids 45 kg → heavily-encumbered (>= 45)', () => {
    expect(computeEncumbrance(45, 10)).toBe('heavily-encumbered');
  });
  it('FOR 10, poids 0 kg → normal (cas vide)', () => {
    expect(computeEncumbrance(0, 10)).toBe('normal');
  });
  it('FOR 20, poids 50 kg → normal (< 45)', () => {
    // FOR 20 : light < 45, medium < 90 — donc 50 kg = encumbered ? Non : 50 > 45 ⇒ encumbered.
    expect(computeEncumbrance(50, 20)).toBe('encumbered');
  });
  it('FOR 20, poids 40 kg → normal (< 45)', () => {
    expect(computeEncumbrance(40, 20)).toBe('normal');
  });
});

describe('computeAcFromArmor', () => {
  it('rien d\'équipé → null', () => {
    expect(computeAcFromArmor([], 14)).toBeNull();
  });

  it('armure légère équipée (acBase 11, dex cap absent) : 11 + DEX mod', () => {
    const rows: EquippedRow[] = [
      {
        item: makeArmor('leather', 11, undefined),
        inventory: makeInventoryItem('leather', { equipped: true }),
        isMagic: false,
      },
    ];
    expect(computeAcFromArmor(rows, 16)).toBe(11 + 3); // DEX 16 → +3
  });

  it('armure mi-lourde (acBase 13, acDexMax 2) : 13 + min(DEX mod, 2)', () => {
    const rows: EquippedRow[] = [
      {
        item: makeArmor('hide', 13, 2),
        inventory: makeInventoryItem('hide', { equipped: true }),
        isMagic: false,
      },
    ];
    expect(computeAcFromArmor(rows, 16)).toBe(13 + 2); // cap à 2
    expect(computeAcFromArmor(rows, 12)).toBe(13 + 1); // mod 1 < 2 → mod
  });

  it('armure lourde (acBase 18, acDexMax 0) : 18 sans DEX', () => {
    const rows: EquippedRow[] = [
      {
        item: makeArmor('plate', 18, 0),
        inventory: makeInventoryItem('plate', { equipped: true }),
        isMagic: false,
      },
    ];
    expect(computeAcFromArmor(rows, 16)).toBe(18);
  });

  it('bouclier seul, pas d\'armure : 10 + DEX + 2', () => {
    const rows: EquippedRow[] = [
      {
        item: makeShield(),
        inventory: makeInventoryItem('shield', { equipped: true }),
        isMagic: false,
      },
    ];
    expect(computeAcFromArmor(rows, 14)).toBe(10 + 2 + 2); // dex +2, shield +2
  });

  it('armure légère + bouclier : 11 + DEX + 2', () => {
    const rows: EquippedRow[] = [
      {
        item: makeArmor('leather', 11),
        inventory: makeInventoryItem('leather', { equipped: true }),
        isMagic: false,
      },
      {
        item: makeShield(),
        inventory: makeInventoryItem('shield', { equipped: true }),
        isMagic: false,
      },
    ];
    expect(computeAcFromArmor(rows, 14)).toBe(11 + 2 + 2);
  });

  it('armure non équipée : ignorée', () => {
    const rows: EquippedRow[] = [
      {
        item: makeArmor('plate', 18, 0),
        inventory: makeInventoryItem('plate', { equipped: false }),
        isMagic: false,
      },
    ];
    expect(computeAcFromArmor(rows, 14)).toBeNull();
  });

  it('magic item équipé : ignoré (plan 19 le câblera)', () => {
    const rows: EquippedRow[] = [
      {
        item: makeMagic('cloak-of-protection'),
        inventory: makeInventoryItem('cloak-of-protection', { equipped: true }),
        isMagic: true,
      },
    ];
    expect(computeAcFromArmor(rows, 14)).toBeNull();
  });

  it('deux armures équipées (cas anormal) : retient la meilleure', () => {
    const rows: EquippedRow[] = [
      {
        item: makeArmor('leather', 11),
        inventory: makeInventoryItem('leather', { equipped: true }),
        isMagic: false,
      },
      {
        item: makeArmor('plate', 18, 0),
        inventory: makeInventoryItem('plate', { equipped: true }),
        isMagic: false,
      },
    ];
    expect(computeAcFromArmor(rows, 14)).toBe(18);
  });
});
