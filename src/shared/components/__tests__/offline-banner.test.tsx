import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { OfflineBanner } from '../offline-banner';

/**
 * OfflineBanner ne se rend QUE quand navigator.onLine === false.
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
  });

  it('ne rend rien quand online', () => {
    const { container } = render(<OfflineBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('rend la bannière quand offline (initialement)', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      writable: true,
      value: false,
    });
    render(<OfflineBanner />);
    const banner = screen.getByTestId('offline-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute('role', 'status');
    expect(banner).toHaveAttribute('aria-live', 'polite');
  });

  it('affiche le titre FR exact', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      writable: true,
      value: false,
    });
    render(<OfflineBanner />);
    expect(screen.getByText('Tu es hors ligne')).toBeInTheDocument();
  });

  it('affiche le corps FR exact (lecture + sync à la reconnexion)', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      writable: true,
      value: false,
    });
    render(<OfflineBanner />);
    expect(
      screen.getByText(
        'La lecture reste disponible. Tes modifications seront synchronisées au retour de la connexion.',
      ),
    ).toBeInTheDocument();
  });

  it("apparaît à un event 'offline' puis disparaît à un event 'online'", () => {
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
