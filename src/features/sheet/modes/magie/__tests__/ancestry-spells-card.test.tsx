import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { Ancestry, Spell } from '@/shared/types/content';

import { expectIdentityRender } from '../../../../../../tests/helpers/content-truth';
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
  // Plan 13.14b (D18) — trait commun Tieffelin « Présence d'outre-monde ».
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
  // Plan 13.14b (D18) — sort de lignage Gnome des forêts (forest only).
  {
    id: 'communication-avec-les-animaux',
    name: { fr: 'Communication avec les animaux', en: 'Speak with Animals' },
    level: 1,
    school: 'divination',
    castingTime: { fr: '1 action', en: '1 Action' },
    range: { fr: 'Personnelle', en: 'Self' },
    components: { v: true, s: true, m: false },
    duration: { fr: '10 minutes', en: '10 Minutes' },
    concentration: false,
    ritual: true,
    description: { fr: '', en: '' },
    atHigherLevels: null,
    classes: ['bard', 'druid', 'ranger', 'warlock'],
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
  // Trait commun aux 3 héritages (« Présence d'outre-monde ») — pas un sous-choix.
  commonSpellIds: ['thaumaturgie'],
};

/**
 * Stubs minimaux d'Elfe (Drow) et Gnome (Forêt) pour vérifier `onSpellSelect`
 * sur les 3 ascendances à sorts. Volontairement co-localisés au test : on ne
 * lit pas `public/data/ancestries.json` (cf. CLAUDE.md > Tester le runtime).
 */
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
        benefit: { fr: 'Vision dans le noir étendue.', en: 'Extended darkvision.' },
        cantripSpellId: 'lumieres-dansantes',
        // Slugs stub distincts pour éviter React duplicate keys ; le test
        // n'asserte que le cantrip — knownSpells.ancestry ne contient que lui.
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
        // Nom officiel du bundle (« Gnome des forêts ») — le label de source
        // de la carte en dérive (« Lignage Gnome des forêts »).
        name: { fr: 'Gnome des forêts', en: 'Forest Gnome' },
        benefit: { fr: 'Rituel sans slot.', en: 'Ritual without slot.' },
        cantripSpellIds: ['illusion-mineure'],
        // Sort de trait spécifique au lignage forêts (forest only).
        spellIds: ['communication-avec-les-animaux'],
      },
    ],
  },
};

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'spells') return { data: SPELLS_FIXTURE, isLoading: false, error: null };
    if (type === 'ancestries')
      return {
        data: [TIEFLING_ANCESTRY, ELF_ANCESTRY, GNOME_ANCESTRY],
        isLoading: false,
        error: null,
      };
    return { data: [], isLoading: false, error: null };
  },
}));

function elfDrowChar(level = 1, ancestrySpellIds: string[] = ['lumieres-dansantes']): Character {
  const base = tieflingChar(level);
  return {
    ...base,
    ancestryId: 'elf',
    ancestrySubChoices: {
      ...base.ancestrySubChoices,
      tieflingLegacy: null,
      elfLineage: 'drow',
    },
    knownSpells: { ancestry: ancestrySpellIds },
    spellcastingAbility: { ancestry: 'int' },
  };
}

