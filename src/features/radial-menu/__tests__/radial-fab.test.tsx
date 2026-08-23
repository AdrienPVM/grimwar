import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PermissionProvider } from '@/features/sheet/permissions-context';
import type { Character } from '@/shared/types/character';

import { RadialFab } from '../radial-fab';

import classesBundle from '../../../../public/data/classes.json';

/**
 * Radial FAB — menu tactile docké (plan 11, steps 15/21). Vérifie l'ouverture,
 * la navigation main↔sous-menu, et que CHAQUE wedge route vers son action réelle
 * (bascule de mode, repos via updateCharacter, d20 via useDice, inspiration,
 * ouverture de l'historique). Mocks alignés sur `long-rest-button.test.tsx`.
 */

const { updateCharacterMock, showToastMock, rollD20Mock } = vi.hoisted(() => ({
  updateCharacterMock: vi.fn().mockResolvedValue(undefined),
  showToastMock: vi.fn(),
  rollD20Mock: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) =>
    type === 'classes'
      ? { data: classesBundle, isLoading: false, error: null }
      : { data: [], isLoading: false, error: null },
}));

vi.mock('@/features/sheet/use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: updateCharacterMock,
    isUpdating: false,
    error: null,
  }),
}));

vi.mock('@/features/dice/use-dice', () => ({
  useDice: () => ({
    rollD20Plus: rollD20Mock,
    rollExpression: vi.fn(),
    rollWithAdvantage: vi.fn(),
    rollWithDisadvantage: vi.fn(),
    rollDamageWithMode: vi.fn(),
    rollAttackDamage: vi.fn(),
  }),
}));

vi.mock('@/shared/lib/slices/toast-slice', () => ({ showToast: showToastMock }));

// Stub l'historique pour ne pas toucher Dexie ; on vérifie seulement l'ouverture.
vi.mock('@/features/dice/roll-history-panel', () => ({
  RollHistoryPanel: ({ open }: { open: boolean }) =>
    open ? <div data-testid="history-panel" /> : null,
}));

beforeEach(() => {
  updateCharacterMock.mockClear();
  showToastMock.mockClear();
  rollD20Mock.mockClear();
});

function buildCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'fab',
    name: 'Fab',
    status: 'alive',
    classes: [
      {
        classId: 'barbarian',
        subclassId: null,
        level: 3,
        clericDivineOrder: null,
        druidPrimalOrder: null,
        fighterFightingStyle: null,
        weaponMasteries: [],
        expertiseSkills: [],
        eldritchInvocations: [],
        wizardSpellbookL1: [],
      } as Character['classes'][number],
    ],
    totalLevel: 3,
    primaryClassId: 'barbarian',
    ancestryId: 'human',
    ancestrySubChoices: {
      dragonAncestry: null,
      tieflingLegacy: null,
      elfLineage: null,
      gnomeLineage: null,
      goliathAncestry: null,
      ancestryCastingAbility: null,
      ancestryExtraSkill: null,
      ancestrySize: null,
    },
    backgroundId: 'soldier',
    extraLanguages: [],
    experience: 0,
    alignment: 'N',
    abilities: { for: 16, dex: 12, con: 14, int: 10, sag: 10, cha: 10 },
    saves: { for: true, dex: false, con: true, int: false, sag: false, cha: false },
    skills: {},
    hp: { current: 5, max: 32, temp: 0 },
    ac: 14,
    speed: 30,
    initiative: 1,
    hitDice: [{ classId: 'barbarian', current: 0, max: 3, die: 'd12' }],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 1,
    currentConcentration: null,
    classResources: { 'barbarian:rage': { current: 0, max: 3, restoresOn: 'long' } },
    spellSlots: {},
    preparedSpells: {},
    knownSpells: {},
    spellcastingAbility: {},
    inventory: { items: [], coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 }, weightCache: 0 },
    personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
    featureUsage: {},
    extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    presentInCampaigns: [],
    homeCampaignId: null,
    stats: { totalRolls: 0, totalD20Sum: 0, crits: 0, fumbles: 0, skillUses: {} },
    portrait: { type: 'letter', value: 'F' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'uid',
    ...overrides,
  };
}

function renderFab(opts: { canEdit?: boolean; showHistory?: boolean; character?: Character } = {}) {
  const setMode = vi.fn();
  render(
    <PermissionProvider
      value={{ canEdit: opts.canEdit ?? true, isDM: false, isDMEdit: false, lockedFields: [] }}
    >
      <RadialFab
        character={opts.character ?? buildCharacter()}
        setMode={setMode}
        showHistory={opts.showHistory ?? true}
      />
    </PermissionProvider>,
  );
  return { setMode };
}

