import { render, screen, waitFor, within } from '@testing-library/react';
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

// SubancestryForm dépend de useContent('ancestries') — on stub avec un set
// minimal (humain SRD) pour pouvoir sélectionner une parente. BackgroundForm
// dépend de useContent('items') — on stub un item minimal (corde) pour
// pouvoir ajouter un équipement. Pour 3C.1/3C.2 (FeatForm/InvocationForm) ces
// mocks ne changent rien — ils n'appellent jamais useContent.
vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'ancestries') {
      return {
        data: [
          {
            id: 'humain',
            name: { fr: 'Humain', en: 'Human' },
          },
        ],
        loading: false,
        error: null,
      };
    }
    if (type === 'items') {
      return {
        data: [
          {
            id: 'rope',
            name: { fr: 'Corde', en: 'Rope' },
          },
        ],
        loading: false,
        error: null,
      };
    }
    if (type === 'classes') {
      return {
        data: [
          {
            id: 'guerrier',
            name: { fr: 'Guerrier', en: 'Fighter' },
          },
        ],
        loading: false,
        error: null,
      };
    }
    return { data: [], loading: false, error: null };
  },
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

describe('PackEditorScreen — création d\'une invocation (JALON 3C.2)', () => {
  it('saisit méta + invocation → save → writePack reçoit un pack avec invocations[]', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByTestId('pack-meta-id'), 'pack-inv');
    await user.type(screen.getByTestId('pack-meta-name-fr'), 'Pack invocations');
    await user.type(screen.getByTestId('pack-meta-author'), 'Adrien');

    await user.click(screen.getByTestId('pack-editor-add-invocation'));
    expect(screen.getByTestId('invocation-form')).toBeInTheDocument();

    await user.type(screen.getByTestId('invocation-form-id'), 'inv-tracer');
    await user.type(screen.getByTestId('invocation-form-name-fr'), 'Invocation tracer');
    await user.type(screen.getByTestId('invocation-form-summary-fr'), 'Effet de test');
    await user.click(screen.getByTestId('invocation-form-confirm'));

    expect(screen.queryByTestId('invocation-form')).not.toBeInTheDocument();
    const invRow = screen.getByTestId('pack-editor-invocation-row');
    expect(invRow).toHaveAttribute('data-invocation-id', 'inv-tracer');
    expect(invRow).toHaveTextContent('Invocation tracer');

    await user.click(screen.getByTestId('pack-editor-save'));

    await waitFor(() => expect(mockWritePack).toHaveBeenCalledOnce());
    const [, calledPack] = mockWritePack.mock.calls[0]!;
    expect(calledPack.entities.invocations).toHaveLength(1);
    expect(calledPack.entities.invocations[0].id).toBe('inv-tracer');
    expect(calledPack.entities.invocations[0].name.fr).toBe('Invocation tracer');
    expect(calledPack.entities.invocations[0].summary.fr).toBe('Effet de test');
    expect(calledPack.entities.invocations[0].prerequisiteWarlockLevel).toBeNull();
    expect(calledPack.entities.invocations[0].source).toBe('aidedd-homebrew');
    // Pas de feats — invocations seules suffisent à passer parsePack.
    expect(calledPack.entities.feats).toBeUndefined();
  });

  it("propage le niveau warlock quand le toggle est activé", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByTestId('pack-meta-id'), 'pack-inv-l5');
    await user.type(screen.getByTestId('pack-meta-name-fr'), 'Pack');
    await user.type(screen.getByTestId('pack-meta-author'), 'Adrien');

    await user.click(screen.getByTestId('pack-editor-add-invocation'));
    await user.type(screen.getByTestId('invocation-form-id'), 'inv-l5');
    await user.type(screen.getByTestId('invocation-form-name-fr'), 'Inv L5');
    await user.type(screen.getByTestId('invocation-form-summary-fr'), 'Effet');

    // Toggle le checkbox via le label associé (click sur l'input natif)
    await user.click(screen.getByTestId('invocation-form-has-level-prereq'));
    // Champ niveau apparaît
    const levelInput = screen.getByTestId('invocation-form-warlock-level');
    expect(levelInput).toBeInTheDocument();

    await user.click(screen.getByTestId('invocation-form-confirm'));
    await user.click(screen.getByTestId('pack-editor-save'));

    await waitFor(() => expect(mockWritePack).toHaveBeenCalledOnce());
    const [, calledPack] = mockWritePack.mock.calls[0]!;
    // Valeur par défaut du niveau quand le toggle vient d'être activé = 2
    expect(calledPack.entities.invocations[0].prerequisiteWarlockLevel).toBe(2);
  });
});