function gnomeForestChar(level = 1): Character {
  const base = tieflingChar(level);
  return {
    ...base,
    ancestryId: 'gnome',
    ancestrySubChoices: {
      ...base.ancestrySubChoices,
      tieflingLegacy: null,
      gnomeLineage: 'forest',
    },
    knownSpells: { ancestry: ['illusion-mineure', 'communication-avec-les-animaux'] },
    spellcastingAbility: { ancestry: 'int' },
  };
}

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
    knownSpells: { ancestry: ['thaumaturgie', 'fire-bolt', 'hellish-rebuke', 'darkness'] },
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
    const { container } = render(<AncestrySpellsCard character={character} onSpellSelect={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('Tieffelin Infernal L1 → 4 sorts listés (thaumaturgie commune + triplet) + 2 L3/L5 grisés', () => {
    render(<AncestrySpellsCard character={tieflingChar(1)} onSpellSelect={() => {}} />);
    // Trait commun « Présence d'outre-monde » (D18, plan 13.14b) en plus du triplet.
    expect(screen.getByText('Thaumaturgie')).toBeInTheDocument();
    expect(screen.getByText('Trait de feu')).toBeInTheDocument();
    expect(screen.getByText('Châtiment infernal')).toBeInTheDocument();
    expect(screen.getByText('Ténèbres')).toBeInTheDocument();
    expect(screen.getByText('Niv. 3')).toBeInTheDocument();
    expect(screen.getByText('Niv. 5')).toBeInTheDocument();
  });

  it('Tieffelin Infernal L3 → seul Ténèbres (L5) reste grisé', () => {
    render(<AncestrySpellsCard character={tieflingChar(3)} onSpellSelect={() => {}} />);
    expect(screen.getByText('Niv. 5')).toBeInTheDocument();
    expect(screen.queryByText('Niv. 3')).not.toBeInTheDocument();
  });

  it('Tieffelin Infernal L5 → aucun verrou', () => {
    render(<AncestrySpellsCard character={tieflingChar(5)} onSpellSelect={() => {}} />);
    expect(screen.queryByText(/Niv\./)).not.toBeInTheDocument();
  });

  it("affiche la caractéristique d'incantation lue depuis spellcastingAbility.ancestry", () => {
    render(<AncestrySpellsCard character={tieflingChar(1)} onSpellSelect={() => {}} />);
    expect(screen.getByText(/Caract\. d'incantation/)).toBeInTheDocument();
    expect(screen.getByText(/Charisme/)).toBeInTheDocument();
  });

  it('affiche le titre Tieffelin', () => {
    render(<AncestrySpellsCard character={tieflingChar(1)} onSpellSelect={() => {}} />);
    expect(screen.getByText("Sorts d'héritage fiélon")).toBeInTheDocument();
  });

  it('affiche le label source par sort (« Héritage Infernal ») pour le triplet d’héritage', () => {
    render(<AncestrySpellsCard character={tieflingChar(3)} onSpellSelect={() => {}} />);
    // 3 entries du triplet → 3 occurrences du label d'héritage. Thaumaturgie
    // (trait commun) porte un AUTRE label → toujours exactement 3 ici.
    expect(screen.getAllByText('Héritage Infernal').length).toBe(3);
  });

  // ─────────────────────────────────────────────────────────────────────
  // Plan 13.14b (D18) — cat. 2 « contenu affiché = contenu attendu » :
  // les 2 sorts de trait injectés rendent avec leur NOM exact ET leur label
  // de source CORRECT (pas le mislabel « Héritage X »).
  // ─────────────────────────────────────────────────────────────────────

  it("Tieffelin : thaumaturgie rend avec le nom exact + source « Présence d’outre-monde » (pas « Héritage Infernal »)", () => {
    render(<AncestrySpellsCard character={tieflingChar(1)} onSpellSelect={() => {}} />);
    const row = screen.getByRole('button', { name: 'Thaumaturgie' });
    expectIdentityRender({
      slug: 'thaumaturgie',
      fields: [
        {
          label: 'name',
          expected: 'Thaumaturgie',
          rendered: within(row).getByText('Thaumaturgie').textContent ?? '',
        },
        {
          label: 'source',
          expected: 'Présence d’outre-monde',
          rendered: within(row).getByText('Présence d’outre-monde').textContent ?? '',
        },
      ],
    });
    // Garde anti-mislabel : thaumaturgie ne porte JAMAIS le label d'héritage.
    expect(within(row).queryByText('Héritage Infernal')).not.toBeInTheDocument();
  });

  it("Gnome des forêts : communication-avec-les-animaux rend avec le nom exact + source « Lignage Gnome des forêts »", () => {
    render(<AncestrySpellsCard character={gnomeForestChar(1)} onSpellSelect={() => {}} />);
    const row = screen.getByRole('button', { name: 'Communication avec les animaux' });
    expectIdentityRender({
      slug: 'communication-avec-les-animaux',
      fields: [
        {
          label: 'name',
          expected: 'Communication avec les animaux',
          rendered: within(row).getByText('Communication avec les animaux').textContent ?? '',
        },
        {
          label: 'source',
          expected: 'Lignage Gnome des forêts',
          rendered: within(row).getByText('Lignage Gnome des forêts').textContent ?? '',
        },
      ],
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // Plan 13.8b commit 1 — clic sur un sort d'ascendance ouvre la modale
  // (callback `onSpellSelect` appelée avec le Spell exact).
  // ─────────────────────────────────────────────────────────────────────

  it("Tieffelin Infernal L1 → clic sur Trait de feu (cantrip) appelle onSpellSelect avec le sort", () => {
    const onSpellSelect = vi.fn();
    render(<AncestrySpellsCard character={tieflingChar(1)} onSpellSelect={onSpellSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Trait de feu' }));
    expect(onSpellSelect).toHaveBeenCalledTimes(1);
    expect(onSpellSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'fire-bolt' }),
    );
  });

  it("Tieffelin Infernal L1 → clic sur Châtiment infernal (L3 verrouillé) appelle quand même onSpellSelect", () => {
    // Décision Adrien 13.8b : un sort verrouillé reste consultable (la modale
    // documente le sort même si le perso ne peut pas encore le lancer).
    const onSpellSelect = vi.fn();
    render(<AncestrySpellsCard character={tieflingChar(1)} onSpellSelect={onSpellSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Châtiment infernal' }));
    expect(onSpellSelect).toHaveBeenCalledTimes(1);
    expect(onSpellSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'hellish-rebuke' }),
    );
  });

  it("Elfe Drow L1 → clic sur Lumières dansantes appelle onSpellSelect avec le sort", () => {
    const onSpellSelect = vi.fn();
    render(<AncestrySpellsCard character={elfDrowChar(1)} onSpellSelect={onSpellSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lumières dansantes' }));
    expect(onSpellSelect).toHaveBeenCalledTimes(1);
    expect(onSpellSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lumieres-dansantes' }),
    );
  });

  it("Gnome Forêt L1 → clic sur Illusion mineure appelle onSpellSelect avec le sort", () => {
    const onSpellSelect = vi.fn();
    render(<AncestrySpellsCard character={gnomeForestChar(1)} onSpellSelect={onSpellSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Illusion mineure' }));
    expect(onSpellSelect).toHaveBeenCalledTimes(1);
    expect(onSpellSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'illusion-mineure' }),
    );
  });
});
