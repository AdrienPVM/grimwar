import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NavHub } from '../nav-hub';

const navigate = vi.fn();
vi.mock('react-router-dom', async (importActual) => {
  const actual = await importActual<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

/**
 * Hub de navigation de l'accueil (Codex / Campagnes / Vue MJ). Vérifie les 3
 * cibles + leur route de destination.
 */
describe('NavHub', () => {
  it('rend les 3 cartes de navigation', () => {
    render(<NavHub />);
    expect(screen.getByRole('button', { name: /Le Codex/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mes campagnes/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tableau du meneur/ })).toBeInTheDocument();
  });

  it('navigue vers la bonne route au tap', () => {
    render(<NavHub />);
    fireEvent.click(screen.getByRole('button', { name: /Le Codex/ }));
    expect(navigate).toHaveBeenCalledWith('/codex');
    fireEvent.click(screen.getByRole('button', { name: /Mes campagnes/ }));
    expect(navigate).toHaveBeenCalledWith('/campaigns');
    fireEvent.click(screen.getByRole('button', { name: /Tableau du meneur/ }));
    expect(navigate).toHaveBeenCalledWith('/dm');
  });
});
