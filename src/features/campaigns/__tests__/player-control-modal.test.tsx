import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

/**
 * M5 de l'audit de malléabilité — « le dragon souffle : 22 dégâts sur les PJ ».
 *
 * Le mur d'origine : la modale de contrôle était fermée sur un PJ, alors que
 * les rules autorisaient l'écriture depuis le plan 26. Le MJ devait ouvrir la
 * fiche de chaque joueur, une par une, en plein tour de combat.
 *
 * On vérifie ici que l'écriture emprunte la voie omni-edit DÉJÀ livrée (donc
 * journalisée) et que l'arithmétique SRD est celle de la fiche, pas une
 * seconde implémentation.
 */

const characterHolder: { character: Character | null; isLoading: boolean } = {
  character: null,
  isLoading: false,
};
vi.mock('@/features/sheet/use-character', () => ({
  useCharacter: (characterId: string | undefined, ownerUid?: string) => {
    lastReadArgs.characterId = characterId;
    lastReadArgs.ownerUid = ownerUid;
    return { ...characterHolder, error: null };
  },
}));
const lastReadArgs: { characterId?: string; ownerUid?: string } = {};

const updateCharacterMock = vi.fn();
vi.mock('@/features/sheet/use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: (...a: unknown[]) => updateCharacterMock(...a),
    isUpdating: false,
    error: null,
  }),
}));

import { PlayerControlModal } from '../player-control-modal';

function mkCharacter(hp: { current: number; max: number; temp: number }): Character {
  // Forme minimale suffisante : la modale ne lit que `name` et `hp`.
  return { id: 'char-a', name: 'Lyralei', hp } as unknown as Character;
}

function renderModal(): { onApplied: ReturnType<typeof vi.fn> } {
  const onApplied = vi.fn();
  render(
    <PlayerControlModal
      characterId="char-a"
      ownerUid="uid-player"
      fallbackName="Lyralei"
      onApplied={onApplied}
      onClose={vi.fn()}
    />,
  );
  return { onApplied };
}

beforeEach(() => {
  characterHolder.character = mkCharacter({ current: 20, max: 24, temp: 0 });
  characterHolder.isLoading = false;
  updateCharacterMock.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  document.body.style.overflow = '';
});

describe('<PlayerControlModal>', () => {
  it('lit la fiche DU JOUEUR, pas celle du MJ', () => {
    renderModal();
    expect(lastReadArgs).toEqual({ characterId: 'char-a', ownerUid: 'uid-player' });
  });

  it('applique des dégâts sur la fiche et remonte les PV réels au tracker', async () => {
    const { onApplied } = renderModal();
    fireEvent.change(screen.getByLabelText('Montant'), { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: /Dégâts/ }));

    await waitFor(() =>
      expect(updateCharacterMock).toHaveBeenCalledWith({
        hp: { current: 9, max: 24, temp: 0 },
      }),
    );
    expect(onApplied).toHaveBeenCalledWith(9, 24);
  });

  it('les PV temporaires absorbent en premier — même règle que sur la fiche', async () => {
    characterHolder.character = mkCharacter({ current: 20, max: 24, temp: 5 });
    renderModal();
    fireEvent.change(screen.getByLabelText('Montant'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: /Dégâts/ }));

    // 5 absorbés par le tampon, 3 sur les PV réels.
    await waitFor(() =>
      expect(updateCharacterMock).toHaveBeenCalledWith({
        hp: { current: 17, max: 24, temp: 0 },
      }),
    );
  });

  it('un soin ne dépasse jamais le maximum', async () => {
    characterHolder.character = mkCharacter({ current: 22, max: 24, temp: 0 });
    renderModal();
    fireEvent.change(screen.getByLabelText('Montant'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /Soin/ }));

    await waitFor(() =>
      expect(updateCharacterMock).toHaveBeenCalledWith({
        hp: { current: 24, max: 24, temp: 0 },
      }),
    );
  });

  it('les PV temporaires ne se cumulent pas (on garde le plus avantageux)', async () => {
    characterHolder.character = mkCharacter({ current: 20, max: 24, temp: 7 });
    renderModal();
    fireEvent.change(screen.getByLabelText('Montant'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: /PV temp/ }));

    await waitFor(() =>
      expect(updateCharacterMock).toHaveBeenCalledWith({
        hp: { current: 20, max: 24, temp: 7 },
      }),
    );
  });

  it('les paliers rapides suivent les PV du personnage', () => {
    characterHolder.character = mkCharacter({ current: 60, max: 60, temp: 0 });
    renderModal();
    // 5 % / 15 % / 30 % de 60, arrondis « annonçables » — pas −1/−5/−10.
    expect(screen.getByRole('button', { name: '−20' })).toBeInTheDocument();
  });

  it('une écriture refusée affiche une erreur au lieu d’un silence', async () => {
    updateCharacterMock.mockRejectedValueOnce(new Error('permission-denied'));
    const { onApplied } = renderModal();
    fireEvent.change(screen.getByLabelText('Montant'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /Dégâts/ }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(onApplied).not.toHaveBeenCalled();
  });

  it('fiche illisible → message explicite, aucun contrôle', () => {
    characterHolder.character = null;
    renderModal();
    expect(screen.getByText(/Fiche illisible/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Montant')).not.toBeInTheDocument();
  });
});
