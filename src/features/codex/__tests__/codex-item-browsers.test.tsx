import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Item, MagicItem } from '@/shared/types/content';

import { ItemBrowser } from '../browsers/item-browser';
import { MagicItemBrowser } from '../browsers/magic-item-browser';

/**
 * Codex — navigateurs objets magiques + équipement (plan 19). Tests d'identité :
 * rareté/harmonisation/description exactes pour les objets magiques ; CA/dégâts/
 * coût exacts (valeurs chiffrées) pour l'équipement.
 */

const FLAME_TONGUE: MagicItem = {
  id: 'flame-tongue',
  name: { fr: 'Langue de feu', en: 'Flame Tongue' },
  category: 'weapon',
  rarity: 'rare',
  attunement: true,
  magicDescription: {
    fr: 'Tu peux prononcer un mot de commande pour enflammer la lame.',
    en: '',
  },
  description: null,
  source: 'srd-5.2.1',
};

const POTION_HEALING: MagicItem = {
  id: 'potion-of-healing',
  name: { fr: 'Potion de soins', en: 'Potion of Healing' },
  category: 'gear',
  rarity: 'common',
  attunement: false,
  magicDescription: { fr: 'Tu récupères 2d4+2 points de vie en la buvant.', en: '' },
  description: null,
  source: 'srd-5.2.1',
};

const LONGSWORD: Item = {
  id: 'longsword',
  name: { fr: 'Épée longue', en: 'Longsword' },
  category: 'weapon',
  cost: { qty: 15, unit: 'gp' },
  weight: 1.5,
  description: null,
  damage: { dice: '1d8', type: 'slashing', typeLabel: { fr: 'tranchant', en: 'slashing' } },
  properties: ['Polyvalente (1d10)'],
  source: 'srd-5.2.1',
};

const CHAIN_MAIL: Item = {
  id: 'chain-mail',
  name: { fr: 'Cotte de mailles', en: 'Chain Mail' },
  category: 'armor',
  cost: { qty: 75, unit: 'gp' },
  weight: 25,
  description: { fr: 'Armure lourde faite d’anneaux entrelacés.', en: '' },
  acBase: 16,
  acDexMax: null,
  source: 'srd-5.2.1',
};

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'magic-items')
      return { data: [FLAME_TONGUE, POTION_HEALING], loading: false, error: null , scopeOf: () => ({ scope: 'public' as const }) };
    if (type === 'items')
      return { data: [LONGSWORD, CHAIN_MAIL], loading: false, error: null , scopeOf: () => ({ scope: 'public' as const }) };
    return { data: [], loading: false, error: null , scopeOf: () => ({ scope: 'public' as const }) };
  },
}));

describe('MagicItemBrowser (Codex)', () => {
  it('liste + filtre par rareté', () => {
    render(<MagicItemBrowser />);
    expect(screen.getByText('Langue de feu')).toBeInTheDocument();
    expect(screen.getByText('Potion de soins')).toBeInTheDocument();
    // Filtre rareté « Rare » → seule Langue de feu reste.
    fireEvent.click(screen.getByRole('button', { name: 'Rare' }));
    expect(screen.getByText('Langue de feu')).toBeInTheDocument();
    expect(screen.queryByText('Potion de soins')).not.toBeInTheDocument();
  });

  it('modale : catégorie · rareté + harmonisation + description exactes', () => {
    render(<MagicItemBrowser />);
    fireEvent.click(screen.getByText('Langue de feu'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Arme · Rare')).toBeInTheDocument();
    expect(within(dialog).getByText('Harmonisation requise')).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'Tu peux prononcer un mot de commande pour enflammer la lame.',
      ),
    ).toBeInTheDocument();
  });
});

describe('ItemBrowser (Codex)', () => {
  it('liste + filtre par catégorie', () => {
    render(<ItemBrowser />);
    expect(screen.getByText('Épée longue')).toBeInTheDocument();
    expect(screen.getByText('Cotte de mailles')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Armure' }));
    expect(screen.queryByText('Épée longue')).not.toBeInTheDocument();
    expect(screen.getByText('Cotte de mailles')).toBeInTheDocument();
  });

  it('modale arme : dégâts + coût + poids chiffrés exacts', () => {
    render(<ItemBrowser />);
    fireEvent.click(screen.getByText('Épée longue'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('1d8 tranchant')).toBeInTheDocument();
    expect(within(dialog).getByText('15 gp')).toBeInTheDocument();
    expect(within(dialog).getByText('1.5 kg')).toBeInTheDocument();
    expect(within(dialog).getByText('Polyvalente (1d10)')).toBeInTheDocument();
  });

  it('modale armure : CA chiffrée exacte', () => {
    render(<ItemBrowser />);
    fireEvent.click(screen.getByText('Cotte de mailles'));
    const dialog = screen.getByRole('dialog');
    // CA 16 sans bonus de DEX (armure lourde) — valeur chiffrée, pas « > 0 ».
    expect(within(dialog).getByText('16')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Armure lourde faite d’anneaux entrelacés.'),
    ).toBeInTheDocument();
  });
});
