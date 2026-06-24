import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Campaign, Membership } from '@/shared/types/campaign';
import type { Session } from '@/shared/types/session';

const campaignHolder: {
  campaign: Campaign | null;
  members: Membership[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
} = { campaign: null, members: [], isLoading: false, error: null, refresh: vi.fn() };
vi.mock('@/features/campaigns/use-campaign', () => ({ useCampaign: () => campaignHolder }));

const sessionsHolder: {
  sessions: Session[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
} = { sessions: [], isLoading: false, error: null, refresh: vi.fn() };
vi.mock('@/features/campaigns/use-sessions', () => ({ useSessions: () => sessionsHolder }));

import { CampaignJournalScreen } from '../campaign-journal-screen';

function mkCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c-1',
    name: 'La Couronne Brisée',
    gmIds: ['gm-1'],
    createdBy: 'gm-1',
    createdAt: null,
    updatedAt: null,
    settings: {} as Campaign['settings'],
    ...overrides,
  } as Campaign;
}

function mkSession(p: Partial<Session> & Pick<Session, 'number' | 'title'>): Session {
  return {
    id: `s${p.number}`,
    plannedDate: null,
    startedAt: null,
    endedAt: null,
    status: 'completed',
    attendance: [],
    notes: '',
    journalCompiled: null,
    createdAt: null,
    updatedAt: null,
    ...p,
  } as Session;
}

function renderScreen(): void {
  render(
    <MemoryRouter initialEntries={['/campaigns/c-1/journal']}>
      <Routes>
        <Route path="/campaigns/:cid/journal" element={<CampaignJournalScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  campaignHolder.campaign = mkCampaign();
  campaignHolder.error = null;
  sessionsHolder.sessions = [];
  sessionsHolder.error = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CampaignJournalScreen', () => {
  it('aucune séance terminée → empty state, pas de bouton Exporter', () => {
    renderScreen();
    expect(screen.getByText(/Aucune séance terminée/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Exporter/ })).not.toBeInTheDocument();
  });

  it('n’affiche QUE les séances terminées, ordre chronologique croissant', () => {
    sessionsHolder.sessions = [
      mkSession({ number: 3, title: 'La crypte', status: 'completed' }),
      mkSession({ number: 1, title: 'Le départ', status: 'completed' }),
      mkSession({ number: 2, title: 'En cours', status: 'active' }), // exclue
    ];
    renderScreen();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    // Ordre croissant : Séance 1 avant Séance 3.
    expect(items[0]).toHaveTextContent('Le départ');
    expect(items[1]).toHaveTextContent('La crypte');
    expect(screen.queryByText('En cours')).not.toBeInTheDocument();
  });

  it('déplie une séance → rend son journal compilé', () => {
    sessionsHolder.sessions = [
      mkSession({
        number: 1,
        title: 'Le départ',
        status: 'completed',
        journalCompiled: '## Exploration\n\n- **Lyralei** ouvre la marche.',
      }),
    ];
    renderScreen();
    const row = screen.getByRole('button', { name: /Le départ/ });
    expect(row).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(row);
    expect(row).toHaveAttribute('aria-expanded', 'true');
    // Le journal rendu (les bullets Markdown créent leurs propres <li>) — on
    // assert au niveau document, le contenu est dépliée.
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Exploration');
    expect(screen.getByText('Lyralei').tagName).toBe('STRONG');
  });

  it('séance terminée sans journal → note « non compilé » au dépliage', () => {
    sessionsHolder.sessions = [
      mkSession({ number: 1, title: 'Muette', status: 'completed', journalCompiled: null }),
    ];
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Muette/ }));
    expect(screen.getByText(/Journal non encore compilé/)).toBeInTheDocument();
  });

  it('bouton Exporter déclenche un téléchargement Blob (.md)', () => {
    sessionsHolder.sessions = [
      mkSession({
        number: 1,
        title: 'Le départ',
        status: 'completed',
        journalCompiled: '## Exploration\n\n- A.',
      }),
    ];
    // Stub les API DOM de téléchargement.
    const createUrl = vi.fn(() => 'blob:mock');
    const revokeUrl = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createUrl, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeUrl, configurable: true });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Exporter/ }));

    expect(createUrl).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeUrl).toHaveBeenCalledOnce();
  });

  it('erreur de chargement → message + Réessayer', () => {
    campaignHolder.error = new Error('boom');
    renderScreen();
    expect(screen.getByText(/chargement du journal a échoué/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Réessayer/ })).toBeInTheDocument();
  });
});
