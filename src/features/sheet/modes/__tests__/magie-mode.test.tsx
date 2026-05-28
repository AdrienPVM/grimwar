import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { Ancestry, ClassEntity, Spell } from '@/shared/types/content';

import { MagieMode } from '../magie-mode';

/**
 * Plan 13.8b commit 2 — `MagieMode` orchestre `AncestrySpellsCard` +
 * `SpellList` + `SpellDetailModal`. Pour un non-caster avec sorts
 * d'ascendance, le clic sur un sort de la carte de lignage doit ouvrir la
 * modale, afficher le nom, et désactiver le bouton « Lancer » avec un hint
 * « pas encore implémenté » (D12).
 *
 * On mock `useContent` pour `spells` / `ancestries` / `classes` afin que les
 * helpers (`spellcastingClasses`, etc.) ne dépendent pas du runtime Dexie.
 * `useUpdateCharacter` et `useDice` sont stubés — pas appelés ici (bouton
 * Lancer désactivé pour les sorts d'ascendance pure), mais évite les
 * dépendances Firebase au mount du composant.
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
    description: {
      fr: 'Vous projetez une bille de feu sur une créature ou un objet à portée.',
      en: 'You hurl a mote of fire at a creature or object within range.',
    },
    atHigherLevels: null,
    classes: ['sorcerer', 'wizard'],
    source: 'srd-5.2.1',
  },
  {
    id: 'lumieres-dansantes',
    name: { fr: 'Lumières dansantes', en: 'Dancing Lights' },
    level: 0,
    school: 'illusion',
    castingTime: { fr: '1 action', en: '1 Action' },
    range: { fr: '36 m', en: '120 ft' },
    components: { v: true, s: true, m: true },
    duration: { fr: '1 minute', en: '1 Minute' },
    concentration: true,
    ritual: false,
    description: {
      fr: 'Vous créez jusqu’à quatre lumières scintillantes flottantes.',
      en: 'You create up to four small floating dancing lights.',
    },
    atHigherLevels: null,
    classes: ['wizard'],
    source: 'srd-5.2.1',
  },
  {
    id: 'illusion-mineure',
    name: { fr: 'Illusion mineure', en: 'Minor Illusion' },
    level: 0,
    school: 'illusion',
    castingTime: { fr: '1 action', en: '1 Action' },
    range: { fr: '9 m', en: '30 ft' },
    components: { v: false, s: true, m: false },
    duration: { fr: '1 minute', en: '1 Minute' },
    concentration: false,
    ritual: false,
    description: {
      fr: 'Vous créez un son ou une image pour tromper les sens.',
      en: 'You create a sound or an image of an object.',
    },
    atHigherLevels: null,
    classes: ['bard', 'sorcerer', 'warlock', 'wizard'],
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
        // Slugs distincts pour éviter React duplicate keys ; on ne teste pas
        // l'unlock L3/L5 ici — seul le cantrip est dans `knownSpells.ancestry`.
        level3SpellId: 'hellish-rebuke-stub',
        level5SpellId: 'darkness-stub',
      },
    ],
  },
};

const ELF_ANCESTRY: Ancestry = {
  id: 'elf',
  name: { fr: 'Elfe', en: 'Elf' },
  size: 'medium',
  speed: 30,
  description: { fr: '', en: '' },
  abilityScoreIncrease: [],
  traits: [],
  languages: ['common'],
  source: 'srd-5.2.1',
  options: {
    elfLineages: [
      {
        id: 'drow',
        name: { fr: 'Drow', en: 'Drow' },
        benefit: { fr: '', en: '' },
        cantripSpellId: 'lumieres-dansantes',
        level3SpellId: 'lueurs-stub',
        level5SpellId: 'tenebres-stub',
      },
    ],
  },
};

const GNOME_ANCESTRY: Ancestry = {
  id: 'gnome',
  name: { fr: 'Gnome', en: 'Gnome' },
  size: 'small',
  speed: 30,
  description: { fr: '', en: '' },
  abilityScoreIncrease: [],
  traits: [],
  languages: ['common'],
  source: 'srd-5.2.1',
  options: {
    gnomeLineages: [
      {
        id: 'forest',
        name: { fr: 'Forêts', en: 'Forest' },
        benefit: { fr: '', en: '' },
        cantripSpellIds: ['illusion-mineure'],
      },
    ],
  },
};

// Catalogue de classes du mock : WARLOCK_CLASS exposé pour résoudre le label
// « Sorcier » dans le scénario D13e (Pacte du grimoire). Les autres persos de
// ce fichier (Tieffelin/Elfe/Gnome roublard) n'ont pas de classe lanceuse
// dans le catalogue → leur résolution `spellcastingClasses(...)` reste [].
const WARLOCK_CLASS: ClassEntity = {
  id: 'warlock',
  name: { fr: 'Occultiste', en: 'Warlock' },
  hitDie: 'd8',
  primaryAbility: ['cha'],
  saveProficiencies: ['sag', 'cha'],
  armorProficiencies: [],
  weaponProficiencies: [],
  toolProficiencies: [],
  skillChoices: { count: 2, from: ['arcana'] },
  spellcasting: { ability: 'cha', progression: 'pact' },
  startingEquipment: { options: [{ items: [], coins: null }] },
  description: { fr: '', en: '' },
  features: [],
  weaponMasteryCount: 0,
  source: 'srd-5.2.1',
} as unknown as ClassEntity;

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'spells') return { data: SPELLS_FIXTURE, isLoading: false, error: null };
    if (type === 'ancestries')
      return {
        data: [TIEFLING_ANCESTRY, ELF_ANCESTRY, GNOME_ANCESTRY],
        isLoading: false,
        error: null,
      };
    if (type === 'classes') return { data: [WARLOCK_CLASS], isLoading: false, error: null };
    return { data: [], isLoading: false, error: null };
  },
}));

// `useUpdateCharacter` touche Firebase au runtime. Stub safe (le bouton Lancer
// est désactivé pour les sorts d'ascendance pure, donc jamais appelé).
vi.mock('@/features/sheet/use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: vi.fn().mockResolvedValue(undefined),
    isUpdating: false,
    error: null,
  }),
}));

// `useDice` agrège des hooks Zustand + roll engine. Stub no-op pour éviter
// d'embarquer la machinerie de dés dans un test ciblé sur l'ouverture modale.
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

function rogueL1(): Character {
  return {
    id: 'test',
    name: 'Test',
    status: 'alive',
    classes: [
      {
        classId: 'rogue',
        subclassId: null,
        level: 1,
        clericDivineOrder: null,
        druidPrimalOrder: null,
        fighterFightingStyle: null,
        weaponMasteries: [],
        expertiseSkills: [],
        eldritchInvocations: [],
        wizardSpellbookL1: [],
      },
    ],
    totalLevel: 1,
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
    hitDice: [{ classId: 'rogue', current: 1, max: 1, die: 'd8' }],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    spellSlots: {},
    preparedSpells: {},
    knownSpells: { ancestry: ['fire-bolt'] },
    spellcastingAbility: { ancestry: 'cha' },
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

function tieflingRogue(): Character {
  return rogueL1();
}

function elfDrowRogue(): Character {
  const c = rogueL1();
  c.ancestryId = 'elf';
  c.ancestrySubChoices = {
    ...c.ancestrySubChoices,
    tieflingLegacy: null,
    elfLineage: 'drow',
  };
  c.knownSpells = { ancestry: ['lumieres-dansantes'] };
  return c;
}

function gnomeForestRogue(): Character {
  const c = rogueL1();
  c.ancestryId = 'gnome';
  c.ancestrySubChoices = {
    ...c.ancestrySubChoices,
    tieflingLegacy: null,
    gnomeLineage: 'forest',
  };
  c.knownSpells = { ancestry: ['illusion-mineure'] };
  return c;
}

/**
 * Helper : clique le bouton de la `AncestrySpellsCard` (titre par ascendance)
 * pour ouvrir la modale détail.
 */
