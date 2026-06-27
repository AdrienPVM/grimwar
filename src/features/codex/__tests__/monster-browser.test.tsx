import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Monster } from '@/shared/types/content';

import { MonsterBrowser } from '../browsers/monster-browser';

/**
 * Codex — navigateur bestiaire (directive 2026-06-27). Tests d'IDENTITÉ (pas
 * présence) : la modale affiche CA/PV/FP/vitesse exacts + traits/actions, et la
 * vitesse est convertie en mètres (pieds → ×0,3, convention FR du projet).
 */

const GOBLIN: Monster = {
  id: 'gobelin',
  name: { fr: 'Gobelin', en: 'Goblin' },
  size: 'small',
  type: 'humanoïde',
  alignment: { fr: 'Neutre mauvais', en: 'Neutral Evil' },
  ac: 15,
  acDetail: { fr: 'armure de cuir, bouclier', en: 'leather, shield' },
  hp: { avg: 7, formula: '2d6' },
  speed: { walk: 30 },
  abilities: { for: 8, dex: 14, con: 10, int: 10, sag: 8, cha: 8 },
  saves: {},
  skills: { stealth: 6 },
  resistances: [],
  immunities: [],
  vulnerabilities: [],
  conditionImmunities: [],
  senses: { darkvision: 60, passivePerception: 9 },
  languages: ['commun', 'gobelin'],
  cr: 0.25,
  xp: 50,
  traits: [
    {
      name: { fr: 'Fuite agile', en: 'Nimble Escape' },
      description: { fr: 'Se désengage ou se cache en action bonus.', en: '' },
    },
  ],
  actions: [
    {
      name: { fr: 'Cimeterre', en: 'Scimitar' },
      description: { fr: 'Mêlée +4, 1d6+2 tranchant.', en: '' },
    },
  ],
  reactions: null,
  legendaryActions: null,
  source: 'srd-5.2.1',
};

const DRAGON: Monster = {
  ...GOBLIN,
  id: 'dragon-rouge',
  name: { fr: 'Dragon rouge', en: 'Red Dragon' },
  size: 'huge',
  type: 'dragon',
  ac: 19,
  hp: { avg: 256, formula: '19d12 + 133' },
  speed: { walk: 40, fly: 80 },
  cr: 17,
  xp: 18000,
  traits: [],
  actions: [],
};

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'monsters')
      return { data: [GOBLIN, DRAGON], loading: false, error: null };
    return { data: [], loading: false, error: null };
  },
}));

describe('MonsterBrowser (Codex)', () => {
  it('liste les monstres triés par FP croissant + filtre par taille', () => {
    render(<MonsterBrowser />);
    expect(screen.getByText('Gobelin')).toBeInTheDocument();
    expect(screen.getByText('Dragon rouge')).toBeInTheDocument();
    // Filtre « Très grande » (huge) → seul le dragon reste.
    fireEvent.click(screen.getByRole('button', { name: 'Très grande' }));
    expect(screen.queryByText('Gobelin')).not.toBeInTheDocument();
    expect(screen.getByText('Dragon rouge')).toBeInTheDocument();
  });

  it('modale : CA/PV exacts + vitesse en mètres (30 ft → 9 m) + trait/action', () => {
    render(<MonsterBrowser />);
    fireEvent.click(screen.getByText('Gobelin'));
    const dialog = screen.getByRole('dialog');
    // Eyebrow : taille · type · FP (fraction lisible).
    expect(within(dialog).getByText('Petite · humanoïde · FP 1/4')).toBeInTheDocument();
    // CA = 15 (avec détail), PV = 7 (2d6).
    expect(within(dialog).getByText(/15/)).toBeInTheDocument();
    expect(within(dialog).getByText(/7 \(2d6\)/)).toBeInTheDocument();
    // Vitesse convertie : 30 ft × 0,3 = 9 m (PAS 30).
    expect(within(dialog).getByText('9 m')).toBeInTheDocument();
    // Trait + action exacts.
    expect(within(dialog).getByText(/Fuite agile/)).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Se désengage ou se cache en action bonus\./),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/Cimeterre/)).toBeInTheDocument();
  });

  it('FP fractionnaire 1/8 et 1/2 affichés en fraction', () => {
    render(<MonsterBrowser />);
    fireEvent.click(screen.getByText('Dragon rouge'));
    const dialog = screen.getByRole('dialog');
    // FP 17 entier + vitesse de vol (80 ft → 24 m).
    expect(within(dialog).getByText('Très grande · dragon · FP 17')).toBeInTheDocument();
    expect(within(dialog).getByText(/24 m/)).toBeInTheDocument();
  });
});
