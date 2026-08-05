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

  // ── M14 — exporter UNE séance pour le joueur absent ──────────────────────

  it('« Exporter cette séance » n’apparaît qu’au dépliage, et pas sans journal', () => {
    sessionsHolder.sessions = [
      mkSession({
        number: 4,
        title: 'La crypte',
        status: 'completed',
        journalCompiled: '## Exploration\n\n- A.',
      }),
      mkSession({ number: 5, title: 'Muette', status: 'completed', journalCompiled: null }),
    ];
    renderScreen();
    expect(
      screen.queryByRole('button', { name: 'Exporter cette séance' }),
    ).not.toBeInTheDocument();

    // Séance sans journal dépliée → toujours pas d'export (rien à exporter).
    fireEvent.click(screen.getByRole('button', { name: /Muette/ }));
    expect(
      screen.queryByRole('button', { name: 'Exporter cette séance' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /La crypte/ }));
    expect(
      screen.getByRole('button', { name: 'Exporter cette séance' }),
    ).toBeInTheDocument();
  });

  it('exporte UNIQUEMENT la séance dépliée, sous un nom de fichier qui la nomme', async () => {
    sessionsHolder.sessions = [
      mkSession({
        number: 1,
        title: 'Le départ',
        status: 'completed',
        journalCompiled: '## Exploration\n\n- Première.',
      }),
      mkSession({
        number: 2,
        title: 'La crypte',
        status: 'completed',
        journalCompiled: '## Exploration\n\n- Deuxième.',
      }),
    ];
    // Typé `(blob: Blob)` : sans paramètre déclaré, `mock.calls[0]` est un tuple
    // vide et l'accès à l'argument ne compile pas.
    const createUrl = vi.fn((_blob: Blob) => 'blob:mock');
    Object.defineProperty(URL, 'createObjectURL', { value: createUrl, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
    let downloadName = '';
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadName = this.download;
      });

    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /La crypte/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Exporter cette séance' }));

    expect(clickSpy).toHaveBeenCalledOnce();
    // Le nom porte le numéro de séance — sinon deux exports s'écraseraient dans
    // le dossier de téléchargement.
    expect(downloadName).toMatch(/seance-2-journal\.md$/);

    // Le Blob ne contient QUE la séance 2. `Blob.text()` n'existe pas sous
    // jsdom — on relit par `FileReader`, qui lui est implémenté.
    const blob = createUrl.mock.calls[0]![0];
    expect(blob).toBeInstanceOf(Blob);
    const content = await readBlob(blob);
    expect(content).toContain('Deuxième.');
    expect(content).not.toContain('Première.');
  });
});

/** Lit un Blob en texte — `Blob.text()` n'est pas implémenté par jsdom. */
function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}