describe("PackEditorScreen — création d'une sous-ascendance (JALON 3C.3)", () => {
  async function selectAncestry(
    user: ReturnType<typeof userEvent.setup>,
    label: string,
  ): Promise<void> {
    const wrapper = screen.getByTestId('subancestry-form-ancestry-id');
    const trigger = within(wrapper).getByRole('combobox');
    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: label }));
  }

  it("saisit méta + subancestry référant Humain SRD → save → writePack reçoit pack.entities.subancestries", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByTestId('pack-meta-id'), 'pack-sub');
    await user.type(screen.getByTestId('pack-meta-name-fr'), 'Pack sub');
    await user.type(screen.getByTestId('pack-meta-author'), 'Adrien');

    await user.click(screen.getByTestId('pack-editor-add-subancestry'));
    expect(screen.getByTestId('subancestry-form')).toBeInTheDocument();

    await user.type(
      screen.getByTestId('subancestry-form-id'),
      'human-vigilant',
    );
    await selectAncestry(user, 'Humain');
    await user.type(
      screen.getByTestId('subancestry-form-name-fr'),
      'Humain vigilant',
    );
    await user.type(
      screen.getByTestId('subancestry-form-description-fr'),
      'Variante de Humain pour test e2e.',
    );

    // 1 ASI : FOR +2
    await user.click(screen.getByTestId('subancestry-form-asi-add'));
    const asiWrapper = screen.getByTestId('subancestry-form-asi-ability-0');
    await user.click(within(asiWrapper).getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Force' }));

    await user.click(screen.getByTestId('subancestry-form-confirm'));

    expect(screen.queryByTestId('subancestry-form')).not.toBeInTheDocument();
    const subRow = screen.getByTestId('pack-editor-subancestry-row');
    expect(subRow).toHaveAttribute('data-subancestry-id', 'human-vigilant');
    expect(subRow).toHaveTextContent('Humain vigilant');

    await user.click(screen.getByTestId('pack-editor-save'));

    await waitFor(() => expect(mockWritePack).toHaveBeenCalledOnce());
    const [, calledPack] = mockWritePack.mock.calls[0]!;
    expect(calledPack.entities.subancestries).toHaveLength(1);
    const sub = calledPack.entities.subancestries[0];
    expect(sub.id).toBe('human-vigilant');
    expect(sub.ancestryId).toBe('humain');
    expect(sub.name.fr).toBe('Humain vigilant');
    expect(sub.abilityScoreIncrease).toEqual([{ ability: 'for', bonus: 1 }]);
    expect(sub.source).toBe('aidedd-homebrew');
    expect(calledPack.entities.feats).toBeUndefined();
    expect(calledPack.entities.invocations).toBeUndefined();
  });

  it("refuse confirm si ancestryId non choisie (erreur visible)", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByTestId('pack-editor-add-subancestry'));
    await user.type(screen.getByTestId('subancestry-form-id'), 'sub-a');
    await user.type(screen.getByTestId('subancestry-form-name-fr'), 'Sub');
    await user.type(
      screen.getByTestId('subancestry-form-description-fr'),
      'Test.',
    );
    await user.click(screen.getByTestId('subancestry-form-confirm'));

    // Le form reste ouvert tant que l'ancestry n'est pas sélectionnée
    expect(screen.getByTestId('subancestry-form')).toBeInTheDocument();
    expect(screen.queryByTestId('pack-editor-subancestry-row')).not.toBeInTheDocument();
  });
});

