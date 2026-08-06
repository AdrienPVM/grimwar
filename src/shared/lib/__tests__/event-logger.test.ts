import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RollResult } from '../dice/types';

/**
 * Tests du point d'entrée unique du journal (plan 22). On mock `firebase/
 * firestore` + `getDb` (cf. campaigns.test.ts) et on pilote les vrais stores
 * Zustand via `setState`. On vérifie :
 *   - no-op silencieux sans campagne active,
 *   - no-op silencieux sans utilisateur,
 *   - écriture au bon chemin avec le bon payload quand les deux sont présents,
 *   - une erreur d'écriture ne remonte jamais (best-effort).
 */

const addDocMock = vi.fn();
const collectionMock = vi.fn((_db: unknown, ...path: string[]) => ({ __path: path }));
const serverTimestampMock = vi.fn(() => '__server-ts__');
const docMock = vi.fn((_db: unknown, ...path: string[]) => ({ __doc: path }));
const updateDocMock = vi.fn();
const incrementMock = vi.fn((n: number) => ({ __inc: n }));

vi.mock('firebase/firestore', () => ({
  addDoc: (...args: unknown[]) => addDocMock(...args),
  collection: (...args: unknown[]) =>
    collectionMock(...(args as [unknown, ...string[]])),
  serverTimestamp: () => serverTimestampMock(),
  doc: (...args: unknown[]) => docMock(...(args as [unknown, ...string[]])),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  increment: (n: number) => incrementMock(n),
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({ __type: 'mock-db' }),
}));

import {
  logCharacterDiff,
  logDeath,
  logDmEdit,
  logEncounterEnd,
  logEncounterStart,
  logLevelUp,
  logMonsterHpChange,
  logRest,
  logRevival,
  logRoll,
  logRollIfCampaign,
  logSessionEnd,
  logSessionStart,
  logSpellCast,
  logTurnStart,
} from '../event-logger';
import type { Character } from '@/shared/types/character';
import { useActiveCampaignStore } from '../slices/active-campaign-slice';
import { useAuthStore } from '../slices/auth-slice';

const ROLL: RollResult = {
  kind: 'attack',
  label: 'Épée longue',
  mode: 'digital',
  dice: [{ count: 1, sides: 20 }],
  rawFaces: [18],
  keptFaces: [18],
  modifier: 5,
  total: 23,
  crit: false,
  fumble: false,
  advantage: 'normal',
  characterId: 'char-1',
  timestamp: 0,
};

const AUTH_USER = {
  uid: 'user-alice',
  displayName: null,
  email: null,
  emailVerified: false,
  photoURL: null,
  isAnonymous: false,
};

beforeEach(() => {
  addDocMock.mockReset().mockResolvedValue({ id: 'evt-1' });
  collectionMock.mockClear();
  serverTimestampMock.mockClear();
  docMock.mockClear();
  updateDocMock.mockReset().mockResolvedValue(undefined);
  incrementMock.mockClear();
  useActiveCampaignStore.getState().clearActiveCampaign();
  useAuthStore.getState().setUser(null);
});

