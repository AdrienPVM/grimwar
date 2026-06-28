import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

import { HeroCard } from '../hero-card';

import ancestriesBundle from '../../../../../public/data/ancestries.json';
import backgroundsBundle from '../../../../../public/data/backgrounds.json';
import classesBundle from '../../../../../public/data/classes.json';
import subclassesBundle from '../../../../../public/data/subclasses.json';

/**
 * Carte héros — Cat. 2 (identité) + Cat. 5 (cohérence wizard → fiche).
 *
 * L'historique (backgroundId) est stocké sur le perso mais n'était affiché
 * nulle part : le joueur perdait de vue son historique après création. La
 * ligne d'identité montre désormais « espèce · historique ». Sources = bundles
 * réels (pas de constante in-file). Sans Provider de permissions, `canEdit`
 * tombe au défaut `false` → le bouton de montée de niveau ne se rend pas.
 */

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'ancestries') return { data: ancestriesBundle, isLoading: false, error: null };
    if (type === 'backgrounds') return { data: backgroundsBundle, isLoading: false, error: null };
    if (type === 'classes') return { data: classesBundle, isLoading: false, error: null };
    if (type === 'subclasses') return { data: subclassesBundle, isLoading: false, error: null };
    return { data: [], isLoading: false, error: null };
  },
}));

function buildCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'hero',
    name: 'Astrid',
    status: 'alive',
    classes: [
      {
        classId: 'cleric',
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
    primaryClassId: 'cleric',
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
    alignment: 'LB',
    abilities: { for: 14, dex: 10, con: 14, int: 10, sag: 16, cha: 12 },
    saves: { for: false, dex: false, con: false, int: false, sag: true, cha: true },
    skills: {},
    hp: { current: 10, max: 10, temp: 0 },
    ac: 16,
    speed: 9,
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
    portrait: { type: 'letter', value: 'A' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'uid',
    ...overrides,
  };
}

/** Valeur de référence figée (Cat. 3) — le nom FR du bundle. */
const acolyteName = (backgroundsBundle as Array<{ id: string; name: { fr: string } }>).find(
  (b) => b.id === 'acolyte',
)!.name.fr;

describe('<HeroCard> — historique sur la ligne d\'identité', () => {
  it('affiche le nom de l\'historique À L\'IDENTIQUE du bundle, après l\'espèce', () => {
    render(<HeroCard character={buildCharacter()} />);
    expect(acolyteName).toBe('Acolyte');
    // « Humain · Acolyte » : espèce + historique sur la même ligne.
    expect(screen.getByText(/Humain\s*·\s*Acolyte/)).toBeInTheDocument();
  });

  it('résout un autre historique (cohérence data-driven, pas codé en dur)', () => {
    render(<HeroCard character={buildCharacter({ backgroundId: 'soldier' })} />);
    expect(screen.getByText(/Humain\s*·\s*Soldat/)).toBeInTheDocument();
  });

  it('omet le segment historique (pas de slug brut) si l\'id ne résout pas', () => {
    render(<HeroCard character={buildCharacter({ backgroundId: 'custom-unknown' })} />);
    expect(screen.queryByText(/custom-unknown/)).toBeNull();
    // L'espèce reste affichée, sans « · » orphelin derrière.
    expect(screen.getByText('Humain')).toBeInTheDocument();
  });
});

describe('<HeroCard> — ligne classe · sous-classe · niveau', () => {
  it('mono-classe sans sous-classe : un seul séparateur (pas de « · · ») + niveau localisé', () => {
    render(<HeroCard character={buildCharacter()} />);
    const line = screen.getByText('Clerc').closest('p');
    expect(line).not.toBeNull();
    // « Clerc · Niveau 1 » — un seul bullet, plus jamais « Clerc ·  · Niveau 1 ».
    expect(line!.textContent).toMatch(/Clerc\s*·\s*Niveau 1/);
    expect(line!.textContent).not.toMatch(/·\s+·/);
  });

  it('résout le nom de la sous-classe À L\'IDENTIQUE du bundle (pas le slug brut)', () => {
    render(
      <HeroCard
        character={buildCharacter({
          classes: [
            {
              classId: 'barbarian',
              subclassId: 'path-of-the-berserker',
              level: 3,
              clericDivineOrder: null,
              druidPrimalOrder: null,
              fighterFightingStyle: null,
              weaponMasteries: [],
              expertiseSkills: [],
              eldritchInvocations: [],
              wizardSpellbookL1: [],
            },
          ],
          primaryClassId: 'barbarian',
          totalLevel: 3,
        })}
      />,
    );
    // Valeur figée du bundle (Cat. 3) : « Voie du Berserker », jamais « Path of the berserker ».
    const subFr = (subclassesBundle as Array<{ id: string; name: { fr: string } }>).find(
      (s) => s.id === 'path-of-the-berserker',
    )!.name.fr;
    expect(subFr).toBe('Voie du Berserker');
    const line = screen.getByText('Barbare').closest('p');
    expect(line).not.toBeNull();
    expect(line!.textContent).toMatch(/Barbare\s*·\s*Voie du Berserker\s*·\s*Niveau 3/);
    expect(line!.textContent).not.toMatch(/path-of-the-berserker/);
  });
});