describe("PackEditorScreen — création d'un background (JALON 3C.4)", () => {
  async function selectItem(
    user: ReturnType<typeof userEvent.setup>,
    rowIndex: number,
    label: string,
  ): Promise<void> {
    const wrapper = screen.getByTestId(
      `background-form-equipment-item-${rowIndex}`,
    );
    const trigger = within(wrapper).getByRole('combobox');
    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: label }));
  }

  it("saisit méta + background complet → save → writePack reçoit pack.entities.backgrounds", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByTestId('pack-meta-id'), 'pack-bg');
    await user.type(screen.getByTestId('pack-meta-name-fr'), 'Pack bg');
    await user.type(screen.getByTestId('pack-meta-author'), 'Adrien');

    await user.click(screen.getByTestId('pack-editor-add-background'));
    expect(screen.getByTestId('background-form')).toBeInTheDocument();

    await user.type(screen.getByTestId('background-form-id'), 'wanderer');
    await user.type(screen.getByTestId('background-form-name-fr'), 'Vagabond');
    await user.type(
      screen.getByTestId('background-form-description-fr'),
      'Voyage sans relâche.',
    );

    // Toggle deux skills (FR labels Athlétisme + Survie)
    await user.click(screen.getByTestId('background-form-skill-athletics'));
    await user.click(screen.getByTestId('background-form-skill-survival'));

    // Ajoute un outil libre
    await user.type(
      screen.getByTestId('background-form-tool-input'),
      'navigators-tools',
    );
    await user.click(screen.getByTestId('background-form-tool-add'));

    // Ajoute 1 ligne d'équipement référant rope (seul item dans le mock)
    await user.click(screen.getByTestId('background-form-equipment-add'));
    await selectItem(user, 0, 'Corde');

    // Active les pièces de départ → 5 PO
    await user.click(screen.getByTestId('background-form-coins-toggle'));

    // Renseigne le don
    await user.type(
      screen.getByTestId('background-form-feature-name-fr'),
      'Bénédiction',
    );
    await user.type(
      screen.getByTestId('background-form-feature-description-fr'),
      'Voyage plus vite.',
    );

    await user.click(screen.getByTestId('background-form-confirm'));

    expect(screen.queryByTestId('background-form')).not.toBeInTheDocument();
    const bgRow = screen.getByTestId('pack-editor-background-row');
    expect(bgRow).toHaveAttribute('data-background-id', 'wanderer');
    expect(bgRow).toHaveTextContent('Vagabond');

    await user.click(screen.getByTestId('pack-editor-save'));

    await waitFor(() => expect(mockWritePack).toHaveBeenCalledOnce());
    const [, calledPack] = mockWritePack.mock.calls[0]!;
    expect(calledPack.entities.backgrounds).toHaveLength(1);
    const bg = calledPack.entities.backgrounds[0];
    expect(bg.id).toBe('wanderer');
    expect(bg.name.fr).toBe('Vagabond');
    expect(bg.skillProficiencies).toEqual(['Athletics', 'Survival']);
    expect(bg.toolProficiencies).toEqual(['navigators-tools']);
    expect(bg.equipment).toEqual([{ itemId: 'rope', qty: 1 }]);
    expect(bg.startingCoins).toEqual({ qty: 0, unit: 'gp' });
    expect(bg.feature.name.fr).toBe('Bénédiction');
    expect(bg.source).toBe('aidedd-homebrew');
    expect(calledPack.entities.feats).toBeUndefined();
  });

  it('refuse confirm si featureNameFr manque (erreur visible)', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByTestId('pack-editor-add-background'));
    await user.type(screen.getByTestId('background-form-id'), 'bg-x');
    await user.type(screen.getByTestId('background-form-name-fr'), 'X');
    await user.type(
      screen.getByTestId('background-form-description-fr'),
      'D',
    );
    // featureNameFr / featureDescriptionFr volontairement vides
    await user.click(screen.getByTestId('background-form-confirm'));

    expect(screen.getByTestId('background-form')).toBeInTheDocument();
    expect(
      screen.queryByTestId('pack-editor-background-row'),
    ).not.toBeInTheDocument();
  });
});

