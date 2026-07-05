import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NavHub } from '../nav-hub';

const navigate = vi.fn();
vi.mock('react-router-dom', async (importActual) => {
  const actual = await importActual<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

/**
 * Hub de navigation de l'accueil (Codex / Campagnes). Vérifie les cibles + leur
 * route de destination. La carte « Vue MJ » (→ prototype `/dm`) a été retirée :
 * « Campagnes » est le vrai point d'entrée meneur.
 */
describe('NavHub', () => {
  it('rend les 2 cartes de navigation', () => {
    render(<NavHub />);
    expect(screen.getByRole('button', { name: /Le Codex/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mes campagnes/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tableau du meneur/ })).not.toBeInTheDocument();
  });

  it('navigue vers la bonne route au tap', () => {
    render(<NavHub />);
    fireEvent.click(screen.getByRole('button', { name: /Le Codex/ }));
    expect(navigate).toHaveBeenCalledWith('/codex');
    fireEvent.click(screen.getByRole('button', { name: /Mes campagnes/ }));
    expect(navigate).toHaveBeenCalledWith('/campaigns');
    expect(navigate).not.toHaveBeenCalledWith('/dm');
  });
});
