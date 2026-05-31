import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CustomContentPack } from '@/shared/types/custom-content-pack';

import type { PackListEntry } from '../use-packs';

/**
 * Tests JALON 3B.4 — `ImportScreen`. Patterns miroir de
 * `library-screen.test.tsx` : mocks de useAuth + usePacks + pack-storage,
 * import du composant après les mocks.
 *
 * On vérifie les 4 transitions clés :
 *   1. État idle → DropZone visible.
 *   2. Drop d'un JSON invalide (parse error) → InvalidJsonCard.
 *   3. Drop d'un pack avec doublon → ErrorsCard avec l'erreur structurée.
 *   4. Drop d'un pack valide → PreviewCard avec counts + bouton Importer
 *      qui appelle writePack.
 *
 * La liste de packs déjà importés rend chaque entrée + bouton supprimer.
 */

const mockUseAuth = vi.fn();
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUsePacks = vi.fn();
vi.mock('../use-packs', () => ({
  usePacks: () => mockUsePacks(),
}));

const mockWritePack = vi.fn();
const mockDeletePack = vi.fn();
vi.mock('@/shared/lib/services/pack-storage', () => ({
  writePack: (...args: unknown[]) => mockWritePack(...args),
  deletePack: (...args: unknown[]) => mockDeletePack(...args),
}));

const mockShowToast = vi.fn();
vi.mock('@/shared/lib/slices/toast-slice', () => ({
  showToast: (entry: unknown) => mockShowToast(entry),
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({}),
}));

import { ImportScreen } from '../import-screen';

const UID = 'user-alice';

const validSpell = {
  id: 'feu-magique',
  name: { fr: 'Feu magique', en: 'Magic fire' },
  level: 1,
  school: 'evocation' as const,
  castingTime: { fr: '1 action', en: '1 action' },
  range: { fr: '30 mètres', en: '120 feet' },
  components: { v: true, s: true, m: false },
  duration: { fr: 'Instantanée', en: 'Instantaneous' },
  concentration: false,
  ritual: false,
  description: {
    fr: 'Un trait de feu jaillit de ta main.',
    en: 'A bolt of fire shoots from your hand.',
  },
  atHigherLevels: null,
  classes: ['wizard'],
  source: 'srd-5.2.1' as const,
};

const validPack: CustomContentPack = {
  meta: {
    id: 'pack-test',
    name: { fr: 'Pack de test', en: 'Test pack' },
    version: '1.0.0',
    author: 'MJ Adrien',
    createdAt: '2026-05-31T12:00:00Z',
  },
  entities: { spells: [validSpell] },
};

function fileFromJson(data: unknown, name = 'pack.json'): File {
  return new File([JSON.stringify(data)], name, { type: 'application/json' });
}

function renderScreen(): void {
  render(
    <MemoryRouter initialEntries={['/account/content']}>
      <ImportScreen />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUseAuth.mockReset().mockReturnValue({
    user: { uid: UID },
    isReady: true,
    isAnonymous: true,
  });
  mockUsePacks.mockReset().mockReturnValue({
    packs: [],
    isLoading: false,
    error: null,
  });
  mockWritePack.mockReset().mockResolvedValue(undefined);
  mockDeletePack.mockReset().mockResolvedValue(undefined);
  mockShowToast.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ImportScreen — rendu initial', () => {
  it('affiche le titre + DropZone en état idle', () => {
    renderScreen();
    expect(screen.getByText(/Contenu personnalisé/i)).toBeInTheDocument();
    expect(screen.getByTestId('pack-dropzone')).toBeInTheDocument();
  });

  it('affiche la liste des packs déjà importés (empty state)', () => {
    renderScreen();
    expect(
      screen.getByText(/Aucun pack importé/i),
    ).toBeInTheDocument();
  });
});

describe('ImportScreen — fichier picker → JSON invalide', () => {
  it("affiche InvalidJsonCard quand le fichier n'est pas du JSON", async () => {
    renderScreen();
    const input = screen.getByTestId('pack-file-input') as HTMLInputElement;
    const badFile = new File(['not json {{{'], 'bad.json', {
      type: 'application/json',
    });
    await userEvent.upload(input, badFile);
    await waitFor(() => {
      expect(screen.getByTestId('pack-invalid-json')).toBeInTheDocument();
    });
  });
});

describe('ImportScreen — pack invalide (schema)', () => {
  it('affiche ErrorsCard avec une erreur structurée pour doublon id', async () => {
    renderScreen();
    const input = screen.getByTestId('pack-file-input') as HTMLInputElement;
    const dupPack = {
      ...validPack,
      entities: { spells: [validSpell, validSpell] },
    };
    await userEvent.upload(input, fileFromJson(dupPack));
    expect(await screen.findByTestId('pack-errors', undefined, { timeout: 3000 })).toBeInTheDocument();
    expect(
      screen.getByText(/doublon/i),
    ).toBeInTheDocument();
  });
});

describe('ImportScreen — pack valide → import', () => {
  it('affiche PreviewCard avec counts puis appelle writePack au clic Importer', async () => {
    renderScreen();
    const input = screen.getByTestId('pack-file-input') as HTMLInputElement;
    await userEvent.upload(input, fileFromJson(validPack));
    expect(await screen.findByTestId('pack-preview', undefined, { timeout: 3000 })).toBeInTheDocument();
    const counts = screen.getByTestId('pack-counts');
    expect(counts).toHaveTextContent('Sorts');
    expect(counts).toHaveTextContent('1');

    const importBtn = screen.getByTestId('pack-import-confirm');
    await userEvent.click(importBtn);

    await waitFor(() => {
      expect(mockWritePack).toHaveBeenCalledTimes(1);
    });
    expect(mockWritePack).toHaveBeenCalledWith(UID, validPack);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('importé'),
      }),
    );
  });
});

describe('ImportScreen — liste des packs + delete', () => {
  it('affiche un PackRow par pack et appelle deletePack à la confirmation', async () => {
    const packEntry: PackListEntry = {
      packId: 'pack-test',
      meta: validPack.meta,
      importedAt: 1_700_000_000_000,
    };
    mockUsePacks.mockReturnValue({
      packs: [packEntry],
      isLoading: false,
      error: null,
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderScreen();
    const row = screen.getByTestId('pack-row');
    expect(row).toHaveAttribute('data-pack-id', 'pack-test');
    const deleteBtn = screen.getByTestId('pack-delete');
    await userEvent.click(deleteBtn);
    await waitFor(() => {
      expect(mockDeletePack).toHaveBeenCalledWith(UID, 'pack-test');
    });
    confirmSpy.mockRestore();
  });

  it("n'appelle pas deletePack si l'utilisateur annule la confirmation", async () => {
    const packEntry: PackListEntry = {
      packId: 'pack-test',
      meta: validPack.meta,
      importedAt: null,
    };
    mockUsePacks.mockReturnValue({
      packs: [packEntry],
      isLoading: false,
      error: null,
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderScreen();
    await userEvent.click(screen.getByTestId('pack-delete'));
    expect(mockDeletePack).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
