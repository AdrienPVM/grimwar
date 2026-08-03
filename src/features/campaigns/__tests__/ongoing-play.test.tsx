import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { Campaign } from '@/shared/types/campaign';
import type { Encounter } from '@/shared/types/encounter';
import type { Session } from '@/shared/types/session';

import { OngoingPlayCard } from '../ongoing-play-card';
import { selectOngoing, type OngoingCandidate } from '../ongoing-play';

function campaign(id: string, name: string): Campaign {
  return { id, name } as Campaign;
}
function session(id: string, number: number, title: string): Session {
  return { id, number, title, status: 'active' } as Session;
}
function encounter(id: string, name: string, round: number): Encounter {
  return { id, name, round, status: 'active' } as Encounter;
}

describe('selectOngoing — quelle table proposer de reprendre', () => {
  it('ne propose rien quand aucune campagne n’a de séance ni de combat ouvert', () => {
    const candidates: OngoingCandidate[] = [
      { campaign: campaign('c1', 'Les Cendres'), session: null, encounter: null },
    ];
    expect(selectOngoing(candidates)).toBeNull();
  });

  it('propose la séance ouverte quand c’est la seule chose en cours', () => {
    const candidates: OngoingCandidate[] = [
      { campaign: campaign('c1', 'Les Cendres'), session: null, encounter: null },
      {
        campaign: campaign('c2', 'Le Voile'),
        session: session('s1', 4, 'La crypte'),
        encounter: null,
      },
    ];
    expect(selectOngoing(candidates)?.campaign.id).toBe('c2');
  });

  it('fait passer un COMBAT en cours devant une séance ouverte d’une autre table', () => {
    // Priorité métier : un combat dure quelques minutes et toute la table
    // attend son tour ; une séance dure la soirée.
    const candidates: OngoingCandidate[] = [
      {
        campaign: campaign('c1', 'Les Cendres'),
        session: session('s1', 4, 'La crypte'),
        encounter: null,
      },
      {
        campaign: campaign('c2', 'Le Voile'),
        session: null,
        encounter: encounter('e1', 'Embuscade gobeline', 2),
      },
    ];
    expect(selectOngoing(candidates)?.encounter?.id).toBe('e1');
  });

  it('choisit le combat quand séance ET combat sont ouverts sur la même table', () => {
    const candidates: OngoingCandidate[] = [
      {
        campaign: campaign('c1', 'Les Cendres'),
        session: session('s1', 4, 'La crypte'),
        encounter: encounter('e1', 'Embuscade gobeline', 2),
      },
    ];
    expect(selectOngoing(candidates)?.encounter?.id).toBe('e1');
  });
});

describe('<OngoingPlayCard>', () => {
  function renderCard(ongoing: OngoingCandidate | null): HTMLElement {
    const { container } = render(
      <MemoryRouter>
        <OngoingPlayCard ongoing={ongoing} />
      </MemoryRouter>,
    );
    return container;
  }

  it('ne rend rien hors partie — pas de carte « aucune partie en cours »', () => {
    expect(renderCard(null)).toBeEmptyDOMElement();
  });

  it('mène AU COMBAT et affiche son nom, sa manche et la campagne', () => {
    renderCard({
      campaign: campaign('c1', 'Les Cendres de Baldur'),
      session: session('s1', 4, 'La crypte'),
      encounter: encounter('e1', 'Embuscade gobeline', 2),
    });
    // Identité du contenu, pas simple présence : le nom exact du combat.
    expect(screen.getByText('Embuscade gobeline')).toBeInTheDocument();
    expect(screen.getByText(/En cours · Combat/)).toBeInTheDocument();
    expect(screen.getByText(/Les Cendres de Baldur/)).toBeInTheDocument();
    expect(screen.getByText(/Manche 2/)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/campaigns/c1/encounters/e1',
    );
  });

  it('mène À LA SÉANCE quand aucun combat n’est ouvert', () => {
    renderCard({
      campaign: campaign('c1', 'Les Cendres de Baldur'),
      session: session('s7', 7, 'Le pont de sel'),
      encounter: null,
    });
    expect(screen.getByText('Le pont de sel')).toBeInTheDocument();
    expect(screen.getByText(/En cours · Séance/)).toBeInTheDocument();
    expect(screen.getByText(/Séance 7/)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/campaigns/c1/sessions/s7');
  });
});
