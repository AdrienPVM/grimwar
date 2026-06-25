import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

import { ClassFeaturesCard } from '../class-features-card';
import { expectNoForbiddenEnglish } from '../../../../../../tests/helpers/i18n-guard';

import classesBundle from '../../../../../../public/data/classes.json';

/**
 * Carte « Aptitudes de classe » — Cat. 2 (identité) + Cat. 3 (fidélité bundle) +
 * Cat. 6 (cas-limite : filtrage par niveau). Les aptitudes viennent de
 * `classes.json[id].features[]` filtrées à `level <= niveau du PJ`.
 */

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'classes') {
      return { data: classesBundle, isLoading: false, error: null };
    }
    return { data: [], isLoading: false, error: null };
  },
}));

function buildCharacter(classLevel: number, classId = 'rogue'): Character {
  return {
    id: 'cf',
    name: 'Cf',
    status: 'alive',
    classes: [
      {
        classId,
        subclassId: null,
        level: classLevel,
        clericDivineOrder: null,
        druidPrimalOrder: null,
        fighterFightingStyle: null,
        weaponMasteries: [],
        expertiseSkills: [],
        eldritchInvocations: [],
        wizardSpellbookL1: [],
      },
    ],
    totalLevel: classLevel,
    primaryClassId: classId,
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
    portrait: { type: 'letter', value: 'C' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'uid',
  };
}

const rogue = (
  classesBundle as Array<{
    id: string;
    features: { level: number; name: { fr: string }; description: { fr: string } }[];
  }>
).find((c) => c.id === 'rogue')!;
const sneak = rogue.features.find((f) => f.name.fr === 'Attaque sournoise')!;
const l1Names = rogue.features.filter((f) => f.level <= 1).map((f) => f.name.fr);

describe('<ClassFeaturesCard>', () => {
  it('Roublard L1 : liste les 4 aptitudes de niveau 1 (identité)', () => {
    render(<ClassFeaturesCard character={buildCharacter(1)} />);
    expect(screen.getByText('Aptitudes de classe')).toBeInTheDocument();
    expect(l1Names).toEqual(
      expect.arrayContaining(['Expertise', 'Attaque sournoise', 'Argot des voleurs']),
    );
    for (const name of l1Names) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    // Exactement les aptitudes level<=1 (les 18 d'échelon supérieur sont gatées).
    expect(screen.getAllByRole('button', { name: /^Aptitude : / })).toHaveLength(l1Names.length);
  });

  it('tap « Attaque sournoise » → modale avec la description exacte du bundle', async () => {
    const user = userEvent.setup();
    render(<ClassFeaturesCard character={buildCharacter(1)} />);
    await user.click(screen.getByRole('button', { name: 'Aptitude : Attaque sournoise' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const inDialog = screen.getAllByText(sneak.description.fr);
    expect(inDialog.length).toBeGreaterThan(0);
  });

  it('Cat. 6 — filtrage par niveau : un Roublard 3 montre PLUS d\'aptitudes qu\'un L1', () => {
    const { rerender } = render(<ClassFeaturesCard character={buildCharacter(1)} />);
    const l1Count = screen.getAllByRole('button', { name: /^Aptitude : / }).length;
    rerender(<ClassFeaturesCard character={buildCharacter(3)} />);
    const l3Count = screen.getAllByRole('button', { name: /^Aptitude : / }).length;
    expect(l3Count).toBeGreaterThan(l1Count);
  });

  it('ne rend rien si la classe est introuvable', () => {
    const { container } = render(
      <ClassFeaturesCard character={buildCharacter(1, 'inexistant')} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('ne laisse fuir aucun anglais interdit dans le rendu FR', () => {
    const { container } = render(<ClassFeaturesCard character={buildCharacter(1)} />);
    expectNoForbiddenEnglish(container.textContent ?? '', 'class-features-card');
  });
});
