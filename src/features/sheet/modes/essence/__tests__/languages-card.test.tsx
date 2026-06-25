import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

import { LanguagesCard } from '../languages-card';
import { expectNoForbiddenEnglish } from '../../../../../../tests/helpers/i18n-guard';

import ancestriesBundle from '../../../../../../public/data/ancestries.json';

/**
 * Carte « Langues » — Cat. 2 (identité) + Cat. 5 (cohérence wizard → fiche).
 *
 * La langue bonus choisie au wizard (`character.extraLanguages`) apparaît ici
 * À L'IDENTIQUE, en plus de la langue d'ascendance (« Commun »). Avant le fix
 * `submit-from-wizard`, ce choix était perdu → la carte n'affichait que
 * « Commun ». Source ancestries = bundle réel.
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
    id: 'lang',
    name: 'Lang',
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
    alignment: 'N',
    abilities: { for: 10, dex: 14, con: 10, int: 10, sag: 10, cha: 10 },
    saves: { for: false, dex: true, con: false, int: true, sag: false, cha: false },
    skills: {},
    hp: { current: 8, max: 8, temp: 0 },
    ac: 12,
    speed: 9,
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
    portrait: { type: 'letter', value: 'L' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'uid',
    ...overrides,
  };
}

describe('<LanguagesCard>', () => {
  it('affiche « Commun » seul quand le perso n\'a aucune langue bonus', () => {
    render(<LanguagesCard character={buildCharacter()} />);
    expect(screen.getByText('Langues')).toBeInTheDocument();
    expect(screen.getByText('Commun')).toBeInTheDocument();
    expect(screen.queryByText('Elfique')).toBeNull();
  });

  it('affiche la langue bonus du Roublard À L\'IDENTIQUE (Commun + Elfique)', () => {
    render(<LanguagesCard character={buildCharacter({ extraLanguages: ['elvish'] })} />);
    expect(screen.getByText('Commun')).toBeInTheDocument();
    expect(screen.getByText('Elfique')).toBeInTheDocument();
  });

  it('ne laisse fuir aucun anglais interdit dans le rendu FR', () => {
    const { container } = render(
      <LanguagesCard character={buildCharacter({ extraLanguages: ['draconic', 'orc'] })} />,
    );
    expectNoForbiddenEnglish(container.textContent ?? '', 'languages-card');
  });
});
