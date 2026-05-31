import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests JALON 3C.1 — `PackEditorScreen`. Pattern miroir de
 * `import-screen.test.tsx` : mocks de useAuth + pack-storage + toast,
 * import du composant après les mocks.
 *
 * Couvre les trois flots :
 *   1. État initial — métadonnées vides, 0 feat, bouton Save présent.
 *   2. Saisie d'un feat + métadonnées + Save → `writePack` appelé avec un
 *      `CustomContentPack` Zod-valide.
 *   3. Save sans feat → validation Zod échoue (catégorie vide) →
 *      `writePack` jamais appelé, erreur affichée.
 */

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUseAuth = vi.fn();
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockWritePack = vi.fn();
vi.mock('@/shared/lib/services/pack-storage', () => ({
  writePack: (...args: unknown[]) => mockWritePack(...args),
}));

const mockShowToast = vi.fn();
vi.mock('@/shared/lib/slices/toast-slice', () => ({
  showToast: (entry: unknown) => mockShowToast(entry),
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({}),
}));

import { PackEditorScreen } from '../pack-editor-screen';

const UID = 'user-alice';

beforeEach(() => {
  mockUseAuth.mockReset().mockReturnValue({
    user: { uid: UID },
    isReady: true,
    isAnonymous: true,
  });
  mockWritePack.mockReset().mockResolvedValue(undefined);
  mockShowToast.mockReset();
  mockNavigate.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

function renderScreen(): void {
  render(
    <MemoryRouter initialEntries={['/account/content/new']}>
      <PackEditorScreen />
    </MemoryRouter>,
  );
}

describe('PackEditorScreen — rendu initial', () => {
  it('affiche le titre, les sections meta + entités et l\'état vide des feats', () => {
    renderScreen();
    expect(screen.getByText(/Créer un pack/i)).toBeInTheDocument();
    expect(screen.getByTestId('pack-editor-meta')).toBeInTheDocument();
    expect(screen.getByTestId('pack-editor-feats')).toBeInTheDocument();
    expect(
      screen.getByText(/Aucun don ajouté/i),
    ).toBeInTheDocument();
  });
});

describe('PackEditorScreen — création d\'un pack valide', () => {
  it("saisit méta + feat → save → writePack reçoit un pack Zod-valide", async () => {
    const user = userEvent.setup();
    renderScreen();

    // 1. Métadonnées
    await user.type(screen.getByTestId('pack-meta-id'), 'pack-tracer');
    await user.type(screen.getByTestId('pack-meta-name-fr'), 'Pack tracer');
    await user.type(screen.getByTestId('pack-meta-author'), 'Adrien');
    // version = 1.0.0 par défaut

    // 2. Ouvre form feat → saisit feat
    await user.click(screen.getByTestId('pack-editor-add-feat'));
    expect(screen.getByTestId('feat-form')).toBeInTheDocument();

    await user.type(screen.getByTestId('feat-form-id'), 'don-tracer');
    await user.type(screen.getByTestId('feat-form-name-fr'), 'Don tracer');
    await user.click(screen.getByTestId('feat-form-confirm'));

    // 3. Le feat apparaît dans la liste, le form disparaît
    expect(screen.queryByTestId('feat-form')).not.toBeInTheDocument();
    const featRow = screen.getByTestId('pack-editor-feat-row');
    expect(featRow).toHaveAttribute('data-feat-id', 'don-tracer');
    expect(featRow).toHaveTextContent('Don tracer');

    // 4. Save → writePack appelé avec un pack valide
    await user.click(screen.getByTestId('pack-editor-save'));

    await waitFor(() => expect(mockWritePack).toHaveBeenCalledOnce());
    const [calledUid, calledPack] = mockWritePack.mock.calls[0]!;
    expect(calledUid).toBe(UID);
    expect(calledPack.meta.id).toBe('pack-tracer');
    expect(calledPack.meta.name.fr).toBe('Pack tracer');
    expect(calledPack.meta.author).toBe('Adrien');
    expect(calledPack.meta.version).toBe('1.0.0');
    expect(calledPack.entities.feats).toHaveLength(1);
    expect(calledPack.entities.feats[0].id).toBe('don-tracer');
    expect(calledPack.entities.feats[0].name.fr).toBe('Don tracer');
    expect(calledPack.entities.feats[0].source).toBe('aidedd-homebrew');

    // 5. Toast succès + redirection
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/account/content'),
    );
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'info' }),
    );
  });
});

describe('PackEditorScreen — validation', () => {
  it('refuse un save avec 0 feat (pack vide) — writePack non appelé', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByTestId('pack-meta-id'), 'pack-vide');
    await user.type(screen.getByTestId('pack-meta-name-fr'), 'Pack vide');
    await user.type(screen.getByTestId('pack-meta-author'), 'Adrien');

    await user.click(screen.getByTestId('pack-editor-save'));

    expect(mockWritePack).not.toHaveBeenCalled();
    expect(
      screen.getByTestId('pack-editor-validation-error'),
    ).toBeInTheDocument();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'grim' }),
    );
  });

  it("refuse un feat sans id (champ requis) — pas d'ajout à la liste", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByTestId('pack-editor-add-feat'));
    await user.type(screen.getByTestId('feat-form-name-fr'), 'Sans id');
    await user.click(screen.getByTestId('feat-form-confirm'));

    // Form reste ouvert, pas de feat-row ajoutée
    expect(screen.getByTestId('feat-form')).toBeInTheDocument();
    expect(screen.queryByTestId('pack-editor-feat-row')).not.toBeInTheDocument();
  });

  it('refuse un feat avec id non kebab-case', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByTestId('pack-editor-add-feat'));
    await user.type(screen.getByTestId('feat-form-id'), 'Don Tracer');
    await user.type(screen.getByTestId('feat-form-name-fr'), 'Don tracer');
    await user.click(screen.getByTestId('feat-form-confirm'));

    expect(screen.getByTestId('feat-form')).toBeInTheDocument();
    expect(screen.queryByTestId('pack-editor-feat-row')).not.toBeInTheDocument();
  });
});
