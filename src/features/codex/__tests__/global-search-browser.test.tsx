import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  Condition,
  Item,
  MagicItem,
  Monster,
  Spell,
} from '@/shared/types/content';

import { GlobalSearchBrowser } from '../browsers/global-search-browser';

/**
 * Codex — recherche transverse. Tests d'IDENTITÉ, pas de présence : un même
 * terme doit ressortir dans PLUSIEURS catégories, chaque résultat doit être
 * rangé sous LA BONNE catégorie, et l'ouvrir doit rendre exactement la fiche de
 * sa catégorie (bloc de stats pour un monstre, méta de sort pour un sort).
 *
 * Le jeu de fixtures est bâti autour d'« entrav » : le sort « Entrave », l'état
 * « Entravé », un objet magique dont la description magique entrave, et un
 * monstre dont le type ne matche pas — c'est précisément le cas où deviner
 * l'onglet est impossible, donc la raison d'être de cet onglet.
 */

const ENTRAVE: Spell = {
  id: 'entrave',
  name: { fr: 'Entrave', en: 'Entangle' },
  level: 1,
  school: 'conjuration',
  castingTime: { fr: '1 action', en: '1 Action' },
  range: { fr: '27 mètres', en: '90 ft' },
  components: { v: true, s: true, m: false },
  duration: { fr: '1 minute', en: '1 Minute' },
  concentration: true,
  ritual: false,
  description: {
    fr: 'Des herbes jaillissent du sol et agrippent les créatures.',
    en: '',
  },
  atHigherLevels: null,
  classes: ['druid'],
  source: 'srd-5.2.1',
};

const TRAIT_DE_FEU: Spell = {
  id: 'trait-de-feu',
  name: { fr: 'Trait de feu', en: 'Fire Bolt' },
  level: 0,
  school: 'evocation',
  castingTime: { fr: '1 action', en: '1 Action' },
  range: { fr: '36 mètres', en: '120 ft' },
  components: { v: true, s: true, m: false },
  duration: { fr: 'Instantanée', en: '' },
  concentration: false,
  ritual: false,
  description: { fr: 'Tu projettes un trait de feu.', en: '' },
  atHigherLevels: null,
  classes: ['wizard'],
  source: 'srd-5.2.1',
};

const ENTRAVE_CONDITION: Condition = {
  id: 'entrave',
  name: { fr: 'Entravé', en: 'Restrained' },
  description: {
    fr: 'La vitesse d’une créature entravée tombe à 0.',
    en: '',
  },
  source: 'srd-5.2.1',
};

const FILET: Item = {
  id: 'filet',
  name: { fr: 'Filet', en: 'Net' },
  category: 'weapon',
  cost: { qty: 1, unit: 'gp' },
  weight: 1.5,
  description: { fr: 'Une créature touchée est entravée.', en: '' },
  damage: null,
  properties: ['Spéciale'],
  source: 'srd-5.2.1',
};

const CORDE_ENTRAVANTE: MagicItem = {
  id: 'corde-entravante',
  name: { fr: 'Corde d’escalade', en: 'Rope of Climbing' },
  category: 'gear',
  rarity: 'uncommon',
  attunement: false,
  magicDescription: { fr: 'La corde peut entraver une créature.', en: '' },
  description: null,
  source: 'srd-5.2.1',
};

const GOBELIN: Monster = {
  id: 'gobelin',
  name: { fr: 'Gobelin', en: 'Goblin' },
  size: 'small',
  type: 'humanoïde',
  alignment: { fr: 'Neutre mauvais', en: '' },
  ac: 15,
  acDetail: null,
  hp: { avg: 7, formula: '2d6' },
  speed: { walk: 30 },
  abilities: { for: 8, dex: 14, con: 10, int: 10, sag: 8, cha: 8 },
  saves: {},
  skills: {},
  resistances: [],
  immunities: [],
  vulnerabilities: [],
  conditionImmunities: [],
  senses: { passivePerception: 9 },
  languages: ['commun'],
  cr: 0.25,
  xp: 50,
  traits: [],
  actions: [],
  reactions: [],
  legendaryActions: [],
  source: 'srd-5.2.1',
};

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    const data =
      type === 'spells'
        ? [ENTRAVE, TRAIT_DE_FEU]
        : type === 'conditions'
          ? [ENTRAVE_CONDITION]
          : type === 'items'
            ? [FILET]
            : type === 'magic-items'
              ? [CORDE_ENTRAVANTE]
              : type === 'monsters'
                ? [GOBELIN]
                : [];
    return { data, loading: false, error: null };
  },
}));

/** Le bloc de résultats d'une catégorie, repéré par son en-tête. */
function categorySection(label: string): HTMLElement {
  const heading = screen.getByRole('heading', {
    name: new RegExp(`^${label} ·`),
  });
  const section = heading.closest('section');
  if (!section) throw new Error(`Pas de section pour « ${label} »`);
  return section;
}

