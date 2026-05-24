import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { ClassEntity, Spell } from '@/shared/types/content';

import { SpellList } from '../spell-list';

/**
 * Plan 13.8b commit 1 — la `SpellList` se rend pour un non-caster dès que
 * `knownSpells.ancestry` est non vide, et distingue visuellement la source
 * du sort (chip ascendance améthyste vs chip classe doré). Cas collision :
 * un sort connu à la fois par la classe ET par l'ascendance → UNE seule ligne
 * avec les deux chips.
 *
 * Pourquoi un test scoping par ligne (`within(row)`) : c'est précisément le
 * trou UAT 13.8 — un sort de lignage noyé dans la liste sans signal visuel
 * était indistinguable d'un cantrip de classe. Le test exige que le chip
 * source ascendance n'apparaisse que sur la bonne ligne.
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
    description: { fr: '', en: '' },
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
    description: { fr: '', en: '' },
    atHigherLevels: null,
    classes: ['bard', 'sorcerer', 'warlock', 'wizard'],
    source: 'srd-5.2.1',
  },
  {
    id: 'thaumaturgie',
    name: { fr: 'Thaumaturgie', en: 'Thaumaturgy' },
    level: 0,
    school: 'transmutation',
    castingTime: { fr: '1 action', en: '1 Action' },
    range: { fr: '9 m', en: '30 ft' },
    components: { v: true, s: false, m: false },
    duration: { fr: '1 minute', en: '1 Minute' },
    concentration: false,
    ritual: false,
    description: { fr: '', en: '' },
    atHigherLevels: null,
    classes: ['cleric'],
    source: 'srd-5.2.1',
  },
];

const WIZARD_CLASS: ClassEntity = {
  id: 'wizard',
  name: { fr: 'Magicien', en: 'Wizard' },
  hitDie: 'd6',
  primaryAbility: ['int'],
  saveProficiencies: ['int', 'sag'],
  armorProficiencies: [],
  weaponProficiencies: [],
  toolProficiencies: [],
  skillChoices: { count: 2, from: ['arcana'] },
  spellcasting: { ability: 'int', progression: 'full' },
  startingEquipment: { options: [{ items: [], coins: null }] },
  description: { fr: '', en: '' },
  features: [],
  weaponMasteryCount: 0,
  source: 'srd-5.2.1',
} as unknown as ClassEntity;

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'classes') return { data: [WIZARD_CLASS], isLoading: false, error: null };
    return { data: [], isLoading: false, error: null };
  },
}));

function baseCharacter(): Character {
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
    knownSpells: { ancestry: [] },
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

function tieflingNonCaster(): Character {
  const c = baseCharacter();
  c.knownSpells = { ancestry: ['fire-bolt'] };
  return c;
}

/**
 * Tieffelin avec DEUX sources d'ascendance distinctes dans la même liste :
 * thaumaturgie (trait commun « Présence d'outre-monde ») + fire-bolt (héritage
 * Infernal). Sert à prouver que le label est PAR SORT — thaumaturgie ne doit
 * jamais hériter du label « Héritage Infernal » (le mislabel d'avant 13.14b).
 */
function tieflingCommonAndHeritage(): Character {
  const c = baseCharacter();
  c.knownSpells = { ancestry: ['thaumaturgie', 'fire-bolt'] };
  return c;
}

function gnomeForestNonCaster(): Character {
  const c = baseCharacter();
  c.ancestryId = 'gnome';
  c.ancestrySubChoices = {
    ...c.ancestrySubChoices,
    tieflingLegacy: null,
    gnomeLineage: 'forest',
  };
  c.knownSpells = { ancestry: ['illusion-mineure'] };
  return c;
}

