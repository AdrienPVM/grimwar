import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `CampaignNotifications` ne rend rien : tout son intérêt est de choisir la
 * BONNE campagne à écouter selon l'écran courant. C'est donc l'argument passé au
 * hook qu'on vérifie, pas un rendu.
 *
 * Le cas qui justifie tout le composant est le troisième : depuis la fiche du
 * joueur — c'est-à-dire pendant la partie — l'URL ne porte aucune campagne, et
 * c'est le pointeur de campagne active qui doit prendre le relais.
 */

const useHandoutNotifications = vi.fn();

vi.mock('../use-handout-notifications', () => ({
  useHandoutNotifications: (...args: unknown[]) => useHandoutNotifications(...args),
}));

let currentUid: string | undefined = 'p-1';
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => ({ user: currentUid ? { uid: currentUid } : null }),
}));

import { useActiveCampaignStore } from '@/shared/lib/slices/active-campaign-slice';

import { CampaignNotifications } from '../campaign-notifications';

function renderAt(pathname: string): void {
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <CampaignNotifications />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useHandoutNotifications.mockReset();
  currentUid = 'p-1';
  useActiveCampaignStore.getState().clearActiveCampaign();
});

describe('CampaignNotifications', () => {
  it('écoute la campagne portée par l’URL', () => {
    renderAt('/campaigns/c-42/encounters/e-1');
    expect(useHandoutNotifications).toHaveBeenCalledWith('c-42', 'p-1');
  });

  it('écoute la campagne active quand l’URL n’en porte aucune (fiche du joueur)', () => {
    useActiveCampaignStore.getState().setActiveCampaign('c-home');
    renderAt('/character/x-1');
    expect(useHandoutNotifications).toHaveBeenCalledWith('c-home', 'p-1');
  });

  it('l’URL l’emporte sur le pointeur de campagne active', () => {
    useActiveCampaignStore.getState().setActiveCampaign('c-home');
    renderAt('/campaigns/c-visited/journal');
    expect(useHandoutNotifications).toHaveBeenCalledWith('c-visited', 'p-1');
  });

  it('n’écoute rien hors contexte de jeu', () => {
    renderAt('/codex');
    expect(useHandoutNotifications).toHaveBeenCalledWith(undefined, 'p-1');
  });

  it('n’écoute rien sans utilisateur connecté', () => {
    currentUid = undefined;
    renderAt('/campaigns/c-42');
    expect(useHandoutNotifications).toHaveBeenCalledWith('c-42', undefined);
  });
});