describe('GlobalSearchBrowser', () => {
  it('n’affiche aucun résultat sous le seuil de deux caractères', () => {
    render(<GlobalSearchBrowser />);
    fireEvent.change(screen.getByPlaceholderText('Rechercher dans tout le Codex…'), {
      target: { value: 'e' },
    });
    expect(
      screen.getByText(/Saisis au moins deux lettres/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Sorts ·/ })).toBeNull();
  });

  it('remonte le même terme depuis quatre catégories, chacune sous son en-tête', () => {
    render(<GlobalSearchBrowser />);
    fireEvent.change(screen.getByPlaceholderText('Rechercher dans tout le Codex…'), {
      target: { value: 'entrav' },
    });

    expect(within(categorySection('Sorts')).getByText('Entrave')).toBeInTheDocument();
    expect(within(categorySection('États')).getByText('Entravé')).toBeInTheDocument();
    expect(
      within(categorySection('Équipement')).getByText('Filet'),
    ).toBeInTheDocument();
    expect(
      within(categorySection('Objets magiques')).getByText('Corde d’escalade'),
    ).toBeInTheDocument();

    // 4 entrées trouvées, et le gobelin (hors sujet) n'en fait pas partie.
    expect(screen.getByText('4 · résultats')).toBeInTheDocument();
    expect(screen.queryByText('Gobelin')).toBeNull();
  });

  it('cherche aussi dans le texte, pas seulement dans le nom', () => {
    render(<GlobalSearchBrowser />);
    fireEvent.change(screen.getByPlaceholderText('Rechercher dans tout le Codex…'), {
      target: { value: 'herbes jaillissent' },
    });
    expect(within(categorySection('Sorts')).getByText('Entrave')).toBeInTheDocument();
    expect(screen.getByText('1 · résultat')).toBeInTheDocument();
  });

  it('ouvre un sort sur SA fiche de sort — méta complète, pas une fiche générique', () => {
    render(<GlobalSearchBrowser />);
    fireEvent.change(screen.getByPlaceholderText('Rechercher dans tout le Codex…'), {
      target: { value: 'entrave' },
    });
    fireEvent.click(within(categorySection('Sorts')).getByText('Entrave'));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Entrave' })).toBeInTheDocument();
    // École `conjuration` → « Invocation » en FR officiel (à ne pas confondre
    // avec la catégorie « Invocations » du Codex, qui sont les invocations
    // occultistes).
    expect(within(dialog).getByText('Niveau 1 · Invocation')).toBeInTheDocument();
    expect(within(dialog).getByText('27 mètres')).toBeInTheDocument();
    expect(within(dialog).getByText('1 minute')).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'Des herbes jaillissent du sol et agrippent les créatures.',
      ),
    ).toBeInTheDocument();
  });

  it('ouvre un état sur sa description exacte du bundle', () => {
    render(<GlobalSearchBrowser />);
    fireEvent.change(screen.getByPlaceholderText('Rechercher dans tout le Codex…'), {
      target: { value: 'entravé' },
    });
    fireEvent.click(within(categorySection('États')).getByText('Entravé'));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Entravé' })).toBeInTheDocument();
    expect(within(dialog).getByText('États')).toBeInTheDocument();
    expect(
      within(dialog).getByText('La vitesse d’une créature entravée tombe à 0.'),
    ).toBeInTheDocument();
  });

  it('ouvre un monstre sur son bloc de stats complet', () => {
    render(<GlobalSearchBrowser />);
    fireEvent.change(screen.getByPlaceholderText('Rechercher dans tout le Codex…'), {
      target: { value: 'gobelin' },
    });
    fireEvent.click(within(categorySection('Bestiaire')).getByText('Gobelin'));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Gobelin' })).toBeInTheDocument();
    // Valeurs chiffrées du bundle : CA 15, PV 7 — pas « un bloc est rendu ».
    expect(within(dialog).getByText('15')).toBeInTheDocument();
    expect(within(dialog).getByText(/2d6/)).toBeInTheDocument();
  });

  it('ouvre un équipement sur ses chiffres exacts', () => {
    render(<GlobalSearchBrowser />);
    fireEvent.change(screen.getByPlaceholderText('Rechercher dans tout le Codex…'), {
      target: { value: 'filet' },
    });
    fireEvent.click(within(categorySection('Équipement')).getByText('Filet'));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Filet' })).toBeInTheDocument();
    expect(within(dialog).getByText('1.5 kg')).toBeInTheDocument();
    expect(within(dialog).getByText('1 gp')).toBeInTheDocument();
    expect(within(dialog).getByText('Spéciale')).toBeInTheDocument();
  });

  it('affiche l’état vide quand rien ne correspond', () => {
    render(<GlobalSearchBrowser />);
    fireEvent.change(screen.getByPlaceholderText('Rechercher dans tout le Codex…'), {
      target: { value: 'zzzzz' },
    });
    expect(
      screen.getByText('Aucune entrée ne correspond à ta recherche.'),
    ).toBeInTheDocument();
    expect(screen.getByText('0 · résultats')).toBeInTheDocument();
  });
});
