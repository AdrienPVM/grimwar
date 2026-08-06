import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

import { PermissionProvider } from '../../../permissions-context';
import { DeathSavesModal } from '../death-saves-modal';

/**
 * M44 — mort et retour à la vie deviennent des jalons journalisés.
 *
 * Sans eux, la seule trace qu'un personnage était mort tenait dans un
 * `dm-edit` sur le champ `status`, et un 20 naturel qui relève ne laissait
 * qu'un `hp-change` de +1 PV. Les deux chemins de retour à la vie (20 naturel,
 * bouton du meneur) sont distingués, parce qu'ils ne se racontent pas pareil.
 *
 * Le d20 est mocké face par face : la state machine (`applyDeathSaveOutcome`)
 * est pure et déjà testée ailleurs — ce qui est vérifié ici est le branchement
 * du logger sur chacune de ses issues.
 */

const { updateCharacterMock, showToastMock, logDeathMock, logRevivalMock, rollD20Mock } =
  vi.hoisted(() => ({
    updateCharacterMock: vi.fn().mockResolvedValue(undefined),
    showToastMock: vi.fn(),
    logDeathMock: vi.fn().mockResolvedValue(undefined),
    logRevivalMock: vi.fn().mockResolvedValue(undefined),
    rollD20Mock: vi.fn(),
  }));

vi.mock('../../../use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: updateCharacterMock,
    isUpdating: false,
    error: null,
  }),
}));

vi.mock('@/shared/lib/slices/toast-slice', () => ({ showToast: showToastMock }));

vi.mock('@/shared/lib/event-logger', () => ({
  logDeath: (...args: unknown[]) => logDeathMock(...args),
  logRevival: (...args: unknown[]) => logRevivalMock(...args),
}));

vi.mock('@/features/dice/use-dice', () => ({
  useDice: () => ({ rollD20Plus: (...args: unknown[]) => rollD20Mock(...args) }),
}));

beforeEach(() => {
  updateCharacterMock.mockClear();
  showToastMock.mockClear();
  logDeathMock.mockClear();
  logRevivalMock.mockClear();
  rollD20Mock.mockReset();
});

/** Un jet dont seule la face brute compte pour la state machine. */
function d20(face: number): { keptFaces: number[] } {
  return { keptFaces: [face] };
}

function buildCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'ds',
    name: 'Ds',
    status: 'alive',
    classes: [],
    totalLevel: 3,
    primaryClassId: 'fighter',
    ancestryId: 'human',
    backgroundId: 'soldier',
    extraLanguages: [],
    experience: 0,
    alignment: 'N',
    abilities: { for: 10, dex: 10, con: 10, int: 10, sag: 10, cha: 10 },
    saves: { for: false, dex: false, con: false, int: false, sag: false, cha: false },
    skills: {},
    hp: { current: 0, max: 24, temp: 0 },
    ac: 14,
    speed: 30,
    initiative: 0,
    hitDice: [],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
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
    ...overrides,
  } as unknown as Character;
}

function renderModal(character: Character, isDM = false): void {
  render(
    <PermissionProvider value={{ canEdit: true, isDM, isDMEdit: false, lockedFields: [] }}>
      <DeathSavesModal character={character} />
    </PermissionProvider>,
  );
}

describe('<DeathSavesModal> — jalons journalisés (M44)', () => {
  it('troisième échec → journalise la mort avec sa cause', async () => {
    const user = userEvent.setup();
    rollD20Mock.mockResolvedValue(d20(3)); // < 10 → un échec de plus
    // Déjà 2 échecs au compteur : ce jet-ci est le dernier.
    renderModal(buildCharacter({ deathSaves: { success: 0, fail: 2 } }));

    await user.click(screen.getByRole('button', { name: /sauvegarde/i }));

    await waitFor(() => expect(logDeathMock).toHaveBeenCalledTimes(1));
    expect(logDeathMock).toHaveBeenCalledWith('ds', 'death-saves');
    expect(logRevivalMock).not.toHaveBeenCalled();
  });

  it('20 naturel → journalise un retour à la vie de source « nat20 »', async () => {
    const user = userEvent.setup();
    rollD20Mock.mockResolvedValue(d20(20));
    renderModal(buildCharacter());

    await user.click(screen.getByRole('button', { name: /sauvegarde/i }));

    await waitFor(() => expect(logRevivalMock).toHaveBeenCalledTimes(1));
    expect(logRevivalMock).toHaveBeenCalledWith('ds', 'nat20');
    expect(logDeathMock).not.toHaveBeenCalled();
  });

  it('un échec simple ne journalise aucun jalon (ce n’est pas encore un événement)', async () => {
    const user = userEvent.setup();
    rollD20Mock.mockResolvedValue(d20(7));
    renderModal(buildCharacter({ deathSaves: { success: 0, fail: 0 } }));

    await user.click(screen.getByRole('button', { name: /sauvegarde/i }));

    await waitFor(() => expect(updateCharacterMock).toHaveBeenCalled());
    expect(logDeathMock).not.toHaveBeenCalled();
    expect(logRevivalMock).not.toHaveBeenCalled();
  });

  it('bouton « Ressusciter » du meneur → source « dm », distincte du 20 naturel', async () => {
    const user = userEvent.setup();
    renderModal(buildCharacter({ status: 'dead', deathSaves: { success: 0, fail: 3 } }), true);

    await user.click(screen.getByRole('button', { name: /Ressusciter/ }));

    await waitFor(() => expect(logRevivalMock).toHaveBeenCalledTimes(1));
    expect(logRevivalMock).toHaveBeenCalledWith('ds', 'dm');
  });

  it('jet passé en mode physique (aucun résultat) → aucun jalon écrit', async () => {
    const user = userEvent.setup();
    rollD20Mock.mockResolvedValue(null); // le joueur a refusé de saisir son jet
    renderModal(buildCharacter({ deathSaves: { success: 0, fail: 2 } }));

    await user.click(screen.getByRole('button', { name: /sauvegarde/i }));

    await waitFor(() => expect(rollD20Mock).toHaveBeenCalled());
    expect(logDeathMock).not.toHaveBeenCalled();
    expect(updateCharacterMock).not.toHaveBeenCalled();
  });
});
