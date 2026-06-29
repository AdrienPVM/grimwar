import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLocaleStore } from '@/shared/lib/slices/locale-slice';
import {
  setDiceMode,
  setFollowCampaignDiceMode,
  setUserLocale,
  useUserSettingsStore,
} from '@/shared/lib/slices/user-settings-slice';

import { AccountScreen } from '../account-screen';

/**
 * Écran « Mon compte » (amorce plan 35). Vérifie le profil (signé / anonyme),
 * la bascule de mode de dés (écrit le chemin EXISTANT users/{uid}.settings) et
 * le verrouillage des boutons quand « suivre la campagne » est actif.
 */

const navigate = vi.fn();
vi.mock('react-router-dom', async (importActual) => {
  const actual = await importActual<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

const signOut = vi.fn(async () => {});
const mockAuth = {
  user: null as { uid: string; displayName: string | null; email: string | null; photoURL: string | null; isAnonymous: boolean } | null,
  isAnonymous: false,
  signOut,
};
vi.mock('@/features/auth/use-auth', () => ({ useAuth: () => mockAuth }));

// Garde le vrai store zustand ; ne remplace que les writers async par des spies.
vi.mock('@/shared/lib/slices/user-settings-slice', async (importActual) => {
  const actual =
    await importActual<typeof import('@/shared/lib/slices/user-settings-slice')>();
  return {
    ...actual,
    setDiceMode: vi.fn(),
    setFollowCampaignDiceMode: vi.fn(),
    setUserLocale: vi.fn(),
  };
});

const SIGNED_USER = {
  uid: 'u1',
  displayName: 'Lyralei',
  email: 'lyra@grimwar.test',
  photoURL: null,
  isAnonymous: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  useUserSettingsStore.setState({ diceMode: 'digital', followCampaignDiceMode: false });
  useLocaleStore.setState({ locale: 'fr' });
  mockAuth.user = SIGNED_USER;
  mockAuth.isAnonymous = false;
});

describe('AccountScreen', () => {
  it('affiche le profil signé (nom + e-mail)', () => {
    render(<AccountScreen />);
    expect(screen.getByText('Lyralei')).toBeInTheDocument();
    expect(screen.getByText('lyra@grimwar.test')).toBeInTheDocument();
  });

  it('profil anonyme : nom générique + indice', () => {
    mockAuth.user = { ...SIGNED_USER, isAnonymous: true };
    mockAuth.isAnonymous = true;
    render(<AccountScreen />);
    expect(screen.getByText('Aventurier anonyme')).toBeInTheDocument();
    expect(
      screen.getByText(/vivent sur cet appareil/),
    ).toBeInTheDocument();
  });

  it('bascule le mode de dés en physique → écrit users/{uid}.settings', () => {
    render(<AccountScreen />);
    fireEvent.click(screen.getByRole('radio', { name: /Physique/ }));
    expect(setDiceMode).toHaveBeenCalledWith('u1', 'physical');
  });

  it('coche « suivre la campagne » → écrit users/{uid}.settings', () => {
    render(<AccountScreen />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Suivre le mode de la campagne/ }));
    expect(setFollowCampaignDiceMode).toHaveBeenCalledWith('u1', true);
  });

  it('quand « suivre la campagne » est actif, les boutons de dés sont verrouillés', () => {
    useUserSettingsStore.setState({ followCampaignDiceMode: true });
    render(<AccountScreen />);
    expect(screen.getByRole('radio', { name: /Physique/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /Numérique/ })).toBeDisabled();
  });

  it('bascule la langue en Anglais → écrit users/{uid}.locale', () => {
    render(<AccountScreen />);
    fireEvent.click(screen.getByRole('radio', { name: 'Anglais' }));
    expect(setUserLocale).toHaveBeenCalledWith('u1', 'en');
  });

  it('reflète la locale courante du store (FR actif par défaut)', () => {
    render(<AccountScreen />);
    expect(screen.getByRole('radio', { name: 'Français' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('radio', { name: 'Anglais' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('déconnexion : confirmation → signOut + retour accueil', async () => {
    render(<AccountScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la déconnexion' }));
    expect(signOut).toHaveBeenCalledOnce();
    // navigate('/') est appelé après la résolution de signOut.
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
  });

  it('non connecté : état vide doux', () => {
    mockAuth.user = null;
    render(<AccountScreen />);
    expect(screen.getByRole('heading', { name: 'Mon compte' })).toBeInTheDocument();
  });
});