function clickAncestrySpell(spellName: string): void {
  // Plusieurs `<button>` peuvent matcher le nom (carte de lignage + ligne
  // dans la SpellList) — on prend le PREMIER, qui est la carte de lignage
  // (rendue avant la SpellList dans MagieMode).
  const buttons = screen.getAllByRole('button', { name: spellName });
  fireEvent.click(buttons[0]!);
}

describe('<MagieMode> — sort d\'ascendance ouvre la modale détail (non-caster)', () => {
  it('Tieffelin Infernal Roublard L1 → clic sur Trait de feu ouvre la modale + Lancer désactivé avec hint', () => {
    render(<MagieMode character={tieflingRogue()} />);
    clickAncestrySpell('Trait de feu');

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // Nom du sort dans le heading.
    expect(within(dialog).getByRole('heading', { name: 'Trait de feu' })).toBeInTheDocument();
    // Description visible.
    expect(within(dialog).getByText(/bille de feu/i)).toBeInTheDocument();
    // Bouton "Lancer" désactivé avec hint title.
    const launchBtn = within(dialog).getByRole('button', { name: /Lancer/ });
    expect(launchBtn).toBeDisabled();
    expect(launchBtn).toHaveAttribute(
      'title',
      "Lancement des sorts d'ascendance pas encore implémenté.",
    );
  });

  it('Elfe Drow Roublard L1 → clic sur Lumières dansantes ouvre la modale + Lancer désactivé', () => {
    render(<MagieMode character={elfDrowRogue()} />);
    clickAncestrySpell('Lumières dansantes');

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Lumières dansantes' })).toBeInTheDocument();
    expect(within(dialog).getByText(/lumières scintillantes/i)).toBeInTheDocument();
    const launchBtn = within(dialog).getByRole('button', { name: /Lancer/ });
    expect(launchBtn).toBeDisabled();
    expect(launchBtn).toHaveAttribute(
      'title',
      "Lancement des sorts d'ascendance pas encore implémenté.",
    );
  });

  it('Gnome Forêt Roublard L1 → clic sur Illusion mineure ouvre la modale + Lancer désactivé', () => {
    render(<MagieMode character={gnomeForestRogue()} />);
    clickAncestrySpell('Illusion mineure');

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Illusion mineure' })).toBeInTheDocument();
    expect(within(dialog).getByText(/son ou une image/i)).toBeInTheDocument();
    const launchBtn = within(dialog).getByRole('button', { name: /Lancer/ });
    expect(launchBtn).toBeDisabled();
    expect(launchBtn).toHaveAttribute(
      'title',
      "Lancement des sorts d'ascendance pas encore implémenté.",
    );
  });
});

