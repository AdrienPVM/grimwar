import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

import { AncestryTraitsCard } from '../ancestry-traits-card';
import { expectNoForbiddenEnglish } from '../../../../../../tests/helpers/i18n-guard';

import ancestriesBundle from '../../../../../../public/data/ancestries.json';

/**
 * Carte « Traits d'ascendance » — Cat. 2 (identité, pas présence) + Cat. 3
 * (fidélité bundle figée). Les traits viennent de `ancestries.json[id].traits[]`
 * et doivent correspondre EXACTEMENT aux champs `name.fr` / `description.fr`.
 *
 * Source = bundle réel (pas de mock de contenu), comme la carte Don d'origines.
 */

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'ancestries') {
      return { data: ancestriesBundle, isLoading: false, error: null };
    }
    return { data: [], isLoading: false, error: null };
  },
}));

function buildCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'anc',
    name: 'Anc',
    status: 'alive',
    classes: [],
    totalLevel: 1,
    primaryClassId: 'fighter',
    ancestryId: 'elf',
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
    alignment: 'N',
    abilities: { for: 10, dex: 14, con: 10, int: 12, sag: 12, cha: 10 },
    saves: { for: false, dex: false, con: false, int: false, sag: false, cha: false },
    skills: {},
    hp: { current: 8, max: 8, temp: 0 },
    ac: 12,
    speed: 30,
    initiative: 2,
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

/** Entrée bundle réelle, pour figer les valeurs de référence (Cat. 3). */
const elf = (
  ancestriesBundle as Array<{
    id: string;
    traits: { name: { fr: string }; description: { fr: string } }[];
  }>
).find((a) => a.id === 'elf')!;
const darkvision = elf.traits.find((tr) => tr.name.fr === 'Vision dans le noir')!;

describe('<AncestryTraitsCard>', () => {
  it('liste TOUS les traits de l\'ascendance (identité, pas présence)', () => {
    render(<AncestryTraitsCard character={buildCharacter()} />);
    expect(screen.getByText("Traits d'ascendance")).toBeInTheDocument();
    // Chaque nom de trait du bundle est rendu À L'IDENTIQUE.
    for (const trait of elf.traits) {
      expect(screen.getByText(trait.name.fr)).toBeInTheDocument();
    }
    // Garde-fou de complétude : aucun trait perdu.
    expect(elf.traits.length).toBe(5);
  });

  it('Vision dans le noir : la description exacte du bundle est surfacée', async () => {
    const user = userEvent.setup();
    render(<AncestryTraitsCard character={buildCharacter()} />);
    // Valeur de référence figée (vérifiée une fois contre le SRD).
    expect(darkvision.description.fr).toBe('Vous disposez de la Vision dans le noir sur 18 m.');
    await user.click(screen.getByRole('button', { name: 'Trait : Vision dans le noir' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const inDialog = screen.getAllByText(darkvision.description.fr);
    expect(inDialog.length).toBeGreaterThan(0);
  });

  it('ne rend rien si l\'ascendance est introuvable', () => {
    const { container } = render(
      <AncestryTraitsCard character={buildCharacter({ ancestryId: 'inexistant' })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('ne laisse fuir aucun anglais interdit dans le rendu FR', () => {
    const { container } = render(<AncestryTraitsCard character={buildCharacter()} />);
    expectNoForbiddenEnglish(container.textContent ?? '', 'ancestry-traits-card');
  });
});