function wizardL1ElfDrow(): Character {
  const c = baseCharacter();
  c.classes = [
    {
      classId: 'wizard',
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
  ];
  c.primaryClassId = 'wizard';
  c.ancestryId = 'elf';
  c.ancestrySubChoices = {
    ...c.ancestrySubChoices,
    tieflingLegacy: null,
    elfLineage: 'drow',
  };
  // Wizard cantrip = fire-bolt ; ancestry cantrip = lumieres-dansantes.
  c.knownSpells = { wizard: ['fire-bolt'], ancestry: ['lumieres-dansantes'] };
  c.spellcastingAbility = { wizard: 'int', ancestry: 'int' };
  return c;
}

function wizardL1ElfDrowCollision(): Character {
  const c = wizardL1ElfDrow();
  // Cas collision : Lumières dansantes apparaît à la fois côté classe (Magicien)
  // et côté ascendance (Lignage Drow).
  c.knownSpells = {
    wizard: ['lumieres-dansantes'],
    ancestry: ['lumieres-dansantes'],
  };
  return c;
}

/**
 * Retourne la ligne (button row) qui contient le texte de nom de sort donné.
 * Sert à scoper `within(row)` pour assert proprement la présence des chips
 * uniquement sur la bonne ligne — exactement ce qui ferme le trou UAT 13.8.
 */
function spellRowByName(name: string): HTMLElement {
  // `getByText` retourne le `<div>` interne ; on remonte au `<button>` parent.
  const nameNode = screen.getByText(name);
  const button = nameNode.closest('button');
  if (!button) throw new Error(`Pas de ligne <button> pour le sort "${name}"`);
  return button;
}

describe('<SpellList> — non-caster avec sorts d\'ascendance', () => {
  it('Gnome Forêt non-caster (Roublard L1) → la liste est rendue avec Illusion mineure + chip « Lignage Gnome des forêts »', () => {
    const onSpellSelect = vi.fn();
    render(
      <SpellList
        character={gnomeForestNonCaster()}
        spells={SPELLS_FIXTURE}
        spellcasterClassIds={[]}
        ancestrySourceLabels={new Map([['illusion-mineure', 'Lignage Gnome des forêts']])}
        onSpellSelect={onSpellSelect}
      />,
    );
    // Sort présent.
    expect(screen.getByText('Illusion mineure')).toBeInTheDocument();
    // Chip source visible dans la ligne.
    const row = spellRowByName('Illusion mineure');
    expect(within(row).getByText('Lignage Gnome des forêts')).toBeInTheDocument();
    // Le filtre "Préparés" n'est PAS rendu (non-pertinent pour un non-caster).
    expect(screen.queryByText(/Préparés/)).not.toBeInTheDocument();
  });

  it("Tieffelin Infernal non-caster (Roublard L1) → Trait de feu + chip « Héritage Infernal », clic appelle onSpellSelect", () => {
    const onSpellSelect = vi.fn();
    render(
      <SpellList
        character={tieflingNonCaster()}
        spells={SPELLS_FIXTURE}
        spellcasterClassIds={[]}
        ancestrySourceLabels={new Map([['fire-bolt', 'Héritage Infernal']])}
        onSpellSelect={onSpellSelect}
      />,
    );
    const row = spellRowByName('Trait de feu');
    expect(within(row).getByText('Héritage Infernal')).toBeInTheDocument();
    fireEvent.click(row);
    expect(onSpellSelect).toHaveBeenCalledTimes(1);
    expect(onSpellSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'fire-bolt' }),
    );
  });

  it("Plan 13.14b — label PAR SORT : thaumaturgie porte « Présence d’outre-monde », fire-bolt « Héritage Infernal » (pas de mislabel global)", () => {
    render(
      <SpellList
        character={tieflingCommonAndHeritage()}
        spells={SPELLS_FIXTURE}
        spellcasterClassIds={[]}
        ancestrySourceLabels={
          new Map([
            ['thaumaturgie', 'Présence d’outre-monde'],
            ['fire-bolt', 'Héritage Infernal'],
          ])
        }
        onSpellSelect={vi.fn()}
      />,
    );

    const thaumaRow = spellRowByName('Thaumaturgie');
    expect(within(thaumaRow).getByText('Présence d’outre-monde')).toBeInTheDocument();
    // Garde anti-mislabel : thaumaturgie ne porte PAS le label d'héritage.
    expect(within(thaumaRow).queryByText('Héritage Infernal')).not.toBeInTheDocument();

    const fireBoltRow = spellRowByName('Trait de feu');
    expect(within(fireBoltRow).getByText('Héritage Infernal')).toBeInTheDocument();
    expect(within(fireBoltRow).queryByText('Présence d’outre-monde')).not.toBeInTheDocument();
  });
});

describe('<SpellList> — caster × ascendance (cohabitation lisible)', () => {
  it("Magicien L1 Elfe Drow → Trait de feu a chip « Magicien » uniquement ; Lumières dansantes a chip « Lignage Drow » uniquement", () => {
    render(
      <SpellList
        character={wizardL1ElfDrow()}
        spells={SPELLS_FIXTURE}
        spellcasterClassIds={['wizard']}
        ancestrySourceLabels={new Map([['lumieres-dansantes', 'Lignage Drow']])}
        onSpellSelect={vi.fn()}
      />,
    );

    // Les deux sorts sont dans la liste.
    expect(screen.getByText('Trait de feu')).toBeInTheDocument();
    expect(screen.getByText('Lumières dansantes')).toBeInTheDocument();

    // Le chip "Magicien" est sur la ligne Trait de feu.
    const fireBoltRow = spellRowByName('Trait de feu');
    expect(within(fireBoltRow).getByText('Magicien')).toBeInTheDocument();
    // …et PAS sur la ligne Lumières dansantes (distinction visuelle).
    const dancingLightsRow = spellRowByName('Lumières dansantes');
    expect(within(dancingLightsRow).queryByText('Magicien')).not.toBeInTheDocument();

    // Le chip "Lignage Drow" est sur la ligne Lumières dansantes.
    expect(within(dancingLightsRow).getByText('Lignage Drow')).toBeInTheDocument();
    // …et PAS sur la ligne Trait de feu.
    expect(within(fireBoltRow).queryByText('Lignage Drow')).not.toBeInTheDocument();
  });

  it("Collision (même sort en classe ET ascendance) → UNE seule ligne avec les DEUX chips", () => {
    const onSpellSelect = vi.fn();
    render(
      <SpellList
        character={wizardL1ElfDrowCollision()}
        spells={SPELLS_FIXTURE}
        spellcasterClassIds={['wizard']}
        ancestrySourceLabels={new Map([['lumieres-dansantes', 'Lignage Drow']])}
        onSpellSelect={onSpellSelect}
      />,
    );

    // Une seule occurrence du nom (pas de doublon de ligne).
    expect(screen.getAllByText('Lumières dansantes')).toHaveLength(1);

    // La ligne unique contient les DEUX chips (composite).
    const row = spellRowByName('Lumières dansantes');
    expect(within(row).getByText('Magicien')).toBeInTheDocument();
    expect(within(row).getByText('Lignage Drow')).toBeInTheDocument();

    // Clic appelle onSpellSelect une fois.
    fireEvent.click(row);
    expect(onSpellSelect).toHaveBeenCalledTimes(1);
    expect(onSpellSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lumieres-dansantes' }),
    );
  });
});
