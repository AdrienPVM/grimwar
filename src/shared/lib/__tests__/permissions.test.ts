import { describe, expect, it } from 'vitest';

import { canViewEvent, type EventViewerContext } from '../permissions';
import type { GameEvent } from '@/shared/types/event';

type EventView = Pick<
  GameEvent,
  'visibility' | 'actorUserId' | 'actorCharacterId' | 'targetCharacterId'
>;

function ev(partial: Partial<EventView>): EventView {
  return {
    visibility: 'all',
    actorUserId: 'someone',
    actorCharacterId: null,
    targetCharacterId: null,
    ...partial,
  };
}

const player: EventViewerContext = { uid: 'p1', isDM: false, myCharacterIds: ['c-p1'] };
const dm: EventViewerContext = { uid: 'gm', isDM: true, myCharacterIds: [] };

describe('canViewEvent', () => {
  it('visibility "all" → visible par tous', () => {
    expect(canViewEvent(ev({ visibility: 'all' }), player)).toBe(true);
    expect(canViewEvent(ev({ visibility: 'all' }), dm)).toBe(true);
  });

  it('visibility "dm" → MJ uniquement', () => {
    expect(canViewEvent(ev({ visibility: 'dm' }), dm)).toBe(true);
    expect(canViewEvent(ev({ visibility: 'dm' }), player)).toBe(false);
  });

  describe('visibility "self"', () => {
    it('l’acteur (par uid) voit son event', () => {
      expect(canViewEvent(ev({ visibility: 'self', actorUserId: 'p1' }), player)).toBe(true);
    });

    it('le propriétaire du personnage acteur voit l’event', () => {
      expect(
        canViewEvent(ev({ visibility: 'self', actorCharacterId: 'c-p1' }), player),
      ).toBe(true);
    });

    it('le propriétaire du personnage cible voit l’event', () => {
      expect(
        canViewEvent(ev({ visibility: 'self', targetCharacterId: 'c-p1' }), player),
      ).toBe(true);
    });

    it('un tiers ne voit pas un event "self"', () => {
      expect(
        canViewEvent(
          ev({ visibility: 'self', actorUserId: 'p2', actorCharacterId: 'c-p2' }),
          player,
        ),
      ).toBe(false);
    });

    it('le MJ ne voit pas un "self" qui ne le concerne pas (visibilité ≠ rôle)', () => {
      expect(
        canViewEvent(ev({ visibility: 'self', actorUserId: 'p1' }), dm),
      ).toBe(false);
    });
  });
});
