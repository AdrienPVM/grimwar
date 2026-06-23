import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

// ─────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────

const linkMock = vi.fn();
vi.mock('@/shared/lib/services/campaigns', () => ({
  linkCharacterToMembership: (cid: string, uid: string, charId: string | null) =>
    linkMock(cid, uid, charId),
}));

import { LinkCharacterModal } from '../link-character-modal';

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

function mkCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'c-1',
    name: 'Aëlys',
    status: 'alive',
    classes: [
      {
        classId: 'wizard',
        subclassId: null,
        level: 5,
        clericDivineOrder: null,
        druidPrimalOrder: null,
        fighterFightingStyle: null,
        weaponMasteries: [],
        expertiseSkills: [],
        eldritchInvocations: [],
        wizardSpellbookL1: [],
      },
    ],
    totalLevel: 5,
    primaryClassId: 'wizard',
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
    backgroundId: 'sage',
    extraLanguages: [],
    experience: 0,
    alignment: 'NB',
    abilities: { for: 10, dex: 12, con: 12, int: 16, sag: 10, cha: 10 },
    saves: { for: false, dex: false, con: false, int: true, sag: true, cha: false },
    skills: {},
    hp: { current: 22, max: 30, temp: 0 },
    ac: 12,
    speed: 9,
    initiative: 1,
    hitDice: [{ classId: 'wizard', current: 5, max: 5, die: 'd6' }],
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
    portrait: { type: 'letter', value: 'A' },
    schemaVersion: 2,
    createdAt: null,
    updatedAt: null,
    updatedBy: 'uid-1',
    ...overrides,
  };
}

const onClose = vi.fn();
const onLinked = vi.fn();

afterEach(() => {
  linkMock.mockReset();
  onClose.mockReset();
  onLinked.mockReset();
});

interface RenderOpts {
  currentCharacterId?: string | null;
  characters?: Character[];
  charactersLoading?: boolean;
}

function renderModal(opts: RenderOpts = {}): void {
  render(
    <LinkCharacterModal
      campaignId="c-1"
      uid="uid-2"
      currentCharacterId={opts.currentCharacterId ?? null}
      characters={
        opts.characters ?? [
          mkCharacter({ id: 'char-a', name: 'Lyra', totalLevel: 3 }),
          mkCharacter({ id: 'char-b', name: 'Bren', totalLevel: 7 }),
        ]
      }
      charactersLoading={opts.charactersLoading ?? false}
      onClose={onClose}
      onLinked={onLinked}
    />,
  );
}

// ─────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────

describe('<LinkCharacterModal>', () => {
  it('liste les fiches du joueur + une option « Aucun personnage »', () => {
    renderModal();
    expect(screen.getByText('Lyra')).toBeInTheDocument();
    expect(screen.getByText('Bren')).toBeInTheDocument();
    expect(screen.getByText(/Aucun personnage/i)).toBeInTheDocument();
    // Niveau affiché en sublabel.
    expect(screen.getByText(/Niveau 3/)).toBeInTheDocument();
    expect(screen.getByText(/Niveau 7/)).toBeInTheDocument();
  });

  it('confirme désactivé tant que le choix == lien courant (aucune fiche → null)', () => {
    renderModal({ currentCharacterId: null });
    const confirm = screen.getByRole('button', { name: /^Lier$/i });
    expect(confirm).toBeDisabled();
  });

  it('sélectionner une fiche puis Lier appelle linkCharacterToMembership(cid, uid, charId)', async () => {
    linkMock.mockResolvedValueOnce(undefined);
    renderModal({ currentCharacterId: null });

    fireEvent.click(screen.getByRole('radio', { name: /Lyra/i }));
    const confirm = screen.getByRole('button', { name: /^Lier$/i });
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(linkMock).toHaveBeenCalledWith('c-1', 'uid-2', 'char-a');
    });
    expect(onLinked).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('délier : fiche courante → option « Aucun personnage » appelle le service avec null', async () => {
    linkMock.mockResolvedValueOnce(undefined);
    renderModal({ currentCharacterId: 'char-a' });

    // Le badge « actuel » marque la fiche liée.
    expect(screen.getByText(/actuel/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /Aucun personnage/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Lier$/i }));

    await waitFor(() => {
      expect(linkMock).toHaveBeenCalledWith('c-1', 'uid-2', null);
    });
  });

  it('affiche l’empty state quand le joueur n’a aucune fiche', () => {
    renderModal({ characters: [] });
    expect(screen.getByText(/Crée-en un depuis ta bibliothèque/i)).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('affiche l’état de chargement', () => {
    renderModal({ characters: [], charactersLoading: true });
    expect(screen.getByText(/Chargement de tes personnages/i)).toBeInTheDocument();
  });

  it('échec du service : affiche l’alerte et ne ferme pas', async () => {
    linkMock.mockRejectedValueOnce(new Error('permission-denied'));
    renderModal({ currentCharacterId: null });

    fireEvent.click(screen.getByRole('radio', { name: /Bren/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Lier$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(onLinked).not.toHaveBeenCalled();
  });
});
