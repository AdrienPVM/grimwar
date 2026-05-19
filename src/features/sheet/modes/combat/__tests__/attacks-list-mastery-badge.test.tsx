import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Character, CharacterClassEntry } from '@/shared/types/character';
import type { Item, WeaponMasteryProperty } from '@/shared/types/content';
import { WEAPON_MASTERY_HELP, applyWeaponName } from '@/features/wizard/help/weapon-mastery-help';

import { AttacksList } from '../attacks-list';

import itemsBundle from '../../../../../../public/data/items.json';
import { findForbiddenEnglish } from '../../../../../../tests/helpers/i18n-guard';

/**
 * Plan 13.9 commit 4a — badge Weapon Mastery sur les armes équipées dont
 * l'`itemId` figure dans l'union `classes[i].weaponMasteries`.
 *
 * **Itération exhaustive** : un test par arme masterisable du bundle (~38),
 * pas d'échantillon. Si une seule arme du bundle voit son badge cassé, ce
 * fichier rougit. C'est précisément l'invariant qu'on veut bloquer.
 *
 * Invariants couverts :
 *  - Badge présent ssi (arme équipée) ET (id ∈ union weaponMasteries) ET
 *    (arme a une masteryProperty).
 *  - Le label FR affiché est celui de `WEAPON_MASTERY_HELP[prop].label` —
 *    source unique, déjà partagée avec le chooser wizard.
 *  - Tap badge → DetailModal s'ouvre avec le nom de l'arme substitué dans
 *    l'exemple. Aucun autre nom d'arme du bundle ne fuit (test négatif).
 *  - Pas de masterie sans equipped : weaponMasteries=[id] mais equipped=false
 *    → arme absente de la liste d'attaques → pas de badge.
 *  - Equipped mais pas dans weaponMasteries → pas de badge.
 *
 * Le helper `getKnownWeaponMasteries` est testé séparément
 * (`src/shared/lib/rules/__tests__/weapon-mastery.test.ts`). Ici on cible le
 * rendu observable.
 */

const ITEMS = itemsBundle as Item[];
const MASTERABLE_WEAPONS = ITEMS.filter(
  (it): it is Item & { masteryProperty: WeaponMasteryProperty } =>
    it.category === 'weapon' && Boolean(it.masteryProperty),
);

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'items') return { data: ITEMS, isLoading: false, error: null };
    return { data: [], isLoading: false, error: null };
  },
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
    rollAttackDamage: vi.fn().mockResolvedValue({ attack: null, damage: null }),
  }),
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

