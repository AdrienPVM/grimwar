import { describe, it, expect } from 'vitest';

import {
  addEntry,
  clearInitiative,
  EMPTY_INITIATIVE,
  nextTurn,
  removeEntry,
  updateHp,
  type InitiativeEntry,
} from '../initiative-state';

const A: InitiativeEntry = { id: 'a', name: 'Alice', initiative: 18, hp: 10, hpMax: 10 };
const B: InitiativeEntry = { id: 'b', name: 'Bob', initiative: 12, hp: 8, hpMax: 8 };
const C: InitiativeEntry = { id: 'c', name: 'Carol', initiative: 18, hp: 5, hpMax: 5 };

describe('initiative-state — addEntry', () => {
  it("trie décroissant par initiative", () => {
    let init = addEntry(EMPTY_INITIATIVE, B);
    init = addEntry(init, A);
    expect(init.entries.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it("garde l'ordre d'insertion en cas d'égalité (sort stable)", () => {
    let init = addEntry(EMPTY_INITIATIVE, A);
    init = addEntry(init, C);
    // A inséré en premier, même initiative que C → A reste avant C.
    expect(init.entries.map((e) => e.id)).toEqual(['a', 'c']);
  });

  it("met à jour une entrée existante (idempotent par id)", () => {
    let init = addEntry(EMPTY_INITIATIVE, A);
    init = addEntry(init, { ...A, initiative: 5 });
    expect(init.entries).toHaveLength(1);
    expect(init.entries[0]!.initiative).toBe(5);
  });
});

describe('initiative-state — removeEntry', () => {
  it("retire par id", () => {
    let init = addEntry(EMPTY_INITIATIVE, A);
    init = addEntry(init, B);
    const next = removeEntry(init, 'a');
    expect(next.entries.map((e) => e.id)).toEqual(['b']);
  });

  it("ajuste turnIndex en conséquence (idx avant tour → décrément)", () => {
    let init = addEntry(EMPTY_INITIATIVE, A);
    init = addEntry(init, B);
    init = nextTurn(init); // turnIndex = 0 (A)
    init = nextTurn(init); // turnIndex = 1 (B)
    const next = removeEntry(init, 'a');
    // L'entrée à idx 0 (A) supprimée → tour pointe maintenant 0 (B).
    expect(next.turnIndex).toBe(0);
  });

  it("turnIndex devient null si la liste devient vide", () => {
    let init = addEntry(EMPTY_INITIATIVE, A);
    init = nextTurn(init);
    expect(removeEntry(init, 'a').turnIndex).toBeNull();
  });
});

describe('initiative-state — updateHp', () => {
  it("clamp [0, hpMax]", () => {
    const init = addEntry(EMPTY_INITIATIVE, A);
    expect(updateHp(init, 'a', -5).entries[0]!.hp).toBe(0);
    expect(updateHp(init, 'a', 50).entries[0]!.hp).toBe(10);
    expect(updateHp(init, 'a', 7).entries[0]!.hp).toBe(7);
  });
});

describe('initiative-state — nextTurn', () => {
  it("démarre au premier si turnIndex est null", () => {
    const init = addEntry(EMPTY_INITIATIVE, A);
    expect(nextTurn(init).turnIndex).toBe(0);
  });

  it("avance et wraparound modulo la longueur", () => {
    let init = addEntry(EMPTY_INITIATIVE, A);
    init = addEntry(init, B);
    init = nextTurn(init); // 0
    init = nextTurn(init); // 1
    init = nextTurn(init); // 0 (wraparound)
    expect(init.turnIndex).toBe(0);
  });

  it("no-op sur liste vide", () => {
    expect(nextTurn(EMPTY_INITIATIVE)).toEqual(EMPTY_INITIATIVE);
  });
});

describe('initiative-state — clearInitiative', () => {
  it("reset complet", () => {
    let init = addEntry(EMPTY_INITIATIVE, A);
    init = nextTurn(init);
    expect(clearInitiative(init)).toEqual(EMPTY_INITIATIVE);
  });
});
