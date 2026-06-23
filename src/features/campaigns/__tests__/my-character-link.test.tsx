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
  it('aucune fiche liée → message « Aucun personnage lié » + CTA Lier', () => {
    renderSection(null);
    expect(screen.getByText(/Aucun personnage lié/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Lier un personnage/i }),
    ).toBeInTheDocument();
  });

  it('fiche liée et trouvée → nom + niveau + CTA Changer', () => {
    charactersHolder.characters = [
      { id: 'char-9', name: 'Lyra du Crépuscule', totalLevel: 4 },
    ];
    renderSection('char-9');
    expect(screen.getByText('Lyra du Crépuscule')).toBeInTheDocument();
    expect(screen.getByText(/Niveau 4/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Changer/i })).toBeInTheDocument();
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

  it('clic sur le CTA ouvre la modale de liaison', () => {
    charactersHolder.characters = [
      { id: 'char-9', name: 'Lyra', totalLevel: 4 },
    ];
    renderSection(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Lier un personnage/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
