import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// ─────────────────────────────────────────────────────────────────────
// Mocks — useCharactersList est stubé pour ne pas toucher Firestore ; le
// service de link est stubé car la modale l'importe au chargement du module.
// ─────────────────────────────────────────────────────────────────────

const charactersHolder: {
  characters: { id: string; name: string; totalLevel: number }[];
  isLoading: boolean;
} = { characters: [], isLoading: false };
vi.mock('@/features/library/use-characters-list', () => ({
  useCharactersList: () => ({ ...charactersHolder, error: null }),
}));

// useNavigate — spy (le composant navigue vers la fiche du perso lié).
const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importActual) => {
  const actual = await importActual<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

const linkMock = vi.fn();
vi.mock('@/shared/lib/services/campaigns', () => ({
  linkCharacterToMembership: (cid: string, uid: string, charId: string | null) =>
    linkMock(cid, uid, charId),
}));

import { MyCharacterLink } from '../my-character-link';

const onChanged = vi.fn();

afterEach(() => {
  charactersHolder.characters = [];
  charactersHolder.isLoading = false;
  linkMock.mockReset();
  onChanged.mockReset();
  navigateMock.mockReset();
});

function renderSection(currentCharacterId: string | null): void {
  render(
    <MyCharacterLink
      campaignId="c-1"
      uid="uid-2"
      currentCharacterId={currentCharacterId}
      onChanged={onChanged}
    />,
  );
}

describe('<MyCharacterLink>', () => {
  it('aucune fiche liée, aucune fiche existante → CTA « Créer un personnage » seul', () => {
    // 0 fiche : le picker « Lier un existant » serait vide → masqué. Seul le
    // chemin guidé « Créer un personnage » est proposé.
    renderSection(null);
    expect(screen.getByText(/Aucun personnage lié/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Créer un personnage/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Lier un existant/i }),
    ).not.toBeInTheDocument();
  });

  it('clic sur « Créer un personnage » navigue vers /create?campaignId=', () => {
    renderSection(null);
    fireEvent.click(screen.getByRole('button', { name: /Créer un personnage/i }));
    expect(navigateMock).toHaveBeenCalledWith('/create?campaignId=c-1');
  });

  it('aucune fiche liée mais des fiches existent → « Créer » ET « Lier un existant »', () => {
    charactersHolder.characters = [{ id: 'char-1', name: 'Aria', totalLevel: 2 }];
    renderSection(null);
    expect(
      screen.getByRole('button', { name: /Créer un personnage/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Lier un existant/i }),
    ).toBeInTheDocument();
  });

  it('fiche liée et trouvée → nom + niveau + CTA Changer + Ouvrir ma fiche', () => {
    charactersHolder.characters = [
      { id: 'char-9', name: 'Lyra du Crépuscule', totalLevel: 4 },
    ];
    renderSection('char-9');
    expect(screen.getByText('Lyra du Crépuscule')).toBeInTheDocument();
    expect(screen.getByText(/Niveau 4/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Changer/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Ouvrir ma fiche/i }),
    ).toBeInTheDocument();
  });

  it('clic sur « Ouvrir ma fiche » navigue vers /character/:id', () => {
    charactersHolder.characters = [
      { id: 'char-9', name: 'Lyra', totalLevel: 4 },
    ];
    renderSection('char-9');
    fireEvent.click(screen.getByRole('button', { name: /Ouvrir ma fiche/i }));
    expect(navigateMock).toHaveBeenCalledWith('/character/char-9');
  });

  it('aucune fiche liée → pas de bouton « Ouvrir ma fiche »', () => {
    renderSection(null);
    expect(
      screen.queryByRole('button', { name: /Ouvrir ma fiche/i }),
    ).not.toBeInTheDocument();
  });

  it('fiche liée mais absente de la liste, encore en chargement → « Chargement du personnage »', () => {
    charactersHolder.characters = [];
    charactersHolder.isLoading = true;
    renderSection('char-x');
    expect(screen.getByText(/Chargement du personnage/i)).toBeInTheDocument();
  });

  it('fiche liée mais introuvable (supprimée) → message dédié', () => {
    charactersHolder.characters = [];
    charactersHolder.isLoading = false;
    renderSection('char-deleted');
    expect(screen.getByText(/introuvable/i)).toBeInTheDocument();
  });

  it('clic sur « Lier un existant » ouvre la modale de liaison', () => {
    charactersHolder.characters = [
      { id: 'char-9', name: 'Lyra', totalLevel: 4 },
    ];
    renderSection(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Lier un existant/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
