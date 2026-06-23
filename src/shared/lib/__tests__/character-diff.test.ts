import { describe, expect, it } from 'vitest';

import { diffCharacterEvents } from '@/shared/lib/character-diff';
import type { Character, InventoryItem } from '@/shared/types/character';

/**
 * Tests du diff de fiche → événements (plan 22.2). Fonction PURE : on construit
 * un état AVANT, on passe un patch, on asserte les événements dérivés (kind +
 * payload). Couvre PV, PV temp., états, emplacements, inventaire — et les NON-
 * événements (champ inchangé, champ hors périmètre).
 */

const BASE: Character = {
  id: 'char-1',
  name: 'Test',
  status: 'alive',
  classes: [
    {
      classId: 'wizard',
      subclassId: null,
      level: 3,
      clericDivineOrder: null,
      druidPrimalOrder: null,
      fighterFightingStyle: null,
      weaponMasteries: [],
      expertiseSkills: [],
      eldritchInvocations: [],
      wizardSpellbookL1: [],
    },
  ],
  totalLevel: 3,
  primaryClassId: 'wizard',
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
  backgroundId: 'sage',
  extraLanguages: [],
  experience: 0,
  alignment: 'N',
  abilities: { for: 8, dex: 14, con: 12, int: 16, sag: 13, cha: 10 },
  saves: { for: false, dex: false, con: false, int: true, sag: true, cha: false },
  skills: {},
  hp: { current: 18, max: 18, temp: 0 },
  ac: 12,
  speed: 30,
  initiative: 2,
  hitDice: [{ classId: 'wizard', current: 3, max: 3, die: 'd6' }],
  deathSaves: { success: 0, fail: 0 },
  conditions: [],
  inspiration: false,
  exhaustion: 0,
  currentConcentration: null,
  classResources: {},
  spellSlots: { '1': { max: 4, current: 4 }, '2': { max: 2, current: 2 } },
  preparedSpells: {},
  knownSpells: {},
  spellcastingAbility: { wizard: 'int' },
  inventory: { items: [], coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 }, weightCache: 0 },
  personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
  featureUsage: {},
  extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
  presentInCampaigns: [],
  homeCampaignId: null,
  stats: { totalRolls: 0, totalD20Sum: 0, crits: 0, fumbles: 0, skillUses: {} },
  portrait: { type: 'letter', value: 'T' },
  schemaVersion: 2,
  createdAt: null as never,
  updatedAt: null as never,
  updatedBy: 'test-uid',
};

function item(overrides: Partial<InventoryItem> & Pick<InventoryItem, 'contentId'>): InventoryItem {
  return {
    contentScope: 'public',
    qty: 1,
    equipped: false,
    attuned: false,
    notes: '',
    ...overrides,
  };
}

describe('diffCharacterEvents — PV', () => {
  it('dégât → hp-change avec delta négatif et reason damage', () => {
    const events = diffCharacterEvents(BASE, { hp: { current: 12, max: 18, temp: 0 } }, 'char-1');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: 'hp-change',
      actorCharacterId: 'char-1',
      visibility: 'all',
      payload: { before: 18, after: 12, delta: -6, reason: 'damage', source: 'manual' },
    });
  });

  it('soin → hp-change avec delta positif et reason heal', () => {
    const wounded: Character = { ...BASE, hp: { current: 5, max: 18, temp: 0 } };
    const events = diffCharacterEvents(wounded, { hp: { current: 11, max: 18, temp: 0 } }, 'char-1');
    expect(events[0]).toMatchObject({ kind: 'hp-change', payload: { delta: 6, reason: 'heal' } });
  });

  it('PV inchangés → aucun événement', () => {
    const events = diffCharacterEvents(BASE, { hp: { current: 18, max: 18, temp: 0 } }, 'char-1');
    expect(events).toHaveLength(0);
  });

  it('gain de PV temp. → temp-hp ; une perte de PV temp. n’en produit pas', () => {
    const gain = diffCharacterEvents(BASE, { hp: { current: 18, max: 18, temp: 5 } }, 'char-1');
    expect(gain).toHaveLength(1);
    expect(gain[0]).toMatchObject({ kind: 'temp-hp', payload: { before: 0, after: 5 } });

    const withTemp: Character = { ...BASE, hp: { current: 18, max: 18, temp: 5 } };
    const loss = diffCharacterEvents(withTemp, { hp: { current: 18, max: 18, temp: 0 } }, 'char-1');
    expect(loss).toHaveLength(0);
  });
});

describe('diffCharacterEvents — états', () => {
  it('état ajouté → condition-add ; état retiré → condition-remove', () => {
    const withCond: Character = { ...BASE, conditions: ['poisoned'] };
    const added = diffCharacterEvents(BASE, { conditions: ['poisoned'] }, 'char-1');
    expect(added).toEqual([
      { kind: 'condition-add', actorCharacterId: 'char-1', visibility: 'all', payload: { conditionId: 'poisoned', source: 'manual' } },
    ]);
    const removed = diffCharacterEvents(withCond, { conditions: [] }, 'char-1');
    expect(removed).toEqual([
      { kind: 'condition-remove', actorCharacterId: 'char-1', visibility: 'all', payload: { conditionId: 'poisoned' } },
    ]);
  });

  it('ajout + retrait simultanés → un add et un remove', () => {
    const before: Character = { ...BASE, conditions: ['prone'] };
    const events = diffCharacterEvents(before, { conditions: ['stunned'] }, 'char-1');
    const kinds = events.map((e) => e.kind).sort();
    expect(kinds).toEqual(['condition-add', 'condition-remove']);
  });
});

