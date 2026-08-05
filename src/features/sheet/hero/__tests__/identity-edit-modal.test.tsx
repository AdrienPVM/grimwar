import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

/**
 * M18 — nom et alignement redeviennent modifiables après la création.
 *
 * Ce qui compte ici n'est pas « la modale s'ouvre » mais **ce qui part dans le
 * patch** : en omni-edit MJ le nom est réservé au propriétaire, donc il ne doit
 * PAS figurer dans l'écriture — sinon la rule Firestore rejette tout le patch et
 * l'alignement, légitime, est perdu avec lui.
 */

const updateCharacterMock = vi.fn((..._args: unknown[]) => Promise.resolve());
vi.mock('../../use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: (...args: unknown[]) => updateCharacterMock(...args),
    isUpdating: false,
    error: null,
  }),
}));

import { DM_LOCKED_FIELDS, PermissionProvider } from '../../permissions-context';
import { IdentityEditModal } from '../identity-edit-modal';

const CHARACTER = {
  id: 'char-1',
  name: 'Astrid',
  alignment: 'LB',
} as unknown as Character;

function renderModal(locked: boolean, children?: ReactNode): void {
  render(
    <PermissionProvider
      value={{
        canEdit: true,
        isDM: locked,
        isDMEdit: locked,
        ownerUid: locked ? 'player-2' : undefined,
        lockedFields: locked ? DM_LOCKED_FIELDS : [],
      }}
    >
      <IdentityEditModal character={CHARACTER} open onClose={() => {}} />
      {children}
    </PermissionProvider>,
  );
}

beforeEach(() => {
  updateCharacterMock.mockClear();
});

describe('<IdentityEditModal>', () => {
  it('écrit le nouveau nom et le nouvel alignement pour le propriétaire', async () => {
    const user = userEvent.setup();
    renderModal(false);

    const nameInput = screen.getByLabelText('Nom');
    await user.clear(nameInput);
    await user.type(nameInput, 'Corvus');

    // Combobox custom (pattern APG) : on ouvre puis on choisit l'option.
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Chaotique Neutre' }));

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(updateCharacterMock).toHaveBeenCalledTimes(1));
    expect(updateCharacterMock).toHaveBeenCalledWith({
      alignment: 'CN',
      name: 'Corvus',
    });
  });

  it('refuse d\'enregistrer un nom vide', async () => {
    const user = userEvent.setup();
    renderModal(false);

    await user.clear(screen.getByLabelText('Nom'));

    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
    expect(screen.getByText('Le nom ne peut pas être vide.')).toBeInTheDocument();
  });

  it('en omni-edit MJ : nom verrouillé, patch réduit au seul alignement', async () => {
    const user = userEvent.setup();
    renderModal(true);

    expect(screen.getByLabelText('Nom')).toBeDisabled();
    expect(screen.getByText('Réservé au joueur')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Neutre Mauvais' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(updateCharacterMock).toHaveBeenCalledTimes(1));
    expect(updateCharacterMock).toHaveBeenCalledWith({ alignment: 'NM' });
  });

  it('n\'écrit pas le nom quand il n\'a pas changé (patch minimal)', async () => {
    const user = userEvent.setup();
    renderModal(false);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Neutre' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(updateCharacterMock).toHaveBeenCalledTimes(1));
    expect(updateCharacterMock).toHaveBeenCalledWith({ alignment: 'N' });
  });
});