describe("PackEditorScreen — création d'une sous-classe (JALON 3C.5)", () => {
  async function selectClass(
    user: ReturnType<typeof userEvent.setup>,
    label: string,
  ): Promise<void> {
    const wrapper = screen.getByTestId('subclass-form-class-id');
    const trigger = within(wrapper).getByRole('combobox');
    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: label }));
  }

  it("saisit méta + subclass référant Guerrier SRD → save → writePack reçoit pack.entities.subclasses", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByTestId('pack-meta-id'), 'pack-sc');
    await user.type(screen.getByTestId('pack-meta-name-fr'), 'Pack subclasse');
    await user.type(screen.getByTestId('pack-meta-author'), 'Adrien');

    await user.click(screen.getByTestId('pack-editor-add-subclass'));
    expect(screen.getByTestId('subclass-form')).toBeInTheDocument();

    await user.type(screen.getByTestId('subclass-form-id'), 'fighter-tracer');
    await selectClass(user, 'Guerrier');
    await user.type(
      screen.getByTestId('subclass-form-name-fr'),
      'Tracer du champ',
    );
    await user.type(
      screen.getByTestId('subclass-form-description-fr'),
      'Sous-classe custom de test.',
    );

    // 1 feature L3
    await user.click(screen.getByTestId('subclass-form-feature-add'));
    await user.type(
      screen.getByTestId('subclass-form-feature-name-fr-0'),
      'Coup précis',
    );
    await user.type(
      screen.getByTestId('subclass-form-feature-description-fr-0'),
      'Inflige +2 dégâts une fois par tour.',
    );

    await user.click(screen.getByTestId('subclass-form-confirm'));

    expect(screen.queryByTestId('subclass-form')).not.toBeInTheDocument();
    const scRow = screen.getByTestId('pack-editor-subclass-row');
    expect(scRow).toHaveAttribute('data-subclass-id', 'fighter-tracer');
    expect(scRow).toHaveTextContent('Tracer du champ');

    await user.click(screen.getByTestId('pack-editor-save'));

    await waitFor(() => expect(mockWritePack).toHaveBeenCalledOnce());
    const [, calledPack] = mockWritePack.mock.calls[0]!;
    expect(calledPack.entities.subclasses).toHaveLength(1);
    const sc = calledPack.entities.subclasses[0];
    expect(sc.id).toBe('fighter-tracer');
    expect(sc.classId).toBe('guerrier');
    expect(sc.name.fr).toBe('Tracer du champ');
    expect(sc.features).toHaveLength(1);
    expect(sc.features[0].level).toBe(3);
    expect(sc.features[0].name.fr).toBe('Coup précis');
    expect(sc.source).toBe('aidedd-homebrew');
    expect(calledPack.entities.feats).toBeUndefined();
  });

  it('refuse confirm si classId non choisi (erreur visible)', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByTestId('pack-editor-add-subclass'));
    await user.type(screen.getByTestId('subclass-form-id'), 'sc-a');
    await user.type(screen.getByTestId('subclass-form-name-fr'), 'SC');
    await user.type(
      screen.getByTestId('subclass-form-description-fr'),
      'Test.',
    );
    await user.click(screen.getByTestId('subclass-form-confirm'));

    expect(screen.getByTestId('subclass-form')).toBeInTheDocument();
    expect(
      screen.queryByTestId('pack-editor-subclass-row'),
    ).not.toBeInTheDocument();
  });
});

