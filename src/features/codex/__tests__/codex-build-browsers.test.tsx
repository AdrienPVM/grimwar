import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Ancestry, Background, ClassEntity } from '@/shared/types/content';

import {
  AncestryBrowser,
  BackgroundBrowser,
  ClassBrowser,
} from '../browsers/codex-build-browsers';

/**
 * Codex — navigateurs espèces / historiques / classes (plan 19). Tests
 * d'identité : taille localisée, vitesse convertie en mètres (5 ft = 1,50 m),
 * compétences EN→FR, caractéristiques/sauvegardes localisées.
 */

const ELF: Ancestry = {
  id: 'elf',
  name: { fr: 'Elfe', en: 'Elf' },
  size: 'medium',
  speed: 30,
  description: { fr: 'Les elfes sont des êtres d’une grâce surnaturelle.', en: '' },
  abilityScoreIncrease: [],
  traits: [
    {
      name: { fr: 'Vision dans le noir', en: 'Darkvision' },
      description: { fr: 'Tu vois dans la pénombre sur 18 m.', en: '' },
    },
  ],
  languages: ['Commun', 'Elfique'],
  options: {},
} as unknown as Ancestry;

const ACOLYTE: Background = {
  id: 'acolyte',
  name: { fr: 'Acolyte', en: 'Acolyte' },
  description: { fr: 'L’Acolyte sert un dieu ou une cause sacrée.', en: '' },
  skillProficiencies: ['Insight', 'Religion'],
  toolProficiencies: [],
  languages: 2,
  equipment: [],
  startingCoins: null,
  feature: {
    name: { fr: 'Abri du fidèle', en: 'Shelter of the Faithful' },
    description: { fr: 'Tu peux trouver refuge dans un temple de ta foi.', en: '' },
  },
} as unknown as Background;

const FIGHTER: ClassEntity = {
  id: 'fighter',
  name: { fr: 'Guerrier', en: 'Fighter' },
  hitDie: 'd10',
  primaryAbility: ['for'],
  saveProficiencies: ['for', 'con'],
  armorProficiencies: [],
  weaponProficiencies: [],
  toolProficiencies: [],
  skillChoices: { count: 2, from: ['Athletics', 'Intimidation'] },
  spellcasting: null,
  description: { fr: 'Le Guerrier maîtrise armes et armures.', en: '' },
  features: [
    {
      level: 1,
      name: { fr: 'Style de combat', en: 'Fighting Style' },
      description: { fr: 'Tu adoptes un style de combat martial.', en: '' },
    },
  ],
  weaponMasteryCount: 0,
} as unknown as ClassEntity;

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'ancestries') return { data: [ELF], loading: false, error: null , scopeOf: () => ({ scope: 'public' as const }) };
    if (type === 'backgrounds') return { data: [ACOLYTE], loading: false, error: null , scopeOf: () => ({ scope: 'public' as const }) };
    if (type === 'classes') return { data: [FIGHTER], loading: false, error: null , scopeOf: () => ({ scope: 'public' as const }) };
    return { data: [], loading: false, error: null , scopeOf: () => ({ scope: 'public' as const }) };
  },
}));

describe('AncestryBrowser (Codex)', () => {
  it('taille localisée + vitesse en mètres + trait exact', () => {
    render(<AncestryBrowser />);
    fireEvent.click(screen.getByText('Elfe'));
    const dialog = screen.getByRole('dialog');
    // Taille « Moyenne » (size.medium) + vitesse 30 ft → 9 m.
    expect(within(dialog).getByText('Moyenne')).toBeInTheDocument();
    expect(within(dialog).getByText('9 m')).toBeInTheDocument();
    expect(within(dialog).getByText('Vision dans le noir')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Tu vois dans la pénombre sur 18 m.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Commun, Elfique')).toBeInTheDocument();
  });
});

describe('BackgroundBrowser (Codex)', () => {
  it('compétences EN→FR + aptitude exacte', () => {
    render(<BackgroundBrowser />);
    fireEvent.click(screen.getByText('Acolyte'));
    const dialog = screen.getByRole('dialog');
    // « Insight, Religion » → « Perspicacité, Religion » via le résolveur SKILLS.
    expect(within(dialog).getByText('Perspicacité, Religion')).toBeInTheDocument();
    expect(within(dialog).getByText('Abri du fidèle')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Tu peux trouver refuge dans un temple de ta foi.'),
    ).toBeInTheDocument();
  });
});

describe('ClassBrowser (Codex)', () => {
  it('dé de vie + caracs/sauvegardes localisées + compétences + aptitude', () => {
    render(<ClassBrowser />);
    fireEvent.click(screen.getByText('Guerrier'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('d10')).toBeInTheDocument();
    expect(within(dialog).getByText('Force')).toBeInTheDocument();
    expect(within(dialog).getByText('Force, Constitution')).toBeInTheDocument();
    expect(
      within(dialog).getByText('2 au choix parmi : Athlétisme, Intimidation'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('Style de combat (niv. 1)'),
    ).toBeInTheDocument();
  });
});