function buildFighterWith(
  equippedIds: string[],
  weaponMasteries: string[],
): Character {
  return {
    id: 'test',
    name: 'Test',
    status: 'alive',
    classes: [classEntry({ classId: 'fighter', weaponMasteries })],
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
    inventory: {
      items: equippedIds.map((id) => ({
        contentId: id,
        contentScope: 'public' as const,
        qty: 1,
        equipped: true,
        attuned: false,
        notes: '',
      })),
      coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 },
      weightCache: 0,
    },
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

describe('<AttacksList> — badge Weapon Mastery', () => {
  // ─────────────────────────────────────────────────────────────────────
  // Itération exhaustive : 1 test par arme masterisable du bundle.
  // ─────────────────────────────────────────────────────────────────────
  it.each(MASTERABLE_WEAPONS.map((w) => ({
    id: w.id,
    name: w.name.fr,
    property: w.masteryProperty,
    label: WEAPON_MASTERY_HELP[w.masteryProperty].label,
  })))(
    'arme=$name équipée + dans weaponMasteries → badge "Maîtrise · $label" visible et entièrement en FR',
    ({ id, name, label }) => {
      const character = buildFighterWith([id], [id]);
      render(<AttacksList character={character} readOnly={false} />);
      const badge = screen.getByRole('button', {
        name: `Voir la maîtrise de ${name}`,
      });
      expect(badge).toBeInTheDocument();
      // Le label FR visible dans le bouton — invariant chooser/help/sheet.
      const text = badge.textContent ?? '';
      expect(text).toContain(label);
      // Préfixe FR explicite — pas de chaîne EN résiduelle (bug UAT 2026-05-19).
      expect(text).toContain('Maîtrise');
      // Garde-fou réutilisable : aucun mot EN interdit dans le badge.
      expect(
        findForbiddenEnglish(text),
        `Mots EN interdits dans le badge "${name}" : "${text}"`,
      ).toEqual([]);
    },
  );

  it.each(MASTERABLE_WEAPONS.map((w) => ({
    id: w.id,
    name: w.name.fr,
    property: w.masteryProperty,
  })))(
    'arme=$name équipée mais ABSENTE de weaponMasteries → PAS de badge',
    ({ id, name }) => {
      const character = buildFighterWith([id], []);
      render(<AttacksList character={character} readOnly={false} />);
      expect(
        screen.queryByRole('button', { name: `Voir la maîtrise de ${name}` }),
      ).toBeNull();
    },
  );

  it.each(MASTERABLE_WEAPONS.slice(0, 3).map((w) => ({
    id: w.id,
    name: w.name.fr,
  })))(
    'arme=$name PAS équipée mais dans weaponMasteries → pas dans la liste d\'attaques (donc pas de badge)',
    ({ id, name }) => {
      // Pas dans l'inventaire du tout — équivalent à "pas équipée" côté
      // AttacksList qui filtre sur `inventory.items[].equipped`.
      const character = buildFighterWith([], [id]);
      render(<AttacksList character={character} readOnly={false} />);
      // La ligne d'attaque n'est pas rendue → ni le badge ni le row.
      expect(screen.queryByText(name)).toBeNull();
      expect(
        screen.queryByRole('button', { name: `Voir la maîtrise de ${name}` }),
      ).toBeNull();
    },
  );

  // ─────────────────────────────────────────────────────────────────────
  // Détail modale : nom d'arme substitué dans l'exemple,
  // aucun nom d'arme tiers ne fuit.
  // ─────────────────────────────────────────────────────────────────────
  it.each(MASTERABLE_WEAPONS.map((w) => ({
    id: w.id,
    name: w.name.fr,
    property: w.masteryProperty,
  })))(
    'tap badge $name → modale ouverte avec exemple "$name :" et aucun autre nom d\'arme',
    ({ id, name, property }) => {
      const character = buildFighterWith([id], [id]);
      render(<AttacksList character={character} readOnly={false} />);
      const badge = screen.getByRole('button', {
        name: `Voir la maîtrise de ${name}`,
      });
      fireEvent.click(badge);
      const dialog = screen.getByRole('dialog');
      const expectedExample = applyWeaponName(
        WEAPON_MASTERY_HELP[property].example,
        name,
      );
      // L'exemple substitué (avec le nom de l'arme cliquée) est dans la modale.
      const dialogText = dialog.textContent ?? '';
      expect(dialogText).toContain(expectedExample);
      // Anti-fuite : aucun autre nom d'arme masterisable du bundle ne doit
      // apparaître comme préfixe d'exemple (`<autre-arme> :`).
      for (const other of MASTERABLE_WEAPONS) {
        if (other.id === id) continue;
        // On évite les faux-positifs où un nom d'arme contient un autre
        // (ex. "Lance" ⊂ "Lance d'armes"). Test strict : on cherche
        // `<other> :` (le préfixe que `applyWeaponName` produirait), pas
        // une simple occurrence du nom.
        const otherPrefix = `${other.name.fr} :`;
        expect(
          dialogText,
          `nom d'arme tiers "${other.name.fr}" trouvé dans la modale de ${name}`,
        ).not.toContain(otherPrefix);
      }
      // Sanité : le label FR de la propriété est aussi présent dans la modale.
      expect(within(dialog).getAllByText(WEAPON_MASTERY_HELP[property].label).length).toBeGreaterThan(0);
    },
  );

  // ─────────────────────────────────────────────────────────────────────
  // Couverture matricielle : les 8 propriétés sont représentées
  // au moins une fois côté bundle ↔ help.
  // ─────────────────────────────────────────────────────────────────────
  it('les 8 propriétés Weapon Mastery sont chacune représentées dans le bundle items.json', () => {
    const propsInBundle = new Set(MASTERABLE_WEAPONS.map((w) => w.masteryProperty));
    const propsInHelp = new Set(Object.keys(WEAPON_MASTERY_HELP));
    expect(propsInBundle).toEqual(propsInHelp);
  });
});
