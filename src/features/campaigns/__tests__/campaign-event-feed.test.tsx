import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GameEvent } from '@/shared/types/event';

const feedHolder: {
  events: GameEvent[];
  isLoading: boolean;
  error: Error | null;
} = { events: [], isLoading: false, error: null };

vi.mock('../use-campaign-events', () => ({
  CAMPAIGN_EVENTS_LIMIT: 20,
  useCampaignEvents: () => feedHolder,
}));

import { CampaignEventFeed } from '../campaign-event-feed';

function mkEvent(over: Partial<GameEvent> & { id: string }): GameEvent {
  return {
    kind: 'roll',
    actorUserId: 'p-1',
    actorCharacterId: 'char-1',
    targetCharacterId: null,
    sessionId: null,
    encounterId: null,
    payload: {},
    visibility: 'all',
    createdAt: null,
    ...over,
  };
}

afterEach(() => {
  feedHolder.events = [];
  feedHolder.isLoading = false;
  feedHolder.error = null;
});

function renderFeed(
  props: Partial<Parameters<typeof CampaignEventFeed>[0]> = {},
): ReturnType<typeof render> {
  return render(
    <CampaignEventFeed
      campaignId="c-1"
      viewerUid="gm-1"
      isDM
      myCharacterIds={[]}
      {...props}
    />,
  );
}

describe('<CampaignEventFeed>', () => {
  it('rend un événement roll (libellé + détail + heure)', () => {
    feedHolder.events = [
      mkEvent({
        id: 'e1',
        kind: 'roll',
        payload: { label: 'Épée longue', total: 18 },
        createdAt: new Date(2026, 0, 1, 14, 5),
      }),
    ];
    renderFeed();
    expect(screen.getByText('Jet de dés')).toBeInTheDocument();
    expect(screen.getByText('Épée longue · 18')).toBeInTheDocument();
    expect(screen.getByText('14:05')).toBeInTheDocument();
  });

  it('état vide', () => {
    feedHolder.events = [];
    renderFeed();
    expect(
      screen.getByText('Aucune activité enregistrée pour l’instant.'),
    ).toBeInTheDocument();
  });

  it('état chargement', () => {
    feedHolder.isLoading = true;
    renderFeed();
    expect(screen.getByText('Chargement de l’activité…')).toBeInTheDocument();
  });

  it('état erreur', () => {
    feedHolder.error = new Error('boom');
    renderFeed();
    expect(
      screen.getByText('Impossible de charger l’activité de la campagne.'),
    ).toBeInTheDocument();
  });

  // ── Filtrage canViewEvent (plan 22 step 10) ───────────────────────────
  it('MJ : affiche un événement « dm », masque le « self » d’un autre joueur', () => {
    feedHolder.events = [
      mkEvent({ id: 'e-all', kind: 'roll', visibility: 'all', payload: { label: 'Public', total: 10 } }),
      mkEvent({ id: 'e-dm', kind: 'dm-secret-roll', visibility: 'dm', payload: { total: 9 }, actorUserId: 'gm-1', actorCharacterId: null }),
      // self d'un AUTRE joueur (acteur ≠ viewer, perso pas au viewer) → masqué.
      mkEvent({ id: 'e-self-other', kind: 'roll', visibility: 'self', actorUserId: 'p-2', actorCharacterId: 'char-2', payload: { label: 'Secret joueur', total: 3 } }),
    ];
    renderFeed({ viewerUid: 'gm-1', isDM: true, myCharacterIds: [] });

    expect(screen.getByText('Public · 10')).toBeInTheDocument();
    expect(screen.getByText('Jet secret du meneur')).toBeInTheDocument();
    expect(screen.queryByText('Secret joueur · 3')).not.toBeInTheDocument();
  });

  it('affiche un « self » dont le perso acteur appartient au spectateur', () => {
    feedHolder.events = [
      mkEvent({ id: 'e-self-mine', kind: 'roll', visibility: 'self', actorUserId: 'p-9', actorCharacterId: 'char-mine', payload: { label: 'Mon secret', total: 7 } }),
    ];
    renderFeed({ viewerUid: 'someone', isDM: false, myCharacterIds: ['char-mine'] });
    expect(screen.getByText('Mon secret · 7')).toBeInTheDocument();
  });
});
