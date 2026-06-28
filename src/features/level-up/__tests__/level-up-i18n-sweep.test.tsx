import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useLocaleStore } from '@/shared/lib/slices/locale-slice';
import type { Character } from '@/shared/types/character';
import type { ClassEntity, Subclass } from '@/shared/types/content';

/**
 * Garde-fou « rouge avant vert » de la passe i18n de la modale de montée de
 * niveau / ajout de classe (`level-up-modal.tsx` + `add-class-steps.tsx`).
 *
 * Avant le fix, ces deux composants portaient toutes leurs chaînes FR codées en
 * dur (titres d'étape, helpers, libellés de don, sous-choix L1). Rendus en
 * locale EN, le FR fuyait et les assertions anglaises ci-dessous échouaient.
 * Après bascule sur `t()`, l'anglais sort correctement et le FR n'apparaît plus.
 *
 * Vérifié empiriquement rouge avant vert : `git stash` des deux composants →
 * ce fichier échoue (les `getByText` EN ne trouvent rien, le FR codé en dur
 * reste), `git stash pop` → vert.
 */

const championSubclass: Subclass = {
  id: 'champion',
  classId: 'fighter',
  name: { fr: 'Champion', en: 'Champion' },
  description: { fr: 'Combattant pur.', en: 'Pure fighter.' },
  features: [],
  source: 'srd-5.2.1',
};

function makeClass(overrides: Partial<ClassEntity> & Pick<ClassEntity, 'id' | 'name'>): ClassEntity {
  return {
    description: { fr: '', en: '' },
    hitDie: 'd8',
    primaryAbility: ['for'],
    saveProficiencies: ['for', 'con'],
    skillChoices: { count: 2, from: ['athletisme'] },
    armorProficiencies: ['light'],
    weaponProficiencies: ['simple'],
    toolProficiencies: [],
    spellcasting: null,
    startingEquipment: { options: [{ items: [], coins: null }] },
    features: [],
    weaponMasteryCount: 0,
    source: 'srd-5.2.1',
    ...overrides,
  } as ClassEntity;
}

const fighterClass = makeClass({
  id: 'fighter',
  name: { fr: 'Guerrier', en: 'Fighter' },
  hitDie: 'd10',
  weaponMasteryCount: 3,
  // ASI standard au L4 → la modale ajoute l'étape « asi-or-feat » (2 étapes).
  features: [
    {
      level: 4,
      name: { fr: 'Amélioration de caractéristique', en: 'Ability Score Improvement' },
      description: { fr: '', en: '' },
    },
  ],
});

// Cleric sans prérequis de multiclasse → toujours éligible dans le picker, avec
// un sous-choix L1 « Ordre divin » pour exercer add-class-steps.tsx.
const clericClass = makeClass({
  id: 'cleric',
  name: { fr: 'Clerc', en: 'Cleric' },
  multiclassPrerequisite: null,
  divineOrders: [
    {
      id: 'protector',
      name: { fr: 'Protecteur', en: 'Protector' },
      summary: { fr: 'Voie martiale.', en: 'Martial path.' },
    },
    {
      id: 'thaumaturge',
      name: { fr: 'Thaumaturge', en: 'Thaumaturge' },
      summary: { fr: 'Voie magique.', en: 'Magical path.' },
    },
  ],
} as Partial<ClassEntity> & Pick<ClassEntity, 'id' | 'name'>);

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'subclasses') {
      return { data: [championSubclass], loading: false, error: null };
    }
    if (type === 'feats') {
      return {
        data: [
          {
            id: 'don-libre',
            name: { fr: 'Don libre', en: 'Free Feat' },
            category: 'general',
          },
        ],
        loading: false,
        error: null,
      };
    }
    if (type === 'classes') {
      return { data: [fighterClass, clericClass], loading: false, error: null };
    }
    // spells, invocations, items
    return { data: [], loading: false, error: null };
  },
}));

import { LevelUpModal } from '../level-up-modal';

