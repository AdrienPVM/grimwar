import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCommandPaletteStore } from '@/shared/lib/slices/command-palette-slice';

import { CommandPalette } from '../command-palette';

/**
 * La palette de commandes, du raccourci jusqu'à la navigation.
 *
 * Ce qui est vérifié ici est ce qui casse en silence : le raccourci qui ne
 * répond pas, la sélection qui ne suit pas les flèches, ⏎ qui n'ouvre pas la
 * bonne chose, et surtout — le Codex qui se chargerait alors que personne ne le
 * cherche (dix bundles, sur chaque écran).
 */

const navigateMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, isReady: true }),
}));

vi.mock('@/features/library/use-characters-list', () => ({
  useCharactersList: () => ({
    characters: [
      {
        id: 'c1',
        name: 'Kaelen l’Éveillé',
        totalLevel: 5,
        classes: [{ classId: 'wizard', level: 5 }],
      },
      {
        id: 'c2',
        name: 'Brok',
        totalLevel: 3,
        classes: [{ classId: 'barbarian', level: 3 }],
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/features/campaigns/use-my-campaigns', () => ({
  useMyCampaigns: () => ({
    campaigns: [{ id: 'camp1', name: 'La Mort du Roi', gmIds: ['u1'] }],
    isLoading: false,
    error: null,
    refresh: () => undefined,
  }),
}));

/** Compte les bundles réclamés : le Codex ne doit se charger qu'à la demande. */
const requestedTypes: string[] = [];

const CLASSES = [
  {
    id: 'wizard',
    name: { fr: 'Magicien', en: 'Wizard' },
    hitDie: 'd6',
    description: { fr: 'Un érudit de la magie arcanique.', en: '' },
  },
  {
    id: 'barbarian',
    name: { fr: 'Barbare', en: 'Barbarian' },
    hitDie: 'd12',
    description: { fr: 'Un guerrier mû par la rage.', en: '' },
  },
];

const CONDITIONS = [
  {
    id: 'entrave',
    name: { fr: 'Entravé', en: 'Restrained' },
    description: { fr: 'Ta vitesse tombe à 0.', en: '' },
    source: 'srd-5.2.1',
  },
];

// Tableaux figés : le vrai `useContent` tient ses données dans un état React,
// donc leur identité est stable d'un rendu à l'autre. Un mock qui rendrait un
// `[]` neuf à chaque appel testerait une instabilité qui n'existe pas.
const EMPTY: never[] = [];

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    requestedTypes.push(type);
    const data =
      type === 'classes' ? CLASSES : type === 'conditions' ? CONDITIONS : EMPTY;
    return { data, loading: false, error: null, scopeOf: () => ({ scope: 'public' }) };
  },
}));

beforeEach(() => {
  navigateMock.mockClear();
  requestedTypes.length = 0;
  useCommandPaletteStore.setState({ open: false });
});

function openWithShortcut(): void {
  fireEvent.keyDown(window, { key: 'k', metaKey: true });
}

describe('Palette de commandes', () => {
  it('⌘K ouvre puis referme', () => {
    render(<CommandPalette />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    openWithShortcut();
    expect(screen.getByRole('combobox')).toBeInTheDocument();

    openWithShortcut();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('Ctrl+K ouvre aussi — tout le monde n’est pas sur un Mac', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(window, { key: 'K', ctrlKey: true });
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('fermée, elle ne charge RIEN — ni fiches, ni campagnes, ni Codex', () => {
    render(<CommandPalette />);
    expect(requestedTypes).toEqual([]);
  });

  it('ouverte, elle ne charge toujours pas les dix bundles du Codex', () => {
    render(<CommandPalette />);
    openWithShortcut();
    // Seul le bundle des classes est lu, pour nommer la classe d'un personnage.
    expect(requestedTypes).toEqual(['classes']);
  });

  it('à l’ouverture, elle montre déjà personnages, campagnes et destinations', () => {
    render(<CommandPalette />);
    openWithShortcut();

    expect(screen.getByRole('option', { name: /Kaelen/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /La Mort du Roi/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Le Codex/ })).toBeInTheDocument();
  });

  it('un personnage porte sa classe et son niveau', () => {
    render(<CommandPalette />);
    openWithShortcut();
    const option = screen.getByRole('option', { name: /Kaelen/ });
    expect(within(option).getByText('Magicien · niv. 5')).toBeInTheDocument();
  });

  it('chercher sans accent trouve le personnage accentué', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openWithShortcut();

    await user.type(screen.getByRole('combobox'), 'eveille');

    expect(screen.getByRole('option', { name: /Kaelen/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^Brok/ })).not.toBeInTheDocument();
  });

  it('⏎ ouvre la rangée sélectionnée, et la palette se referme', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openWithShortcut();

    await user.type(screen.getByRole('combobox'), 'brok');
    await user.keyboard('{Enter}');

    expect(navigateMock).toHaveBeenCalledWith('/character/c2');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('le champ prend le focus tout seul à l’ouverture', async () => {
    render(<CommandPalette />);
    openWithShortcut();

    // `DetailModal` vise d'abord son bouton de fermeture ; le champ le récupère
    // une image plus tard. Sans ça, la première lettre tapée partirait ailleurs.
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveFocus();
    });
  });

  it('↓ déplace la sélection d’une rangée à la suivante', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openWithShortcut();

    const first = screen.getAllByRole('option')[0]!;
    expect(first).toHaveAttribute('aria-selected', 'true');

    await user.type(screen.getByRole('combobox'), '{ArrowDown}');

    expect(first).toHaveAttribute('aria-selected', 'false');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('↑ depuis la première rangée boucle sur la dernière', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openWithShortcut();

    await user.type(screen.getByRole('combobox'), '{ArrowUp}');

    const options = screen.getAllByRole('option');
    expect(options[options.length - 1]).toHaveAttribute('aria-selected', 'true');
  });

  it('une destination navigue au clic', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openWithShortcut();

    await user.click(screen.getByRole('option', { name: /Rejoindre une campagne/ }));

    expect(navigateMock).toHaveBeenCalledWith('/campaigns/join');
  });

  it('« sorts » mène au Codex sans que le mot « sorts » soit son nom', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openWithShortcut();

    await user.type(screen.getByRole('combobox'), 'sorts');

    expect(screen.getByRole('option', { name: /Le Codex/ })).toBeInTheDocument();
  });

  it('au-delà de deux frappes, le Codex se charge et rend ses entrées', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openWithShortcut();

    await user.type(screen.getByRole('combobox'), 'entrave');

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Entravé/ })).toBeInTheDocument();
    });
    // Cette fois les dix bundles sont bien réclamés.
    expect(requestedTypes).toContain('monsters');
    expect(requestedTypes).toContain('spells');
  });

  it('ouvrir une entrée du Codex ne referme pas la palette', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openWithShortcut();

    await user.type(screen.getByRole('combobox'), 'entrave');
    await waitFor(() => screen.getByRole('option', { name: /Entravé/ }));
    await user.click(screen.getByRole('option', { name: /Entravé/ }));

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('rien ne correspond → un message, pas une liste vide muette', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openWithShortcut();

    await user.type(screen.getByRole('combobox'), 'zzzzzz');

    await waitFor(() => {
      expect(screen.getByText('Rien ne correspond à ta recherche.')).toBeInTheDocument();
    });
  });
});