describe("PackEditorScreen — création d'un sort (JALON 3C.6)", () => {
  async function selectSchool(
    user: ReturnType<typeof userEvent.setup>,
    label: string,
  ): Promise<void> {
    const wrapper = screen.getByTestId('spell-form-school');
    const trigger = within(wrapper).getByRole('combobox');
    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: label }));
  }

  it('saisit méta + sort minimal (V+S, sans dégâts) → save → writePack reçoit pack.entities.spells', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByTestId('pack-meta-id'), 'pack-spell');
    await user.type(
      screen.getByTestId('pack-meta-name-fr'),
      'Pack sort',
    );
    await user.type(screen.getByTestId('pack-meta-author'), 'Adrien');

    await user.click(screen.getByTestId('pack-editor-add-spell'));
    expect(screen.getByTestId('spell-form')).toBeInTheDocument();

    await user.type(screen.getByTestId('spell-form-id'), 'tracer-bolt');
    await user.type(
      screen.getByTestId('spell-form-name-fr'),
      'Trait du traceur',
    );
    // Le niveau reste à 0 (sort mineur) — pas besoin d'interagir.
    await selectSchool(user, 'Évocation');
    await user.type(
      screen.getByTestId('spell-form-casting-time-fr'),
      '1 action',
    );
    await user.type(
      screen.getByTestId('spell-form-range-fr'),
      '36 mètres',
    );
    await user.type(
      screen.getByTestId('spell-form-duration-fr'),
      'Instantanée',
    );
    // V + S
    await user.click(screen.getByTestId('spell-form-component-v'));
    await user.click(screen.getByTestId('spell-form-component-s'));
    await user.type(
      screen.getByTestId('spell-form-description-fr'),
      'Un trait magique frappe la cible.',
    );

    await user.click(screen.getByTestId('spell-form-confirm'));

    expect(screen.queryByTestId('spell-form')).not.toBeInTheDocument();
    const spellRow = screen.getByTestId('pack-editor-spell-row');
    expect(spellRow).toHaveAttribute('data-spell-id', 'tracer-bolt');
    expect(spellRow).toHaveTextContent('Trait du traceur');

    await user.click(screen.getByTestId('pack-editor-save'));

    await waitFor(() => expect(mockWritePack).toHaveBeenCalledOnce());
    const [, calledPack] = mockWritePack.mock.calls[0]!;
    expect(calledPack.entities.spells).toHaveLength(1);
    const sp = calledPack.entities.spells[0];
    expect(sp.id).toBe('tracer-bolt');
    expect(sp.name.fr).toBe('Trait du traceur');
    expect(sp.level).toBe(0);
    expect(sp.school).toBe('evocation');
    expect(sp.components).toEqual({ v: true, s: true, m: false });
    expect(sp.atHigherLevels).toBeNull();
    expect(sp.classes).toEqual([]);
    expect(sp).not.toHaveProperty('damage');
    expect(sp.source).toBe('aidedd-homebrew');
    // Pas d'autres catégories
    expect(calledPack.entities.feats).toBeUndefined();
  });

  it('propage components.material + atHigherLevels + 1 ligne de dégâts + 1 classe', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByTestId('pack-meta-id'), 'pack-spell-rich');
    await user.type(screen.getByTestId('pack-meta-name-fr'), 'Pack riche');
    await user.type(screen.getByTestId('pack-meta-author'), 'Adrien');

    await user.click(screen.getByTestId('pack-editor-add-spell'));
    await user.type(screen.getByTestId('spell-form-id'), 'boule-feu');
    await user.type(
      screen.getByTestId('spell-form-name-fr'),
      'Boule de feu',
    );
    await selectSchool(user, 'Évocation');
    await user.type(
      screen.getByTestId('spell-form-casting-time-fr'),
      '1 action',
    );
    await user.type(
      screen.getByTestId('spell-form-range-fr'),
      '45 mètres',
    );
    await user.type(
      screen.getByTestId('spell-form-duration-fr'),
      'Instantanée',
    );
    // V + S + M (avec composante matérielle)
    await user.click(screen.getByTestId('spell-form-component-v'));
    await user.click(screen.getByTestId('spell-form-component-s'));
    await user.click(screen.getByTestId('spell-form-component-m'));
    await user.type(
      screen.getByTestId('spell-form-material-fr'),
      'une boulette de guano et de soufre',
    );
    await user.type(
      screen.getByTestId('spell-form-description-fr'),
      'Une lueur jaillit en boule.',
    );
    // atHigherLevels
    await user.click(screen.getByTestId('spell-form-has-at-higher-levels'));
    await user.type(
      screen.getByTestId('spell-form-at-higher-levels-fr'),
      '+1d6 par emplacement au-dessus du 3.',
    );
    // 1 classe — Guerrier est dans le mock (peu importe l'orthodoxie SRD ici)
    await user.click(screen.getByTestId('spell-form-class-guerrier'));
    // 1 ligne de dégâts
    await user.click(screen.getByTestId('spell-form-damage-add'));
    await user.type(
      screen.getByTestId('spell-form-damage-formula-0'),
      '8d6',
    );
    await user.type(
      screen.getByTestId('spell-form-damage-type-label-fr-0'),
      'feu',
    );

    await user.click(screen.getByTestId('spell-form-confirm'));
    await user.click(screen.getByTestId('pack-editor-save'));

    await waitFor(() => expect(mockWritePack).toHaveBeenCalledOnce());
    const [, calledPack] = mockWritePack.mock.calls[0]!;
    const sp = calledPack.entities.spells[0];
    expect(sp.components).toEqual({
      v: true,
      s: true,
      m: true,
      material: { fr: 'une boulette de guano et de soufre' },
    });
    expect(sp.atHigherLevels).toEqual({
      fr: '+1d6 par emplacement au-dessus du 3.',
    });
    expect(sp.classes).toEqual(['guerrier']);
    expect(sp.damage).toEqual([
      {
        formula: '8d6',
        type: 'fire', // défaut du SpellDamageDraft
        typeLabel: { fr: 'feu' },
      },
    ]);
  });

  it("refuse confirm si school non choisie (erreur visible, pas d'ajout)", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByTestId('pack-editor-add-spell'));
    await user.type(screen.getByTestId('spell-form-id'), 'sp-a');
    await user.type(
      screen.getByTestId('spell-form-name-fr'),
      'Sort A',
    );
    await user.type(
      screen.getByTestId('spell-form-casting-time-fr'),
      '1 action',
    );
    await user.type(
      screen.getByTestId('spell-form-range-fr'),
      'Toucher',
    );
    await user.type(
      screen.getByTestId('spell-form-duration-fr'),
      'Instantanée',
    );
    await user.type(
      screen.getByTestId('spell-form-description-fr'),
      'Test.',
    );
    // school volontairement omis
    await user.click(screen.getByTestId('spell-form-confirm'));

    expect(screen.getByTestId('spell-form')).toBeInTheDocument();
    expect(screen.queryByTestId('pack-editor-spell-row')).not.toBeInTheDocument();
  });
});

