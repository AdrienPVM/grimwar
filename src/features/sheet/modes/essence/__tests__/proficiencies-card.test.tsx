import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Character, CharacterClassEntry } from '@/shared/types/character';
import { createEmptyClassSubChoices } from '@/shared/types/character';

import { ProficienciesCard } from '../proficiencies-card';
import { expectNoForbiddenEnglish } from '../../../../../../tests/helpers/i18n-guard';

import classesBundle from '../../../../../../public/data/classes.json';
import backgroundsBundle from '../../../../../../public/data/backgrounds.json';
import itemsBundle from '../../../../../../public/data/items.json';

/**
 * Carte « Maîtrises » — Cat. 2 (identité), Cat. 3 (fidélité bundle réel),
 * Cat. 6 (cas-limites corrompus). Source = bundles réels classes/backgrounds/
 * items. On asserte les libellés FR EXACTS dérivés de la donnée brute
 * (y compris « Heavy ar- mor » → « Armures lourdes » et le split Roublard).
 */

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'classes') return { data: classesBundle, isLoading: false, error: null };
    if (type === 'backgrounds') return { data: backgroundsBundle, isLoading: false, error: null };
    if (type === 'items') return { data: itemsBundle, isLoading: false, error: null };
    return { data: [], isLoading: false, error: null };
  },
}));

function classEntry(classId: string): CharacterClassEntry {
  return { classId, subclassId: null, level: 1, ...createEmptyClassSubChoices() };
}

function buildCharacter(classId: string, backgroundId: string): Character {
  return {
    id: 'prof',
    name: 'Prof',
    status: 'alive',
    classes: [classEntry(classId)],
    totalLevel: 1,
    primaryClassId: classId,
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
    backgroundId,
    extraLanguages: [],
    experience: 0,
    alignment: 'N',
    abilities: { for: 14, dex: 12, con: 12, int: 12, sag: 10, cha: 10 },
    saves: { for: false, dex: false, con: false, int: false, sag: false, cha: false },
    skills: {},
    hp: { current: 10, max: 10, temp: 0 },
    ac: 12,
    speed: 9,
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
    portrait: { type: 'letter', value: 'P' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'uid',
  };
}

/** Lit les libellés (pills) d'une ligne (Armures / Armes / Outils) par son <dt>. */
function rowValues(label: string): string[] {
  const dt = screen.getByText(label);
  const group = dt.closest('div');
  if (!group) throw new Error(`groupe ${label} introuvable`);
  const ddEl = group.querySelector('dd');
  return Array.from(ddEl?.querySelectorAll('span') ?? []).map((s) => s.textContent ?? '');
}

describe('<ProficienciesCard>', () => {
  it('Guerrier : armures (légères → lourdes) + boucliers, depuis la donnée brute corrompue', () => {
    // « Heavy ar- mor » du bundle réel DOIT rendre « Armures lourdes ».
    render(<ProficienciesCard character={buildCharacter('fighter', 'soldier')} />);
    expect(screen.getByText('Maîtrises')).toBeInTheDocument();
    expect(rowValues('Armures')).toEqual([
      'Armures légères',
      'Armures intermédiaires',
      'Armures lourdes',
      'Boucliers',
    ]);
    expect(rowValues('Armes')).toEqual(['Armes courantes', 'Armes de guerre']);
  });

  it('Roublard : le split Finesse/Légère rend UN libellé + outils de voleur (classe)', () => {
    render(<ProficienciesCard character={buildCharacter('rogue', 'soldier')} />);
    expect(rowValues('Armes')).toEqual([
      'Armes courantes',
      'Armes de guerre dotées de la propriété Finesse ou Légère',
    ]);
    expect(rowValues('Outils')).toContain('Outils de voleur');
  });

  it('Magicien + Acolyte : aucune armure, outils de background résolus en FR', () => {
    render(<ProficienciesCard character={buildCharacter('wizard', 'acolyte')} />);
    // « None » → pas de ligne Armures du tout.
    expect(screen.queryByText('Armures')).toBeNull();
    expect(rowValues('Armes')).toEqual(['Armes courantes']);
    // Acolyte → calligraphers-supplies → « Matériel de calligraphe » via items.json.
    expect(rowValues('Outils')).toContain('Matériel de calligraphe');
  });

  it('ne laisse fuir aucun anglais interdit dans le rendu FR', () => {
    const { container } = render(
      <ProficienciesCard character={buildCharacter('rogue', 'acolyte')} />,
    );
    expectNoForbiddenEnglish(container.textContent ?? '', 'proficiencies-card');
  });
});
