import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSyncStore } from '@/shared/lib/slices/sync-slice';

import { OfflineBanner } from '../offline-banner';

/**
 * OfflineBanner couvre 3 états — offline | syncing | rien — avec
 * l'offline gagnant le tie-break (un utilisateur hors ligne qui a aussi des
 * writes en attente voit d'abord « hors ligne »).
 *
 * Identité du contenu (CLAUDE.md cat. 2) : on asserte sur les chaînes FR
 * exactes issues du bundle i18n, pas sur une présence générique.
 */
describe('<OfflineBanner />', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      writable: true,
      value: true,
    });
    useSyncStore.getState().__reset();
  });

  afterEach(() => {
    useSyncStore.getState().__reset();
  });

  it('ne rend rien quand online + 0 pending writes', () => {
    const { container } = render(<OfflineBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('rend variante OFFLINE quand navigator.onLine = false', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      writable: true,
      value: false,
    });
    render(<OfflineBanner />);
    const banner = screen.getByTestId('offline-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute('data-variant', 'offline');
    expect(banner).toHaveAttribute('role', 'status');
    expect(banner).toHaveAttribute('aria-live', 'polite');
  });

  it('affiche le titre + le corps FR exacts en mode OFFLINE', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      writable: true,
      value: false,
    });
    render(<OfflineBanner />);
    expect(screen.getByText('Tu es hors ligne')).toBeInTheDocument();
    expect(
      screen.getByText(
        'La lecture reste disponible. Tes modifications seront synchronisées au retour de la connexion.',
      ),
    ).toBeInTheDocument();
  });

  it('rend variante SYNCING quand online + pendingWrites > 0', () => {
    act(() => {
      useSyncStore.getState().beginWrite();
    });
    render(<OfflineBanner />);
    const banner = screen.getByTestId('offline-banner');
    expect(banner).toHaveAttribute('data-variant', 'syncing');
    expect(screen.getByText('Synchronisation en cours…')).toBeInTheDocument();
    expect(
      screen.getByText('Tes modifications sont envoyées au serveur.'),
    ).toBeInTheDocument();
  });

  it('OFFLINE gagne le tie-break quand offline + pendingWrites > 0', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      writable: true,
      value: false,
    });
    act(() => {
      useSyncStore.getState().beginWrite();
    });
    render(<OfflineBanner />);
    expect(screen.getByTestId('offline-banner')).toHaveAttribute(
      'data-variant',
      'offline',
    );
  });

  it("apparaît à un event 'offline' puis disparaît à un event 'online' (pas de writes)", () => {
    const { queryByTestId } = render(<OfflineBanner />);
    expect(queryByTestId('offline-banner')).toBeNull();
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
    });
    expect(queryByTestId('offline-banner')).toBeInTheDocument();
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        writable: true,
        value: true,
      });
      window.dispatchEvent(new Event('online'));
    });
    expect(queryByTestId('offline-banner')).toBeNull();
  });

  it('SYNCING disparaît quand pendingWrites repasse à 0', () => {
    act(() => {
      useSyncStore.getState().beginWrite();
    });
    const { queryByTestId } = render(<OfflineBanner />);
    expect(queryByTestId('offline-banner')).toHaveAttribute('data-variant', 'syncing');
    act(() => {
      useSyncStore.getState().endWrite();
    });
    expect(queryByTestId('offline-banner')).toBeNull();
  });

  it('utilise les tokens de transition du design system (ease-base + duration)', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      writable: true,
      value: false,
    });
    render(<OfflineBanner />);
    const banner = screen.getByTestId('offline-banner');
    expect(banner.className).toMatch(/ease-base/);
    expect(banner.className).toMatch(/duration-\d+/);
  });
});