describe('diffCharacterEvents — emplacements de sort', () => {
  it('consommation → slot-consumed avec count', () => {
    const events = diffCharacterEvents(
      BASE,
      { spellSlots: { '1': { max: 4, current: 3 }, '2': { max: 2, current: 2 } } },
      'char-1',
    );
    expect(events).toEqual([
      { kind: 'slot-consumed', actorCharacterId: 'char-1', visibility: 'all', payload: { slotLevel: 1, count: 1, source: 'manual' } },
    ]);
  });

  it('restauration multi-niveaux → un slot-restored par niveau', () => {
    const spent: Character = {
      ...BASE,
      spellSlots: { '1': { max: 4, current: 1 }, '2': { max: 2, current: 0 } },
    };
    const events = diffCharacterEvents(
      spent,
      { spellSlots: { '1': { max: 4, current: 4 }, '2': { max: 2, current: 2 } } },
      'char-1',
    );
    expect(events).toHaveLength(2);
    expect(events).toContainEqual({
      kind: 'slot-restored',
      actorCharacterId: 'char-1',
      visibility: 'all',
      payload: { slotLevel: 1, count: 3, source: 'manual' },
    });
    expect(events).toContainEqual({
      kind: 'slot-restored',
      actorCharacterId: 'char-1',
      visibility: 'all',
      payload: { slotLevel: 2, count: 2, source: 'manual' },
    });
  });
});

describe('diffCharacterEvents — inventaire', () => {
  it('nouvel item → item-acquired (qty entière)', () => {
    const events = diffCharacterEvents(
      BASE,
      { inventory: { items: [item({ contentId: 'longsword', qty: 1 })], coins: BASE.inventory.coins, weightCache: 0 } },
      'char-1',
    );
    expect(events).toEqual([
      { kind: 'item-acquired', actorCharacterId: 'char-1', visibility: 'all', payload: { itemRef: 'longsword', contentScope: 'public', qty: 1, source: 'manual' } },
    ]);
  });

  it('qty augmentée → item-acquired du delta seulement', () => {
    const before: Character = {
      ...BASE,
      inventory: { items: [item({ contentId: 'arrow', qty: 20 })], coins: BASE.inventory.coins, weightCache: 0 },
    };
    const events = diffCharacterEvents(
      before,
      { inventory: { items: [item({ contentId: 'arrow', qty: 32 })], coins: BASE.inventory.coins, weightCache: 0 } },
      'char-1',
    );
    expect(events[0]).toMatchObject({ kind: 'item-acquired', payload: { itemRef: 'arrow', qty: 12 } });
  });

  it('item retiré → item-removed ; qty réduite → item-removed du delta', () => {
    const before: Character = {
      ...BASE,
      inventory: { items: [item({ contentId: 'potion', qty: 3 })], coins: BASE.inventory.coins, weightCache: 0 },
    };
    const gone = diffCharacterEvents(
      before,
      { inventory: { items: [], coins: BASE.inventory.coins, weightCache: 0 } },
      'char-1',
    );
    expect(gone[0]).toMatchObject({ kind: 'item-removed', payload: { itemRef: 'potion', qty: 3, reason: 'manual' } });

    const reduced = diffCharacterEvents(
      before,
      { inventory: { items: [item({ contentId: 'potion', qty: 1 })], coins: BASE.inventory.coins, weightCache: 0 } },
      'char-1',
    );
    expect(reduced[0]).toMatchObject({ kind: 'item-removed', payload: { itemRef: 'potion', qty: 2 } });
  });

  it('toggle equipped sans changer qty → aucun événement (hors périmètre 22.2)', () => {
    const before: Character = {
      ...BASE,
      inventory: { items: [item({ contentId: 'shield', qty: 1, equipped: false })], coins: BASE.inventory.coins, weightCache: 0 },
    };
    const events = diffCharacterEvents(
      before,
      { inventory: { items: [item({ contentId: 'shield', qty: 1, equipped: true })], coins: BASE.inventory.coins, weightCache: 0 } },
      'char-1',
    );
    expect(events).toHaveLength(0);
  });
});

describe('diffCharacterEvents — hors périmètre', () => {
  it('un patch de coins seul ne produit aucun événement (coins-change différé)', () => {
    const events = diffCharacterEvents(
      BASE,
      { inventory: { items: [], coins: { cu: 10, ar: 0, el: 0, or: 0, pl: 0 }, weightCache: 0 } },
      'char-1',
    );
    expect(events).toHaveLength(0);
  });

  it('un patch sans champ pertinent (inspiration) ne produit aucun événement', () => {
    expect(diffCharacterEvents(BASE, { inspiration: true }, 'char-1')).toHaveLength(0);
  });

  it('characterId vide → actorCharacterId null', () => {
    const events = diffCharacterEvents(BASE, { hp: { current: 17, max: 18, temp: 0 } }, '');
    expect(events[0]?.actorCharacterId).toBeNull();
  });
});