function makeFighter(level: number): Character {
  return {
    id: 'test-pj',
    name: 'Garreth',
    status: 'alive',
    classes: [
      {
        classId: 'fighter',
        subclassId: null,
        level,
        clericDivineOrder: null,
        druidPrimalOrder: null,
        fighterFightingStyle: 'defense',
        weaponMasteries: [],
        expertiseSkills: [],
        eldritchInvocations: [],
        wizardSpellbookL1: [],
      },
    ],
    totalLevel: level,
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
    alignment: 'LN',
    // Stats hautes → aucun blocage d'éligibilité de multiclasse dans le picker.
    abilities: { for: 16, dex: 16, con: 16, int: 16, sag: 16, cha: 16 },
    saves: { for: true, dex: false, con: true, int: false, sag: false, cha: false },
    skills: {},
    hp: { current: 12, max: 12, temp: 0 },
    ac: 16,
    speed: 30,
    initiative: 1,
    hitDice: [{ classId: 'fighter', current: level, max: level, die: 'd10' }],
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
    portrait: { type: 'letter', value: 'G' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'test-uid',
  };
}

afterEach(() => {
  useLocaleStore.setState({ locale: 'fr' });
});

describe('LevelUpModal — passe i18n (rouge avant vert)', () => {
  it('mode montée de niveau : rend l’EN, aucune fuite FR', () => {
    useLocaleStore.setState({ locale: 'en' });
    render(
      <LevelUpModal
        open
        onClose={() => {}}
        character={makeFighter(3)}
        classDefinition={fighterClass}
        onConfirm={() => {}}
      />,
    );

    // En-tête + indicateur d'étape + première étape (PV) en anglais.
    expect(screen.getByText('Level up')).toBeInTheDocument();
    expect(screen.getByText('Fighter — Level 3 → 4')).toBeInTheDocument();
    expect(screen.getByText('Step 1 / 2')).toBeInTheDocument();
    expect(screen.getByText('Hit points')).toBeInTheDocument();
    expect(screen.getByText('Average')).toBeInTheDocument();
    expect(screen.getByText('Roll the die')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();

    // Aucune fuite des chaînes FR codées en dur d'avant la passe.
    expect(screen.queryByText('Montée de niveau')).not.toBeInTheDocument();
    expect(screen.queryByText('Points de vie')).not.toBeInTheDocument();
    expect(screen.queryByText('Moyenne')).not.toBeInTheDocument();
    expect(screen.queryByText('Lancer le dé')).not.toBeInTheDocument();

    // Navigation → étape Amélioration/Don en anglais.
    fireEvent.click(screen.getByRole('button', { name: /average/i }));
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    expect(
      screen.getByText('Ability score improvement or feat'),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^improvement$/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^feat$/i })).toBeInTheDocument();
    expect(
      screen.queryByText('Amélioration de caractéristique ou don'),
    ).not.toBeInTheDocument();
  });

  it('mode ajout de classe : picker + sous-choix L1 en EN', () => {
    useLocaleStore.setState({ locale: 'en' });
    render(
      <LevelUpModal
        open
        onClose={() => {}}
        character={makeFighter(3)}
        classDefinition={fighterClass}
        onConfirm={() => {}}
        initialMode="add-class"
      />,
    );

    // Picker (AddClassPickerStep).
    expect(screen.getByText('Add a class')).toBeInTheDocument();
    expect(screen.getByText('Choose your new class')).toBeInTheDocument();
    expect(screen.getByText('Class to add')).toBeInTheDocument();
    expect(
      screen.getByText(/Greyed-out classes are unavailable/i),
    ).toBeInTheDocument();
    expect(screen.queryByText('Ajouter une classe')).not.toBeInTheDocument();
    expect(screen.queryByText('Classe à ajouter')).not.toBeInTheDocument();

    // Sélection Cleric → sous-choix L1 (AddClassSubChoicesStep) en EN.
    fireEvent.click(screen.getByRole('radio', { name: /cleric/i }));
    expect(screen.getByText('Cleric — Level 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    expect(screen.getByText('Level 1 sub-choices — Cleric')).toBeInTheDocument();
    expect(screen.getByText('Divine order')).toBeInTheDocument();
    expect(screen.queryByText('Ordre divin')).not.toBeInTheDocument();
  });
});
