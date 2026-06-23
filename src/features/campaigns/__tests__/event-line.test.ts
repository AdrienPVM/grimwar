import { describe, expect, it } from 'vitest';

import type { GameEvent } from '@/shared/types/event';

import {
  eventCreatedAtToDate,
  formatEventTime,
  summarizeEvent,
} from '../event-line';

function ev(
  kind: GameEvent['kind'],
  payload: Record<string, unknown> = {},
): Pick<GameEvent, 'kind' | 'payload'> {
  return { kind, payload };
}

describe('summarizeEvent — identité du libellé + détail (FR)', () => {
  it('roll avec label + total', () => {
    expect(summarizeEvent(ev('roll', { label: 'Épée longue', total: 18 }))).toEqual({
      kindLabel: 'Jet de dés',
      detail: 'Épée longue · 18',
    });
  });

  it('roll avec total seul', () => {
    expect(summarizeEvent(ev('roll', { total: 12 }))).toEqual({
      kindLabel: 'Jet de dés',
      detail: '12',
    });
  });

  it('roll avec label seul', () => {
    expect(summarizeEvent(ev('roll', { label: 'Sauvegarde de Force' }))).toEqual({
      kindLabel: 'Jet de dés',
      detail: 'Sauvegarde de Force',
    });
  });

  it('hp-change before → after', () => {
    expect(summarizeEvent(ev('hp-change', { before: 28, after: 21 }))).toEqual({
      kindLabel: 'Points de vie',
      detail: '28 → 21',
    });
  });

  it('temp-hp', () => {
    expect(summarizeEvent(ev('temp-hp', { after: 5 }))).toEqual({
      kindLabel: 'PV temporaires',
      detail: '5',
    });
  });

  it('condition-add / condition-remove (sans détail — slug non affiché)', () => {
    expect(summarizeEvent(ev('condition-add', { conditionId: 'poisoned' }))).toEqual({
      kindLabel: 'État ajouté',
      detail: null,
    });
    expect(summarizeEvent(ev('condition-remove', { conditionId: 'poisoned' }))).toEqual({
      kindLabel: 'État retiré',
      detail: null,
    });
  });

  it('spell-cast niveau > 0 → « Niveau N »', () => {
    expect(summarizeEvent(ev('spell-cast', { spellId: 'fireball', level: 3 }))).toEqual({
      kindLabel: 'Sort lancé',
      detail: 'Niveau 3',
    });
  });

  it('spell-cast niveau 0 → « Sort mineur » (terme officiel cantrip)', () => {
    expect(summarizeEvent(ev('spell-cast', { spellId: 'light', level: 0 }))).toEqual({
      kindLabel: 'Sort lancé',
      detail: 'Sort mineur',
    });
  });

  it('slot-consumed → « Niveau N »', () => {
    expect(summarizeEvent(ev('slot-consumed', { slotLevel: 2 }))).toEqual({
      kindLabel: 'Emplacement consommé',
      detail: 'Niveau 2',
    });
  });

  it('slot-restored / item-acquired / item-removed (sans détail)', () => {
    expect(summarizeEvent(ev('slot-restored', {})).kindLabel).toBe('Emplacement récupéré');
    expect(summarizeEvent(ev('item-acquired', {})).kindLabel).toBe('Objet obtenu');
    expect(summarizeEvent(ev('item-removed', {})).kindLabel).toBe('Objet retiré');
  });

  it('dm-secret-roll → total', () => {
    expect(summarizeEvent(ev('dm-secret-roll', { total: 14 }))).toEqual({
      kindLabel: 'Jet secret du meneur',
      detail: '14',
    });
  });

  it('kind non mappé → libellé générique (jamais l’identifiant machine brut)', () => {
    const parts = summarizeEvent(ev('level-up', { newLevel: 5 }));
    expect(parts.kindLabel).toBe('Événement de jeu');
    expect(parts.detail).toBeNull();
    // Garde-fou : aucun identifiant machine ne fuit dans le rendu.
    expect(parts.kindLabel).not.toContain('level-up');
  });

  it('payload corrompu (types inattendus) → pas de crash, détail null', () => {
    expect(summarizeEvent(ev('roll', { label: 42, total: 'oops' }))).toEqual({
      kindLabel: 'Jet de dés',
      detail: null,
    });
    expect(summarizeEvent(ev('hp-change', { before: null, after: undefined }))).toEqual({
      kindLabel: 'Points de vie',
      detail: null,
    });
  });
});

describe('eventCreatedAtToDate — narrow du Timestamp', () => {
  it('accepte une Date', () => {
    const d = new Date(2026, 5, 23, 14, 5);
    expect(eventCreatedAtToDate(d)).toBe(d);
  });

  it('accepte un nombre de ms', () => {
    const ms = Date.UTC(2026, 5, 23, 12, 0);
    expect(eventCreatedAtToDate(ms)?.getTime()).toBe(ms);
  });

  it('accepte un Timestamp Firestore (.toDate())', () => {
    const d = new Date(2026, 5, 23, 9, 30);
    expect(eventCreatedAtToDate({ toDate: () => d })).toBe(d);
  });

  it('null / objet sans toDate → null', () => {
    expect(eventCreatedAtToDate(null)).toBeNull();
    expect(eventCreatedAtToDate(undefined)).toBeNull();
    expect(eventCreatedAtToDate({ seconds: 1 })).toBeNull();
  });
});

describe('formatEventTime', () => {
  it('rend HH:mm pour une Date locale', () => {
    expect(formatEventTime(new Date(2026, 0, 1, 14, 5))).toBe('14:05');
  });

  it('rend "" quand le timestamp n’est pas encore résolu (serverTimestamp local null)', () => {
    expect(formatEventTime(null)).toBe('');
  });
});