describe("PackEditorScreen — création d'un objet (JALON 3C.7)", () => {
  async function selectFromCombobox(
    user: ReturnType<typeof userEvent.setup>,
    wrapperTestId: string,
    optionLabel: string,
  ): Promise<void> {
    const wrapper = screen.getByTestId(wrapperTestId);
    const trigger = within(wrapper).getByRole('combobox');
    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: optionLabel }));
  }

  it('saisit méta + gear minimal → save → writePack reçoit pack.entities.items', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByTestId('pack-meta-id'), 'pack-item');
    await user.type(screen.getByTestId('pack-meta-name-fr'), 'Pack objet');
    await user.type(screen.getByTestId('pack-meta-author'), 'Adrien');

    await user.click(screen.getByTestId('pack-editor-add-item'));
    expect(screen.getByTestId('item-form')).toBeInTheDocument();

    await user.type(screen.getByTestId('item-form-id'), 'corde-rituelle');
    await user.type(
      screen.getByTestId('item-form-name-fr'),
      'Corde rituelle',
    );
    await selectFromCombobox(user, 'item-form-category', 'Équipement');
    // weight=0 par défaut, OK
    await user.click(screen.getByTestId('item-form-confirm'));

    expect(screen.queryByTestId('item-form')).not.toBeInTheDocument();
    const itemRow = screen.getByTestId('pack-editor-item-row');
    expect(itemRow).toHaveAttribute('data-item-id', 'corde-rituelle');
    expect(itemRow).toHaveTextContent('Corde rituelle');

    await user.click(screen.getByTestId('pack-editor-save'));
    await waitFor(() => expect(mockWritePack).toHaveBeenCalledOnce());

    const [, calledPack] = mockWritePack.mock.calls[0]!;
    expect(calledPack.entities.items).toHaveLength(1);
    const it = calledPack.entities.items[0];
    expect(it.id).toBe('corde-rituelle');
    expect(it.name.fr).toBe('Corde rituelle');
    expect(it.category).toBe('gear');
    expect(it.cost).toBeNull();
    expect(it.weight).toBe(0);
    expect(it.description).toBeNull();
    expect(it.source).toBe('aidedd-homebrew');
    expect(it).not.toHaveProperty('damage');
    expect(it).not.toHaveProperty('acBase');
    expect(calledPack.entities.feats).toBeUndefined();
  });

  it("propage damage + range + masteryProperty + properties libres pour une arme", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByTestId('pack-meta-id'), 'pack-weapon');
    await user.type(screen.getByTestId('pack-meta-name-fr'), 'Pack arme');
    await user.type(screen.getByTestId('pack-meta-author'), 'Adrien');

    await user.click(screen.getByTestId('pack-editor-add-item'));
    await user.type(screen.getByTestId('item-form-id'), 'epee-ombre');
    await user.type(
      screen.getByTestId('item-form-name-fr'),
      'Épée d’ombre',
    );
    await selectFromCombobox(user, 'item-form-category', 'Arme');

    // Damage
    await user.click(screen.getByTestId('item-form-has-damage'));
    await user.type(screen.getByTestId('item-form-damage-dice'), '1d8');
    await user.type(
      screen.getByTestId('item-form-damage-type-label-fr'),
      'tranchant',
    );

    // Range
    await user.click(screen.getByTestId('item-form-has-range'));
    // Les FieldNumber sont pré-remplis (20 / 60), on les laisse.

    // Mastery
    await user.click(screen.getByTestId('item-form-has-mastery'));
    await selectFromCombobox(user, 'item-form-mastery-property', 'vex');

    // Propriété libre
    await user.type(
      screen.getByTestId('item-form-property-input'),
      'finesse',
    );
    await user.click(screen.getByTestId('item-form-property-add'));

    await user.click(screen.getByTestId('item-form-confirm'));
    await user.click(screen.getByTestId('pack-editor-save'));
    await waitFor(() => expect(mockWritePack).toHaveBeenCalledOnce());

    const [, calledPack] = mockWritePack.mock.calls[0]!;
    const it = calledPack.entities.items[0];
    expect(it.category).toBe('weapon');
    expect(it.damage).toEqual({
      dice: '1d8',
      type: 'slashing',
      typeLabel: { fr: 'tranchant' },
    });
    expect(it.range).toEqual({ normal: 20, max: 60 });
    expect(it.masteryProperty).toBe('vex');
    expect(it.properties).toEqual(['finesse']);
  });

  it("refuse confirm si category non choisie (erreur visible, pas d'ajout)", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByTestId('pack-editor-add-item'));
    await user.type(screen.getByTestId('item-form-id'), 'sans-cat');
    await user.type(screen.getByTestId('item-form-name-fr'), 'Sans catégorie');
    await user.click(screen.getByTestId('item-form-confirm'));

    expect(screen.getByTestId('item-form')).toBeInTheDocument();
    expect(screen.queryByTestId('pack-editor-item-row')).not.toBeInTheDocument();
  });
});