describe('event-logger — gardes no-op', () => {
  it('no-op sans campagne active (fiche non liée / S1)', async () => {
    useAuthStore.getState().setUser(AUTH_USER);
    await logRoll(ROLL);
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('no-op sans utilisateur connecté', async () => {
    useActiveCampaignStore.getState().setActiveCampaign('camp-1');
    await logRoll(ROLL);
    expect(addDocMock).not.toHaveBeenCalled();
  });
});

describe('event-logger — écriture jet', () => {
  beforeEach(() => {
    useActiveCampaignStore.getState().setActiveCampaign('camp-1');
    useAuthStore.getState().setUser(AUTH_USER);
  });

  it('écrit dans campaigns/{id}/events', async () => {
    await logRoll(ROLL);
    expect(collectionMock).toHaveBeenCalledWith(
      { __type: 'mock-db' },
      'campaigns',
      'camp-1',
      'events',
    );
    expect(addDocMock).toHaveBeenCalledTimes(1);
  });

  it('pose actorUserId = uid courant et createdAt = serverTimestamp()', async () => {
    await logRoll(ROLL);
    const written = addDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(written.actorUserId).toBe('user-alice');
    expect(written.createdAt).toBe('__server-ts__');
    expect(written.kind).toBe('roll');
    expect(written.visibility).toBe('all');
    expect(written.actorCharacterId).toBe('char-1');
  });

  it('le payload porte mode + faces + total + flags', async () => {
    await logRoll(ROLL);
    const written = addDocMock.mock.calls[0]![1] as { payload: Record<string, unknown> };
    expect(written.payload).toMatchObject({
      label: 'Épée longue',
      rollKind: 'attack',
      mode: 'digital',
      rawFaces: [18],
      keptFaces: [18],
      total: 23,
      crit: false,
      fumble: false,
      advantage: 'normal',
    });
  });

  it('characterId vide → actorCharacterId null', async () => {
    await logRoll({ ...ROLL, characterId: '' });
    const written = addDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(written.actorCharacterId).toBeNull();
  });

  it('sessionId = activeSessionId du store', async () => {
    useActiveCampaignStore.getState().setActiveCampaign('camp-1', 'sess-9');
    await logRoll(ROLL);
    const written = addDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(written.sessionId).toBe('sess-9');
  });

  it('une erreur d’écriture ne remonte jamais (best-effort)', async () => {
    addDocMock.mockRejectedValueOnce(new Error('permission-denied'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(logRoll(ROLL)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('logRollIfCampaign délègue à logRoll', async () => {
    await logRollIfCampaign(ROLL);
    expect(addDocMock).toHaveBeenCalledTimes(1);
  });
});

describe('event-logger — compteurs de stats (plan 22.2)', () => {
  beforeEach(() => {
    useActiveCampaignStore.getState().setActiveCampaign('camp-1');
    useAuthStore.getState().setUser(AUTH_USER);
  });

  it('cible users/{uid}/characters/{cid} avec totalRolls + totalD20Sum sur un jet d20', async () => {
    await logRoll(ROLL); // attack, keptFaces [18], pas de crit/fumble
    expect(docMock).toHaveBeenCalledWith(
      { __type: 'mock-db' },
      'users',
      'user-alice',
      'characters',
      'char-1',
    );
    const updates = updateDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(updates['stats.totalRolls']).toEqual({ __inc: 1 });
    expect(updates['stats.totalD20Sum']).toEqual({ __inc: 18 });
    expect(updates).not.toHaveProperty('stats.crits');
    expect(updates).not.toHaveProperty('stats.fumbles');
  });

  it('un crit incrémente stats.crits ; un fumble incrémente stats.fumbles', async () => {
    await logRoll({ ...ROLL, crit: true, keptFaces: [20], total: 25 });
    let updates = updateDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(updates['stats.crits']).toEqual({ __inc: 1 });
    expect(updates['stats.totalD20Sum']).toEqual({ __inc: 20 });

    updateDocMock.mockClear();
    await logRoll({ ...ROLL, fumble: true, keptFaces: [1], total: 6 });
    updates = updateDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(updates['stats.fumbles']).toEqual({ __inc: 1 });
  });

  it('un jet de dégâts compte dans totalRolls mais PAS dans totalD20Sum', async () => {
    await logRoll({ ...ROLL, kind: 'damage', keptFaces: [3, 5, 6], total: 14, crit: false });
    const updates = updateDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(updates['stats.totalRolls']).toEqual({ __inc: 1 });
    expect(updates).not.toHaveProperty('stats.totalD20Sum');
  });

  it('un jet de compétence incrémente stats.skillUses[skillId]', async () => {
    await logRoll({ ...ROLL, kind: 'check', skillId: 'athletics', keptFaces: [12], total: 17 });
    const updates = updateDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(updates['stats.skillUses.athletics']).toEqual({ __inc: 1 });
    expect(updates['stats.totalD20Sum']).toEqual({ __inc: 12 });
  });

  it('pas de campagne active → aucune écriture de stats', async () => {
    useActiveCampaignStore.getState().clearActiveCampaign();
    await logRoll(ROLL);
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('characterId vide → pas de cible → aucune écriture de stats', async () => {
    await logRoll({ ...ROLL, characterId: '' });
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('un échec de mise à jour des stats ne remonte jamais', async () => {
    updateDocMock.mockRejectedValueOnce(new Error('boom'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(logRoll(ROLL)).resolves.toBeUndefined();
    warn.mockRestore();
  });
});

describe('event-logger — logSpellCast (plan 22.2)', () => {
  beforeEach(() => {
    useActiveCampaignStore.getState().setActiveCampaign('camp-1');
    useAuthStore.getState().setUser(AUTH_USER);
  });

  it('écrit un événement spell-cast avec spellId / level / slotConsumed / components', async () => {
    await logSpellCast({
      characterId: 'char-1',
      spellId: 'fireball',
      level: 3,
      slotConsumed: 3,
      components: { v: true, s: true, m: true },
    });
    const written = addDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(written.kind).toBe('spell-cast');
    expect(written.visibility).toBe('all');
    expect(written.actorCharacterId).toBe('char-1');
    expect(written.payload).toMatchObject({
      spellId: 'fireball',
      level: 3,
      slotConsumed: 3,
      components: { v: true, s: true, m: true },
    });
  });

  it('un sort mineur porte slotConsumed null', async () => {
    await logSpellCast({
      characterId: 'char-1',
      spellId: 'fire-bolt',
      level: 0,
      slotConsumed: null,
      components: { v: true, s: true, m: false },
    });
    const written = addDocMock.mock.calls[0]![1] as { payload: Record<string, unknown> };
    expect(written.payload.slotConsumed).toBeNull();
  });
});

describe('event-logger — logSessionStart / logSessionEnd (plan 23.4)', () => {
  beforeEach(() => {
    useActiveCampaignStore.getState().setActiveCampaign('camp-1', 'sess-1');
    useAuthStore.getState().setUser(AUTH_USER);
  });

  it('logSessionStart écrit kind session-start, visibilité all, sessionId explicite, acteur null', async () => {
    await logSessionStart('sess-1', { sessionNumber: 3, title: 'L’embuscade' });
    const written = addDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(written.kind).toBe('session-start');
    expect(written.visibility).toBe('all');
    expect(written.actorCharacterId).toBeNull();
    expect(written.sessionId).toBe('sess-1');
    expect(written.payload).toMatchObject({ sessionNumber: 3, title: 'L’embuscade' });
  });

  it('logSessionEnd écrit kind session-end avec le bon payload', async () => {
    await logSessionEnd('sess-1', { sessionNumber: 3, title: 'L’embuscade' });
    const written = addDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(written.kind).toBe('session-end');
    expect(written.sessionId).toBe('sess-1');
    expect(written.payload).toMatchObject({ sessionNumber: 3, title: 'L’embuscade' });
  });

  it('no-op sans campagne active (pointeur non posé)', async () => {
    useActiveCampaignStore.getState().clearActiveCampaign();
    await logSessionStart('sess-1', { sessionNumber: 1, title: 'X' });
    expect(addDocMock).not.toHaveBeenCalled();
  });
});

describe('event-logger — rencontres (plan 24)', () => {
  beforeEach(() => {
    useActiveCampaignStore.getState().setActiveCampaign('camp-1', 'sess-1');
    useAuthStore.getState().setUser(AUTH_USER);
  });

  it('logEncounterStart écrit kind encounter-start, visibilité all, encounterId explicite, acteur null', async () => {
    await logEncounterStart('enc-1', { name: 'Embuscade', participantCount: 4 });
    const written = addDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(written.kind).toBe('encounter-start');
    expect(written.visibility).toBe('all');
    expect(written.actorCharacterId).toBeNull();
    expect(written.encounterId).toBe('enc-1');
    expect(written.payload).toMatchObject({ name: 'Embuscade', participantCount: 4 });
  });

  it('logEncounterEnd porte l’issue dans le payload', async () => {
    await logEncounterEnd('enc-1', { name: 'Embuscade', outcome: 'victory' });
    const written = addDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(written.kind).toBe('encounter-end');
    expect(written.encounterId).toBe('enc-1');
    expect(written.payload).toMatchObject({ name: 'Embuscade', outcome: 'victory' });
  });

  it('logTurnStart porte le participant actif et le round', async () => {
    await logTurnStart('enc-1', { participantId: 'm1', participantName: 'Gobelin', round: 2 });
    const written = addDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(written.kind).toBe('turn-start');
    expect(written.visibility).toBe('all');
    expect(written.payload).toMatchObject({
      participantId: 'm1',
      participantName: 'Gobelin',
      round: 2,
    });
  });

  it('logMonsterHpChange est visibilité dm et calcule delta', async () => {
    await logMonsterHpChange('enc-1', {
      monsterInstanceId: 'm1',
      monsterName: 'Gobelin',
      before: 7,
      after: 0,
    });
    const written = addDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(written.kind).toBe('monster-hp-change');
    expect(written.visibility).toBe('dm');
    expect(written.payload).toMatchObject({
      monsterInstanceId: 'm1',
      monsterName: 'Gobelin',
      before: 7,
      after: 0,
      delta: -7,
    });
  });
});

describe('event-logger — logCharacterDiff (plan 22.2)', () => {
  // Fiche minimale : seuls les champs lus par le diff comptent.
  const BEFORE = {
    hp: { current: 18, max: 18, temp: 0 },
    conditions: [],
    spellSlots: { '1': { max: 4, current: 4 } },
    inventory: { items: [], coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 }, weightCache: 0 },
  } as unknown as Character;

  beforeEach(() => {
    useActiveCampaignStore.getState().setActiveCampaign('camp-1');
    useAuthStore.getState().setUser(AUTH_USER);
  });

  it('écrit un événement par diff (dégât → un hp-change)', async () => {
    await logCharacterDiff(BEFORE, { hp: { current: 12, max: 18, temp: 0 } }, 'char-1');
    expect(addDocMock).toHaveBeenCalledTimes(1);
    const written = addDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(written.kind).toBe('hp-change');
    expect(written.payload).toMatchObject({ before: 18, after: 12, delta: -6 });
  });

  it('un patch sans changement pertinent → aucune écriture', async () => {
    await logCharacterDiff(BEFORE, { inspiration: true } as Partial<Character>, 'char-1');
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('no-op silencieux hors campagne active', async () => {
    useActiveCampaignStore.getState().clearActiveCampaign();
    await logCharacterDiff(BEFORE, { hp: { current: 1, max: 18, temp: 0 } }, 'char-1');
    expect(addDocMock).not.toHaveBeenCalled();
  });
});

describe('event-logger — logDmEdit (plan 26)', () => {
  const BEFORE = {
    status: 'alive',
    alignment: 'LB',
    exhaustion: 0,
    inspiration: false,
    ac: 15,
    speed: 9,
    initiative: 2,
    totalLevel: 3,
    hp: { current: 18, max: 18, temp: 0 },
    conditions: [],
  } as unknown as Character;

  beforeEach(() => {
    useActiveCampaignStore.getState().setActiveCampaign('camp-1');
    useAuthStore.getState().setUser(AUTH_USER);
  });

  it('écrit UN seul event dm-edit, visibilité all, acteur null, cible = characterId', async () => {
    await logDmEdit(BEFORE, { status: 'dead' } as Partial<Character>, 'char-9');
    expect(addDocMock).toHaveBeenCalledTimes(1);
    const written = addDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(written.kind).toBe('dm-edit');
    expect(written.visibility).toBe('all');
    expect(written.actorCharacterId).toBeNull();
    expect(written.targetCharacterId).toBe('char-9');
  });

  it('fieldsChanged liste les champs touchés ; changes porte le before/after scalaire', async () => {
    await logDmEdit(BEFORE, { status: 'dead' } as Partial<Character>, 'char-9');
    const written = addDocMock.mock.calls[0]![1] as { payload: Record<string, unknown> };
    expect(written.payload.fieldsChanged).toEqual(['status']);
    expect(written.payload.changes).toEqual({
      status: { before: 'alive', after: 'dead' },
    });
  });

  it('un gros champ (hp objet) est listé par nom mais SANS snapshot scalaire', async () => {
    await logDmEdit(BEFORE, { hp: { current: 0, max: 18, temp: 0 } } as Partial<Character>, 'char-9');
    const written = addDocMock.mock.calls[0]![1] as { payload: Record<string, unknown> };
    expect(written.payload.fieldsChanged).toEqual(['hp']);
    expect(written.payload.changes).toEqual({}); // objet → pas de before/after scalaire
  });

  it('un booléen scalaire est capturé (inspiration false → true)', async () => {
    await logDmEdit(BEFORE, { inspiration: true } as Partial<Character>, 'char-9');
    const written = addDocMock.mock.calls[0]![1] as { payload: Record<string, unknown> };
    expect(written.payload.changes).toEqual({
      inspiration: { before: false, after: true },
    });
  });

  it('plafonne les snapshots à 5 champs scalaires (6 changés → 5 capturés)', async () => {
    await logDmEdit(
      BEFORE,
      {
        status: 'dead',
        alignment: 'CN',
        exhaustion: 2,
        ac: 17,
        speed: 12,
        initiative: 4,
      } as Partial<Character>,
      'char-9',
    );
    const written = addDocMock.mock.calls[0]![1] as { payload: Record<string, unknown> };
    expect((written.payload.fieldsChanged as string[]).length).toBe(6);
    expect(Object.keys(written.payload.changes as object).length).toBe(5);
  });

  it('ignore les champs d’intendance updatedAt/updatedBy', async () => {
    await logDmEdit(
      BEFORE,
      { status: 'dead', updatedBy: 'gm-1', updatedAt: 1 } as unknown as Partial<Character>,
      'char-9',
    );
    const written = addDocMock.mock.calls[0]![1] as { payload: Record<string, unknown> };
    expect(written.payload.fieldsChanged).toEqual(['status']);
  });

  it('aucun champ pertinent changé → aucune écriture', async () => {
    await logDmEdit(BEFORE, { status: 'alive' } as Partial<Character>, 'char-9');
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('no-op silencieux hors campagne active', async () => {
    useActiveCampaignStore.getState().clearActiveCampaign();
    await logDmEdit(BEFORE, { status: 'dead' } as Partial<Character>, 'char-9');
    expect(addDocMock).not.toHaveBeenCalled();
  });
});

/**
 * M44 — jalons de vie du personnage. Ces quatre kinds étaient déclarés au
 * schéma et documentés dans EVENT-LOG.md sans qu'aucun logger ne les écrive.
 * On vérifie le CHEMIN d'écriture, le kind, la visibilité et l'identité exacte
 * du payload — un payload approximatif rendrait une prose fausse côté journal.
 */
describe('event-logger — jalons de vie (M44)', () => {
  beforeEach(() => {
    useActiveCampaignStore.getState().setActiveCampaign('camp-1');
    useAuthStore.getState().setUser(AUTH_USER);
  });

  /** Le document réellement passé à `addDoc`. */
  function written(): Record<string, unknown> {
    return addDocMock.mock.calls[0]![1] as Record<string, unknown>;
  }

  it('level-up : payload complet, acteur ET cible = le personnage', async () => {
    await logLevelUp('char-7', {
      newTotalLevel: 5,
      classId: 'rogue',
      className: 'Roublard',
      classLevel: 1,
      isNewClass: true,
    });
    const doc = written();
    expect(doc.kind).toBe('level-up');
    expect(doc.visibility).toBe('all');
    expect(doc.actorCharacterId).toBe('char-7');
    expect(doc.targetCharacterId).toBe('char-7');
    expect(doc.payload).toEqual({
      newLevel: 5,
      classId: 'rogue',
      className: 'Roublard',
      classLevel: 1,
      isNewClass: true,
    });
  });

  it('death : la cause distingue les sauvegardes ratées de la décision du meneur', async () => {
    await logDeath('char-7', 'death-saves');
    expect(written().kind).toBe('death');
    expect(written().payload).toEqual({ cause: 'death-saves' });
  });

  it('revival : la source distingue le 20 naturel du bouton meneur', async () => {
    await logRevival('char-7', 'nat20');
    expect(written().kind).toBe('revival');
    expect(written().payload).toEqual({ source: 'nat20' });
  });

  it('rest : bilan chiffré normalisé à 0 quand l’appelant ne le fournit pas', async () => {
    await logRest('char-7', 'short');
    expect(written().kind).toBe('rest');
    // Un repos court ne soigne rien — 0 est la vérité, pas un champ manquant.
    expect(written().payload).toEqual({ type: 'short', hpHealed: 0, resourcesReset: 0 });
  });

  it('rest long : le bilan passe tel quel dans le payload', async () => {
    await logRest('char-7', 'long', { hpHealed: 12, resourcesReset: 3 });
    expect(written().payload).toEqual({ type: 'long', hpHealed: 12, resourcesReset: 3 });
  });

  it('écrit dans la sous-collection events de la campagne active', async () => {
    await logRest('char-7', 'long', { hpHealed: 1 });
    expect(collectionMock).toHaveBeenCalledWith(expect.anything(), 'campaigns', 'camp-1', 'events');
  });

  it('no-op silencieux hors campagne active', async () => {
    useActiveCampaignStore.getState().clearActiveCampaign();
    await logLevelUp('char-7', {
      newTotalLevel: 2,
      classId: 'rogue',
      className: 'Roublard',
      classLevel: 2,
      isNewClass: false,
    });
    await logDeath('char-7', 'dm');
    await logRevival('char-7', 'dm');
    await logRest('char-7', 'short');
    expect(addDocMock).not.toHaveBeenCalled();
  });
});
