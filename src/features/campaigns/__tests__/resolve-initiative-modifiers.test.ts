import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EncounterParticipant } from '@/shared/types/encounter';

import type { LinkedMember } from '../use-encounter-party-draft';

// ─────────────────────────────────────────────────────────────────────
// Mocks Firestore — `doc()` porte le chemin, `getDoc()` lit un registre par
// `ownerUid/characterId`. Pas d'émulateur : on teste la logique de résolution.
// ─────────────────────────────────────────────────────────────────────

interface FakeSnap {
  exists: () => boolean;
  data: () => Record<string, unknown>;
}

const registry = new Map<string, Record<string, unknown> | null>();
let getDocImpl: (key: string) => Promise<FakeSnap> = async (key) => {
  const data = registry.get(key) ?? null;
  return {
    exists: () => data !== null,
    data: () => data ?? {},
  };
};

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...path: string[]) => ({ key: `${path[1]}/${path[3]}` }),
  getDoc: (ref: { key: string }) => getDocImpl(ref.key),
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({ __type: 'mock-db' }),
}));

import { resolveInitiativeModifiers } from '../resolve-initiative-modifiers';

function mkParticipant(overrides: Partial<EncounterParticipant> = {}): EncounterParticipant {
  return {
    type: 'player',
    characterId: 'char-a',
    monsterContentId: null,
    instanceId: 'inst-a',
    name: 'Lyralei',
    initiative: 0,
    currentHp: 20,
    maxHp: 20,
    tempHp: 0,
    conditions: [],
    position: null,
    notes: '',
    ...overrides,
  };
}

beforeEach(() => {
  registry.clear();
  getDocImpl = async (key) => {
    const data = registry.get(key) ?? null;
    return { exists: () => data !== null, data: () => data ?? {} };
  };
});

describe('resolveInitiativeModifiers', () => {
  it('résout le modificateur joueur depuis `character.initiative` de la fiche liée', async () => {
    registry.set('p-a/char-a', { name: 'Lyralei', initiative: 3 });
    const members: LinkedMember[] = [{ userId: 'p-a', characterId: 'char-a' }];
    const map = await resolveInitiativeModifiers([mkParticipant()], members);
    expect(map.get('inst-a')).toBe(3);
  });

  it('gère un modificateur négatif (DEX faible)', async () => {
    registry.set('p-a/char-a', { initiative: -1 });
    const members: LinkedMember[] = [{ userId: 'p-a', characterId: 'char-a' }];
    const map = await resolveInitiativeModifiers([mkParticipant()], members);
    expect(map.get('inst-a')).toBe(-1);
  });

  it('monstre → modificateur 0 (pas de fiche)', async () => {
    const monster = mkParticipant({
      type: 'monster',
      characterId: null,
      monsterContentId: null,
      instanceId: 'inst-gob',
      name: 'Gobelin 1',
    });
    const map = await resolveInitiativeModifiers([monster], []);
    expect(map.get('inst-gob')).toBe(0);
  });

  // M3 — jusqu'ici tout non-joueur lançait à +0, quelle que soit sa DEX.
  it('monstre lié au bestiaire → mod de DEX de sa fiche de créature', async () => {
    const gobelin = mkParticipant({
      type: 'monster',
      characterId: null,
      monsterContentId: 'goblin',
      instanceId: 'inst-gob',
      name: 'Gobelin 1',
    });
    const map = await resolveInitiativeModifiers([gobelin], [], new Map([['goblin', 2]]));
    expect(map.get('inst-gob')).toBe(2);
  });

  it('PNJ lié au bestiaire → même dérivation que les monstres', async () => {
    const npc = mkParticipant({
      type: 'npc',
      characterId: null,
      monsterContentId: 'bandit-captain',
      instanceId: 'inst-npc',
      name: 'Aldric',
    });
    const map = await resolveInitiativeModifiers([npc], [], new Map([['bandit-captain', 3]]));
    expect(map.get('inst-npc')).toBe(3);
  });

  it('slug absent du bestiaire chargé → 0 (le MJ ajuste l’initiative en place)', async () => {
    const gobelin = mkParticipant({
      type: 'monster',
      characterId: null,
      monsterContentId: 'goblin',
      instanceId: 'inst-gob',
    });
    const map = await resolveInitiativeModifiers([gobelin], [], new Map([['ogre', 1]]));
    expect(map.get('inst-gob')).toBe(0);
  });

  it('joueur absent du roster lié → 0 (pas de jointure possible)', async () => {
    registry.set('p-a/char-a', { initiative: 5 });
    // members vide : characterId non joignable à un ownerUid.
    const map = await resolveInitiativeModifiers([mkParticipant()], []);
    expect(map.get('inst-a')).toBe(0);
  });

  it('fiche introuvable → 0', async () => {
    // registry vide : getDoc renvoie exists()=false.
    const members: LinkedMember[] = [{ userId: 'p-a', characterId: 'char-a' }];
    const map = await resolveInitiativeModifiers([mkParticipant()], members);
    expect(map.get('inst-a')).toBe(0);
  });

  it('`initiative` non numérique → 0 (extraction défensive)', async () => {
    registry.set('p-a/char-a', { initiative: 'oops' });
    const members: LinkedMember[] = [{ userId: 'p-a', characterId: 'char-a' }];
    const map = await resolveInitiativeModifiers([mkParticipant()], members);
    expect(map.get('inst-a')).toBe(0);
  });

  it('une lecture qui throw est isolée → ce participant tombe à 0, les autres résolvent', async () => {
    registry.set('p-b/char-b', { initiative: 2 });
    getDocImpl = async (key) => {
      if (key === 'p-a/char-a') throw new Error('permission-denied');
      const data = registry.get(key) ?? null;
      return { exists: () => data !== null, data: () => data ?? {} };
    };
    const members: LinkedMember[] = [
      { userId: 'p-a', characterId: 'char-a' },
      { userId: 'p-b', characterId: 'char-b' },
    ];
    const participants = [
      mkParticipant(),
      mkParticipant({ characterId: 'char-b', instanceId: 'inst-b', name: 'Borin' }),
    ];
    const map = await resolveInitiativeModifiers(participants, members);
    expect(map.get('inst-a')).toBe(0);
    expect(map.get('inst-b')).toBe(2);
  });
});
