import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { Ancestry, Spell } from '@/shared/types/content';

import { AncestrySpellsCard } from '../ancestry-spells-card';

/**
 * Plan 13.8 step 30-31 — la carte sorts d'ascendance liste cantrip L1 +
 * sorts L3/L5 avec badge « Niv. N » pour ceux non encore débloqués.
 */

const SPELLS_FIXTURE: Spell[] = [
  {
    id: 'fire-bolt',
    name: { fr: 'Trait de feu', en: 'Fire Bolt' },
    level: 0,
    school: 'evocation',
    castingTime: { fr: '1 action', en: '1 Action' },
    range: { fr: '36 m', en: '120 ft' },
    components: { v: true, s: true, m: false },
    duration: { fr: 'Instantanée', en: 'Instantaneous' },
    concentration: false,
    ritual: false,
    description: { fr: '', en: '' },
    atHigherLevels: null,
    classes: ['sorcerer', 'wizard'],
    source: 'srd-5.2.1',
  },
  {
    id: 'hellish-rebuke',
    name: { fr: 'Châtiment infernal', en: 'Hellish Rebuke' },
    level: 1,
    school: 'evocation',
    castingTime: { fr: '1 réaction', en: '1 Reaction' },
    range: { fr: '18 m', en: '60 ft' },
    components: { v: true, s: true, m: false },
    duration: { fr: 'Instantanée', en: 'Instantaneous' },
    concentration: false,
    ritual: false,
    description: { fr: '', en: '' },
    atHigherLevels: null,
    classes: ['warlock'],
    source: 'srd-5.2.1',
  },
  {
    id: 'darkness',
    name: { fr: 'Ténèbres', en: 'Darkness' },
    level: 2,
    school: 'evocation',
    castingTime: { fr: '1 action', en: '1 Action' },
    range: { fr: '18 m', en: '60 ft' },
    components: { v: true, s: false, m: true },
    duration: { fr: '10 minutes', en: '10 Minutes' },
    concentration: true,
    ritual: false,
    description: { fr: '', en: '' },
    atHigherLevels: null,
    classes: ['warlock', 'wizard'],
    source: 'srd-5.2.1',
  },
];

const TIEFLING_ANCESTRY: Ancestry = {
  id: 'tiefling',
  name: { fr: 'Tieffelin', en: 'Tiefling' },
  size: 'small',
  speed: 30,
  description: { fr: '', en: '' },
  abilityScoreIncrease: [],
  traits: [],
  languages: ['common'],
  source: 'srd-5.2.1',
  options: {
    tieflingLegacies: [
      {
        id: 'infernal',
        name: { fr: 'Infernal', en: 'Infernal' },
        resistance: { fr: 'Feu', en: 'Fire' },
        cantripSpellId: 'fire-bolt',
        level3SpellId: 'hellish-rebuke',
        level5SpellId: 'darkness',
      },
    ],
  },
};

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'spells') return { data: SPELLS_FIXTURE, isLoading: false, error: null };
    if (type === 'ancestries')
      return { data: [TIEFLING_ANCESTRY], isLoading: false, error: null };
    return { data: [], isLoading: false, error: null };
  },
}));

function tieflingChar(level = 1): Character {
  return {
    id: 'test',
    name: 'Lilith',
    status: 'alive',
    classes: [
      {
        classId: 'rogue',
        subclassId: null,
        level,
        clericDivineOrder: null,
        druidPrimalOrder: null,
        fighterFightingStyle: null,
        weaponMasteries: [],
        expertiseSkills: [],
        eldritchInvocations: [],
        wizardSpellbookL1: [],
      },
    ],
    totalLevel: level,
    primaryClassId: 'rogue',
    ancestryId: 'tiefling',
    ancestrySubChoices: {
      dragonAncestry: null,
      tieflingLegacy: 'infernal',
      elfLineage: null,
      gnomeLineage: null,
      goliathAncestry: null,
      ancestryCastingAbility: 'cha',
      ancestryExtraSkill: null,
      ancestrySize: 'medium',
    },
    backgroundId: 'sage',
    extraLanguages: [],
    experience: 0,
    alignment: 'NB',
    abilities: { for: 10, dex: 14, con: 12, int: 10, sag: 10, cha: 14 },
    saves: { for: false, dex: true, con: false, int: true, sag: false, cha: false },
    skills: {},
    hp: { current: 8, max: 8, temp: 0 },
    ac: 12,
    speed: 30,
    initiative: 2,
    hitDice: [{ classId: 'rogue', current: level, max: level, die: 'd8' }],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    spellSlots: {},
    preparedSpells: {},
    knownSpells: { ancestry: ['fire-bolt', 'hellish-rebuke', 'darkness'] },
    spellcastingAbility: { ancestry: 'cha' },
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
    updatedBy: 'test-uid',
  };
}

describe('<AncestrySpellsCard>', () => {
  it("ne rend rien si knownSpells.ancestry est vide", () => {
    const character = tieflingChar();
    character.knownSpells = {};
    const { container } = render(<AncestrySpellsCard character={character} />);
    expect(container.firstChild).toBeNull();
  });

  it('Tieffelin Infernal L1 → 3 sorts listés + 2 L3/L5 grisés', () => {
    render(<AncestrySpellsCard character={tieflingChar(1)} />);
    expect(screen.getByText('Trait de feu')).toBeInTheDocument();
    expect(screen.getByText('Châtiment infernal')).toBeInTheDocument();
    expect(screen.getByText('Ténèbres')).toBeInTheDocument();
    expect(screen.getByText('Niv. 3')).toBeInTheDocument();
    expect(screen.getByText('Niv. 5')).toBeInTheDocument();
  });

  it('Tieffelin Infernal L3 → seul Ténèbres (L5) reste grisé', () => {
    render(<AncestrySpellsCard character={tieflingChar(3)} />);
    expect(screen.getByText('Niv. 5')).toBeInTheDocument();
    expect(screen.queryByText('Niv. 3')).not.toBeInTheDocument();
  });

  it('Tieffelin Infernal L5 → aucun verrou', () => {
    render(<AncestrySpellsCard character={tieflingChar(5)} />);
    expect(screen.queryByText(/Niv\./)).not.toBeInTheDocument();
  });

  it("affiche la caractéristique d'incantation lue depuis spellcastingAbility.ancestry", () => {
    render(<AncestrySpellsCard character={tieflingChar(1)} />);
    expect(screen.getByText(/Caract\. d'incantation/)).toBeInTheDocument();
    expect(screen.getByText(/Charisme/)).toBeInTheDocument();
  });

  it('affiche le titre Tieffelin', () => {
    render(<AncestrySpellsCard character={tieflingChar(1)} />);
    expect(screen.getByText("Sorts d'héritage fiélon")).toBeInTheDocument();
  });

  it('affiche le label source par sort (« Héritage Infernal »)', () => {
    render(<AncestrySpellsCard character={tieflingChar(3)} />);
    // 3 entries → 3 occurrences du label source.
    expect(screen.getAllByText('Héritage Infernal').length).toBe(3);
  });
});