describe("PackEditorScreen — création d'une ascendance (JALON 3C.8)", () => {
  it('saisit méta + ancestry minimale → save → writePack reçoit pack.entities.ancestries', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByTestId('pack-meta-id'), 'pack-ancestry');
    await user.type(
      screen.getByTestId('pack-meta-name-fr'),
      'Pack ascendance',
    );
    await user.type(screen.getByTestId('pack-meta-author'), 'Adrien');

    await user.click(screen.getByTestId('pack-editor-add-ancestry'));
    expect(screen.getByTestId('ancestry-form')).toBeInTheDocument();

    await user.type(
      screen.getByTestId('ancestry-form-id'),
      'peuple-des-brumes',
    );
    await user.type(
      screen.getByTestId('ancestry-form-name-fr'),
      'Peuple des brumes',
    );
    await user.type(
      screen.getByTestId('ancestry-form-description-fr'),
      'Ascendance brumeuse.',
    );
    await user.click(screen.getByTestId('ancestry-form-confirm'));

    expect(screen.queryByTestId('ancestry-form')).not.toBeInTheDocument();
    const row = screen.getByTestId('pack-editor-ancestry-row');
    expect(row).toHaveAttribute('data-ancestry-id', 'peuple-des-brumes');
    expect(row).toHaveTextContent('Peuple des brumes');

    await user.click(screen.getByTestId('pack-editor-save'));
    await waitFor(() => expect(mockWritePack).toHaveBeenCalledOnce());

    const [, calledPack] = mockWritePack.mock.calls[0]!;
    expect(calledPack.entities.ancestries).toHaveLength(1);
    const a = calledPack.entities.ancestries[0];
    expect(a.id).toBe('peuple-des-brumes');
    expect(a.name.fr).toBe('Peuple des brumes');
    expect(a.description.fr).toBe('Ascendance brumeuse.');
    expect(a.size).toBe('medium');
    expect(a.speed).toBe(9);
    expect(a.source).toBe('aidedd-homebrew');
    expect(a.options).toEqual({});
    expect(calledPack.entities.feats).toBeUndefined();
  });

  it("rejette un id réservé (« human ») — pas d'ajout, form reste ouvert", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByTestId('pack-editor-add-ancestry'));
    await user.type(screen.getByTestId('ancestry-form-id'), 'human');
    await user.type(screen.getByTestId('ancestry-form-name-fr'), 'Humain');
    await user.type(
      screen.getByTestId('ancestry-form-description-fr'),
      'Tentative homebrew.',
    );
    await user.click(screen.getByTestId('ancestry-form-confirm'));

    expect(screen.getByTestId('ancestry-form')).toBeInTheDocument();
    expect(
      screen.queryByTestId('pack-editor-ancestry-row'),
    ).not.toBeInTheDocument();
  });

  it('propage une option draconique avec id + type + label', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByTestId('pack-meta-id'), 'pack-dragon');
    await user.type(screen.getByTestId('pack-meta-name-fr'), 'Pack dragon');
    await user.type(screen.getByTestId('pack-meta-author'), 'Adrien');

    await user.click(screen.getByTestId('pack-editor-add-ancestry'));
    await user.type(
      screen.getByTestId('ancestry-form-id'),
      'drake-des-cimes',
    );
    await user.type(
      screen.getByTestId('ancestry-form-name-fr'),
      'Drake des cimes',
    );
    await user.type(
      screen.getByTestId('ancestry-form-description-fr'),
      'Ascendance draconique alpine.',
    );

    // Ajouter une option draconique
    await user.click(screen.getByTestId('ancestry-form-dragon-add'));
    await user.type(
      screen.getByTestId('ancestry-form-dragon-id-0'),
      'frost-ancestor',
    );
    await user.type(
      screen.getByTestId('ancestry-form-dragon-name-fr-0'),
      'Ancêtre de givre',
    );
    await user.type(
      screen.getByTestId('ancestry-form-dragon-damage-label-fr-0'),
      'froid',
    );
    // damageType = 'fire' par défaut, on garde — assertion porte sur la valeur

    await user.click(screen.getByTestId('ancestry-form-confirm'));
    await user.click(screen.getByTestId('pack-editor-save'));

    await waitFor(() => expect(mockWritePack).toHaveBeenCalledOnce());
    const [, calledPack] = mockWritePack.mock.calls[0]!;
    const a = calledPack.entities.ancestries[0];
    expect(a.options.dragonAncestries).toHaveLength(1);
    expect(a.options.dragonAncestries[0]).toEqual({
      id: 'frost-ancestor',
      name: { fr: 'Ancêtre de givre' },
      damageType: 'fire',
      damageTypeLabel: { fr: 'froid' },
    });
  });
});
