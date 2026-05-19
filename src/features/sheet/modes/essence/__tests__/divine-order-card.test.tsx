import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  Character,
  CharacterClassEntry,
  DivineOrder,
} from '@/shared/types/character';

import { DivineOrderCard } from '../divine-order-card';
import { expectNoForbiddenEnglish } from '../../../../../../tests/helpers/i18n-guard';

import classesBundle from '../../../../../../public/data/classes.json';

/**
 * Plan 13.9 commit 4b — la carte Ordre divin s'affiche pour les Clercs qui
 * ont choisi un ordre, lit le bundle `classes.json[cleric].divineOrders[*]`
 * et affiche le nom FR + summary FR exact.
 *
 * Cat. 2 (identité) + Cat. 5 (cohérence wizard → fiche) appliquées : le slug
 * `protector` posé au wizard rend EXACTEMENT « Protecteur » + le summary
 * `protector` du bundle, JAMAIS « Thaumaturge » ou un autre slug.
 *
 * Itération exhaustive sur les 2 ordres SRD. Source = bundle réel (pas
 * fixture) pour attraper toute désynchro slug ↔ name FR.
 */

interface ClassWithDivineOrders {
  id: string;
  divineOrders?: Array<{
    id: string;
    name: { fr: string; en?: string };
    summary: { fr: string; en?: string };
  }>;
}

const CLERIC_DIVINE_ORDERS =
  ((classesBundle as ClassWithDivineOrders[]).find((c) => c.id === 'cleric')
    ?.divineOrders ?? []);

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'classes') {
      return { data: classesBundle, isLoading: false, error: null };
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
    primaryClassId: classes[0]?.classId ?? 'cleric',
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
    backgroundId: 'acolyte',
    extraLanguages: [],
    experience: 0,
    alignment: 'LN',
    abilities: { for: 10, dex: 10, con: 14, int: 10, sag: 16, cha: 10 },
    saves: { for: false, dex: false, con: false, int: false, sag: true, cha: true },
    skills: {},
    hp: { current: 10, max: 10, temp: 0 },
    ac: 11,
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
    portrait: { type: 'letter', value: 'T' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'test-uid',
  };
}

describe('<DivineOrderCard>', () => {
  it('ne rend rien pour un perso non-Clerc', () => {
    const character = buildCharacter([
      classEntry({ classId: 'fighter', clericDivineOrder: null }),
    ]);
    const { container } = render(<DivineOrderCard character={character} />);
    expect(container.firstChild).toBeNull();
  });

  it('ne rend rien pour un Clerc sans ordre choisi (sentinelle null)', () => {
    const character = buildCharacter([
      classEntry({ classId: 'cleric', clericDivineOrder: null }),
    ]);
    const { container } = render(<DivineOrderCard character={character} />);
    expect(container.firstChild).toBeNull();
  });

  // Cat. 2 — identité. Cat. 5 — cohérence wizard → fiche. Itération exhaustive
  // sur les 2 ordres SRD : aucun cas omis. Le slug posé au wizard rend
  // EXACTEMENT le nom + summary du bundle, JAMAIS celui d'un autre ordre.
  it.each(
    CLERIC_DIVINE_ORDERS.map((o) => ({
      order: o.id as DivineOrder,
      name: o.name.fr,
      summary: o.summary.fr,
      otherName: CLERIC_DIVINE_ORDERS.find((x) => x.id !== o.id)?.name.fr ?? '',
    })),
  )(
    'Clerc avec clericDivineOrder=$order → carte affiche "$name" + summary EXACT, jamais "$otherName"',
    ({ order, name, summary, otherName }) => {
      const character = buildCharacter([
        classEntry({ classId: 'cleric', clericDivineOrder: order }),
      ]);
      render(<DivineOrderCard character={character} />);
      // Nom FR exact du bundle visible.
      expect(screen.getByText(name)).toBeInTheDocument();
      // Summary FR exact du bundle visible.
      expect(screen.getByText(summary)).toBeInTheDocument();
      // Test négatif Cat. 5 : aucune fuite de l'autre ordre.
      expect(screen.queryByText(otherName)).not.toBeInTheDocument();
    },
  );

  it('garde-fou bundle ↔ enum : les 2 DivineOrder résolvent dans classes.json[cleric].divineOrders', () => {
    const enumOrders: DivineOrder[] = ['protector', 'thaumaturge'];
    for (const slug of enumOrders) {
      const order = CLERIC_DIVINE_ORDERS.find((o) => o.id === slug);
      expect(order, `slug ${slug} introuvable dans classes.json[cleric].divineOrders`).toBeDefined();
    }
  });

  it('aucune fuite EN dans la carte (i18n-guard, plan 13.9 commit hotfix 4a)', () => {
    const character = buildCharacter([
      classEntry({ classId: 'cleric', clericDivineOrder: 'protector' }),
    ]);
    const { container } = render(<DivineOrderCard character={character} />);
    expectNoForbiddenEnglish(container.textContent ?? '', 'DivineOrderCard');
  });
});
