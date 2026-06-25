import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

import { HitDiceCard } from '../hit-dice-card';
import { expectNoForbiddenEnglish } from '../../../../../../tests/helpers/i18n-guard';

import classesBundle from '../../../../../../public/data/classes.json';

/**
 * Carte « Dés de vie » — Cat. 2 (identité : nom de classe résolu + dé exacts) +
 * Cat. 4 (le ratio courant/max affiché au NOMBRE). Lecture seule.
 */

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'classes') {
      return { data: classesBundle, isLoading: false, error: null };
    }
    return { data: [], isLoading: false, error: null };
  },
}));

function buildCharacter(hitDice: Character['hitDice']): Character {
  return {
    id: 'hd',
    name: 'Hd',
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
    ac: 16,
    speed: 30,
    initiative: 1,
    hitDice,
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
    portrait: { type: 'letter', value: 'H' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'uid',
  };
}

describe('<HitDiceCard>', () => {
  it('Guerrier L1 : nom de classe résolu + d10 + ratio 1/1', () => {
    render(
      <HitDiceCard
        character={buildCharacter([{ classId: 'fighter', current: 1, max: 1, die: 'd10' }])}
      />,
    );
    expect(screen.getByText('Dés de vie')).toBeInTheDocument();
    // Nom de classe résolu depuis le bundle, pas le slug brut.
    expect(screen.getByText('Guerrier')).toBeInTheDocument();
    expect(screen.getByText('1d10')).toBeInTheDocument();
    expect(screen.getByText('/ 1')).toBeInTheDocument();
  });

  it('multi-class : un pool par classe', () => {
    render(
      <HitDiceCard
        character={buildCharacter([
          { classId: 'fighter', current: 2, max: 3, die: 'd10' },
          { classId: 'wizard', current: 1, max: 2, die: 'd6' },
        ])}
      />,
    );
    expect(screen.getByText('Guerrier')).toBeInTheDocument();
    expect(screen.getByText('Magicien')).toBeInTheDocument();
    expect(screen.getByText('3d10')).toBeInTheDocument();
    expect(screen.getByText('2d6')).toBeInTheDocument();
  });

  it('ne rend rien sans dé de vie', () => {
    const { container } = render(<HitDiceCard character={buildCharacter([])} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('ne laisse fuir aucun anglais interdit dans le rendu FR', () => {
    const { container } = render(
      <HitDiceCard
        character={buildCharacter([{ classId: 'fighter', current: 1, max: 1, die: 'd10' }])}
      />,
    );
    expectNoForbiddenEnglish(container.textContent ?? '', 'hit-dice-card');
  });
});
