import { describe, expect, it } from 'vitest';

import {
  NpcSchema,
  npcIsVisibleToPlayers,
  npcTimestampMillis,
  type Npc,
} from '../npc';

function make(overrides: Partial<Npc> = {}): Npc {
  return {
    id: 'npc-1',
    name: 'Aldric le marchand',
    role: 'merchant',
    location: 'Marché de Valombre',
    shortDescription: 'Un marchand bourru au cœur tendre.',
    publicDescription: 'Tient l’échoppe **Au Heaume d’Or**.',
    dmNotes: 'Informateur secret de la garde.',
    portrait: { type: 'letter', value: 'A' },
    combatStats: null,
    relationships: [],
    tags: ['recurring', 'merchant-magic'],
    visibility: 'all',
    createdBy: 'dm-1',
    createdAt: { seconds: 10 },
    updatedAt: { seconds: 10 },
    ...overrides,
  };
}

describe('npcIsVisibleToPlayers', () => {
  it("renvoie true pour un PNJ 'all'", () => {
    expect(npcIsVisibleToPlayers(make({ visibility: 'all' }))).toBe(true);
  });

  it("renvoie false pour un PNJ 'dm' (secret)", () => {
    expect(npcIsVisibleToPlayers(make({ visibility: 'dm' }))).toBe(false);
  });
});

describe('npcTimestampMillis', () => {
  it('lit .toMillis() en priorité', () => {
    expect(npcTimestampMillis({ toMillis: () => 4321, seconds: 1 })).toBe(4321);
  });

  it('retombe sur .seconds * 1000', () => {
    expect(npcTimestampMillis({ seconds: 7 })).toBe(7000);
  });

  it('renvoie 0 pour un timestamp pending (serverTimestamp non résolu)', () => {
    expect(npcTimestampMillis(null)).toBe(0);
  });
});

describe('NpcSchema', () => {
  it('accepte un PNJ non-combattant valide', () => {
    expect(NpcSchema.safeParse(make()).success).toBe(true);
  });

  it('accepte un PNJ combattant lié à un monstre', () => {
    const r = NpcSchema.safeParse(
      make({
        role: 'enemy',
        visibility: 'dm',
        combatStats: { monsterContentId: 'goblin', cr: 0.25, ac: 15, hp: 7 },
      }),
    );
    expect(r.success).toBe(true);
  });

  it('accepte des relations PJ avec attitude', () => {
    const r = NpcSchema.safeParse(
      make({ relationships: [{ characterId: 'pj-1', attitude: 'hostile' }] }),
    );
    expect(r.success).toBe(true);
  });

  it('rejette un rôle hors énum', () => {
    expect(NpcSchema.safeParse(make({ role: 'wizard' as never })).success).toBe(false);
  });

  it('rejette une attitude hors énum', () => {
    const r = NpcSchema.safeParse(
      make({ relationships: [{ characterId: 'pj-1', attitude: 'allied' as never }] }),
    );
    expect(r.success).toBe(false);
  });

  it('rejette une visibilité hors énum', () => {
    expect(NpcSchema.safeParse(make({ visibility: 'players' as never })).success).toBe(
      false,
    );
  });

  it('rejette un nom vide', () => {
    expect(NpcSchema.safeParse(make({ name: '' })).success).toBe(false);
  });
});
