import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  Character,
  CharacterClassEntry,
  PrimalOrder,
} from '@/shared/types/character';

import { PrimalOrderCard } from '../primal-order-card';
import {
  expectNoForbiddenEnglish,
  expectNoForbiddenNonOfficialFr,
} from '../../../../../../tests/helpers/i18n-guard';

import classesBundle from '../../../../../../public/data/classes.json';

/**
 * Plan 13.9 commit 4b — la carte Ordre primordial s'affiche pour les Druides
 * qui ont choisi un ordre, lit le bundle `classes.json[druid].primalOrders[*]`
 * et affiche le nom FR + summary FR exact.
 *
 * Cat. 2 (identité) + Cat. 5 (cohérence wizard → fiche) appliquées : le slug
 * `magician` posé au wizard rend EXACTEMENT « Mage » + le summary `magician`
 * du bundle, JAMAIS « Gardien » ou un autre slug.
 *
 * Itération exhaustive sur les 2 ordres SRD. Source = bundle réel.
 */

interface ClassWithPrimalOrders {
  id: string;
  primalOrders?: Array<{
    id: string;
    name: { fr: string; en?: string };
    summary: { fr: string; en?: string };
  }>;
}

const DRUID_PRIMAL_ORDERS =
  ((classesBundle as ClassWithPrimalOrders[]).find((c) => c.id === 'druid')
    ?.primalOrders ?? []);

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
    primaryClassId: classes[0]?.classId ?? 'druid',
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
    backgroundId: 'hermit',
    extraLanguages: [],
    experience: 0,
    alignment: 'N',
    abilities: { for: 10, dex: 12, con: 14, int: 12, sag: 16, cha: 10 },
    saves: { for: false, dex: false, con: false, int: true, sag: true, cha: false },
    skills: {},
    hp: { current: 10, max: 10, temp: 0 },
    ac: 12,
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

describe('<PrimalOrderCard>', () => {
  it('ne rend rien pour un perso non-Druide', () => {
    const character = buildCharacter([
      classEntry({ classId: 'rogue', druidPrimalOrder: null }),
    ]);
    const { container } = render(<PrimalOrderCard character={character} />);
    expect(container.firstChild).toBeNull();
  });

  it('ne rend rien pour un Druide sans ordre choisi (sentinelle null)', () => {
    const character = buildCharacter([
      classEntry({ classId: 'druid', druidPrimalOrder: null }),
    ]);
    const { container } = render(<PrimalOrderCard character={character} />);
    expect(container.firstChild).toBeNull();
  });

  it.each(
    DRUID_PRIMAL_ORDERS.map((o) => ({
      order: o.id as PrimalOrder,
      name: o.name.fr,
      summary: o.summary.fr,
      otherName: DRUID_PRIMAL_ORDERS.find((x) => x.id !== o.id)?.name.fr ?? '',
    })),
  )(
    'Druide avec druidPrimalOrder=$order → carte affiche "$name" + summary EXACT, jamais "$otherName"',
    ({ order, name, summary, otherName }) => {
      const character = buildCharacter([
        classEntry({ classId: 'druid', druidPrimalOrder: order }),
      ]);
      render(<PrimalOrderCard character={character} />);
      expect(screen.getByText(name)).toBeInTheDocument();
      expect(screen.getByText(summary)).toBeInTheDocument();
      expect(screen.queryByText(otherName)).not.toBeInTheDocument();
    },
  );

  it('garde-fou bundle ↔ enum : les 2 PrimalOrder résolvent dans classes.json[druid].primalOrders', () => {
    const enumOrders: PrimalOrder[] = ['magician', 'warden'];
    for (const slug of enumOrders) {
      const order = DRUID_PRIMAL_ORDERS.find((o) => o.id === slug);
      expect(order, `slug ${slug} introuvable dans classes.json[druid].primalOrders`).toBeDefined();
    }
  });

  /**
   * Itération exhaustive sur les 2 ordres primordiaux : Mage porte
   * « cantrip » dans son `summary.fr` du bundle SRD (4a + 4b), puis sa
   * 1ère correction a introduit « tour de magie » (terme non-officiel
   * Baldur's Gate 3) là où le PHB FR officiel utilise « sort mineur ».
   * Le test couvre les deux pièges via le i18n-guard étendu.
   */
  it.each<PrimalOrder>(['magician', 'warden'])(
    'aucune fuite EN ni terme FR non-officiel dans la carte pour l\'ordre %s (i18n-guard)',
    (slug) => {
      const character = buildCharacter([
        classEntry({ classId: 'druid', druidPrimalOrder: slug }),
      ]);
      const { container } = render(<PrimalOrderCard character={character} />);
      const text = container.textContent ?? '';
      expectNoForbiddenEnglish(text, `PrimalOrderCard:${slug}`);
      expectNoForbiddenNonOfficialFr(text, `PrimalOrderCard:${slug}`);
    },
  );

  // ───────────────────────────────────────────────────────────────────────
  // Commit 4c — carte cliquable + modale détail (parité avec Divine Order).
  // ───────────────────────────────────────────────────────────────────────

  it('cat. 4c — la carte est un bouton tappable (role=button + aria-label)', () => {
    const character = buildCharacter([
      classEntry({ classId: 'druid', druidPrimalOrder: 'magician' }),
    ]);
    render(<PrimalOrderCard character={character} />);
    const trigger = screen.getByRole('button', { name: /Ordre primordial : Mage/ });
    expect(trigger).toBeInTheDocument();
  });

  it.each(
    DRUID_PRIMAL_ORDERS.map((o) => ({
      order: o.id as PrimalOrder,
      name: o.name.fr,
      summary: o.summary.fr,
      otherName: DRUID_PRIMAL_ORDERS.find((x) => x.id !== o.id)?.name.fr ?? '',
    })),
  )(
    'cat. 4c — tap sur Druide/$name ouvre la modale avec $name + son summary EXACT, jamais $otherName',
    ({ order, name, summary, otherName }) => {
      const character = buildCharacter([
        classEntry({ classId: 'druid', druidPrimalOrder: order }),
      ]);
      render(<PrimalOrderCard character={character} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`Ordre primordial : ${name}`) }));
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('Ordre primordial')).toBeInTheDocument();
      expect(within(dialog).getByText(name)).toBeInTheDocument();
      expect(within(dialog).getByText(summary)).toBeInTheDocument();
      expect(within(dialog).queryByText(otherName)).not.toBeInTheDocument();
    },
  );

  it('cat. 4c — Échap ferme la modale', () => {
    const character = buildCharacter([
      classEntry({ classId: 'druid', druidPrimalOrder: 'magician' }),
    ]);
    render(<PrimalOrderCard character={character} />);
    fireEvent.click(screen.getByRole('button', { name: /Ordre primordial : Mage/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
