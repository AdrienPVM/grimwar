import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Membership } from '@/shared/types/campaign';
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

// Noms résolus déterministes — découple le feed de la lecture Firestore réelle.
const nameHolder: { names: Record<string, string> } = { names: {} };
vi.mock('../use-linked-character-names', () => ({
  useLinkedCharacterNames: () => nameHolder.names,
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

function mkMember(over: Partial<Membership> & { userId: string }): Membership {
  return {
    role: 'member',
    characterId: null,
    schemaVersion: 1,
    ...over,
  };
}

afterEach(() => {
  feedHolder.events = [];
  feedHolder.isLoading = false;
  feedHolder.error = null;
  nameHolder.names = {};
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
      members={[]}
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

  // ── Filtre par joueur (JALON 22.4, plan 21 step 4) ────────────────────
  it('aucun joueur lié → pas de filtre rendu', () => {
    feedHolder.events = [mkEvent({ id: 'e1', payload: { label: 'A', total: 1 } })];
    renderFeed({ members: [mkMember({ userId: 'gm-1', role: 'gm' })] });
    expect(
      screen.queryByRole('group', { name: 'Filtrer l’activité par joueur' }),
    ).not.toBeInTheDocument();
  });

  it('filtre par joueur : « Tous » + un chip par perso lié (libellé = nom résolu)', () => {
    nameHolder.names = { 'char-sigrid': 'Sigrid', 'char-elaria': 'Elaria' };
    feedHolder.events = [];
    renderFeed({
      members: [
        mkMember({ userId: 'p-1', characterId: 'char-sigrid' }),
        mkMember({ userId: 'p-2', characterId: 'char-elaria' }),
      ],
    });
    const group = screen.getByRole('group', {
      name: 'Filtrer l’activité par joueur',
    });
    expect(within(group).getByRole('button', { name: 'Tous' })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: 'Sigrid' })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: 'Elaria' })).toBeInTheDocument();
  });

  it('sélectionner un joueur ne montre QUE ses événements', () => {
    nameHolder.names = { 'char-sigrid': 'Sigrid', 'char-elaria': 'Elaria' };
    feedHolder.events = [
      mkEvent({ id: 'e-sig', actorCharacterId: 'char-sigrid', payload: { label: 'Coup de Sigrid', total: 12 } }),
      mkEvent({ id: 'e-ela', actorCharacterId: 'char-elaria', payload: { label: 'Sort d’Elaria', total: 15 } }),
    ];
    renderFeed({
      members: [
        mkMember({ userId: 'p-1', characterId: 'char-sigrid' }),
        mkMember({ userId: 'p-2', characterId: 'char-elaria' }),
      ],
    });
    // Avant filtre : les deux sont visibles.
    expect(screen.getByText('Coup de Sigrid · 12')).toBeInTheDocument();
    expect(screen.getByText('Sort d’Elaria · 15')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sigrid' }));

    expect(screen.getByText('Coup de Sigrid · 12')).toBeInTheDocument();
    expect(screen.queryByText('Sort d’Elaria · 15')).not.toBeInTheDocument();
    // Le chip sélectionné est pressé.
    expect(screen.getByRole('button', { name: 'Sigrid' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('filtre actif sans événement → message dédié « pour ce joueur »', () => {
    nameHolder.names = { 'char-sigrid': 'Sigrid' };
    feedHolder.events = [
      mkEvent({ id: 'e-dm', kind: 'dm-secret-roll', visibility: 'dm', actorCharacterId: null, payload: { total: 9 } }),
    ];
    renderFeed({
      members: [mkMember({ userId: 'p-1', characterId: 'char-sigrid' })],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sigrid' }));
    expect(
      screen.getByText('Aucune activité pour ce joueur pour l’instant.'),
    ).toBeInTheDocument();
  });

  // ── Détail au tap (JALON 22.4, plan 21 step 4) ────────────────────────
  it('tap sur une ligne ouvre la modale : acteur résolu par nom + détail du payload', () => {
    nameHolder.names = { 'char-sigrid': 'Sigrid' };
    feedHolder.events = [
      mkEvent({
        id: 'e-hp',
        kind: 'hp-change',
        actorCharacterId: 'char-sigrid',
        targetCharacterId: 'char-sigrid',
        payload: { before: 28, after: 7, delta: -21, reason: 'damage' },
        createdAt: new Date(2026, 5, 23, 14, 5),
      }),
    ];
    renderFeed({
      members: [mkMember({ userId: 'p-1', characterId: 'char-sigrid' })],
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /Voir le détail de l’événement/ }),
    );

    const dialog = screen.getByRole('dialog');
    // Acteur résolu par NOM (pas l'identifiant machine).
    expect(within(dialog).getAllByText('Sigrid').length).toBeGreaterThan(0);
    // Détail FR-étiqueté du payload.
    expect(within(dialog).getByText('Avant')).toBeInTheDocument();
    expect(within(dialog).getByText('28')).toBeInTheDocument();
    expect(within(dialog).getByText('Après')).toBeInTheDocument();
    expect(within(dialog).getByText('7')).toBeInTheDocument();
    expect(within(dialog).getByText('Variation')).toBeInTheDocument();
    expect(within(dialog).getByText('-21')).toBeInTheDocument();
    expect(within(dialog).getByText('Dégâts')).toBeInTheDocument();
  });

  it('modale : acteur d’un jet secret sans personnage → « Meneur »', () => {
    feedHolder.events = [
      mkEvent({
        id: 'e-secret',
        kind: 'dm-secret-roll',
        visibility: 'dm',
        actorCharacterId: null,
        payload: { total: 17 },
      }),
    ];
    renderFeed();
    fireEvent.click(
      screen.getByRole('button', { name: /Voir le détail de l’événement/ }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Meneur')).toBeInTheDocument();
    expect(within(dialog).getByText('Total')).toBeInTheDocument();
    expect(within(dialog).getByText('17')).toBeInTheDocument();
  });
});
