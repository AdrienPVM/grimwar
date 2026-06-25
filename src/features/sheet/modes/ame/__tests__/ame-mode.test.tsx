import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

import { AmeMode } from '../../ame-mode';
import {
  PermissionProvider,
  type PermissionContextValue,
} from '../../../permissions-context';
import { expectNoForbiddenEnglish } from '../../../../../../tests/helpers/i18n-guard';

/**
 * Mode Âme — couverture matricielle (CLAUDE.md « couverture obligatoire ») :
 *  - Cat. 2 (identité, pas présence) : la valeur affichée = le champ
 *    `personality.*` exact, pas « contient le mot ».
 *  - Cat. 4 (calcul chiffré) : moyenne au d20 = totalD20Sum / totalRolls,
 *    assertée au NOMBRE.
 *  - Permissions (plan 26) : propriétaire édite + persiste ; MJ verrouillé
 *    (cadenas, aucun bouton Modifier).
 */

const { updateCharacterMock } = vi.hoisted(() => ({
  updateCharacterMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/sheet/use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: updateCharacterMock,
    isUpdating: false,
    error: null,
  }),
}));

function buildCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'ame',
    name: 'Ame',
    status: 'alive',
    classes: [],
    totalLevel: 1,
    primaryClassId: 'rogue',
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
    backgroundId: 'criminal',
    extraLanguages: [],
    experience: 0,
    alignment: 'CN',
    abilities: { for: 10, dex: 16, con: 12, int: 12, sag: 10, cha: 14 },
    saves: { for: false, dex: true, con: false, int: true, sag: false, cha: false },
    skills: {},
    hp: { current: 9, max: 9, temp: 0 },
    ac: 13,
    speed: 30,
    initiative: 3,
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
    portrait: { type: 'letter', value: 'A' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'uid',
    ...overrides,
  };
}

const ownerCtx: PermissionContextValue = {
  canEdit: true,
  isDM: false,
  isDMEdit: false,
  lockedFields: [],
};

const dmCtx: PermissionContextValue = {
  canEdit: true,
  isDM: true,
  isDMEdit: true,
  ownerUid: 'player-uid',
  lockedFields: ['name', 'personality', 'homeCampaignId'],
};

function renderAme(character: Character, ctx: PermissionContextValue = ownerCtx) {
  return render(
    <PermissionProvider value={ctx}>
      <AmeMode character={character} />
    </PermissionProvider>,
  );
}

beforeEach(() => {
  updateCharacterMock.mockClear();
});

describe('<AmeMode>', () => {
  it('rend les sections Personnalité / Histoire / Statistiques', () => {
    renderAme(buildCharacter());
    expect(screen.getByText('Personnalité')).toBeInTheDocument();
    expect(screen.getByText('Histoire')).toBeInTheDocument();
    expect(screen.getByText('Statistiques')).toBeInTheDocument();
    // Les 4 libellés de personnalité (terme projet : « Attache » pour bond).
    expect(screen.getByText('Trait de personnalité')).toBeInTheDocument();
    expect(screen.getByText('Idéal')).toBeInTheDocument();
    expect(screen.getByText('Attache')).toBeInTheDocument();
    expect(screen.getByText('Défaut')).toBeInTheDocument();
  });

  it('affiche la valeur EXACTE du champ (identité, pas présence)', () => {
    const character = buildCharacter({
      personality: {
        trait: 'Je cite toujours un proverbe à propos.',
        ideal: 'La liberté avant tout.',
        bond: 'Mon ancien mentor m’a trahi.',
        flaw: 'Je convoite ce qui brille.',
        backstory: 'Né dans les bas-fonds de la cité.',
      },
    });
    renderAme(character);
    expect(screen.getByText('Je cite toujours un proverbe à propos.')).toBeInTheDocument();
    expect(screen.getByText('La liberté avant tout.')).toBeInTheDocument();
    expect(screen.getByText('Mon ancien mentor m’a trahi.')).toBeInTheDocument();
    expect(screen.getByText('Je convoite ce qui brille.')).toBeInTheDocument();
    expect(screen.getByText('Né dans les bas-fonds de la cité.')).toBeInTheDocument();
  });

  it('montre l’invite de vide quand un champ n’est pas renseigné', () => {
    renderAme(buildCharacter());
    // 4 champs de personnalité vides → 4 fois l'invite « Pas encore renseigné. »
    expect(screen.getAllByText('Pas encore renseigné.')).toHaveLength(4);
    expect(screen.getByText('Aucune histoire écrite pour l’instant.')).toBeInTheDocument();
  });

  it('Stats : message neutre quand aucun jet (Cat. 4 — pas de 0 trompeurs)', () => {
    renderAme(buildCharacter());
    expect(screen.getByText('Aucun jet enregistré pour l’instant.')).toBeInTheDocument();
    expect(screen.queryByText('Moyenne au d20')).not.toBeInTheDocument();
  });

  it('Stats : moyenne d20 = totalD20Sum / totalRolls, compétence fétiche résolue FR', () => {
    const character = buildCharacter({
      stats: {
        totalRolls: 4,
        totalD20Sum: 42,
        crits: 2,
        fumbles: 1,
        skillUses: { stealth: 5, perception: 2 },
      },
    });
    renderAme(character);
    // 42 / 4 = 10.5 (assertion au NOMBRE, Cat. 4).
    expect(screen.getByText('10.5')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument(); // totalRolls
    expect(screen.getByText('2')).toBeInTheDocument(); // crits
    // stealth (5) > perception (2) → « Discrétion » (nom FR du registre SKILLS).
    expect(screen.getByText('Discrétion')).toBeInTheDocument();
  });

  it('propriétaire : éditer un trait persiste le patch personality complet', async () => {
    const user = userEvent.setup();
    const character = buildCharacter({
      personality: {
        trait: '',
        ideal: 'Idéal conservé',
        bond: '',
        flaw: '',
        backstory: '',
      },
    });
    renderAme(character);
    await user.click(
      screen.getByRole('button', { name: 'Modifier Trait de personnalité' }),
    );
    const textarea = screen.getByRole('textbox', { name: 'Trait de personnalité' });
    await user.type(textarea, 'Nouveau trait');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(updateCharacterMock).toHaveBeenCalledTimes(1);
    expect(updateCharacterMock).toHaveBeenCalledWith({
      personality: {
        trait: 'Nouveau trait',
        ideal: 'Idéal conservé',
        bond: '',
        flaw: '',
        backstory: '',
      },
    });
  });

  it('MJ omni-edit : personnalité verrouillée (cadenas, aucun bouton Modifier)', () => {
    renderAme(buildCharacter(), dmCtx);
    // Le badge « Réservé au joueur » apparaît (cadenas plan 26).
    expect(screen.getAllByText('Réservé au joueur').length).toBeGreaterThan(0);
    // Aucun bouton Modifier : le MJ ne peut pas écrire la personnalité.
    expect(screen.queryByRole('button', { name: /^Modifier / })).not.toBeInTheDocument();
  });

  it('ne laisse fuir aucun anglais interdit dans le rendu FR', () => {
    const { container } = renderAme(
      buildCharacter({
        stats: { totalRolls: 3, totalD20Sum: 30, crits: 1, fumbles: 0, skillUses: { arcana: 3 } },
      }),
    );
    expectNoForbiddenEnglish(container.textContent ?? '', 'ame-mode');
  });
});
