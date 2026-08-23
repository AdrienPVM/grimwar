import type { IconName } from '@/shared/design/icons';
import { normalizeForSearch } from '@/shared/lib/search-normalize';
import type { StringKey } from '@/shared/lib/i18n';

/**
 * Destinations offertes par la palette, et le filtrage de toutes ses rangées.
 *
 * Séparé du composant parce que c'est la partie qui se teste sans DOM : quelles
 * rangées répondent à quelle frappe. Le composant, lui, ne fait que peindre et
 * écouter le clavier.
 */

export interface Destination {
  to: string;
  labelKey: StringKey;
  icon: IconName;
  /**
   * Mots que l'utilisateur pourrait taper pour arriver là sans connaître le nom
   * de l'écran — « sort » ou « regle » pour le Codex, « dés » pour le compte.
   * Sans eux, la palette n'accepte que le vocabulaire de l'app.
   */
  keywords: readonly string[];
}

export const DESTINATIONS: readonly Destination[] = [
  {
    to: '/',
    labelKey: 'palette.nav.home',
    icon: 'i-feather',
    keywords: ['personnages', 'heros', 'fiches', 'bibliotheque', 'accueil'],
  },
  {
    to: '/campaigns',
    labelKey: 'palette.nav.campaigns',
    icon: 'i-shield',
    keywords: ['campagnes', 'table', 'parties', 'groupe'],
  },
  {
    to: '/codex',
    labelKey: 'palette.nav.codex',
    icon: 'i-book',
    keywords: ['codex', 'regles', 'sorts', 'objets', 'monstres', 'etats', 'srd'],
  },
  {
    to: '/create',
    labelKey: 'palette.nav.create',
    icon: 'i-plus',
    keywords: ['creer', 'nouveau', 'personnage', 'creation'],
  },
  {
    to: '/campaigns/join',
    labelKey: 'palette.nav.join',
    icon: 'i-shield',
    keywords: ['rejoindre', 'code', 'invitation'],
  },
  {
    to: '/account',
    labelKey: 'palette.nav.account',
    icon: 'i-eye',
    keywords: ['compte', 'reglages', 'preferences', 'des', 'haptique', 'profil'],
  },
  {
    to: '/account/content',
    labelKey: 'palette.nav.packs',
    icon: 'i-bag',
    keywords: ['packs', 'contenu', 'import', 'custom', 'maison'],
  },
];

/**
 * Une rangée activable de la palette. `haystack` est la forme normalisée
 * fouillée par la recherche ; `key` sert de clé React ET d'ancre a11y.
 */
export interface PaletteRow {
  key: string;
  label: string;
  meta?: string;
  icon?: IconName;
  haystack: string;
  activate: () => void;
}

/**
 * Filtre des rangées sur une requête libre. Requête vide → tout est rendu :
 * une palette qui s'ouvre sur du vide ne dit pas ce qu'elle sait faire.
 */
export function filterRows(
  rows: readonly PaletteRow[],
  query: string,
): PaletteRow[] {
  const q = normalizeForSearch(query);
  if (q === '') return [...rows];
  return rows.filter((row) => row.haystack.includes(q));
}

/** Index suivant dans une liste circulaire — `-1` (rien de sélectionné) inclus. */
export function nextIndex(
  current: number,
  length: number,
  delta: 1 | -1,
): number {
  if (length === 0) return -1;
  if (current < 0) return delta === 1 ? 0 : length - 1;
  return (current + delta + length) % length;
}