describe('<MagieMode> — D13e-followup-grant-display : Pacte du grimoire', () => {
  function warlockL1WithPactTome(): Character {
    return {
      id: 'test-warlock',
      name: 'Test Warlock',
      status: 'alive',
      classes: [
        {
          classId: 'warlock',
          subclassId: null,
          level: 1,
          clericDivineOrder: null,
          druidPrimalOrder: null,
          fighterFightingStyle: null,
          weaponMasteries: [],
          expertiseSkills: [],
          eldritchInvocations: ['pact-of-the-tome'],
          wizardSpellbookL1: [],
          pactTomeCantrips: ['illusion-mineure'],
          pactTomeRituals: [],
        },
      ],
      totalLevel: 1,
      primaryClassId: 'warlock',
      ancestryId: 'human',
      ancestrySubChoices: {
        dragonAncestry: null,
        tieflingLegacy: null,
        elfLineage: null,
        gnomeLineage: null,
        goliathAncestry: null,
        ancestryCastingAbility: null,
        ancestryExtraSkill: null,
        ancestrySize: 'medium',
      },
      backgroundId: 'sage',
      extraLanguages: [],
      experience: 0,
      alignment: 'NB',
      abilities: { for: 10, dex: 12, con: 12, int: 10, sag: 10, cha: 16 },
      saves: { for: false, dex: false, con: false, int: false, sag: true, cha: true },
      skills: {},
      hp: { current: 8, max: 8, temp: 0 },
      ac: 11,
      speed: 30,
      initiative: 1,
      hitDice: [{ classId: 'warlock', current: 1, max: 1, die: 'd8' }],
      deathSaves: { success: 0, fail: 0 },
      conditions: [],
      inspiration: false,
      exhaustion: 0,
      currentConcentration: null,
      classResources: {},
      spellSlots: { '1': { current: 1, max: 1 } },
      preparedSpells: {},
      knownSpells: { warlock: [] },
      spellcastingAbility: { warlock: 'cha' },
      inventory: { items: [], coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 }, weightCache: 0 },
      personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
      featureUsage: {},
      extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
      presentInCampaigns: [],
      homeCampaignId: null,
      stats: { totalRolls: 0, totalD20Sum: 0, crits: 0, fumbles: 0, skillUses: {} },
      portrait: { type: 'letter', value: 'W' },
      schemaVersion: 2,
      createdAt: null as never,
      updatedAt: null as never,
      updatedBy: 'test-uid',
    };
  }

  it('Sorcier L1 avec Pacte du grimoire → Illusion mineure rendue avec chip « Pacte du grimoire » dans la SpellList', () => {
    render(<MagieMode character={warlockL1WithPactTome()} />);
    // Le sort granté apparaît bien dans la liste (passe par knownSet via la
    // map pactTomeSourceLabels calculée dans MagieMode).
    expect(screen.getByText('Illusion mineure')).toBeInTheDocument();
    // Le chip dédié est visible.
    expect(screen.getByText('Pacte du grimoire')).toBeInTheDocument();
  });

  it('Sorcier L1 avec Pacte du grimoire → tap sur le sort ouvre la modale avec chip « Pacte du grimoire » dans l\'en-tête', () => {
    render(<MagieMode character={warlockL1WithPactTome()} />);
    // L'élément `<div>` interne contient le nom ; on remonte au `<button>`
    // parent (l'aria-label n'est pas posé sur la ligne SpellList).
    const nameNode = screen.getByText('Illusion mineure');
    const button = nameNode.closest('button');
    if (!button) throw new Error('Pas de <button> parent pour Illusion mineure');
    fireEvent.click(button);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Illusion mineure' })).toBeInTheDocument();
    // Chip Pacte du grimoire visible dans l'en-tête de la modale.
    expect(within(dialog).getByText('Pacte du grimoire')).toBeInTheDocument();
  });
});