describe('<RadialFab> — menu docké', () => {
  it('le menu est fermé au départ ; le FAB l’ouvre', async () => {
    const user = userEvent.setup();
    renderFab();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: "Ouvrir le menu d'action" }));
    expect(screen.getByRole('dialog', { name: "Menu d'action" })).toBeInTheDocument();
    // 6 wedges racine.
    for (const label of ['Aller à', 'Sorts', 'Repos', 'Lancer', 'Codex', 'Outils']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  /**
   * Audit UX E6 / scénario J9 — chercher la règle d'un état en plein combat
   * coûtait 4 à 5 gestes et faisait QUITTER la fiche. Le Codex s'ouvre
   * désormais par-dessus, et repart sur les États : c'est la question qu'on se
   * pose une fiche en main.
   */
  it('« Codex » ouvre le Codex par-dessus la fiche, sur les États', async () => {
    const user = userEvent.setup();
    renderFab();
    await user.click(screen.getByRole('button', { name: "Ouvrir le menu d'action" }));
    await user.click(screen.getByRole('button', { name: 'Codex' }));

    expect(screen.getByRole('dialog', { name: 'Le Codex' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /États/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('« Codex » reste atteignable en lecture seule (contenu SRD, sans permission)', async () => {
    const user = userEvent.setup();
    renderFab({ canEdit: false, showHistory: false });
    await user.click(screen.getByRole('button', { name: "Ouvrir le menu d'action" }));
    expect(screen.queryByRole('button', { name: 'Repos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Outils' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Codex' }));
    expect(screen.getByRole('dialog', { name: 'Le Codex' })).toBeInTheDocument();
  });

  it('le Codex se referme et rend la fiche', async () => {
    const user = userEvent.setup();
    renderFab();
    await user.click(screen.getByRole('button', { name: "Ouvrir le menu d'action" }));
    await user.click(screen.getByRole('button', { name: 'Codex' }));
    await user.click(screen.getByRole('button', { name: 'Fermer le Codex' }));

    expect(screen.queryByRole('dialog', { name: 'Le Codex' })).not.toBeInTheDocument();
  });

  it('« Aller à › Magie » bascule le mode et ferme le menu', async () => {
    const user = userEvent.setup();
    const { setMode } = renderFab();
    await user.click(screen.getByRole('button', { name: "Ouvrir le menu d'action" }));
    await user.click(screen.getByRole('button', { name: 'Aller à' }));
    await user.click(screen.getByRole('button', { name: 'Magie' }));
    expect(setMode).toHaveBeenCalledWith('magie');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('« Lancer » fait un d20 vif (modificateur 0, kind check)', async () => {
    const user = userEvent.setup();
    renderFab();
    await user.click(screen.getByRole('button', { name: "Ouvrir le menu d'action" }));
    await user.click(screen.getByRole('button', { name: 'Lancer' }));
    expect(rollD20Mock).toHaveBeenCalledTimes(1);
    expect(rollD20Mock.mock.calls[0]![0]).toBe(0);
    expect(rollD20Mock.mock.calls[0]![1]).toMatchObject({ label: 'd20 vif', kind: 'check' });
  });

  it('« Repos › Repos long » applique le repos (PV → max, rage reset)', async () => {
    const user = userEvent.setup();
    renderFab();
    await user.click(screen.getByRole('button', { name: "Ouvrir le menu d'action" }));
    await user.click(screen.getByRole('button', { name: 'Repos' }));
    await user.click(screen.getByRole('button', { name: 'Repos long' }));
    expect(updateCharacterMock).toHaveBeenCalledTimes(1);
    const patch = updateCharacterMock.mock.calls[0]![0] as Partial<Character>;
    expect(patch.hp!.current).toBe(32);
    expect(patch.classResources!['barbarian:rage']!.current).toBe(3);
  });

  it('« Outils › Inspiration héroïque » octroie l’inspiration', async () => {
    const user = userEvent.setup();
    renderFab();
    await user.click(screen.getByRole('button', { name: "Ouvrir le menu d'action" }));
    await user.click(screen.getByRole('button', { name: 'Outils' }));
    await user.click(screen.getByRole('button', { name: 'Inspiration héroïque' }));
    expect(updateCharacterMock).toHaveBeenCalledWith({ inspiration: true });
  });

  it('« Outils › Historique des jets » ouvre le panneau d’historique', async () => {
    const user = userEvent.setup();
    renderFab();
    await user.click(screen.getByRole('button', { name: "Ouvrir le menu d'action" }));
    await user.click(screen.getByRole('button', { name: 'Outils' }));
    await user.click(screen.getByRole('button', { name: 'Historique des jets' }));
    expect(screen.getByTestId('history-panel')).toBeInTheDocument();
  });

  it('lecture seule (!canEdit) : pas de « Repos » dans le menu', async () => {
    const user = userEvent.setup();
    renderFab({ canEdit: false });
    await user.click(screen.getByRole('button', { name: "Ouvrir le menu d'action" }));
    expect(screen.queryByRole('button', { name: 'Repos' })).not.toBeInTheDocument();
    // Outils reste (Historique), mais sans Inspiration.
    await user.click(screen.getByRole('button', { name: 'Outils' }));
    expect(screen.queryByRole('button', { name: 'Inspiration héroïque' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Historique des jets' })).toBeInTheDocument();
  });
});
