import { describe, expect, it } from 'vitest';

import type { EncounterParticipant } from '@/shared/types/encounter';
import type { GameEvent } from '@/shared/types/event';

import { deriveHandoffRows, HANDOFF_TTL_MS } from '../encounter-handoff';

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

const NOW = 1_700_000_000_000;

function mkEvent(overrides: Partial<GameEvent> = {}): GameEvent {
  return {
    id: 'ev-1',
    kind: 'roll',
    actorUserId: 'uid-player',
    actorCharacterId: 'char-a',
    targetCharacterId: null,
    sessionId: null,
    encounterId: 'e-1',
    visibility: 'all',
    createdAt: NOW,
    payload: {
      label: 'Épée longue',
      rollKind: 'damage',
      mode: 'physical',
      total: 11,
    },
    ...overrides,
  };
}

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

const EMPTY = new Set<string>();

// ─────────────────────────────────────────────────────────────────────
// Suites
// ─────────────────────────────────────────────────────────────────────

describe('deriveHandoffRows — filtrage', () => {
  it('garde un jet de dégâts physique et résout l’acteur via la fiche liée', () => {
    const rows = deriveHandoffRows([mkEvent()], [mkParticipant()], EMPTY, NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      eventId: 'ev-1',
      actorName: 'Lyralei',
      weaponLabel: 'Épée longue',
      rollKind: 'damage',
      total: 11,
    });
  });

  it('garde un jet d’attaque physique (informatif)', () => {
    const ev = mkEvent({ payload: { rollKind: 'attack', mode: 'physical', total: 17, label: 'Arc' } });
    const rows = deriveHandoffRows([ev], [mkParticipant()], EMPTY, NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.rollKind).toBe('attack');
    expect(rows[0]?.total).toBe(17);
  });

  // M4 — le mode de dés n'est plus un critère. Une table en dés numériques
  // devait auparavant lire le total dans le journal puis le retaper à la main
  // dans la modale de contrôle, alors que le payload est identique.
  it('garde AUSSI les jets numériques — même payload, même geste du MJ', () => {
    const ev = mkEvent({
      payload: { rollKind: 'damage', mode: 'digital', total: 11, label: 'Épée longue' },
    });
    const rows = deriveHandoffRows([ev], [mkParticipant()], EMPTY, NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.total).toBe(11);
    expect(rows[0]?.weaponLabel).toBe('Épée longue');
  });

  it('garde un jet d’attaque numérique (informatif)', () => {
    const ev = mkEvent({ payload: { rollKind: 'attack', mode: 'digital', total: 19, label: 'Arc' } });
    const rows = deriveHandoffRows([ev], [mkParticipant()], EMPTY, NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.rollKind).toBe('attack');
  });

  it('exclut un jet numérique hors combat (le mode n’ouvre pas la vanne)', () => {
    const ev = mkEvent({ payload: { rollKind: 'check', mode: 'digital', total: 14, label: 'x' } });
    expect(deriveHandoffRows([ev], [mkParticipant()], EMPTY, NOW)).toHaveLength(0);
  });

  it('exclut les rollKind non combat (check / save / init)', () => {
    const check = mkEvent({ payload: { rollKind: 'check', mode: 'physical', total: 14, label: 'x' } });
    const save = mkEvent({ payload: { rollKind: 'save', mode: 'physical', total: 9, label: 'x' } });
    expect(deriveHandoffRows([check, save], [mkParticipant()], EMPTY, NOW)).toHaveLength(0);
  });

  it('exclut les events non-roll (monster-hp-change, turn-start…)', () => {
    const ev = mkEvent({ kind: 'monster-hp-change' });
    expect(deriveHandoffRows([ev], [mkParticipant()], EMPTY, NOW)).toHaveLength(0);
  });

  it('exclut un event sans total numérique', () => {
    const ev = mkEvent({ payload: { rollKind: 'damage', mode: 'physical', label: 'x' } });
    expect(deriveHandoffRows([ev], [mkParticipant()], EMPTY, NOW)).toHaveLength(0);
  });
});

describe('deriveHandoffRows — TTL', () => {
  it('exclut un jet plus vieux que le TTL', () => {
    const old = mkEvent({ id: 'old', createdAt: NOW - HANDOFF_TTL_MS - 1 });
    expect(deriveHandoffRows([old], [mkParticipant()], EMPTY, NOW)).toHaveLength(0);
  });

  it('garde un jet juste dans la fenêtre TTL', () => {
    const fresh = mkEvent({ id: 'fresh', createdAt: NOW - HANDOFF_TTL_MS + 1 });
    expect(deriveHandoffRows([fresh], [mkParticipant()], EMPTY, NOW)).toHaveLength(1);
  });

  it('garde un jet dont le timestamp serveur n’est pas encore résolu (createdAt null)', () => {
    const pending = mkEvent({ id: 'pending', createdAt: null });
    expect(deriveHandoffRows([pending], [mkParticipant()], EMPTY, NOW)).toHaveLength(1);
  });
});

describe('deriveHandoffRows — dismiss & résolution acteur', () => {
  it('exclut un event ignoré localement', () => {
    const rows = deriveHandoffRows([mkEvent()], [mkParticipant()], new Set(['ev-1']), NOW);
    expect(rows).toHaveLength(0);
  });

  it('actorName = null quand actorCharacterId ne correspond à aucun participant', () => {
    const ev = mkEvent({ actorCharacterId: 'char-inconnu' });
    const rows = deriveHandoffRows([ev], [mkParticipant()], EMPTY, NOW);
    expect(rows[0]?.actorName).toBeNull();
  });

  it('actorName = null quand actorCharacterId est null (action non-joueur)', () => {
    const ev = mkEvent({ actorCharacterId: null });
    const rows = deriveHandoffRows([ev], [mkParticipant()], EMPTY, NOW);
    expect(rows[0]?.actorName).toBeNull();
  });

  it('préserve l’ordre du feed (createdAt desc déjà appliqué par la query)', () => {
    const a = mkEvent({ id: 'a', payload: { rollKind: 'damage', mode: 'physical', total: 3, label: 'a' } });
    const b = mkEvent({ id: 'b', payload: { rollKind: 'damage', mode: 'physical', total: 8, label: 'b' } });
    const rows = deriveHandoffRows([a, b], [mkParticipant()], EMPTY, NOW);
    expect(rows.map((r) => r.eventId)).toEqual(['a', 'b']);
  });
});
