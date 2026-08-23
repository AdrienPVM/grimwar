import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  Condition,
  Item,
  MagicItem,
  Monster,
  Spell,
} from '@/shared/types/content';

import { buildConditionEntries } from '../browsers/codex-text-browsers';
import { GlobalSearchBrowser } from '../browsers/global-search-browser';
import { ItemBrowser } from '../browsers/item-browser';
import { MagicItemBrowser } from '../browsers/magic-item-browser';
import { MonsterBrowser } from '../browsers/monster-browser';
import { SpellBrowser } from '../browsers/spell-browser';
import { TextEntityBrowser } from '../browsers/text-entity-browser';

/**
 * Le Codex répond-il à une requête SANS accents ?
 *
 * Personne ne tape « Épée longue » avec l'accent dans un champ de filtre, encore
 * moins sur un clavier de téléphone au milieu d'une partie. Le contenu FR du
 * SRD, lui, est accentué partout : « Épée », « Aveuglé », « Bouclier de la foi ».
 * Une recherche accent-sensible rend donc invisible une large part du bundle à
 * la frappe la plus naturelle — et l'app passe pour cassée alors que l'entrée
 * est là.
 *
 * Ces tests visent la SAISIE de l'utilisateur (« epee »), pas l'implémentation :
 * ils resteraient valides si le filtrage changeait de moteur.
 */

const LONGSWORD: Item = {
  id: 'longsword',
  name: { fr: 'Épée longue', en: 'Longsword' },
  category: 'weapon',
  cost: { qty: 15, unit: 'gp' },
  weight: 1.5,
  description: null,
  damage: {
    dice: '1d8',
    type: 'slashing',
    typeLabel: { fr: 'tranchant', en: 'slashing' },
  },
  properties: ['Polyvalente (1d10)'],
  source: 'srd-5.2.1',
};

const LIGHT: Spell = {
  id: 'light',
  name: { fr: 'Lumière', en: 'Light' },
  level: 0,
  school: 'evocation',
  castingTime: { fr: '1 action', en: '1 Action' },
  range: { fr: 'Contact', en: 'Touch' },
  components: { v: true, s: false, m: true },
  duration: { fr: '1 heure', en: '1 Hour' },
  concentration: false,
  ritual: false,
  description: {
    fr: 'Un objet que tu touches émet une lumière vive.',
    en: '',
  },
  atHigherLevels: null,
  classes: ['cleric', 'wizard'],
  source: 'srd-5.2.1',
};

const ELVEN_CHAIN: MagicItem = {
  id: 'elven-chain',
  name: { fr: 'Cotte de mailles elfique', en: 'Elven Chain' },
  category: 'armor',
  rarity: 'rare',
  attunement: false,
  magicDescription: { fr: 'Tu es considéré comme maîtrisant cette armure.', en: '' },
  description: null,
  source: 'srd-5.2.1',
};

const SPECTRE: Monster = {
  id: 'spectre',
  name: { fr: 'Spectre', en: 'Specter' },
  size: 'medium',
  type: 'mort-vivant',
  alignment: { fr: 'Chaotique mauvais', en: 'Chaotic Evil' },
  ac: 12,
  acDetail: null,
  hp: { avg: 22, formula: '5d8' },
  speed: { walk: 30, fly: 50 },
  abilities: { for: 1, dex: 14, con: 11, int: 10, sag: 10, cha: 11 },
  saves: {},
  skills: {},
  resistances: [],
  immunities: [],
  vulnerabilities: [],
  conditionImmunities: [],
  senses: { darkvision: 60, passivePerception: 10 },
  languages: [],
  cr: 1,
  xp: 200,
  traits: [],
  actions: [],
  reactions: null,
  legendaryActions: null,
  source: 'srd-5.2.1',
};

const BLINDED: Condition = {
  id: 'aveugle',
  name: { fr: 'Aveuglé', en: 'Blinded' },
  description: {
    fr: 'Une créature aveuglée ne voit rien et rate les jets reposant sur la vue.',
    en: '',
  },
  source: 'srd-5.2.1',
};

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    const data =
      type === 'items'
        ? [LONGSWORD]
        : type === 'spells'
          ? [LIGHT]
          : type === 'magic-items'
            ? [ELVEN_CHAIN]
            : type === 'monsters'
              ? [SPECTRE]
              : type === 'conditions'
                ? [BLINDED]
                : [];
    return { data, loading: false, error: null, scopeOf: () => ({ scope: 'public' }) };
  },
}));

/** Tape `query` dans l'unique champ de recherche de l'écran rendu. */
function search(query: string): void {
  const field = screen.getByRole('textbox');
  fireEvent.change(field, { target: { value: query } });
}

describe('Codex — la recherche ignore les accents', () => {
  it('« epee » trouve « Épée longue » dans l’équipement', () => {
    render(<ItemBrowser />);
    search('epee');
    expect(screen.getByText('Épée longue')).toBeInTheDocument();
  });

  it('« lumiere » trouve le sort « Lumière »', () => {
    render(<SpellBrowser />);
    search('lumiere');
    expect(screen.getByText('Lumière')).toBeInTheDocument();
  });

  it('« elfique » sans accent trouve la cotte elfique parmi les objets magiques', () => {
    render(<MagicItemBrowser />);
    // Le piège inverse : la requête PORTE l'accent, pas le contenu.
    search('máilles elfique');
    expect(screen.getByText('Cotte de mailles elfique')).toBeInTheDocument();
  });

  it('« mort-vivant » sans accent trouve le spectre au bestiaire', () => {
    render(<MonsterBrowser />);
    search('spectré');
    expect(screen.getByText('Spectre')).toBeInTheDocument();
  });

  it('« aveugle » trouve l’état « Aveuglé »', () => {
    render(
      <TextEntityBrowser
        entries={buildConditionEntries([BLINDED])}
        loading={false}
        searchPlaceholder="Chercher un état"
      />,
    );
    search('aveugle');
    expect(screen.getByText('Aveuglé')).toBeInTheDocument();
  });

  it('la recherche transverse répond aussi sans accents', () => {
    render(<GlobalSearchBrowser />);
    search('epee');
    expect(screen.getByText('Épée longue')).toBeInTheDocument();
  });
});
