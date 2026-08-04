import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

import { ExhaustionCard } from '../exhaustion-card';
import { expectNoForbiddenEnglish } from '../../../../../../tests/helpers/i18n-guard';

import conditionsBundle from '../../../../../../public/data/conditions.json';

/**
 * Carte « Épuisement » — Cat. 2 (texte officiel résolu depuis conditions.json)
 * + Cat. 4 (pénalité chiffrée SRD 2024 : d20 −2×niv, vitesse −1,5 m × niv) +
 * Cat. 5 (le stepper écrit le bon niveau). Bundle conditions réel injecté.
 */

const { updateCharacterMock } = vi.hoisted(() => ({
  updateCharacterMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) =>
    type === 'conditions'
      ? { data: conditionsBundle, isLoading: false, error: null }
      : { data: [], isLoading: false, error: null },
}));

vi.mock('@/features/sheet/use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: updateCharacterMock,
    isUpdating: false,
    error: null,
  }),
}));

beforeEach(() => {
  updateCharacterMock.mockClear();
});

function buildCharacter(exhaustion: number): Character {
  return {
    id: 'ex',
    name: 'Ex',
    status: 'alive',
    classes: [],
    totalLevel: 1,
    primaryClassId: 'fighter',
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
    hp: { current: 12, max: 12, temp: 0 },
    ac: 14,
    speed: 30,
    initiative: 1,
    hitDice: [],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion,
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
    portrait: { type: 'letter', value: 'E' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'uid',
  };
}

describe('<ExhaustionCard>', () => {
  it('niveau 0 : « Aucun épuisement », pas de note de mort', () => {
    render(<ExhaustionCard character={buildCharacter(0)} />);
    expect(screen.getByText('Aucun épuisement')).toBeInTheDocument();
    expect(screen.queryByText(/mort/i)).not.toBeInTheDocument();
  });

  it('niveau 3 : pénalité chiffrée d20 −6 · Vitesse −4,5 m (SRD 2024)', () => {
    render(<ExhaustionCard character={buildCharacter(3)} />);
    // 2 × 3 = 6 ; 1,5 × 3 = 4,5 m.
    expect(screen.getByText(/Niveau 3 ·.*−6.*−4,5 m/)).toBeInTheDocument();
  });

  it('niveau 6 : note de mort affichée', () => {
    render(<ExhaustionCard character={buildCharacter(6)} />);
    expect(screen.getByText('Niveau 6 : mort.')).toBeInTheDocument();
  });

  it("garde le texte SRD replié tant qu'on ne le demande pas", () => {
    // E11 — 7 lignes déroulées en permanence faisaient de cette carte 2,5 fois
    // la hauteur de ses voisines et étiraient toute la rangée du bento.
    render(<ExhaustionCard character={buildCharacter(2)} />);
    expect(screen.queryByText(/réduit de 2 fois votre niveau actuel/)).not.toBeInTheDocument();
  });

  it("« Lire la règle » ouvre le texte officiel de l'état (conditions.json)", async () => {
    const user = userEvent.setup();
    render(<ExhaustionCard character={buildCharacter(2)} />);
    await user.click(screen.getByRole('button', { name: 'Lire la règle' }));
    // Fragment exact du champ description.fr du slug exhaustion.
    expect(screen.getByText(/réduit de 2 fois votre niveau actuel/)).toBeInTheDocument();
  });

  it('la règle reste consultable au niveau 0', async () => {
    // Elle n'y coûte plus sept lignes : la valeur pédagogique revient sans le
    // prix de mise en page qui l'avait fait masquer.
    const user = userEvent.setup();
    render(<ExhaustionCard character={buildCharacter(0)} />);
    await user.click(screen.getByRole('button', { name: 'Lire la règle' }));
    expect(screen.getByText(/réduit de 2 fois votre niveau actuel/)).toBeInTheDocument();
  });

  it('+ écrit niveau+1, − écrit niveau-1', async () => {
    const user = userEvent.setup();
    render(<ExhaustionCard character={buildCharacter(2)} />);
    await user.click(screen.getByRole('button', { name: 'Augmenter l’épuisement' }));
    expect(updateCharacterMock).toHaveBeenCalledWith({ exhaustion: 3 });
    updateCharacterMock.mockClear();
    await user.click(screen.getByRole('button', { name: 'Diminuer l’épuisement' }));
    expect(updateCharacterMock).toHaveBeenCalledWith({ exhaustion: 1 });
  });

  it('− désactivé à 0, + désactivé à 6', () => {
    const { rerender } = render(<ExhaustionCard character={buildCharacter(0)} />);
    expect(screen.getByRole('button', { name: 'Diminuer l’épuisement' })).toBeDisabled();
    rerender(<ExhaustionCard character={buildCharacter(6)} />);
    expect(screen.getByRole('button', { name: 'Augmenter l’épuisement' })).toBeDisabled();
  });

  it('lecture seule : pas de steppers, jauge visible, règle consultable', () => {
    render(<ExhaustionCard readOnly character={buildCharacter(2)} />);
    expect(
      screen.queryByRole('button', { name: 'Augmenter l’épuisement' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Diminuer l’épuisement' }),
    ).not.toBeInTheDocument();
    // Lire la règle n'écrit rien : la lecture seule ne doit pas l'interdire.
    expect(screen.getByRole('button', { name: 'Lire la règle' })).toBeInTheDocument();
    expect(screen.getByText(/Niveau 2/)).toBeInTheDocument();
  });

  it('aucun anglicisme dans les libellés', () => {
    const { container } = render(<ExhaustionCard character={buildCharacter(3)} />);
    expectNoForbiddenEnglish(container.textContent ?? '', 'exhaustion-card');
  });
});
