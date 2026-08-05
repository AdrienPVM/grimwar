import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { Item } from '@/shared/types/content';

/**
 * M27 — « Forger L'Épée du Seigneur des Corbeaux : 1d8 tranchant ».
 *
 * L'ancien formulaire ne collectait que nom / catégorie / poids / description.
 * Une arme sans `damage` est rejetée EN SILENCE par la liste d'attaques : elle
 * apparaissait dans le sac et restait injouable. Le test vise donc le CONTENU
 * de l'objet écrit, pas la présence du formulaire.
 */

const addToPackMock = vi.fn((..._args: unknown[]) => Promise.resolve());
vi.mock('../personal-item-pack', () => ({
  PERSONAL_PACK_ID: 'mes-objets',
  addItemToPersonalPack: (...args: unknown[]) => addToPackMock(...args),
}));

const addItemToInventoryMock = vi.fn((..._args: unknown[]) => Promise.resolve());
vi.mock('@/shared/lib/inventory', () => ({
  addItemToInventory: (...args: unknown[]) => addItemToInventoryMock(...args),
}));

const updateCharacterMock = vi.fn((..._args: unknown[]) => Promise.resolve());
vi.mock('../../../use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: (...args: unknown[]) => updateCharacterMock(...args),
    isUpdating: false,
    error: null,
  }),
}));

vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => ({ user: { uid: 'uid-1' } }),
}));

import { CustomItemForm } from '../custom-item-form';

const CHARACTER = {
  id: 'c1',
  inventory: { items: [], coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 }, weightCache: 0 },
} as unknown as Character;

beforeEach(() => {
  addToPackMock.mockClear();
  addItemToInventoryMock.mockClear();
  updateCharacterMock.mockClear();
});

describe('<CustomItemForm>', () => {
  it('forge une arme AVEC ses dégâts et l’ajoute en scope « user »', async () => {
    const user = userEvent.setup();
    render(
      <CustomItemForm character={CHARACTER} onCancel={() => {}} onCreated={async () => {}} />,
    );

    await user.type(screen.getByLabelText(/Identifiant/i), 'epee-du-corbeau');
    await user.type(screen.getByLabelText(/Nom \(FR\)/i), 'Épée du Seigneur des Corbeaux');
    // Combobox custom (pattern APG), pas un <select> natif.
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Arme' }));

    // La section dégâts n'existait tout simplement pas dans l'ancien
    // formulaire — c'est elle qui rendait l'arme injouable.
    await user.click(screen.getByLabelText(/Dégâts indiqués/i));
    const diceField = screen.getByLabelText(/Dés de dégâts/i);
    await user.clear(diceField);
    await user.type(diceField, '1d8');
    await user.type(screen.getByLabelText(/Libellé d’affichage \(FR\)/i), 'tranchant');

    await user.click(screen.getByRole('button', { name: /Confirmer l’objet/i }));

    await waitFor(() => expect(addToPackMock).toHaveBeenCalledTimes(1));
    const [uid, item] = addToPackMock.mock.calls[0] as [string, Item];
    expect(uid).toBe('uid-1');
    expect(item.id).toBe('epee-du-corbeau');
    expect(item.damage?.dice).toBe('1d8');

    // Scope « user » : poser « public » rendrait l'objet introuvable à la
    // relecture, puisqu'il ne vit pas dans `public/data`.
    await waitFor(() => expect(addItemToInventoryMock).toHaveBeenCalledTimes(1));
    expect(addItemToInventoryMock.mock.calls[0]?.[2]).toBe('user');
    expect(addItemToInventoryMock.mock.calls[0]?.[4]).toBe('uid-1');
  });
});
