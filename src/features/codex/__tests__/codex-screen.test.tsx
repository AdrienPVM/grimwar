import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CodexScreen } from '../codex-screen';

/**
 * Codex — coquille (plan 19). Vérifie le titre, les 4 onglets de catégorie, la
 * sélection par défaut (Sorts) et le changement de catégorie.
 */

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: () => ({ data: [], loading: false, error: null }),
}));

describe('CodexScreen', () => {
  it('rend le titre et les 6 onglets de catégorie', () => {
    render(<CodexScreen />);
    expect(screen.getByRole('heading', { name: 'Le Codex' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Sorts/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Objets magiques/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Équipement/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Dons/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Invocations/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /États/ })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(6);
  });

  it('bascule vers Objets magiques puis Équipement', () => {
    render(<CodexScreen />);
    fireEvent.click(screen.getByRole('tab', { name: /Objets magiques/ }));
    expect(
      screen.getByPlaceholderText('Rechercher un objet magique…'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Équipement/ }));
    expect(
      screen.getByPlaceholderText('Rechercher un équipement…'),
    ).toBeInTheDocument();
  });

  it('sélectionne Sorts par défaut', () => {
    render(<CodexScreen />);
    expect(screen.getByRole('tab', { name: /Sorts/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByPlaceholderText('Rechercher un sort…')).toBeInTheDocument();
  });

  it('bascule vers Dons et affiche le navigateur de dons', () => {
    render(<CodexScreen />);
    fireEvent.click(screen.getByRole('tab', { name: /Dons/ }));
    expect(screen.getByRole('tab', { name: /Dons/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByPlaceholderText('Rechercher un don…')).toBeInTheDocument();
  });
});
