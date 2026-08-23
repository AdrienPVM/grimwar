import { describe, expect, it } from 'vitest';

import type { GameEvent } from '@/shared/types/event';

import { filterJournalEvents } from '../compile-session-journal';

/**
 * Cadrage du récit (M14) — la seule pièce qui décide de ce qui entre dans le
 * journal. Fonction PURE : le compilateur, lui, ne connaît rien de ces options.
 *
 * L'invariant capital est le DÉFAUT : sans options, le filtre ne doit rien
 * retirer, sinon tous les journaux déjà compilés changeraient de contenu à la
 * prochaine re-compilation.
 */

function mkEvent(over: Partial<GameEvent> = {}): GameEvent {
  return {
    id: 'e-1',
    kind: 'roll',
    actorUid: 'u-1',
    characterId: null,
    sessionId: 's-1',
    encounterId: null,
    visibility: 'all',
    payload: {},
    createdAt: null,
    ...over,
  } as GameEvent;
}

const EVENTS: GameEvent[] = [
  mkEvent({ id: 'e-roll', kind: 'roll' }),
  mkEvent({ id: 'e-mhp', kind: 'monster-hp-change' }),
  mkEvent({ id: 'e-hp', kind: 'hp-change' }),
  mkEvent({ id: 'e-secret', kind: 'dm-secret-roll', visibility: 'dm' }),
];

const ids = (events: GameEvent[]): string[] => events.map((e) => e.id);

describe('filterJournalEvents (M14)', () => {
  it('sans options : ne retire RIEN (zéro régression sur les journaux existants)', () => {
    expect(ids(filterJournalEvents(EVENTS))).toEqual([
      'e-roll',
      'e-mhp',
      'e-hp',
      'e-secret',
    ]);
  });

  it('objet d’options vide : identique au défaut', () => {
    expect(ids(filterJournalEvents(EVENTS, {}))).toHaveLength(4);
  });

  it('exclut les jets de dés sans toucher au reste', () => {
    expect(ids(filterJournalEvents(EVENTS, { excludedKinds: ['roll'] }))).toEqual([
      'e-mhp',
      'e-hp',
      'e-secret',
    ]);
  });

  it('exclut plusieurs kinds à la fois', () => {
    expect(
      ids(filterJournalEvents(EVENTS, { excludedKinds: ['roll', 'monster-hp-change'] })),
    ).toEqual(['e-hp', 'e-secret']);
  });

  it('includeDmOnly=false retire les coulisses du meneur, PAS les events de table', () => {
    expect(ids(filterJournalEvents(EVENTS, { includeDmOnly: false }))).toEqual([
      'e-roll',
      'e-mhp',
      'e-hp',
    ]);
  });

  it('les deux filtres se cumulent', () => {
    expect(
      ids(
        filterJournalEvents(EVENTS, {
          excludedKinds: ['roll', 'monster-hp-change'],
          includeDmOnly: false,
        }),
      ),
    ).toEqual(['e-hp']);
  });

  it('ne mute pas la liste d’entrée', () => {
    const input = [...EVENTS];
    filterJournalEvents(input, { excludedKinds: ['roll'] });
    expect(input).toHaveLength(4);
  });

  it('tout exclure produit une liste vide, pas une erreur', () => {
    expect(
      filterJournalEvents(EVENTS, {
        excludedKinds: ['roll', 'monster-hp-change', 'hp-change'],
        includeDmOnly: false,
      }),
    ).toEqual([]);
  });
});
