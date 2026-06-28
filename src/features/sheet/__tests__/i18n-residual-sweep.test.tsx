import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useLocaleStore } from '@/shared/lib/slices/locale-slice';
import type { Character } from '@/shared/types/character';
import type { Spell } from '@/shared/types/content';

import { NumberPad } from '../modes/combat/number-pad';
import { SpellDamageCard } from '../modes/magie/spell-damage-card';
import type { SpellcastingClassEntry } from '../modes/magie/spell-slots';
import { SpellStatsBar } from '../modes/magie/spell-stats-bar';

import spellsBundle from '../../../../public/data/spells.json';

/**
 * Garde-fou « rouge avant vert » de la passe i18n résiduelle de la fiche :
 * trois composants feuilles (pavé numérique de PV, barre de stats d'incantation,
 * carte de dégâts de sort) portaient des chaînes FR codées en dur. Le test rend
 * chacun en EN et asserte le texte anglais : sur le code d'avant le fix, le FR
 * fuyait en EN et ces assertions échouaient. Couvre aussi la correction d'un
 * anglicisme (« cantrip » → « sort mineur », terme officiel FR).
 */

afterEach(() => {
  // La locale est un store Zustand global — on la remet à FR pour ne pas
  // polluer les autres tests qui supposent le défaut.
  useLocaleStore.setState({ locale: 'fr' });
});

function spellFromBundle(id: string): Spell {
  const found = (spellsBundle as Spell[]).find((s) => s.id === id);
  if (!found) throw new Error(`[i18n-residual] sort ${id} absent du bundle`);
  return found;
}

function makeCaster(): Character {
  return {
    id: 'lyralei',
    name: 'Lyralei',
    status: 'alive',
    classes: [
      {
        classId: 'wizard',
        subclassId: null,
        level: 5,
        clericDivineOrder: null,
        druidPrimalOrder: null,
        fighterFightingStyle: null,
        weaponMasteries: [],
        expertiseSkills: [],
        eldritchInvocations: [],
        wizardSpellbookL1: [],
      },
    ],
    totalLevel: 5,
    primaryClassId: 'wizard',
    ancestryId: 'elf',
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
    backgroundId: 'sage',
    extraLanguages: [],
    experience: 0,
    alignment: 'NB',
    abilities: { for: 8, dex: 14, con: 12, int: 16, sag: 12, cha: 10 },
    saves: { for: false, dex: false, con: false, int: true, sag: true, cha: false },
    skills: {},
    hp: { current: 22, max: 22, temp: 0 },
    ac: 12,
    speed: 9,
    initiative: 2,
    hitDice: [{ classId: 'wizard', current: 5, max: 5, die: 'd6' }],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    spellSlots: {
      '1': { current: 4, max: 4 },
      '2': { current: 3, max: 3 },
      '3': { current: 2, max: 2 },
    },
    preparedSpells: { wizard: [] },
    knownSpells: { wizard: [] },
    spellcastingAbility: { wizard: 'int' },
    inventory: { items: [], coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 }, weightCache: 0 },
    personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
    featureUsage: {},
    extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    presentInCampaigns: [],
    homeCampaignId: null,
    stats: { totalRolls: 0, totalD20Sum: 0, crits: 0, fumbles: 0, skillUses: {} },
    portrait: { type: 'letter', value: 'L' },
    schemaVersion: 2,
    createdAt: null,
    updatedAt: null,
    updatedBy: 'lyralei',
  };
}

const WIZARD_CASTER: SpellcastingClassEntry = {
  classId: 'wizard',
  level: 5,
  ability: 'int',
  progression: 'full',
  name: 'Magicien',
};

describe('Pavé numérique de PV — i18n', () => {
  it('FR : titre/commit/annuler localisés', () => {
    render(<NumberPad intent="damage" max={10} maxApplicable={10} onCommit={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Dégâts' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Appliquer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument();
  });

  it('EN : aucune fuite FR (titre/commit/annuler en anglais)', () => {
    useLocaleStore.setState({ locale: 'en' });
    render(<NumberPad intent="damage" max={10} maxApplicable={10} onCommit={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Damage' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('EN heal : bouton « Full ({max}) » interpolé', () => {
    useLocaleStore.setState({ locale: 'en' });
    render(<NumberPad intent="heal" max={10} maxApplicable={6} onCommit={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Heal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Full (10)' })).toBeInTheDocument();
  });
});

describe('Barre de stats d’incantation — i18n', () => {
  it('FR : libellés + préparation localisés', () => {
    render(<SpellStatsBar character={makeCaster()} spellcastingClasses={[WIZARD_CASTER]} />);
    // Wizard niv. 5, INT 16 (+3), PB 3 → DD 14, +att 6, prépa max(1, 3+5)=8.
    expect(screen.getByText('Caract.')).toBeInTheDocument();
    expect(screen.getByText('DD')).toBeInTheDocument();
    expect(screen.getByText('+ attaque')).toBeInTheDocument();
    expect(screen.getByText('Niv. 5')).toBeInTheDocument();
    expect(screen.getByText('8 sorts')).toBeInTheDocument();
  });

  it('EN : aucune fuite FR', () => {
    useLocaleStore.setState({ locale: 'en' });
    render(<SpellStatsBar character={makeCaster()} spellcastingClasses={[WIZARD_CASTER]} />);
    expect(screen.getByText('Ability')).toBeInTheDocument();
    expect(screen.getByText('DC')).toBeInTheDocument();
    expect(screen.getByText('+ attack')).toBeInTheDocument();
    expect(screen.getByText('Lvl 5')).toBeInTheDocument();
    expect(screen.getByText('8 spells')).toBeInTheDocument();
  });
});

describe('Carte de dégâts de sort — i18n + terminologie', () => {
  it('FR upcast : titre + aperçu de base localisés', () => {
    render(<SpellDamageCard spell={spellFromBundle('boule-de-feu')} chosenSlotLevel={5} casterLevel={9} />);
    expect(screen.getByText('Dégâts')).toBeInTheDocument();
    expect(screen.getByText(/Base au niveau 3/)).toBeInTheDocument();
  });

  it('EN upcast : aucune fuite FR', () => {
    useLocaleStore.setState({ locale: 'en' });
    render(<SpellDamageCard spell={spellFromBundle('boule-de-feu')} chosenSlotLevel={5} casterLevel={9} />);
    expect(screen.getByText('Damage')).toBeInTheDocument();
    expect(screen.getByText(/Base at level 3/)).toBeInTheDocument();
  });

  it('FR cantrip : « sort mineur » (terme officiel), jamais « cantrip »', () => {
    render(<SpellDamageCard spell={spellFromBundle('trait-de-feu')} chosenSlotLevel={0} casterLevel={5} />);
    expect(screen.getByText(/Progression sort mineur/)).toBeInTheDocument();
    expect(screen.queryByText(/cantrip/i)).not.toBeInTheDocument();
  });

  it('EN cantrip : « Cantrip scaling » localisé', () => {
    useLocaleStore.setState({ locale: 'en' });
    render(<SpellDamageCard spell={spellFromBundle('trait-de-feu')} chosenSlotLevel={0} casterLevel={5} />);
    expect(screen.getByText(/Cantrip scaling/)).toBeInTheDocument();
  });
});
