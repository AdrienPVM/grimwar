import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

import { PermissionProvider } from '../../permissions-context';
import { CharacterSwitcher } from '../character-switcher';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const characters: Character[] = [];
vi.mock('@/features/library/use-characters-list', () => ({
  useCharactersList: () => ({ characters, isLoading: false, error: null }),
}));

function makeCharacter(id: string, name: string, level = 3): Character {
  return {
    id,
    name,
    totalLevel: level,
    portrait: { kind: 'letter', value: name[0]! },
  } as unknown as Character;
}

function renderSwitcher(opts: { isDMEdit?: boolean } = {}): void {
  render(
    <MemoryRouter>
      <PermissionProvider
        value={{
          canEdit: true,
          isDM: false,
          isDMEdit: opts.isDMEdit ?? false,
          lockedFields: [],
        }}
      >
        <CharacterSwitcher currentId="c1">Vex</CharacterSwitcher>
      </PermissionProvider>
    </MemoryRouter>,
  );
}

describe('<CharacterSwitcher>', () => {
  beforeEach(() => {
    navigate.mockReset();
    characters.length = 0;
  });

  it('reste un simple titre quand il n’y a rien vers quoi basculer', () => {
    // Un bouton qui n'ouvrirait que sur soi-même est du bruit : il promet une
    // action et n'en offre aucune.
    characters.push(makeCharacter('c1', 'Vex'));
    renderSwitcher();
    expect(screen.queryByTestId('character-switcher-trigger')).toBeNull();
    expect(screen.getByText('Vex')).toBeTruthy();
  });

  it('devient une porte dès qu’une autre fiche existe', async () => {
    characters.push(makeCharacter('c1', 'Vex'), makeCharacter('c2', 'Sif', 5));
    renderSwitcher();
    const trigger = screen.getByTestId('character-switcher-trigger');
    await userEvent.click(trigger);

    const options = screen.getAllByTestId('character-switcher-option');
    // La fiche courante ne se propose pas elle-même.
    expect(options).toHaveLength(1);
    expect(options[0]!.textContent).toContain('Sif');
    expect(options[0]!.textContent).toContain('5');
  });

  it('ouvre la fiche choisie', async () => {
    characters.push(makeCharacter('c1', 'Vex'), makeCharacter('c2', 'Sif'));
    renderSwitcher();
    await userEvent.click(screen.getByTestId('character-switcher-trigger'));
    await userEvent.click(screen.getByTestId('character-switcher-option'));
    expect(navigate).toHaveBeenCalledWith('/character/c2');
  });

  it('disparaît quand un MJ consulte la fiche d’un joueur', () => {
    // En omni-édition on est dans le contexte d'une campagne : offrir un saut
    // vers SES propres personnages serait une sortie déguisée de ce contexte.
    characters.push(makeCharacter('c1', 'Vex'), makeCharacter('c2', 'Sif'));
    renderSwitcher({ isDMEdit: true });
    expect(screen.queryByTestId('character-switcher-trigger')).toBeNull();
  });
});
