import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Character, CharacterClassEntry, FightingStyle } from '@/shared/types/character';
import type { Feat } from '@/shared/types/content';

import { FightingStyleCard } from '../fighting-style-card';

import featsBundle from '../../../../../../public/data/feats.json';

/**
 * Plan 13.9 commit 4a — la carte Fighting Style s'affiche pour les Guerriers
 * qui ont choisi un style, lit le feat correspondant dans `feats.json` et
 * affiche son nom FR + son résumé FR.
 *
 * **Itération exhaustive** : un cas par style SRD (Archery / Defense / Great
 * Weapon Fighting / Two-Weapon Fighting) — on lit le bundle réel, pas un
 * fixture, pour attraper toute désynchro entre le slug `FightingStyle` et la
 * clé `id` côté bundle.
 */

const FIGHTING_STYLE_FEATS = (featsBundle as Feat[]).filter(
  (f) => f.category === 'fighting-style',
);

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'feats') {
      return { data: FIGHTING_STYLE_FEATS, isLoading: false, error: null };
    }
    return { data: [], isLoading: false, error: null };
  },
}));

function classEntry(
  partial: Partial<CharacterClassEntry> & Pick<CharacterClassEntry, 'classId'>,
): CharacterClassEntry {
  return {
    subclassId: null,
    level: 1,
    clericDivineOrder: null,
    druidPrimalOrder: null,
    fighterFightingStyle: null,
    weaponMasteries: [],
    expertiseSkills: [],
    eldritchInvocations: [],
    wizardSpellbookL1: [],
    ...partial,
  };
}

function buildCharacter(classes: CharacterClassEntry[]): Character {
  return {
    id: 'test',
    name: 'Test',
    status: 'alive',
    classes,
    totalLevel: classes.reduce((s, c) => s + c.level, 0),
    primaryClassId: classes[0]?.classId ?? 'fighter',
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
    ac: 13,
    speed: 30,
    initiative: 1,
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
    portrait: { type: 'letter', value: 'T' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'test-uid',
  };
}

describe('<FightingStyleCard>', () => {
  it('ne rend rien pour un perso non-Guerrier', () => {
    const character = buildCharacter([
      classEntry({ classId: 'rogue', fighterFightingStyle: null }),
    ]);
    const { container } = render(
      <FightingStyleCard character={character} readOnly={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('ne rend rien pour un Guerrier sans style choisi (sentinelle)', () => {
    const character = buildCharacter([
      classEntry({ classId: 'fighter', fighterFightingStyle: null }),
    ]);
    const { container } = render(
      <FightingStyleCard character={character} readOnly={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  // Itération exhaustive sur les 4 styles SRD : aucun cas omis,
  // chaque slug doit résoudre dans feats.json (catégorie fighting-style).
  it.each(
    FIGHTING_STYLE_FEATS.map((f) => ({
      style: f.id as FightingStyle,
      name: f.name.fr,
      // `summary` est nullable côté schéma — les 4 styles SRD le portent
      // toujours dans le bundle livré ; on cast non-null à l'index FR.
      summary: f.summary?.fr ?? '',
    })),
  )(
    'Guerrier avec style=$style → carte affiche "$name" + summary FR',
    ({ style, name, summary }) => {
      const character = buildCharacter([
        classEntry({ classId: 'fighter', fighterFightingStyle: style }),
      ]);
      render(<FightingStyleCard character={character} readOnly={false} />);
      // Nom FR du feat visible (titre de la carte).
      expect(screen.getByText(name)).toBeInTheDocument();
      // Summary FR visible (corps de la carte).
      expect(screen.getByText(summary)).toBeInTheDocument();
    },
  );

  it('garde-fou bundle ↔ slug : les 4 enum FightingStyle résolvent toutes dans feats.json', () => {
    const allStyles: FightingStyle[] = [
      'archery',
      'defense',
      'great-weapon-fighting',
      'two-weapon-fighting',
    ];
    for (const style of allStyles) {
      const feat = FIGHTING_STYLE_FEATS.find((f) => f.id === style);
      expect(feat, `feat id=${style} introuvable dans feats.json`).toBeDefined();
    }
  });
});
