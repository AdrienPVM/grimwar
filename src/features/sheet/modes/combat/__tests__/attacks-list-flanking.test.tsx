import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Character, CharacterClassEntry } from '@/shared/types/character';
import type { Item } from '@/shared/types/content';

import { AttacksList } from '../attacks-list';

import itemsBundle from '../../../../../../public/data/items.json';

/**
 * M55 — la variante « Prise en tenaille » cesse de mentir.
 *
 * Elle était persistée au schéma, décrite au meneur dans les réglages de
 * campagne, et n'avait **strictement aucun consommateur** : cocher la case ne
 * changeait rien nulle part (`docs/VARIANTS.md` promettait même un
 * `lib/rules/flanking.ts` qui n'a jamais existé). Une bascule qui ne fait rien
 * est pire qu'une bascule absente — elle crée une attente.
 *
 * L'entrée de menu n'invente aucune mécanique : elle applique l'avantage, qui
 * est exactement ce que dit la règle. Ce qu'elle apporte est le NOM, au moment
 * où on joue — et le fait que la case cochée ait enfin un effet visible.
 */

const ITEMS = itemsBundle as Item[];
/** Une arme de corps à corps quelconque du bundle, pour équiper le personnage. */
const MELEE = ITEMS.find((it) => it.category === 'weapon')!;

const rollAttackDamageMock = vi.fn().mockResolvedValue({ attack: null, damage: null });

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) =>
    type === 'items'
      ? { data: ITEMS, isLoading: false, error: null }
      : { data: [], isLoading: false, error: null },
}));

vi.mock('@/features/sheet/use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: vi.fn().mockResolvedValue(undefined),
    isUpdating: false,
    error: null,
  }),
}));

vi.mock('@/features/dice/use-dice', () => ({
  useDice: () => ({
    rollD20Plus: vi.fn().mockResolvedValue(null),
    rollExpression: vi.fn().mockResolvedValue(null),
    rollWithAdvantage: vi.fn().mockResolvedValue(null),
    rollWithDisadvantage: vi.fn().mockResolvedValue(null),
    rollDamageWithMode: vi.fn().mockResolvedValue(null),
    rollAttackDamage: (...args: unknown[]) => rollAttackDamageMock(...args),
  }),
}));

function classEntry(): CharacterClassEntry {
  return {
    classId: 'fighter',
    subclassId: null,
    level: 1,
    clericDivineOrder: null,
    druidPrimalOrder: null,
    fighterFightingStyle: null,
    weaponMasteries: [],
    expertiseSkills: [],
    eldritchInvocations: [],
    wizardSpellbookL1: [],
  };
}

function buildFighter(): Character {
  return {
    id: 'flank',
    name: 'Flank',
    status: 'alive',
    classes: [classEntry()],
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
    inventory: {
      items: [
        {
          contentId: MELEE.id,
          contentScope: 'public' as const,
          qty: 1,
          equipped: true,
          attuned: false,
          notes: '',
        },
      ],
      coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 },
      weightCache: 0,
    },
    personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
    featureUsage: {},
    extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    presentInCampaigns: [],
    homeCampaignId: null,
    stats: { totalRolls: 0, totalD20Sum: 0, crits: 0, fumbles: 0, skillUses: {} },
  } as unknown as Character;
}

/**
 * Ouvre le menu d'appui long de la ligne d'attaque. Le menu ne s'ouvre qu'au
 * bout du délai d'appui long — d'où les timers simulés (un simple clic
 * lancerait le jet normal au lieu d'ouvrir le menu).
 */
function openMenu(): void {
  vi.useFakeTimers();
  const row = screen.getByRole('button', { name: new RegExp(MELEE.name.fr) });
  fireEvent.pointerDown(row);
  act(() => {
    vi.advanceTimersByTime(1000);
  });
  vi.useRealTimers();
}

describe('<AttacksList> — variante Prise en tenaille (M55)', () => {
  it('variante inactive : le menu ne propose PAS la tenaille', () => {
    render(<AttacksList character={buildFighter()} readOnly={false} />);
    openMenu();
    expect(screen.getByRole('menuitem', { name: 'Avantage' })).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: 'Prise en tenaille' }),
    ).not.toBeInTheDocument();
  });

  it('variante active : l’entrée apparaît, sous le terme du projet', () => {
    render(<AttacksList character={buildFighter()} readOnly={false} flanking />);
    openMenu();
    expect(screen.getByRole('menuitem', { name: 'Prise en tenaille' })).toBeInTheDocument();
    // Elle S'AJOUTE à l'avantage, sans le remplacer : on prend aussi l'avantage
    // pour d'autres raisons dans le même combat.
    expect(screen.getByRole('menuitem', { name: 'Avantage' })).toBeInTheDocument();
  });

  it('la tenaille lance bien à l’avantage (elle n’invente aucune mécanique)', () => {
    rollAttackDamageMock.mockClear();
    render(<AttacksList character={buildFighter()} readOnly={false} flanking />);
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Prise en tenaille' }));

    expect(rollAttackDamageMock).toHaveBeenCalledTimes(1);
    const options = rollAttackDamageMock.mock.calls[0]![2] as { advantage: string };
    expect(options.advantage).toBe('advantage');
  });
});
